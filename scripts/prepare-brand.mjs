/**
 * TURN THE OWNER'S BRAND FILES INTO WEB ASSETS.
 *
 *   node scripts/prepare-brand.mjs
 *
 * The owner supplies two PNGs, exported from the brand artwork and dropped into
 * `public/branding/` under their human names:
 *
 *   NEOGEN Branding.png    the mark alone — the molecule
 *   NEOGEN Full Logo.png   the lockup — mark + NEOGEN / PEPTIDES
 *
 * Both are pure black (0,0,0) on a real alpha channel, which is the useful part:
 * an all-black image with alpha is an ALPHA MASK, so the same file can be ink on
 * the light header, paper on the dark footer, and printed ink on a label, with
 * no second export and no colour baked in. Nothing here recolours or redraws the
 * artwork — it only trims and reframes it.
 *
 * WHY THE SOURCES ARE NOT USED DIRECTLY. Each carries a wide, uneven margin
 * (the mark's ink is 389×485 inside a 447×531 sheet, off-centre). Laying that
 * out means compensating for the margin at every call site, and the compensation
 * silently becomes wrong the next time the owner re-exports. Trimming to the ink
 * once, here, makes the file's box the artwork's box.
 *
 * Writes:
 *   public/branding/neogen-mark.png   the mark, trimmed to its ink
 *   public/branding/neogen-logo.png   the lockup, trimmed to its ink
 *   src/app/icon.png                  the favicon: paper mark on charcoal
 *
 * Re-run it after the owner replaces either source; commit what it writes.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

/** The brand's two inks, as `tokens/color.css` sets them. */
const CHARCOAL = { r: 0x11, g: 0x11, b: 0x11, alpha: 1 };
const PAPER = { r: 0xfa, g: 0xf9, b: 0xf6, alpha: 1 };

/** The favicon: a square of this size, with the mark at this share of it. */
const ICON = 512;
const ICON_MARK = 0.62;

/** Alpha at or below this is background, not a feathered edge. */
const EDGE = 8;

const SOURCES = {
  mark: "public/branding/NEOGEN Branding.png",
  logo: "public/branding/NEOGEN Full Logo.png",
};

/**
 * The tight box of everything with ink in it.
 *
 * `sharp.trim()` would nearly do this, but it decides what to remove from the
 * corner pixel's colour and a threshold, and on a feathered mark that quietly
 * eats the antialiased edge. Reading the alpha channel is exact.
 */
async function inkBox(file) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * channels + 3] <= EDGE) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) throw new Error(`${file} has no opaque pixel — is it an empty export?`);
  return { left, top, width: right - left + 1, height: bottom - top + 1, sheet: { width, height } };
}

/** The artwork's own box, as a PNG whose edges are the ink's edges. */
async function trim(file, out) {
  const box = await inkBox(file);
  await sharp(file)
    .ensureAlpha()
    .extract({ left: box.left, top: box.top, width: box.width, height: box.height })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(
    `  ${out}  ${box.width}×${box.height}` +
      `  (trimmed from ${box.sheet.width}×${box.sheet.height})`,
  );
  return box;
}

/**
 * The favicon — the mark in paper on a charcoal square.
 *
 * It replaces a hand-drawn dot that stood in for the mark while there was no
 * mark to use. The mark survives the reduction because it is five filled
 * circles: at 16px it reads as a cluster, which is the right amount of the
 * identity to keep at that size.
 */
async function icon(markFile, out) {
  const source = sharp(markFile);
  const { width, height } = await source.metadata();
  const scale = (ICON * ICON_MARK) / Math.max(width, height);
  const drawn = {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
  // The mark is black-on-alpha, so its own colour is discarded and the alpha is
  // re-inked in paper: `tint` would multiply against black and stay black.
  const paper = await sharp(await source.resize(drawn).png().toBuffer())
    .ensureAlpha()
    .composite([{ input: { create: { ...drawn, channels: 4, background: PAPER } }, blend: "in" }])
    .png()
    .toBuffer();

  mkdirSync(path.dirname(out), { recursive: true });
  await sharp({ create: { width: ICON, height: ICON, channels: 4, background: CHARCOAL } })
    .composite([
      {
        input: paper,
        left: Math.round((ICON - drawn.width) / 2),
        top: Math.round((ICON - drawn.height) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(`  ${out}  ${ICON}×${ICON}  (mark ${drawn.width}×${drawn.height})`);
}

for (const file of Object.values(SOURCES)) {
  if (existsSync(file)) continue;
  console.error(
    `${file} is missing.\n` +
      "This script reads the owner's brand exports; it cannot reconstruct them.",
  );
  process.exit(1);
}

console.log("brand assets:");
await trim(SOURCES.mark, "public/branding/neogen-mark.png");
await trim(SOURCES.logo, "public/branding/neogen-logo.png");
await icon("public/branding/neogen-mark.png", "src/app/icon.png");
