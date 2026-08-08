import { ResaleListingStatus, RiskOutcome, TicketStatus } from "@/domain/enums";
import { DomainError, forbidden, notFound, validationError } from "@/domain/errors";
import { money, percentageOf, subtract, type Money } from "@/domain/money";
import { assertTransition, LISTING_TRANSITIONS, TICKET_TRANSITIONS } from "@/domain/state-machines";
import type { ActorContext, ResaleListing, Ticket } from "@/domain/types";
import { config } from "../config";
import { addHours, systemClock, type Clock } from "../lib/clock";
import { newId } from "../lib/ids";
import type { UnitOfWork } from "../repositories/types";
import type { AuditService } from "./audit-service";
import { ACCOUNT, LedgerService } from "./ledger-service";
import type { NotificationService } from "./notification-service";
import type { RiskService } from "./risk-service";

/**
 * Verified resale marketplace.
 *
 * The point of the whole feature is that a Bookit ticket cannot be sold twice
 * and cannot be faked: there are no PDF uploads and no "proof of purchase"
 * screenshots. Only a ticket this platform issued can be listed, ownership is
 * verified against the ticket record, and completing a sale transfers ownership
 * transactionally while invalidating the seller's credential.
 */

export class ResaleService {
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

  async createListing(
    actor: ActorContext,
    input: { ticketId: string; askPrice: Money },
  ): Promise<ResaleListing> {
    return this.uow.runInTransaction(async (repos) => {
      const ticket = await repos.tickets.findById(input.ticketId);
      if (!ticket) throw notFound("Ticket", input.ticketId);
      if (ticket.ownerUserId !== actor.userId) {
        throw forbidden("You can only list tickets you own");
      }
      if (ticket.status !== TicketStatus.ACTIVE) {
        throw new DomainError("INVALID_STATE", "Only an active ticket can be listed");
      }

      const event = await repos.events.findById(ticket.eventId);
      if (!event) throw notFound("Event", ticket.eventId);
      const policy = event.policies;

      if (!policy.resaleEnabled) {
        throw new DomainError(
          "RESALE_NOT_ALLOWED",
          "The organizer has not enabled resale for this event",
        );
      }
      const now = this.clock.nowIso();
      if (policy.resaleOpensAt && now < policy.resaleOpensAt) {
        throw new DomainError("RESALE_NOT_ALLOWED", "Resale has not opened for this event yet");
      }
      if (policy.resaleClosesAt && now > policy.resaleClosesAt) {
        throw new DomainError("RESALE_NOT_ALLOWED", "Resale has closed for this event");
      }

      const maxPrice = money(
        ticket.facePrice.amount +
          percentageOf(ticket.facePrice, policy.resaleMaxMarkupBps).amount,
        ticket.facePrice.currency,
      );
      if (input.askPrice.amount > maxPrice.amount) {
        throw new DomainError(
          "RESALE_NOT_ALLOWED",
          policy.resaleMaxMarkupBps === 0
            ? "This organizer caps resale at face value"
            : `This organizer caps resale at ${policy.resaleMaxMarkupBps / 100}% above face value`,
          { maxPrice: maxPrice.amount, facePrice: ticket.facePrice.amount },
        );
      }

      const activeForSeller = await repos.listings.countActiveBySeller(
        actor.userId!,
        event.id,
      );
      if (activeForSeller >= policy.maxListingsPerAccount) {
        throw new DomainError(
          "RESALE_NOT_ALLOWED",
          `You can have at most ${policy.maxListingsPerAccount} active listings for this event`,
        );
      }

      const minutesSincePurchase =
        (this.clock.now().getTime() - new Date(ticket.issuedAt).getTime()) / 60_000;
      const markupBps =
        ticket.facePrice.amount === 0
          ? 0
          : Math.round(
              ((input.askPrice.amount - ticket.facePrice.amount) / ticket.facePrice.amount) *
                10_000,
            );

      const decision = await this.deps.risk.assess(
        "LIST_FOR_RESALE",
        { type: "LISTING", id: ticket.id },
        { minutesSincePurchase, markupBps, value: input.askPrice },
        actor,
      );
      if (decision.outcome === RiskOutcome.BLOCK) {
        throw new DomainError("RISK_BLOCKED", "This listing could not be created", {
          reasonCodes: decision.reasonCodes,
        });
      }

      const listing = await repos.listings.create({
        id: newId("lst"),
        ticketId: ticket.id,
        eventId: event.id,
        sellerUserId: actor.userId!,
        askPrice: input.askPrice,
        facePrice: ticket.facePrice,
        status:
          decision.outcome === RiskOutcome.MANUAL_REVIEW
            ? ResaleListingStatus.BLOCKED
            : ResaleListingStatus.ACTIVE,
        buyerUserId: null,
        createdAt: this.clock.nowIso(),
        soldAt: null,
      });

      // LISTED locks the ticket: it cannot be transferred or listed again.
      assertTransition(TICKET_TRANSITIONS, ticket.status, TicketStatus.LISTED, "Ticket");
      await repos.tickets.update(ticket.id, { status: TicketStatus.LISTED });

      await this.deps.audit.record(actor, {
        action: "resale.listing_created",
        resourceType: "ResaleListing",
        resourceId: listing.id,
        after: { askPrice: input.askPrice.amount, risk: decision.outcome },
      });

      return listing;
    });
  }

  async cancelListing(actor: ActorContext, listingId: string): Promise<ResaleListing> {
    return this.uow.runInTransaction(async (repos) => {
      const listing = await repos.listings.findById(listingId);
      if (!listing) throw notFound("ResaleListing", listingId);
      if (listing.sellerUserId !== actor.userId) {
        throw forbidden("You can only cancel your own listings");
      }
      assertTransition(
        LISTING_TRANSITIONS,
        listing.status,
        ResaleListingStatus.CANCELLED,
        "Listing",
      );

      const ticket = await repos.tickets.findById(listing.ticketId);
      if (ticket && ticket.status === TicketStatus.LISTED) {
        await repos.tickets.update(ticket.id, { status: TicketStatus.ACTIVE });
      }

      const cancelled = await repos.listings.update(listingId, {
        status: ResaleListingStatus.CANCELLED,
      });

      await this.deps.audit.record(actor, {
        action: "resale.listing_cancelled",
        resourceType: "ResaleListing",
        resourceId: listingId,
        before: { status: listing.status },
        after: { status: cancelled.status },
      });

      return cancelled;
    });
  }

  /**
   * Completes a resale after the buyer's payment is verified.
   *
   * Ownership transfer, credential invalidation, ownership history and the
   * ledger postings all happen in one transaction — a partial resale would
   * leave a ticket that two people believe they own.
   */
  async completeSale(
    actor: ActorContext,
    input: { listingId: string; buyerUserId: string; paymentReference: string },
  ): Promise<{ listing: ResaleListing; ticket: Ticket }> {
    return this.uow.runInTransaction(async (repos) => {
      const listing = await repos.listings.findById(input.listingId);
      if (!listing) throw notFound("ResaleListing", input.listingId);
      if (listing.status === ResaleListingStatus.SOLD) {
        const soldTicket = await repos.tickets.findById(listing.ticketId);
        if (!soldTicket) throw notFound("Ticket", listing.ticketId);
        return { listing, ticket: soldTicket };
      }
      if (listing.status !== ResaleListingStatus.ACTIVE &&
          listing.status !== ResaleListingStatus.RESERVED) {
        throw new DomainError("INVALID_STATE", "This listing is no longer available");
      }

      const ticket = await repos.tickets.findById(listing.ticketId);
      if (!ticket) throw notFound("Ticket", listing.ticketId);
      if (ticket.ownerUserId !== listing.sellerUserId) {
        throw new DomainError("CONFLICT", "The listed ticket has changed hands");
      }

      const buyer = await repos.users.findById(input.buyerUserId);
      if (!buyer) throw notFound("User", input.buyerUserId);

      const event = await repos.events.findById(listing.eventId);
      if (!event) throw notFound("Event", listing.eventId);

      const platformFee = percentageOf(listing.askPrice, config.checkout.resaleFeeBps);
      const sellerProceeds = subtract(listing.askPrice, platformFee);

      const updatedTicket = await repos.tickets.update(ticket.id, {
        ownerUserId: buyer.id,
        ownerName: buyer.fullName,
        status: TicketStatus.ACTIVE,
        // Kills the seller's QR the instant the sale completes.
        credentialVersion: ticket.credentialVersion + 1,
        ownershipHistory: [
          ...ticket.ownershipHistory,
          {
            at: this.clock.nowIso(),
            fromUserId: listing.sellerUserId,
            toUserId: buyer.id,
            reason: "RESALE",
            reference: listing.id,
          },
        ],
      });

      const soldListing = await repos.listings.update(listing.id, {
        status: ResaleListingStatus.SOLD,
        buyerUserId: buyer.id,
        soldAt: this.clock.nowIso(),
      });

      await this.deps.ledger.post({
        reference: `resale:${listing.id}`,
        kind: "RESALE",
        metadata: { listingId: listing.id, eventId: event.id, payment: input.paymentReference },
        entries: [
          {
            accountCode: ACCOUNT.CUSTOMER_FUNDS,
            side: "DEBIT",
            amount: listing.askPrice,
            memo: `Resale of ticket ${ticket.code}`,
          },
          {
            accountCode: ACCOUNT.sellerPayable(listing.sellerUserId),
            side: "CREDIT",
            amount: sellerProceeds,
            memo: "Seller proceeds",
          },
          {
            accountCode: ACCOUNT.PLATFORM_FEE_REVENUE,
            side: "CREDIT",
            amount: platformFee,
            memo: "Bookit resale fee",
          },
        ],
      });

      // Seller proceeds are held for the organizer-configured delay so a
      // fraudulent sale can be reversed before the money leaves.
      const releaseAt = addHours(this.clock.nowIso(), event.policies.sellerPayoutDelayHours);

      await this.deps.notifications.send({
        userId: listing.sellerUserId,
        to: (await repos.users.findById(listing.sellerUserId))?.email ?? "",
        channel: "EMAIL",
        template: "resale.completed",
        payload: {
          ticketCode: ticket.code,
          proceeds: String(sellerProceeds.amount),
          releaseAt,
        },
      });

      await this.deps.audit.record(actor, {
        action: "resale.completed",
        resourceType: "ResaleListing",
        resourceId: listing.id,
        before: { owner: listing.sellerUserId, credentialVersion: ticket.credentialVersion },
        after: {
          owner: buyer.id,
          credentialVersion: updatedTicket.credentialVersion,
          sellerProceeds: sellerProceeds.amount,
          platformFee: platformFee.amount,
          proceedsReleaseAt: releaseAt,
        },
      });

      return { listing: soldListing, ticket: updatedTicket };
    });
  }

  /** Highest price a ticket may be listed at under the event's policy. */
  maxListingPrice(facePrice: Money, maxMarkupBps: number): Money {
    return money(
      facePrice.amount + percentageOf(facePrice, maxMarkupBps).amount,
      facePrice.currency,
    );
  }

  async listForEvent(eventId: string): Promise<ResaleListing[]> {
    const listings = await this.uow.repos.listings.listByEvent(eventId);
    return listings.filter((listing) => listing.status === ResaleListingStatus.ACTIVE);
  }

  async listForSeller(userId: string): Promise<ResaleListing[]> {
    if (!userId) throw validationError("A user id is required");
    return this.uow.repos.listings.listBySeller(userId);
  }
}
