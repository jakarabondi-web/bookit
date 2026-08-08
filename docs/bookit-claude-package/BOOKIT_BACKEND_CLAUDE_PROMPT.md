# BOOKIT — CLAUDE CODE BACKEND / ENGINEERING BUILD PROMPT

Build the production backend and application architecture for **Bookit**, a Kenyan event platform supporting paid ticketing, free RSVP, private invitations, booking/reservation events, banquets, recurring meetings, hybrid events, verified ticket resale, payments, organizer settlement, guest management, check-in, security and fraud controls.

Do not build a toy CRUD API. Design this to evolve into a real platform.

## Recommended backend
Use:
- Node.js + NestJS (preferred) or a clean Next.js server/domain layer if the repo is intentionally monolithic
- TypeScript strict mode
- PostgreSQL
- Prisma ORM
- Redis
- background jobs/queues
- S3-compatible object storage
- structured logs
- OpenTelemetry-ready observability
- testable domain/service/repository separation

Prefer a modular monolith initially, with boundaries that can later split into services.

## Core domains/modules
Create modules for:
- Auth & Accounts
- Organizers / Teams / RBAC
- Events
- Venues
- Inventory
- Orders
- Payments
- Ledger
- Tickets / Ownership
- Bookings / RSVP
- Invitations
- Tables / Banquets
- Recurring Events
- Resale Marketplace
- Contributions
- Check-In
- Notifications
- Risk / Fraud
- Settlements / Payouts
- Refunds / Disputes
- Audit Logs
- Reporting / Analytics

## Event types
Use an enum:
PAID_TICKET
FREE_RSVP
PRIVATE_INVITATION
BOOKING
BANQUET
RECURRING_MEETING
HYBRID

The system must adapt workflows based on event type rather than forcing every event into a “ticket” abstraction.

## Suggested PostgreSQL entities
users
profiles
sessions
organizers
organizer_members
roles
permissions
organizer_verifications

events
event_categories
event_sessions
event_policies
event_visibility

venues
venue_sections
venue_rows
venue_seats

ticket_types
ticket_inventory
ticket_holds
tickets
ticket_ownership_history
ticket_credentials

orders
order_items

bookings
booking_guests
booking_questions
booking_answers
rsvps
private_invites

banquet_tables
table_assignments

recurring_events
event_occurrences

resale_listings
resale_orders

payments
payment_attempts
payment_webhooks
refunds

ledger_accounts
ledger_transactions
ledger_entries

settlements
payouts
payout_reserves

contributions
contribution_payments

promo_codes
affiliate_links

checkins
scanner_devices
scanner_sync_batches

notifications
notification_preferences

risk_events
risk_scores
manual_reviews

disputes
chargebacks

audit_logs

## Booking model
A booking must be separate from a ticket.

Booking fields should support:
- event_id
- primary_guest_user_id nullable
- primary_guest_name
- phone
- email
- status
- guest_count
- guest_names / booking_guest rows
- table assignment
- meal choice
- contribution amount
- payment status
- check-in status
- invited_by
- notes
- created_at / updated_at

Booking status:
PENDING
CONFIRMED
WAITLISTED
DECLINED
CANCELLED
CHECKED_IN
NO_SHOW

Allow guests to RSVP without full account creation using secure email magic link or phone verification.

## Private invitations
Visibility modes:
PUBLIC
UNLISTED
PRIVATE
INVITE_CODE_REQUIRED
INVITE_LINK_REQUIRED

Invitation records should support:
- invite token/hash
- invitee name
- phone/email
- max guests
- expiration
- usage state
- RSVP state

Never expose raw invite secrets in logs.

## Recurring events
Model a recurring series separately from occurrences.
Each occurrence stores:
- date/time
- attendance
- RSVP
- notes
- optional payments/contributions
- check-ins

Use recurrence rules cleanly and materialize occurrences as needed.

## Ticket inventory
Use proper concurrency protection.

Inventory states:
AVAILABLE
HELD
SOLD
CANCELLED

When checkout starts:
1. create order
2. atomically reserve inventory
3. create hold with expiry
4. initiate payment
5. only convert hold to sold after verified payment confirmation
6. release on timeout/failure

Prevent overselling with DB transactions/row locks or an equivalent atomic strategy.

## Ticket lifecycle
Ticket states:
ACTIVE
LISTED
TRANSFERRED
SOLD
CHECKED_IN
CONSUMED
REFUNDED
VOIDED
CANCELLED
SUSPENDED

Maintain immutable ownership history.

The QR code is not the ticket. The authoritative ticket is the backend record.

## Dynamic credentials
Generate short-lived cryptographically signed ticket credentials.
Payload should include at minimum:
- ticket id
- event/session id
- credential version
- issued timestamp
- expiry
- nonce/version
- signature

On transfer/resale/refund/void, previous credentials become invalid.

Use key rotation and store secrets in a secrets manager.

## Transfers
Transfer flow:
- validate current owner
- validate transfer eligibility
- lock ticket
- create transfer intent
- accept by recipient
- transactionally update ownership
- increment credential version
- append ownership history
- invalidate prior QR
- notify both parties

## Resale marketplace
Do not allow arbitrary PDF uploads.

Only Bookit-issued tickets can normally be listed.

Listing flow:
- verify ownership
- validate organizer resale rules
- lock/list ticket
- calculate fees
- buyer pays
- verified payment callback
- transactionally transfer ownership
- generate new credential
- record seller proceeds
- hold/release seller payout based on risk policy

Organizer resale controls:
- resale enabled
- max markup
- resale start/end
- max listings/account
- seller payout delay
- event-specific restrictions

## Payments
Kenya-first:
- M-Pesa
- Visa/Mastercard through a licensed PSP
- Airtel Money later
- wallet methods later

Use a provider abstraction:
PaymentProvider.initiatePayment()
PaymentProvider.verifyWebhook()
PaymentProvider.getTransaction()
PaymentProvider.refund()

Never let the frontend mark a payment as successful.

Payment state:
CREATED
PENDING
AUTHORIZED
CAPTURED
SETTLED
FAILED
CANCELLED
REFUNDED
DISPUTED
CHARGEBACK

## M-Pesa controls
Track:
- internal order id
- internal payment attempt id
- provider request id
- provider receipt/reference
- expected amount
- received amount
- phone number where appropriate
- provider timestamp
- raw callback stored securely/redacted
- verification status

Webhook handler must:
- authenticate/verify callback
- be idempotent
- reject amount mismatch
- safely handle duplicates
- quarantine unknown transactions
- update ledger only once
- issue tickets/confirm booking only once

Add scheduled reconciliation between Bookit transactions and PSP settlement reports.

## Internal ledger
Implement double-entry accounting.

Core:
ledger_accounts
ledger_transactions
ledger_entries

Every posted ledger transaction must balance debits == credits.

Track separate accounts for:
- customer funds
- organizer payable
- platform fee revenue
- PSP fees
- tax liabilities
- refunds
- reserves
- resale seller payable
- contributions
- payouts

Do not compute organizer available balance by simply summing payments.

## Organizer payouts
Implement risk-based reserves.

New organizer example:
- only a portion available pre-event
- remainder after successful event and dispute window

Trusted organizers can receive better terms.

Payout state:
PENDING
UNDER_REVIEW
APPROVED
PROCESSING
PAID
FAILED
REVERSED

Changing payout destination must trigger:
- strong authentication
- audit log
- notification to existing contacts
- risk event
- optional cooling period
- maker-checker approval for high-risk accounts

## Organizer verification
Support:
INDIVIDUAL
BUSINESS
NONPROFIT
COMMUNITY_ORGANIZATION
CHURCH
ASSOCIATION
SPORTS_ORGANIZATION

Collect appropriate:
- name
- phone/email
- ID/passport
- KRA PIN
- business registration
- settlement account
- beneficial owners
- supporting event/venue documentation when needed

Keep sensitive KYC data access-restricted and audited.

## Contributions
For ruracio/chama/fundraisers.
Track:
- pledged amount
- amount received
- outstanding
- payer
- method
- reference
- date
- booking/member/event relationship

Keep contribution accounting separate from ticket revenue.

## Check-in
Online check-in must be atomic:
1. verify credential
2. verify event
3. verify ticket/booking status
4. check already-used state
5. record check-in
6. return clear result

Support:
- QR
- guest name lookup
- phone lookup
- booking code
- manual supervisor override

Overrides require permission + audit event.

## Offline scanning
Design for venue connectivity failure.
A registered scanner device receives an encrypted event-scoped validation package.
Support:
- device registration
- event-scoped authorization
- expiring device credentials
- local consumed-set
- signed offline ticket validation
- sync batches
- conflict resolution
- duplicate scan flagging
- remote device revoke

Document limitations of simultaneous completely-offline scans and mitigate with short credential validity, gate/device partitioning where appropriate, and aggressive sync.

## Authentication
Consumers:
- email/password
- magic link
- Google
- phone verification
- passkeys later

Organizers/admins:
- MFA mandatory or strongly enforced
- session management
- device/session revocation
- step-up auth for dangerous actions

Sensitive actions needing step-up:
- change phone/email
- sell high-value tickets
- change payout destination
- initiate large payout
- bulk refund
- permission changes
- admin high-value actions

## RBAC
Roles may include:
- Consumer
- Organizer Owner
- Organizer Admin
- Event Manager
- Finance
- Check-In Staff
- Support Agent
- Risk Analyst
- Finance Manager
- Super Admin
- Security Admin

Follow least privilege.
Use maker-checker / dual approval for high-risk financial operations.

## Fraud/risk engine
Create a central risk service instead of random rules.

Risk signals:
- account age
- device reputation
- IP/network characteristics
- impossible travel
- failed auth attempts
- payment failures
- purchase velocity
- ticket quantity/value
- resale immediately after purchase
- shared devices/payment instruments
- chargeback history
- organizer history
- payout destination change
- refund ratio
- abnormal resale pricing
- bot/automation behavior

Risk outcomes:
ALLOW
MONITOR
CHALLENGE
HOLD
MANUAL_REVIEW
BLOCK

Persist explainable reason codes.

## Bot/inventory abuse
Implement:
- rate limits
- ticket-per-user limits
- payment-instrument limits
- phone/account verification
- waiting-room-compatible architecture
- behavior signals
- optional CAPTCHA only when risk demands it
- hold-expiry enforcement

## Refunds
Refund eligibility is event/policy/state aware.
Refund transaction must atomically:
- validate order/ticket/booking eligibility
- invalidate tickets where required
- update ticket/booking states
- call payment provider
- update ledger
- notify user
- append audit event

Prevent refund-after-transfer/resale inconsistencies.

## Audit
Every sensitive action records:
- actor
- action
- resource
- before/after summary
- timestamp
- IP
- device/session
- auth assurance / MFA status
- reason
- approval chain if applicable

Audit logs must be append-only to ordinary admins.

## Security baseline
- TLS everywhere
- secure cookies
- CSRF protection where relevant
- strict CORS
- input validation
- authorization on every resource
- SQL injection prevention
- XSS output handling
- SSRF defenses
- WAF/rate-limit-ready
- secrets manager
- encrypted DB/backups
- least-privilege IAM
- environment separation
- dependency scanning
- structured security logs
- point-in-time DB recovery
- webhook replay protection
- idempotency keys
- no raw card storage

## API design
Create REST or typed RPC endpoints with consistent error envelopes.
Important endpoint groups:
- /auth
- /events
- /venues
- /orders
- /payments
- /tickets
- /transfers
- /marketplace
- /bookings
- /rsvps
- /invites
- /organizers
- /guests
- /checkins
- /contributions
- /payouts
- /refunds
- /risk
- /admin

Use cursor pagination for large lists.

## Background jobs
Use queues for:
- payment reconciliation
- hold expiry
- email/SMS notifications
- QR credential housekeeping
- payout processing
- settlement computation
- risk enrichment
- recurring event occurrence generation
- exports
- analytics events

Jobs must be retry-safe and idempotent.

## Notifications
Support channels:
- email
- SMS
- WhatsApp adapter later
- push later

Event types:
- purchase confirmation
- booking confirmation
- RSVP reminder
- event reminder
- transfer received
- resale completed
- refund
- payout
- organizer verification
- payout account changed
- fraud/security alert

## Testing
Write:
- unit tests for domain rules
- integration tests for DB transactions
- webhook idempotency tests
- concurrency test for final inventory unit
- transfer/resale state tests
- refund consistency tests
- ledger balance tests
- RBAC tests
- offline sync conflict tests
- high-value/admin approval tests

## Initial engineering milestone
Implement production foundations for:
1. auth
2. users/organizers/RBAC
3. events/event types
4. venues
5. bookings/RSVP/invitations
6. ticket inventory/orders
7. payment provider interface + M-Pesa adapter boundary
8. ticket issuance/ownership
9. ledger
10. organizer guest manager APIs
11. audit log
12. risk event framework

Then add resale, offline scanner, contributions and advanced settlement.

Keep the architecture clean enough to support East African expansion and multiple payment providers/currencies later.
