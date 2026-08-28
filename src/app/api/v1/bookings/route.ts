import { z } from "zod";
import { getContainer } from "@/server/container";
import { actorFor, created, handler, ok, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const BookingSchema = z
  .object({
    eventId: z.string().min(1),
    occurrenceId: z.string().nullish(),
    primaryGuestName: z.string().min(2, "Enter your full name"),
    email: z.email("Enter a valid email address").optional(),
    phone: z
      .string()
      .regex(/^(\+?254|0)\d{9}$/, "Enter a Kenyan phone number, e.g. 0712 345 678")
      .optional(),
    guestCount: z.number().int().min(1).max(50),
    guestNames: z.array(z.string().min(1)).optional(),
    mealChoice: z.string().optional(),
    notes: z.string().max(500).optional(),
    inviteToken: z.string().optional(),
    tableId: z.string().optional(),
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Enter an email address or a phone number",
    path: ["email"],
  });

/** POST /api/v1/bookings — RSVP, reservation, invitation acceptance or table booking. */
export const POST = handler(async (request: Request) => {
  const body = await parseBody(request, BookingSchema);
  const { bookings } = getContainer();

  const booking = await bookings.createBooking(await actorFor(request), {
    ...body,
    occurrenceId: body.occurrenceId ?? null,
  });

  return created({
    id: booking.id,
    reference: booking.reference,
    status: booking.status,
    guestCount: booking.guestCount,
    eventId: booking.eventId,
  });
});

/** GET /api/v1/bookings — the signed-in user's bookings. */
export const GET = handler(async (request: Request) => {
  const actor = await actorFor(request);
  const { catalog, uow } = getContainer();
  const user = actor.userId ? await uow.repos.users.findById(actor.userId) : null;
  const rows = await catalog.bookingsForUser(actor.userId ?? "", user?.email);

  return ok(
    rows.map(({ booking, event, venue }) => ({
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      guestCount: booking.guestCount,
      event: { id: event.id, slug: event.slug, title: event.title, startsAt: event.startsAt },
      venue: { name: venue.name, city: venue.city },
    })),
    { count: rows.length },
  );
});
