import { InventoryState, TicketStatus } from "@/domain/enums";
import { notFound } from "@/domain/errors";
import type {
  AffiliateLink,
  AuditLog,
  BanquetTable,
  Booking,
  Campaign,
  CheckIn,
  Contribution,
  Event,
  EventOccurrence,
  Hold,
  InventoryUnit,
  LedgerAccount,
  LedgerTransaction,
  Notification,
  Order,
  Organizer,
  Payment,
  Payout,
  PrivateInvite,
  PromoCode,
  ResaleListing,
  RiskEvent,
  Ticket,
  TicketId,
  TicketTransfer,
  TicketType,
  User,
  Venue,
} from "@/domain/types";
import type {
  Broadcast,
  GiftClaim,
  GiftItem,
  GuestMessage,
  PrivateEventPage,
} from "@/domain/private-event";
import type { MemoryDb } from "./store";
import type * as R from "../types";

/**
 * In-memory repository implementations.
 *
 * Every write replaces the stored object rather than mutating it, which keeps
 * the transaction snapshot in `store.ts` cheap and makes accidental shared
 * mutation across "transactions" impossible.
 */

function patched<T extends object>(current: T, patch: Partial<T>): T {
  return { ...current, ...patch };
}

function requireEntity<T>(value: T | undefined, resource: string, id: string): T {
  if (value === undefined) throw notFound(resource, id);
  return value;
}

function byStartAsc(a: { startsAt: string }, b: { startsAt: string }): number {
  return a.startsAt.localeCompare(b.startsAt);
}

export function createMemoryRepositories(db: MemoryDb): R.Repositories {
  const privateEvents: R.PrivateEventRepository = {
    async findPage(eventId) {
      return db.privatePages.get(eventId) ?? null;
    },
    async savePage(page: PrivateEventPage) {
      db.privatePages.set(page.eventId, page);
      return page;
    },

    async listGifts(eventId) {
      return [...db.gifts.values()]
        .filter((gift) => gift.eventId === eventId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async findGift(giftId) {
      return db.gifts.get(giftId) ?? null;
    },
    async saveGift(gift: GiftItem) {
      db.gifts.set(gift.id, gift);
      return gift;
    },
    async updateGift(giftId, patch) {
      const next = patched(requireEntity(db.gifts.get(giftId), "GiftItem", giftId), patch);
      db.gifts.set(giftId, next);
      return next;
    },

    async listClaims(eventId) {
      return [...db.giftClaims.values()]
        .filter((claim) => claim.eventId === eventId)
        .sort((a, b) => b.claimedAt.localeCompare(a.claimedAt));
    },
    async createClaim(claim: GiftClaim) {
      db.giftClaims.set(claim.id, claim);
      return claim;
    },
    async listClaimsByInvite(inviteId) {
      return [...db.giftClaims.values()].filter((claim) => claim.inviteId === inviteId);
    },

    async listBroadcasts(eventId) {
      return [...db.broadcasts.values()]
        .filter((broadcast) => broadcast.eventId === eventId)
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    },
    async createBroadcast(broadcast: Broadcast) {
      db.broadcasts.set(broadcast.id, broadcast);
      return broadcast;
    },

    async listMessages(eventId) {
      return [...db.guestMessages.values()]
        .filter((message) => message.eventId === eventId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async createMessage(message: GuestMessage) {
      db.guestMessages.set(message.id, message);
      return message;
    },
    async updateMessage(id, patch) {
      const next = patched(requireEntity(db.guestMessages.get(id), "GuestMessage", id), patch);
      db.guestMessages.set(id, next);
      return next;
    },
  };

  const users: R.UserRepository = {
    async findById(id) {
      return db.users.get(id) ?? null;
    },
    async findByEmail(email) {
      const wanted = email.toLowerCase();
      for (const user of db.users.values()) {
        if (user.email.toLowerCase() === wanted) return user;
      }
      return null;
    },
    async list() {
      return [...db.users.values()];
    },
    async create(user: User) {
      db.users.set(user.id, user);
      return user;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.users.get(id), "User", id), patch);
      db.users.set(id, next);
      return next;
    },
  };

  const organizers: R.OrganizerRepository = {
    async findById(id) {
      return db.organizers.get(id) ?? null;
    },
    async findBySlug(slug) {
      for (const organizer of db.organizers.values()) {
        if (organizer.slug === slug) return organizer;
      }
      return null;
    },
    async list() {
      return [...db.organizers.values()];
    },
    async create(organizer: Organizer) {
      db.organizers.set(organizer.id, organizer);
      return organizer;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.organizers.get(id), "Organizer", id), patch);
      db.organizers.set(id, next);
      return next;
    },
  };

  const venues: R.VenueRepository = {
    async findById(id) {
      return db.venues.get(id) ?? null;
    },
    async list() {
      return [...db.venues.values()];
    },
    async create(venue: Venue) {
      db.venues.set(venue.id, venue);
      return venue;
    },
  };

  const events: R.EventRepository = {
    async findById(id) {
      return db.events.get(id) ?? null;
    },
    async findBySlug(slug) {
      for (const event of db.events.values()) {
        if (event.slug === slug) return event;
      }
      return null;
    },
    async listAll() {
      return [...db.events.values()].sort(byStartAsc);
    },
    async query(query) {
      const {
        search,
        city,
        category,
        types,
        from,
        to,
        freeOnly,
        bookingsOnly,
        featuredOnly,
        organizerId,
        includeNonPublic = false,
        cursor = null,
        limit = 24,
      } = query;

      const searchTerm = search?.trim().toLowerCase();

      // Defence in depth: `includeNonPublic` is only honoured for a query that
      // is already scoped to one organizer. A discovery surface therefore
      // cannot surface a private event even if a caller sets the flag by
      // mistake — the only way to see one is to own it.
      const mayIncludeNonPublic = includeNonPublic && Boolean(organizerId);

      let items = [...db.events.values()].filter((event) => {
        if (!mayIncludeNonPublic && event.visibility !== "PUBLIC") return false;
        if (organizerId && event.organizerId !== organizerId) return false;
        if (featuredOnly && !event.featured) return false;
        if (category && event.category !== category) return false;
        if (types?.length && !types.includes(event.type)) return false;
        if (from && event.startsAt < from) return false;
        if (to && event.startsAt > to) return false;
        if (freeOnly && !isFreeEvent(db, event)) return false;
        if (bookingsOnly && !isBookingEvent(event)) return false;
        if (city) {
          const venue = db.venues.get(event.venueId);
          if (!venue || venue.city.toLowerCase() !== city.toLowerCase()) return false;
        }
        if (searchTerm) {
          const venue = db.venues.get(event.venueId);
          const organizer = db.organizers.get(event.organizerId);
          const haystack = [
            event.title,
            event.subtitle ?? "",
            event.description,
            event.tags.join(" "),
            venue?.name ?? "",
            venue?.city ?? "",
            organizer?.name ?? "",
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(searchTerm)) return false;
        }
        return true;
      });

      items.sort(byStartAsc);

      if (cursor) {
        const index = items.findIndex((event) => event.id === cursor);
        items = index === -1 ? items : items.slice(index + 1);
      }

      const pageItems = items.slice(0, limit);
      const hasMore = items.length > limit;
      return {
        items: pageItems,
        nextCursor: hasMore ? (pageItems.at(-1)?.id ?? null) : null,
      };
    },
    async create(event: Event) {
      db.events.set(event.id, event);
      return event;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.events.get(id), "Event", id), patch);
      db.events.set(id, next);
      return next;
    },
    async listOccurrences(eventId) {
      return [...db.occurrences.values()]
        .filter((occurrence) => occurrence.eventId === eventId)
        .sort(byStartAsc);
    },
    async upsertOccurrences(occurrences: EventOccurrence[]) {
      for (const occurrence of occurrences) db.occurrences.set(occurrence.id, occurrence);
    },
  };

  const ticketTypes: R.TicketTypeRepository = {
    async listByEvent(eventId) {
      return [...db.ticketTypes.values()]
        .filter((type) => type.eventId === eventId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async findById(id) {
      return db.ticketTypes.get(id) ?? null;
    },
    async create(ticketType: TicketType) {
      db.ticketTypes.set(ticketType.id, ticketType);
      return ticketType;
    },
  };

  const inventory: R.InventoryRepository = {
    async lockAvailableUnits(ticketTypeId, quantity, holdId) {
      // Callers reach this only from inside `runInTransaction`, which holds the
      // store mutex — the in-memory equivalent of SELECT ... FOR UPDATE.
      const locked: InventoryUnit[] = [];
      for (const unit of db.inventory.values()) {
        if (locked.length >= quantity) break;
        if (unit.ticketTypeId !== ticketTypeId) continue;
        if (unit.state !== InventoryState.AVAILABLE) continue;
        const held: InventoryUnit = { ...unit, state: InventoryState.HELD, holdId };
        db.inventory.set(held.id, held);
        locked.push(held);
      }
      return locked;
    },
    async findUnit(unitId) {
      return db.inventory.get(unitId) ?? null;
    },
    async countAvailable(ticketTypeId) {
      let count = 0;
      for (const unit of db.inventory.values()) {
        if (unit.ticketTypeId === ticketTypeId && unit.state === InventoryState.AVAILABLE) {
          count += 1;
        }
      }
      return count;
    },
    async countAvailableForEvent(eventId) {
      let count = 0;
      for (const unit of db.inventory.values()) {
        if (unit.eventId === eventId && unit.state === InventoryState.AVAILABLE) count += 1;
      }
      return count;
    },
    async createHold(hold: Hold) {
      db.holds.set(hold.id, hold);
      return hold;
    },
    async findHold(holdId) {
      return db.holds.get(holdId) ?? null;
    },
    async releaseHold(holdId) {
      const hold = db.holds.get(holdId);
      if (!hold || hold.releasedAt) return;
      for (const unitId of hold.unitIds) {
        const unit = db.inventory.get(unitId);
        if (!unit || unit.state !== InventoryState.HELD) continue;
        db.inventory.set(unitId, {
          ...unit,
          state: InventoryState.AVAILABLE,
          holdId: null,
        });
      }
      db.holds.set(holdId, { ...hold, releasedAt: new Date().toISOString() });
    },
    async markSold(unitIds, ticketIdByUnit) {
      for (const unitId of unitIds) {
        const unit = db.inventory.get(unitId);
        if (!unit) continue;
        db.inventory.set(unitId, {
          ...unit,
          state: InventoryState.SOLD,
          ticketId: ticketIdByUnit[unitId] ?? unit.ticketId,
        });
      }
    },
    async listExpiredHolds(now) {
      return [...db.holds.values()].filter(
        (hold) => !hold.releasedAt && hold.expiresAt <= now,
      );
    },
    async createUnits(units) {
      for (const unit of units) db.inventory.set(unit.id, unit);
    },
  };

  const orders: R.OrderRepository = {
    async findById(id) {
      return db.orders.get(id) ?? null;
    },
    async findByIdempotencyKey(key) {
      for (const order of db.orders.values()) {
        if (order.idempotencyKey === key) return order;
      }
      return null;
    },
    async listByUser(userId) {
      return [...db.orders.values()]
        .filter((order) => order.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async listByEvent(eventId) {
      return [...db.orders.values()].filter((order) => order.eventId === eventId);
    },
    async create(order: Order) {
      db.orders.set(order.id, order);
      return order;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.orders.get(id), "Order", id), patch);
      db.orders.set(id, next);
      return next;
    },
  };

  const tickets: R.TicketRepository = {
    async findById(id) {
      return db.tickets.get(id) ?? null;
    },
    async findByCode(code) {
      for (const ticket of db.tickets.values()) {
        if (ticket.code === code) return ticket;
      }
      return null;
    },
    async listByOwner(userId) {
      return [...db.tickets.values()].filter((ticket) => ticket.ownerUserId === userId);
    },
    async listByOrder(orderId) {
      return [...db.tickets.values()].filter((ticket) => ticket.orderId === orderId);
    },
    async listByEvent(eventId) {
      return [...db.tickets.values()].filter((ticket) => ticket.eventId === eventId);
    },
    async create(ticket: Ticket) {
      db.tickets.set(ticket.id, ticket);
      return ticket;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.tickets.get(id), "Ticket", id), patch);
      db.tickets.set(id, next);
      return next;
    },
    async countOwnedForEvent(userId, eventId) {
      let count = 0;
      for (const ticket of db.tickets.values()) {
        if (ticket.ownerUserId !== userId || ticket.eventId !== eventId) continue;
        if (
          ticket.status === TicketStatus.ACTIVE ||
          ticket.status === TicketStatus.LISTED ||
          ticket.status === TicketStatus.CHECKED_IN
        ) {
          count += 1;
        }
      }
      return count;
    },
  };

  const transfers: R.TransferRepository = {
    async findById(id) {
      return db.transfers.get(id) ?? null;
    },
    async listByTicket(ticketId) {
      return [...db.transfers.values()].filter((transfer) => transfer.ticketId === ticketId);
    },
    async listIncoming(email) {
      const wanted = email.toLowerCase();
      return [...db.transfers.values()].filter(
        (transfer) => transfer.toEmail.toLowerCase() === wanted,
      );
    },
    async create(transfer: TicketTransfer) {
      db.transfers.set(transfer.id, transfer);
      return transfer;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.transfers.get(id), "TicketTransfer", id), patch);
      db.transfers.set(id, next);
      return next;
    },
  };

  const bookings: R.BookingRepository = {
    async findById(id) {
      return db.bookings.get(id) ?? null;
    },
    async findByReference(reference) {
      for (const booking of db.bookings.values()) {
        if (booking.reference === reference) return booking;
      }
      return null;
    },
    async listByEvent(eventId) {
      return [...db.bookings.values()]
        .filter((booking) => booking.eventId === eventId)
        .sort((a, b) => a.primaryGuestName.localeCompare(b.primaryGuestName));
    },
    async listByUser(userId) {
      return [...db.bookings.values()].filter(
        (booking) => booking.primaryGuestUserId === userId,
      );
    },
    async listByEmail(email) {
      const wanted = email.toLowerCase();
      return [...db.bookings.values()].filter(
        (booking) => booking.email?.toLowerCase() === wanted,
      );
    },
    async create(booking: Booking) {
      db.bookings.set(booking.id, booking);
      return booking;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.bookings.get(id), "Booking", id), patch);
      db.bookings.set(id, next);
      return next;
    },
    async countConfirmedGuests(eventId, occurrenceId = null) {
      let count = 0;
      for (const booking of db.bookings.values()) {
        if (booking.eventId !== eventId) continue;
        if (occurrenceId && booking.occurrenceId !== occurrenceId) continue;
        if (
          booking.status === "CONFIRMED" ||
          booking.status === "PENDING" ||
          booking.status === "CHECKED_IN"
        ) {
          count += booking.guestCount;
        }
      }
      return count;
    },
  };

  const invites: R.InviteRepository = {
    async findByTokenHash(tokenHash) {
      for (const invite of db.invites.values()) {
        if (invite.tokenHash === tokenHash) return invite;
      }
      return null;
    },
    async findById(id) {
      return db.invites.get(id) ?? null;
    },
    async listByEvent(eventId) {
      return [...db.invites.values()].filter((invite) => invite.eventId === eventId);
    },
    async create(invite: PrivateInvite) {
      db.invites.set(invite.id, invite);
      return invite;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.invites.get(id), "PrivateInvite", id), patch);
      db.invites.set(id, next);
      return next;
    },
  };

  const tables: R.TableRepository = {
    async listByEvent(eventId) {
      return [...db.tables.values()]
        .filter((table) => table.eventId === eventId)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    },
    async findById(id) {
      return db.tables.get(id) ?? null;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.tables.get(id), "BanquetTable", id), patch);
      db.tables.set(id, next);
      return next;
    },
    async create(table: BanquetTable) {
      db.tables.set(table.id, table);
      return table;
    },
  };

  const payments: R.PaymentRepository = {
    async findById(id) {
      return db.payments.get(id) ?? null;
    },
    async findByProviderRequestId(requestId) {
      for (const payment of db.payments.values()) {
        if (payment.providerRequestId === requestId) return payment;
      }
      return null;
    },
    async findByProviderReference(reference) {
      for (const payment of db.payments.values()) {
        if (payment.providerReference === reference) return payment;
      }
      return null;
    },
    async listByOrder(orderId) {
      return [...db.payments.values()].filter((payment) => payment.orderId === orderId);
    },
    async listPendingOlderThan(cutoff) {
      return [...db.payments.values()].filter(
        (payment) => payment.status === "PENDING" && payment.createdAt <= cutoff,
      );
    },
    async create(payment: Payment) {
      db.payments.set(payment.id, payment);
      return payment;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.payments.get(id), "Payment", id), patch);
      db.payments.set(id, next);
      return next;
    },
  };

  const ledger: R.LedgerRepository = {
    async findAccountByCode(code) {
      for (const account of db.ledgerAccounts.values()) {
        if (account.code === code) return account;
      }
      return null;
    },
    async ensureAccount(account: LedgerAccount) {
      const existing = await ledger.findAccountByCode(account.code);
      if (existing) return existing;
      db.ledgerAccounts.set(account.id, account);
      return account;
    },
    async listAccounts() {
      return [...db.ledgerAccounts.values()];
    },
    async post(transaction: LedgerTransaction) {
      db.ledgerTransactions.set(transaction.id, transaction);
      return transaction;
    },
    async findByReference(reference) {
      for (const transaction of db.ledgerTransactions.values()) {
        if (transaction.reference === reference) return transaction;
      }
      return null;
    },
    async listTransactions() {
      return [...db.ledgerTransactions.values()].sort((a, b) =>
        a.postedAt.localeCompare(b.postedAt),
      );
    },
    async balanceOf(accountId) {
      const account = db.ledgerAccounts.get(accountId);
      if (!account) throw notFound("LedgerAccount", accountId);
      // Debits increase ASSET/EXPENSE accounts and decrease the rest.
      const debitPositive = account.type === "ASSET" || account.type === "EXPENSE";
      let balance = 0;
      for (const transaction of db.ledgerTransactions.values()) {
        for (const entry of transaction.entries) {
          if (entry.accountId !== accountId) continue;
          const signed = entry.side === "DEBIT" ? entry.amount.amount : -entry.amount.amount;
          balance += debitPositive ? signed : -signed;
        }
      }
      return balance;
    },
  };

  const payouts: R.PayoutRepository = {
    async findById(id) {
      return db.payouts.get(id) ?? null;
    },
    async listByOrganizer(organizerId) {
      return [...db.payouts.values()].filter((payout) => payout.organizerId === organizerId);
    },
    async create(payout: Payout) {
      db.payouts.set(payout.id, payout);
      return payout;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.payouts.get(id), "Payout", id), patch);
      db.payouts.set(id, next);
      return next;
    },
  };

  const listings: R.ListingRepository = {
    async findById(id) {
      return db.listings.get(id) ?? null;
    },
    async findActiveByTicket(ticketId: TicketId) {
      for (const listing of db.listings.values()) {
        if (
          listing.ticketId === ticketId &&
          (listing.status === "ACTIVE" || listing.status === "RESERVED")
        ) {
          return listing;
        }
      }
      return null;
    },
    async listByEvent(eventId) {
      return [...db.listings.values()].filter((listing) => listing.eventId === eventId);
    },
    async listBySeller(userId) {
      return [...db.listings.values()].filter((listing) => listing.sellerUserId === userId);
    },
    async countActiveBySeller(userId, eventId) {
      let count = 0;
      for (const listing of db.listings.values()) {
        if (
          listing.sellerUserId === userId &&
          listing.eventId === eventId &&
          (listing.status === "ACTIVE" || listing.status === "RESERVED")
        ) {
          count += 1;
        }
      }
      return count;
    },
    async create(listing: ResaleListing) {
      db.listings.set(listing.id, listing);
      return listing;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.listings.get(id), "ResaleListing", id), patch);
      db.listings.set(id, next);
      return next;
    },
  };

  const contributions: R.ContributionRepository = {
    async listByEvent(eventId) {
      return [...db.contributions.values()].filter(
        (contribution) => contribution.eventId === eventId,
      );
    },
    async create(contribution: Contribution) {
      db.contributions.set(contribution.id, contribution);
      return contribution;
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.contributions.get(id), "Contribution", id), patch);
      db.contributions.set(id, next);
      return next;
    },
  };

  const checkins: R.CheckInRepository = {
    async create(checkIn: CheckIn) {
      db.checkins.set(checkIn.id, checkIn);
      return checkIn;
    },
    async listByEvent(eventId) {
      return [...db.checkins.values()]
        .filter((checkIn) => checkIn.eventId === eventId)
        .sort((a, b) => b.at.localeCompare(a.at));
    },
    async findAdmittedForTicket(ticketId) {
      for (const checkIn of db.checkins.values()) {
        if (checkIn.ticketId === ticketId && checkIn.result === "ADMITTED") return checkIn;
      }
      return null;
    },
  };

  const risk: R.RiskRepository = {
    async record(event: RiskEvent) {
      db.riskEvents.set(event.id, event);
      return event;
    },
    async listForSubject(subjectType, subjectId) {
      return [...db.riskEvents.values()].filter(
        (event) => event.subjectType === subjectType && event.subjectId === subjectId,
      );
    },
    async listRecent(limit) {
      return [...db.riskEvents.values()]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, limit);
    },
  };

  const campaigns: R.CampaignRepository = {
    async create(campaign: Campaign) {
      db.campaigns.set(campaign.id, campaign);
      return campaign;
    },
    async listByOrganizer(organizerId) {
      return [...db.campaigns.values()]
        .filter((campaign) => campaign.organizerId === organizerId)
        .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
    },
  };

  const promoCodes: R.PromoCodeRepository = {
    async create(promoCode: PromoCode) {
      db.promoCodes.set(promoCode.id, promoCode);
      return promoCode;
    },
    async findById(id) {
      return db.promoCodes.get(id) ?? null;
    },
    async findByEventAndCode(eventId, code) {
      return (
        [...db.promoCodes.values()].find(
          (promo) => promo.eventId === eventId && promo.code === code,
        ) ?? null
      );
    },
    async listByEvent(eventId) {
      return [...db.promoCodes.values()]
        .filter((promo) => promo.eventId === eventId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async listByOrganizer(organizerId) {
      return [...db.promoCodes.values()]
        .filter((promo) => promo.organizerId === organizerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.promoCodes.get(id), "PromoCode", id), patch);
      db.promoCodes.set(id, next);
      return next;
    },
  };

  const affiliateLinks: R.AffiliateLinkRepository = {
    async create(link: AffiliateLink) {
      db.affiliateLinks.set(link.id, link);
      return link;
    },
    async findByCode(code) {
      return [...db.affiliateLinks.values()].find((link) => link.code === code) ?? null;
    },
    async listByEvent(eventId) {
      return [...db.affiliateLinks.values()]
        .filter((link) => link.eventId === eventId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async listByOrganizer(organizerId) {
      return [...db.affiliateLinks.values()]
        .filter((link) => link.organizerId === organizerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async update(id, patch) {
      const next = patched(requireEntity(db.affiliateLinks.get(id), "AffiliateLink", id), patch);
      db.affiliateLinks.set(id, next);
      return next;
    },
  };

  const audit: R.AuditRepository = {
    async append(entry: AuditLog) {
      // Append-only: an existing id is never overwritten.
      if (db.auditLogs.has(entry.id)) return db.auditLogs.get(entry.id)!;
      db.auditLogs.set(entry.id, entry);
      return entry;
    },
    async listForResource(resourceType, resourceId) {
      return [...db.auditLogs.values()]
        .filter((log) => log.resourceType === resourceType && log.resourceId === resourceId)
        .sort((a, b) => b.at.localeCompare(a.at));
    },
    async listRecent(limit) {
      return [...db.auditLogs.values()]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, limit);
    },
  };

  const notifications: R.NotificationRepository = {
    async enqueue(notification: Notification) {
      db.notifications.set(notification.id, notification);
      return notification;
    },
    async listForUser(userId) {
      return [...db.notifications.values()].filter(
        (notification) => notification.userId === userId,
      );
    },
    async listPending() {
      return [...db.notifications.values()].filter((notification) => !notification.sentAt);
    },
    async markSent(id, at) {
      const notification = db.notifications.get(id);
      if (!notification) return;
      db.notifications.set(id, { ...notification, sentAt: at });
    },
  };

  const webhooks: R.WebhookRepository = {
    async recordIfNew(record) {
      if (db.webhooks.has(record.dedupeKey)) return false;
      db.webhooks.set(record.dedupeKey, record);
      return true;
    },
    async markProcessed(dedupeKey, at) {
      const record = db.webhooks.get(dedupeKey);
      if (!record) return;
      db.webhooks.set(dedupeKey, { ...record, processedAt: at });
    },
    async listQuarantined() {
      return [...db.webhooks.values()]
        .filter((record) => record.quarantined)
        .map((record) => ({ dedupeKey: record.dedupeKey, provider: record.provider }));
    },
  };

  const idempotency: R.IdempotencyRepository = {
    async find(key) {
      const record = db.idempotency.get(key);
      if (!record) return null;
      if (record.expiresAt <= new Date().toISOString()) {
        db.idempotency.delete(key);
        return null;
      }
      return {
        requestHash: record.requestHash,
        status: record.status,
        response: record.response,
      };
    },
    async save(record) {
      db.idempotency.set(record.key, record);
    },
  };

  return {
    privateEvents,
    users,
    organizers,
    venues,
    events,
    ticketTypes,
    inventory,
    orders,
    tickets,
    transfers,
    bookings,
    invites,
    tables,
    payments,
    ledger,
    payouts,
    listings,
    contributions,
    checkins,
    risk,
    campaigns,
    promoCodes,
    affiliateLinks,
    audit,
    notifications,
    webhooks,
    idempotency,
  };
}

/* -------------------------------------------------------------------------- */
/* Query helpers                                                               */
/* -------------------------------------------------------------------------- */

function isFreeEvent(db: MemoryDb, event: Event): boolean {
  if (event.type === "FREE_RSVP") return true;
  const types = [...db.ticketTypes.values()].filter((type) => type.eventId === event.id);
  if (types.length === 0) return event.type !== "PAID_TICKET" && event.type !== "HYBRID";
  return types.every((type) => type.price.amount === 0);
}

function isBookingEvent(event: Event): boolean {
  return (
    event.type === "BOOKING" ||
    event.type === "BANQUET" ||
    event.type === "RECURRING_MEETING" ||
    event.type === "PRIVATE_INVITATION"
  );
}

export type { Venue, User, Organizer, InventoryUnit };
