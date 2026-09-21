/**
 * EXPORT A DRAWN LABEL SHEET — the texture, not the photograph.
 *
 *   npm run dev
 *   node scripts/export-label.mjs reta --model /models/reta-v3.glb --out "3d assets/reta-v3-label.png"
 *   node scripts/prepare-model.mjs "3d assets/NEOGEN_RETA_VIAL_V3.glb" \
 *     public/models/reta-v3.glb --label "3d assets/reta-v3-label.png" --jpeg 92
 *
 * WHY THIS EXISTS. `studio/label.ts` draws a label from registry data — the
 * brand lockup, the product's name, its presentation range — and it draws it
 * in a browser, on a canvas, in the site's own typeface. None of that is
 * available to Node, so the sheet is produced where it is drawn and carried
 * out as a PNG.
 *
 * WHAT IT IS FOR. When an export arrives with a printed strip the product
 * record cannot support, the honest fix is to replace the artwork IN THE FILE
 * rather than to paint over it at render time — four render paths read that
 * texture and only one of them has a material pass. So: export the drawn
 * sheet, bake it in with `prepare-model.mjs --label`, and the served model is
 * correct in the catalogue still, the product page, the homepage and the
 * studio alike.
 *
 * It is a development tool, like the studio route it reads: that route 404s in
 * production, and this fails loudly rather than writing half a file.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const slugs = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

const base = flag("base", "http://localhost:3000");
const model = flag("model", null);
const out = flag("out", null);

if (slugs.length !== 1 || !out) {
  console.error(
    "usage: node scripts/export-label.mjs <slug> --out <file.png> [--model /models/x.glb] [--base URL]",
  );
  process.exit(1);
}

const slug = slugs[0];
const probe = await fetch(`${base}/es/estudio/${slug}`).catch(() => null);
if (!probe?.ok) {
  console.error(
    `${base}/es/estudio/${slug} did not answer 200.\n` +
      "Start the dev server (`npm run dev`) — the studio route 404s in production.",
  );
  process.exit(1);
}

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
  /*
   * `label=drawn` is what makes a FLAGSHIP draw one: its model normally wears
   * its own printed artwork, and that is exactly the artwork being replaced.
   */
  const query = new URLSearchParams({ w: "600", dpr: "1", label: "drawn" });
  if (model) query.set("model", model);
  await page.goto(`${base}/es/estudio/${slug}?${query}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__studio?.ready === true, null, { timeout: 120_000 });

  const dataUrl = await page.evaluate(() => window.__studio.label());
  if (!dataUrl?.startsWith("data:image/png;base64,")) {
    console.error("  ! the page drew no label sheet");
    process.exit(1);
  }

  const directory = path.dirname(out);
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  const bytes = Buffer.from(dataUrl.slice("data:image/png;base64,".length), "base64");
  writeFileSync(out, bytes);
  console.log(`  ${slug} → ${out}  ${(bytes.byteLength / 1024).toFixed(1)} KB`);
} finally {
  await browser.close();
}
