/**
 * MEDIA REGISTRY VALIDATION.
 *
 * The media layer's whole job is that declaring an asset is enough. That only
 * holds if a declaration cannot be subtly wrong — a slug that does not exist,
 * a path that does not resolve, or dimensions that disagree with the file and
 * so reserve the wrong box and shift the page as it loads.
 *
 * None of that is visible in a type. All of it is checkable against the disk.
 *
 *   npm run check:media
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { products } from "../src/data/catalog/index.ts";
import { MEDIA } from "../src/content/media/registry.ts";

const PUBLIC = "public";
const IMAGE_TYPES = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);
const MODEL_TYPES = new Set([".glb"]);

/** Roles that hold a single image, and whether the role may be decorative. */
const IMAGE_ROLES = ["primary", "detail", "packaging", "poster"];

const failures = [];
const fail = (what, detail) => failures.push(`${what}: ${detail}`);

const slugs = new Set(products.map((p) => p.slug));

/* ------------------------------------------------------- intrinsic size ---
 *
 * Read straight out of the file header rather than via an image library: two
 * container formats cover everything we would realistically ship, and a
 * dependency for forty lines of parsing is a bad trade. Formats this cannot
 * read are skipped rather than guessed at.
 */
function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function jpegSize(buf) {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i++;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0-SOF15, excluding the non-frame markers DHT (c4), JPG (c8), DAC (cc).
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function intrinsicSize(file) {
  const ext = path.extname(file).toLowerCase();
  let buf;
  try {
    buf = readFileSync(file);
  } catch {
    return null;
  }
  if (ext === ".png") return pngSize(buf);
  if (ext === ".jpg" || ext === ".jpeg") return jpegSize(buf);
  return null; // webp/avif — declared dimensions are taken on trust
}

/* ------------------------------------------------------------- checking --- */

function checkImage(slug, role, image) {
  const where = `${slug}.${role}`;

  if (typeof image.src !== "string" || !image.src.startsWith("/")) {
    fail("src is not a public path", `${where} → ${JSON.stringify(image.src)}`);
    return;
  }

  const ext = path.extname(image.src).toLowerCase();
  if (!IMAGE_TYPES.has(ext)) {
    fail("unsupported image type", `${where} → "${ext}" (${[...IMAGE_TYPES].join(", ")})`);
  }

  const file = path.join(PUBLIC, image.src);
  if (!existsSync(file) || !statSync(file).isFile()) {
    fail("referenced image is missing", `${where} → ${file}`);
    return;
  }

  // Alt is typed as required, which stops it being forgotten but not being
  // emptied. An empty alt is valid ONLY as a deliberate decorative marker, and
  // a product photograph is never decorative.
  if (typeof image.alt !== "string" || image.alt.trim() === "") {
    fail("product image has no alt text", where);
  }

  if (!Number.isInteger(image.width) || !Number.isInteger(image.height)) {
    fail("width/height must be whole pixels", `${where} → ${image.width}x${image.height}`);
    return;
  }
  if (image.width <= 0 || image.height <= 0) {
    fail("width/height must be positive", `${where} → ${image.width}x${image.height}`);
    return;
  }

  const real = intrinsicSize(file);
  if (real && (real.width !== image.width || real.height !== image.height)) {
    fail(
      "declared size does not match the file",
      `${where} → declared ${image.width}x${image.height}, file is ${real.width}x${real.height}. ` +
        `next/image reserves the declared box, so this ships as a layout shift.`,
    );
  }
}

for (const [slug, entry] of Object.entries(MEDIA)) {
  if (!slugs.has(slug)) {
    fail("media declared for an unknown product", `"${slug}" is not a slug in the catalog`);
    continue;
  }

  const seen = new Map();

  for (const role of IMAGE_ROLES) {
    const image = entry[role];
    if (image === undefined || image === null) continue;
    checkImage(slug, role, image);
    seen.set(image.src, [...(seen.get(image.src) ?? []), role]);
  }

  const alternates = entry.alternates ?? [];
  if (!Array.isArray(alternates)) {
    fail("alternates must be an array", slug);
  } else {
    alternates.forEach((image, i) => {
      checkImage(slug, `alternates[${i}]`, image);
      seen.set(image.src, [...(seen.get(image.src) ?? []), `alternates[${i}]`]);
    });
  }

  /*
   * One file in two roles is always a mistake rather than a shortcut: the
   * surfaces treat the roles differently — `primary` becomes the social card,
   * `poster` becomes the 3D fallback — so the same bytes in both means one of
   * them is standing in for an asset that was never made.
   */
  for (const [src, roles] of seen) {
    if (roles.length > 1)
      fail("same file declared in two roles", `${slug} → ${src} (${roles.join(", ")})`);
  }

  if (entry.model !== undefined && entry.model !== null) {
    const ext = path.extname(entry.model).toLowerCase();
    if (!MODEL_TYPES.has(ext)) fail("unsupported model type", `${slug} → "${ext}" (.glb only)`);
    const file = path.join(PUBLIC, entry.model);
    if (!existsSync(file) || !statSync(file).isFile()) {
      fail("referenced model is missing", `${slug} → ${file}`);
    }
  }

  /* A poster is the still of a live scene. Without a model there is no scene,
     and the image is being used as photography under the wrong role. */
  if (entry.poster && !entry.model) {
    fail("poster declared without a model", `${slug} — a poster is a still of the 3D scene`);
  }
}

/* ---------------------------------------------------------------- report --- */

const declared = Object.keys(MEDIA).length;
const withPhoto = Object.values(MEDIA).filter((m) => m.primary).length;
const withModel = Object.values(MEDIA).filter((m) => m.model).length;
const summary = `${declared} product(s) with declared media / ${withPhoto} with photography / ${withModel} with a model / ${products.length} products in the catalog`;

if (failures.length) {
  console.error(`\nmedia check FAILED — ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ${f}`);
  console.error(`\n${summary}\n`);
  process.exit(1);
}
console.log(`media check passed — ${summary}`);
