import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { notFound } from "@/domain/errors";
import type { Currency, Money } from "@/domain/money";
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
import type * as R from "../types";

/**
 * PostgreSQL repository implementations, via Prisma.
 *
 * The same `Repositories` contract as the in-memory store, backed by the
 * normalized schema in `prisma/schema.prisma`. Two conventions carry the whole
 * file:
 *
 * - Domain timestamps are ISO strings; columns are `DateTime`. Mapping happens
 *   at this boundary and nowhere else.
 * - Domain `Money` is `{ amount, currency }` in minor units; columns are a
 *   `BigInt` amount plus a currency code. JavaScript numbers are safe here —
 *   the largest sums the platform handles are far below 2^53.
 *
 * `createPrismaRepositories` accepts either the root client or a transaction
 * client, so the unit of work can hand services a transactional set.
 */

type Db = PrismaClient | Prisma.TransactionClient;

const iso = (date: Date): string => date.toISOString();
const isoN = (date: Date | null): string | null => (date ? iso(date) : null);
const dt = (value: string): Date => new Date(value);
const dtN = (value: string | null | undefined): Date | null => (value ? new Date(value) : null);

const mny = (amount: bigint, currency: string): Money => ({
  amount: Number(amount),
  currency: currency as Currency,
});
const mnyN = (amount: bigint | null, currency: string): Money | null =>
  amount === null ? null : mny(amount, currency);
const big = (money: Money): bigint => BigInt(money.amount);

const json = <T>(value: Prisma.JsonValue): T => value as T;
const asJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

/* -------------------------------------------------------------------------- */
/* Row → domain mappers                                                        */
/* -------------------------------------------------------------------------- */

type UserRow = Prisma.UserGetPayload<{ include: { profile: true; roles: true } }>;
const toUser = (row: UserRow): User => ({
  id: row.id,
  email: row.email,
  emailVerifiedAt: isoN(row.emailVerifiedAt),
  phone: row.phone,
  phoneVerifiedAt: isoN(row.phoneVerifiedAt),
  fullName: row.fullName,
  avatarUrl: row.profile?.avatarUrl ?? null,
  city: row.profile?.city ?? null,
  roles: row.roles.map((entry) => entry.role),
  mfaEnabled: row.mfaEnabled,
  createdAt: iso(row.createdAt),
});

type OrganizerRow = Prisma.OrganizerGetPayload<{ include: { members: true } }>;
const toOrganizer = (row: OrganizerRow): Organizer => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  type: row.type,
  about: row.about,
  logoUrl: row.logoUrl,
  verification: row.verification,
  trustTier: row.trustTier,
  supportEmail: row.supportEmail,
  supportPhone: row.supportPhone,
  members: row.members.map((member) => ({
    userId: member.userId,
    role: member.role,
    addedAt: iso(member.addedAt),
  })),
  createdAt: iso(row.createdAt),
});

type VenueRow = Prisma.VenueGetPayload<{ include: { sections: true } }>;
const toVenue = (row: VenueRow): Venue => ({
  id: row.id,
  name: row.name,
  city: row.city,
  area: row.area,
  addressLine: row.addressLine,
  capacity: row.capacity,
  latitude: row.latitude,
  longitude: row.longitude,
  sections: row.sections.map((section) => ({
    id: section.id,
    name: section.name,
    capacity: section.capacity,
  })),
});

const EVENT_INCLUDE = {
  policy: true,
  agenda: { orderBy: { sortOrder: "asc" } },
  recurrence: true,
} satisfies Prisma.EventInclude;
type EventRow = Prisma.EventGetPayload<{ include: typeof EVENT_INCLUDE }>;

const toEvent = (row: EventRow): Event => {
  if (!row.policy) throw new Error(`Event ${row.id} has no policy row`);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    type: row.type,
    status: row.status,
    visibility: row.visibility,
    category: row.category,
    tags: row.tags,
    organizerId: row.organizerId,
    venueId: row.venueId,
    startsAt: iso(row.startsAt),
    endsAt: iso(row.endsAt),
    heroImage: row.heroImage,
    cardImage: row.cardImage,
    capacity: row.capacity,
    policies: {
      refundPolicy: row.policy.refundPolicy,
      transferAllowed: row.policy.transferAllowed,
      resaleEnabled: row.policy.resaleEnabled,
      resaleMaxMarkupBps: row.policy.resaleMaxMarkupBps,
      resaleOpensAt: isoN(row.policy.resaleOpensAt),
      resaleClosesAt: isoN(row.policy.resaleClosesAt),
      maxListingsPerAccount: row.policy.maxListingsPerAccount,
      sellerPayoutDelayHours: row.policy.sellerPayoutDelayHrs,
      maxTicketsPerAccount: row.policy.maxTicketsPerAccount,
      ageRestriction: row.policy.ageRestriction,
      entryRules: row.policy.entryRules,
    },
    agenda: row.agenda.map((item) => ({
      startsAt: iso(item.startsAt),
      title: item.title,
      description: item.description,
    })),
    recurrence: row.recurrence
      ? {
          rrule: row.recurrence.rrule,
          humanLabel: row.recurrence.humanLabel,
          until: isoN(row.recurrence.until),
        }
      : null,
    featured: row.featured,
    createdAt: iso(row.createdAt),
  };
};

const policyCreate = (event: Event): Prisma.EventPolicyCreateWithoutEventInput => ({
  refundPolicy: event.policies.refundPolicy,
  transferAllowed: event.policies.transferAllowed,
  resaleEnabled: event.policies.resaleEnabled,
  resaleMaxMarkupBps: event.policies.resaleMaxMarkupBps,
  resaleOpensAt: dtN(event.policies.resaleOpensAt),
  resaleClosesAt: dtN(event.policies.resaleClosesAt),
  maxListingsPerAccount: event.policies.maxListingsPerAccount,
  sellerPayoutDelayHrs: event.policies.sellerPayoutDelayHours,
  maxTicketsPerAccount: event.policies.maxTicketsPerAccount,
  ageRestriction: event.policies.ageRestriction,
  entryRules: event.policies.entryRules,
});

type TicketTypeRow = Prisma.TicketTypeGetPayload<Record<string, never>>;
const toTicketType = (row: TicketTypeRow): TicketType => ({
  id: row.id,
  eventId: row.eventId,
  name: row.name,
  description: row.description,
  price: mny(row.priceAmount, row.currency),
  quantity: row.quantity,
  minPerOrder: row.minPerOrder,
  maxPerOrder: row.maxPerOrder,
  salesStartAt: iso(row.salesStartAt),
  salesEndAt: iso(row.salesEndAt),
  sectionId: row.sectionId,
  sortOrder: row.sortOrder,
});

type UnitRow = Prisma.InventoryUnitGetPayload<Record<string, never>>;
const toUnit = (row: UnitRow): InventoryUnit => ({
  id: row.id,
  ticketTypeId: row.ticketTypeId,
  eventId: row.eventId,
  state: row.state,
  holdId: row.holdId,
  ticketId: row.ticketId,
  seatLabel: row.seatLabel,
});

type HoldRow = Prisma.TicketHoldGetPayload<Record<string, never>>;
const toHold = (row: HoldRow): Hold => ({
  id: row.id,
  orderId: row.orderId,
  eventId: row.eventId,
  unitIds: row.unitIds,
  expiresAt: iso(row.expiresAt),
  releasedAt: isoN(row.releasedAt),
});

type OrderRow = Prisma.OrderGetPayload<{ include: { items: true } }>;
const toOrder = (row: OrderRow): Order => ({
  id: row.id,
  reference: row.reference,
  userId: row.userId,
  buyerEmail: row.buyerEmail,
  buyerPhone: row.buyerPhone,
  eventId: row.eventId,
  items: row.items.map((item) => ({
    id: item.id,
    ticketTypeId: item.ticketTypeId,
    quantity: item.quantity,
    unitPrice: mny(item.unitAmount, item.currency),
    lineTotal: mny(item.lineAmount, item.currency),
  })),
  subtotal: mny(row.subtotalAmount, row.currency),
  discount: mny(row.discountAmount, row.currency),
  promoCodeId: row.promoCodeId,
  fees: mny(row.feesAmount, row.currency),
  total: mny(row.totalAmount, row.currency),
  status: row.status,
  holdId: row.holdId,
  idempotencyKey: row.idempotencyKey,
  createdAt: iso(row.createdAt),
  paidAt: isoN(row.paidAt),
});

const TICKET_INCLUDE = {
  ownershipHistory: { orderBy: { at: "asc" } },
} satisfies Prisma.TicketInclude;
type TicketRow = Prisma.TicketGetPayload<{ include: typeof TICKET_INCLUDE }>;
const toTicket = (row: TicketRow): Ticket => ({
  id: row.id,
  code: row.code,
  eventId: row.eventId,
  ticketTypeId: row.ticketTypeId,
  orderId: row.orderId,
  ownerUserId: row.ownerUserId,
  ownerName: row.ownerName,
  seatLabel: row.seatLabel,
  status: row.status,
  facePrice: mny(row.faceAmount, row.currency),
  credentialVersion: row.credentialVersion,
  issuedAt: iso(row.issuedAt),
  checkedInAt: isoN(row.checkedInAt),
  ownershipHistory: row.ownershipHistory.map((entry) => ({
    at: iso(entry.at),
    fromUserId: entry.fromUserId,
    toUserId: entry.toUserId,
    reason: entry.reason as Ticket["ownershipHistory"][number]["reason"],
    reference: entry.reference,
  })),
});

type TransferRow = Prisma.TicketTransferGetPayload<Record<string, never>>;
const toTransfer = (row: TransferRow): TicketTransfer => ({
  id: row.id,
  ticketId: row.ticketId,
  fromUserId: row.fromUserId,
  toEmail: row.toEmail,
  toUserId: row.toUserId,
  status: row.status,
  createdAt: iso(row.createdAt),
  expiresAt: iso(row.expiresAt),
  resolvedAt: isoN(row.resolvedAt),
});

type BookingRow = Prisma.BookingGetPayload<{ include: { guests: true } }>;
const toBooking = (row: BookingRow): Booking => ({
  id: row.id,
  reference: row.reference,
  eventId: row.eventId,
  occurrenceId: row.occurrenceId,
  primaryGuestUserId: row.primaryGuestUserId,
  primaryGuestName: row.primaryGuestName,
  phone: row.phone,
  email: row.email,
  status: row.status,
  guestCount: row.guestCount,
  guests: row.guests.map((guest) => ({
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    email: guest.email,
    mealChoice: guest.mealChoice,
    checkedInAt: isoN(guest.checkedInAt),
  })),
  tableId: row.tableId,
  mealChoice: row.mealChoice,
  contributionPledged: mnyN(row.contributionPledged, row.currency),
  contributionPaid: mnyN(row.contributionPaid, row.currency),
  paymentStatus: row.paymentStatus,
  invitedBy: row.invitedBy,
  notes: row.notes,
  checkedInAt: isoN(row.checkedInAt),
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

type InviteRow = Prisma.PrivateInviteGetPayload<Record<string, never>>;
const toInvite = (row: InviteRow): PrivateInvite => ({
  id: row.id,
  eventId: row.eventId,
  tokenHash: row.tokenHash,
  inviteeName: row.inviteeName,
  phone: row.phone,
  email: row.email,
  maxGuests: row.maxGuests,
  expiresAt: iso(row.expiresAt),
  status: row.status,
  bookingId: row.bookingId,
  createdAt: iso(row.createdAt),
});

type TableRow = Prisma.BanquetTableGetPayload<{ include: { assignments: true } }>;
const toTable = (row: TableRow): BanquetTable => ({
  id: row.id,
  eventId: row.eventId,
  name: row.name,
  seats: row.seats,
  assignedBookingIds: row.assignments.map((assignment) => assignment.bookingId),
});

type PaymentRow = Prisma.PaymentGetPayload<Record<string, never>>;
const toPayment = (row: PaymentRow): Payment => ({
  id: row.id,
  orderId: row.orderId,
  bookingId: row.bookingId,
  method: row.method,
  status: row.status,
  expectedAmount: mny(row.expectedAmount, row.currency),
  receivedAmount: mnyN(row.receivedAmount, row.currency),
  providerRequestId: row.providerRequestId,
  providerReference: row.providerReference,
  providerTimestamp: isoN(row.providerTimestamp),
  phone: row.phone,
  failureReason: row.failureReason,
  createdAt: iso(row.createdAt),
  updatedAt: iso(row.updatedAt),
});

type AccountRow = Prisma.LedgerAccountGetPayload<Record<string, never>>;
const toAccount = (row: AccountRow): LedgerAccount => ({
  id: row.id,
  code: row.code,
  name: row.name,
  type: row.type,
  ownerOrganizerId: row.ownerOrganizerId,
  currency: row.currency as Currency,
});

type LedgerTxRow = Prisma.LedgerTransactionGetPayload<{ include: { entries: true } }>;
const toLedgerTx = (row: LedgerTxRow): LedgerTransaction => ({
  id: row.id,
  reference: row.reference,
  kind: row.kind as LedgerTransaction["kind"],
  entries: row.entries.map((entry) => ({
    accountId: entry.accountId,
    amount: mny(entry.amount, entry.currency),
    side: entry.side,
    memo: entry.memo,
  })),
  postedAt: iso(row.postedAt),
  metadata: json<Record<string, string>>(row.metadata),
});

type PayoutRow = Prisma.PayoutGetPayload<Record<string, never>>;
const toPayout = (row: PayoutRow): Payout => ({
  id: row.id,
  organizerId: row.organizerId,
  amount: mny(row.amount, row.currency),
  status: row.status,
  destinationMasked: row.destinationMasked,
  requestedAt: iso(row.requestedAt),
  approvedByUserId: row.approvedByUserId,
  paidAt: isoN(row.paidAt),
  holdReason: row.holdReason,
});

type ListingRow = Prisma.ResaleListingGetPayload<Record<string, never>>;
const toListing = (row: ListingRow): ResaleListing => ({
  id: row.id,
  ticketId: row.ticketId,
  eventId: row.eventId,
  sellerUserId: row.sellerUserId,
  askPrice: mny(row.askAmount, row.currency),
  facePrice: mny(row.faceAmount, row.currency),
  status: row.status,
  buyerUserId: row.buyerUserId,
  createdAt: iso(row.createdAt),
  soldAt: isoN(row.soldAt),
});

type ContributionRow = Prisma.ContributionGetPayload<Record<string, never>>;
const toContribution = (row: ContributionRow): Contribution => ({
  id: row.id,
  eventId: row.eventId,
  bookingId: row.bookingId,
  contributorName: row.contributorName,
  phone: row.phone,
  pledged: mny(row.pledgedAmount, row.currency),
  received: mny(row.receivedAmount, row.currency),
  status: row.status,
  method: row.method,
  reference: row.reference,
  createdAt: iso(row.createdAt),
});

type CheckInRow = Prisma.CheckInGetPayload<Record<string, never>>;
const toCheckIn = (row: CheckInRow): CheckIn => ({
  id: row.id,
  eventId: row.eventId,
  ticketId: row.ticketId,
  bookingId: row.bookingId,
  result: row.result,
  scannedByUserId: row.scannedByUserId,
  deviceId: row.deviceId,
  overrideReason: row.overrideReason,
  at: iso(row.at),
});

type RiskRow = Prisma.RiskEventGetPayload<Record<string, never>>;
const toRisk = (row: RiskRow): RiskEvent => ({
  id: row.id,
  subjectType: row.subjectType as RiskEvent["subjectType"],
  subjectId: row.subjectId,
  outcome: row.outcome,
  score: row.score,
  reasonCodes: row.reasonCodes,
  at: iso(row.at),
});

type CampaignRow = Prisma.CampaignGetPayload<Record<string, never>>;
const toCampaign = (row: CampaignRow): Campaign => ({
  id: row.id,
  organizerId: row.organizerId,
  segments: row.segments,
  channel: row.channel as Campaign["channel"],
  subject: row.subject,
  body: row.body,
  recipientCount: row.recipientCount,
  sentByUserId: row.sentByUserId,
  sentAt: iso(row.sentAt),
});

type PromoRow = Prisma.PromoCodeGetPayload<Record<string, never>>;
const toPromo = (row: PromoRow): PromoCode => ({
  id: row.id,
  organizerId: row.organizerId,
  eventId: row.eventId,
  code: row.code,
  kind: row.kind as PromoCode["kind"],
  percentBps: row.percentBps,
  fixedAmount: mnyN(row.fixedAmount, row.currency),
  maxRedemptions: row.maxRedemptions,
  redemptionCount: row.redemptionCount,
  startsAt: iso(row.startsAt),
  endsAt: isoN(row.endsAt),
  disabledAt: isoN(row.disabledAt),
  createdAt: iso(row.createdAt),
});

type AffiliateRow = Prisma.AffiliateLinkGetPayload<Record<string, never>>;
const toAffiliate = (row: AffiliateRow): AffiliateLink => ({
  id: row.id,
  organizerId: row.organizerId,
  eventId: row.eventId,
  code: row.code,
  label: row.label,
  clickCount: row.clickCount,
  createdAt: iso(row.createdAt),
});

type AuditRow = Prisma.AuditLogGetPayload<Record<string, never>>;
const toAudit = (row: AuditRow): AuditLog => ({
  id: row.id,
  actorUserId: row.actorUserId,
  actorRole: row.actorRole,
  action: row.action,
  resourceType: row.resourceType,
  resourceId: row.resourceId,
  before: row.before === null ? null : json<Record<string, unknown>>(row.before),
  after: row.after === null ? null : json<Record<string, unknown>>(row.after),
  ip: row.ip,
  sessionId: row.sessionId,
  mfaSatisfied: row.mfaSatisfied,
  reason: row.reason,
  approvalChain: row.approvalChain,
  at: iso(row.at),
});

type NotificationRow = Prisma.NotificationGetPayload<Record<string, never>>;
const toNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  userId: row.userId,
  channel: row.channel as Notification["channel"],
  template: row.template,
  to: row.to,
  payload: json<Record<string, string>>(row.payload),
  sentAt: isoN(row.sentAt),
  createdAt: iso(row.createdAt),
});

/* -------------------------------------------------------------------------- */
/* Repositories                                                                */
/* -------------------------------------------------------------------------- */

export function createPrismaRepositories(db: Db): R.Repositories {
  const privateEvents: R.PrivateEventRepository = {
    async findPage(eventId) {
      const row = await db.privateEventPage.findUnique({ where: { eventId } });
      return row ? json<PrivateEventPage>(row.content) : null;
    },
    async savePage(page) {
      await db.privateEventPage.upsert({
        where: { eventId: page.eventId },
        create: { eventId: page.eventId, content: asJson(page) },
        update: { content: asJson(page) },
      });
      return page;
    },

    async listGifts(eventId) {
      const rows = await db.giftItem.findMany({
        where: { eventId },
        orderBy: { sortOrder: "asc" },
      });
      return rows.map((row) => json<GiftItem>(row.content));
    },
    async findGift(giftId) {
      const row = await db.giftItem.findUnique({ where: { id: giftId } });
      return row ? json<GiftItem>(row.content) : null;
    },
    async saveGift(gift) {
      await db.giftItem.upsert({
        where: { id: gift.id },
        create: {
          id: gift.id,
          eventId: gift.eventId,
          sortOrder: gift.sortOrder,
          archived: gift.archived,
          content: asJson(gift),
        },
        update: { sortOrder: gift.sortOrder, archived: gift.archived, content: asJson(gift) },
      });
      return gift;
    },
    async updateGift(giftId, patch) {
      const row = await db.giftItem.findUnique({ where: { id: giftId } });
      if (!row) throw notFound("GiftItem", giftId);
      const next = { ...json<GiftItem>(row.content), ...patch };
      await db.giftItem.update({
        where: { id: giftId },
        data: { sortOrder: next.sortOrder, archived: next.archived, content: asJson(next) },
      });
      return next;
    },

    async listClaims(eventId) {
      const rows = await db.giftClaim.findMany({
        where: { eventId },
        orderBy: { claimedAt: "desc" },
      });
      return rows.map((row) => json<GiftClaim>(row.content));
    },
    async createClaim(claim) {
      await db.giftClaim.create({
        data: {
          id: claim.id,
          giftId: claim.giftId,
          eventId: claim.eventId,
          inviteId: claim.inviteId,
          claimedAt: dt(claim.claimedAt),
          content: asJson(claim),
        },
      });
      return claim;
    },
    async listClaimsByInvite(inviteId) {
      const rows = await db.giftClaim.findMany({ where: { inviteId } });
      return rows.map((row) => json<GiftClaim>(row.content));
    },

    async listBroadcasts(eventId) {
      const rows = await db.broadcast.findMany({
        where: { eventId },
        orderBy: { sentAt: "desc" },
      });
      return rows.map((row) => json<Broadcast>(row.content));
    },
    async createBroadcast(broadcast) {
      await db.broadcast.create({
        data: {
          id: broadcast.id,
          eventId: broadcast.eventId,
          sentAt: dt(broadcast.sentAt),
          content: asJson(broadcast),
        },
      });
      return broadcast;
    },

    async listMessages(eventId) {
      const rows = await db.guestMessage.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((row) => json<GuestMessage>(row.content));
    },
    async createMessage(message) {
      await db.guestMessage.create({
        data: {
          id: message.id,
          eventId: message.eventId,
          createdAt: dt(message.createdAt),
          content: asJson(message),
        },
      });
      return message;
    },
    async updateMessage(id, patch) {
      const row = await db.guestMessage.findUnique({ where: { id } });
      if (!row) throw notFound("GuestMessage", id);
      const next = { ...json<GuestMessage>(row.content), ...patch };
      await db.guestMessage.update({ where: { id }, data: { content: asJson(next) } });
      return next;
    },
  };

  const USER_INCLUDE = { profile: true, roles: true } satisfies Prisma.UserInclude;

  const users: R.UserRepository = {
    async findById(id) {
      const row = await db.user.findUnique({ where: { id }, include: USER_INCLUDE });
      return row ? toUser(row) : null;
    },
    async findByEmail(email) {
      const row = await db.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        include: USER_INCLUDE,
      });
      return row ? toUser(row) : null;
    },
    async list() {
      const rows = await db.user.findMany({ include: USER_INCLUDE });
      return rows.map(toUser);
    },
    async create(user) {
      const row = await db.user.create({
        data: {
          id: user.id,
          email: user.email,
          emailVerifiedAt: dtN(user.emailVerifiedAt),
          phone: user.phone,
          phoneVerifiedAt: dtN(user.phoneVerifiedAt),
          fullName: user.fullName,
          mfaEnabled: user.mfaEnabled,
          createdAt: dt(user.createdAt),
          profile: { create: { avatarUrl: user.avatarUrl, city: user.city } },
          roles: { create: user.roles.map((role) => ({ role })) },
        },
        include: USER_INCLUDE,
      });
      return toUser(row);
    },
    async update(id, patch) {
      const data: Prisma.UserUpdateInput = {};
      if (patch.email !== undefined) data.email = patch.email;
      if (patch.emailVerifiedAt !== undefined) data.emailVerifiedAt = dtN(patch.emailVerifiedAt);
      if (patch.phone !== undefined) data.phone = patch.phone;
      if (patch.phoneVerifiedAt !== undefined) data.phoneVerifiedAt = dtN(patch.phoneVerifiedAt);
      if (patch.fullName !== undefined) data.fullName = patch.fullName;
      if (patch.mfaEnabled !== undefined) data.mfaEnabled = patch.mfaEnabled;
      if (patch.roles !== undefined) {
        data.roles = { deleteMany: {}, create: patch.roles.map((role) => ({ role })) };
      }
      if (patch.avatarUrl !== undefined || patch.city !== undefined) {
        data.profile = {
          upsert: {
            create: { avatarUrl: patch.avatarUrl ?? null, city: patch.city ?? null },
            update: {
              ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
              ...(patch.city !== undefined ? { city: patch.city } : {}),
            },
          },
        };
      }
      const row = await db.user.update({ where: { id }, data, include: USER_INCLUDE });
      return toUser(row);
    },
  };

  const ORG_INCLUDE = { members: true } satisfies Prisma.OrganizerInclude;

  const organizers: R.OrganizerRepository = {
    async findById(id) {
      const row = await db.organizer.findUnique({ where: { id }, include: ORG_INCLUDE });
      return row ? toOrganizer(row) : null;
    },
    async findBySlug(slug) {
      const row = await db.organizer.findUnique({ where: { slug }, include: ORG_INCLUDE });
      return row ? toOrganizer(row) : null;
    },
    async list() {
      const rows = await db.organizer.findMany({ include: ORG_INCLUDE });
      return rows.map(toOrganizer);
    },
    async create(organizer) {
      const row = await db.organizer.create({
        data: {
          id: organizer.id,
          name: organizer.name,
          slug: organizer.slug,
          type: organizer.type,
          about: organizer.about,
          logoUrl: organizer.logoUrl,
          verification: organizer.verification,
          trustTier: organizer.trustTier,
          supportEmail: organizer.supportEmail,
          supportPhone: organizer.supportPhone,
          createdAt: dt(organizer.createdAt),
          members: {
            create: organizer.members.map((member) => ({
              userId: member.userId,
              role: member.role,
              addedAt: dt(member.addedAt),
            })),
          },
        },
        include: ORG_INCLUDE,
      });
      return toOrganizer(row);
    },
    async update(id, patch) {
      const data: Prisma.OrganizerUpdateInput = {};
      if (patch.name !== undefined) data.name = patch.name;
      if (patch.slug !== undefined) data.slug = patch.slug;
      if (patch.about !== undefined) data.about = patch.about;
      if (patch.logoUrl !== undefined) data.logoUrl = patch.logoUrl;
      if (patch.verification !== undefined) data.verification = patch.verification;
      if (patch.trustTier !== undefined) data.trustTier = patch.trustTier;
      if (patch.supportEmail !== undefined) data.supportEmail = patch.supportEmail;
      if (patch.supportPhone !== undefined) data.supportPhone = patch.supportPhone;
      if (patch.members !== undefined) {
        data.members = {
          deleteMany: {},
          create: patch.members.map((member) => ({
            userId: member.userId,
            role: member.role,
            addedAt: dt(member.addedAt),
          })),
        };
      }
      const row = await db.organizer.update({ where: { id }, data, include: ORG_INCLUDE });
      return toOrganizer(row);
    },
  };

  const venues: R.VenueRepository = {
    async findById(id) {
      const row = await db.venue.findUnique({ where: { id }, include: { sections: true } });
      return row ? toVenue(row) : null;
    },
    async list() {
      const rows = await db.venue.findMany({ include: { sections: true } });
      return rows.map(toVenue);
    },
    async create(venue) {
      const row = await db.venue.create({
        data: {
          id: venue.id,
          name: venue.name,
          city: venue.city,
          area: venue.area,
          addressLine: venue.addressLine,
          capacity: venue.capacity,
          latitude: venue.latitude,
          longitude: venue.longitude,
          sections: {
            create: venue.sections.map((section) => ({
              id: section.id,
              name: section.name,
              capacity: section.capacity,
            })),
          },
        },
        include: { sections: true },
      });
      return toVenue(row);
    },
  };

  const events: R.EventRepository = {
    async findById(id) {
      const row = await db.event.findUnique({ where: { id }, include: EVENT_INCLUDE });
      return row ? toEvent(row) : null;
    },
    async findBySlug(slug) {
      const row = await db.event.findUnique({ where: { slug }, include: EVENT_INCLUDE });
      return row ? toEvent(row) : null;
    },
    async listAll() {
      const rows = await db.event.findMany({
        include: EVENT_INCLUDE,
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      });
      return rows.map(toEvent);
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
        venueId,
        includeNonPublic = false,
        cursor = null,
        limit = 24,
      } = query;

      // Defence in depth, mirroring the in-memory store: `includeNonPublic` is
      // only honoured for a query already scoped to one organizer.
      const mayIncludeNonPublic = includeNonPublic && Boolean(organizerId);

      const where: Prisma.EventWhereInput = {
        ...(mayIncludeNonPublic ? {} : { visibility: "PUBLIC" }),
        ...(organizerId ? { organizerId } : {}),
        ...(venueId ? { venueId } : {}),
        ...(featuredOnly ? { featured: true } : {}),
        ...(category ? { category: category as Event["category"] } : {}),
        ...(types?.length ? { type: { in: types as Event["type"][] } } : {}),
        ...(from || to
          ? { startsAt: { ...(from ? { gte: dt(from) } : {}), ...(to ? { lte: dt(to) } : {}) } }
          : {}),
      };

      const rows = await db.event.findMany({
        where,
        include: EVENT_INCLUDE,
        orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      });
      let items = rows.map(toEvent);

      // The remaining filters need joined data; the candidate set is already
      // narrow, so the joins are two indexed lookups.
      if (city || search) {
        const venueRows = await db.venue.findMany({ select: { id: true, name: true, city: true } });
        const venuesById = new Map(venueRows.map((venue) => [venue.id, venue]));
        if (city) {
          const wanted = city.toLowerCase();
          items = items.filter(
            (event) => venuesById.get(event.venueId)?.city.toLowerCase() === wanted,
          );
        }
        if (search) {
          const organizerRows = await db.organizer.findMany({ select: { id: true, name: true } });
          const organizersById = new Map(organizerRows.map((org) => [org.id, org]));
          const term = search.trim().toLowerCase();
          items = items.filter((event) => {
            const venue = venuesById.get(event.venueId);
            const organizer = organizersById.get(event.organizerId);
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
            return haystack.includes(term);
          });
        }
      }

      if (bookingsOnly) {
        items = items.filter(
          (event) =>
            event.type === "BOOKING" ||
            event.type === "BANQUET" ||
            event.type === "RECURRING_MEETING" ||
            event.type === "PRIVATE_INVITATION",
        );
      }

      if (freeOnly) {
        const typeRows = await db.ticketType.findMany({
          where: { eventId: { in: items.map((event) => event.id) } },
          select: { eventId: true, priceAmount: true },
        });
        const byEvent = new Map<string, bigint[]>();
        for (const row of typeRows) {
          const list = byEvent.get(row.eventId) ?? [];
          list.push(row.priceAmount);
          byEvent.set(row.eventId, list);
        }
        items = items.filter((event) => {
          if (event.type === "FREE_RSVP") return true;
          const prices = byEvent.get(event.id);
          if (!prices || prices.length === 0) {
            return event.type !== "PAID_TICKET" && event.type !== "HYBRID";
          }
          return prices.every((price) => price === 0n);
        });
      }

      if (cursor) {
        const index = items.findIndex((event) => event.id === cursor);
        items = index === -1 ? items : items.slice(index + 1);
      }

      const pageItems = items.slice(0, limit);
      const hasMore = items.length > limit;
      return { items: pageItems, nextCursor: hasMore ? (pageItems.at(-1)?.id ?? null) : null };
    },
    async create(event) {
      const row = await db.event.create({
        data: {
          id: event.id,
          slug: event.slug,
          title: event.title,
          subtitle: event.subtitle,
          description: event.description,
          type: event.type,
          status: event.status,
          visibility: event.visibility,
          category: event.category,
          tags: event.tags,
          organizer: { connect: { id: event.organizerId } },
          venue: { connect: { id: event.venueId } },
          startsAt: dt(event.startsAt),
          endsAt: dt(event.endsAt),
          heroImage: event.heroImage,
          cardImage: event.cardImage,
          capacity: event.capacity,
          featured: event.featured,
          createdAt: dt(event.createdAt),
          policy: { create: policyCreate(event) },
          agenda: {
            create: event.agenda.map((item, index) => ({
              startsAt: dt(item.startsAt),
              title: item.title,
              description: item.description,
              sortOrder: index,
            })),
          },
          ...(event.recurrence
            ? {
                recurrence: {
                  create: {
                    rrule: event.recurrence.rrule,
                    humanLabel: event.recurrence.humanLabel,
                    until: dtN(event.recurrence.until),
                  },
                },
              }
            : {}),
        },
        include: EVENT_INCLUDE,
      });
      return toEvent(row);
    },
    async update(id, patch) {
      const data: Prisma.EventUpdateInput = {};
      if (patch.slug !== undefined) data.slug = patch.slug;
      if (patch.title !== undefined) data.title = patch.title;
      if (patch.subtitle !== undefined) data.subtitle = patch.subtitle;
      if (patch.description !== undefined) data.description = patch.description;
      if (patch.type !== undefined) data.type = patch.type;
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.visibility !== undefined) data.visibility = patch.visibility;
      if (patch.category !== undefined) data.category = patch.category;
      if (patch.tags !== undefined) data.tags = patch.tags;
      if (patch.startsAt !== undefined) data.startsAt = dt(patch.startsAt);
      if (patch.endsAt !== undefined) data.endsAt = dt(patch.endsAt);
      if (patch.heroImage !== undefined) data.heroImage = patch.heroImage;
      if (patch.cardImage !== undefined) data.cardImage = patch.cardImage;
      if (patch.capacity !== undefined) data.capacity = patch.capacity;
      if (patch.featured !== undefined) data.featured = patch.featured;
      if (patch.policies !== undefined) {
        const policies = patch.policies;
        data.policy = {
          upsert: {
            create: {
              refundPolicy: policies.refundPolicy,
              transferAllowed: policies.transferAllowed,
              resaleEnabled: policies.resaleEnabled,
              resaleMaxMarkupBps: policies.resaleMaxMarkupBps,
              resaleOpensAt: dtN(policies.resaleOpensAt),
              resaleClosesAt: dtN(policies.resaleClosesAt),
              maxListingsPerAccount: policies.maxListingsPerAccount,
              sellerPayoutDelayHrs: policies.sellerPayoutDelayHours,
              maxTicketsPerAccount: policies.maxTicketsPerAccount,
              ageRestriction: policies.ageRestriction,
              entryRules: policies.entryRules,
            },
            update: {
              refundPolicy: policies.refundPolicy,
              transferAllowed: policies.transferAllowed,
              resaleEnabled: policies.resaleEnabled,
              resaleMaxMarkupBps: policies.resaleMaxMarkupBps,
              resaleOpensAt: dtN(policies.resaleOpensAt),
              resaleClosesAt: dtN(policies.resaleClosesAt),
              maxListingsPerAccount: policies.maxListingsPerAccount,
              sellerPayoutDelayHrs: policies.sellerPayoutDelayHours,
              maxTicketsPerAccount: policies.maxTicketsPerAccount,
              ageRestriction: policies.ageRestriction,
              entryRules: policies.entryRules,
            },
          },
        };
      }
      if (patch.agenda !== undefined) {
        data.agenda = {
          deleteMany: {},
          create: patch.agenda.map((item, index) => ({
            startsAt: dt(item.startsAt),
            title: item.title,
            description: item.description,
            sortOrder: index,
          })),
        };
      }
      if (patch.recurrence !== undefined) {
        data.recurrence = patch.recurrence
          ? {
              upsert: {
                create: {
                  rrule: patch.recurrence.rrule,
                  humanLabel: patch.recurrence.humanLabel,
                  until: dtN(patch.recurrence.until),
                },
                update: {
                  rrule: patch.recurrence.rrule,
                  humanLabel: patch.recurrence.humanLabel,
                  until: dtN(patch.recurrence.until),
                },
              },
            }
          : { delete: true };
      }
      const row = await db.event.update({ where: { id }, data, include: EVENT_INCLUDE });
      return toEvent(row);
    },
    async listOccurrences(eventId) {
      const rows = await db.eventOccurrence.findMany({
        where: { eventId },
        orderBy: { startsAt: "asc" },
      });
      return rows.map((row) => ({
        id: row.id,
        eventId: row.eventId,
        startsAt: iso(row.startsAt),
        endsAt: iso(row.endsAt),
        notes: row.notes,
        cancelled: row.cancelled,
      }));
    },
    async upsertOccurrences(occurrences: EventOccurrence[]) {
      for (const occurrence of occurrences) {
        await db.eventOccurrence.upsert({
          where: { id: occurrence.id },
          create: {
            id: occurrence.id,
            eventId: occurrence.eventId,
            startsAt: dt(occurrence.startsAt),
            endsAt: dt(occurrence.endsAt),
            notes: occurrence.notes,
            cancelled: occurrence.cancelled,
          },
          update: {
            startsAt: dt(occurrence.startsAt),
            endsAt: dt(occurrence.endsAt),
            notes: occurrence.notes,
            cancelled: occurrence.cancelled,
          },
        });
      }
    },
  };

  const ticketTypes: R.TicketTypeRepository = {
    async listByEvent(eventId) {
      const rows = await db.ticketType.findMany({
        where: { eventId },
        orderBy: { sortOrder: "asc" },
      });
      return rows.map(toTicketType);
    },
    async findById(id) {
      const row = await db.ticketType.findUnique({ where: { id } });
      return row ? toTicketType(row) : null;
    },
    async create(ticketType) {
      const row = await db.ticketType.create({
        data: {
          id: ticketType.id,
          eventId: ticketType.eventId,
          name: ticketType.name,
          description: ticketType.description,
          priceAmount: big(ticketType.price),
          currency: ticketType.price.currency,
          quantity: ticketType.quantity,
          minPerOrder: ticketType.minPerOrder,
          maxPerOrder: ticketType.maxPerOrder,
          salesStartAt: dt(ticketType.salesStartAt),
          salesEndAt: dt(ticketType.salesEndAt),
          sectionId: ticketType.sectionId,
          sortOrder: ticketType.sortOrder,
        },
      });
      return toTicketType(row);
    },
  };

  interface RawUnitRow {
    id: string;
    ticketTypeId: string;
    eventId: string;
    state: string;
    holdId: string | null;
    ticketId: string | null;
    seatLabel: string | null;
  }

  const inventory: R.InventoryRepository = {
    async lockAvailableUnits(ticketTypeId, quantity, holdId) {
      // SELECT ... FOR UPDATE SKIP LOCKED: two buyers racing for the last seat
      // lock disjoint rows, so neither blocks and neither double-sells.
      const rows = await db.$queryRaw<RawUnitRow[]>`
        UPDATE "InventoryUnit"
        SET "state" = 'HELD', "holdId" = ${holdId}
        WHERE "id" IN (
          SELECT "id" FROM "InventoryUnit"
          WHERE "ticketTypeId" = ${ticketTypeId} AND "state" = 'AVAILABLE'
          ORDER BY "id"
          LIMIT ${quantity}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING "id", "ticketTypeId", "eventId", "state", "holdId", "ticketId", "seatLabel"
      `;
      return rows.map((row) => ({
        id: row.id,
        ticketTypeId: row.ticketTypeId,
        eventId: row.eventId,
        state: row.state as InventoryUnit["state"],
        holdId: row.holdId,
        ticketId: row.ticketId,
        seatLabel: row.seatLabel,
      }));
    },
    async findUnit(unitId) {
      const row = await db.inventoryUnit.findUnique({ where: { id: unitId } });
      return row ? toUnit(row) : null;
    },
    async countAvailable(ticketTypeId) {
      return db.inventoryUnit.count({ where: { ticketTypeId, state: "AVAILABLE" } });
    },
    async countAvailableForEvent(eventId) {
      return db.inventoryUnit.count({ where: { eventId, state: "AVAILABLE" } });
    },
    async createHold(hold) {
      const row = await db.ticketHold.create({
        data: {
          id: hold.id,
          orderId: hold.orderId,
          eventId: hold.eventId,
          unitIds: hold.unitIds,
          expiresAt: dt(hold.expiresAt),
          releasedAt: dtN(hold.releasedAt),
        },
      });
      return toHold(row);
    },
    async findHold(holdId) {
      const row = await db.ticketHold.findUnique({ where: { id: holdId } });
      return row ? toHold(row) : null;
    },
    async releaseHold(holdId) {
      const hold = await db.ticketHold.findUnique({ where: { id: holdId } });
      if (!hold || hold.releasedAt) return;
      await db.inventoryUnit.updateMany({
        where: { id: { in: hold.unitIds }, state: "HELD" },
        data: { state: "AVAILABLE", holdId: null },
      });
      await db.ticketHold.update({ where: { id: holdId }, data: { releasedAt: new Date() } });
    },
    async markSold(unitIds, ticketIdByUnit) {
      for (const unitId of unitIds) {
        const ticketId = ticketIdByUnit[unitId];
        await db.inventoryUnit.update({
          where: { id: unitId },
          data: { state: "SOLD", ...(ticketId ? { ticketId } : {}) },
        });
      }
    },
    async listExpiredHolds(now) {
      const rows = await db.ticketHold.findMany({
        where: { releasedAt: null, expiresAt: { lte: dt(now) } },
      });
      return rows.map(toHold);
    },
    async createUnits(units) {
      await db.inventoryUnit.createMany({
        data: units.map((unit) => ({
          id: unit.id,
          eventId: unit.eventId,
          ticketTypeId: unit.ticketTypeId,
          state: unit.state,
          holdId: unit.holdId,
          ticketId: unit.ticketId,
          seatLabel: unit.seatLabel,
        })),
      });
    },
  };

  const orderData = (order: Order): Prisma.OrderUncheckedCreateInput => ({
    id: order.id,
    reference: order.reference,
    userId: order.userId,
    buyerEmail: order.buyerEmail,
    buyerPhone: order.buyerPhone,
    eventId: order.eventId,
    subtotalAmount: big(order.subtotal),
    discountAmount: big(order.discount),
    promoCodeId: order.promoCodeId,
    feesAmount: big(order.fees),
    totalAmount: big(order.total),
    currency: order.total.currency,
    status: order.status,
    holdId: order.holdId,
    idempotencyKey: order.idempotencyKey,
    createdAt: dt(order.createdAt),
    paidAt: dtN(order.paidAt),
    items: {
      create: order.items.map((item) => ({
        id: item.id,
        ticketTypeId: item.ticketTypeId,
        quantity: item.quantity,
        unitAmount: big(item.unitPrice),
        lineAmount: big(item.lineTotal),
        currency: item.unitPrice.currency,
      })),
    },
  });

  const orders: R.OrderRepository = {
    async findById(id) {
      const row = await db.order.findUnique({ where: { id }, include: { items: true } });
      return row ? toOrder(row) : null;
    },
    async findByIdempotencyKey(key) {
      const row = await db.order.findUnique({
        where: { idempotencyKey: key },
        include: { items: true },
      });
      return row ? toOrder(row) : null;
    },
    async listByUser(userId) {
      const rows = await db.order.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toOrder);
    },
    async listByEvent(eventId) {
      const rows = await db.order.findMany({ where: { eventId }, include: { items: true } });
      return rows.map(toOrder);
    },
    async create(order) {
      const row = await db.order.create({ data: orderData(order), include: { items: true } });
      return toOrder(row);
    },
    async update(id, patch) {
      const data: Prisma.OrderUncheckedUpdateInput = {};
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.holdId !== undefined) data.holdId = patch.holdId;
      if (patch.paidAt !== undefined) data.paidAt = dtN(patch.paidAt);
      if (patch.userId !== undefined) data.userId = patch.userId;
      if (patch.buyerEmail !== undefined) data.buyerEmail = patch.buyerEmail;
      if (patch.buyerPhone !== undefined) data.buyerPhone = patch.buyerPhone;
      if (patch.promoCodeId !== undefined) data.promoCodeId = patch.promoCodeId;
      if (patch.subtotal !== undefined) data.subtotalAmount = big(patch.subtotal);
      if (patch.discount !== undefined) data.discountAmount = big(patch.discount);
      if (patch.fees !== undefined) data.feesAmount = big(patch.fees);
      if (patch.total !== undefined) data.totalAmount = big(patch.total);
      const row = await db.order.update({ where: { id }, data, include: { items: true } });
      return toOrder(row);
    },
  };

  const tickets: R.TicketRepository = {
    async findById(id) {
      const row = await db.ticket.findUnique({ where: { id }, include: TICKET_INCLUDE });
      return row ? toTicket(row) : null;
    },
    async findByCode(code) {
      const row = await db.ticket.findUnique({ where: { code }, include: TICKET_INCLUDE });
      return row ? toTicket(row) : null;
    },
    async listByOwner(userId) {
      const rows = await db.ticket.findMany({
        where: { ownerUserId: userId },
        include: TICKET_INCLUDE,
      });
      return rows.map(toTicket);
    },
    async listByOrder(orderId) {
      const rows = await db.ticket.findMany({ where: { orderId }, include: TICKET_INCLUDE });
      return rows.map(toTicket);
    },
    async listByEvent(eventId) {
      const rows = await db.ticket.findMany({ where: { eventId }, include: TICKET_INCLUDE });
      return rows.map(toTicket);
    },
    async create(ticket) {
      const row = await db.ticket.create({
        data: {
          id: ticket.id,
          code: ticket.code,
          eventId: ticket.eventId,
          ticketTypeId: ticket.ticketTypeId,
          orderId: ticket.orderId,
          ownerUserId: ticket.ownerUserId,
          ownerName: ticket.ownerName,
          seatLabel: ticket.seatLabel,
          status: ticket.status,
          faceAmount: big(ticket.facePrice),
          currency: ticket.facePrice.currency,
          credentialVersion: ticket.credentialVersion,
          issuedAt: dt(ticket.issuedAt),
          checkedInAt: dtN(ticket.checkedInAt),
          ownershipHistory: {
            create: ticket.ownershipHistory.map((entry) => ({
              at: dt(entry.at),
              fromUserId: entry.fromUserId,
              toUserId: entry.toUserId,
              reason: entry.reason,
              reference: entry.reference,
            })),
          },
        },
        include: TICKET_INCLUDE,
      });
      return toTicket(row);
    },
    async update(id, patch) {
      const data: Prisma.TicketUncheckedUpdateInput = {};
      if (patch.ownerUserId !== undefined) data.ownerUserId = patch.ownerUserId;
      if (patch.ownerName !== undefined) data.ownerName = patch.ownerName;
      if (patch.seatLabel !== undefined) data.seatLabel = patch.seatLabel;
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.credentialVersion !== undefined) data.credentialVersion = patch.credentialVersion;
      if (patch.checkedInAt !== undefined) data.checkedInAt = dtN(patch.checkedInAt);
      if (patch.ownershipHistory !== undefined) {
        data.ownershipHistory = {
          deleteMany: {},
          create: patch.ownershipHistory.map((entry) => ({
            at: dt(entry.at),
            fromUserId: entry.fromUserId,
            toUserId: entry.toUserId,
            reason: entry.reason,
            reference: entry.reference,
          })),
        };
      }
      const row = await db.ticket.update({ where: { id }, data, include: TICKET_INCLUDE });
      return toTicket(row);
    },
    async countOwnedForEvent(userId, eventId) {
      return db.ticket.count({
        where: {
          ownerUserId: userId,
          eventId,
          status: { in: ["ACTIVE", "LISTED", "CHECKED_IN"] },
        },
      });
    },
  };

  const transfers: R.TransferRepository = {
    async findById(id) {
      const row = await db.ticketTransfer.findUnique({ where: { id } });
      return row ? toTransfer(row) : null;
    },
    async listByTicket(ticketId) {
      const rows = await db.ticketTransfer.findMany({ where: { ticketId } });
      return rows.map(toTransfer);
    },
    async listIncoming(email) {
      const rows = await db.ticketTransfer.findMany({
        where: { toEmail: { equals: email, mode: "insensitive" } },
      });
      return rows.map(toTransfer);
    },
    async create(transfer) {
      const row = await db.ticketTransfer.create({
        data: {
          id: transfer.id,
          ticketId: transfer.ticketId,
          fromUserId: transfer.fromUserId,
          toEmail: transfer.toEmail,
          toUserId: transfer.toUserId,
          status: transfer.status,
          createdAt: dt(transfer.createdAt),
          expiresAt: dt(transfer.expiresAt),
          resolvedAt: dtN(transfer.resolvedAt),
        },
      });
      return toTransfer(row);
    },
    async update(id, patch) {
      const data: Prisma.TicketTransferUncheckedUpdateInput = {};
      if (patch.toUserId !== undefined) data.toUserId = patch.toUserId;
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.resolvedAt !== undefined) data.resolvedAt = dtN(patch.resolvedAt);
      if (patch.expiresAt !== undefined) data.expiresAt = dt(patch.expiresAt);
      const row = await db.ticketTransfer.update({ where: { id }, data });
      return toTransfer(row);
    },
  };

  const bookingGuestCreate = (booking: Booking) =>
    booking.guests.map((guest) => ({
      id: guest.id,
      name: guest.name,
      phone: guest.phone,
      email: guest.email,
      mealChoice: guest.mealChoice,
      checkedInAt: dtN(guest.checkedInAt),
    }));

  const bookings: R.BookingRepository = {
    async findById(id) {
      const row = await db.booking.findUnique({ where: { id }, include: { guests: true } });
      return row ? toBooking(row) : null;
    },
    async findByReference(reference) {
      const row = await db.booking.findUnique({ where: { reference }, include: { guests: true } });
      return row ? toBooking(row) : null;
    },
    async listByEvent(eventId) {
      const rows = await db.booking.findMany({
        where: { eventId },
        include: { guests: true },
        orderBy: { primaryGuestName: "asc" },
      });
      return rows.map(toBooking);
    },
    async listByUser(userId) {
      const rows = await db.booking.findMany({
        where: { primaryGuestUserId: userId },
        include: { guests: true },
      });
      return rows.map(toBooking);
    },
    async listByEmail(email) {
      const rows = await db.booking.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        include: { guests: true },
      });
      return rows.map(toBooking);
    },
    async create(booking) {
      const row = await db.booking.create({
        data: {
          id: booking.id,
          reference: booking.reference,
          eventId: booking.eventId,
          occurrenceId: booking.occurrenceId,
          primaryGuestUserId: booking.primaryGuestUserId,
          primaryGuestName: booking.primaryGuestName,
          phone: booking.phone,
          email: booking.email,
          status: booking.status,
          guestCount: booking.guestCount,
          tableId: booking.tableId,
          mealChoice: booking.mealChoice,
          contributionPledged: booking.contributionPledged
            ? big(booking.contributionPledged)
            : null,
          contributionPaid: booking.contributionPaid ? big(booking.contributionPaid) : null,
          currency: booking.contributionPledged?.currency ?? "KES",
          paymentStatus: booking.paymentStatus,
          invitedBy: booking.invitedBy,
          notes: booking.notes,
          checkedInAt: dtN(booking.checkedInAt),
          createdAt: dt(booking.createdAt),
          updatedAt: dt(booking.updatedAt),
          guests: { create: bookingGuestCreate(booking) },
        },
        include: { guests: true },
      });
      return toBooking(row);
    },
    async update(id, patch) {
      const data: Prisma.BookingUncheckedUpdateInput = {};
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.guestCount !== undefined) data.guestCount = patch.guestCount;
      if (patch.tableId !== undefined) data.tableId = patch.tableId;
      if (patch.mealChoice !== undefined) data.mealChoice = patch.mealChoice;
      if (patch.notes !== undefined) data.notes = patch.notes;
      if (patch.checkedInAt !== undefined) data.checkedInAt = dtN(patch.checkedInAt);
      if (patch.updatedAt !== undefined) data.updatedAt = dt(patch.updatedAt);
      if (patch.paymentStatus !== undefined) data.paymentStatus = patch.paymentStatus;
      if (patch.contributionPledged !== undefined) {
        data.contributionPledged = patch.contributionPledged
          ? big(patch.contributionPledged)
          : null;
      }
      if (patch.contributionPaid !== undefined) {
        data.contributionPaid = patch.contributionPaid ? big(patch.contributionPaid) : null;
      }
      if (patch.guests !== undefined) {
        data.guests = {
          deleteMany: {},
          create: patch.guests.map((guest) => ({
            id: guest.id,
            name: guest.name,
            phone: guest.phone,
            email: guest.email,
            mealChoice: guest.mealChoice,
            checkedInAt: dtN(guest.checkedInAt),
          })),
        };
      }
      const row = await db.booking.update({ where: { id }, data, include: { guests: true } });
      return toBooking(row);
    },
    async countConfirmedGuests(eventId, occurrenceId = null) {
      const result = await db.booking.aggregate({
        where: {
          eventId,
          ...(occurrenceId ? { occurrenceId } : {}),
          status: { in: ["CONFIRMED", "PENDING", "CHECKED_IN"] },
        },
        _sum: { guestCount: true },
      });
      return result._sum.guestCount ?? 0;
    },
  };

  const invites: R.InviteRepository = {
    async findByTokenHash(tokenHash) {
      const row = await db.privateInvite.findUnique({ where: { tokenHash } });
      return row ? toInvite(row) : null;
    },
    async findById(id) {
      const row = await db.privateInvite.findUnique({ where: { id } });
      return row ? toInvite(row) : null;
    },
    async listByEvent(eventId) {
      const rows = await db.privateInvite.findMany({ where: { eventId } });
      return rows.map(toInvite);
    },
    async create(invite) {
      const row = await db.privateInvite.create({
        data: {
          id: invite.id,
          eventId: invite.eventId,
          tokenHash: invite.tokenHash,
          inviteeName: invite.inviteeName,
          phone: invite.phone,
          email: invite.email,
          maxGuests: invite.maxGuests,
          expiresAt: dt(invite.expiresAt),
          status: invite.status,
          bookingId: invite.bookingId,
          createdAt: dt(invite.createdAt),
        },
      });
      return toInvite(row);
    },
    async update(id, patch) {
      const data: Prisma.PrivateInviteUncheckedUpdateInput = {};
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.bookingId !== undefined) data.bookingId = patch.bookingId;
      if (patch.maxGuests !== undefined) data.maxGuests = patch.maxGuests;
      if (patch.expiresAt !== undefined) data.expiresAt = dt(patch.expiresAt);
      const row = await db.privateInvite.update({ where: { id }, data });
      return toInvite(row);
    },
  };

  const tables: R.TableRepository = {
    async listByEvent(eventId) {
      const rows = await db.banquetTable.findMany({
        where: { eventId },
        include: { assignments: { orderBy: { at: "asc" } } },
        orderBy: { name: "asc" },
      });
      return rows
        .map(toTable)
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    },
    async findById(id) {
      const row = await db.banquetTable.findUnique({
        where: { id },
        include: { assignments: { orderBy: { at: "asc" } } },
      });
      return row ? toTable(row) : null;
    },
    async update(id, patch) {
      const data: Prisma.BanquetTableUncheckedUpdateInput = {};
      if (patch.name !== undefined) data.name = patch.name;
      if (patch.seats !== undefined) data.seats = patch.seats;
      if (patch.assignedBookingIds !== undefined) {
        data.assignments = {
          deleteMany: {},
          create: patch.assignedBookingIds.map((bookingId) => ({ bookingId })),
        };
      }
      const row = await db.banquetTable.update({
        where: { id },
        data,
        include: { assignments: { orderBy: { at: "asc" } } },
      });
      return toTable(row);
    },
    async create(table) {
      const row = await db.banquetTable.create({
        data: {
          id: table.id,
          eventId: table.eventId,
          name: table.name,
          seats: table.seats,
          assignments: {
            create: table.assignedBookingIds.map((bookingId) => ({ bookingId })),
          },
        },
        include: { assignments: { orderBy: { at: "asc" } } },
      });
      return toTable(row);
    },
  };

  const payments: R.PaymentRepository = {
    async findById(id) {
      const row = await db.payment.findUnique({ where: { id } });
      return row ? toPayment(row) : null;
    },
    async findByProviderRequestId(requestId) {
      const row = await db.payment.findUnique({ where: { providerRequestId: requestId } });
      return row ? toPayment(row) : null;
    },
    async findByProviderReference(reference) {
      const row = await db.payment.findUnique({ where: { providerReference: reference } });
      return row ? toPayment(row) : null;
    },
    async listByOrder(orderId) {
      const rows = await db.payment.findMany({ where: { orderId } });
      return rows.map(toPayment);
    },
    async listPendingOlderThan(cutoff) {
      const rows = await db.payment.findMany({
        where: { status: "PENDING", createdAt: { lte: dt(cutoff) } },
      });
      return rows.map(toPayment);
    },
    async create(payment) {
      const row = await db.payment.create({
        data: {
          id: payment.id,
          orderId: payment.orderId,
          bookingId: payment.bookingId,
          method: payment.method,
          status: payment.status,
          expectedAmount: big(payment.expectedAmount),
          receivedAmount: payment.receivedAmount ? big(payment.receivedAmount) : null,
          currency: payment.expectedAmount.currency,
          providerRequestId: payment.providerRequestId,
          providerReference: payment.providerReference,
          providerTimestamp: dtN(payment.providerTimestamp),
          phone: payment.phone,
          failureReason: payment.failureReason,
          createdAt: dt(payment.createdAt),
          updatedAt: dt(payment.updatedAt),
        },
      });
      return toPayment(row);
    },
    async update(id, patch) {
      const data: Prisma.PaymentUncheckedUpdateInput = {};
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.receivedAmount !== undefined) {
        data.receivedAmount = patch.receivedAmount ? big(patch.receivedAmount) : null;
      }
      if (patch.providerRequestId !== undefined) data.providerRequestId = patch.providerRequestId;
      if (patch.providerReference !== undefined) data.providerReference = patch.providerReference;
      if (patch.providerTimestamp !== undefined) {
        data.providerTimestamp = dtN(patch.providerTimestamp);
      }
      if (patch.failureReason !== undefined) data.failureReason = patch.failureReason;
      if (patch.updatedAt !== undefined) data.updatedAt = dt(patch.updatedAt);
      const row = await db.payment.update({ where: { id }, data });
      return toPayment(row);
    },
  };

  const ledger: R.LedgerRepository = {
    async findAccountByCode(code) {
      const row = await db.ledgerAccount.findUnique({ where: { code } });
      return row ? toAccount(row) : null;
    },
    async ensureAccount(account) {
      const existing = await db.ledgerAccount.findUnique({ where: { code: account.code } });
      if (existing) return toAccount(existing);
      const row = await db.ledgerAccount.create({
        data: {
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          ownerOrganizerId: account.ownerOrganizerId,
          currency: account.currency,
        },
      });
      return toAccount(row);
    },
    async listAccounts() {
      const rows = await db.ledgerAccount.findMany();
      return rows.map(toAccount);
    },
    async post(transaction) {
      const row = await db.ledgerTransaction.create({
        data: {
          id: transaction.id,
          reference: transaction.reference,
          kind: transaction.kind,
          postedAt: dt(transaction.postedAt),
          metadata: asJson(transaction.metadata),
          entries: {
            create: transaction.entries.map((entry) => ({
              accountId: entry.accountId,
              side: entry.side,
              amount: big(entry.amount),
              currency: entry.amount.currency,
              memo: entry.memo,
            })),
          },
        },
        include: { entries: true },
      });
      return toLedgerTx(row);
    },
    async findByReference(reference) {
      const row = await db.ledgerTransaction.findUnique({
        where: { reference },
        include: { entries: true },
      });
      return row ? toLedgerTx(row) : null;
    },
    async listTransactions() {
      const rows = await db.ledgerTransaction.findMany({
        include: { entries: true },
        orderBy: { postedAt: "asc" },
      });
      return rows.map(toLedgerTx);
    },
    async balanceOf(accountId) {
      const account = await db.ledgerAccount.findUnique({ where: { id: accountId } });
      if (!account) throw notFound("LedgerAccount", accountId);
      const [debits, credits] = await Promise.all([
        db.ledgerEntry.aggregate({ where: { accountId, side: "DEBIT" }, _sum: { amount: true } }),
        db.ledgerEntry.aggregate({ where: { accountId, side: "CREDIT" }, _sum: { amount: true } }),
      ]);
      const debitTotal = Number(debits._sum.amount ?? 0n);
      const creditTotal = Number(credits._sum.amount ?? 0n);
      const debitPositive = account.type === "ASSET" || account.type === "EXPENSE";
      return debitPositive ? debitTotal - creditTotal : creditTotal - debitTotal;
    },
  };

  const payouts: R.PayoutRepository = {
    async findById(id) {
      const row = await db.payout.findUnique({ where: { id } });
      return row ? toPayout(row) : null;
    },
    async listByOrganizer(organizerId) {
      const rows = await db.payout.findMany({
        where: { organizerId },
        orderBy: [{ requestedAt: "asc" }, { id: "asc" }],
      });
      return rows.map(toPayout);
    },
    async create(payout) {
      const row = await db.payout.create({
        data: {
          id: payout.id,
          organizerId: payout.organizerId,
          amount: big(payout.amount),
          currency: payout.amount.currency,
          status: payout.status,
          destinationMasked: payout.destinationMasked,
          holdReason: payout.holdReason,
          requestedAt: dt(payout.requestedAt),
          approvedByUserId: payout.approvedByUserId,
          paidAt: dtN(payout.paidAt),
        },
      });
      return toPayout(row);
    },
    async update(id, patch) {
      const data: Prisma.PayoutUncheckedUpdateInput = {};
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.approvedByUserId !== undefined) data.approvedByUserId = patch.approvedByUserId;
      if (patch.paidAt !== undefined) data.paidAt = dtN(patch.paidAt);
      if (patch.holdReason !== undefined) data.holdReason = patch.holdReason;
      const row = await db.payout.update({ where: { id }, data });
      return toPayout(row);
    },
  };

  const listings: R.ListingRepository = {
    async findById(id) {
      const row = await db.resaleListing.findUnique({ where: { id } });
      return row ? toListing(row) : null;
    },
    async findActiveByTicket(ticketId) {
      const row = await db.resaleListing.findFirst({
        where: { ticketId, status: { in: ["ACTIVE", "RESERVED"] } },
      });
      return row ? toListing(row) : null;
    },
    async listByEvent(eventId) {
      const rows = await db.resaleListing.findMany({ where: { eventId } });
      return rows.map(toListing);
    },
    async listBySeller(userId) {
      const rows = await db.resaleListing.findMany({ where: { sellerUserId: userId } });
      return rows.map(toListing);
    },
    async countActiveBySeller(userId, eventId) {
      return db.resaleListing.count({
        where: { sellerUserId: userId, eventId, status: { in: ["ACTIVE", "RESERVED"] } },
      });
    },
    async create(listing) {
      const row = await db.resaleListing.create({
        data: {
          id: listing.id,
          ticketId: listing.ticketId,
          eventId: listing.eventId,
          sellerUserId: listing.sellerUserId,
          askAmount: big(listing.askPrice),
          faceAmount: big(listing.facePrice),
          currency: listing.askPrice.currency,
          status: listing.status,
          buyerUserId: listing.buyerUserId,
          createdAt: dt(listing.createdAt),
          soldAt: dtN(listing.soldAt),
        },
      });
      return toListing(row);
    },
    async update(id, patch) {
      const data: Prisma.ResaleListingUncheckedUpdateInput = {};
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.buyerUserId !== undefined) data.buyerUserId = patch.buyerUserId;
      if (patch.soldAt !== undefined) data.soldAt = dtN(patch.soldAt);
      if (patch.askPrice !== undefined) data.askAmount = big(patch.askPrice);
      const row = await db.resaleListing.update({ where: { id }, data });
      return toListing(row);
    },
  };

  const contributions: R.ContributionRepository = {
    async listByEvent(eventId) {
      const rows = await db.contribution.findMany({ where: { eventId } });
      return rows.map(toContribution);
    },
    async create(contribution) {
      const row = await db.contribution.create({
        data: {
          id: contribution.id,
          eventId: contribution.eventId,
          bookingId: contribution.bookingId,
          contributorName: contribution.contributorName,
          phone: contribution.phone,
          pledgedAmount: big(contribution.pledged),
          receivedAmount: big(contribution.received),
          currency: contribution.pledged.currency,
          status: contribution.status,
          method: contribution.method,
          reference: contribution.reference,
          createdAt: dt(contribution.createdAt),
        },
      });
      return toContribution(row);
    },
    async update(id, patch) {
      const data: Prisma.ContributionUncheckedUpdateInput = {};
      if (patch.status !== undefined) data.status = patch.status;
      if (patch.received !== undefined) data.receivedAmount = big(patch.received);
      if (patch.method !== undefined) data.method = patch.method;
      if (patch.reference !== undefined) data.reference = patch.reference;
      const row = await db.contribution.update({ where: { id }, data });
      return toContribution(row);
    },
  };

  const checkins: R.CheckInRepository = {
    async create(checkIn) {
      const row = await db.checkIn.create({
        data: {
          id: checkIn.id,
          eventId: checkIn.eventId,
          ticketId: checkIn.ticketId,
          bookingId: checkIn.bookingId,
          result: checkIn.result,
          scannedByUserId: checkIn.scannedByUserId,
          deviceId: checkIn.deviceId,
          overrideReason: checkIn.overrideReason,
          at: dt(checkIn.at),
        },
      });
      return toCheckIn(row);
    },
    async listByEvent(eventId) {
      const rows = await db.checkIn.findMany({ where: { eventId }, orderBy: { at: "desc" } });
      return rows.map(toCheckIn);
    },
    async findAdmittedForTicket(ticketId) {
      const row = await db.checkIn.findFirst({ where: { ticketId, result: "ADMITTED" } });
      return row ? toCheckIn(row) : null;
    },
  };

  const risk: R.RiskRepository = {
    async record(event) {
      const row = await db.riskEvent.create({
        data: {
          id: event.id,
          subjectType: event.subjectType,
          subjectId: event.subjectId,
          outcome: event.outcome,
          score: event.score,
          reasonCodes: event.reasonCodes,
          at: dt(event.at),
        },
      });
      return toRisk(row);
    },
    async listForSubject(subjectType, subjectId) {
      const rows = await db.riskEvent.findMany({
        where: { subjectType, subjectId },
        orderBy: [{ at: "asc" }, { id: "asc" }],
      });
      return rows.map(toRisk);
    },
    async listRecent(limit) {
      const rows = await db.riskEvent.findMany({ orderBy: { at: "desc" }, take: limit });
      return rows.map(toRisk);
    },
  };

  const campaigns: R.CampaignRepository = {
    async create(campaign) {
      const row = await db.campaign.create({
        data: {
          id: campaign.id,
          organizerId: campaign.organizerId,
          segments: campaign.segments,
          channel: campaign.channel,
          subject: campaign.subject,
          body: campaign.body,
          recipientCount: campaign.recipientCount,
          sentByUserId: campaign.sentByUserId,
          sentAt: dt(campaign.sentAt),
        },
      });
      return toCampaign(row);
    },
    async listByOrganizer(organizerId) {
      const rows = await db.campaign.findMany({
        where: { organizerId },
        orderBy: { sentAt: "desc" },
      });
      return rows.map(toCampaign);
    },
  };

  const promoCodes: R.PromoCodeRepository = {
    async create(promoCode) {
      const row = await db.promoCode.create({
        data: {
          id: promoCode.id,
          organizerId: promoCode.organizerId,
          eventId: promoCode.eventId,
          code: promoCode.code,
          kind: promoCode.kind,
          percentBps: promoCode.percentBps,
          fixedAmount: promoCode.fixedAmount ? big(promoCode.fixedAmount) : null,
          currency: promoCode.fixedAmount?.currency ?? "KES",
          maxRedemptions: promoCode.maxRedemptions,
          redemptionCount: promoCode.redemptionCount,
          startsAt: dt(promoCode.startsAt),
          endsAt: dtN(promoCode.endsAt),
          disabledAt: dtN(promoCode.disabledAt),
          createdAt: dt(promoCode.createdAt),
        },
      });
      return toPromo(row);
    },
    async findById(id) {
      const row = await db.promoCode.findUnique({ where: { id } });
      return row ? toPromo(row) : null;
    },
    async findByEventAndCode(eventId, code) {
      const row = await db.promoCode.findUnique({
        where: { eventId_code: { eventId, code } },
      });
      return row ? toPromo(row) : null;
    },
    async listByEvent(eventId) {
      const rows = await db.promoCode.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toPromo);
    },
    async listByOrganizer(organizerId) {
      const rows = await db.promoCode.findMany({
        where: { organizerId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toPromo);
    },
    async update(id, patch) {
      const data: Prisma.PromoCodeUncheckedUpdateInput = {};
      if (patch.redemptionCount !== undefined) data.redemptionCount = patch.redemptionCount;
      if (patch.maxRedemptions !== undefined) data.maxRedemptions = patch.maxRedemptions;
      if (patch.endsAt !== undefined) data.endsAt = dtN(patch.endsAt);
      if (patch.disabledAt !== undefined) data.disabledAt = dtN(patch.disabledAt);
      const row = await db.promoCode.update({ where: { id }, data });
      return toPromo(row);
    },
  };

  const affiliateLinks: R.AffiliateLinkRepository = {
    async create(link) {
      const row = await db.affiliateLink.create({
        data: {
          id: link.id,
          organizerId: link.organizerId,
          eventId: link.eventId,
          code: link.code,
          label: link.label,
          clickCount: link.clickCount,
          createdAt: dt(link.createdAt),
        },
      });
      return toAffiliate(row);
    },
    async findByCode(code) {
      const row = await db.affiliateLink.findUnique({ where: { code } });
      return row ? toAffiliate(row) : null;
    },
    async listByEvent(eventId) {
      const rows = await db.affiliateLink.findMany({
        where: { eventId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toAffiliate);
    },
    async listByOrganizer(organizerId) {
      const rows = await db.affiliateLink.findMany({
        where: { organizerId },
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toAffiliate);
    },
    async update(id, patch) {
      const data: Prisma.AffiliateLinkUncheckedUpdateInput = {};
      if (patch.label !== undefined) data.label = patch.label;
      if (patch.clickCount !== undefined) data.clickCount = patch.clickCount;
      const row = await db.affiliateLink.update({ where: { id }, data });
      return toAffiliate(row);
    },
  };

  const audit: R.AuditRepository = {
    async append(entry) {
      // Append-only: an existing id is returned untouched, never overwritten.
      const row = await db.auditLog.upsert({
        where: { id: entry.id },
        create: {
          id: entry.id,
          actorUserId: entry.actorUserId,
          actorRole: entry.actorRole,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          before: entry.before === null ? Prisma.JsonNull : asJson(entry.before),
          after: entry.after === null ? Prisma.JsonNull : asJson(entry.after),
          ip: entry.ip,
          sessionId: entry.sessionId,
          mfaSatisfied: entry.mfaSatisfied,
          reason: entry.reason,
          approvalChain: entry.approvalChain,
          at: dt(entry.at),
        },
        update: {},
      });
      return toAudit(row);
    },
    async listForResource(resourceType, resourceId) {
      const rows = await db.auditLog.findMany({
        where: { resourceType, resourceId },
        orderBy: { at: "desc" },
      });
      return rows.map(toAudit);
    },
    async listRecent(limit) {
      const rows = await db.auditLog.findMany({ orderBy: { at: "desc" }, take: limit });
      return rows.map(toAudit);
    },
  };

  const notifications: R.NotificationRepository = {
    async enqueue(notification) {
      const row = await db.notification.create({
        data: {
          id: notification.id,
          userId: notification.userId,
          channel: notification.channel,
          template: notification.template,
          to: notification.to,
          payload: asJson(notification.payload),
          sentAt: dtN(notification.sentAt),
          createdAt: dt(notification.createdAt),
        },
      });
      return toNotification(row);
    },
    async listForUser(userId) {
      const rows = await db.notification.findMany({ where: { userId } });
      return rows.map(toNotification);
    },
    async listPending() {
      const rows = await db.notification.findMany({ where: { sentAt: null } });
      return rows.map(toNotification);
    },
    async markSent(id, at) {
      await db.notification.updateMany({ where: { id }, data: { sentAt: dt(at) } });
    },
  };

  const webhooks: R.WebhookRepository = {
    async recordIfNew(record) {
      try {
        await db.paymentWebhook.create({
          data: {
            id: record.id,
            provider: record.provider,
            dedupeKey: record.dedupeKey,
            payload: asJson(record.payload),
            signatureOk: record.signatureOk,
            quarantined: record.quarantined,
            receivedAt: dt(record.receivedAt),
          },
        });
        return true;
      } catch (error) {
        // Unique violation on dedupeKey — the replay path, not a failure.
        if (
          typeof error === "object" &&
          error !== null &&
          (error as { code?: string }).code === "P2002"
        ) {
          return false;
        }
        throw error;
      }
    },
    async markProcessed(dedupeKey, at) {
      await db.paymentWebhook.updateMany({
        where: { dedupeKey },
        data: { processedAt: dt(at) },
      });
    },
    async listQuarantined() {
      const rows = await db.paymentWebhook.findMany({
        where: { quarantined: true },
        select: { dedupeKey: true, provider: true },
      });
      return rows;
    },
  };

  const idempotency: R.IdempotencyRepository = {
    async find(key) {
      const row = await db.idempotencyRecord.findUnique({ where: { key } });
      if (!row) return null;
      if (row.expiresAt <= new Date()) {
        await db.idempotencyRecord.delete({ where: { key } }).catch(() => undefined);
        return null;
      }
      return { requestHash: row.requestHash, status: row.status, response: row.response };
    },
    async save(record) {
      await db.idempotencyRecord.upsert({
        where: { key: record.key },
        create: {
          key: record.key,
          endpoint: record.endpoint,
          requestHash: record.requestHash,
          status: record.status,
          response: asJson(record.response),
          expiresAt: dt(record.expiresAt),
        },
        update: {
          endpoint: record.endpoint,
          requestHash: record.requestHash,
          status: record.status,
          response: asJson(record.response),
          expiresAt: dt(record.expiresAt),
        },
      });
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
