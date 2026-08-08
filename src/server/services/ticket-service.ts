import { TicketStatus, TransferStatus } from "@/domain/enums";
import { DomainError, forbidden, notFound, validationError } from "@/domain/errors";
import { assertTransition, TICKET_TRANSITIONS, TRANSFER_TRANSITIONS } from "@/domain/state-machines";
import type { ActorContext, Ticket, TicketTransfer } from "@/domain/types";
import { addHours, systemClock, type Clock } from "../lib/clock";
import { newId } from "../lib/ids";
import type { UnitOfWork } from "../repositories/types";
import type { AuditService } from "./audit-service";
import type { CredentialService, IssuedCredential } from "./credential-service";
import type { NotificationService } from "./notification-service";
import type { RiskService } from "./risk-service";

/**
 * Ticket ownership and lifecycle.
 *
 * Two rules hold everywhere in this file:
 *  - ownership history is append-only;
 *  - any change of owner or status that should kill outstanding QR codes bumps
 *    `credentialVersion`, which is the single mechanism that invalidates them.
 */

export class TicketService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly deps: {
      credentials: CredentialService;
      audit: AuditService;
      notifications: NotificationService;
      risk: RiskService;
    },
    private readonly clock: Clock = systemClock,
  ) {}

  /** Issues a fresh short-lived credential for the owner's QR display. */
  async issueCredential(actor: ActorContext, ticketId: string): Promise<IssuedCredential> {
    const ticket = await this.uow.repos.tickets.findById(ticketId);
    if (!ticket) throw notFound("Ticket", ticketId);
    if (ticket.ownerUserId !== actor.userId) {
      throw forbidden("You can only display credentials for your own tickets");
    }
    if (
      ticket.status !== TicketStatus.ACTIVE &&
      ticket.status !== TicketStatus.LISTED &&
      ticket.status !== TicketStatus.CHECKED_IN
    ) {
      throw new DomainError(
        "INVALID_STATE",
        `A ${ticket.status.toLowerCase()} ticket cannot produce a credential`,
      );
    }
    return this.deps.credentials.issue(ticket);
  }

  /**
   * Starts a transfer. The ticket is locked (moved out of ACTIVE) so it cannot
   * simultaneously be listed for resale or transferred to a second recipient.
   */
  async initiateTransfer(
    actor: ActorContext,
    input: { ticketId: string; toEmail: string },
  ): Promise<TicketTransfer> {
    return this.uow.runInTransaction(async (repos) => {
      const ticket = await repos.tickets.findById(input.ticketId);
      if (!ticket) throw notFound("Ticket", input.ticketId);
      if (ticket.ownerUserId !== actor.userId) {
        throw forbidden("You can only transfer tickets you own");
      }
      if (ticket.status !== TicketStatus.ACTIVE) {
        throw new DomainError("INVALID_STATE", "Only an active ticket can be transferred");
      }

      const event = await repos.events.findById(ticket.eventId);
      if (!event) throw notFound("Event", ticket.eventId);
      if (!event.policies.transferAllowed) {
        throw forbidden("The organizer has disabled transfers for this event");
      }
      if (await repos.listings.findActiveByTicket(ticket.id)) {
        throw new DomainError("CONFLICT", "This ticket is currently listed for resale");
      }

      const decision = await this.deps.risk.assess(
        "TRANSFER",
        { type: "USER", id: actor.userId ?? "anonymous" },
        { value: ticket.facePrice, knownDevice: Boolean(actor.deviceId) },
        actor,
      );
      if (decision.outcome === "BLOCK") {
        throw new DomainError("RISK_BLOCKED", "This transfer could not be started");
      }

      const transfer = await repos.transfers.create({
        id: newId("trf"),
        ticketId: ticket.id,
        fromUserId: ticket.ownerUserId,
        toEmail: input.toEmail.toLowerCase(),
        toUserId: null,
        status: TransferStatus.PENDING,
        createdAt: this.clock.nowIso(),
        expiresAt: addHours(this.clock.nowIso(), 72),
        resolvedAt: null,
      });

      // SUSPENDED while pending: it cannot be used, listed or transferred again.
      assertTransition(TICKET_TRANSITIONS, ticket.status, TicketStatus.SUSPENDED, "Ticket");
      await repos.tickets.update(ticket.id, {
        status: TicketStatus.SUSPENDED,
        credentialVersion: ticket.credentialVersion + 1,
      });

      await this.deps.notifications.send({
        userId: null,
        to: input.toEmail,
        channel: "EMAIL",
        template: "transfer.received",
        payload: { transferId: transfer.id, eventTitle: event.title },
      });

      await this.deps.audit.record(actor, {
        action: "ticket.transfer.initiated",
        resourceType: "Ticket",
        resourceId: ticket.id,
        before: { owner: ticket.ownerUserId, status: ticket.status },
        after: { transferId: transfer.id, toEmail: input.toEmail },
      });

      return transfer;
    });
  }

  /** Recipient accepts: ownership moves and every prior credential dies. */
  async acceptTransfer(actor: ActorContext, transferId: string): Promise<Ticket> {
    return this.uow.runInTransaction(async (repos) => {
      const transfer = await repos.transfers.findById(transferId);
      if (!transfer) throw notFound("TicketTransfer", transferId);
      if (transfer.status !== TransferStatus.PENDING) {
        throw new DomainError("INVALID_STATE", "This transfer is no longer pending");
      }
      if (transfer.expiresAt <= this.clock.nowIso()) {
        await repos.transfers.update(transferId, {
          status: TransferStatus.EXPIRED,
          resolvedAt: this.clock.nowIso(),
        });
        throw new DomainError("INVALID_STATE", "This transfer has expired");
      }

      const recipient = actor.userId ? await repos.users.findById(actor.userId) : null;
      if (!recipient) throw forbidden("Sign in to accept this ticket");
      if (recipient.email.toLowerCase() !== transfer.toEmail) {
        throw forbidden("This transfer was sent to a different email address");
      }

      const ticket = await repos.tickets.findById(transfer.ticketId);
      if (!ticket) throw notFound("Ticket", transfer.ticketId);

      assertTransition(TICKET_TRANSITIONS, ticket.status, TicketStatus.ACTIVE, "Ticket");
      const updated = await repos.tickets.update(ticket.id, {
        ownerUserId: recipient.id,
        ownerName: recipient.fullName,
        status: TicketStatus.ACTIVE,
        // Second bump: credentials issued between initiate and accept die too.
        credentialVersion: ticket.credentialVersion + 1,
        ownershipHistory: [
          ...ticket.ownershipHistory,
          {
            at: this.clock.nowIso(),
            fromUserId: transfer.fromUserId,
            toUserId: recipient.id,
            reason: "TRANSFER",
            reference: transfer.id,
          },
        ],
      });

      assertTransition(TRANSFER_TRANSITIONS, transfer.status, TransferStatus.ACCEPTED, "Transfer");
      await repos.transfers.update(transferId, {
        status: TransferStatus.ACCEPTED,
        toUserId: recipient.id,
        resolvedAt: this.clock.nowIso(),
      });

      const sender = await repos.users.findById(transfer.fromUserId);
      if (sender) {
        await this.deps.notifications.send({
          userId: sender.id,
          to: sender.email,
          channel: "EMAIL",
          template: "transfer.accepted",
          payload: { ticketCode: ticket.code, recipient: recipient.fullName },
        });
      }

      await this.deps.audit.record(actor, {
        action: "ticket.transfer.accepted",
        resourceType: "Ticket",
        resourceId: ticket.id,
        before: { owner: ticket.ownerUserId, credentialVersion: ticket.credentialVersion },
        after: { owner: recipient.id, credentialVersion: updated.credentialVersion },
      });

      return updated;
    });
  }

  async cancelTransfer(actor: ActorContext, transferId: string): Promise<TicketTransfer> {
    return this.uow.runInTransaction(async (repos) => {
      const transfer = await repos.transfers.findById(transferId);
      if (!transfer) throw notFound("TicketTransfer", transferId);
      if (transfer.fromUserId !== actor.userId) {
        throw forbidden("Only the sender can cancel a transfer");
      }
      assertTransition(TRANSFER_TRANSITIONS, transfer.status, TransferStatus.CANCELLED, "Transfer");

      const ticket = await repos.tickets.findById(transfer.ticketId);
      if (ticket) {
        await repos.tickets.update(ticket.id, {
          status: TicketStatus.ACTIVE,
          credentialVersion: ticket.credentialVersion + 1,
        });
      }

      const cancelled = await repos.transfers.update(transferId, {
        status: TransferStatus.CANCELLED,
        resolvedAt: this.clock.nowIso(),
      });

      await this.deps.audit.record(actor, {
        action: "ticket.transfer.cancelled",
        resourceType: "Ticket",
        resourceId: transfer.ticketId,
        after: { transferId },
      });

      return cancelled;
    });
  }

  /**
   * Voids a ticket — used by refunds and by fraud response. The credential
   * version bump is what stops a screenshot taken a minute ago from scanning.
   */
  async void(
    actor: ActorContext,
    ticketId: string,
    reason: string,
    to: TicketStatus = TicketStatus.VOIDED,
  ): Promise<Ticket> {
    return this.uow.runInTransaction(async (repos) => {
      const ticket = await repos.tickets.findById(ticketId);
      if (!ticket) throw notFound("Ticket", ticketId);
      assertTransition(TICKET_TRANSITIONS, ticket.status, to, "Ticket");

      const listing = await repos.listings.findActiveByTicket(ticket.id);
      if (listing) {
        await repos.listings.update(listing.id, { status: "CANCELLED" });
      }

      const updated = await repos.tickets.update(ticketId, {
        status: to,
        credentialVersion: ticket.credentialVersion + 1,
      });

      await this.deps.audit.record(actor, {
        action: "ticket.voided",
        resourceType: "Ticket",
        resourceId: ticketId,
        before: { status: ticket.status },
        after: { status: to },
        reason,
      });

      return updated;
    });
  }

  async listForOwner(userId: string): Promise<Ticket[]> {
    if (!userId) throw validationError("A user id is required");
    return this.uow.repos.tickets.listByOwner(userId);
  }
}
