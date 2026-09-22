/**
 * RE-LETTER A PRINTED LABEL SHEET — keep the artwork, change the product.
 *
 *   npm run dev
 *   node scripts/relabel-sheet.mjs --sheet "3d assets/reta-v4-label.png" \
 *     --name SEMAGLUTIDE --line "5 – 30 MG" --out "3d assets/semaglutide-label.png"
 *
 * WHY THIS EXISTS. The owner designs one label; every other product in the same
 * packaging needs that design with its OWN name and presentation. Re-drawing
 * the whole sheet from registry data (`studio/label.ts`) loses the design;
 * exporting a sheet per product in Blender is work per product. This keeps the
 * artwork — its composition, its rules, its bands, its side panels — and
 * replaces exactly two lines.
 *
 * WHAT IT DOES NOT DO. It does not touch any other line on the sheet. If the
 * artwork carries a lot number, an expiry, a purity figure or a route of
 * administration, those are still on it afterwards and still belong to
 * whatever they were drawn for — which is why anything produced this way stays
 * declared in `DEMO_ARTWORK` until the artwork itself is corrected.
 *
 * It runs in a browser because that is where the site's typeface lives: the
 * replacement lines are set in NEOGEN's own display face, at the size,
 * position and colour measured off the sheet.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium } from "playwright-core";

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};

const sheet = flag("sheet");
const out = flag("out");
const name = flag("name");
const line = flag("line", "");
const base = flag("base", "http://localhost:3000");

if (!sheet || !out || !name) {
  console.error(
    'usage: node scripts/relabel-sheet.mjs --sheet <in.png> --name "NAME" [--line "5 – 30 MG"] --out <out.png>',
  );
  process.exit(1);
}
if (!existsSync(sheet)) {
  console.error(`  ! sheet not found: ${sheet}`);
  process.exit(1);
}
if (existsSync(out)) {
  console.error(`  ! ${out} already exists — name the new sheet, do not overwrite.`);
  process.exit(1);
}

/*
 * THE TWO ROWS, MEASURED OFF THE V4 SHEET (2048²) rather than guessed:
 * the name's ink runs y 887–995 and x 337–1709 (centred on 1023), the
 * strength's y 1074–1131 in #00167a, and the hairline between them sits at
 * y 1026–1034 and must survive. Anything outside `clear` is untouched.
 */
const LAYOUT = {
  size: 2048,
  centre: 1024,
  paper: "#ffffff",
  name: { baseline: 995, cap: 108, width: 1372, clear: [300, 870, 1715, 1018] },
  line: { baseline: 1131, cap: 57, width: 900, colour: "#00167a", clear: [700, 1045, 1400, 1150] },
};

const probe = await fetch(base).catch(() => null);
if (!probe?.ok) {
  console.error(`${base} did not answer. Start the dev server (\`npm run dev\`).`);
  process.exit(1);
}

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
  await page.goto(`${base}/es`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);

  const dataUrl = `data:image/png;base64,${readFileSync(sheet).toString("base64")}`;
  const result = await page.evaluate(
    async ({ dataUrl, name, line, L }) => {
      const family =
        getComputedStyle(document.documentElement).getPropertyValue("--font-instrument-sans") ||
        "sans-serif";

      const image = new Image();
      image.src = dataUrl;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = L.size;
      canvas.height = L.size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0, L.size, L.size);

      /** Clear a row back to paper, then set one line centred in it. */
      const setLine = (text, spec, weight, colour) => {
        const [x0, y0, x1, y1] = spec.clear;
        ctx.fillStyle = L.paper;
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        if (!text) return;

        /* Cap height, not font size: the replacement has to sit on the same
           baseline and rise to the same height as the artwork's own type. */
        let size = Math.round(spec.cap / 0.71);
        let tracking = size * 0.06;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        for (; size > 24; size -= 2) {
          tracking = size * 0.06;
          ctx.font = `${weight} ${size}px ${family}`;
          ctx.letterSpacing = `${tracking}px`;
          if (ctx.measureText(text).width <= spec.width) break;
        }
        ctx.fillStyle = colour;
        ctx.fillText(text, L.centre + tracking / 2, spec.baseline);
      };

      setLine(name, L.name, 500, "#111111");
      setLine(line, L.line, 700, L.line.colour);

      return canvas.toDataURL("image/png");
    },
    { dataUrl, name, line, L: LAYOUT },
  );

  const bytes = Buffer.from(result.slice("data:image/png;base64,".length), "base64");
  writeFileSync(out, bytes);
  console.log(
    `  ${path.basename(sheet)} → ${out}  "${name}" / "${line}"  ${(bytes.byteLength / 1024).toFixed(1)} KB`,
  );
} finally {
  await browser.close();
}
