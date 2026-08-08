# Bookit

Kenyan event platform: paid ticketing, free RSVPs, private invitations,
bookings and reservations, banquets, recurring meetings, hybrid events, and a
verified ticket ownership and resale layer.

Built to the two specifications in `docs/bookit-claude-package/`.

---

## Quick start

```bash
npm install
cp .env.example .env.local     # optional — sensible defaults are built in
npm run dev                    # http://localhost:3000
```

No database is needed to run it. With `DATABASE_URL` unset the app uses the
in-memory repositories, seeded with realistic Kenyan demo data — around twenty
events across every event type, guest lists, orders, tickets, contributions and
a resale listing.

```bash
npm test          # 79 domain and integration tests
npm run typecheck # tsc --noEmit, strict
npm run build     # production build
```

---

## What is here

### Consumer

| Route | What it does |
| --- | --- |
| `/` | Homepage — hero, categories, Popular Events, booking CTA, weekend/free/social/sports rails, city explorer, organizer CTA |
| `/events` | Search and filter by query, city, category and event type; state lives in the URL |
| `/events/[slug]` | Event detail with a sticky panel that adapts to the event type |
| `/bookings` | Booking hub — what you can book and what is open |
| `/venues` | Venues by city |
| `/account` | Overview, tickets, bookings, resale listings, profile |
| `/help`, `/legal/*` | Help centre and legal summaries |

### Organizer (`/organizer`)

Dashboard, Events, Bookings, Guest Lists, Orders, Tickets, Customers,
Marketing, Check-In, Finance, Payouts, Analytics, Team, Settings — plus the
event creation wizard and the per-event guest list manager.

### API (`/api/v1`)

`GET /events`, `GET /events/:slug`, `POST /orders`, `POST|GET /bookings`,
`GET /tickets`, `GET /tickets/:id/credential`, `POST /checkins`,
`POST /payments/webhooks/mpesa`. Consistent `{ data, meta }` / `{ error }`
envelopes, cursor pagination, and idempotency keys on checkout.

---

## The ideas that shape the code

**A booking is not a ticket.** A ruracio guest bringing four people, a chama
member attending a monthly meeting and a stadium seat share almost nothing.
`src/domain/event-type-policy.ts` is the single table describing how each event
type behaves, and both the consumer booking panel and the organizer wizard read
from it — so the two can never disagree about what a banquet is.

**The QR code is not the ticket.** The authoritative ticket is the backend
record. A QR is a short-lived signed assertion about that record, carrying a
`credentialVersion`. Transferring, reselling, refunding or voiding a ticket
increments that version, which invalidates every code ever issued for it —
instantly, without needing to reach any device.

**Money is integer minor units, always.** `src/domain/money.ts`. No floats
anywhere, and mixing currencies throws.

**Balances come from a ledger, not a sum of payments.** Every sale, fee, refund,
resale and payout posts a balanced double-entry transaction. An organizer's
available balance is `payable − reserve`, capped by their trust tier's
pre-event release. See `src/server/services/ledger-service.ts`.

**The frontend can start a payment; only the provider can finish one.** A
payment reaches `CAPTURED` through a verified webhook or a server-side
reconciliation query — never from the browser.

---

## Architecture

```
src/
├── domain/          Pure types, enums, money, state machines, event-type policy
├── server/
│   ├── domain-agnostic infrastructure: config, clock, ids
│   ├── repositories/  Interfaces + in-memory implementation with real
│   │                  transaction and row-lock semantics
│   ├── services/      Checkout, payments, tickets, bookings, resale, check-in,
│   │                  refunds, payouts, ledger, risk, audit, notifications
│   ├── payments/      Provider abstraction + M-Pesa (Daraja) adapter
│   ├── seed/          Kenyan demo dataset
│   └── container.ts   Composition root
├── app/             Next.js App Router — pages and /api/v1 routes
├── components/      ui/ primitives, layout/, home/, events/, account/, organizer/
└── middleware.ts    Nonce-based CSP and per-instance rate limiting
```

Services depend on repository *interfaces*, so swapping the in-memory store for
PostgreSQL is a change in `container.ts` and nowhere else. The production schema
is already written: `prisma/schema.prisma`.

Full detail in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) and
[`docs/SECURITY.md`](docs/SECURITY.md).

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 ·
Radix UI primitives · Zod · Prisma (schema) · Vitest.

Type: **Plus Jakarta Sans** for display, **Inter** for interface — both
self-hosted through `next/font`, so no third-party request and no CSP exception.

---

## Images

The photography in `public/assets/images/source/` came from the supplied concept
board: 80–130px crops with a white frame baked into the pixels. `npm run
assets` (`scripts/prepare-assets.mjs`) trims the frame, upscales with Lanczos
and a light unsharp mask, and writes WebP + JPEG.

Two of the supplied PNGs also had the board's own caption text inside the image,
so the booking and organizer panels use original inline SVG artwork instead
(`src/components/home/booking-illustration.tsx`).

**To use real photography:** drop full-resolution files into
`public/assets/images/source/` with the same filenames and run `npm run assets`.
The upscale becomes a no-op and nothing else changes.

---

## Configuration

Everything is read once in `src/server/config.ts`. See `.env.example`. The
values worth knowing:

| Variable | Effect |
| --- | --- |
| `DATABASE_URL` | Unset → in-memory repositories. Set → PostgreSQL via Prisma. |
| `TICKET_CREDENTIAL_KEYS` | `keyId:secret` pairs. Several at once enables rotation. |
| `TICKET_CREDENTIAL_TTL_SECONDS` | QR lifetime. Default 45s. |
| `CHECKOUT_HOLD_TTL_SECONDS` | How long seats are held during checkout. Default 600s. |
| `PLATFORM_SERVICE_FEE_BPS` | Service fee in basis points. Default 600 (6%). |
| `MPESA_*` | Daraja credentials. Without them a sandbox stub is used. |

---

## Known gaps

Stated plainly rather than buried:

- **Authentication is not wired up.** The session model, magic links, MFA and
  step-up are specified in `docs/ARCHITECTURE.md` and modelled in the Prisma
  schema, and every service already takes an `ActorContext` and enforces
  authorization against it. What is missing is the provider that turns a login
  into that context; the app currently runs as a fixed demo user.
- **The Prisma repository implementation is not written.** The schema and the
  interfaces are; the adapter between them is the remaining work.
- **Legal pages are summaries**, accurate to the implementation but not
  reviewed by a lawyer. Each page says so.
- **Offline scanner sync** has domain logic and tests but no device client.
