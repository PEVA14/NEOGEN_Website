/**
 * CAPTURE A PRODUCT'S STUDIO STILL — the catalogue card's image.
 *
 *   npm run dev                       # the studio 404s in production
 *   node scripts/capture-studio.mjs reta semaglutide
 *
 * The still is a RENDER OF THE REAL MODEL, not a photograph, and the studio
 * page (`/estudio/<slug>`) is where it is composed: rig, lights, sweep and
 * grade all live in `components/experience/studio/rig.ts`. This script only
 * presses the shutter — it opens that page in headless Chrome, waits for the
 * scene to settle, takes the frame the page itself exposes
 * (`window.__studio.capture()`), and writes
 * `public/images/products/<slug>/studio.jpg`.
 *
 * WHY A SCRIPT AND NOT THE PAGE'S BUTTON. The button downloads a PNG a human
 * then converts and files by hand. Every re-capture after a model changes is
 * the same four steps, and doing them by hand is how a card ends up showing a
 * label the product no longer has.
 *
 * Options:
 *   --base http://localhost:3000   the running dev server
 *   --width 800                    CSS width; the frame is 4:5 at 2× (1600×2000)
 *   --quality 88                   JPEG quality (macOS `sips`)
 *   --out public/images/products   destination root
 *
 * The registry entry (`content/media/registry.ts`) carries the intrinsic size
 * and the alt text; this writes only the file. If the dimensions here change,
 * change them there too — `check:media` compares them.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const slugs = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

const base = flag("base", "http://localhost:3000");
const width = Number(flag("width", 800));
const quality = Number(flag("quality", 88));
const outRoot = flag("out", "public/images/products");

if (!slugs.length) {
  console.error(
    "usage: node scripts/capture-studio.mjs <slug>... [--base URL] [--width 800] [--quality 88]",
  );
  process.exit(1);
}

try {
  execFileSync("which", ["sips"], { stdio: "ignore" });
} catch {
  console.error("`sips` not found — this script needs macOS to write the JPEG.");
  process.exit(1);
}

/* The studio is a development-only route; fail loudly rather than capturing a 404. */
const probe = await fetch(`${base}/es/estudio/${slugs[0]}`).catch(() => null);
if (!probe?.ok) {
  console.error(
    `${base}/es/estudio/${slugs[0]} did not answer 200.\n` +
      "Start the dev server (`npm run dev`) — the studio route 404s in production.",
  );
  process.exit(1);
}

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  /* Software WebGL: headless Chrome has no GPU, and the studio scene needs a
     real context for transmission and the PMREM environment. */
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

const scratch = mkdtempSync(path.join(tmpdir(), "neogen-studio-"));
let failures = 0;

try {
  for (const slug of slugs) {
    const page = await browser.newPage({
      viewport: { width: Math.max(width + 80, 900), height: Math.round(width * 1.25) + 200 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));

    const url = `${base}/es/estudio/${slug}?w=${width}&dpr=2`;
    await page.goto(url, { waitUntil: "load" });

    /* The page exposes the shutter once the transmission buffer and the
       environment have settled over a few frames. */
    await page.waitForFunction(() => window.__studio?.ready === true, null, { timeout: 120_000 });
    const dataUrl = await page.evaluate(() => window.__studio.capture());
    await page.close();

    if (!dataUrl?.startsWith("data:image/png;base64,")) {
      console.error(`  ! ${slug}: the page returned no frame`);
      failures += 1;
      continue;
    }

    const png = path.join(scratch, `${slug}.png`);
    writeFileSync(png, Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64"));

    const directory = path.join(outRoot, slug);
    mkdirSync(directory, { recursive: true });
    const jpg = path.join(directory, "studio.jpg");
    const previous = existsSync(jpg) ? statSync(jpg).size : null;

    execFileSync(
      "sips",
      ["-s", "format", "jpeg", "-s", "formatOptions", String(quality), png, "--out", jpg],
      {
        stdio: "ignore",
      },
    );

    const size = statSync(jpg).size;
    const dimensions = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", jpg])
      .toString()
      .match(/pixelWidth: (\d+)[\s\S]*pixelHeight: (\d+)/);
    console.log(
      `  ${slug} → ${jpg}  ${dimensions ? `${dimensions[1]}×${dimensions[2]}` : "?"}, ` +
        `${(size / 1024).toFixed(0)} KB${previous ? ` (was ${(previous / 1024).toFixed(0)} KB)` : ""}` +
        `${errors.length ? `  [page errors: ${errors.length}]` : ""}`,
    );
    for (const error of errors.slice(0, 3)) console.error(`    ! ${error}`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
  await browser.close();
}

process.exit(failures ? 1 : 0);
