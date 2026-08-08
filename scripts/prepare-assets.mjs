/**
 * Asset preparation.
 *
 * The supplied photography in `public/assets/images/source/` was cropped out of
 * the concept board, which left every photo with a white border and a maximum
 * height of 130px. Used directly they show a pale strip along each edge and go
 * soft the moment they are scaled past thumbnail size.
 *
 * This script fixes both, once, so no component has to compensate:
 *   1. trim the flat border the crop left behind,
 *   2. upscale with Lanczos and a light unsharp mask,
 *   3. re-encode as high-quality WebP plus a JPEG fallback.
 *
 * Run it after replacing any source photograph:
 *     node scripts/prepare-assets.mjs
 *
 * When real production photography arrives, drop it into `source/` at full
 * resolution and re-run — the upscale becomes a no-op and everything downstream
 * keeps working.
 */
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCE_DIR = path.join(ROOT, "public/assets/images/source");
const OUT_DIR = path.join(ROOT, "public/assets/images");

/** Target height. Cards render ~190px tall at 2x DPR, so 640 leaves headroom. */
const TARGET_HEIGHT = 640;

/** Fraction cropped from each edge to clear the board's rounded photo frame. */
const INSET = 0.07;

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const files = (await readdir(SOURCE_DIR)).filter((file) => /\.(jpe?g|png)$/i.test(file));
  if (files.length === 0) {
    console.log("No source images found — nothing to do.");
    return;
  }

  for (const file of files) {
    const inputPath = path.join(SOURCE_DIR, file);
    const base = file.replace(/\.(jpe?g|png)$/i, "");

    // `trim` takes off the flat outer margin, but the board drew each photo in
    // a rounded frame, so the corners survive it. An inset crop removes what is
    // left; the photographs are wide enough that losing 7% of each edge costs
    // nothing compositionally.
    const trimmed = await sharp(inputPath)
      .trim({ threshold: 18 })
      .toBuffer({ resolveWithObject: true });

    const trimmedWidth = trimmed.info.width;
    const trimmedHeight = trimmed.info.height;
    const insetX = Math.round(trimmedWidth * INSET);
    const insetY = Math.round(trimmedHeight * INSET);

    const cropped = await sharp(trimmed.data)
      .extract({
        left: insetX,
        top: insetY,
        width: trimmedWidth - insetX * 2,
        height: trimmedHeight - insetY * 2,
      })
      .toBuffer({ resolveWithObject: true });

    const width = cropped.info.width;
    const height = cropped.info.height;

    const scale = Math.max(1, TARGET_HEIGHT / height);
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const resized = sharp(cropped.data)
      .resize(targetWidth, targetHeight, { kernel: sharp.kernel.lanczos3 })
      // Upscaling always softens; a restrained unsharp mask buys back the edge
      // definition without producing halos.
      .sharpen({ sigma: 1.0, m1: 0.6, m2: 2.2 });

    await resized.clone().webp({ quality: 88, effort: 6 }).toFile(path.join(OUT_DIR, `${base}.webp`));
    await resized.clone().jpeg({ quality: 90, mozjpeg: true }).toFile(path.join(OUT_DIR, `${base}.jpg`));

    console.log(
      `${file}: ${width}×${height} (trimmed) → ${targetWidth}×${targetHeight}`,
    );
  }
}

await main();
