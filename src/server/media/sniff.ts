import type { AllowedImageType } from "@/domain/media";

/**
 * Format detection and dimension reading, straight from the bytes.
 *
 * The client's `Content-Type` and the filename are both attacker-controlled and
 * neither is consulted here. What a file *is* comes from its header, which is
 * why an HTML document renamed `photo.jpg` and posted as `image/jpeg` is
 * rejected: it has no JPEG signature.
 *
 * Reading the intrinsic size does double duty. It gives the studio real numbers
 * to crop against, and it is a second proof of format — a truncated or forged
 * file usually survives a four-byte signature check and then fails to yield a
 * sane width and height.
 *
 * Everything is parsed by hand rather than with `sharp` or `image-size`: the
 * three formats the product accepts need about eighty lines between them, and a
 * native image decoder is a large amount of C running against hostile input.
 */

export interface ImageProbe {
  contentType: AllowedImageType;
  width: number;
  height: number;
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function startsWith(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false;
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return "";
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

/* ------------------------------------------------------------------- PNG -- */

/**
 * IHDR is mandatory and must be the first chunk, so width and height sit at
 * fixed offsets: 8 bytes of signature, 4 of chunk length, 4 of chunk type.
 */
function probePng(bytes: Uint8Array): ImageProbe | null {
  if (!startsWith(bytes, PNG_SIGNATURE)) return null;
  if (bytes.length < 24) return null;
  if (ascii(bytes, 12, 4) !== "IHDR") return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    contentType: "image/png",
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

/* ------------------------------------------------------------------ JPEG -- */

/**
 * A JPEG is a chain of marker segments. Walk it until a Start Of Frame marker
 * appears — any of SOF0–SOF15 except the three that are not frame headers —
 * and read the size out of it.
 */
function probeJpeg(bytes: Uint8Array): ImageProbe | null {
  if (!startsWith(bytes, JPEG_SIGNATURE)) return null;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;

  while (offset + 3 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1]!;

    // Padding and standalone markers carry no length field.
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
      offset += 2;
      continue;
    }

    const length = view.getUint16(offset + 2, false);
    if (length < 2) return null;

    const isFrameHeader =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 && // DHT — Huffman table
      marker !== 0xc8 && // JPG — reserved
      marker !== 0xcc; // DAC — arithmetic coding conditioning

    if (isFrameHeader) {
      if (offset + 9 > bytes.length) return null;
      return {
        contentType: "image/jpeg",
        height: view.getUint16(offset + 5, false),
        width: view.getUint16(offset + 7, false),
      };
    }

    offset += 2 + length;
  }

  return null;
}

/* ------------------------------------------------------------------ WebP -- */

/**
 * WebP is a RIFF container with three possible payloads, each storing the size
 * differently: VP8 (lossy), VP8L (lossless) and VP8X (extended, which fronts
 * the canvas size for animation and alpha).
 */
function probeWebp(bytes: Uint8Array): ImageProbe | null {
  if (ascii(bytes, 0, 4) !== "RIFF" || ascii(bytes, 8, 4) !== "WEBP") return null;
  if (bytes.length < 30) return null;

  const chunk = ascii(bytes, 12, 4);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (chunk === "VP8X") {
    // Canvas size is stored minus one, as two 24-bit little-endian integers.
    const width = (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16)) + 1;
    const height = (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16)) + 1;
    return { contentType: "image/webp", width, height };
  }

  if (chunk === "VP8 ") {
    // 3-byte frame tag, then the 3-byte start code, then two 16-bit sizes
    // whose top two bits are the scale factor.
    if (bytes[23] !== 0x9d || bytes[24] !== 0x01 || bytes[25] !== 0x2a) return null;
    return {
      contentType: "image/webp",
      width: view.getUint16(26, true) & 0x3fff,
      height: view.getUint16(28, true) & 0x3fff,
    };
  }

  if (chunk === "VP8L") {
    if (bytes[20] !== 0x2f) return null;
    // 14 bits of width-1 then 14 bits of height-1, packed little-endian.
    const packed =
      bytes[21]! | (bytes[22]! << 8) | (bytes[23]! << 16) | (bytes[24]! << 24);
    return {
      contentType: "image/webp",
      width: (packed & 0x3fff) + 1,
      height: ((packed >> 14) & 0x3fff) + 1,
    };
  }

  return null;
}

/**
 * Identifies an upload, or returns null if it is not one of the three formats
 * the product accepts. A null result is a rejection — never a reason to fall
 * back to what the client claimed the file was.
 */
export function probeImage(bytes: Uint8Array): ImageProbe | null {
  const probe = probePng(bytes) ?? probeJpeg(bytes) ?? probeWebp(bytes);
  if (!probe) return null;
  if (!Number.isFinite(probe.width) || !Number.isFinite(probe.height)) return null;
  if (probe.width <= 0 || probe.height <= 0) return null;
  return probe;
}
