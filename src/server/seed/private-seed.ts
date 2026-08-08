import { createHash } from "node:crypto";
import { InviteStatus } from "@/domain/enums";
import { kes } from "@/domain/money";
import type {
  Broadcast,
  GiftItem,
  GuestMessage,
  PrivateEventPage,
} from "@/domain/private-event";
import { defaultPrivatePage } from "@/domain/private-event";
import type { MemoryDb } from "../repositories/memory/store";

/**
 * Demo content for the two private events.
 *
 * Invitation tokens are seeded as real SHA-256 hashes of predictable strings so
 * the demo links actually resolve — `/i/ruracio-peter` opens Peter Kimani's
 * invitation. In production the raw token is random and shown exactly once.
 */

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** Tokens that work in the demo build. */
export const DEMO_INVITE_TOKENS = {
  ruracio: "ruracio-peter",
  wedding: "wedding-njeri",
} as const;

function at(daysAhead: number, hour: number, minute = 0): string {
  const base = new Date();
  base.setHours(hour, minute, 0, 0);
  return new Date(base.getTime() + daysAhead * 86_400_000).toISOString();
}

export function seedPrivateEvents(db: MemoryDb): void {
  seedRuracio(db);
  seedWedding(db);
}

/* -------------------------------------------------------------------------- */
/* Ruracio                                                                     */
/* -------------------------------------------------------------------------- */

function seedRuracio(db: MemoryDb): void {
  const event = db.events.get("evt_ruracio");
  if (!event) return;

  const page: PrivateEventPage = {
    ...defaultPrivatePage(event.id, { title: event.title, startsAt: event.startsAt }),
    themeId: "kitenge",
    coverImageUrl: "/assets/images/event-wedding.jpg",
    eyebrow: "Ruracio Ceremony",
    headline: null,
    tagline:
      "The Wanjiku and Otieno families invite you to celebrate the joining of our two homes.",
    story:
      "Wanjiru and Kevin met at a Sunday service in Githunguri seven years ago. After many visits, many conversations and one very long negotiation between our elders, we are ready to bring the two families together.\n\nRuracio is a family matter, so we are keeping the day close — only the people who have walked with us are invited. Thank you for being one of them.",
    hosts: [
      {
        id: "host_r1",
        name: "Wanjiru",
        role: "Bride",
        photoUrl: null,
        bio: "Eldest daughter of Mr & Mrs Wanjiku of Githunguri.",
      },
      {
        id: "host_r2",
        name: "Kevin",
        role: "Groom",
        photoUrl: null,
        bio: "Son of Mr & Mrs Otieno of Kisumu.",
      },
    ],
    programme: [
      {
        id: "prg_r1",
        time: at(21, 11),
        title: "Arrival and welcome",
        description: "Tea and mandazi as guests gather. Please arrive before 11:00 AM.",
        location: null,
      },
      {
        id: "prg_r2",
        time: at(21, 12),
        title: "Reception of the groom's family",
        description: "The Otieno family is received at the gate.",
        location: null,
      },
      {
        id: "prg_r3",
        time: at(21, 13),
        title: "The ceremony",
        description: "Presentation, negotiation and the blessing by the elders.",
        location: null,
      },
      { id: "prg_r4", time: at(21, 15), title: "Lunch", description: null, location: null },
      {
        id: "prg_r5",
        time: at(21, 16, 30),
        title: "Music and dancing",
        description: "Traditional Kikuyu and Luo performances.",
        location: null,
      },
    ],
    dressCode: "Traditional or smart African attire",
    dressCodeNote:
      "Kitenge, kikoi or a smart suit are all perfect. The ceremony is outdoors on grass — flat shoes are wise.",
    travel: [
      {
        id: "trv_r1",
        kind: "DIRECTIONS",
        title: "Getting there",
        body: "The homestead is 8km from Githunguri town, off the Githunguri–Ruiru road. Follow the signs from the Kambaa junction. Allow 90 minutes from Nairobi CBD on a Saturday.",
      },
      {
        id: "trv_r2",
        kind: "PARKING",
        title: "Parking",
        body: "There is parking for 60 cars in the field beside the homestead. Attendants will direct you.",
      },
      {
        id: "trv_r3",
        kind: "TRANSPORT",
        title: "Shared transport",
        body: "A bus leaves Nairobi from the Sarit Centre car park at 8:30 AM sharp and returns at 7:00 PM. Tell us on your RSVP if you would like a seat.",
      },
    ],
    faq: [
      {
        id: "faq_r1",
        question: "May I bring my children?",
        answer:
          "Yes — this is a family day. Please include them in your guest count so we can plan the food.",
      },
      {
        id: "faq_r2",
        question: "Is there a gift registry?",
        answer:
          "There is, but please do not feel obliged. Your presence at the ceremony is what matters to us.",
      },
      {
        id: "faq_r3",
        question: "Can I share photos?",
        answer:
          "Please do, but only within the family. This is a private ceremony, so kindly do not post publicly.",
      },
    ],
    ecard: {
      layout: "BORDERED",
      monogram: "W & K",
      eyebrow: "The Wanjiku & Otieno families",
      invitationLine: "invite you to our Ruracio ceremony",
      footnote: "Lunch and celebration to follow",
      photoUrl: null,
      themeId: null,
    },
    rsvp: {
      deadline: at(14, 23, 59),
      allowPlusOnes: true,
      collectMealChoice: true,
      mealOptions: ["Nyama choma", "Chicken", "Fish", "Vegetarian"],
      collectDietary: true,
      collectMessage: true,
      collectSongRequest: false,
      showGuestList: false,
      showConfirmedCount: true,
    },
    hashtag: "#WanjikuMeetsOtieno",
    contactName: "Grace Wanjiku",
    contactPhone: "+254 733 777 888",
    confirmationMessage:
      "Asante sana. We have you down — we will send directions and the final programme a week before.",
    giftRegistryEnabled: true,
    giftRegistryNote:
      "We are setting up our first home together. Anything from this list helps, and a contribution towards the ceremony is just as welcome.",
    messageWallEnabled: true,
    updatedAt: at(-3, 12),
  };
  db.privatePages.set(page.eventId, page);

  const gifts: GiftItem[] = [
    {
      id: "gft_r1",
      eventId: event.id,
      kind: "CASH_FUND",
      title: "Contribution to the ceremony",
      description:
        "Ruracio is carried by the whole family. Any amount towards the day is appreciated.",
      imageUrl: null,
      externalUrl: null,
      price: kes(300000),
      quantityWanted: 1,
      quantityClaimed: 0,
      contributed: kes(184500),
      payToNumber: "M-PESA Paybill 400200 · Account RURACIO",
      sortOrder: 0,
      archived: false,
    },
    {
      id: "gft_r2",
      eventId: event.id,
      kind: "ITEM",
      title: "Six-seater dining set",
      description: "Solid wood, for the new home in Kiambu.",
      imageUrl: null,
      externalUrl: null,
      price: kes(65000),
      quantityWanted: 1,
      quantityClaimed: 1,
      contributed: null,
      payToNumber: null,
      sortOrder: 1,
      archived: false,
    },
    {
      id: "gft_r3",
      eventId: event.id,
      kind: "ITEM",
      title: "Cookware set",
      description: "Stainless steel pots and pans.",
      imageUrl: null,
      externalUrl: null,
      price: kes(12000),
      quantityWanted: 2,
      quantityClaimed: 0,
      contributed: null,
      payToNumber: null,
      sortOrder: 2,
      archived: false,
    },
    {
      id: "gft_r4",
      eventId: event.id,
      kind: "ITEM",
      title: "Bedding and linen",
      description: "Any colour — we are not fussy.",
      imageUrl: null,
      externalUrl: null,
      price: kes(8000),
      quantityWanted: 3,
      quantityClaimed: 1,
      contributed: null,
      payToNumber: null,
      sortOrder: 3,
      archived: false,
    },
  ];
  for (const gift of gifts) db.gifts.set(gift.id, gift);

  const broadcasts: Broadcast[] = [
    {
      id: "bcs_r1",
      eventId: event.id,
      channel: "SMS",
      audience: "NOT_RESPONDED",
      subject: "A gentle reminder",
      body: "Habari! We have not heard from you yet about the ruracio on the 29th. Please open your invitation link and let us know — we need final numbers by Friday.",
      recipientCount: 4,
      sentByUserId: "usr_grace",
      sentAt: at(-4, 10),
    },
    {
      id: "bcs_r2",
      eventId: event.id,
      channel: "EMAIL",
      audience: "CONFIRMED",
      subject: "Directions and the bus from Nairobi",
      body: "Thank you for confirming. The bus leaves Sarit Centre at 8:30 AM sharp. Directions to the homestead are on your invitation page.",
      recipientCount: 13,
      sentByUserId: "usr_grace",
      sentAt: at(-2, 9),
    },
  ];
  for (const broadcast of broadcasts) db.broadcasts.set(broadcast.id, broadcast);

  const messages: GuestMessage[] = [
    {
      id: "gms_r1",
      eventId: event.id,
      bookingId: "bkg_ruracio_1",
      inviteId: "inv_ruracio_1",
      authorName: "Otieno Ochieng",
      body: "Congratulations to both families. We would not miss it.",
      approved: true,
      createdAt: at(-12, 14),
    },
    {
      id: "gms_r2",
      eventId: event.id,
      bookingId: "bkg_ruracio_2",
      inviteId: "inv_ruracio_2",
      authorName: "Fatuma Hassan",
      body: "So happy for you both. Travelling from Mombasa — see you on the 29th!",
      approved: true,
      createdAt: at(-9, 18),
    },
    {
      id: "gms_r3",
      eventId: event.id,
      bookingId: "bkg_ruracio_5",
      inviteId: "inv_ruracio_5",
      authorName: "Salim Abdalla",
      body: "Blessings to the two families. Awaiting the day.",
      approved: false,
      createdAt: at(-1, 20),
    },
  ];
  for (const message of messages) db.guestMessages.set(message.id, message);

  // A working demo invitation: /i/ruracio-peter
  const demoInvite = db.invites.get("inv_ruracio_9");
  if (demoInvite) {
    db.invites.set(demoInvite.id, {
      ...demoInvite,
      tokenHash: hash(DEMO_INVITE_TOKENS.ruracio),
      inviteeName: "Peter Kimani",
      email: "peter.kimani@example.co.ke",
      phone: "+254712000909",
      maxGuests: 4,
      status: InviteStatus.ISSUED,
      bookingId: null,
      expiresAt: at(20, 23),
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Wedding reception                                                           */
/* -------------------------------------------------------------------------- */

function seedWedding(db: MemoryDb): void {
  const event = db.events.get("evt_wedding");
  if (!event) return;

  const page: PrivateEventPage = {
    ...defaultPrivatePage(event.id, { title: event.title, startsAt: event.startsAt }),
    themeId: "gold-ivory",
    coverImageUrl: "/assets/images/hero-banquet.jpg",
    eyebrow: "The Wedding Reception of",
    headline: null,
    tagline: "Saturday evening at the Jambo Ballroom, Safari Park Hotel.",
    story:
      "After the church service in Karen, we would love you to join us for dinner and dancing at Safari Park. Seating is assigned, so please let us know who is coming and what they would like to eat.",
    hosts: [
      { id: "host_w1", name: "Achieng", role: "Bride", photoUrl: null, bio: null },
      { id: "host_w2", name: "Mutua", role: "Groom", photoUrl: null, bio: null },
    ],
    programme: [
      {
        id: "prg_w1",
        time: at(28, 17),
        title: "Cocktails on the terrace",
        description: "Drinks and canapés while the couple finish photographs.",
        location: "Jambo Terrace",
      },
      {
        id: "prg_w2",
        time: at(28, 18, 30),
        title: "Seated dinner",
        description: "Please find your table on the seating board at the entrance.",
        location: "Jambo Ballroom",
      },
      {
        id: "prg_w3",
        time: at(28, 20),
        title: "Speeches and cake",
        description: null,
        location: null,
      },
      {
        id: "prg_w4",
        time: at(28, 21),
        title: "First dance and dancing",
        description: "The bar stays open until midnight.",
        location: null,
      },
    ],
    dressCode: "Black tie",
    dressCodeNote: "Long dresses and dinner jackets. The ballroom is air-conditioned.",
    travel: [
      {
        id: "trv_w1",
        kind: "PARKING",
        title: "Parking",
        body: "Complimentary valet parking at the main Safari Park entrance — mention the Achieng-Mutua wedding.",
      },
      {
        id: "trv_w2",
        kind: "ACCOMMODATION",
        title: "Staying over",
        body: "Safari Park has held a block of rooms at a reduced rate until two weeks before. Quote ACHIENGMUTUA when booking.",
      },
    ],
    faq: [
      {
        id: "faq_w1",
        question: "Are children invited?",
        answer:
          "The reception is adults only, so that everyone can relax. We hope you understand.",
      },
      {
        id: "faq_w2",
        question: "When will I know my table?",
        answer:
          "Tables are assigned two weeks before, and we will send yours by SMS. It is also on the board at the entrance.",
      },
    ],
    ecard: {
      layout: "MONOGRAM",
      monogram: "A & M",
      eyebrow: "Together with their families",
      invitationLine: "request the pleasure of your company at their wedding reception",
      footnote: "Dinner and dancing to follow · Black tie",
      photoUrl: null,
      themeId: null,
    },
    rsvp: {
      deadline: at(21, 23, 59),
      allowPlusOnes: true,
      collectMealChoice: true,
      mealOptions: ["Chicken", "Beef", "Fish", "Vegetarian"],
      collectDietary: true,
      collectMessage: true,
      collectSongRequest: true,
      showGuestList: false,
      showConfirmedCount: false,
    },
    hashtag: "#AchiengMeetsMutua",
    contactName: "Grace Wanjiku",
    contactPhone: "+254 733 777 888",
    confirmationMessage:
      "Thank you — we cannot wait to celebrate with you. Your table number will follow by SMS two weeks before.",
    giftRegistryEnabled: true,
    giftRegistryNote:
      "Your presence is the gift. If you would still like to mark the day, here are a few things we are saving for.",
    messageWallEnabled: true,
    updatedAt: at(-5, 16),
  };
  db.privatePages.set(page.eventId, page);

  const gifts: GiftItem[] = [
    {
      id: "gft_w1",
      eventId: event.id,
      kind: "CASH_FUND",
      title: "Honeymoon in Watamu",
      description: "Five nights on the coast, which we have been promising ourselves for years.",
      imageUrl: null,
      externalUrl: null,
      price: kes(250000),
      quantityWanted: 1,
      quantityClaimed: 0,
      contributed: kes(96000),
      payToNumber: "M-PESA Till 5544332",
      sortOrder: 0,
      archived: false,
    },
    {
      id: "gft_w2",
      eventId: event.id,
      kind: "ITEM",
      title: "Espresso machine",
      description: "Mutua's one non-negotiable.",
      imageUrl: null,
      externalUrl: null,
      price: kes(45000),
      quantityWanted: 1,
      quantityClaimed: 0,
      contributed: null,
      payToNumber: null,
      sortOrder: 1,
      archived: false,
    },
    {
      id: "gft_w3",
      eventId: event.id,
      kind: "ITEM",
      title: "Dinner service for eight",
      description: "White porcelain.",
      imageUrl: null,
      externalUrl: null,
      price: kes(18000),
      quantityWanted: 1,
      quantityClaimed: 1,
      contributed: null,
      payToNumber: null,
      sortOrder: 2,
      archived: false,
    },
  ];
  for (const gift of gifts) db.gifts.set(gift.id, gift);

  db.broadcasts.set("bcs_w1", {
    id: "bcs_w1",
    eventId: event.id,
    channel: "EMAIL",
    audience: "ALL",
    subject: "Save the date — and your invitation link",
    body: "We are getting married! Your personal invitation link is in this email. Please RSVP by the 21st so we can finalise seating with the hotel.",
    recipientCount: 20,
    sentByUserId: "usr_grace",
    sentAt: at(-20, 11),
  });

  db.guestMessages.set("gms_w1", {
    id: "gms_w1",
    eventId: event.id,
    bookingId: "bkg_wed_0",
    inviteId: null,
    authorName: "Njeri Kamau",
    body: "Congratulations! Counting down already.",
    approved: true,
    createdAt: at(-15, 13),
  });

  // A working demo invitation: /i/wedding-njeri
  const invite = {
    id: "inv_wedding_demo",
    eventId: event.id,
    tokenHash: hash(DEMO_INVITE_TOKENS.wedding),
    inviteeName: "Njeri Kamau",
    phone: "+254799112233",
    email: "demo@bookit.co.ke",
    maxGuests: 2,
    expiresAt: at(21, 23),
    status: InviteStatus.ACCEPTED,
    bookingId: "bkg_wed_0",
    createdAt: at(-20, 11),
  };
  db.invites.set(invite.id, invite);
}
