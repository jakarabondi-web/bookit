import { createHash } from "node:crypto";
import { forbidden, notFound, validationError } from "@/domain/errors";
import {
  EXTENSION_BY_TYPE,
  MAX_IMAGE_PIXELS,
  MIN_IMAGE_DIMENSION,
  sanitiseFilename,
  type MediaAsset,
  type MediaId,
  type MediaPurpose,
} from "@/domain/media";
import type { ActorContext } from "@/domain/types";
import { config } from "../config";
import { systemClock, type Clock } from "../lib/clock";
import { newId } from "../lib/ids";
import { probeImage } from "../media/sniff";
import type { MediaStorage, StoredObject } from "../media/storage";
import type { UnitOfWork } from "../repositories/types";
import type { AuditService } from "./audit-service";

/**
 * Uploads.
 *
 * Everything a host puts on an invitation comes through here, which makes this
 * the platform's only untrusted-bytes entry point. The order of the checks
 * below is the whole security argument:
 *
 *  1. Is the caller allowed to upload for this organizer?
 *  2. Is it small enough? (checked before anything touches the bytes)
 *  3. Is it genuinely a JPEG, PNG or WebP — by signature, not by claim?
 *  4. Are its dimensions sane, so it is neither a tracking pixel nor a bomb?
 *
 * Only then is anything stored. The declared `Content-Type` is never trusted
 * and never persisted; the type recorded on the asset is the sniffed one, and
 * that is what the serving route sends back.
 */

export interface UploadInput {
  organizerId: string;
  purpose: MediaPurpose;
  filename: string;
  bytes: Uint8Array;
}

export interface MediaDeps {
  audit: AuditService;
}

export class MediaService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly storage: MediaStorage,
    private readonly deps: MediaDeps,
    private readonly clock: Clock = systemClock,
  ) {}

  async upload(actor: ActorContext, input: UploadInput): Promise<MediaAsset> {
    this.assertOwns(actor, input.organizerId);

    const max = config.media.maxUploadBytes;
    if (input.bytes.byteLength === 0) {
      throw validationError("That file is empty. Choose a photo and try again.");
    }
    if (input.bytes.byteLength > max) {
      throw validationError(
        `That image is ${formatMb(input.bytes.byteLength)}. The limit is ${formatMb(max)} — try a smaller version.`,
        { limitBytes: max, actualBytes: input.bytes.byteLength },
      );
    }

    const probe = probeImage(input.bytes);
    if (!probe) {
      throw validationError(
        "That file is not a JPEG, PNG or WebP image. Those are the formats invitations can use.",
      );
    }

    if (probe.width < MIN_IMAGE_DIMENSION || probe.height < MIN_IMAGE_DIMENSION) {
      throw validationError(
        `That image is ${probe.width}×${probe.height}. Invitations need at least ${MIN_IMAGE_DIMENSION} pixels on each side to stay sharp.`,
        { width: probe.width, height: probe.height },
      );
    }
    if (probe.width * probe.height > MAX_IMAGE_PIXELS) {
      throw validationError("That image is too large to process. Try one under 100 megapixels.");
    }

    const checksum = createHash("sha256").update(input.bytes).digest("hex");

    // The same photograph used on the e-card and the cover should be stored
    // once. Returning the existing asset also makes a retried upload — a flaky
    // connection, a double-clicked button — idempotent for free.
    const existing = await this.uow.repos.media.findByChecksum(input.organizerId, checksum);
    if (existing) return existing;

    const id = newId("med");
    const storageKey = `${input.organizerId}/${id}.${EXTENSION_BY_TYPE[probe.contentType]}`;

    await this.storage.put(storageKey, input.bytes, probe.contentType);

    const asset: MediaAsset = {
      id,
      organizerId: input.organizerId,
      purpose: input.purpose,
      filename: sanitiseFilename(input.filename),
      contentType: probe.contentType,
      bytes: input.bytes.byteLength,
      width: probe.width,
      height: probe.height,
      checksum,
      url: `/api/v1/media/${id}`,
      storageKey,
      createdAt: this.clock.nowIso(),
      createdByUserId: actor.userId,
    };

    const created = await this.uow.repos.media.create(asset);

    await this.deps.audit.record(actor, {
      action: "media.uploaded",
      resourceType: "Media",
      resourceId: id,
      after: {
        purpose: asset.purpose,
        contentType: asset.contentType,
        bytes: asset.bytes,
        width: asset.width,
        height: asset.height,
      },
    });

    return created;
  }

  /** The asset record. Public by id — see `read` for why that is safe. */
  async find(id: MediaId): Promise<MediaAsset | null> {
    return this.uow.repos.media.findById(id);
  }

  /**
   * The bytes, for the serving route.
   *
   * Deliberately unauthenticated. An invitation microsite is reachable by
   * anyone holding its token, and the images on it have to load for those
   * guests — so media ids are unguessable rather than access-controlled, the
   * same posture the invitation tokens themselves take. Nothing sensitive
   * should be uploaded on the strength of that, and nothing in the product
   * asks a host to.
   */
  async read(id: MediaId): Promise<{ asset: MediaAsset; object: StoredObject } | null> {
    const asset = await this.uow.repos.media.findById(id);
    if (!asset) return null;
    const object = await this.storage.get(asset.storageKey);
    if (!object) return null;
    return { asset, object };
  }

  async listFor(
    actor: ActorContext,
    organizerId: string,
    purpose?: MediaPurpose,
  ): Promise<MediaAsset[]> {
    this.assertOwns(actor, organizerId);
    return this.uow.repos.media.listByOrganizer(organizerId, purpose);
  }

  async remove(actor: ActorContext, id: MediaId): Promise<void> {
    const asset = await this.uow.repos.media.findById(id);
    if (!asset) throw notFound("Image", id);
    this.assertOwns(actor, asset.organizerId);

    await this.storage.delete(asset.storageKey);
    await this.uow.repos.media.delete(id);

    await this.deps.audit.record(actor, {
      action: "media.deleted",
      resourceType: "Media",
      resourceId: id,
      before: { purpose: asset.purpose, filename: asset.filename },
    });
  }

  private assertOwns(actor: ActorContext, organizerId: string): void {
    if (actor.organizerId !== organizerId) {
      throw forbidden("You can only manage images for your own account");
    }
  }
}

function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
