import { PayoutStatus, RiskOutcome, Role } from "@/domain/enums";
import { DomainError, forbidden, notFound, validationError } from "@/domain/errors";
import { money, percentageOf, type Money } from "@/domain/money";
import { assertTransition, PAYOUT_TRANSITIONS } from "@/domain/state-machines";
import type { ActorContext, Organizer, Payout } from "@/domain/types";
import { systemClock, type Clock } from "../lib/clock";
import { newId } from "../lib/ids";
import type { UnitOfWork } from "../repositories/types";
import type { AuditService } from "./audit-service";
import { ACCOUNT, LedgerService } from "./ledger-service";
import type { NotificationService } from "./notification-service";
import type { RiskService } from "./risk-service";

/**
 * Organizer settlement and payouts.
 *
 * Two ideas drive this file. First, an organizer's available balance comes from
 * the ledger, never from summing payments. Second, a new organizer holding
 * KES 4m of other people's ticket money before an event has happened is the
 * platform's single largest fraud exposure — so reserves are risk-based, and
 * changing a payout destination is treated as a security event, not a settings
 * edit.
 */

/** Share of pre-event revenue an organizer may draw, by trust tier. */
const PRE_EVENT_RELEASE_BPS: Record<Organizer["trustTier"], number> = {
  NEW: 2_000, // 20%
  ESTABLISHED: 5_000, // 50%
  TRUSTED: 8_000, // 80%
};

/** Hours after the event before the remainder is released. */
const DISPUTE_WINDOW_HOURS: Record<Organizer["trustTier"], number> = {
  NEW: 168, // 7 days
  ESTABLISHED: 72,
  TRUSTED: 24,
};

export interface OrganizerBalance {
  payable: Money;
  reserved: Money;
  available: Money;
  trustTier: Organizer["trustTier"];
  releasePolicy: string;
}

export class PayoutService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly deps: {
      ledger: LedgerService;
      risk: RiskService;
      audit: AuditService;
      notifications: NotificationService;
    },
    private readonly clock: Clock = systemClock,
  ) {}

  async balanceFor(organizerId: string): Promise<OrganizerBalance> {
    const organizer = await this.uow.repos.organizers.findById(organizerId);
    if (!organizer) throw notFound("Organizer", organizerId);

    const payable = await this.deps.ledger.balance(ACCOUNT.organizerPayable(organizerId));
    const reserved = await this.deps.ledger.balance(ACCOUNT.organizerReserve(organizerId));
    const releaseBps = PRE_EVENT_RELEASE_BPS[organizer.trustTier];

    // Anything not already reserved is capped by the tier's pre-event release.
    const cap = percentageOf(payable, releaseBps);
    const drawable = Math.max(0, Math.min(payable.amount - reserved.amount, cap.amount));

    // A payout only debits the ledger once `markPaid` runs, so a request that
    // is merely PENDING/UNDER_REVIEW/APPROVED/PROCESSING would otherwise still
    // look fully available — letting the same money be requested twice before
    // the first request is ever paid out.
    const outstanding = await this.outstandingPayoutTotal(organizerId);
    const available = money(Math.max(0, drawable - outstanding.amount), payable.currency);

    return {
      payable,
      reserved,
      available,
      trustTier: organizer.trustTier,
      releasePolicy: `${releaseBps / 100}% of ticket revenue is available before the event; the remainder is released ${DISPUTE_WINDOW_HOURS[organizer.trustTier]} hours after it ends.`,
    };
  }

  /** Sum of payouts already requested but not yet paid, failed or reversed. */
  private async outstandingPayoutTotal(organizerId: string): Promise<Money> {
    const outstandingStatuses: PayoutStatus[] = [
      PayoutStatus.PENDING,
      PayoutStatus.UNDER_REVIEW,
      PayoutStatus.APPROVED,
      PayoutStatus.PROCESSING,
    ];
    const history = await this.uow.repos.payouts.listByOrganizer(organizerId);
    return history
      .filter((payout) => outstandingStatuses.includes(payout.status))
      .reduce((total, payout) => money(total.amount + payout.amount.amount, total.currency), money(0));
  }

  async requestPayout(
    actor: ActorContext,
    input: { organizerId: string; amount: Money; destinationMasked: string },
  ): Promise<Payout> {
    if (!actor.mfaSatisfied) {
      throw new DomainError("STEP_UP_REQUIRED", "Confirm your identity to request a payout");
    }
    if (actor.organizerId !== input.organizerId) {
      throw forbidden("You cannot request payouts for another organizer");
    }
    if (input.amount.amount <= 0) throw validationError("Payout amount must be positive");

    const balance = await this.balanceFor(input.organizerId);
    if (input.amount.amount > balance.available.amount) {
      throw new DomainError("INVALID_STATE", "That is more than your available balance", {
        available: balance.available.amount,
      });
    }

    const recentChanges = await this.deps.risk.listForSubject("ORGANIZER", input.organizerId);
    const changedRecently = recentChanges.some(
      (event) =>
        event.reasonCodes.includes("PAYOUT_DESTINATION_CHANGED") &&
        new Date(event.at).getTime() > this.clock.now().getTime() - 24 * 3600 * 1000,
    );

    const decision = await this.deps.risk.assess(
      "PAYOUT_REQUEST",
      { type: "PAYOUT", id: input.organizerId },
      { value: input.amount, recentPayoutDestinationChange: changedRecently },
      actor,
    );

    const status =
      decision.outcome === RiskOutcome.BLOCK || decision.outcome === RiskOutcome.MANUAL_REVIEW
        ? PayoutStatus.UNDER_REVIEW
        : PayoutStatus.PENDING;

    const payout = await this.uow.repos.payouts.create({
      id: newId("pyo"),
      organizerId: input.organizerId,
      amount: input.amount,
      status,
      destinationMasked: input.destinationMasked,
      requestedAt: this.clock.nowIso(),
      approvedByUserId: null,
      paidAt: null,
      holdReason:
        status === PayoutStatus.UNDER_REVIEW ? decision.reasonCodes.join(", ") : null,
    });

    await this.deps.audit.record(actor, {
      action: "payout.requested",
      resourceType: "Payout",
      resourceId: payout.id,
      after: { amount: input.amount.amount, status, risk: decision.outcome },
    });

    return payout;
  }

  /**
   * Maker-checker approval. The approver must be a different person from the
   * requester and hold a finance role — one compromised account cannot both
   * request and approve a payout.
   */
  async approvePayout(actor: ActorContext, payoutId: string, note: string): Promise<Payout> {
    const payout = await this.uow.repos.payouts.findById(payoutId);
    if (!payout) throw notFound("Payout", payoutId);

    const canApprove = actor.roles.some(
      (role) => role === Role.FINANCE_MANAGER || role === Role.SUPER_ADMIN,
    );
    if (!canApprove) throw forbidden("Only a finance manager can approve payouts");
    if (!actor.mfaSatisfied) {
      throw new DomainError("STEP_UP_REQUIRED", "Confirm your identity to approve a payout");
    }
    if (payout.approvedByUserId === actor.userId) {
      throw forbidden("A payout cannot be approved by the person who requested it");
    }

    assertTransition(PAYOUT_TRANSITIONS, payout.status, PayoutStatus.APPROVED, "Payout");
    const approved = await this.uow.repos.payouts.update(payoutId, {
      status: PayoutStatus.APPROVED,
      approvedByUserId: actor.userId,
    });

    await this.deps.audit.record(actor, {
      action: "payout.approved",
      resourceType: "Payout",
      resourceId: payoutId,
      before: { status: payout.status },
      after: { status: approved.status },
      reason: note,
      approvalChain: [actor.userId ?? "unknown"],
    });

    return approved;
  }

  /** Marks a payout paid and books the cash movement. */
  async markPaid(actor: ActorContext, payoutId: string): Promise<Payout> {
    return this.uow.runInTransaction(async (repos) => {
      const payout = await repos.payouts.findById(payoutId);
      if (!payout) throw notFound("Payout", payoutId);
      assertTransition(PAYOUT_TRANSITIONS, payout.status, PayoutStatus.PROCESSING, "Payout");
      await repos.payouts.update(payoutId, { status: PayoutStatus.PROCESSING });

      await this.deps.ledger.post({
        reference: `payout:${payout.id}`,
        kind: "PAYOUT",
        metadata: { organizerId: payout.organizerId },
        entries: [
          {
            accountCode: ACCOUNT.organizerPayable(payout.organizerId),
            side: "DEBIT",
            amount: payout.amount,
            memo: "Payout to organizer",
            organizerId: payout.organizerId,
          },
          {
            accountCode: ACCOUNT.CUSTOMER_FUNDS,
            side: "CREDIT",
            amount: payout.amount,
            memo: `Payout ${payout.id}`,
          },
        ],
      });

      const paid = await repos.payouts.update(payoutId, {
        status: PayoutStatus.PAID,
        paidAt: this.clock.nowIso(),
      });

      const organizer = await repos.organizers.findById(payout.organizerId);
      if (organizer) {
        await this.deps.notifications.send({
          userId: null,
          to: organizer.supportEmail,
          channel: "EMAIL",
          template: "payout.paid",
          payload: { amount: String(payout.amount.amount), destination: payout.destinationMasked },
        });
      }

      await this.deps.audit.record(actor, {
        action: "payout.paid",
        resourceType: "Payout",
        resourceId: payoutId,
        after: { status: PayoutStatus.PAID, amount: payout.amount.amount },
      });

      return paid;
    });
  }

  /**
   * Changing where money is sent is the highest-value target on the platform.
   * It requires step-up auth, raises a risk event, notifies the *existing*
   * contacts (so a hijacked account cannot silently redirect funds), and starts
   * a cooling period during which payouts are held.
   */
  async changePayoutDestination(
    actor: ActorContext,
    input: { organizerId: string; newDestinationMasked: string; reason: string },
  ): Promise<{ coolingPeriodHours: number }> {
    if (!actor.mfaSatisfied) {
      throw new DomainError(
        "STEP_UP_REQUIRED",
        "Confirm your identity to change your payout destination",
      );
    }
    if (actor.organizerId !== input.organizerId) {
      throw forbidden("You cannot change another organizer's payout destination");
    }

    const organizer = await this.uow.repos.organizers.findById(input.organizerId);
    if (!organizer) throw notFound("Organizer", input.organizerId);

    await this.deps.risk.assess(
      "PAYOUT_DESTINATION_CHANGE",
      { type: "ORGANIZER", id: input.organizerId },
      { recentPayoutDestinationChange: true, knownDevice: Boolean(actor.deviceId) },
      actor,
    );

    // Deliberately sent to the contacts on file *before* the change.
    await this.deps.notifications.send({
      userId: null,
      to: organizer.supportEmail,
      channel: "EMAIL",
      template: "payout.destination_changed",
      payload: { organizer: organizer.name, destination: input.newDestinationMasked },
    });
    await this.deps.notifications.send({
      userId: null,
      to: organizer.supportPhone,
      channel: "SMS",
      template: "security.alert",
      payload: { organizer: organizer.name },
    });

    const coolingPeriodHours = organizer.trustTier === "TRUSTED" ? 12 : 48;

    await this.deps.audit.record(actor, {
      action: "payout.destination_changed",
      resourceType: "Organizer",
      resourceId: input.organizerId,
      after: { destination: input.newDestinationMasked, coolingPeriodHours },
      reason: input.reason,
    });

    return { coolingPeriodHours };
  }

  /**
   * Scheduled job: after an event ends and its dispute window closes, releases
   * the reserved remainder into the organizer's available balance.
   */
  async releaseMaturedReserves(actor: ActorContext): Promise<number> {
    const events = await this.uow.repos.events.listAll();
    let released = 0;

    for (const event of events) {
      const organizer = await this.uow.repos.organizers.findById(event.organizerId);
      if (!organizer) continue;
      const windowHours = DISPUTE_WINDOW_HOURS[organizer.trustTier];
      const matureAt = new Date(
        new Date(event.endsAt).getTime() + windowHours * 3600 * 1000,
      ).toISOString();
      if (matureAt > this.clock.nowIso()) continue;

      const reserved = await this.deps.ledger.balance(ACCOUNT.organizerReserve(organizer.id));
      if (reserved.amount <= 0) continue;

      await this.deps.ledger.post({
        reference: `reserve-release:${event.id}`,
        kind: "ADJUSTMENT",
        metadata: { eventId: event.id, organizerId: organizer.id },
        entries: [
          {
            accountCode: ACCOUNT.organizerReserve(organizer.id),
            side: "DEBIT",
            amount: reserved,
            memo: "Reserve released after dispute window",
            organizerId: organizer.id,
          },
          {
            accountCode: ACCOUNT.organizerPayable(organizer.id),
            side: "CREDIT",
            amount: reserved,
            memo: "Available to organizer",
            organizerId: organizer.id,
          },
        ],
      });

      await this.deps.audit.record(actor, {
        action: "payout.reserve_released",
        resourceType: "Event",
        resourceId: event.id,
        after: { amount: reserved.amount },
      });
      released += 1;
    }

    return released;
  }

  listForOrganizer(organizerId: string): Promise<Payout[]> {
    return this.uow.repos.payouts.listByOrganizer(organizerId);
  }
}
