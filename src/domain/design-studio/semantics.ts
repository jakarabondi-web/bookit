import { bindingsIn } from "./bindings";
import { CANVAS_SIZES, type BookitTemplate, type DesignElement } from "./types";

/**
 * What each element *is*.
 *
 * The prompt console has to answer "make the names bigger" without the host
 * having selected anything, which means the studio needs to know which of
 * twenty-odd boxes on the board are the names. Rather than tag every template
 * by hand — a field that would drift the moment a design was edited — the role
 * is derived from what the element already says: a text element bound to
 * `{{couple.firstName}}` is a name, wherever it sits and whatever it is called.
 *
 * This is also what lets an instruction survive a template switch. "Set the
 * names in gold" means the same thing on all twelve designs because all twelve
 * bind their names the same way.
 */

export type ElementRole =
  | "ground"
  | "frame"
  | "pattern"
  | "ornament"
  | "divider"
  | "monogram"
  | "photo"
  | "names"
  | "joiner"
  | "occasion"
  | "hosts"
  | "date"
  | "venue"
  | "detail"
  | "rsvp";

/** The roles a host can name in a prompt, with the words they would use. */
export const ROLE_WORDS: Record<ElementRole, string[]> = {
  ground: ["background", "card", "ground"],
  frame: ["frame", "border", "rule", "panel"],
  pattern: ["pattern", "texture", "field", "backdrop"],
  ornament: ["ornament", "flourish", "decoration", "motif", "sprig", "laurel", "fleuron"],
  divider: ["divider", "separator"],
  monogram: ["monogram", "initials", "crest", "seal"],
  photo: ["photo", "photograph", "picture", "image"],
  names: ["names", "our names", "couple", "name"],
  joiner: ["and", "ampersand", "joiner"],
  occasion: ["occasion", "headline", "title", "heading"],
  hosts: ["hosts", "families", "invitation line"],
  date: ["date", "time", "when"],
  venue: ["venue", "address", "location", "where"],
  detail: ["details", "dress code", "hashtag", "note"],
  rsvp: ["rsvp", "reply", "qr", "code"],
};

const NAME_BINDINGS = ["couple.firstName", "couple.secondName", "couple.initials"];
const DATE_BINDINGS = [
  "event.date",
  "event.dateLong",
  "event.dateNumeral",
  "event.month",
  "event.year",
  "event.weekday",
  "event.time",
];
const VENUE_BINDINGS = ["event.venue", "event.address", "event.city", "event.country"];
const RSVP_BINDINGS = ["event.rsvpBy", "event.rsvpUrl", "guest.url", "guest.rsvpCode"];
const DETAIL_BINDINGS = ["event.dressCode", "event.hashtag"];

/** Short connective text — "and", "&", "·" — that carries no content of its own. */
const JOINER = /^[\s&·—–|+]*(and|et|na|&)?[\s&·—–|+]*$/i;

export function roleOf(element: DesignElement, template?: BookitTemplate): ElementRole {
  switch (element.type) {
    case "pattern":
      return "pattern";
    case "vector":
      return "ornament";
    case "divider":
      return "divider";
    case "monogram":
      return "monogram";
    case "image":
      return "photo";
    case "qr":
      return "rsvp";
    case "shape": {
      const canvas = CANVAS_SIZES[template?.size ?? "invitation"];
      const fillsBoard = element.width >= canvas.width * 0.98 && element.height >= canvas.height * 0.98;
      if (element.id === "ground" || (fillsBoard && element.fillRole)) return "ground";
      return "frame";
    }
    case "text": {
      const bindings = bindingsIn(element.content);
      if (bindings.some((path) => NAME_BINDINGS.includes(path))) return "names";
      if (bindings.some((path) => RSVP_BINDINGS.includes(path))) return "rsvp";
      if (bindings.some((path) => DATE_BINDINGS.includes(path))) return "date";
      if (bindings.some((path) => VENUE_BINDINGS.includes(path))) return "venue";
      if (bindings.some((path) => DETAIL_BINDINGS.includes(path))) return "detail";
      if (bindings.includes("event.hosts")) return "hosts";
      if (JOINER.test(element.content)) return "joiner";
      if (element.fontRole === "display" || element.fontSize >= 24) return "occasion";
      return "detail";
    }
  }
}

/** Every element playing a given role, in paint order. */
export function elementsInRole(
  elements: DesignElement[],
  role: ElementRole,
  template?: BookitTemplate,
): DesignElement[] {
  return elements.filter((element) => roleOf(element, template) === role);
}

/** The roles actually present on a board — what the assistant can talk about. */
export function rolesPresent(
  elements: DesignElement[],
  template?: BookitTemplate,
): Set<ElementRole> {
  return new Set(elements.map((element) => roleOf(element, template)));
}

/** Roles whose text a host would reasonably want to restyle. */
export const TEXT_ROLES: ElementRole[] = [
  "names",
  "joiner",
  "occasion",
  "hosts",
  "date",
  "venue",
  "detail",
  "rsvp",
];

export function isTextRole(role: ElementRole): boolean {
  return TEXT_ROLES.includes(role);
}

/** Plain English for a role, for the change log. */
export function roleLabel(role: ElementRole, plural = false): string {
  const labels: Record<ElementRole, [string, string]> = {
    ground: ["the background", "the background"],
    frame: ["the frame", "the frames"],
    pattern: ["the pattern", "the patterns"],
    ornament: ["the ornament", "the ornaments"],
    divider: ["the divider", "the dividers"],
    monogram: ["the monogram", "the monograms"],
    photo: ["the photograph", "the photographs"],
    names: ["the names", "the names"],
    joiner: ["the joining word", "the joining words"],
    occasion: ["the heading", "the headings"],
    hosts: ["the host line", "the host lines"],
    date: ["the date", "the date and time"],
    venue: ["the venue", "the venue lines"],
    detail: ["the details", "the details"],
    rsvp: ["the RSVP", "the RSVP lines"],
  };
  return labels[role][plural ? 1 : 0];
}
