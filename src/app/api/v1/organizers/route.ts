import { z } from "zod";
import { OrganizerType, Role } from "@/domain/enums";
import { DomainError, unauthenticated } from "@/domain/errors";
import { getContainer } from "@/server/container";
import { getSessionUserFromRequest } from "@/server/auth/current-user";
import { newId } from "@/server/lib/ids";
import { created, handler, parseBody } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

const CreateSchema = z.object({
  name: z.string().min(2, "Give your organizer profile a name").max(80),
  type: z.enum(Object.values(OrganizerType) as [string, ...string[]]),
  about: z.string().max(500).optional(),
  supportEmail: z.email("Enter a valid support email"),
  supportPhone: z
    .string()
    .regex(/^(\+?254|0)\d{9}$/, "Enter a Kenyan phone number, e.g. 0712 345 678"),
});

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "organizer"
  );
}

/**
 * POST /api/v1/organizers — become an organizer.
 *
 * A signed-in user with no organizer yet becomes the OWNER of a brand new
 * one, at the platform's default trust tier — the same NEW tier every real
 * organizer starts at, with the same 20%-pre-event-release reserve policy
 * everyone else's payouts already go through.
 */
export const POST = handler(async (request: Request) => {
  const session = await getSessionUserFromRequest(request);
  if (!session) throw unauthenticated("Sign in to create an organizer profile");

  const input = await parseBody(request, CreateSchema);
  const { uow } = getContainer();

  const existing = session.actor.organizerId;
  if (existing) {
    throw new DomainError("CONFLICT", "You already belong to an organizer");
  }

  const baseSlug = slugify(input.name);
  let slug = baseSlug;
  let suffix = 1;
  while (await uow.repos.organizers.findBySlug(slug)) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const now = new Date().toISOString();
  const organizer = await uow.repos.organizers.create({
    id: newId("org"),
    name: input.name,
    slug,
    type: input.type as OrganizerType,
    about: input.about ?? "",
    logoUrl: null,
    verification: "UNVERIFIED",
    trustTier: "NEW",
    supportEmail: input.supportEmail,
    supportPhone: input.supportPhone,
    members: [{ userId: session.user.id, role: Role.ORGANIZER_OWNER, addedAt: now }],
    createdAt: now,
  });

  return created({ id: organizer.id, name: organizer.name, slug: organizer.slug });
});
