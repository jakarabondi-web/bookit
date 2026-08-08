import { NextResponse } from "next/server";
import { getContainer } from "@/server/container";

export const dynamic = "force-dynamic";

/**
 * GET /go/:code — the affiliate link's public face. Records the click, then
 * sends the visitor on to the real event page. An unknown or dead code
 * degrades to the events list rather than a 404 — a shared marketing link
 * should never dead-end, even after the event it pointed to is gone.
 */
export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const { promotions, uow } = getContainer();

  const link = await promotions.recordClick(code);
  const event = link ? await uow.repos.events.findById(link.eventId) : null;

  const destination = event ? `/events/${event.slug}` : "/events";
  return NextResponse.redirect(new URL(destination, request.url), { status: 302 });
}
