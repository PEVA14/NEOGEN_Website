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
 *   --name studio                  file basename, WITHOUT extension
 *   --query "model=…&label=drawn"  extra studio-page overrides
 *   --force                        overwrite an existing still (see below)
 *   --out public/images/products   destination root
 *
 * VERSION THE NAME WHEN THE RENDER CHANGES (`--name studio-v2`). Images are
 * served with a one-year immutable cache and Next's optimizer caches by URL,
 * so re-writing `studio.jpg` in place leaves every visitor — and the local dev
 * server — on the old picture. The registry points at the new name.
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
const name = flag("name", "studio");
/*
 * Extra query for the studio page, for photographing something the registry
 * does not point at yet:
 *
 *   --query "model=/models/reta-v6.glb&label=drawn"
 *
 * The page's own overrides are development-only, so this is too.
 */
const query = flag("query", "");
const force = args.includes("--force");

if (!slugs.length) {
  console.error(
    "usage: node scripts/capture-studio.mjs <slug>... [--base URL] [--width 800] [--quality 88] [--name studio-v2]",
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

    const url = `${base}/es/estudio/${slug}?w=${width}&dpr=2${query ? `&${query}` : ""}`;
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
    const jpg = path.join(directory, `${name}.jpg`);
    /*
     * REFUSE TO OVERWRITE A PUBLISHED STILL.
     *
     * The comment at the top of this file has always said to version the name
     * when the render changes; saying it was not enough. Next's optimizer
     * caches by URL and the file is served with a long max-age, so re-writing
     * `studio-v4.jpg` leaves the browser — and the dev server — showing the
     * previous picture with nothing to indicate it. That is exactly what
     * happened on 2026-09-21 with this product.
     *
     * `--force` exists for re-running the same shot after a rig tweak that has
     * not shipped yet.
     */
    if (existsSync(jpg) && !force) {
      console.error(
        `  ! ${jpg} already exists.\n` +
          "    Images are cached by URL, so a re-render under the same name never\n" +
          "    reaches a browser that has seen it. Use --name studio-v<N+1> and point\n" +
          "    `content/media/registry.ts` at it, or pass --force.",
      );
      failures += 1;
      continue;
    }
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
