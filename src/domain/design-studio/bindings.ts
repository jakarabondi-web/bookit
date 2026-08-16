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
  /**
   * The order of the day and the menu.
   *
   * Lists rather than strings, because the programme and the menu are set as
   * rows — a time against an item, a course against a dish — and a design that
   * receives them as one blob of text cannot align the columns.
   */
  programme?: { time: string; item: string }[];
  menu?: { course: string; dish: string }[];
}

/** Used when an event has not set its own. Neutral enough for any occasion. */
export const DEFAULT_PROGRAMME: { time: string; item: string }[] = [
  { time: "2:00", item: "Guests are seated" },
  { time: "2:30", item: "The ceremony" },
  { time: "3:30", item: "Photographs and refreshments" },
  { time: "5:00", item: "Dinner is served" },
  { time: "7:00", item: "Speeches and toasts" },
  { time: "8:30", item: "The first dance" },
  { time: "10:00", item: "Carriages" },
];

export const DEFAULT_MENU: { course: string; dish: string }[] = [
  { course: "To begin", dish: "Grilled prawns, tamarind and lime" },
  { course: "Second", dish: "Roast butternut and coconut soup" },
  { course: "Main", dish: "Slow-roast lamb, rosemary jus" },
  { course: "Alongside", dish: "Pilau, kachumbari, seasonal greens" },
  { course: "To finish", dish: "Passionfruit tart, vanilla cream" },
];

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
  "guest.salutation": "Dear guest",
  // Per-guest pieces are printed from the guest list; in a preview they show
  // the shape of what will be printed rather than a made-up person's name.
  "guest.table": "12",
  "guest.rsvpCode": "AK-4821",
  "guest.url": "bookit.co.ke/i/your-invitation",
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
    programme: [
      { time: "2:00", item: "Guests are seated" },
      { time: "2:30", item: "The ceremony" },
      { time: "3:30", item: "Photographs and cocktails" },
      { time: "5:00", item: "Dinner is served" },
      { time: "7:00", item: "Speeches and toasts" },
      { time: "8:30", item: "The first dance" },
      { time: "10:30", item: "Carriages" },
    ],
    menu: [
      { course: "To begin", dish: "Grilled tiger prawns, tamarind and lime" },
      { course: "Second", dish: "Roast butternut and coconut soup" },
      { course: "Main", dish: "Slow-roast lamb, rosemary jus" },
      { course: "Alongside", dish: "Pilau, kachumbari, seasonal greens" },
      { course: "To finish", dish: "Passionfruit tart, vanilla cream" },
    ],
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
    programme: [
      { time: "11:00", item: "Arrival and welcome" },
      { time: "11:30", item: "Greetings between the families" },
      { time: "12:00", item: "Introductions" },
      { time: "1:00", item: "The ceremony" },
      { time: "2:30", item: "Lunch is served" },
      { time: "4:00", item: "Gifts and blessings" },
      { time: "5:00", item: "Photographs" },
    ],
    menu: [
      { course: "To begin", dish: "Roast maize, chilli and lime" },
      { course: "From the grill", dish: "Nyama choma, kachumbari" },
      { course: "Main", dish: "Pilau, chapati, sukuma wiki" },
      { course: "Alongside", dish: "Githeri, roast sweet potato" },
      { course: "To finish", dish: "Mandazi and spiced chai" },
    ],
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
    programme: [
      { time: "4:30", item: "Guests are seated" },
      { time: "5:00", item: "The ceremony" },
      { time: "6:00", item: "Photographs by the water" },
      { time: "7:00", item: "Dinner is served" },
      { time: "8:30", item: "Speeches and toasts" },
      { time: "9:30", item: "Dessert and coffee" },
    ],
    menu: [
      { course: "To begin", dish: "Coconut and coriander soup" },
      { course: "Second", dish: "Grilled octopus, green mango" },
      { course: "Main", dish: "Whole snapper, tamarind and ginger" },
      { course: "Alongside", dish: "Coconut rice, spiced greens" },
      { course: "To finish", dish: "Cardamom custard, roast pineapple" },
    ],
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
