# Bookit — security model

What is implemented, what is designed, and what is deliberately not claimed.

---

## 1. Money can only move on the provider's word

The single most important rule in the system: **the browser cannot mark a
payment successful.**

Checkout does this, in order:

1. create the order,
2. atomically reserve inventory under a row lock,
3. create a hold with an expiry,
4. initiate the payment with the provider,
5. convert the hold to sold **only** after a verified provider confirmation,
6. release on timeout or failure.

Steps 1–4 are in `CheckoutService.startCheckout`. Step 5 is driven exclusively
by `PaymentService.handleWebhook` or the scheduled
`PaymentService.reconcilePending`. Step 6 is `releaseExpiredHolds`.

### Webhook handling

Every inbound callback passes through the same gauntlet:

| Stage | Behaviour |
| --- | --- |
| Authenticate | M-Pesa is authenticated by source IP against Safaricom's published ranges. A callback from anywhere else is rejected with 403 and never recorded. |
| Deduplicate | Keyed on `provider:requestId:resultCode`. A replay returns `DUPLICATE` and changes nothing. |
| Attribute | No matching payment → the transaction is **quarantined** and an audit event raised. Never silently accepted, never silently dropped. |
| Verify amount | A mismatch against the expected order total refuses fulfilment, records the discrepancy and holds for review. |
| Transition once | Terminal payments are immutable — a late callback cannot re-capture. |
| Fulfil once | Fulfilment is idempotent; a duplicate delivery cannot issue a second set of tickets. |

The HTTP handler returns 200 for anything it genuinely dealt with — including
duplicates and quarantines — because a non-2xx makes Daraja retry forever. A
non-2xx is reserved for callbacks that failed authentication (403) or where our
own processing failed (500, where a retry is what we want).

Tested in `tests/webhooks.test.ts`.

---

## 2. Ticket credentials

The QR code is not the ticket. The authoritative ticket is the backend record.

A credential is a compact signed payload — ticket id, event id, occurrence,
**credential version**, issued-at, expiry, nonce, key id — HMAC-SHA256 signed.

Two properties do all the work:

- **Short TTL** (45s default). A screenshot is worthless a minute later.
- **`credentialVersion`.** Transfer, resale, refund, void or suspension
  increments the ticket's version. Every credential ever issued at the old
  version stops verifying immediately, with no need to reach any device.

Keys are addressed by id, so rotation is possible: new credentials are signed
with the active key while in-flight credentials signed with the previous key
keep verifying until they expire. Secrets belong in a secrets manager;
`TICKET_CREDENTIAL_KEYS` is the injection point.

Only the signature digest is persisted (`TicketCredential.signatureHash`), so a
database leak does not yield working QR codes.

The credential endpoint sets `Cache-Control: no-store`. A cached credential is
a replayable one.

Tested in `tests/credentials.test.ts`.

---

## 3. Overselling

`InventoryUnit` is one row per sellable unit. Reservation both selects and
marks units in a single locked step — `SELECT … FOR UPDATE SKIP LOCKED` in
PostgreSQL, an exclusive mutex in the in-memory store — so two buyers racing
for the last seat cannot both win. If any line in a multi-line order is short,
the whole transaction rolls back.

`tests/inventory.test.ts` runs ten concurrent checkouts against one seat and
asserts exactly one succeeds and nine get `SOLD_OUT`.

---

## 4. Resale and transfer

There are no PDF uploads and no screenshots of confirmation emails, so there is
nothing to forge. Only a Bookit-issued ticket can be listed, and ownership is
verified at listing time.

- Listing moves the ticket to `LISTED`, which locks it — it cannot
  simultaneously be transferred or listed again.
- A pending transfer moves the ticket to `SUSPENDED` for the same reason.
- Completing a sale transfers ownership, appends immutable ownership history,
  increments the credential version and posts the ledger entries — all inside
  one transaction. A partial resale would leave two people believing they own
  a ticket; it cannot happen.
- Completing an already-sold listing is idempotent, not a second sale.

Organizer controls: resale on/off, maximum markup in basis points, resale
window, listings per account, seller payout delay.

Seller proceeds are held for the organizer's payout delay so a fraudulent sale
can be reversed before money leaves the platform.

Tested in `tests/resale-transfer.test.ts`.

---

## 5. Refunds

The failure mode guarded against is refunding a ticket that has moved on.
Refunding after a transfer or resale would return money to someone who no
longer holds the ticket while the new owner keeps a valid credential.

Eligibility is evaluated against **live** ticket state: only tickets still held
by the original buyer, never used, on a paid order, for an event that has not
happened. Tickets are invalidated before the provider call, so a provider
failure cannot leave a live credential on a refunded ticket. The ledger entry
debits the organizer's payable — not the platform's fee revenue.

Bulk refunds require step-up authentication.

Tested in `tests/refunds-payouts.test.ts`.

---

## 6. Payouts — the largest fraud surface

A new organizer holding millions in ticket money before an event has happened
is the platform's biggest exposure.

**Risk-based reserves.** Available balance is `payable − reserve`, capped by
trust tier:

| Tier | Available pre-event | Dispute window |
| --- | --- | --- |
| NEW | 20% | 7 days |
| ESTABLISHED | 50% | 3 days |
| TRUSTED | 80% | 1 day |

**Maker-checker.** A payout cannot be approved by the person who requested it,
and approval requires a `FINANCE_MANAGER` or `SUPER_ADMIN` role plus satisfied
MFA. The approval chain is written to the audit log.

**Changing the settlement account** requires step-up auth, notifies the
contacts **on file before the change** (so a hijacked account cannot silently
redirect funds), raises a risk event, and starts a cooling period during which
payouts are held.

---

## 7. Risk engine

A single service rather than rules scattered through checkout, resale and
payout code. Signals include account age, order and payment-failure velocity,
device reputation and sharing, impossible travel, quantity and value,
time-to-resale, markup, chargeback history and payout-destination changes.

Outcomes: `ALLOW`, `MONITOR`, `CHALLENGE`, `HOLD`, `MANUAL_REVIEW`, `BLOCK`.
Every decision persists a score **and explainable reason codes** so a risk
analyst can see why — no unexplainable blocks.

---

## 8. Authorization and audit

Roles: Consumer, Organizer Owner/Admin, Event Manager, Finance, Finance
Manager, Check-In Staff, Support Agent, Risk Analyst, Super Admin, Security
Admin. Least privilege; the organizer Team page states each role's scope.

Step-up is required for: changing phone/email, changing payout destination,
requesting or approving payouts, bulk refunds, event cancellation, permission
changes.

Every sensitive action writes an `AuditLog` with actor, action, resource,
before/after, IP, session, MFA assurance, reason and approval chain. Snapshots
are **redacted** — passwords, tokens, KRA PINs and account numbers become
`[redacted]`. The audit trail records *that* a payout destination changed and
who changed it, not the account number. Audit rows are append-only; in
PostgreSQL, UPDATE and DELETE are revoked at the database role level.

---

## 9. Application security baseline

| Control | Implementation |
| --- | --- |
| CSP | Nonce-based, `strict-dynamic`, in `src/middleware.ts`. An injected script without the per-request nonce does not execute. No third-party scripts; fonts are self-hosted. |
| Security headers | HSTS with preload, `X-Content-Type-Options`, `X-Frame-Options: DENY`, Referrer-Policy, Permissions-Policy — `next.config.ts`. |
| Rate limiting | Per-instance fixed-window in middleware, tighter on checkout and bookings. Payment webhooks are exempt — dropping a callback loses money. Multi-instance limits belong in Redis or at the WAF. |
| Input validation | Zod at every API boundary; failures become a `VALIDATION_ERROR` envelope with per-field issues. |
| Error handling | One `DomainError` taxonomy → consistent envelopes. Unexpected errors log server-side and return a generic `INTERNAL_ERROR`; internals never reach a response body. |
| Idempotency | `Idempotency-Key` on checkout; ledger posting is idempotent on `reference`; webhooks deduplicate. |
| Injection | Prisma parameterises; React escapes by default; no `dangerouslySetInnerHTML` anywhere. |
| Secrets | Read once in `config.ts`. Nothing reaches into `process.env` directly. |
| PII | MSISDNs masked before storage. Raw invite tokens are never persisted — only a SHA-256 hash. No raw card data, ever. |

---

## 10. Private events

A private event is not a hidden listing — it has no public surface at all.

| Control | Implementation |
| --- | --- |
| Not discoverable | `EventRepository.query` only honours `includeNonPublic` when the query is already scoped to one `organizerId`. A discovery surface therefore cannot widen its own visibility, even by mistake. |
| No public page | `CatalogService.getBySlug` returns `null` for anything that is not PUBLIC or UNLISTED, so guessing a slug reveals nothing — not even that the event exists. |
| Token is the only key | The microsite at `/i/[token]` resolves the event *from* the invitation. No route takes an event id from an untrusted caller. |
| Tokens stored hashed | Only a SHA-256 hash is persisted. The raw link is returned exactly once, at issue time, and never logged or stored. |
| One link per guest | Each invitation carries its own guest allowance, expiry and status, and can be revoked individually. |
| No indexing | The route sets `robots: noindex, nofollow, nocache`. |
| Guest privacy | Other guests' names and the confirmed count are hidden unless the host explicitly turns them on. Notes left with an RSVP are held unapproved until the host publishes them. |
| Host authorization | Every studio and broadcast operation checks `actor.organizerId` against the event's owner, and refuses outright if the event is public. |
| Gift claims are atomic | Claiming decrements the remaining count inside a transaction, so two guests cannot both claim the last item. |

Covered by `tests/private-events.test.ts` (26 tests), including that the event
is absent from every homepage rail, every search, city counts, and the public
slug route.

## 11. Offline scanning — and its honest limit

A registered device receives an encrypted, event-scoped validation package with
expiring credentials, and admits offline against a local consumed-set. Batches
sync when connectivity returns; **earliest scan wins** and later duplicates are
flagged for review.

**The limitation, stated plainly:** two devices that are both fully offline can
admit the same code. No design prevents that. Bookit narrows the window with
short credential lifetimes, per-gate device partitioning and aggressive sync,
and the reconciliation report shows exactly which codes were double-scanned.
The organizer Check-In page says this to the operator rather than implying a
guarantee that does not exist.

---

## 12. Not yet implemented

- **Authentication provider.** Session model, magic links, MFA and step-up are
  designed and modelled; services already enforce authorization against an
  `ActorContext`. The login flow that produces that context is missing, and the
  app currently runs as a fixed demo user.
- **Prisma repository adapter.** Schema and interfaces exist; the adapter does
  not.
- **Distributed rate limiting**, WAF rules, and a real secrets manager
  integration — these are deployment concerns, with the injection points ready.
- **Penetration testing and a security review** have not been performed.
