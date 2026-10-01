/**
 * THE VIAL TRANSITION'S PICTURES. Photographs a product's studio still as TWO
 * layers (`components/vial-transition`).
 *
 *   npm run dev
 *   npm run capture:specimen -- reta glow ghk-cu
 *   npm run capture:specimen -- semaglutide \
 *     --query "model=/models/semaglutide-v1.glb&label=printed&yaw=0"
 *
 * RE-RUN IT WHENEVER A STUDIO STILL IS RE-RENDERED. The layers are named after
 * the still they split (`studio-v10.jpg` → `studio-v10-ground.jpg`,
 * `studio-v10-specimen.png`), and `check:media` fails while a product's
 * declared still and its layers disagree.
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
 *   npm run capture:specimen -- reta glow ghk-cu --stage
 *
 * `--stage` photographs the flagship's STAND-IN instead: the live vial on its
 * product page (`ProductStage`), as its first frame draws it — the canvas's
 * own pixels, cut to the vial, so the stand-in IS the frame it dissolves
 * into. Named after the model (`stand-in-reta-v7.png`); `check:media` fails
 * when the product's model or `LIVE_FRAME_MARGIN` changes without a re-take.
 * Re-take it too after changing the presenter's lighting, materials or pose:
 * nothing can check those.
 *
 * It also checks the pair against the REGISTERED still on disk, which is what
 * the catalogue card shows: a large error means the studio scene no longer
 * renders what was captured, and the still needs re-rendering first.
 *
 * Writes the two layers beside the still in public/images/products/<slug>/,
 * and the manifest src/components/vial-transition/specimens.json (the box, as
 * fractions of the frame, is what lets a page place the cut-out without
 * measuring anything).
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";
import sharp from "sharp";

import { MEDIA } from "../src/content/media/registry.ts";
import { LIVE_FRAME_MARGIN } from "../src/components/product/liveFrame.ts";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
/** Flags that take no value. */
const SWITCHES = new Set(["--stage"]);
const slugs = args.filter(
  (a, i) => !a.startsWith("--") && (!args[i - 1]?.startsWith("--") || SWITCHES.has(args[i - 1])),
);
const stageOnly = args.includes("--stage");
const base = flag("base", "http://localhost:3000");
const query = flag("query", "");
const width = 800; // CSS px; the frame is 4:5 at 2x → 1600 × 2000, as the stills are

const MANIFEST = "src/components/vial-transition/specimens.json";
/** Alpha at or below this is outside the object. */
const EDGE = 8;
/** Kept around the silhouette so the antialiased edge is never cropped. */
const PAD = 6;
/*
 * Mean difference (0–255) between the served layers, recombined, and the
 * registered still. JPEG noise alone measures 0.4–0.6.
 */
const STILL_DRIFT = 2;

if (!slugs.length) {
  console.error("usage: npm run capture:specimen -- <slug>... [--query …] [--stage]");
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
    if (stageOnly) {
      if (!(await captureStage(slug))) failures += 1;
      continue;
    }
    // The layers are named after the still they split.
    const still = MEDIA[slug]?.studio?.src;
    if (!still) {
      console.error(`  ! ${slug}: no studio still is declared in content/media/registry.ts`);
      failures += 1;
      continue;
    }
    const stem = path.posix.basename(still, path.posix.extname(still));
    const folder = path.posix.dirname(still);
    const groundSrc = `${folder}/${stem}-ground.jpg`;
    const specimenSrc = `${folder}/${stem}-specimen.png`;

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

    mkdirSync(path.join("public", folder), { recursive: true });

    await sharp(decode(ground))
      .removeAlpha()
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(path.join("public", groundSrc));

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
    writeFileSync(path.join("public", specimenSrc), specimen);

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

    // And the files as written, against the still the catalogue card shows.
    const registered = await sharp(path.join("public", still)).removeAlpha().raw().toBuffer();
    const served = await sharp(path.join("public", groundSrc))
      .removeAlpha()
      .composite([{ input: specimen, left: box.left, top: box.top }])
      .raw()
      .toBuffer();
    let drift = 0;
    for (let i = 0; i < registered.length; i += 1) drift += Math.abs(registered[i] - served[i]);
    drift /= registered.length;
    if (drift > STILL_DRIFT) {
      console.error(
        `  ! ${slug}: the layers differ from ${still} by ${drift.toFixed(2)} on average — ` +
          "the studio scene no longer renders that still; re-render it first",
      );
      failures += 1;
    }

    manifest[slug] = {
      ground: groundSrc,
      specimen: specimenSrc,
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
        `recomposition error mean ${mean.toFixed(2)}, worst ${worst}; ` +
        `against ${still}: mean ${drift.toFixed(2)}`,
    );
  }
} finally {
  await browser.close();
}

/*
 * THE STAND-IN. The product page draws the flagship in a canvas that is the
 * media frame grown by LIVE_FRAME_MARGIN, with the vial at its centre; with
 * reduced motion it holds the pose a normal visit's first frame shows. That
 * canvas, alone on a transparent page, is the stand-in — cropped to the vial
 * and placed back by its box, in fractions of the media frame.
 *
 * Also measured, for the flight: the vial's lean ON SCREEN (its silhouette's
 * long axis) and its box when stood upright, so the page can carry it
 * upright off the card and turn it to this lean as it lands.
 */
async function captureStage(slug) {
  const model = MEDIA[slug]?.model;
  if (!model) {
    console.error(`  ! ${slug}: no model is declared, so there is no live vial to photograph`);
    return false;
  }
  if (!manifest[slug]) {
    console.error(`  ! ${slug}: cut its studio still first (without --stage)`);
    return false;
  }
  const src = `/images/products/${slug}/stand-in-${path.posix.basename(model, ".glb")}.png`;
  const m = LIVE_FRAME_MARGIN;

  // Large enough that the frame is at its widest (34rem), at the presenter's
  // pixel ratio cap.
  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/es/productos/${slug}`, { waitUntil: "load" });
  await page.waitForSelector("canvas", { timeout: 180_000 });
  await page.addStyleTag({
    content:
      "html,body{background:transparent!important}" +
      "body *{visibility:hidden!important;transition:none!important}" +
      "canvas{visibility:visible!important}",
  });

  // Wait for the vial to be drawn and to hold still.
  let png = null;
  let previous = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await page.waitForTimeout(1000);
    const shot = await page.locator("canvas").screenshot({ omitBackground: true });
    const alpha = await sharp(shot).ensureAlpha().extractChannel(3).raw().toBuffer();
    const covered = alpha.reduce((n, a) => n + (a > EDGE ? 1 : 0), 0);
    if (covered > 0 && previous !== null && Math.abs(covered - previous) <= covered * 0.001) {
      png = shot;
      break;
    }
    previous = covered;
  }
  await page.close();
  if (errors.length) console.error(`  ! ${slug}: ${errors.slice(0, 2).join(" | ")}`);
  if (!png) {
    console.error(`  ! ${slug}: the live vial never drew (is the dev server up?)`);
    return false;
  }

  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  if (Math.abs(W / H - 4 / 5) > 0.01) {
    console.error(
      `  ! ${slug}: the canvas is ${W}×${H}, not the 4:5 live box — has the layout changed?`,
    );
    return false;
  }

  // Silhouette: box, centroid and second moments.
  let x0 = W;
  let y0 = H;
  let x1 = -1;
  let y1 = -1;
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (data[(y * W + x) * 4 + 3] <= EDGE) continue;
      n += 1;
      sx += x;
      sy += y;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const mx = sx / n;
  const my = sy / n;
  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (data[(y * W + x) * 4 + 3] <= EDGE) continue;
      cxx += (x - mx) ** 2;
      cyy += (y - my) ** 2;
      cxy += (x - mx) * (y - my);
    }
  }
  // The long axis, pointing up the screen; its lean is clockwise from vertical.
  const phi = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  let ax = Math.cos(phi);
  let ay = Math.sin(phi);
  if (ay > 0) {
    ax = -ax;
    ay = -ay;
  }
  const lean = Math.atan2(ax, -ay);

  // Stood upright (turned back by the lean about the centroid): its box.
  const cos = Math.cos(lean);
  const sin = Math.sin(lean);
  let u0 = Infinity;
  let u1 = -Infinity;
  let v0 = Infinity;
  let v1 = -Infinity;
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      if (data[(y * W + x) * 4 + 3] <= EDGE) continue;
      const dx = x - mx;
      const dy = y - my;
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      if (u < u0) u0 = u;
      if (u > u1) u1 = u;
      if (v < v0) v0 = v;
      if (v > v1) v1 = v;
    }
  }
  const pad = PAD * 2;
  const uc = (u0 + u1) / 2;
  const vc = (v0 + v1) / 2;
  const centre = { x: mx + uc * cos - vc * sin, y: my + uc * sin + vc * cos };
  const upright = { w: u1 - u0 + 1 + 2 * pad, h: v1 - v0 + 1 + 2 * pad };

  const crop = {
    left: Math.max(0, x0 - pad),
    top: Math.max(0, y0 - pad),
    width: Math.min(W, x1 + pad + 1) - Math.max(0, x0 - pad),
    height: Math.min(H, y1 + pad + 1) - Math.max(0, y0 - pad),
  };
  await sharp(png).extract(crop).png({ compressionLevel: 9 }).toFile(path.join("public", src));

  // Canvas pixels → fractions of the MEDIA FRAME (the canvas is the frame
  // grown by m on every side).
  const fx = (x) => (x / W) * (1 + 2 * m) - m;
  const fy = (y) => (y / H) * (1 + 2 * m) - m;
  const sw = (w) => (w / W) * (1 + 2 * m);
  const sh = (h) => (h / H) * (1 + 2 * m);
  const round = (v) => Math.round(v * 1e5) / 1e5;
  manifest[slug].stage = {
    src,
    model,
    margin: m,
    lean: round((lean * 180) / Math.PI),
    pixels: { width: crop.width, height: crop.height },
    crop: {
      x: round(fx(crop.left)),
      y: round(fy(crop.top)),
      w: round(sw(crop.width)),
      h: round(sh(crop.height)),
    },
    centre: { x: round(fx(centre.x)), y: round(fy(centre.y)) },
    upright: { w: round(sw(upright.w)), h: round(sh(upright.h)) },
  };
  console.log(
    `  ${slug}: stand-in ${crop.width}×${crop.height} from a ${W}×${H} canvas; ` +
      `lean ${manifest[slug].stage.lean.toFixed(2)}°; ` +
      `upright ${(manifest[slug].stage.upright.h * 100).toFixed(1)}% of the frame's height`,
  );
  return true;
}

mkdirSync(path.dirname(MANIFEST), { recursive: true });
writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
process.exit(failures ? 1 : 0);
