import type { PrismaClient } from "@prisma/client";
import type { User } from "@/domain/types";
import { emptyDb, type MemoryDb } from "../memory/store";
import { seedDatabase } from "../../seed/seed-data";
import { createPrismaRepositories } from "./repositories";

/**
 * Seeds an empty PostgreSQL database with the same demo dataset the in-memory
 * store boots with, by building the in-memory dataset and replaying it through
 * the Prisma repositories in foreign-key order.
 *
 * Idempotent by construction: it runs only when the User table is empty, so a
 * restart against a seeded database changes nothing.
 */
export async function seedPostgresIfEmpty(prisma: PrismaClient): Promise<boolean> {
  const userCount = await prisma.user.count();
  if (userCount > 0) return false;

  const db: MemoryDb = emptyDb();
  seedDatabase(db);
  const repos = createPrismaRepositories(prisma);

  // Some seeded rows reference user ids that have no user record in the demo
  // dataset (walk-in buyers, staff named only in memberships). Foreign keys
  // need a row, so materialize placeholders first.
  const referencedUserIds = new Set<string>();
  for (const organizer of db.organizers.values()) {
    for (const member of organizer.members) referencedUserIds.add(member.userId);
  }
  for (const ticket of db.tickets.values()) {
    referencedUserIds.add(ticket.ownerUserId);
    for (const entry of ticket.ownershipHistory) {
      if (entry.fromUserId) referencedUserIds.add(entry.fromUserId);
      referencedUserIds.add(entry.toUserId);
    }
  }
  for (const order of db.orders.values()) if (order.userId) referencedUserIds.add(order.userId);
  for (const booking of db.bookings.values()) {
    if (booking.primaryGuestUserId) referencedUserIds.add(booking.primaryGuestUserId);
  }
  for (const transfer of db.transfers.values()) {
    referencedUserIds.add(transfer.fromUserId);
    if (transfer.toUserId) referencedUserIds.add(transfer.toUserId);
  }
  for (const listing of db.listings.values()) {
    referencedUserIds.add(listing.sellerUserId);
    if (listing.buyerUserId) referencedUserIds.add(listing.buyerUserId);
  }
  for (const log of db.auditLogs.values()) {
    if (log.actorUserId) referencedUserIds.add(log.actorUserId);
  }
  for (const notification of db.notifications.values()) {
    if (notification.userId) referencedUserIds.add(notification.userId);
  }

  for (const userId of referencedUserIds) {
    if (db.users.has(userId)) continue;
    const placeholder: User = {
      id: userId,
      email: `${userId.replace(/[^a-z0-9]/gi, "-")}@seed.bookit.co.ke`,
      emailVerifiedAt: null,
      phone: null,
      phoneVerifiedAt: null,
      fullName: userId,
      avatarUrl: null,
      city: null,
      roles: ["CONSUMER"],
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    };
    db.users.set(userId, placeholder);
  }

  for (const user of db.users.values()) await repos.users.create(user);
  for (const organizer of db.organizers.values()) await repos.organizers.create(organizer);
  for (const venue of db.venues.values()) await repos.venues.create(venue);
  for (const event of db.events.values()) await repos.events.create(event);
  await repos.events.upsertOccurrences([...db.occurrences.values()]);
  for (const ticketType of db.ticketTypes.values()) await repos.ticketTypes.create(ticketType);
  for (const promo of db.promoCodes.values()) await repos.promoCodes.create(promo);
  for (const link of db.affiliateLinks.values()) await repos.affiliateLinks.create(link);
  for (const order of db.orders.values()) await repos.orders.create(order);
  for (const hold of db.holds.values()) await repos.inventory.createHold(hold);
  for (const ticket of db.tickets.values()) await repos.tickets.create(ticket);
  await repos.inventory.createUnits([...db.inventory.values()]);
  for (const transfer of db.transfers.values()) await repos.transfers.create(transfer);
  // Tables before bookings: Booking.tableId is a foreign key.
  for (const table of db.tables.values()) await repos.tables.create(table);
  for (const booking of db.bookings.values()) await repos.bookings.create(booking);
  for (const invite of db.invites.values()) await repos.invites.create(invite);
  for (const payment of db.payments.values()) await repos.payments.create(payment);
  for (const account of db.ledgerAccounts.values()) await repos.ledger.ensureAccount(account);
  for (const transaction of db.ledgerTransactions.values()) await repos.ledger.post(transaction);
  for (const payout of db.payouts.values()) await repos.payouts.create(payout);
  for (const listing of db.listings.values()) await repos.listings.create(listing);
  for (const contribution of db.contributions.values()) {
    await repos.contributions.create(contribution);
  }
  for (const checkIn of db.checkins.values()) await repos.checkins.create(checkIn);
  for (const riskEvent of db.riskEvents.values()) await repos.risk.record(riskEvent);
  for (const campaign of db.campaigns.values()) await repos.campaigns.create(campaign);
  for (const log of db.auditLogs.values()) await repos.audit.append(log);
  for (const notification of db.notifications.values()) {
    await repos.notifications.enqueue(notification);
  }
  for (const page of db.privatePages.values()) await repos.privateEvents.savePage(page);
  for (const gift of db.gifts.values()) await repos.privateEvents.saveGift(gift);
  for (const claim of db.giftClaims.values()) await repos.privateEvents.createClaim(claim);
  for (const broadcast of db.broadcasts.values()) {
    await repos.privateEvents.createBroadcast(broadcast);
  }
  for (const message of db.guestMessages.values()) {
    await repos.privateEvents.createMessage(message);
  }

  return true;
}
