/**
 * PHOTOGRAPH THE HOMEPAGE'S VIALS — each stage's first frame, for its stand-in.
 *
 *   npm run build && npx next start -p 3110       # or npm run dev
 *   npm run capture:home -- --base http://localhost:3110
 *
 * The homepage shows the vial live in four stages (the hero, the RETA scene,
 * the GLOW and GHK-Cu moments). Until the shared canvas has drawn a stage,
 * that stage shows a photograph of the frame the canvas is about to draw
 * (`components/experience/StageStandIn`), so the section is whole from the
 * first paint and the live vial replaces the photograph unseen.
 *
 * The frame is the stage's REDUCED-MOTION frame: one frame, the resting pose,
 * no turn — and, by construction, the pose a moving stage draws first (the
 * hero rests at progress 0, the moments and the RETA scene at their held
 * pose, and every turntable starts at zero). So this opens the homepage in
 * reduced motion, centres each stage, hides everything but the canvas,
 * photographs it with its transparency, crops to the vial and records where
 * the crop sits in the canvas — in canvas HEIGHTS, from the point the track
 * anchors the vial (the canvas's centre, moved by the track's horizontal
 * offset in canvas WIDTHS), so it holds at any box size.
 *
 * Shots:
 *   full     hero, GLOW, GHK-Cu        1440 × 900
 *   compact  hero, RETA                402 × 874 phone
 * The moments use one shot on both tiers (their track is the same, and the
 * vial follows the box's height). The RETA scene has no full-tier shot: there
 * the canvas paints the whole scene, and is drawn before the section arrives.
 *
 * Writes `public/images/home/<stage>-<tier>-<model>.webp` and
 * `components/experience/homeStandIns.json`. Version the files with the model
 * (a new model, a new name): images are cached for a year.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";
import sharp from "sharp";

import {
  poseTrack,
  restingProgress,
  sampleTrack,
} from "../src/components/experience/choreography.ts";
import { MEDIA } from "../src/content/media/registry.ts";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const base = flag("base", "http://localhost:3000");

const MANIFEST = "src/components/experience/homeStandIns.json";
const OUT = "public/images/home";
/** Alpha at or below this is outside the shot — low, to keep the hero's halo whole. */
const EDGE = 1;
/** Kept around the silhouette so the antialiased edge is never cropped. */
const PAD = 6;

/* The homepage canvas draws at 1.5× on both tiers here; photographing at the
   same ratio keeps the stand-in exactly as sharp as the vial it stands for. */
const TIERS = {
  full: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 },
  compact: {
    viewport: { width: 402, height: 874 },
    deviceScaleFactor: 1.5,
    isMobile: true,
    hasTouch: true,
  },
};

const STAGES = [
  { stage: "hero", variant: "hero", product: "reta", tiers: ["full", "compact"] },
  { stage: "reta", variant: "sequence", product: "reta", tiers: ["compact"] },
  { stage: "glow", variant: "moment", product: "glow", tiers: ["full"], both: true },
  { stage: "ghk-cu", variant: "moment", product: "ghk-cu", tiers: ["full"], both: true },
];

/* On the GPU, as visitors' browsers draw it: the software renderer drew the
   hero's soft halo visibly fainter than a GPU does. */
const browser = await chromium.launch({ channel: "chrome", headless: true });
mkdirSync(OUT, { recursive: true });
const manifest = {};
let failures = 0;

for (const tier of ["full", "compact"]) {
  const page = await browser.newPage({ ...TIERS[tier], reducedMotion: "reduce" });
  // Every frame the renderer draws to the screen, kept per stage as a PNG.
  await page.addInitScript(() => {
    window.__frames = {};
    const hub = new EventTarget();
    hub.addEventListener("observe", (event) => {
      const renderer = event.detail;
      if (!renderer?.isWebGLRenderer) return;
      const render = renderer.render.bind(renderer);
      renderer.render = (...args) => {
        const result = render(...args);
        if (renderer.getRenderTarget() === null) {
          const canvas = renderer.domElement;
          const stage = canvas.closest("[data-home-stage]")?.getAttribute("data-home-stage");
          if (stage) {
            window.__frames[stage] = {
              url: canvas.toDataURL("image/png"),
              width: canvas.width,
              height: canvas.height,
            };
          }
        }
        return result;
      };
    });
    window.__THREE_DEVTOOLS__ = hub;
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${base}/es`, { waitUntil: "load" });

  for (const spec of STAGES) {
    if (!spec.tiers.includes(tier)) continue;
    const model = MEDIA[spec.product]?.model;
    if (!model) {
      console.error(`  ! ${spec.stage}: ${spec.product} declares no model`);
      failures += 1;
      continue;
    }
    const shot = await photograph(page, spec.stage);
    if (!shot) {
      console.error(`  ! ${spec.stage} (${tier}): the live vial never drew here`);
      failures += 1;
      continue;
    }
    const { png, box } = shot;
    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const W = info.width;
    const H = info.height;
    let x0 = W;
    let y0 = H;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < H; y += 1) {
      for (let x = 0; x < W; x += 1) {
        if (data[(y * W + x) * 4 + 3] <= EDGE) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    const crop = {
      left: Math.max(0, x0 - PAD),
      top: Math.max(0, y0 - PAD),
      width: Math.min(W, x1 + PAD + 1) - Math.max(0, x0 - PAD),
      height: Math.min(H, y1 + PAD + 1) - Math.max(0, y0 - PAD),
    };
    const name = `${spec.stage}-${tier}-${path.posix.basename(model, ".glb")}.webp`;
    await sharp(png)
      .extract(crop)
      .webp({ quality: 80, alphaQuality: 80, effort: 6 })
      .toFile(path.join(OUT, name));

    // Device pixels → CSS pixels → canvas heights from the track's anchor.
    const css = box.width / W;
    const at = restingProgress(spec.variant);
    const anchorX = sampleTrack(at, poseTrack(tier, spec.variant).offsetX);
    const round = (v) => Math.round(v * 1e5) / 1e5;
    const entry = {
      src: `/images/home/${name}`,
      width: crop.width,
      height: crop.height,
      anchorX: round(anchorX),
      x: round((crop.left * css - (box.width / 2 + anchorX * box.width)) / box.height),
      y: round((crop.top * css - box.height / 2) / box.height),
      w: round((crop.width * css) / box.height),
      h: round((crop.height * css) / box.height),
      model,
    };
    manifest[spec.stage] ??= { full: null, compact: null };
    manifest[spec.stage][tier] = entry;
    if (spec.both) manifest[spec.stage].compact = entry;
    console.log(
      `  ${spec.stage} (${tier}): ${crop.width}×${crop.height} from a ` +
        `${Math.round(box.width)}×${Math.round(box.height)} canvas → ${name}`,
    );
  }
  if (errors.length) console.error(`  ! ${tier}: ${errors.slice(0, 2).join(" | ")}`);
  await page.close();
}
await browser.close();

writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
process.exit(failures ? 1 : 0);

/**
 * The stage's canvas as drawn: its pixels (with alpha) straight from the
 * renderer, and its CSS box. Read from WebGL right after a render (see the
 * init script), not from a screenshot: a reduced-motion canvas draws once,
 * and anything that makes the browser re-composite it can blank it.
 */
async function photograph(page, stage) {
  const where = `[data-home-stage="${stage}"]`;
  await page.evaluate((selector) => {
    document.querySelector(selector)?.scrollIntoView({ block: "center" });
  }, where);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await page.waitForTimeout(500);
    const frame = await page.evaluate((name) => {
      const canvas = document.querySelector(`[data-home-stage="${name}"] canvas`);
      const last = window.__frames?.[name];
      if (!canvas || !last) return null;
      // Shown (the host has faded it in), and drawn at the box's size.
      let element = canvas;
      while (element && element !== document.body) {
        if (Number(getComputedStyle(element).opacity) < 0.99) return null;
        element = element.parentElement;
      }
      if (last.width !== canvas.width || last.height !== canvas.height) return null;
      const box = canvas.getBoundingClientRect();
      return { url: last.url, box: { width: box.width, height: box.height } };
    }, stage);
    if (frame) {
      return {
        png: Buffer.from(frame.url.slice(frame.url.indexOf(",") + 1), "base64"),
        box: frame.box,
      };
    }
  }
  return null;
}
