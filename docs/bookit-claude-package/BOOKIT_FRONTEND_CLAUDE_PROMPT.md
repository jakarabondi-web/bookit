# BOOKIT — CLAUDE CODE FRONTEND / UI-UX BUILD PROMPT

You are building the production frontend for **Bookit**, a Kenyan event discovery, paid-ticketing, RSVP, booking, guest-management, and verified resale platform.

## Product positioning
Bookit combines an Eventbrite-style event discovery and organizer experience with a verified ticket ownership/resale layer. Users must immediately understand that Bookit supports:
- Paid ticketed events
- Free RSVP events
- Private invitation events
- Reservation/booking events
- Banquets and ceremonies
- Recurring meetings such as chama meetings
- Hybrid events combining tickets and invited guests

Do not use the name Tikiti. The product name is **Bookit**.

## Primary visual direction
Reproduce the warm, light **1B design direction** from the supplied reference board:
- warm white / cream background
- bright white primary surfaces
- orange as the primary CTA/accent
- strong event photography
- spacious modern layout
- rounded cards
- thin soft borders
- minimal shadows
- premium lifestyle/event marketplace feeling
- original design inspired by the usability of Eventbrite/Airbnb, without copying their branding

Use these starting tokens:
- background: #FFFDF9
- surface: #FFFFFF
- secondary surface: #FFF8F2
- primary orange: #F97316
- orange hover: #EA580C
- orange tint: #FFF0E5
- primary text: #111827
- secondary text: #4B5563
- muted text: #6B7280
- border: #E5E7EB
- success: #16A34A
- error: #DC2626
- info: #2563EB

Typography: Inter, system sans fallback.
Use an 8px spacing system.
Desktop content width: 1280–1440px.
Page padding: 32–48px desktop, 24px tablet, 16px mobile.
Card radius: 14–18px. Hero radius: about 20px.

## Stack
- Next.js App Router
- TypeScript strict mode
- Tailwind CSS
- shadcn/ui
- React Hook Form + Zod
- Lucide only where a supplied Bookit SVG icon is not appropriate

## Global header
Sticky white header, roughly 72px desktop.
Left: lowercase **bookit** wordmark.
Navigation:
- Discover
- Events
- Bookings
- Venues
- For Organizers
Right:
- Nairobi location selector
- cart / booking basket
- Log in
- Sign Up (solid orange)
Mobile:
- logo
- search icon
- cart/profile
- hamburger

## Homepage hero
Build the hero around the 1B visual system. Use `assets/images/hero-banquet.jpg` as the primary reference image.

Copy:
**Discover Events.**
**Book. Attend. Enjoy.**

Supporting text:
“From concerts and sports to meetings, weddings, ceremonies and community events — find it all on Bookit.”

Search:
[ Search events, artists, venues or categories... ] [ Nairobi ▼ ] [ Search ]

Below it, filter pills:
- All Events
- Paid Events
- Free / RSVP
- Bookings
- This Weekend

Default active: All Events.

## Category strip
Lightweight icon cards:
- Concerts
- Sports
- Comedy
- Conferences
- Parties
- Weddings
- Meetings
- Community
- More

Use supplied SVG assets from `assets/icons`.

Desktop: one row.
Mobile: horizontal scroll.

## Popular Events
Section header left: “Popular Events”
Right: “View All”

5 cards desktop.
Use supplied event images and realistic Kenyan content:
- Burna Boy — Nyayo Stadium — From KES 2,500
- Kenya vs Nigeria — Moi International Sports Centre — From KES 800
- Nairobi Basketball League — Kasarani Indoor Arena — From KES 1,200
- Sauti Sol Live — KICC Grounds — From KES 1,200
- Blankets & Wine — Uhuru Gardens — From KES 1,000

Each card:
- large image
- date badge
- title
- venue/city
- price or status label

Status examples:
- Free
- RSVP Only
- Invitation Only
- Reserve Spot

## Make a Booking CTA
Prominent warm-peach panel beside/below events:
Heading: **Make a Booking**
Text: “Create reservations for meetings, banquets, ceremonies and private events.”
Button: **Create Booking**
Use one supplied booking illustration.

This CTA must communicate that Bookit is more than a concert-ticketing platform.

## Benefit strip
4 items:
- Easy Search — Find events and venues near you quickly.
- Secure Booking — Safe payments and instant confirmations.
- Flexible Options — Buy tickets, RSVP or make reservations.
- Manage Bookings — View and manage all your events in one place.

## Additional homepage sections
Build:
- This Weekend
- Free Events
- Private & Social Events
- Sports
- Trending in Nairobi
- Explore by City: Nairobi, Mombasa, Kisumu, Nakuru, Eldoret
- Organizer CTA
- Footer

Private/social examples:
- Ruracio Ceremony
- Chama Meeting
- Wedding Reception
- Family Gathering
- Corporate Dinner
- Alumni Gathering

## Event detail
Route: `/events/[slug]`

Main content:
- hero
- title
- organizer
- date/time
- venue/map placeholder
- description
- agenda
- policies
- organizer info

Sticky right card adapts by event type:
PAID_TICKET → Get Tickets
FREE_RSVP → RSVP
PRIVATE_INVITATION → Enter Invitation Code / RSVP
BOOKING → Reserve Spot
BANQUET → Select Table / Reserve Seats
HYBRID → tabs for Buy Tickets / RSVP

## Account area
Routes:
- `/account`
- `/account/tickets`
- `/account/bookings`
- `/account/listings`
- `/account/profile`

“My Bookings” groups:
- Upcoming
- Past
- Cancelled

Booking card fields:
- event
- date
- location
- guest count
- status

Actions:
- View Booking
- Edit Guests
- Update RSVP
- Cancel Booking
- View QR
- Contact Organizer

“My Tickets”:
- active
- past
- transferred
- listed/resold

Ticket detail:
- event
- ticket type
- seat
- owner
- dynamic QR placeholder
- status
Actions:
- Transfer Ticket
- Sell Ticket
- View Event
- Add to Wallet

## Organizer UI
Route prefix `/organizer`.

Sidebar:
Dashboard
Events
Bookings
Guest Lists
Orders
Tickets
Customers
Marketing
Check-In
Finance
Payouts
Analytics
Team
Settings

Dashboard metrics:
- Gross Revenue
- Tickets Sold
- Bookings
- RSVPs
- Guests Confirmed
- Upcoming Events
- Check-ins
- Pending Payout

Event creation must be a wizard.

Step 1: What are you hosting?
- Paid Event
- Free RSVP Event
- Private Invitation
- Booking / Reservation
- Banquet
- Recurring Meeting
- Hybrid Event

Then adapt subsequent forms to event type.

## Guest List Manager
Route: `/organizer/events/[id]/guests`

Summary:
- Confirmed
- Pending
- Declined
- Waitlist
- Checked In
- Capacity Remaining

Columns:
Guest, Phone, Email, Status, Guests, Table, Payment, Check-in, Actions

Actions:
Add Guest, Import CSV, Export CSV, Send Reminder, Move to Waitlist, Assign Table, Check In, Cancel Booking.

## Responsive rules
Desktop: multi-column layouts.
Tablet: reduce columns.
Mobile:
- stack hero
- stack search controls
- horizontal category scroller
- 1–2 event cards per row
- organizer sidebar becomes drawer
- data tables become mobile cards

## Accessibility
Semantic HTML, keyboard support, visible focus, labels, alt text, accessible dialogs, sufficient contrast, screen-reader-friendly validation.

## Quality requirements
- Production-quality UI, not wireframes
- Skeleton/loading/empty/error states
- Reusable components
- No duplicated business logic in presentation components
- Strong responsive behavior
- Clean state variants
- Realistic Kenyan seed data
- Keep the booking capability visible on the homepage

## Initial routes to implement
/
 /events
 /events/[slug]
 /bookings
 /account
 /account/tickets
 /account/bookings
 /organizer
 /organizer/events
 /organizer/events/new
 /organizer/events/[id]
 /organizer/events/[id]/guests

Begin by matching the supplied 1B reference visually, then implement the rest of the consumer and organizer UI.
