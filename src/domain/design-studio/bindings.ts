/**
 * Data bindings.
 *
 * Stationery is written once and printed for every guest, so the text on an
 * element is a template rather than a string: `{{couple.firstName}}` resolves
 * from the event, `{{guest.name}}` from whoever is holding the invitation.
 * Change the venue in Bookit and the invitation, the details card, the
 * programme and the welcome sign all follow — which is the whole argument for
 * the design living inside the event platform rather than beside it.
 *
 * An unresolved binding renders as its own placeholder text rather than as an
 * empty gap, so a half-filled design still reads as a design.
 */

export interface BindingContext {
  couple: {
    firstName: string;
    secondName: string;
    /** Initials, for monograms. */
    initials: string;
  };
  event: {
    name: string;
    kind: string;
    date: string;
    dateLong: string;
    dateNumeral: string;
    month: string;
    year: string;
    weekday: string;
    time: string;
    venue: string;
    address: string;
    city: string;
    country: string;
    hosts: string;
    dressCode: string;
    hashtag: string;
    rsvpBy: string;
    rsvpUrl: string;
  };
  guest?: {
    name: string;
    salutation: string;
    partySize: number;
    rsvpCode: string;
    table: string;
    url: string;
  };
}

const PLACEHOLDERS: Record<string, string> = {
  "couple.firstName": "Amara",
  "couple.secondName": "Kwame",
  "couple.initials": "A & K",
  "event.name": "The Wedding",
  "event.date": "Sat, 12 Sept 2026",
  "event.time": "2:00 PM",
  "event.venue": "The Venue",
  "event.city": "Nairobi",
  "guest.name": "Our guest",
};

const BINDING = /\{\{\s*([a-zA-Z]+(?:\.[a-zA-Z]+)*)\s*\}\}/g;

/** Reads a dotted path out of the context. */
function lookup(context: BindingContext, path: string): string | undefined {
  const value = path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined,
      context,
    );
  if (value === undefined || value === null) return undefined;
  return String(value);
}

/**
 * Fills the bindings in a string.
 *
 * Missing values fall back to a readable placeholder rather than to an empty
 * string: a design with a hole where the names should be looks broken, and a
 * host judging a template should be judging the design, not the gaps.
 */
export function resolveBindings(text: string, context: BindingContext): string {
  return text.replace(BINDING, (whole, path: string) => {
    const value = lookup(context, path);
    if (value !== undefined && value !== "") return value;
    return PLACEHOLDERS[path] ?? whole;
  });
}

/** Every binding a piece of text refers to. */
export function bindingsIn(text: string): string[] {
  return [...text.matchAll(BINDING)].map((match) => match[1]!);
}

/**
 * Sample content for the gallery.
 *
 * Real names and real places, because "John Doe" in a preview tells a host
 * nothing about whether a design will hold *their* names — and because a
 * template that only looks right with short Western names is a template that
 * has not been tested.
 */
export const SAMPLE_CONTEXTS: BindingContext[] = [
  {
    couple: { firstName: "Amara", secondName: "Kwame", initials: "A & K" },
    event: {
      name: "The Wedding of Amara & Kwame",
      kind: "Wedding",
      date: "Sat, 12 Sept 2026",
      dateLong: "Saturday, the twelfth of September",
      dateNumeral: "12",
      month: "September",
      year: "2026",
      weekday: "Saturday",
      time: "2:00 PM",
      venue: "Villa Rosa Kempinski",
      address: "Chiromo Road, Westlands",
      city: "Nairobi",
      country: "Kenya",
      hosts: "Together with their families",
      dressCode: "Black tie",
      hashtag: "#AmaraAndKwame",
      rsvpBy: "1 August 2026",
      rsvpUrl: "bookit.co.ke/i/amara-kwame",
    },
  },
  {
    couple: { firstName: "Njeri Wambui", secondName: "Mwangi Njoroge", initials: "N & M" },
    event: {
      name: "Ruracio",
      kind: "Ruracio",
      date: "Sat, 5 Sept 2026",
      dateLong: "Saturday, the fifth of September",
      dateNumeral: "05",
      month: "September",
      year: "2026",
      weekday: "Saturday",
      time: "11:00 AM",
      venue: "Wambui Family Homestead",
      address: "Githunguri",
      city: "Limuru",
      country: "Kenya",
      hosts: "The Wambui and Njoroge families",
      dressCode: "Traditional attire",
      hashtag: "#NjeriMeetsMwangi",
      rsvpBy: "20 August 2026",
      rsvpUrl: "bookit.co.ke/i/njeri-mwangi",
    },
  },
  {
    couple: { firstName: "Aisha", secondName: "Omar", initials: "A & O" },
    event: {
      name: "The Wedding of Aisha & Omar",
      kind: "Wedding",
      date: "Fri, 3 July 2026",
      dateLong: "Friday, the third of July",
      dateNumeral: "03",
      month: "July",
      year: "2026",
      weekday: "Friday",
      time: "4:30 PM",
      venue: "The Old Fort",
      address: "Stone Town",
      city: "Zanzibar",
      country: "Tanzania",
      hosts: "Together with their families",
      dressCode: "Coastal formal",
      hashtag: "#AishaAndOmar",
      rsvpBy: "1 June 2026",
      rsvpUrl: "bookit.co.ke/i/aisha-omar",
    },
  },
];

export const DEFAULT_CONTEXT = SAMPLE_CONTEXTS[0]!;

/**
 * The long-name stress case from the template QA checklist.
 *
 * Every template is checked against this before it ships: a design that only
 * holds "Amara & Kwame" is not finished.
 */
export const LONG_NAME_CONTEXT: BindingContext = SAMPLE_CONTEXTS[1]!;
