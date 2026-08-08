import type { Money } from "./money";
import type { BookingId, EventId, InviteId, UserId } from "./types";

/**
 * Private events.
 *
 * A ruracio, a wedding reception or a private dinner is not a listing — it is a
 * personal invitation to a specific person. So a private event gets its own
 * microsite at `/i/[token]`, reachable only by holding a valid invitation, and
 * its own set of tools: host names, an e-card, a programme, a gift registry,
 * broadcasts to guests, and RSVP settings.
 *
 * Nothing here is ever surfaced by discovery. `EventVisibility` decides that,
 * and the repository refuses to return non-public events to unscoped queries.
 */

/* -------------------------------------------------------------------------- */
/* Theming                                                                     */
/* -------------------------------------------------------------------------- */

export interface PrivateTheme {
  id: string;
  name: string;
  description: string;
  /** Page background. */
  background: string;
  /** Card and panel surface. */
  surface: string;
  /** Primary accent — buttons, rules, monogram. */
  accent: string;
  accentSoft: string;
  /** Body and heading text. */
  ink: string;
  inkSoft: string;
  /** Display font stack for names and headings. */
  displayFont: string;
  /** Body font stack. */
  bodyFont: string;
}

/**
 * Curated themes. Hosts pick one rather than choosing colours freehand —
 * an invitation that looks wrong reflects on them, not on us.
 */
export const PRIVATE_THEMES: PrivateTheme[] = [
  {
    id: "gold-ivory",
    name: "Gold & Ivory",
    description: "Warm, classic and formal. Suits weddings and ruracio ceremonies.",
    background: "#FBF7F0",
    surface: "#FFFFFF",
    accent: "#B08544",
    accentSoft: "#F5EDDF",
    ink: "#2B241B",
    inkSoft: "#6B6053",
    displayFont: "var(--font-cormorant), Georgia, serif",
    bodyFont: "var(--font-inter), system-ui, sans-serif",
  },
  {
    id: "botanical",
    name: "Botanical",
    description: "Green and fresh. Garden ceremonies and daytime receptions.",
    background: "#F5F8F3",
    surface: "#FFFFFF",
    accent: "#3F6B4A",
    accentSoft: "#E4EFE5",
    ink: "#1F2A22",
    inkSoft: "#5A6B5E",
    displayFont: "var(--font-cormorant), Georgia, serif",
    bodyFont: "var(--font-inter), system-ui, sans-serif",
  },
  {
    id: "kitenge",
    name: "Kitenge",
    description: "Bold ochre and indigo, drawn from East African print.",
    background: "#FDF6EE",
    surface: "#FFFFFF",
    accent: "#C2571F",
    accentSoft: "#FBE7D6",
    ink: "#25211C",
    inkSoft: "#6B6157",
    displayFont: "var(--font-jakarta), system-ui, sans-serif",
    bodyFont: "var(--font-inter), system-ui, sans-serif",
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark and formal. Evening receptions, galas and corporate dinners.",
    background: "#12151C",
    surface: "#1B1F29",
    accent: "#C9A227",
    accentSoft: "#2A2A22",
    ink: "#F5F3EF",
    inkSoft: "#A9A8A2",
    displayFont: "var(--font-cormorant), Georgia, serif",
    bodyFont: "var(--font-inter), system-ui, sans-serif",
  },
  {
    id: "blush",
    name: "Blush",
    description: "Soft rose and cream. Bridal showers and intimate celebrations.",
    background: "#FDF5F5",
    surface: "#FFFFFF",
    accent: "#B4636F",
    accentSoft: "#F8E6E8",
    ink: "#2E2124",
    inkSoft: "#6E5B5F",
    displayFont: "var(--font-cormorant), Georgia, serif",
    bodyFont: "var(--font-inter), system-ui, sans-serif",
  },
  {
    id: "slate",
    name: "Slate",
    description: "Understated and modern. Corporate dinners and alumni gatherings.",
    background: "#F6F7F9",
    surface: "#FFFFFF",
    accent: "#334155",
    accentSoft: "#E4E8EE",
    ink: "#0F172A",
    inkSoft: "#556070",
    displayFont: "var(--font-jakarta), system-ui, sans-serif",
    bodyFont: "var(--font-inter), system-ui, sans-serif",
  },
];

export function themeById(id: string): PrivateTheme {
  return PRIVATE_THEMES.find((theme) => theme.id === id) ?? PRIVATE_THEMES[0]!;
}

/* -------------------------------------------------------------------------- */
/* Hosts                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The people the event is *for*. A wedding has two; a ruracio may name both
 * families; a birthday has one. Roles are free text so the same field works
 * for "Bride", "Groom", "Mwana", "Guest of honour" or "The Wanjiku family".
 */
export interface EventHost {
  id: string;
  name: string;
  /** e.g. "Bride", "Groom", "Celebrant", "Host family". */
  role: string;
  photoUrl: string | null;
  /** Optional short bio shown on the microsite. */
  bio: string | null;
}

/* -------------------------------------------------------------------------- */
/* Programme, travel, FAQ                                                      */
/* -------------------------------------------------------------------------- */

export interface ProgrammeItem {
  id: string;
  time: string;
  title: string;
  description: string | null;
  /** Optional venue if part of the day happens elsewhere. */
  location: string | null;
}

export interface TravelNote {
  id: string;
  title: string;
  body: string;
  kind: "DIRECTIONS" | "PARKING" | "ACCOMMODATION" | "TRANSPORT" | "OTHER";
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

/* -------------------------------------------------------------------------- */
/* E-card                                                                      */
/* -------------------------------------------------------------------------- */

export type EcardLayout = "MONOGRAM" | "PHOTO" | "BORDERED" | "MINIMAL";

export interface EcardDesign {
  layout: EcardLayout;
  /** Two initials, e.g. "A & M". Derived from hosts when left blank. */
  monogram: string | null;
  /** Line above the names, e.g. "Together with their families". */
  eyebrow: string;
  /** Line under the names, e.g. "request the pleasure of your company". */
  invitationLine: string;
  /** Closing note, e.g. "Dinner and dancing to follow". */
  footnote: string | null;
  photoUrl: string | null;
  /** Overrides the page theme for the card only, when set. */
  themeId: string | null;
}

/* -------------------------------------------------------------------------- */
/* Gift registry                                                               */
/* -------------------------------------------------------------------------- */

export type GiftKind = "ITEM" | "CASH_FUND";

export interface GiftItem {
  id: string;
  eventId: EventId;
  kind: GiftKind;
  title: string;
  description: string | null;
  imageUrl: string | null;
  /** Where to buy it, for ITEM gifts. */
  externalUrl: string | null;
  /** Indicative price for an item, or the target for a cash fund. */
  price: Money | null;
  /** How many the hosts would like. Cash funds use 1. */
  quantityWanted: number;
  quantityClaimed: number;
  /** Contributions received so far, for CASH_FUND. */
  contributed: Money | null;
  /** M-Pesa paybill/till shown for cash funds. */
  payToNumber: string | null;
  sortOrder: number;
  /** Hidden from guests without deleting the record. */
  archived: boolean;
}

export interface GiftClaim {
  id: string;
  giftId: string;
  eventId: EventId;
  inviteId: InviteId | null;
  claimantName: string;
  quantity: number;
  /** Amount pledged towards a cash fund. */
  amount: Money | null;
  message: string | null;
  /** Hosts can be kept in the dark until the day, if they prefer. */
  anonymous: boolean;
  claimedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Communication                                                               */
/* -------------------------------------------------------------------------- */

export type BroadcastAudience =
  | "ALL"
  | "CONFIRMED"
  | "PENDING"
  | "DECLINED"
  | "NOT_RESPONDED"
  | "WAITLISTED";

export type BroadcastChannel = "EMAIL" | "SMS" | "WHATSAPP";

export interface Broadcast {
  id: string;
  eventId: EventId;
  channel: BroadcastChannel;
  audience: BroadcastAudience;
  subject: string;
  body: string;
  recipientCount: number;
  sentByUserId: UserId | null;
  sentAt: string;
}

/** A note a guest left for the hosts when they responded. */
export interface GuestMessage {
  id: string;
  eventId: EventId;
  bookingId: BookingId | null;
  inviteId: InviteId | null;
  authorName: string;
  body: string;
  /** Hosts approve messages before they appear on the public wall. */
  approved: boolean;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* RSVP settings                                                               */
/* -------------------------------------------------------------------------- */

export interface RsvpSettings {
  /** After this, the microsite shows a closed state instead of the form. */
  deadline: string | null;
  allowPlusOnes: boolean;
  /** Collect a meal choice per guest. */
  collectMealChoice: boolean;
  mealOptions: string[];
  /** Collect dietary requirements free-text. */
  collectDietary: boolean;
  /** Let guests leave a note for the hosts. */
  collectMessage: boolean;
  /** Let guests request a song. */
  collectSongRequest: boolean;
  /** Show other guests' names on the microsite. */
  showGuestList: boolean;
  /** Show the running count of confirmed guests. */
  showConfirmedCount: boolean;
}

/* -------------------------------------------------------------------------- */
/* The page itself                                                             */
/* -------------------------------------------------------------------------- */

export interface PrivateEventPage {
  eventId: EventId;
  themeId: string;
  /** Large image at the top of the microsite. */
  coverImageUrl: string | null;
  /** e.g. "Ruracio Ceremony" — shown above the host names. */
  eyebrow: string;
  /** Usually the host names, rendered large. Derived from hosts when blank. */
  headline: string | null;
  /** One or two sentences under the headline. */
  tagline: string | null;
  /** Longer story — how they met, why the gathering matters. */
  story: string | null;
  hosts: EventHost[];
  programme: ProgrammeItem[];
  dressCode: string | null;
  dressCodeNote: string | null;
  travel: TravelNote[];
  faq: FaqItem[];
  ecard: EcardDesign;
  rsvp: RsvpSettings;
  /** Social hashtag for photos. */
  hashtag: string | null;
  /** Contact for questions — usually a planner or family member. */
  contactName: string | null;
  contactPhone: string | null;
  /** Shown after a guest confirms. */
  confirmationMessage: string | null;
  giftRegistryEnabled: boolean;
  giftRegistryNote: string | null;
  /** Guest message wall visible to invitees. */
  messageWallEnabled: boolean;
  updatedAt: string;
}

/** A brand-new page, filled in from the event so the studio is never blank. */
export function defaultPrivatePage(
  eventId: EventId,
  seed: { title: string; startsAt: string },
): PrivateEventPage {
  return {
    eventId,
    themeId: "gold-ivory",
    coverImageUrl: null,
    eyebrow: seed.title,
    headline: null,
    tagline: null,
    story: null,
    hosts: [],
    programme: [],
    dressCode: null,
    dressCodeNote: null,
    travel: [],
    faq: [],
    ecard: {
      layout: "MONOGRAM",
      monogram: null,
      eyebrow: "Together with their families",
      invitationLine: "request the pleasure of your company",
      footnote: null,
      photoUrl: null,
      themeId: null,
    },
    rsvp: {
      deadline: null,
      allowPlusOnes: true,
      collectMealChoice: false,
      mealOptions: ["Chicken", "Beef", "Fish", "Vegetarian"],
      collectDietary: true,
      collectMessage: true,
      collectSongRequest: false,
      showGuestList: false,
      showConfirmedCount: false,
    },
    hashtag: null,
    contactName: null,
    contactPhone: null,
    confirmationMessage: null,
    giftRegistryEnabled: false,
    giftRegistryNote: null,
    messageWallEnabled: true,
    updatedAt: new Date(0).toISOString(),
  };
}

/** Host names joined the way the microsite headline should read them. */
export function hostHeadline(page: PrivateEventPage): string {
  if (page.headline) return page.headline;
  if (page.hosts.length === 0) return page.eyebrow;
  if (page.hosts.length === 2) return `${page.hosts[0]!.name} & ${page.hosts[1]!.name}`;
  return page.hosts.map((host) => host.name).join(" · ");
}

/** Initials for the e-card monogram, e.g. "A & M". */
export function monogramFor(page: PrivateEventPage): string {
  if (page.ecard.monogram) return page.ecard.monogram;
  const initials = page.hosts
    .map((host) => host.name.trim()[0]?.toUpperCase())
    .filter(Boolean);
  if (initials.length === 0) return "✦";
  return initials.join(" & ");
}
