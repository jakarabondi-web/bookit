import type { OrganizerId, UserId } from "./types";

/**
 * Uploaded media.
 *
 * A host putting a photograph on an invitation is the first thing the private
 * studio needs and the last thing it had: every image field used to be a text
 * box you typed a server path into. An asset here is the record of a stored
 * file — the bytes themselves live behind `MediaStorage`, so swapping the
 * in-memory adapter for S3 or R2 changes nothing above this line.
 *
 * Media is always owned by an organizer rather than by the event it is used on.
 * A cover image outlives the draft it was uploaded for, and a family reusing the
 * same portrait across an e-card and a programme should upload it once.
 */

export type MediaId = string;

/**
 * Where an asset is meant to be shown.
 *
 * The purpose drives the crop the studio asks for and lets the library filter
 * to plausible candidates, so a guest portrait is not offered as a full-bleed
 * cover. It is advisory, not a permission — the service does not stop an asset
 * being referenced from somewhere else.
 */
export const MediaPurpose = {
  EVENT_COVER: "EVENT_COVER",
  ECARD_PHOTO: "ECARD_PHOTO",
  HOST_PORTRAIT: "HOST_PORTRAIT",
  GIFT_IMAGE: "GIFT_IMAGE",
} as const;
export type MediaPurpose = (typeof MediaPurpose)[keyof typeof MediaPurpose];

/** The aspect ratio each purpose is composed for, used by the upload control. */
export const MEDIA_ASPECT: Record<MediaPurpose, number> = {
  EVENT_COVER: 16 / 9,
  ECARD_PHOTO: 3 / 2,
  HOST_PORTRAIT: 1,
  GIFT_IMAGE: 4 / 3,
};

/**
 * The formats a host may upload.
 *
 * SVG is deliberately absent and must stay absent. An SVG is a document, not a
 * picture: it can carry script and it executes in the origin that serves it, so
 * accepting one turns every invitation page into a stored-XSS vector. GIF is
 * left out because nothing in the product needs animation and every extra
 * decoder is extra attack surface.
 */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function isAllowedImageType(value: string): value is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(value);
}

/** Extension used when storing, derived from the sniffed type — never from the filename. */
export const EXTENSION_BY_TYPE: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Smallest image worth accepting; below this it is a tracking pixel or a mistake. */
export const MIN_IMAGE_DIMENSION = 200;

/** Guard against decompression bombs — 100MP is far beyond any real photograph. */
export const MAX_IMAGE_PIXELS = 100_000_000;

export interface MediaAsset {
  id: MediaId;
  organizerId: OrganizerId;
  purpose: MediaPurpose;
  /** The uploader's filename, sanitised. Shown in the library; never used as a path. */
  filename: string;
  contentType: AllowedImageType;
  bytes: number;
  width: number;
  height: number;
  /** SHA-256 of the file, so re-uploading the same photograph reuses the asset. */
  checksum: string;
  /** Where the bytes are served from. */
  url: string;
  /** Opaque key in the storage backend. */
  storageKey: string;
  createdAt: string;
  createdByUserId: UserId | null;
}

/**
 * Strips everything that makes a filename dangerous, keeping it recognisable.
 *
 * The result is only ever displayed — the storage key is generated — but a
 * filename still reaches a screen, a `Content-Disposition` header and a log
 * line, so path separators, control characters and traversal segments come out
 * here rather than being trusted anywhere downstream.
 */
export function sanitiseFilename(raw: string): string {
  const base = raw.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[^A-Za-z0-9._ -]/g, "-")
    .replace(/^\.+/, "")
    .replace(/-{2,}/g, "-")
    .trim();
  return cleaned.slice(0, 120) || "image";
}
