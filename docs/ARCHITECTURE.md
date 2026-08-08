# Bookit — architecture

A modular monolith with boundaries drawn where a service split would later go.

---

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│  src/app             Pages (RSC) and /api/v1 route handlers  │
├──────────────────────────────────────────────────────────────┤
│  src/server/services Application services — the workflows    │
├──────────────────────────────────────────────────────────────┤
│  src/server/repositories  Interfaces + implementations       │
├──────────────────────────────────────────────────────────────┤
│  src/domain          Pure types, enums, money, state machines│
└──────────────────────────────────────────────────────────────┘
```

`src/domain` has no dependencies at all — it is importable from server code,
client components and tests alike. That is why `event-type-policy.ts` can be the
single source of truth for both the consumer booking panel and the organizer
wizard.

Server components call services **directly**. There is no HTTP hop to
ourselves; `/api/v1` exists for external clients (mobile app, scanner devices,
partners) and wraps the same services.

---

## Repository pattern

Services depend only on the interfaces in
`src/server/repositories/types.ts`. Two implementations are contemplated:

- **In-memory** (`memory/`) — used when `DATABASE_URL` is unset. It is not a
  toy: `runInTransaction` is serialized by a mutex and rolls the entire dataset
  back on failure, and `lockAvailableUnits` both selects and marks units in one
  step. Those semantics are what make the concurrency test meaningful.
- **Prisma/PostgreSQL** — the schema is written (`prisma/schema.prisma`); the
  adapter is the remaining work. Swapping it is a change in `container.ts`.

`UnitOfWork.runInTransaction` is the transactional boundary. Nested calls join
the outer transaction rather than deadlocking, so a service can compose another
service's method without either knowing about the other's transaction.

---

## Modules

| Module | Responsibility |
| --- | --- |
| `catalog-service` | Read model for the UI: event summaries, homepage rails, account lists, organizer dashboard, guest lists |
| `checkout-service` | Orders, inventory holds, fulfilment, hold expiry |
| `payment-service` | Provider orchestration, webhook gauntlet, reconciliation |
| `ticket-service` | Credentials, transfers, voiding, ownership history |
| `booking-service` | Bookings, RSVPs, waitlist, invitations, table assignment |
| `resale-service` | Listings, policy enforcement, atomic sale completion |
| `checkin-service` | QR scan, guest lookup, supervisor override, offline sync |
| `refund-service` | Eligibility, invalidation, provider refund, ledger reversal |
| `payout-service` | Balances, reserves, maker-checker approval, destination changes |
| `ledger-service` | Double-entry posting and balances |
| `risk-service` | Central scoring with explainable reason codes |
| `audit-service` | Append-only trail with redaction |
| `notification-service` | Queued email/SMS with a retry-safe drain |

---

## Event types drive everything

`src/domain/event-type-policy.ts` answers "how does this event type behave?" for
all seven types:

```
PAID_TICKET · FREE_RSVP · PRIVATE_INVITATION · BOOKING
BANQUET · RECURRING_MEETING · HYBRID
```

Each entry declares whether the type issues tickets, creates bookings, requires
payment, requires an invitation, is guest-list driven, supports tables, recurs,
and tracks contributions.

Consequences:

- The event detail sidebar renders "Get Tickets", "RSVP", "Enter Invitation
  Code", "Reserve Spot", "Select Table" or paid/RSVP tabs from this table.
- The organizer wizard derives its **step list** from it — a banquet gets a
  tables step, a recurring meeting gets a recurrence step.
- A booking is never forced through the ticket abstraction, which is the whole
  point of the product positioning.

---

## Money

Integer minor units plus an ISO-4217 code, everywhere (`src/domain/money.ts`).
Mixing currencies throws. `allocate()` splits a total so the parts sum exactly
to it, which is how fees are apportioned without rounding creating or
destroying money.

Stored as `BigInt` + currency column in Prisma. Never a float, never a decimal
string.

---

## The ledger

Chart of accounts in `ledger-service.ts`:

```
1000 Customer funds        (asset)
1100 Payouts clearing      (asset)
2000 Organizer payable     (liability, per organizer)
2010 Organizer reserve     (liability, per organizer)
2100 Resale seller payable (liability, per seller)
2200 Tax liability         (liability)
2300 Contributions held    (liability, per event)
4000 Platform fee revenue  (revenue)
5000 PSP fees              (expense)
5100 Refunds               (expense)
```

A ticket sale posts: debit customer funds by the total, credit organizer
payable by the subtotal, credit platform fee revenue by the fee. Debits must
equal credits or the post is rejected. Posting is idempotent on `reference`,
which is what makes a replayed webhook safe.

---

## Authentication (designed, not yet wired)

Consumers: email/password, magic link, Google, phone verification; passkeys
later. Organizers and admins: MFA enforced, session and device management,
step-up for dangerous actions.

Sessions are modelled in `prisma/schema.prisma` (`Session`, with `tokenHash`,
device, IP, `mfaSatisfiedAt`, revocation). Every service method already takes an
`ActorContext` — user, roles, organizer scope, IP, session, MFA assurance,
device — and enforces authorization against it. The missing piece is only the
provider that turns a login into that context; `currentActor()` in
`container.ts` is the single seam to replace.

---

## Background jobs

Implemented as idempotent, retry-safe service methods ready to be scheduled:

- `checkout.releaseExpiredHolds()` — every minute
- `payments.reconcilePending()` — every 5 minutes
- `payouts.releaseMaturedReserves()` — hourly
- `notifications.drain()` — continuously

Recurring-event occurrence generation, settlement computation, risk enrichment,
exports and analytics events follow the same shape.

---

## Frontend

Next.js App Router, server components by default. Client components only where
there is genuine interactivity: booking panel, filters, wizard, guest list
manager, check-in console, QR dialog, mobile navigation.

**Design system.** All tokens live in one `@theme` block in
`src/app/globals.css` — colours, radii, fonts, shadows. Components reference
tokens (`bg-surface`, `text-muted`, `rounded-card`), never raw hex, so the
system can be re-themed from that block.

**Responsive.** Multi-column desktop → reduced columns on tablet → mobile:
stacked hero, stacked search, horizontal category scroller, 2-up event cards,
organizer sidebar becomes a drawer, and data tables re-render as labelled cards
(`components/ui/data-table.tsx` renders real `<table>` semantics above `md` and
stacked cards below).

**Accessibility.** Semantic landmarks, skip link, visible focus ring defined
once globally, labelled controls with `aria-describedby` wiring in `Field`,
`role="alert"` on validation errors and `aria-live` on counts, accessible
dialogs via Radix (focus trap, restore, Escape), `prefers-reduced-motion`
honoured, alt text on meaningful images and `aria-hidden` on decorative ones.

---

## Testing

79 tests across eight files, covering the guarantees the platform claims rather
than incidental behaviour:

| File | Covers |
| --- | --- |
| `inventory.test.ts` | Concurrency on the final unit, hold expiry, per-account limits, rollback |
| `ledger.test.ts` | Balance enforcement, idempotency, sale split, refund reversal |
| `credentials.test.ts` | Signing, tampering, expiry, version invalidation, wrong event, double scan |
| `webhooks.test.ts` | Capture-once, replay, amount mismatch, quarantine, cancellation, terminal state |
| `resale-transfer.test.ts` | Ownership, locking, markup caps, no double-sale, proceeds split |
| `bookings.test.ts` | Capacity, waitlist promotion, invitation single-use and guest allowance |
| `refunds-payouts.test.ts` | Refund-after-transfer prevention, partial refunds, step-up, maker-checker, reserves |
| `domain.test.ts` | Money arithmetic, state machines, event-type policy, risk scoring, audit redaction |

---

## Scaling out

The module boundaries are where services would split: Payments + Ledger +
Payouts as a financial service, Risk as its own service, Check-In as an
edge-deployed service near venues. Nothing in the domain layer would change —
only the repository and transport implementations.

East African expansion is already accounted for in the money type
(`KES | USD | UGX | TZS | RWF`) and the payment provider abstraction.
