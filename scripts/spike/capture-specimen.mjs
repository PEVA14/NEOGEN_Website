/**
 * SPIKE — vial transition. Photographs a product's studio still as TWO layers.
 *
 *   npm run dev
 *   node scripts/spike/capture-specimen.mjs reta glow ghk-cu
 *   node scripts/spike/capture-specimen.mjs semaglutide \
 *     --query "model=/models/semaglutide-v1.glb&label=printed&yaw=0"
 *
 * The catalogue card shows ONE flat still, with the vial and its set baked
 * together. To move the vial between pages while its set stays behind, the two
 * have to be separate pictures that recombine into exactly that still:
 *
 *   ground.jpg     the set without the upright object — sweep, floor, and the
 *                  object's reflection and contact shadow, which belong to the
 *                  floor and are what the specimen leaves behind
 *   specimen.png   the object alone, cut out with the renderer's own
 *                  antialiased silhouette as alpha, cropped to its box
 *
 * All three passes are the same frame from the same camera in one page load,
 * so they register to the pixel. The script checks that: ground + specimen,
 * recomposed, must reproduce the plain still.
 *
 * Writes public/spike/vial-transition/<slug>/ and the manifest
 * src/spike/vial-transition/specimens.json (the box, as fractions of the
 * frame, is what lets a page place the cut-out without measuring anything).
 *
 * Delete with the rest of the spike: this folder, public/spike/, src/spike/.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";
import sharp from "sharp";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const slugs = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const base = flag("base", "http://localhost:3000");
const query = flag("query", "");
const width = 800; // CSS px; the frame is 4:5 at 2x → 1600 × 2000, as the stills are

const OUT = "public/spike/vial-transition";
const MANIFEST = "src/spike/vial-transition/specimens.json";
/** Alpha at or below this is outside the object. */
const EDGE = 8;
/** Kept around the silhouette so the antialiased edge is never cropped. */
const PAD = 6;

if (!slugs.length) {
  console.error("usage: node scripts/spike/capture-specimen.mjs <slug>... [--query …]");
  process.exit(1);
}

const decode = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
let failures = 0;

try {
  for (const slug of slugs) {
    const page = await browser.newPage({ viewport: { width: 900, height: 1300 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const url = `${base}/es/estudio/${slug}?w=${width}&dpr=2${query ? `&${query}` : ""}`;
    await page.goto(url, { waitUntil: "load" });
    await page.waitForFunction(() => window.__studio?.ready === true, null, { timeout: 180_000 });
    const [full, ground, mask] = await page.evaluate(() => [
      window.__studio.capture(),
      window.__studio.captureGround(),
      window.__studio.captureMask(),
    ]);
    await page.close();
    if (errors.length) console.error(`  ! ${slug}: ${errors.slice(0, 2).join(" | ")}`);

    const fullBuf = decode(full);
    const maskBuf = decode(mask);
    const { width: W, height: H } = await sharp(fullBuf).metadata();

    // The silhouette as one grey channel, and its box.
    const alpha = await sharp(maskBuf).removeAlpha().greyscale().raw().toBuffer();
    let x0 = W;
    let y0 = H;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (alpha[y * W + x] <= EDGE) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) {
      console.error(`  ! ${slug}: the mask pass is empty — is the object tagged?`);
      failures += 1;
      continue;
    }
    const box = {
      left: Math.max(0, x0 - PAD),
      top: Math.max(0, y0 - PAD),
      width: Math.min(W, x1 + PAD + 1) - Math.max(0, x0 - PAD),
      height: Math.min(H, y1 + PAD + 1) - Math.max(0, y0 - PAD),
    };

    const dir = path.join(OUT, slug);
    mkdirSync(dir, { recursive: true });

    await sharp(decode(ground))
      .removeAlpha()
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(path.join(dir, "ground.jpg"));

    // Interleaved by hand: sharp applies `removeAlpha` at OUTPUT, after any
    // `joinChannel`, so chaining them silently drops the alpha just joined.
    const rgb = await sharp(fullBuf).removeAlpha().raw().toBuffer();
    const rgba = Buffer.alloc(W * H * 4);
    for (let i = 0, j = 0; i < W * H; i += 1, j += 3) {
      rgba[i * 4] = rgb[j];
      rgba[i * 4 + 1] = rgb[j + 1];
      rgba[i * 4 + 2] = rgb[j + 2];
      rgba[i * 4 + 3] = alpha[i];
    }
    const specimen = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
      .extract(box)
      .png({ compressionLevel: 9 })
      .toBuffer();
    writeFileSync(path.join(dir, "specimen.png"), specimen);

    // REGISTRATION CHECK: the two layers, recombined, against the plain still.
    const recomposed = await sharp(decode(ground))
      .removeAlpha()
      .composite([{ input: specimen, left: box.left, top: box.top }])
      .raw()
      .toBuffer();
    const reference = await sharp(fullBuf).removeAlpha().raw().toBuffer();
    let worst = 0;
    let sum = 0;
    for (let i = 0; i < reference.length; i += 1) {
      const d = Math.abs(reference[i] - recomposed[i]);
      sum += d;
      if (d > worst) worst = d;
    }
    const mean = sum / reference.length;

    manifest[slug] = {
      ground: `/spike/vial-transition/${slug}/ground.jpg`,
      specimen: `/spike/vial-transition/${slug}/specimen.png`,
      frame: { width: W, height: H },
      /* The cut-out's box, in frame pixels and as fractions of the frame. */
      box: {
        ...box,
        x: box.left / W,
        y: box.top / H,
        w: box.width / W,
        h: box.height / H,
      },
      /* The silhouette alone (no padding), for sizing against the 3D object. */
      object: { x: x0 / W, y: y0 / H, w: (x1 - x0 + 1) / W, h: (y1 - y0 + 1) / H },
      query: query || null,
    };
    console.log(
      `  ${slug}: specimen ${box.width}×${box.height} at (${box.left}, ${box.top}); ` +
        `object ${(manifest[slug].object.h * 100).toFixed(1)}% of frame height; ` +
        `recomposition error mean ${mean.toFixed(2)}, worst ${worst}`,
    );
  }
} finally {
  await browser.close();
}

mkdirSync(path.dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
process.exit(failures ? 1 : 0);
