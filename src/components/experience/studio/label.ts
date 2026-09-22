import { CanvasTexture, SRGBColorSpace, type Texture } from "three";

/**
 * A NEOGEN LABEL, DRAWN FROM REGISTRY DATA — for products that share the
 * canonical container (`reta-v2.glb`) but have no printed label artwork of their
 * own.
 *
 * IT REPRODUCES THE REAL RETA LABEL'S LAYOUT, not a new design. Measured off
 * the label texture embedded in `reta-v2.glb` (2048² sheet, printed strip 458px
 * wide on the left, type set rotated 90° so it wraps horizontally round the
 * container):
 *
 *   front panel   y 588–1342: the identity, a hairline, the name set large and
 *                 tracked, a small secondary line, a short rule
 *   top panel     y 0–588:    the same identity at small size
 *   bottom panel  y 1342–2048: the mark
 *
 * The sheet's x axis runs down the label's height and its y axis runs round the
 * container, which is why everything here is drawn rotated: the front panel is
 * the band the camera sees, and x 34–424 is what reads top-to-bottom on it.
 *
 * THE IDENTITY IS THE BRAND ARTWORK, NOT TYPE. It used to be the word "NEOGEN"
 * set in the site's face, because there was no logo file to print. There is now
 * (`public/branding/`, trimmed by `scripts/prepare-brand.mjs`), so the label
 * carries the real lockup — mark plus NEOGEN / PEPTIDES — the way a printed
 * label would, and the bottom panel carries the mark alone. The type fallback
 * stays: if the artwork cannot be fetched the label is still complete, just
 * wordmarked rather than logo'd.
 *
 * Only registry facts are printed: the product's name and its presentation
 * range. The RETA label's "[LOT] [PRODUCT ID] [FORMAT]" placeholders are left
 * out — there is no lot to print.
 */

export interface StudioLabel {
  /** The registry name, printed as the label's headline. */
  name: string;
  /** The secondary line — the presentation range, e.g. "5 mg – 30 mg". */
  line: string;
}

const SHEET = 2048;
const STRIP = 458;

/**
 * HOW MUCH OF THE SHEET THE BAND ACTUALLY SHOWS, per container.
 *
 * The drawing below is measured against the canonical container's label mesh:
 * its band shows the printed strip at 1:1, so a 458px strip fills it. A
 * different export can map the same sheet differently — the V3 RETA vial had a
 * taller band (149 mm against 115 mm) whose UVs stretch the sheet across it,
 * so the 458px strip covered only the top of the label and the rest came out
 * blank paper.
 *
 * `scale` multiplies everything on the STRIP AXIS — positions, type sizes, the
 * hairlines — and nothing on the axis that runs around the container, because
 * the circumference did not change. The type therefore grows uniformly rather
 * than stretching: a font size scales a glyph in both directions.
 *
 * Measured from a render, not derived: photograph the model with a drawn label
 * and compare the printed area against the band.
 */
interface LabelSheet {
  scale: number;
  /**
   * Where the front of the label sits on the sheet's other axis, and how much
   * of that axis the camera actually sees.
   *
   * A mesh can put its seam anywhere, so the band the lens is looking at is
   * not necessarily centred on the canonical 965. `room` is the run the type
   * is allowed before it disappears around the side — tuned by rendering, not
   * derived, because it depends on how far round the curve stays legible.
   */
  centre: number;
  room: number;
}

const CANONICAL: LabelSheet = { scale: 1, centre: 965, room: 560 };

/*
 * Empty today. The V3 vial needed `{ scale: 2.25, centre: 1012, room: 520 }`;
 * it was retired for V4 (a crimp-top with its own UV layout), which has not
 * been calibrated because it has not needed a drawn label. Measure it the same
 * way — render with `?label=drawn` and compare the printed area to the band —
 * before relying on one.
 */
const SHEETS: Readonly<Record<string, LabelSheet>> = {};

/** The calibration for one model, or the canonical 1:1. */
export function labelSheet(modelPath: string | null): LabelSheet {
  return (modelPath && SHEETS[modelPath]) || CANONICAL;
}
const PAPER = "#f8f7f4";
const INK = "#2b2b2c";
const MUTED = "#6d6c69";
const RULE = "#d9d7d1";

/* ---- the brand artwork ---------------------------------------------------- */

/**
 * The lockup and the mark, as `scripts/prepare-brand.mjs` trims them: pure
 * black on an alpha channel, with the file's box equal to the artwork's box —
 * so a draw only needs a height, and the width follows.
 */
const ARTWORK = {
  logo: "/branding/neogen-logo.png",
  mark: "/branding/neogen-mark.png",
} as const;

type Inked = Record<keyof typeof ARTWORK, HTMLCanvasElement>;

/**
 * Loaded once per document, and read synchronously by `drawLabel`.
 *
 * `drawLabel` runs inside the scene's `useMemo`, which cannot await, so the
 * studio resolves this BEFORE it mounts the canvas (`StudioView`). A capture
 * therefore never races the artwork — the alternative, redrawing the texture
 * when the image lands, would have `window.__studio.ready` mean two different
 * things and could photograph the label mid-swap.
 */
let inked: Inked | null = null;

/**
 * Re-ink black-on-alpha artwork in the label's ink.
 *
 * The artwork is black because black-on-alpha is a mask, which is what lets one
 * file serve the light header, the dark footer and this label. Printed type
 * here is #2b2b2c, not #000 — `source-in` keeps the artwork's alpha, including
 * its feathered edge, and replaces the colour.
 */
function ink(image: HTMLImageElement, color: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(image, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Fetch the brand artwork for `drawLabel`. Resolves either way: a label that
 * cannot load its logo falls back to type, which is worse than the logo and far
 * better than a studio that never becomes ready.
 */
export async function loadBrandArtwork(): Promise<void> {
  if (inked) return;
  const load = (src: string) =>
    new Promise<HTMLImageElement | null>((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = src;
    });
  const [logo, mark] = await Promise.all([load(ARTWORK.logo), load(ARTWORK.mark)]);
  if (!logo || !mark) {
    console.warn("studio label: brand artwork did not load; falling back to the wordmark");
    return;
  }
  inked = { logo: ink(logo, INK), mark: ink(mark, INK) };
}

/* ---- drawing -------------------------------------------------------------- */

/** Draw `text` rotated to read bottom-to-top, centred on (x, y). */
function vertical(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  tracking: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.font = font;
  ctx.letterSpacing = `${tracking}px`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, tracking / 2, 0);
  ctx.restore();
}

/**
 * Draw artwork in the same rotated frame as `vertical`, centred on (x, y) and
 * `height` tall across the label. Its width — the extent round the container —
 * follows from the artwork's own proportion.
 */
function verticalArt(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  x: number,
  y: number,
  height: number,
) {
  const width = (art.width / art.height) * height;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(art, -width / 2, -height / 2, width, height);
  ctx.restore();
}

/**
 * The identity: the lockup where the artwork loaded, the wordmark where it did
 * not. `height` is the lockup's height; the fallback's type is sized to sit in
 * the same band so neither version disturbs the panel's rhythm.
 */
function identity(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  family: string,
) {
  if (inked) verticalArt(ctx, inked.logo, x, y, height);
  else vertical(ctx, "NEOGEN", x, y, `500 ${height * 0.78}px ${family}`, height * 0.27, INK);
}

/** Largest size (≤ max) at which `text` fits `room` px along the label. */
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: number,
  max: number,
  room: number,
  tracking: number,
  /* The floor scales with the sheet: on a stretched band a "small" size is
     proportionally larger, and a fixed floor would stop the search early. */
  floor = 34,
) {
  let size = max;
  for (; size > floor; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.letterSpacing = `${size * tracking}px`;
    if (ctx.measureText(text).width <= room) break;
  }
  return size;
}

export function drawLabel(
  label: StudioLabel,
  family: string,
  sheet: LabelSheet = CANONICAL,
): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET;
  canvas.height = SHEET;
  const ctx = canvas.getContext("2d")!;

  /* Every measurement below is on the strip axis, so each passes through `s`.
     The axis that runs around the container is untouched. */
  const k = sheet.scale;
  const s = (value: number) => value * k;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, SHEET, SHEET);

  // The printed strip's edge hairlines and panel dividers, as on the real label.
  ctx.fillStyle = RULE;
  ctx.fillRect(s(17), 0, s(2), SHEET);
  ctx.fillRect(s(STRIP - 14), 0, s(2), SHEET);
  ctx.fillRect(s(34), 588, s(STRIP - 68), 1);
  ctx.fillRect(s(34), 1342, s(STRIP - 68), 1);

  const name = label.name.toUpperCase();
  const line = label.line;

  /* FRONT PANEL — on the canonical sheet this is y 965, as RETA's is. */
  const centre = sheet.centre;
  /*
   * 84px tall — the lockup occupies x 40–124, where the wordmark (62–88) and
   * the hairline that divided it from the headline (97) used to sit together.
   *
   * IT TOOK THE DIVIDER'S ROOM ON PURPOSE. A rule is there to separate the
   * brand from the product name, and at this size the lockup already does that.
   *
   * WHY IT IS THIS BIG. The label prints at roughly 1.5× on the 1600×2000
   * still, so a lockup of 34px put "PEPTIDES" under 9px on the sheet and it
   * came back as mush. The ceiling is the paper: the strip's hairline is at
   * x 18, and 40 leaves the same margin above the brand that the old wordmark
   * had. Everything below shifts by NAME_DROP to keep the gap it had.
   */
  identity(ctx, s(82), centre, s(84), family);

  /*
   * How far the name block moved down to make room for the lockup. It is one
   * number so the single-line and two-line layouts cannot drift apart — the
   * two-line branch is the one nobody looks at while tuning, and it is the one
   * that overflows the panel if it is forgotten.
   */
  const NAME_DROP = s(24);

  // The headline: as large as RETA's where it fits, tracked like it, and split
  // over two lines only when one line would drop below a legible size.
  /* The run AROUND the container. It does not scale with the strip, but it
     does depend on how much of the circumference this mesh shows. */
  const room = sheet.room;
  let size = fit(ctx, name, family, 600, s(104), room, 0.16, s(34));
  const words = name.split(" ");
  if (size < s(56) && words.length > 1) {
    const cut = Math.ceil(words.length / 2);
    const lines = [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
    size = Math.min(...lines.map((part) => fit(ctx, part, family, 600, s(74), room, 0.14, s(34))));
    const top = s(160) + NAME_DROP;
    vertical(ctx, lines[0], top, centre, `600 ${size}px ${family}`, size * 0.14, INK);
    vertical(ctx, lines[1], top + size * 1.08, centre, `600 ${size}px ${family}`, size * 0.14, INK);
    vertical(ctx, line, top + s(12) + size * 2, centre, `400 ${s(22)}px ${family}`, s(4), MUTED);
  } else {
    vertical(ctx, name, s(180) + NAME_DROP, centre, `600 ${size}px ${family}`, size * 0.16, INK);
    vertical(ctx, line, s(255) + NAME_DROP, centre, `400 ${s(22)}px ${family}`, s(4), MUTED);
    // RETA's short accent rule, in graphite: a neutral product carries no colour.
    ctx.fillStyle = MUTED;
    ctx.fillRect(s(279) + NAME_DROP, centre - 43, s(2), 86);
  }

  /* TOP PANEL — the identity at small size. */
  identity(ctx, s(90), 410, s(38), family);
  const small = fit(ctx, name, family, 600, s(22), 230, 0.12, s(10));
  vertical(ctx, name, s(126), 410, `600 ${small}px ${family}`, small * 0.12, INK);
  vertical(ctx, line, s(151), 410, `400 ${s(13)}px ${family}`, s(2), MUTED);

  /* BOTTOM PANEL — the mark. */
  if (inked) verticalArt(ctx, inked.mark, s(88), 1780, s(46));
  else vertical(ctx, "NEOGEN", s(85), 1780, `500 ${s(15)}px ${family}`, s(5), INK);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // glTF textures are not flipped; this replaces one, so it must match.
  texture.flipY = false;
  return texture;
}

/* ---- the upright sheet ---------------------------------------------------- */

/**
 * HOW A CONTAINER MAPS ITS LABEL, read from the mesh rather than configured.
 *
 *   `strip` — the jar (`reta-v2.glb`): the printed strip is a narrow band down
 *             the left of the sheet (u ≈ 0–0.22) with the type turned 90°.
 *             `drawLabel` above.
 *   `sheet` — the V4 crimp-top: the WHOLE sheet wraps the label upright — top
 *             of the image is the top of the label, left-to-right runs round
 *             the vial (≈ −63° to +63°). `drawSheetLabel` below.
 *
 * Decided from the label primitive's UV extent, so a re-exported model under a
 * new filename needs no configuration — the thing that broke every time a
 * calibration was keyed to a path.
 */
export type LabelLayout = "strip" | "sheet";

export function layoutFromUvs(uMin: number, uMax: number): LabelLayout {
  return uMax - uMin > 0.6 ? "sheet" : "strip";
}

/**
 * A NEOGEN label for the upright sheet, from registry data only.
 *
 * It follows the composition of the owner's V4 artwork — the lockup at the
 * head, the compound name large and tracked over a hairline, the presentation
 * beneath it, and a dark band across the foot — so a generic product sits in
 * the same family as RETA. What it deliberately does NOT carry from that
 * artwork: a route of administration, a purity figure, a lot, an expiry, a
 * storage condition, a flag or a web address. None of those is a fact this
 * repository holds. The band states the one condition that is true of every
 * product: research use only.
 *
 * Neutral by rule: graphite, not RETA blue — a generic product carries no
 * world colour. The paper gets a faint grain, because a flat #fff sheet under
 * studio light reads as plastic.
 */
export function drawSheetLabel(label: StudioLabel, family: string): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET;
  canvas.height = SHEET;
  const ctx = canvas.getContext("2d")!;
  const W = SHEET;

  /* Paper, with grain: ±3 levels of luminance noise, invisible as noise and
     visible only as the absence of a plastic sheen. */
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, W);
  const grain = ctx.getImageData(0, 0, W, W);
  for (let i = 0; i < grain.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 6;
    grain.data[i] += n;
    grain.data[i + 1] += n;
    grain.data[i + 2] += n;
  }
  ctx.putImageData(grain, 0, 0);

  const centred = (text: string, y: number, font: string, tracking: number, color: string) => {
    ctx.font = font;
    ctx.letterSpacing = `${tracking}px`;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    // letterSpacing adds trailing space after the last glyph; nudge it back.
    ctx.fillText(text, W / 2 + tracking / 2, y);
  };

  /* The lockup at the head. */
  if (inked) {
    const h = 290;
    const w = (inked.logo.width / inked.logo.height) * h;
    ctx.drawImage(inked.logo, (W - w) / 2, 200, w, h);
  } else {
    centred("NEOGEN", 420, `600 200px ${family}`, 30, INK);
  }

  /* The name: as large as fits the front of the vial, which is roughly the
     middle two-thirds of the sheet — the rest wraps round the sides. */
  const name = label.name.toUpperCase();
  const room = W * 0.64;
  let size = 190;
  for (; size > 70; size -= 4) {
    ctx.font = `500 ${size}px ${family}`;
    ctx.letterSpacing = `${size * 0.1}px`;
    if (ctx.measureText(name).width <= room) break;
  }
  centred(name, 980, `500 ${size}px ${family}`, size * 0.1, INK);

  /* The hairline under the name, as on the V4 artwork. */
  ctx.fillStyle = RULE;
  ctx.fillRect(W * 0.04, 1030, W * 0.92, 3);

  /* The presentation. */
  centred(label.line, 1150, `600 84px ${family}`, 10, INK);

  /* The band across the foot: the research-use condition. */
  const band = ctx.createLinearGradient(0, 0, W, 0);
  band.addColorStop(0, "#0e0e10");
  band.addColorStop(1, "#3a3a3e");
  ctx.fillStyle = band;
  ctx.fillRect(0, 1700, W, 150);
  centred("FOR RESEARCH USE ONLY", 1800, `500 58px ${family}`, 14, PAPER);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false;
  return texture;
}
