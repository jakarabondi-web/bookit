import { notFound, validationError } from "@/domain/errors";
import { compare, percentageOf, type Money } from "@/domain/money";
import type { AffiliateLink, PromoCode } from "@/domain/types";
import { systemClock, type Clock } from "../lib/clock";
import { newId, randomToken } from "../lib/ids";
import type { Repositories, UnitOfWork } from "../repositories/types";

/**
 * Promotions — promo codes and affiliate links.
 *
 * Both are "marketing instruments" in the same sense a CRM campaign is: an
 * organizer creates one, it accrues real usage, and that usage is reported
 * back. The difference is that a promo code's usage happens inside checkout,
 * a money-critical path — so the redemption logic is exported as a pair of
 * plain functions (`previewPromoCode`, `redeemPromoCode`) that take a
 * `Repositories` directly, rather than living only as class methods bound to
 * this service's own `UnitOfWork`. That lets `CheckoutService` call
 * `redeemPromoCode` with the *transactional* `repos` its own
 * `runInTransaction` callback receives — so a bad ticket-type mid-checkout
 * rolls the redemption back with everything else, and a promo code can never
 * be marked used for an order that didn't actually complete.
 */

export function normalizePromoCode(code: string): string {
  return code.trim().toUpperCase();
}

export interface AppliedDiscount {
  promoCodeId: string;
  discount: Money;
}

/** Read-only: validates a code and computes its discount, without redeeming it. */
export async function previewPromoCode(
  repos: Repositories,
  input: { eventId: string; code: string; subtotal: Money; now: string },
): Promise<AppliedDiscount> {
  const normalized = normalizePromoCode(input.code);
  const promo = await repos.promoCodes.findByEventAndCode(input.eventId, normalized);
  if (!promo) throw validationError("That promo code isn't valid for this event");
  if (promo.disabledAt) throw validationError("That promo code has been disabled");
  if (input.now < promo.startsAt) throw validationError("That promo code isn't active yet");
  if (promo.endsAt && input.now > promo.endsAt) {
    throw validationError("That promo code has expired");
  }
  if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
    throw validationError("That promo code has been fully redeemed");
  }

  const raw =
    promo.kind === "PERCENT" ? percentageOf(input.subtotal, promo.percentBps!) : promo.fixedAmount!;
  // A fixed-amount code can never discount past the ticket total itself.
  const discount = compare(raw, input.subtotal) > 0 ? input.subtotal : raw;

  return { promoCodeId: promo.id, discount };
}

/** Validates, computes the discount, and atomically marks one redemption used. */
export async function redeemPromoCode(
  repos: Repositories,
  input: { eventId: string; code: string; subtotal: Money; now: string },
): Promise<AppliedDiscount> {
  const applied = await previewPromoCode(repos, input);
  await repos.promoCodes.update(applied.promoCodeId, {
    redemptionCount: (await repos.promoCodes.findById(applied.promoCodeId))!.redemptionCount + 1,
  });
  return applied;
}

export interface CreatePromoCodeInput {
  code: string;
  kind: "PERCENT" | "FIXED";
  /** Basis points, e.g. 1500 = 15%. Required when kind is PERCENT. */
  percentBps?: number;
  /** Required when kind is FIXED. */
  fixedAmount?: Money;
  maxRedemptions?: number | null;
  startsAt?: string;
  endsAt?: string | null;
}

export interface CreateAffiliateLinkInput {
  label: string;
}

export class PromotionsService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly clock: Clock = systemClock,
  ) {}

  private async assertOwnedEvent(organizerId: string, eventId: string) {
    const event = await this.uow.repos.events.findById(eventId);
    if (!event) throw notFound("Event", eventId);
    if (event.organizerId !== organizerId) throw notFound("Event", eventId);
    return event;
  }

  async createPromoCode(
    organizerId: string,
    eventId: string,
    input: CreatePromoCodeInput,
  ): Promise<PromoCode> {
    await this.assertOwnedEvent(organizerId, eventId);

    const code = normalizePromoCode(input.code);
    if (!/^[A-Z0-9-]{3,24}$/.test(code)) {
      throw validationError("Codes are 3–24 characters: letters, numbers and dashes only");
    }
    if (await this.uow.repos.promoCodes.findByEventAndCode(eventId, code)) {
      throw validationError(`"${code}" is already used on this event`);
    }

    if (input.kind === "PERCENT") {
      if (!input.percentBps || input.percentBps <= 0 || input.percentBps > 10_000) {
        throw validationError("Percentage must be between 1 and 100");
      }
    } else {
      if (!input.fixedAmount || input.fixedAmount.amount <= 0) {
        throw validationError("Fixed discount must be a positive amount");
      }
    }
    if (input.maxRedemptions != null && input.maxRedemptions <= 0) {
      throw validationError("Redemption limit must be at least 1");
    }
    const startsAt = input.startsAt ?? this.clock.nowIso();
    if (input.endsAt && input.endsAt <= startsAt) {
      throw validationError("End date must be after the start date");
    }

    return this.uow.repos.promoCodes.create({
      id: newId("promo"),
      organizerId,
      eventId,
      code,
      kind: input.kind,
      percentBps: input.kind === "PERCENT" ? input.percentBps! : null,
      fixedAmount: input.kind === "FIXED" ? input.fixedAmount! : null,
      maxRedemptions: input.maxRedemptions ?? null,
      redemptionCount: 0,
      startsAt,
      endsAt: input.endsAt ?? null,
      disabledAt: null,
      createdAt: this.clock.nowIso(),
    });
  }

  listPromoCodes(organizerId: string): Promise<PromoCode[]> {
    return this.uow.repos.promoCodes.listByOrganizer(organizerId);
  }

  async disablePromoCode(organizerId: string, id: string): Promise<PromoCode> {
    const promo = await this.uow.repos.promoCodes.findById(id);
    if (!promo || promo.organizerId !== organizerId) throw notFound("PromoCode", id);
    return this.uow.repos.promoCodes.update(id, { disabledAt: this.clock.nowIso() });
  }

  /** Read-only preview for the checkout UI — never touches redemption count. */
  preview(input: {
    eventId: string;
    code: string;
    subtotal: Money;
  }): Promise<AppliedDiscount> {
    return previewPromoCode(this.uow.repos, { ...input, now: this.clock.nowIso() });
  }

  async createAffiliateLink(
    organizerId: string,
    eventId: string,
    input: CreateAffiliateLinkInput,
  ): Promise<AffiliateLink> {
    await this.assertOwnedEvent(organizerId, eventId);
    if (!input.label.trim()) throw validationError("Give this link a name");

    // Codes are short and globally unique; collisions are astronomically
    // unlikely but checked anyway rather than assumed away.
    let code = "";
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = randomToken(4).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6);
      if (candidate.length >= 4 && !(await this.uow.repos.affiliateLinks.findByCode(candidate))) {
        code = candidate;
        break;
      }
    }
    if (!code) throw new Error("Could not generate a unique affiliate code");

    return this.uow.repos.affiliateLinks.create({
      id: newId("aff"),
      organizerId,
      eventId,
      code,
      label: input.label.trim(),
      clickCount: 0,
      createdAt: this.clock.nowIso(),
    });
  }

  listAffiliateLinks(organizerId: string): Promise<AffiliateLink[]> {
    return this.uow.repos.affiliateLinks.listByOrganizer(organizerId);
  }

  /** Called by the public `/go/:code` redirect. Returns null for an unknown code. */
  async recordClick(code: string): Promise<AffiliateLink | null> {
    const link = await this.uow.repos.affiliateLinks.findByCode(code);
    if (!link) return null;
    return this.uow.repos.affiliateLinks.update(link.id, { clickCount: link.clickCount + 1 });
  }
}

