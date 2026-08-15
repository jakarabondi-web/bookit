import { validationError } from "@/domain/errors";
import { MediaPurpose } from "@/domain/media";
import { currentOrganizerActor, getContainer } from "@/server/container";
import { config } from "@/server/config";
import { created, handler, ok } from "@/server/http/envelope";

export const dynamic = "force-dynamic";

function parsePurpose(raw: FormDataEntryValue | null): MediaPurpose {
  const value = typeof raw === "string" ? raw : "";
  if (value in MediaPurpose) return value as MediaPurpose;
  throw validationError("Tell us where this image will be used", { purpose: value });
}

/**
 * POST /api/v1/organizers/media
 *
 * Multipart upload of a single image. The body is read as form data rather than
 * JSON so a large photograph does not have to survive base64 inflation, and the
 * declared part type is discarded — `MediaService` decides what the file is
 * from its bytes.
 */
export const POST = handler(async (request: Request) => {
  const container = getContainer();

  // A `Content-Length` well past the cap can be refused before the body is
  // read at all. It is a hint, not a guarantee, so the service still checks the
  // real length once the bytes are in hand.
  const declared = Number.parseInt(request.headers.get("content-length") ?? "", 10);
  if (Number.isFinite(declared) && declared > config.media.maxUploadBytes * 1.5) {
    throw validationError("That image is too large to upload", {
      limitBytes: config.media.maxUploadBytes,
    });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw validationError("That upload could not be read. Try choosing the file again.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    throw validationError("Choose an image to upload");
  }

  const actor = currentOrganizerActor();
  const asset = await container.media.upload(actor, {
    organizerId: actor.organizerId!,
    purpose: parsePurpose(form.get("purpose")),
    filename: file.name,
    bytes: new Uint8Array(await file.arrayBuffer()),
  });

  return created({
    id: asset.id,
    url: asset.url,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    contentType: asset.contentType,
    filename: asset.filename,
  });
});

/**
 * GET /api/v1/organizers/media
 *
 * The organizer's library, newest first, optionally narrowed to one purpose so
 * the studio can offer the images already composed for the frame it is filling.
 */
export const GET = handler(async (request: Request) => {
  const container = getContainer();
  const actor = currentOrganizerActor();

  const url = new URL(request.url);
  const rawPurpose = url.searchParams.get("purpose");
  const purpose =
    rawPurpose && rawPurpose in MediaPurpose ? (rawPurpose as MediaPurpose) : undefined;

  const assets = await container.media.listFor(actor, actor.organizerId!, purpose);

  return ok(
    assets.map((asset) => ({
      id: asset.id,
      url: asset.url,
      width: asset.width,
      height: asset.height,
      filename: asset.filename,
      purpose: asset.purpose,
      createdAt: asset.createdAt,
    })),
    { count: assets.length },
  );
});
