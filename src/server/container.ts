import { PaymentMethod } from "@/domain/enums";
import type { ActorContext } from "@/domain/types";
import { config } from "./config";
import { systemClock } from "./lib/clock";
import { MpesaProvider } from "./payments/mpesa-provider";
import type { PaymentProvider } from "./payments/provider";
import { createMemoryUnitOfWork } from "./repositories/memory/unit-of-work";
import { emptyDb } from "./repositories/memory/store";
import { getPrismaClient } from "./repositories/prisma/client";
import { createPrismaUnitOfWork } from "./repositories/prisma/unit-of-work";
import type { UnitOfWork } from "./repositories/types";
import { DEMO_ORGANIZER_ID, DEMO_USER_ID, seedDatabase } from "./seed/seed-data";
import { AuditService } from "./services/audit-service";
import { BookingService } from "./services/booking-service";
import { CatalogService } from "./services/catalog-service";
import { CrmService } from "./services/crm-service";
import { MarketingService } from "./services/marketing-service";
import { PromotionsService } from "./services/promotions-service";
import { CheckInService } from "./services/checkin-service";
import { CheckoutService } from "./services/checkout-service";
import { CredentialService } from "./services/credential-service";
import { LedgerService } from "./services/ledger-service";
import { NotificationService } from "./services/notification-service";
import { PaymentService } from "./services/payment-service";
import { PrivateEventService } from "./services/private-event-service";
import { PayoutService } from "./services/payout-service";
import { RefundService } from "./services/refund-service";
import { ResaleService } from "./services/resale-service";
import { RiskService } from "./services/risk-service";
import { TicketService } from "./services/ticket-service";

/**
 * Composition root.
 *
 * Services take their collaborators as constructor arguments, so this file is
 * the only place that knows how they fit together — and the only place that has
 * to change when the in-memory repositories are swapped for the Prisma ones.
 */

export interface Container {
  uow: UnitOfWork;
  catalog: CatalogService;
  crm: CrmService;
  marketing: MarketingService;
  promotions: PromotionsService;
  checkout: CheckoutService;
  payments: PaymentService;
  tickets: TicketService;
  bookings: BookingService;
  privateEvents: PrivateEventService;
  resale: ResaleService;
  checkin: CheckInService;
  refunds: RefundService;
  payouts: PayoutService;
  ledger: LedgerService;
  risk: RiskService;
  audit: AuditService;
  notifications: NotificationService;
  credentials: CredentialService;
}

export function createContainer(options: { seed?: boolean } = {}): Container {
  const clock = systemClock;

  // With DATABASE_URL set, repositories run against PostgreSQL via Prisma —
  // every service below is unchanged by the swap. `seed: false` (the test
  // fixture) always gets an isolated in-memory store, never the shared
  // database. First-boot seeding of PostgreSQL happens in
  // `src/instrumentation.ts`, before the server takes requests.
  let uow: UnitOfWork;
  if (config.databaseUrl && options.seed !== false) {
    uow = createPrismaUnitOfWork(getPrismaClient());
  } else {
    const db = emptyDb();
    if (options.seed !== false) seedDatabase(db);
    uow = createMemoryUnitOfWork(db);
  }

  const audit = new AuditService(uow.repos.audit, clock);
  const risk = new RiskService(uow.repos.risk, clock);
  const ledger = new LedgerService(uow.repos.ledger, clock);
  const notifications = new NotificationService(uow.repos.notifications, undefined, clock);
  const credentials = new CredentialService(clock);
  const catalog = new CatalogService(uow);
  const crm = new CrmService(uow);
  const marketing = new MarketingService(uow, { crm, notifications }, clock);
  const promotions = new PromotionsService(uow, clock);

  const providers = new Map<PaymentMethod, PaymentProvider>([
    [PaymentMethod.MPESA, new MpesaProvider()],
  ]);

  const tickets = new TicketService(uow, { credentials, audit, notifications, risk }, clock);

  // Checkout and payments are mutually dependent: checkout starts a payment,
  // and a captured payment fulfils the order. The cycle is broken with lazy
  // callbacks rather than by merging the two services.
  let paymentsRef: PaymentService | undefined;

  const checkout = new CheckoutService(
    uow,
    {
      ledger,
      risk,
      audit,
      notifications,
      initiatePayment: (input) => {
        if (!paymentsRef) throw new Error("Payment service is not ready");
        return paymentsRef.initiateForOrder(input);
      },
    },
    clock,
  );

  const payments = new PaymentService(
    uow,
    providers,
    {
      audit,
      onPaymentCaptured: async (actor: ActorContext, order) => {
        await checkout.fulfilOrder(actor, order.id, { method: PaymentMethod.MPESA });
      },
    },
    clock,
  );
  paymentsRef = payments;

  const bookings = new BookingService(uow, { audit, notifications }, clock);
  const privateEvents = new PrivateEventService(
    uow,
    { bookings, audit, notifications },
    clock,
  );
  const resale = new ResaleService(uow, { ledger, risk, audit, notifications }, clock);
  const checkin = new CheckInService(uow, { credentials, audit }, clock);
  const refunds = new RefundService(
    uow,
    { ledger, audit, notifications, tickets, providers },
    clock,
  );
  const payouts = new PayoutService(uow, { ledger, risk, audit, notifications }, clock);

  return {
    uow,
    catalog,
    crm,
    marketing,
    promotions,
    checkout,
    payments,
    tickets,
    bookings,
    privateEvents,
    resale,
    checkin,
    refunds,
    payouts,
    ledger,
    risk,
    audit,
    notifications,
    credentials,
  };
}

/**
 * Process-wide container. In development Next.js re-evaluates modules on every
 * hot reload, so it is cached on `globalThis` to stop the demo dataset from
 * resetting mid-session.
 */
const globalForContainer = globalThis as unknown as { __bookitContainer?: Container };

export function getContainer(): Container {
  if (!globalForContainer.__bookitContainer) {
    globalForContainer.__bookitContainer = createContainer();
  }
  return globalForContainer.__bookitContainer;
}

/**
 * The signed-in user for this build.
 *
 * Authentication is specified in `docs/ARCHITECTURE.md` (email/password, magic
 * link, Google, phone verification, with MFA mandatory for organizers) and the
 * session model is in the Prisma schema. Until the auth provider is wired up,
 * the app runs as a fixed demo consumer who is also an organizer team member,
 * so every screen shows real signed-in state rather than an empty shell.
 */
export function currentActor(): ActorContext {
  return {
    userId: DEMO_USER_ID,
    roles: ["CONSUMER"],
    organizerId: null,
    ip: null,
    sessionId: "demo-session",
    mfaSatisfied: false,
    deviceId: "demo-device",
  };
}

/**
 * Organizer actor for the demo.
 *
 * `organizerId` can be overridden so a screen can act for whichever organizer
 * owns the event being viewed — the demo dataset has private events under a
 * family account and ticketed events under a promoter. Real authentication
 * replaces this whole function; the override is not a permission bypass,
 * because every service still checks the actor's organizer against the
 * resource before doing anything.
 */
export function currentOrganizerActor(organizerId?: string): ActorContext {
  return {
    userId: "usr_amina",
    roles: ["ORGANIZER_OWNER", "EVENT_MANAGER", "FINANCE"],
    organizerId: organizerId ?? DEMO_ORGANIZER_ID,
    ip: null,
    sessionId: "demo-organizer-session",
    mfaSatisfied: true,
    deviceId: "demo-device",
  };
}

export { DEMO_ORGANIZER_ID, DEMO_USER_ID, config };
