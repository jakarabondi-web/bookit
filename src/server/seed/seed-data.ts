import {
  BookingStatus,
  ContributionStatus,
  EventCategory,
  EventStatus,
  EventType,
  EventVisibility,
  InventoryState,
  OrderStatus,
  OrganizerType,
  PaymentMethod,
  PaymentStatus,
  ResaleListingStatus,
  Role,
  TicketStatus,
  VerificationStatus,
} from "@/domain/enums";
import { kes, zero } from "@/domain/money";
import type {
  BanquetTable,
  Booking,
  BookingGuest,
  Contribution,
  Event,
  EventOccurrence,
  EventPolicies,
  InventoryUnit,
  Order,
  Organizer,
  PrivateInvite,
  ResaleListing,
  Ticket,
  TicketType,
  User,
  Venue,
} from "@/domain/types";
import { addDays, addHours } from "../lib/clock";
import type { MemoryDb } from "../repositories/memory/store";

/**
 * Demo dataset for local development and the design walkthrough.
 *
 * Dates are relative to process start so the homepage always has upcoming
 * events, a populated "This Weekend" rail and a live organizer dashboard.
 */

const IMG = "/assets/images";

function at(daysAhead: number, hour: number, minute = 0): string {
  const base = new Date();
  base.setHours(hour, minute, 0, 0);
  return addDays(base.toISOString(), daysAhead);
}

/** Days until the next Friday (0 when today is Friday). */
function daysUntilFriday(): number {
  const today = new Date().getDay();
  return (5 - today + 7) % 7;
}

const FRIDAY = daysUntilFriday();
const SATURDAY = FRIDAY + 1;
const SUNDAY = FRIDAY + 2;

function policies(overrides: Partial<EventPolicies> = {}): EventPolicies {
  return {
    refundPolicy:
      "Full refunds up to 7 days before the event. No refunds within 48 hours of doors opening.",
    transferAllowed: true,
    resaleEnabled: false,
    resaleMaxMarkupBps: 0,
    resaleOpensAt: null,
    resaleClosesAt: null,
    maxListingsPerAccount: 2,
    sellerPayoutDelayHours: 48,
    maxTicketsPerAccount: 6,
    ageRestriction: null,
    entryRules: [
      "Valid Bookit QR code required at the gate",
      "National ID or passport may be requested",
      "No professional cameras or recording equipment",
    ],
    ...overrides,
  };
}

/* -------------------------------------------------------------------------- */
/* Venues                                                                      */
/* -------------------------------------------------------------------------- */

const venues: Venue[] = [
  {
    id: "ven_nyayo",
    name: "Nyayo National Stadium",
    city: "Nairobi",
    area: "Lang'ata Road",
    addressLine: "Lang'ata Road, Nairobi",
    capacity: 30000,
    latitude: -1.3046,
    longitude: 36.8236,
    sections: [
      { id: "sec_nyayo_vip", name: "VIP Terrace", capacity: 1200 },
      { id: "sec_nyayo_ga", name: "General Admission", capacity: 20000 },
    ],
  },
  {
    id: "ven_kasarani",
    name: "Moi International Sports Centre",
    city: "Nairobi",
    area: "Kasarani",
    addressLine: "Thika Road, Kasarani, Nairobi",
    capacity: 60000,
    latitude: -1.2249,
    longitude: 36.8946,
    sections: [
      { id: "sec_kas_vip", name: "VIP Stand", capacity: 3000 },
      { id: "sec_kas_ga", name: "Terraces", capacity: 45000 },
    ],
  },
  {
    id: "ven_kasarani_indoor",
    name: "Kasarani Indoor Arena",
    city: "Nairobi",
    area: "Kasarani",
    addressLine: "Thika Road, Kasarani, Nairobi",
    capacity: 5000,
    latitude: -1.2246,
    longitude: 36.8931,
    sections: [
      { id: "sec_ind_court", name: "Courtside", capacity: 300 },
      { id: "sec_ind_stand", name: "Upper Stand", capacity: 4000 },
    ],
  },
  {
    id: "ven_kicc",
    name: "KICC Grounds",
    city: "Nairobi",
    area: "Central Business District",
    addressLine: "Harambee Avenue, Nairobi",
    capacity: 8000,
    latitude: -1.2889,
    longitude: 36.8236,
    sections: [{ id: "sec_kicc_ga", name: "General Admission", capacity: 8000 }],
  },
  {
    id: "ven_uhuru",
    name: "Uhuru Gardens",
    city: "Nairobi",
    area: "Lang'ata",
    addressLine: "Lang'ata Road, Nairobi",
    capacity: 12000,
    latitude: -1.3222,
    longitude: 36.8069,
    sections: [
      { id: "sec_uhuru_vip", name: "VIP Lounge", capacity: 800 },
      { id: "sec_uhuru_ga", name: "Picnic Lawn", capacity: 10000 },
    ],
  },
  {
    id: "ven_sarit",
    name: "Sarit Expo Centre",
    city: "Nairobi",
    area: "Westlands",
    addressLine: "Sarit Centre, Westlands, Nairobi",
    capacity: 3000,
    latitude: -1.2626,
    longitude: 36.8022,
    sections: [{ id: "sec_sarit_hall", name: "Main Hall", capacity: 3000 }],
  },
  {
    id: "ven_safari_park",
    name: "Safari Park Hotel",
    city: "Nairobi",
    area: "Kasarani",
    addressLine: "Thika Road, Nairobi",
    capacity: 1500,
    latitude: -1.2205,
    longitude: 36.8869,
    sections: [{ id: "sec_sp_ballroom", name: "Jambo Ballroom", capacity: 900 }],
  },
  {
    id: "ven_kiambu_home",
    name: "Wanjiku Family Homestead",
    city: "Kiambu",
    area: "Githunguri",
    addressLine: "Githunguri, Kiambu County",
    capacity: 400,
    latitude: -1.0442,
    longitude: 36.7638,
    sections: [],
  },
  {
    id: "ven_mombasa_beach",
    name: "Nyali Beach Gardens",
    city: "Mombasa",
    area: "Nyali",
    addressLine: "Nyali Road, Mombasa",
    capacity: 4000,
    latitude: -4.0435,
    longitude: 39.7,
    sections: [{ id: "sec_nyali_ga", name: "Beachfront", capacity: 4000 }],
  },
  {
    id: "ven_kisumu",
    name: "Jomo Kenyatta Sports Ground",
    city: "Kisumu",
    area: "Milimani",
    addressLine: "Oginga Odinga Street, Kisumu",
    capacity: 10000,
    latitude: -0.0917,
    longitude: 34.7679,
    sections: [{ id: "sec_kisumu_ga", name: "General Admission", capacity: 10000 }],
  },
  {
    id: "ven_nakuru",
    name: "Nakuru Athletic Club",
    city: "Nakuru",
    area: "Milimani",
    addressLine: "Kenyatta Avenue, Nakuru",
    capacity: 2500,
    latitude: -0.3031,
    longitude: 36.08,
    sections: [{ id: "sec_nakuru_ga", name: "Clubhouse Lawn", capacity: 2500 }],
  },
  {
    id: "ven_eldoret",
    name: "Eldoret Sports Club",
    city: "Eldoret",
    area: "Elgon View",
    addressLine: "Elgon View, Eldoret",
    capacity: 3000,
    latitude: 0.5143,
    longitude: 35.2698,
    sections: [{ id: "sec_eldoret_ga", name: "Main Lawn", capacity: 3000 }],
  },
  {
    id: "ven_westlands_office",
    name: "Delta Corner Boardroom",
    city: "Nairobi",
    area: "Westlands",
    addressLine: "Delta Corner Annex, Westlands, Nairobi",
    capacity: 60,
    latitude: -1.2673,
    longitude: 36.8073,
    sections: [],
  },
];

/* -------------------------------------------------------------------------- */
/* Organizers                                                                  */
/* -------------------------------------------------------------------------- */

const organizers: Organizer[] = [
  {
    id: "org_soundcity",
    name: "Soundcity Live",
    slug: "soundcity-live",
    type: OrganizerType.BUSINESS,
    about:
      "East Africa's busiest live music promoter. Twelve years of stadium shows, festivals and club nights across Nairobi and Mombasa.",
    logoUrl: null,
    verification: VerificationStatus.VERIFIED,
    trustTier: "TRUSTED",
    supportEmail: "tickets@soundcitylive.co.ke",
    supportPhone: "+254 700 111 222",
    members: [
      { userId: "usr_amina", role: Role.ORGANIZER_OWNER, addedAt: at(-400, 9) },
      { userId: "usr_kevin", role: Role.EVENT_MANAGER, addedAt: at(-200, 9) },
    ],
    createdAt: at(-1200, 9),
  },
  {
    id: "org_fkf",
    name: "Football Kenya Events",
    slug: "football-kenya-events",
    type: OrganizerType.SPORTS_ORGANIZATION,
    about:
      "Official match-day ticketing for national team fixtures and premier league showcases.",
    logoUrl: null,
    verification: VerificationStatus.VERIFIED,
    trustTier: "TRUSTED",
    supportEmail: "support@fkevents.co.ke",
    supportPhone: "+254 711 333 444",
    members: [{ userId: "usr_brian", role: Role.ORGANIZER_OWNER, addedAt: at(-800, 9) }],
    createdAt: at(-900, 9),
  },
  {
    id: "org_hoops",
    name: "Nairobi Hoops Association",
    slug: "nairobi-hoops",
    type: OrganizerType.ASSOCIATION,
    about: "Running the Nairobi Basketball League since 2014.",
    logoUrl: null,
    verification: VerificationStatus.VERIFIED,
    trustTier: "ESTABLISHED",
    supportEmail: "league@nairobihoops.co.ke",
    supportPhone: "+254 722 555 666",
    members: [{ userId: "usr_kevin", role: Role.ORGANIZER_OWNER, addedAt: at(-500, 9) }],
    createdAt: at(-700, 9),
  },
  {
    id: "org_wanjiku",
    name: "Wanjiku Family",
    slug: "wanjiku-family",
    type: OrganizerType.INDIVIDUAL,
    about: "Family ceremonies and celebrations.",
    logoUrl: null,
    verification: VerificationStatus.PENDING,
    trustTier: "NEW",
    supportEmail: "wanjiku.family@example.co.ke",
    supportPhone: "+254 733 777 888",
    members: [{ userId: "usr_grace", role: Role.ORGANIZER_OWNER, addedAt: at(-60, 9) }],
    createdAt: at(-60, 9),
  },
  {
    id: "org_chama",
    name: "Tujiinue Investment Chama",
    slug: "tujiinue-chama",
    type: OrganizerType.COMMUNITY_ORGANIZATION,
    about: "A 24-member investment group meeting monthly in Westlands since 2019.",
    logoUrl: null,
    verification: VerificationStatus.VERIFIED,
    trustTier: "ESTABLISHED",
    supportEmail: "tujiinue@example.co.ke",
    supportPhone: "+254 720 999 000",
    members: [{ userId: "usr_grace", role: Role.ORGANIZER_OWNER, addedAt: at(-300, 9) }],
    createdAt: at(-400, 9),
  },
  {
    id: "org_summit",
    name: "Summit Africa Conferences",
    slug: "summit-africa",
    type: OrganizerType.BUSINESS,
    about: "Business, technology and policy conferences across East Africa.",
    logoUrl: null,
    verification: VerificationStatus.VERIFIED,
    trustTier: "ESTABLISHED",
    supportEmail: "hello@summitafrica.co.ke",
    supportPhone: "+254 705 121 314",
    members: [{ userId: "usr_amina", role: Role.ORGANIZER_ADMIN, addedAt: at(-150, 9) }],
    createdAt: at(-600, 9),
  },
];

/* -------------------------------------------------------------------------- */
/* Users                                                                       */
/* -------------------------------------------------------------------------- */

const users: User[] = [
  {
    id: "usr_amina",
    email: "amina.otieno@example.co.ke",
    emailVerifiedAt: at(-400, 9),
    phone: "+254712345678",
    phoneVerifiedAt: at(-400, 9),
    fullName: "Amina Otieno",
    avatarUrl: null,
    city: "Nairobi",
    roles: [Role.CONSUMER, Role.ORGANIZER_OWNER],
    mfaEnabled: true,
    createdAt: at(-400, 9),
  },
  {
    id: "usr_kevin",
    email: "kevin.mwangi@example.co.ke",
    emailVerifiedAt: at(-300, 9),
    phone: "+254723456789",
    phoneVerifiedAt: at(-300, 9),
    fullName: "Kevin Mwangi",
    avatarUrl: null,
    city: "Nairobi",
    roles: [Role.CONSUMER, Role.EVENT_MANAGER],
    mfaEnabled: true,
    createdAt: at(-300, 9),
  },
  {
    id: "usr_brian",
    email: "brian.kiptoo@example.co.ke",
    emailVerifiedAt: at(-250, 9),
    phone: "+254734567890",
    phoneVerifiedAt: at(-250, 9),
    fullName: "Brian Kiptoo",
    avatarUrl: null,
    city: "Eldoret",
    roles: [Role.CONSUMER, Role.ORGANIZER_OWNER],
    mfaEnabled: true,
    createdAt: at(-250, 9),
  },
  {
    id: "usr_grace",
    email: "grace.wanjiku@example.co.ke",
    emailVerifiedAt: at(-120, 9),
    phone: "+254745678901",
    phoneVerifiedAt: at(-120, 9),
    fullName: "Grace Wanjiku",
    avatarUrl: null,
    city: "Kiambu",
    roles: [Role.CONSUMER, Role.ORGANIZER_OWNER],
    mfaEnabled: false,
    createdAt: at(-120, 9),
  },
  {
    id: "usr_demo",
    email: "demo@bookit.co.ke",
    emailVerifiedAt: at(-90, 9),
    phone: "+254799112233",
    phoneVerifiedAt: at(-90, 9),
    fullName: "Njeri Kamau",
    avatarUrl: null,
    city: "Nairobi",
    roles: [Role.CONSUMER],
    mfaEnabled: false,
    createdAt: at(-90, 9),
  },
];

/** The signed-in consumer used by the account area in the demo build. */
export const DEMO_USER_ID = "usr_demo";
/** The organizer whose dashboard the demo build opens. */
export const DEMO_ORGANIZER_ID = "org_soundcity";

/* -------------------------------------------------------------------------- */
/* Events                                                                      */
/* -------------------------------------------------------------------------- */

interface SeedTicketType {
  id: string;
  name: string;
  description?: string;
  priceMajor: number;
  quantity: number;
  /** Units already sold before the app starts, so availability looks realistic. */
  sold?: number;
  sectionId?: string;
  maxPerOrder?: number;
}

interface SeedEvent {
  event: Event;
  ticketTypes?: SeedTicketType[];
}

function makeEvent(input: Omit<Event, "createdAt"> & { createdAt?: string }): Event {
  return { createdAt: at(-30, 9), ...input };
}

const seedEvents: SeedEvent[] = [
  /* ---------------------------- Popular / paid ---------------------------- */
  {
    event: makeEvent({
      id: "evt_burna",
      slug: "burna-boy-live-nairobi",
      title: "Burna Boy — Live in Nairobi",
      subtitle: "African Giant Tour",
      description:
        "The African Giant returns to Nairobi for one night only at Nyayo National Stadium. A full live band, a stage built for 30,000 people, and support from three of Kenya's biggest acts. Gates open at 4:00 PM and the main set starts at 9:30 PM sharp.",
      type: EventType.PAID_TICKET,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.CONCERTS,
      tags: ["afrobeats", "live music", "stadium"],
      organizerId: "org_soundcity",
      venueId: "ven_nyayo",
      startsAt: at(SATURDAY + 7, 16),
      endsAt: at(SATURDAY + 7, 23, 30),
      heroImage: `${IMG}/hero-concert.jpg`,
      cardImage: `${IMG}/hero-concert.jpg`,
      capacity: null,
      policies: policies({
        resaleEnabled: true,
        resaleMaxMarkupBps: 1000,
        resaleOpensAt: at(-10, 9),
        resaleClosesAt: at(SATURDAY + 7, 12),
        maxTicketsPerAccount: 4,
        ageRestriction: "16+ unless accompanied by a guardian",
      }),
      agenda: [
        { startsAt: at(SATURDAY + 7, 16), title: "Gates open", description: null },
        { startsAt: at(SATURDAY + 7, 18), title: "Supporting acts", description: "Three local openers" },
        { startsAt: at(SATURDAY + 7, 21, 30), title: "Burna Boy", description: "Main set" },
      ],
      recurrence: null,
      featured: true,
    }),
    ticketTypes: [
      { id: "tt_burna_ga", name: "General Admission", priceMajor: 2500, quantity: 4000, sold: 3120, sectionId: "sec_nyayo_ga" },
      { id: "tt_burna_vip", name: "VIP Terrace", description: "Raised terrace, private bar and dedicated entrance.", priceMajor: 8500, quantity: 600, sold: 540, sectionId: "sec_nyayo_vip", maxPerOrder: 4 },
      { id: "tt_burna_vvip", name: "VVIP Pit", description: "Front-of-stage pit with hospitality.", priceMajor: 20000, quantity: 120, sold: 118, maxPerOrder: 2 },
    ],
  },
  {
    event: makeEvent({
      id: "evt_kenya_nigeria",
      slug: "kenya-vs-nigeria-afcon-qualifier",
      title: "Kenya vs Nigeria",
      subtitle: "AFCON Qualifier — Matchday 4",
      description:
        "Harambee Stars host the Super Eagles at the Moi International Sports Centre in a qualifier that decides the group. Turnstiles open three hours before kick-off; the north car park is reserved for away supporters.",
      type: EventType.PAID_TICKET,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.SPORTS,
      tags: ["football", "afcon", "harambee stars"],
      organizerId: "org_fkf",
      venueId: "ven_kasarani",
      startsAt: at(SUNDAY + 14, 16),
      endsAt: at(SUNDAY + 14, 18, 30),
      heroImage: `${IMG}/event-football.jpg`,
      cardImage: `${IMG}/event-football.jpg`,
      capacity: null,
      policies: policies({
        resaleEnabled: true,
        resaleMaxMarkupBps: 0,
        maxTicketsPerAccount: 4,
        entryRules: [
          "Valid Bookit QR code required at the turnstile",
          "No flares, bottles or umbrellas",
          "Away supporters use Gate 7 only",
        ],
      }),
      agenda: [
        { startsAt: at(SUNDAY + 14, 13), title: "Turnstiles open", description: null },
        { startsAt: at(SUNDAY + 14, 16), title: "Kick-off", description: null },
      ],
      recurrence: null,
      featured: true,
    }),
    ticketTypes: [
      { id: "tt_ken_terrace", name: "Terraces", priceMajor: 800, quantity: 12000, sold: 8400, sectionId: "sec_kas_ga" },
      { id: "tt_ken_vip", name: "VIP Stand", priceMajor: 5000, quantity: 1500, sold: 1210, sectionId: "sec_kas_vip" },
    ],
  },
  {
    event: makeEvent({
      id: "evt_hoops",
      slug: "nairobi-basketball-league-finals",
      title: "Nairobi Basketball League — Finals",
      subtitle: "Championship Game",
      description:
        "The 2026 NBL championship game at Kasarani Indoor Arena. Courtside seating is limited to 300 places and includes half-time hospitality.",
      type: EventType.PAID_TICKET,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.SPORTS,
      tags: ["basketball", "finals", "league"],
      organizerId: "org_hoops",
      venueId: "ven_kasarani_indoor",
      startsAt: at(SATURDAY, 15),
      endsAt: at(SATURDAY, 18),
      heroImage: `${IMG}/event-basketball.jpg`,
      cardImage: `${IMG}/event-basketball.jpg`,
      capacity: null,
      policies: policies({ maxTicketsPerAccount: 8 }),
      agenda: [
        { startsAt: at(SATURDAY, 15), title: "Third-place game", description: null },
        { startsAt: at(SATURDAY, 16, 30), title: "Championship game", description: null },
      ],
      recurrence: null,
      featured: true,
    }),
    ticketTypes: [
      { id: "tt_hoops_stand", name: "Upper Stand", priceMajor: 1200, quantity: 2500, sold: 1600, sectionId: "sec_ind_stand" },
      { id: "tt_hoops_court", name: "Courtside", description: "Front row with half-time hospitality.", priceMajor: 4500, quantity: 300, sold: 288, sectionId: "sec_ind_court", maxPerOrder: 4 },
    ],
  },
  {
    event: makeEvent({
      id: "evt_sauti_sol",
      slug: "sauti-sol-live-kicc",
      title: "Sauti Sol Live",
      subtitle: "Homecoming Show",
      description:
        "Sauti Sol play the KICC Grounds with a 14-piece band. An open-air show in the middle of the city, with food stalls from twelve Nairobi vendors.",
      type: EventType.PAID_TICKET,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.CONCERTS,
      tags: ["afro pop", "live music"],
      organizerId: "org_soundcity",
      venueId: "ven_kicc",
      startsAt: at(FRIDAY, 18),
      endsAt: at(FRIDAY, 23),
      heroImage: `${IMG}/hero-concert.jpg`,
      cardImage: `${IMG}/hero-concert.jpg`,
      capacity: null,
      policies: policies({ resaleEnabled: true, resaleMaxMarkupBps: 500 }),
      agenda: [
        { startsAt: at(FRIDAY, 18), title: "Gates open", description: null },
        { startsAt: at(FRIDAY, 20, 30), title: "Sauti Sol", description: null },
      ],
      recurrence: null,
      featured: true,
    }),
    ticketTypes: [
      { id: "tt_sauti_ga", name: "General Admission", priceMajor: 1200, quantity: 5000, sold: 3900, sectionId: "sec_kicc_ga" },
      { id: "tt_sauti_vip", name: "VIP", priceMajor: 4000, quantity: 800, sold: 610 },
    ],
  },
  {
    event: makeEvent({
      id: "evt_blankets",
      slug: "blankets-and-wine-uhuru-gardens",
      title: "Blankets & Wine",
      subtitle: "Edition 78",
      description:
        "Nairobi's long-running Sunday afternoon picnic concert returns to Uhuru Gardens. Bring a blanket. Food and drink from 30 vendors on site; no outside alcohol.",
      type: EventType.PAID_TICKET,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.CONCERTS,
      tags: ["picnic", "festival", "sunday"],
      organizerId: "org_soundcity",
      venueId: "ven_uhuru",
      startsAt: at(SUNDAY, 12),
      endsAt: at(SUNDAY, 20),
      heroImage: `${IMG}/hero-concert.jpg`,
      cardImage: `${IMG}/hero-concert.jpg`,
      capacity: null,
      policies: policies({ resaleEnabled: true, resaleMaxMarkupBps: 1500 }),
      agenda: [
        { startsAt: at(SUNDAY, 12), title: "Gates open", description: null },
        { startsAt: at(SUNDAY, 14), title: "Opening set", description: null },
        { startsAt: at(SUNDAY, 18), title: "Headline set", description: null },
      ],
      recurrence: null,
      featured: true,
    }),
    ticketTypes: [
      { id: "tt_bw_ga", name: "Picnic Lawn", priceMajor: 1000, quantity: 6000, sold: 4200, sectionId: "sec_uhuru_ga" },
      { id: "tt_bw_vip", name: "VIP Lounge", priceMajor: 6500, quantity: 500, sold: 470, sectionId: "sec_uhuru_vip" },
    ],
  },
  {
    event: makeEvent({
      id: "evt_comedy",
      slug: "churchill-show-live-sarit",
      title: "Churchill Show Live",
      subtitle: "Stand-up Special",
      description:
        "A two-hour stand-up special with eight comedians and a live band, recorded for broadcast.",
      type: EventType.PAID_TICKET,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.COMEDY,
      tags: ["comedy", "stand-up"],
      organizerId: "org_soundcity",
      venueId: "ven_sarit",
      startsAt: at(SATURDAY, 19),
      endsAt: at(SATURDAY, 22),
      heroImage: `${IMG}/event-conference.jpg`,
      cardImage: `${IMG}/event-conference.jpg`,
      capacity: null,
      policies: policies({ ageRestriction: "18+" }),
      agenda: [],
      recurrence: null,
      featured: false,
    }),
    ticketTypes: [
      { id: "tt_comedy_ga", name: "General Admission", priceMajor: 1500, quantity: 2000, sold: 1100, sectionId: "sec_sarit_hall" },
    ],
  },
  {
    event: makeEvent({
      id: "evt_coast_festival",
      slug: "nyali-beach-festival",
      title: "Nyali Beach Festival",
      subtitle: "Two days on the coast",
      description:
        "Coastal music, food and craft festival on Nyali Beach with taarab, bongo and benga stages.",
      type: EventType.PAID_TICKET,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.CONCERTS,
      tags: ["festival", "coast", "mombasa"],
      organizerId: "org_soundcity",
      venueId: "ven_mombasa_beach",
      startsAt: at(21, 14),
      endsAt: at(22, 23),
      heroImage: `${IMG}/hero-concert.jpg`,
      cardImage: `${IMG}/hero-concert.jpg`,
      capacity: null,
      policies: policies(),
      agenda: [],
      recurrence: null,
      featured: false,
    }),
    ticketTypes: [
      { id: "tt_nyali_day", name: "Day Pass", priceMajor: 2000, quantity: 2500, sold: 900 },
      { id: "tt_nyali_weekend", name: "Weekend Pass", priceMajor: 3500, quantity: 1500, sold: 620 },
    ],
  },
  {
    event: makeEvent({
      id: "evt_kisumu_derby",
      slug: "kisumu-lakeside-derby",
      title: "Kisumu Lakeside Derby",
      subtitle: "Premier League",
      description: "The lakeside derby at Jomo Kenyatta Sports Ground.",
      type: EventType.PAID_TICKET,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.SPORTS,
      tags: ["football", "kisumu"],
      organizerId: "org_fkf",
      venueId: "ven_kisumu",
      startsAt: at(SUNDAY + 7, 15),
      endsAt: at(SUNDAY + 7, 17),
      heroImage: `${IMG}/event-football.jpg`,
      cardImage: `${IMG}/event-football.jpg`,
      capacity: null,
      policies: policies(),
      agenda: [],
      recurrence: null,
      featured: false,
    }),
    ticketTypes: [
      { id: "tt_kisumu_ga", name: "General Admission", priceMajor: 500, quantity: 6000, sold: 2100, sectionId: "sec_kisumu_ga" },
    ],
  },

  /* -------------------------------- Free RSVP ----------------------------- */
  {
    event: makeEvent({
      id: "evt_tech_meetup",
      slug: "nairobi-tech-meetup",
      title: "Nairobi Tech Meetup",
      subtitle: "August edition",
      description:
        "A free monthly meetup for engineers, designers and founders. Three lightning talks, then open networking. Free entry, RSVP required because the room holds 250.",
      type: EventType.FREE_RSVP,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.CONFERENCES,
      tags: ["tech", "networking", "free"],
      organizerId: "org_summit",
      venueId: "ven_sarit",
      startsAt: at(FRIDAY, 17, 30),
      endsAt: at(FRIDAY, 20, 30),
      heroImage: `${IMG}/event-conference.jpg`,
      cardImage: `${IMG}/event-conference.jpg`,
      capacity: 250,
      policies: policies({ transferAllowed: false, refundPolicy: "Free event — cancel your RSVP any time." }),
      agenda: [
        { startsAt: at(FRIDAY, 17, 30), title: "Doors and refreshments", description: null },
        { startsAt: at(FRIDAY, 18), title: "Lightning talks", description: "Three 15-minute talks" },
        { startsAt: at(FRIDAY, 19, 15), title: "Open networking", description: null },
      ],
      recurrence: null,
      featured: false,
    }),
  },
  {
    event: makeEvent({
      id: "evt_career_fair",
      slug: "graduate-career-fair-nairobi",
      title: "Graduate Career Fair",
      subtitle: "40 employers, one afternoon",
      description:
        "A free career fair for recent graduates with 40 employers, CV clinics and interview practice rooms.",
      type: EventType.FREE_RSVP,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.COMMUNITY,
      tags: ["careers", "free", "graduates"],
      organizerId: "org_summit",
      venueId: "ven_kicc",
      startsAt: at(12, 9),
      endsAt: at(12, 16),
      heroImage: `${IMG}/event-conference.jpg`,
      cardImage: `${IMG}/event-conference.jpg`,
      capacity: 1200,
      policies: policies({ transferAllowed: false }),
      agenda: [],
      recurrence: null,
      featured: false,
    }),
  },
  {
    event: makeEvent({
      id: "evt_cleanup",
      slug: "nairobi-river-cleanup",
      title: "Nairobi River Cleanup",
      subtitle: "Community volunteering",
      description:
        "Join 300 volunteers for a Saturday morning cleanup along the Nairobi River. Gloves, bags and breakfast provided.",
      type: EventType.FREE_RSVP,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.COMMUNITY,
      tags: ["volunteering", "free", "community"],
      organizerId: "org_summit",
      venueId: "ven_uhuru",
      startsAt: at(SATURDAY, 7),
      endsAt: at(SATURDAY, 12),
      heroImage: `${IMG}/city-nairobi.jpg`,
      cardImage: `${IMG}/city-nairobi.jpg`,
      capacity: 300,
      policies: policies({ transferAllowed: false }),
      agenda: [],
      recurrence: null,
      featured: false,
    }),
  },

  /* --------------------------- Conference (paid) -------------------------- */
  {
    event: makeEvent({
      id: "evt_summit",
      slug: "east-africa-fintech-summit",
      title: "East Africa Fintech Summit",
      subtitle: "Two days, four tracks",
      description:
        "The region's fintech conference: payments, lending, regulation and infrastructure. Two days, four tracks, 60 speakers and a closing dinner at Safari Park.",
      type: EventType.HYBRID,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.CONFERENCES,
      tags: ["fintech", "conference", "business"],
      organizerId: "org_summit",
      venueId: "ven_kicc",
      startsAt: at(30, 8, 30),
      endsAt: at(31, 18),
      heroImage: `${IMG}/event-conference.jpg`,
      cardImage: `${IMG}/event-conference.jpg`,
      capacity: 1400,
      policies: policies({
        refundPolicy: "Refundable up to 14 days before the summit. Name changes are free.",
        maxTicketsPerAccount: 10,
      }),
      agenda: [
        { startsAt: at(30, 8, 30), title: "Registration", description: null },
        { startsAt: at(30, 9, 30), title: "Opening keynote", description: null },
        { startsAt: at(30, 11), title: "Track sessions", description: "Payments, lending, regulation, infrastructure" },
        { startsAt: at(31, 17), title: "Closing dinner", description: "Safari Park Hotel — invited guests" },
      ],
      recurrence: null,
      featured: false,
    }),
    ticketTypes: [
      { id: "tt_summit_std", name: "Standard Pass", priceMajor: 12000, quantity: 900, sold: 410, maxPerOrder: 10 },
      { id: "tt_summit_exec", name: "Executive Pass", description: "Includes the closing dinner and speaker lounge.", priceMajor: 35000, quantity: 200, sold: 96, maxPerOrder: 5 },
    ],
  },

  /* ------------------------ Private & social events ----------------------- */
  {
    event: makeEvent({
      id: "evt_ruracio",
      slug: "wanjiku-ruracio-ceremony",
      title: "Ruracio Ceremony",
      subtitle: "Wanjiku & Otieno families",
      description:
        "Traditional Kikuyu dowry ceremony at the Wanjiku family homestead in Githunguri. Invitation only. Please confirm your seat and the number of guests you are bringing so we can plan seating and catering.",
      type: EventType.PRIVATE_INVITATION,
      status: EventStatus.SCHEDULED,
      visibility: EventVisibility.INVITE_CODE_REQUIRED,
      category: EventCategory.WEDDINGS,
      tags: ["ruracio", "ceremony", "family"],
      organizerId: "org_wanjiku",
      venueId: "ven_kiambu_home",
      startsAt: at(SATURDAY + 14, 11),
      endsAt: at(SATURDAY + 14, 18),
      heroImage: `${IMG}/event-wedding.jpg`,
      cardImage: `${IMG}/event-wedding.jpg`,
      capacity: 200,
      policies: policies({
        transferAllowed: false,
        refundPolicy: "Private ceremony — please tell the family if your plans change.",
        entryRules: ["Invitation code required", "Arrive before 11:00 AM for the welcome"],
      }),
      agenda: [
        { startsAt: at(SATURDAY + 14, 11), title: "Arrival and welcome", description: null },
        { startsAt: at(SATURDAY + 14, 13), title: "Ceremony", description: null },
        { startsAt: at(SATURDAY + 14, 15), title: "Lunch", description: null },
      ],
      recurrence: null,
      featured: false,
    }),
  },
  {
    event: makeEvent({
      id: "evt_chama",
      slug: "tujiinue-chama-monthly-meeting",
      title: "Tujiinue Chama Meeting",
      subtitle: "Monthly members' meeting",
      description:
        "Monthly meeting of the Tujiinue Investment Chama. Agenda: contributions review, the Kitengela plot update, and the vote on the money-market allocation. Members only.",
      type: EventType.RECURRING_MEETING,
      status: EventStatus.SCHEDULED,
      visibility: EventVisibility.PRIVATE,
      category: EventCategory.MEETINGS,
      tags: ["chama", "meeting", "members"],
      organizerId: "org_chama",
      venueId: "ven_westlands_office",
      startsAt: at(SATURDAY, 10),
      endsAt: at(SATURDAY, 13),
      heroImage: `${IMG}/event-conference.jpg`,
      cardImage: `${IMG}/event-conference.jpg`,
      capacity: 30,
      policies: policies({
        transferAllowed: false,
        refundPolicy: "Members meeting — contributions are governed by the chama constitution.",
        entryRules: ["Members and registered guests only"],
      }),
      agenda: [
        { startsAt: at(SATURDAY, 10), title: "Roll call and minutes", description: null },
        { startsAt: at(SATURDAY, 10, 30), title: "Contributions review", description: null },
        { startsAt: at(SATURDAY, 11, 30), title: "Kitengela plot update", description: null },
        { startsAt: at(SATURDAY, 12, 15), title: "Vote: money-market allocation", description: null },
      ],
      recurrence: {
        rrule: "FREQ=MONTHLY;BYDAY=1SA",
        humanLabel: "First Saturday of every month",
        until: null,
      },
      featured: false,
    }),
  },
  {
    event: makeEvent({
      id: "evt_wedding",
      slug: "achieng-and-mutua-wedding-reception",
      title: "Wedding Reception",
      subtitle: "Achieng & Mutua",
      description:
        "Seated reception for 220 guests at Safari Park Hotel's Jambo Ballroom. Please confirm your table and meal choice.",
      type: EventType.BANQUET,
      status: EventStatus.SCHEDULED,
      visibility: EventVisibility.INVITE_LINK_REQUIRED,
      category: EventCategory.WEDDINGS,
      tags: ["wedding", "reception", "banquet"],
      organizerId: "org_wanjiku",
      venueId: "ven_safari_park",
      startsAt: at(SATURDAY + 21, 17),
      endsAt: at(SATURDAY + 21, 23),
      heroImage: `${IMG}/hero-banquet.jpg`,
      cardImage: `${IMG}/hero-banquet.jpg`,
      capacity: 220,
      policies: policies({
        transferAllowed: false,
        refundPolicy: "Private reception — RSVP changes accepted up to 5 days before.",
        entryRules: ["Invitation link required", "Black tie"],
      }),
      agenda: [
        { startsAt: at(SATURDAY + 21, 17), title: "Cocktails", description: null },
        { startsAt: at(SATURDAY + 21, 18, 30), title: "Seated dinner", description: null },
        { startsAt: at(SATURDAY + 21, 21), title: "Dancing", description: null },
      ],
      recurrence: null,
      featured: false,
    }),
  },
  {
    event: makeEvent({
      id: "evt_family",
      slug: "kamau-family-gathering",
      title: "Family Gathering",
      subtitle: "Kamau family end-of-year lunch",
      description:
        "Annual family lunch. Reserve a place for yourself and your household so we know the numbers.",
      type: EventType.BOOKING,
      status: EventStatus.SCHEDULED,
      visibility: EventVisibility.UNLISTED,
      category: EventCategory.COMMUNITY,
      tags: ["family", "lunch"],
      organizerId: "org_wanjiku",
      venueId: "ven_kiambu_home",
      startsAt: at(SUNDAY + 21, 12),
      endsAt: at(SUNDAY + 21, 18),
      heroImage: `${IMG}/event-dinner.jpg`,
      cardImage: `${IMG}/event-dinner.jpg`,
      capacity: 120,
      policies: policies({ transferAllowed: false }),
      agenda: [],
      recurrence: null,
      featured: false,
    }),
  },
  {
    event: makeEvent({
      id: "evt_corporate_dinner",
      slug: "safaricom-partners-corporate-dinner",
      title: "Corporate Dinner",
      subtitle: "Annual partners' dinner",
      description:
        "Seated dinner for partners and senior staff at Safari Park Hotel. Table assignments are managed by the events team.",
      type: EventType.BANQUET,
      status: EventStatus.SCHEDULED,
      visibility: EventVisibility.PRIVATE,
      category: EventCategory.MEETINGS,
      tags: ["corporate", "dinner", "banquet"],
      organizerId: "org_summit",
      venueId: "ven_safari_park",
      startsAt: at(18, 18, 30),
      endsAt: at(18, 23),
      heroImage: `${IMG}/event-dinner.jpg`,
      cardImage: `${IMG}/event-dinner.jpg`,
      capacity: 300,
      policies: policies({ transferAllowed: false }),
      agenda: [],
      recurrence: null,
      featured: false,
    }),
  },
  {
    event: makeEvent({
      id: "evt_alumni",
      slug: "university-alumni-gathering",
      title: "Alumni Gathering",
      subtitle: "Class of 2016 — ten years on",
      description:
        "Ten-year reunion for the class of 2016. Reserve your place and tell us how many guests you are bringing.",
      type: EventType.BOOKING,
      status: EventStatus.SCHEDULED,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.COMMUNITY,
      tags: ["alumni", "reunion"],
      organizerId: "org_summit",
      venueId: "ven_nakuru",
      startsAt: at(SATURDAY + 28, 14),
      endsAt: at(SATURDAY + 28, 22),
      heroImage: `${IMG}/event-conference.jpg`,
      cardImage: `${IMG}/event-conference.jpg`,
      capacity: 400,
      policies: policies({ transferAllowed: false }),
      agenda: [],
      recurrence: null,
      featured: false,
    }),
  },
  {
    event: makeEvent({
      id: "evt_boardroom",
      slug: "delta-corner-boardroom-booking",
      title: "Delta Corner Boardroom",
      subtitle: "Bookable meeting space, Westlands",
      description:
        "A 40-seat boardroom in Westlands available by the half-day. Includes screen, whiteboard, video conferencing and tea service.",
      type: EventType.BOOKING,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.MEETINGS,
      tags: ["meeting room", "booking", "westlands"],
      organizerId: "org_summit",
      venueId: "ven_westlands_office",
      startsAt: at(3, 8),
      endsAt: at(3, 18),
      heroImage: `${IMG}/event-conference.jpg`,
      cardImage: `${IMG}/event-conference.jpg`,
      capacity: 40,
      policies: policies({ transferAllowed: false }),
      agenda: [],
      recurrence: null,
      featured: false,
    }),
  },
  {
    event: makeEvent({
      id: "evt_eldoret_marathon",
      slug: "eldoret-half-marathon",
      title: "Eldoret Half Marathon",
      subtitle: "21km and 10km races",
      description: "Road races through Elgon View with chip timing and a finishers' medal.",
      type: EventType.PAID_TICKET,
      status: EventStatus.ON_SALE,
      visibility: EventVisibility.PUBLIC,
      category: EventCategory.SPORTS,
      tags: ["running", "marathon", "eldoret"],
      organizerId: "org_fkf",
      venueId: "ven_eldoret",
      startsAt: at(24, 6, 30),
      endsAt: at(24, 12),
      heroImage: `${IMG}/event-football.jpg`,
      cardImage: `${IMG}/event-football.jpg`,
      capacity: null,
      policies: policies({ transferAllowed: true }),
      agenda: [],
      recurrence: null,
      featured: false,
    }),
    ticketTypes: [
      { id: "tt_eldoret_21", name: "21km Entry", priceMajor: 2500, quantity: 1500, sold: 640 },
      { id: "tt_eldoret_10", name: "10km Entry", priceMajor: 1500, quantity: 2000, sold: 810 },
    ],
  },
];

/* -------------------------------------------------------------------------- */
/* Seeding                                                                     */
/* -------------------------------------------------------------------------- */

function buildInventory(
  eventId: string,
  ticketType: SeedTicketType,
): { ticketType: TicketType; units: InventoryUnit[] } {
  const type: TicketType = {
    id: ticketType.id,
    eventId,
    name: ticketType.name,
    description: ticketType.description ?? null,
    price: kes(ticketType.priceMajor),
    quantity: ticketType.quantity,
    minPerOrder: 1,
    maxPerOrder: ticketType.maxPerOrder ?? 6,
    salesStartAt: at(-60, 9),
    salesEndAt: at(365, 23),
    sectionId: ticketType.sectionId ?? null,
    sortOrder: 0,
  };

  // Seeding one inventory row per unit for a 12,000-seat stadium is wasteful in
  // a demo. The seed materialises a bounded window of units and treats the rest
  // as already sold, which keeps availability numbers honest without the rows.
  const MAX_MATERIALISED = 400;
  const sold = ticketType.sold ?? 0;
  const remaining = Math.max(0, ticketType.quantity - sold);
  const materialised = Math.min(remaining, MAX_MATERIALISED);

  const units: InventoryUnit[] = Array.from({ length: materialised }, (_, index) => ({
    id: `inv_${ticketType.id}_${index}`,
    ticketTypeId: ticketType.id,
    eventId,
    state: InventoryState.AVAILABLE,
    holdId: null,
    ticketId: null,
    seatLabel: null,
  }));

  return { ticketType: type, units };
}

export function seedDatabase(db: MemoryDb): void {
  for (const venue of venues) db.venues.set(venue.id, venue);
  for (const organizer of organizers) db.organizers.set(organizer.id, organizer);
  for (const user of users) db.users.set(user.id, user);

  for (const { event, ticketTypes } of seedEvents) {
    db.events.set(event.id, event);
    ticketTypes?.forEach((seedType, index) => {
      const { ticketType, units } = buildInventory(event.id, seedType);
      db.ticketTypes.set(ticketType.id, { ...ticketType, sortOrder: index });
      for (const unit of units) db.inventory.set(unit.id, unit);
    });
  }

  seedRecurringOccurrences(db);
  seedBanquetTables(db);
  seedBookingsAndGuests(db);
  seedInvites(db);
  seedConsumerHistory(db);
  seedContributions(db);
}

function seedRecurringOccurrences(db: MemoryDb): void {
  const occurrences: EventOccurrence[] = [-3, -2, -1, 0, 1, 2].map((offset) => ({
    id: `occ_chama_${offset + 3}`,
    eventId: "evt_chama",
    startsAt: at(SATURDAY + offset * 28, 10),
    endsAt: at(SATURDAY + offset * 28, 13),
    notes:
      offset < 0
        ? "Minutes approved. Contributions reconciled."
        : offset === 0
          ? "Agenda circulated to members."
          : null,
    cancelled: false,
  }));
  for (const occurrence of occurrences) db.occurrences.set(occurrence.id, occurrence);
}

function seedBanquetTables(db: MemoryDb): void {
  const tables: BanquetTable[] = [
    ...Array.from({ length: 22 }, (_, index) => ({
      id: `tbl_wed_${index + 1}`,
      eventId: "evt_wedding",
      name: `Table ${index + 1}`,
      seats: 10,
      assignedBookingIds: [] as string[],
    })),
    ...Array.from({ length: 6 }, (_, index) => ({
      id: `tbl_ruracio_${index + 1}`,
      eventId: "evt_ruracio",
      name: `Table ${index + 1}`,
      seats: 12,
      assignedBookingIds: [] as string[],
    })),
  ];
  for (const table of tables) db.tables.set(table.id, table);
}

const KENYAN_NAMES = [
  "Wanjiru Kariuki", "Otieno Ochieng", "Fatuma Hassan", "Peter Kimani", "Nyambura Njoroge",
  "Salim Abdalla", "Cynthia Chebet", "Dennis Mutua", "Aisha Mohamed", "Joseph Barasa",
  "Mercy Akinyi", "Elias Kiprop", "Lydia Nduta", "Samuel Onyango", "Hawa Juma",
  "George Waweru", "Purity Wambui", "Collins Otieno", "Zainab Ali", "Victor Kiplagat",
  "Esther Muthoni", "Ibrahim Noor", "Caroline Adhiambo", "Titus Mwenda", "Rehema Said",
  "Anne Chepkoech", "Douglas Maina", "Neema Wafula", "Patrick Njuguna", "Sharon Auma",
];

const MEALS = ["Chicken", "Beef", "Fish", "Vegetarian"];

function seedBookingsAndGuests(db: MemoryDb): void {
  const bookings: Booking[] = [];

  // Ruracio ceremony — invitation-driven guest list.
  KENYAN_NAMES.slice(0, 18).forEach((name, index) => {
    const status =
      index % 7 === 0
        ? BookingStatus.PENDING
        : index % 11 === 0
          ? BookingStatus.DECLINED
          : index % 13 === 0
            ? BookingStatus.WAITLISTED
            : BookingStatus.CONFIRMED;
    const guestCount = 1 + (index % 4);
    bookings.push({
      id: `bkg_ruracio_${index}`,
      reference: `BK-RUR${String(1000 + index)}`,
      eventId: "evt_ruracio",
      occurrenceId: null,
      primaryGuestUserId: null,
      primaryGuestName: name,
      phone: `+2547${String(10000000 + index * 137).slice(0, 8)}`,
      email: `${name.split(" ")[0]!.toLowerCase()}${index}@example.co.ke`,
      status,
      guestCount,
      guests: buildGuests(`bkg_ruracio_${index}`, name, guestCount),
      tableId: status === BookingStatus.CONFIRMED ? `tbl_ruracio_${(index % 6) + 1}` : null,
      mealChoice: MEALS[index % MEALS.length]!,
      contributionPledged: index % 3 === 0 ? kes(5000) : null,
      contributionPaid: index % 3 === 0 ? kes(index % 6 === 0 ? 5000 : 2000) : null,
      paymentStatus: null,
      invitedBy: "usr_grace",
      notes: index % 9 === 0 ? "Travelling from Nakuru — arriving late." : null,
      checkedInAt: null,
      createdAt: at(-20 + index, 10),
      updatedAt: at(-5 + (index % 5), 10),
    });
  });

  // Wedding reception — banquet with tables and meal choices.
  KENYAN_NAMES.slice(6, 26).forEach((name, index) => {
    const guestCount = 1 + (index % 3);
    bookings.push({
      id: `bkg_wed_${index}`,
      reference: `BK-WED${String(2000 + index)}`,
      eventId: "evt_wedding",
      occurrenceId: null,
      primaryGuestUserId: index === 0 ? DEMO_USER_ID : null,
      primaryGuestName: index === 0 ? "Njeri Kamau" : name,
      phone: `+2547${String(20000000 + index * 211).slice(0, 8)}`,
      email:
        index === 0
          ? "demo@bookit.co.ke"
          : `${name.split(" ")[0]!.toLowerCase()}.w${index}@example.co.ke`,
      status: index % 8 === 0 ? BookingStatus.PENDING : BookingStatus.CONFIRMED,
      guestCount,
      guests: buildGuests(`bkg_wed_${index}`, name, guestCount),
      tableId: `tbl_wed_${(index % 22) + 1}`,
      mealChoice: MEALS[index % MEALS.length]!,
      contributionPledged: null,
      contributionPaid: null,
      paymentStatus: null,
      invitedBy: "usr_grace",
      notes: index % 6 === 0 ? "Vegetarian at seat 3." : null,
      checkedInAt: null,
      createdAt: at(-30 + index, 11),
      updatedAt: at(-4, 11),
    });
  });

  // Free RSVP meetup — capacity-limited with a waitlist.
  KENYAN_NAMES.slice(0, 24).forEach((name, index) => {
    bookings.push({
      id: `bkg_meetup_${index}`,
      reference: `BK-MTP${String(3000 + index)}`,
      eventId: "evt_tech_meetup",
      occurrenceId: null,
      primaryGuestUserId: index === 1 ? DEMO_USER_ID : null,
      primaryGuestName: index === 1 ? "Njeri Kamau" : name,
      phone: null,
      email:
        index === 1
          ? "demo@bookit.co.ke"
          : `${name.split(" ")[0]!.toLowerCase()}.t${index}@example.co.ke`,
      status: index > 20 ? BookingStatus.WAITLISTED : BookingStatus.CONFIRMED,
      guestCount: 1,
      guests: [],
      tableId: null,
      mealChoice: null,
      contributionPledged: null,
      contributionPaid: null,
      paymentStatus: null,
      invitedBy: null,
      notes: null,
      checkedInAt: null,
      createdAt: at(-10 + index * 0.2, 12),
      updatedAt: at(-2, 12),
    });
  });

  // Chama meeting — per-occurrence attendance for the upcoming meeting.
  KENYAN_NAMES.slice(0, 22).forEach((name, index) => {
    bookings.push({
      id: `bkg_chama_${index}`,
      reference: `BK-CHM${String(4000 + index)}`,
      eventId: "evt_chama",
      occurrenceId: "occ_chama_3",
      primaryGuestUserId: null,
      primaryGuestName: name,
      phone: `+2547${String(30000000 + index * 173).slice(0, 8)}`,
      email: `${name.split(" ")[0]!.toLowerCase()}.c${index}@example.co.ke`,
      status:
        index % 9 === 0
          ? BookingStatus.PENDING
          : index % 10 === 0
            ? BookingStatus.DECLINED
            : BookingStatus.CONFIRMED,
      guestCount: 1,
      guests: [],
      tableId: null,
      mealChoice: null,
      contributionPledged: kes(5000),
      contributionPaid: kes(index % 4 === 0 ? 2500 : 5000),
      paymentStatus: index % 4 === 0 ? PaymentStatus.PENDING : PaymentStatus.CAPTURED,
      invitedBy: null,
      notes: null,
      checkedInAt: null,
      createdAt: at(-25 + index * 0.3, 9),
      updatedAt: at(-1, 9),
    });
  });

  // Alumni gathering and boardroom booking for the demo user's bookings page.
  bookings.push({
    id: "bkg_alumni_demo",
    reference: "BK-ALM5001",
    eventId: "evt_alumni",
    occurrenceId: null,
    primaryGuestUserId: DEMO_USER_ID,
    primaryGuestName: "Njeri Kamau",
    phone: "+254799112233",
    email: "demo@bookit.co.ke",
    status: BookingStatus.CONFIRMED,
    guestCount: 2,
    guests: [
      {
        id: "gst_alumni_1",
        name: "Njeri Kamau",
        phone: "+254799112233",
        email: "demo@bookit.co.ke",
        mealChoice: "Chicken",
        checkedInAt: null,
      },
      {
        id: "gst_alumni_2",
        name: "Tom Kamau",
        phone: null,
        email: null,
        mealChoice: "Beef",
        checkedInAt: null,
      },
    ],
    tableId: null,
    mealChoice: "Chicken",
    contributionPledged: null,
    contributionPaid: null,
    paymentStatus: null,
    invitedBy: null,
    notes: null,
    checkedInAt: null,
    createdAt: at(-8, 15),
    updatedAt: at(-8, 15),
  });

  bookings.push({
    id: "bkg_boardroom_demo",
    reference: "BK-BRD5002",
    eventId: "evt_boardroom",
    occurrenceId: null,
    primaryGuestUserId: DEMO_USER_ID,
    primaryGuestName: "Njeri Kamau",
    phone: "+254799112233",
    email: "demo@bookit.co.ke",
    status: BookingStatus.PENDING,
    guestCount: 12,
    guests: [],
    tableId: null,
    mealChoice: null,
    contributionPledged: null,
    contributionPaid: null,
    paymentStatus: null,
    invitedBy: null,
    notes: "Quarterly planning session — needs the projector and tea at 10:30.",
    checkedInAt: null,
    createdAt: at(-2, 9),
    updatedAt: at(-2, 9),
  });

  // A past booking and a cancelled one so the account tabs are not empty.
  bookings.push({
    id: "bkg_past_demo",
    reference: "BK-PST4900",
    eventId: "evt_family",
    occurrenceId: null,
    primaryGuestUserId: DEMO_USER_ID,
    primaryGuestName: "Njeri Kamau",
    phone: "+254799112233",
    email: "demo@bookit.co.ke",
    status: BookingStatus.CHECKED_IN,
    guestCount: 3,
    guests: [],
    tableId: null,
    mealChoice: null,
    contributionPledged: null,
    contributionPaid: null,
    paymentStatus: null,
    invitedBy: null,
    notes: null,
    checkedInAt: at(-40, 13),
    createdAt: at(-70, 13),
    updatedAt: at(-40, 13),
  });

  bookings.push({
    id: "bkg_cancelled_demo",
    reference: "BK-CNL4800",
    eventId: "evt_career_fair",
    occurrenceId: null,
    primaryGuestUserId: DEMO_USER_ID,
    primaryGuestName: "Njeri Kamau",
    phone: "+254799112233",
    email: "demo@bookit.co.ke",
    status: BookingStatus.CANCELLED,
    guestCount: 1,
    guests: [],
    tableId: null,
    mealChoice: null,
    contributionPledged: null,
    contributionPaid: null,
    paymentStatus: null,
    invitedBy: null,
    notes: null,
    checkedInAt: null,
    createdAt: at(-15, 10),
    updatedAt: at(-12, 10),
  });

  for (const booking of bookings) db.bookings.set(booking.id, booking);

  // Reflect table assignments back onto the tables.
  for (const booking of bookings) {
    if (!booking.tableId) continue;
    const table = db.tables.get(booking.tableId);
    if (!table) continue;
    db.tables.set(table.id, {
      ...table,
      assignedBookingIds: [...table.assignedBookingIds, booking.id],
    });
  }
}

function buildGuests(bookingId: string, primaryName: string, count: number): BookingGuest[] {
  if (count <= 1) return [];
  return Array.from({ length: count }, (_, index) => ({
    id: `${bookingId}_g${index}`,
    name: index === 0 ? primaryName : `Guest ${index + 1} of ${primaryName.split(" ")[0]}`,
    phone: null,
    email: null,
    mealChoice: MEALS[index % MEALS.length]!,
    checkedInAt: null,
  }));
}

function seedInvites(db: MemoryDb): void {
  const invites: PrivateInvite[] = KENYAN_NAMES.slice(0, 12).map((name, index) => ({
    id: `inv_ruracio_${index}`,
    eventId: "evt_ruracio",
    // Seeded hashes stand in for real ones; raw tokens are never persisted.
    tokenHash: `seedhash_ruracio_${index}`,
    inviteeName: name,
    phone: `+2547${String(10000000 + index * 137).slice(0, 8)}`,
    email: `${name.split(" ")[0]!.toLowerCase()}${index}@example.co.ke`,
    maxGuests: 2 + (index % 3),
    expiresAt: at(SATURDAY + 14, 9),
    status: index < 8 ? "ACCEPTED" : "ISSUED",
    bookingId: index < 8 ? `bkg_ruracio_${index}` : null,
    createdAt: at(-25 + index, 9),
  }));
  for (const invite of invites) db.invites.set(invite.id, invite);
}

/** Orders, tickets and a resale listing so the account area has real content. */
function seedConsumerHistory(db: MemoryDb): void {
  const orders: Order[] = [
    {
      id: "ord_demo_sauti",
      reference: "BK-ORD7001",
      userId: DEMO_USER_ID,
      buyerEmail: "demo@bookit.co.ke",
      buyerPhone: "+254799112233",
      eventId: "evt_sauti_sol",
      items: [
        {
          id: "oi_1",
          ticketTypeId: "tt_sauti_ga",
          quantity: 2,
          unitPrice: kes(1200),
          lineTotal: kes(2400),
        },
      ],
      subtotal: kes(2400),
      fees: kes(144),
      total: kes(2544),
      status: OrderStatus.FULFILLED,
      holdId: null,
      idempotencyKey: null,
      createdAt: at(-14, 20),
      paidAt: at(-14, 20),
    },
    {
      id: "ord_demo_burna",
      reference: "BK-ORD7002",
      userId: DEMO_USER_ID,
      buyerEmail: "demo@bookit.co.ke",
      buyerPhone: "+254799112233",
      eventId: "evt_burna",
      items: [
        {
          id: "oi_2",
          ticketTypeId: "tt_burna_vip",
          quantity: 2,
          unitPrice: kes(8500),
          lineTotal: kes(17000),
        },
      ],
      subtotal: kes(17000),
      fees: kes(1020),
      total: kes(18020),
      status: OrderStatus.FULFILLED,
      holdId: null,
      idempotencyKey: null,
      createdAt: at(-9, 11),
      paidAt: at(-9, 11),
    },
    {
      id: "ord_demo_past",
      reference: "BK-ORD6800",
      userId: DEMO_USER_ID,
      buyerEmail: "demo@bookit.co.ke",
      buyerPhone: "+254799112233",
      eventId: "evt_comedy",
      items: [
        {
          id: "oi_3",
          ticketTypeId: "tt_comedy_ga",
          quantity: 1,
          unitPrice: kes(1500),
          lineTotal: kes(1500),
        },
      ],
      subtotal: kes(1500),
      fees: kes(90),
      total: kes(1590),
      status: OrderStatus.FULFILLED,
      holdId: null,
      idempotencyKey: null,
      createdAt: at(-60, 19),
      paidAt: at(-60, 19),
    },
  ];
  for (const order of orders) db.orders.set(order.id, order);

  const payments = orders.map((order, index) => ({
    id: `pay_demo_${index}`,
    orderId: order.id,
    bookingId: null,
    method: PaymentMethod.MPESA,
    status: PaymentStatus.SETTLED,
    expectedAmount: order.total,
    receivedAmount: order.total,
    providerRequestId: `ws_CO_demo_${index}`,
    providerReference: `SDK${index}A1B2C3`,
    providerTimestamp: order.paidAt,
    phone: "+254799112233",
    failureReason: null,
    createdAt: order.createdAt,
    updatedAt: order.paidAt ?? order.createdAt,
  }));
  for (const payment of payments) db.payments.set(payment.id, payment);

  const tickets: Ticket[] = [
    {
      id: "tkt_demo_1",
      code: "BK-TCKT-4F7A",
      eventId: "evt_sauti_sol",
      ticketTypeId: "tt_sauti_ga",
      orderId: "ord_demo_sauti",
      ownerUserId: DEMO_USER_ID,
      ownerName: "Njeri Kamau",
      seatLabel: null,
      status: TicketStatus.ACTIVE,
      facePrice: kes(1200),
      credentialVersion: 1,
      issuedAt: at(-14, 20),
      checkedInAt: null,
      ownershipHistory: [
        { at: at(-14, 20), fromUserId: null, toUserId: DEMO_USER_ID, reason: "ISSUE", reference: "ord_demo_sauti" },
      ],
    },
    {
      id: "tkt_demo_2",
      code: "BK-TCKT-9C21",
      eventId: "evt_sauti_sol",
      ticketTypeId: "tt_sauti_ga",
      orderId: "ord_demo_sauti",
      ownerUserId: DEMO_USER_ID,
      ownerName: "Njeri Kamau",
      seatLabel: null,
      status: TicketStatus.ACTIVE,
      facePrice: kes(1200),
      credentialVersion: 1,
      issuedAt: at(-14, 20),
      checkedInAt: null,
      ownershipHistory: [
        { at: at(-14, 20), fromUserId: null, toUserId: DEMO_USER_ID, reason: "ISSUE", reference: "ord_demo_sauti" },
      ],
    },
    {
      id: "tkt_demo_3",
      code: "BK-TCKT-1B8E",
      eventId: "evt_burna",
      ticketTypeId: "tt_burna_vip",
      orderId: "ord_demo_burna",
      ownerUserId: DEMO_USER_ID,
      ownerName: "Njeri Kamau",
      seatLabel: "VIP-A-014",
      status: TicketStatus.ACTIVE,
      facePrice: kes(8500),
      credentialVersion: 1,
      issuedAt: at(-9, 11),
      checkedInAt: null,
      ownershipHistory: [
        { at: at(-9, 11), fromUserId: null, toUserId: DEMO_USER_ID, reason: "ISSUE", reference: "ord_demo_burna" },
      ],
    },
    {
      id: "tkt_demo_4",
      code: "BK-TCKT-7D53",
      eventId: "evt_burna",
      ticketTypeId: "tt_burna_vip",
      orderId: "ord_demo_burna",
      ownerUserId: DEMO_USER_ID,
      ownerName: "Njeri Kamau",
      seatLabel: "VIP-A-015",
      status: TicketStatus.LISTED,
      facePrice: kes(8500),
      credentialVersion: 1,
      issuedAt: at(-9, 11),
      checkedInAt: null,
      ownershipHistory: [
        { at: at(-9, 11), fromUserId: null, toUserId: DEMO_USER_ID, reason: "ISSUE", reference: "ord_demo_burna" },
      ],
    },
    {
      id: "tkt_demo_5",
      code: "BK-TCKT-3A90",
      eventId: "evt_comedy",
      ticketTypeId: "tt_comedy_ga",
      orderId: "ord_demo_past",
      ownerUserId: DEMO_USER_ID,
      ownerName: "Njeri Kamau",
      seatLabel: null,
      status: TicketStatus.CONSUMED,
      facePrice: kes(1500),
      credentialVersion: 2,
      issuedAt: at(-60, 19),
      checkedInAt: at(-58, 19, 40),
      ownershipHistory: [
        { at: at(-60, 19), fromUserId: null, toUserId: DEMO_USER_ID, reason: "ISSUE", reference: "ord_demo_past" },
      ],
    },
  ];
  for (const ticket of tickets) db.tickets.set(ticket.id, ticket);

  const listing: ResaleListing = {
    id: "lst_demo_1",
    ticketId: "tkt_demo_4",
    eventId: "evt_burna",
    sellerUserId: DEMO_USER_ID,
    askPrice: kes(9000),
    facePrice: kes(8500),
    status: ResaleListingStatus.ACTIVE,
    buyerUserId: null,
    createdAt: at(-3, 18),
    soldAt: null,
  };
  db.listings.set(listing.id, listing);
}

function seedContributions(db: MemoryDb): void {
  const contributions: Contribution[] = KENYAN_NAMES.slice(0, 22).map((name, index) => {
    const pledged = kes(5000);
    const received = kes(index % 4 === 0 ? 2500 : 5000);
    return {
      id: `con_chama_${index}`,
      eventId: "evt_chama",
      bookingId: `bkg_chama_${index}`,
      contributorName: name,
      phone: `+2547${String(30000000 + index * 173).slice(0, 8)}`,
      pledged,
      received,
      status:
        received.amount >= pledged.amount
          ? ContributionStatus.PAID
          : received.amount > 0
            ? ContributionStatus.PARTIALLY_PAID
            : ContributionStatus.PLEDGED,
      method: PaymentMethod.MPESA,
      reference: `SFC${String(index).padStart(4, "0")}`,
      createdAt: at(-20 + index * 0.4, 9),
    };
  });

  contributions.push({
    id: "con_ruracio_pool",
    eventId: "evt_ruracio",
    bookingId: null,
    contributorName: "Family contribution pool",
    phone: null,
    pledged: kes(300000),
    received: kes(184500),
    status: ContributionStatus.PARTIALLY_PAID,
    method: PaymentMethod.MPESA,
    reference: null,
    createdAt: at(-30, 9),
  });

  for (const contribution of contributions) db.contributions.set(contribution.id, contribution);
}

export { venues as seedVenues, organizers as seedOrganizers, users as seedUsers };
export const SEED_ZERO = zero();
export const SEED_HOUR_HELPERS = { at, addHours };
