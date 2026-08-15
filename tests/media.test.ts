import { describe, expect, it } from "vitest";
import { MediaPurpose, sanitiseFilename } from "@/domain/media";
import { probeImage } from "@/server/media/sniff";
import { MemoryMediaStorage } from "@/server/media/storage";
import { actor, freshContainer } from "./helpers";

/**
 * Uploads are the only place the platform accepts bytes from outside, so these
 * tests are mostly about what gets rejected. The rule being defended is that
 * what a file *claims* to be never matters — only what its header says it is.
 */

const ORG = "org_test";
const uploader = () => actor({ organizerId: ORG, roles: ["ORGANIZER_OWNER"] });

/* ----------------------------------------------------------- fixtures ---- */

/** A real PNG: signature, IHDR with the given size, and nothing else. */
function png(width = 800, height = 600): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(8, 13, false); // IHDR chunk length
  bytes.set([0x49, 0x48, 0x44, 0x52], 12); // "IHDR"
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

/** A real JPEG: SOI, an APP0 segment to skip, then an SOF0 frame header. */
function jpeg(width = 1024, height = 768): Uint8Array {
  const bytes = new Uint8Array(30);
  const view = new DataView(bytes.buffer);
  bytes.set([0xff, 0xd8], 0); // SOI
  bytes.set([0xff, 0xe0], 2); // APP0
  view.setUint16(4, 6, false); //   length 6 → next marker at 10
  bytes.set([0xff, 0xc0], 10); // SOF0
  view.setUint16(12, 17, false); //   segment length
  bytes[14] = 8; //                   sample precision
  view.setUint16(15, height, false);
  view.setUint16(17, width, false);
  return bytes;
}

/** A lossy WebP: RIFF/WEBP wrapper, "VP8 " chunk, start code, packed size. */
function webp(width = 640, height = 480): Uint8Array {
  const bytes = new Uint8Array(40);
  const view = new DataView(bytes.buffer);
  bytes.set([...Buffer.from("RIFF")], 0);
  view.setUint32(4, 32, true);
  bytes.set([...Buffer.from("WEBP")], 8);
  bytes.set([...Buffer.from("VP8 ")], 12);
  bytes.set([0x9d, 0x01, 0x2a], 23);
  view.setUint16(26, width, true);
  view.setUint16(28, height, true);
  return bytes;
}

function bytesOf(text: string): Uint8Array {
  return new Uint8Array(Buffer.from(text, "utf8"));
}

/* -------------------------------------------------------------- sniff ---- */

describe("probeImage", () => {
  it("reads PNG dimensions from IHDR", () => {
    expect(probeImage(png(1200, 630))).toEqual({
      contentType: "image/png",
      width: 1200,
      height: 630,
    });
  });

  it("walks JPEG segments to the frame header", () => {
    expect(probeImage(jpeg(1920, 1080))).toEqual({
      contentType: "image/jpeg",
      width: 1920,
      height: 1080,
    });
  });

  it("reads a lossy WebP size", () => {
    expect(probeImage(webp(800, 450))).toEqual({
      contentType: "image/webp",
      width: 800,
      height: 450,
    });
  });

  it("rejects an SVG, which is a script-carrying document rather than a picture", () => {
    const svg = bytesOf('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(probeImage(svg)).toBeNull();
  });

  it("rejects HTML no matter what it is called", () => {
    expect(probeImage(bytesOf("<!doctype html><h1>hello</h1>"))).toBeNull();
  });

  it("rejects a truncated file that only has the signature", () => {
    expect(probeImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull();
  });

  it("rejects an empty file", () => {
    expect(probeImage(new Uint8Array(0))).toBeNull();
  });
});

/* --------------------------------------------------------- sanitising ---- */

describe("sanitiseFilename", () => {
  it("strips directory traversal", () => {
    expect(sanitiseFilename("../../etc/passwd")).toBe("passwd");
  });

  it("keeps an ordinary name readable", () => {
    expect(sanitiseFilename("Wanjiru and Kevin.jpg")).toBe("Wanjiru and Kevin.jpg");
  });

  it("never returns an empty string", () => {
    expect(sanitiseFilename("...")).toBe("image");
  });
});

/* ------------------------------------------------------------ service ---- */

describe("MediaService", () => {
  it("stores an image and serves back what it sniffed", async () => {
    const container = freshContainer();

    const asset = await container.media.upload(uploader(), {
      organizerId: ORG,
      purpose: MediaPurpose.EVENT_COVER,
      filename: "cover.png",
      bytes: png(1200, 800),
    });

    expect(asset.contentType).toBe("image/png");
    expect(asset.width).toBe(1200);
    expect(asset.height).toBe(800);
    expect(asset.url).toBe(`/api/v1/media/${asset.id}`);

    const read = await container.media.read(asset.id);
    expect(read?.object.contentType).toBe("image/png");
  });

  it("records the sniffed type, not the one the caller claimed", async () => {
    const container = freshContainer();

    // A JPEG uploaded as `logo.png`. The extension is a lie; the bytes are not.
    const asset = await container.media.upload(uploader(), {
      organizerId: ORG,
      purpose: MediaPurpose.EVENT_COVER,
      filename: "logo.png",
      bytes: jpeg(900, 900),
    });

    expect(asset.contentType).toBe("image/jpeg");
    expect(asset.storageKey.endsWith(".jpg")).toBe(true);
  });

  it("refuses a file that is not one of the three image formats", async () => {
    const container = freshContainer();

    await expect(
      container.media.upload(uploader(), {
        organizerId: ORG,
        purpose: MediaPurpose.EVENT_COVER,
        filename: "invitation.svg",
        bytes: bytesOf('<svg onload="alert(1)"></svg>'),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("refuses an image past the size limit", async () => {
    const container = freshContainer();
    const huge = new Uint8Array(9 * 1024 * 1024);
    huge.set(png(1000, 1000), 0);

    await expect(
      container.media.upload(uploader(), {
        organizerId: ORG,
        purpose: MediaPurpose.EVENT_COVER,
        filename: "huge.png",
        bytes: huge,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("refuses an image too small to print", async () => {
    const container = freshContainer();

    await expect(
      container.media.upload(uploader(), {
        organizerId: ORG,
        purpose: MediaPurpose.EVENT_COVER,
        filename: "pixel.png",
        bytes: png(1, 1),
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("reuses the asset when the same photograph is uploaded twice", async () => {
    const container = freshContainer();
    const bytes = png(1200, 800);

    const first = await container.media.upload(uploader(), {
      organizerId: ORG,
      purpose: MediaPurpose.EVENT_COVER,
      filename: "cover.png",
      bytes,
    });
    const second = await container.media.upload(uploader(), {
      organizerId: ORG,
      purpose: MediaPurpose.ECARD_PHOTO,
      filename: "cover-again.png",
      bytes,
    });

    expect(second.id).toBe(first.id);
    expect(await container.uow.repos.media.listByOrganizer(ORG)).toHaveLength(1);
  });

  it("keeps one organizer out of another's library", async () => {
    const container = freshContainer();

    const asset = await container.media.upload(uploader(), {
      organizerId: ORG,
      purpose: MediaPurpose.EVENT_COVER,
      filename: "cover.png",
      bytes: png(),
    });

    const intruder = actor({ organizerId: "org_someone_else", roles: ["ORGANIZER_OWNER"] });

    await expect(container.media.remove(intruder, asset.id)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    await expect(container.media.listFor(intruder, ORG)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("removes the bytes along with the record", async () => {
    const container = freshContainer();

    const asset = await container.media.upload(uploader(), {
      organizerId: ORG,
      purpose: MediaPurpose.EVENT_COVER,
      filename: "cover.png",
      bytes: png(),
    });

    await container.media.remove(uploader(), asset.id);

    expect(await container.media.read(asset.id)).toBeNull();
    expect(await container.uow.repos.media.findById(asset.id)).toBeNull();
  });

  it("writes an audit entry for every upload", async () => {
    const container = freshContainer();

    await container.media.upload(uploader(), {
      organizerId: ORG,
      purpose: MediaPurpose.EVENT_COVER,
      filename: "cover.png",
      bytes: png(),
    });

    const logs = await container.uow.repos.audit.listRecent(10);
    expect(logs.some((log) => log.action === "media.uploaded")).toBe(true);
  });
});

/* ------------------------------------------------------------ storage ---- */

describe("MemoryMediaStorage", () => {
  it("copies the buffer so a caller reusing it cannot corrupt what was stored", async () => {
    const storage = new MemoryMediaStorage();
    const bytes = new Uint8Array([1, 2, 3]);

    await storage.put("k", bytes, "image/png");
    bytes[0] = 99;

    expect((await storage.get("k"))?.bytes[0]).toBe(1);
  });
});
