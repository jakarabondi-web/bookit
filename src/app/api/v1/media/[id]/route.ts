import { getContainer } from "@/server/container";

/**
 * GET /api/v1/media/:id
 *
 * Serves the bytes. This route does not use the JSON envelope — it returns an
 * image or nothing.
 *
 * Three headers matter here and all three are defensive:
 *
 *  - `Content-Type` is the type the *server* sniffed at upload, never anything
 *    the uploader claimed.
 *  - `X-Content-Type-Options: nosniff` stops a browser second-guessing that and
 *    rendering a crafted file as something executable.
 *  - `Content-Disposition: inline` with a sanitised filename keeps a download
 *    from being named something that confuses a desktop.
 *
 * Assets are immutable — a new upload is a new id — so they can be cached hard
 * and revalidated with a checksum ETag.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const found = await getContainer().media.read(id);

  if (!found) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const { asset, object } = found;
  const etag = `"${asset.checksum}"`;

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(new Uint8Array(object.bytes), {
    status: 200,
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.bytes),
      "Content-Disposition": `inline; filename="${asset.filename}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
    },
  });
}
