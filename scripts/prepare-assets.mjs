/**
 * Asset preparation.
 *
 * `public/assets/images/source/` holds the master photographs — full
 * resolution, framed 16:9, one file per name. This script derives what the app
 * actually serves into `public/assets/images/`:
 *   1. resize down to the delivery ceiling (never up),
 *   2. re-encode as high-quality WebP plus a JPEG fallback.
 *
 * Run it after replacing any source photograph:
 *     npm run assets
 *
 * Board crops
 * -----------
 * The first pass of this project shipped photography cropped out of the concept
 * board: every photo carried a white frame and topped out at 130px tall. Those
 * needed repairing before they were usable — trim the flat border, inset past
 * the board's rounded photo frame, upscale with Lanczos and an unsharp mask.
 * The masters no longer need any of that, and running it on them would shave 7%
 * off each edge and let `trim` eat into flat sky. So the repair is now gated on
 * the tell-tale of a board crop — a source shorter than `BOARD_CROP_MAX_HEIGHT`
 * — and real photography skips straight to encoding.
 */
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_DIR = path.join(ROOT, "public/assets/images/source");
const OUT_DIR = path.join(ROOT, "public/assets/images");

/**
 * Widest file we ship. The hero renders at 100vw and event pages at 21:9, so
 * 2000px still covers a 2x laptop; `next/image` derives everything narrower.
 */
const DELIVERY_MAX_WIDTH = 2000;

/** A source no taller than this is a concept-board crop, not photography. */
const BOARD_CROP_MAX_HEIGHT = 400;

/** Height board crops are upscaled to, once repaired. */
const BOARD_CROP_TARGET_HEIGHT = 640;

/** Fraction cropped from each edge to clear the board's rounded photo frame. */
const BOARD_CROP_INSET = 0.07;

/**
 * Undo the concept-board crop: strip the flat white margin, then inset past the
 * rounded corners `trim` leaves behind, then upscale to a usable size.
 * Returns a pipeline plus the dimensions it started from, for the log line.
 */
async function repairBoardCrop(inputPath) {
  const trimmed = await sharp(inputPath)
    .trim({ threshold: 18 })
    .toBuffer({ resolveWithObject: true });

  const insetX = Math.round(trimmed.info.width * BOARD_CROP_INSET);
  const insetY = Math.round(trimmed.info.height * BOARD_CROP_INSET);

  const cropped = await sharp(trimmed.data)
    .extract({
      left: insetX,
      top: insetY,
      width: trimmed.info.width - insetX * 2,
      height: trimmed.info.height - insetY * 2,
    })
    .toBuffer({ resolveWithObject: true });

  const { width, height } = cropped.info;
  const scale = Math.max(1, BOARD_CROP_TARGET_HEIGHT / height);

  return {
    from: `${width}×${height} board crop`,
    width: Math.round(width * scale),
    height: Math.round(height * scale),
    pipeline: sharp(cropped.data)
      .resize(Math.round(width * scale), Math.round(height * scale), {
        kernel: sharp.kernel.lanczos3,
      })
      // Upscaling always softens; a restrained unsharp mask buys back the edge
      // definition without producing halos.
      .sharpen({ sigma: 1.0, m1: 0.6, m2: 2.2 }),
  };
}

/** Bring a full-resolution photograph down to the delivery ceiling. */
async function preparePhotograph(inputPath, metadata) {
  const width = Math.min(metadata.width, DELIVERY_MAX_WIDTH);
  const height = Math.round((metadata.height * width) / metadata.width);

  return {
    from: `${metadata.width}×${metadata.height}`,
    width,
    height,
    // `withoutEnlargement` makes an already-small master a straight re-encode.
    pipeline: sharp(inputPath).resize(width, height, {
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: true,
    }),
  };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const files = (await readdir(SOURCE_DIR)).filter((file) => /\.(jpe?g|png)$/i.test(file));
  if (files.length === 0) {
    console.log("No source images found — nothing to do.");
    return;
  }

  for (const file of files.sort()) {
    const inputPath = path.join(SOURCE_DIR, file);
    const base = file.replace(/\.(jpe?g|png)$/i, "");

    const metadata = await sharp(inputPath).metadata();
    const { from, width, height, pipeline } =
      metadata.height <= BOARD_CROP_MAX_HEIGHT
        ? await repairBoardCrop(inputPath)
        : await preparePhotograph(inputPath, metadata);

    await pipeline.clone().webp({ quality: 88, effort: 6 }).toFile(path.join(OUT_DIR, `${base}.webp`));
    await pipeline.clone().jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(OUT_DIR, `${base}.jpg`));

    console.log(`${file}: ${from} → ${width}×${height}`);
  }
}

await main();
