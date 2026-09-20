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
 *   front panel   y 588–1342: "NEOGEN" tracked small, a hairline, the name
 *                 set large and tracked, a small secondary line, a short rule
 *   top panel     y 0–588:    the same identity at small size
 *   bottom panel  y 1342–2048: the mark
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
const PAPER = "#f8f7f4";
const INK = "#2b2b2c";
const MUTED = "#6d6c69";
const RULE = "#d9d7d1";

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

/** Largest size (≤ max) at which `text` fits `room` px along the label. */
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  family: string,
  weight: number,
  max: number,
  room: number,
  tracking: number,
) {
  let size = max;
  for (; size > 34; size -= 2) {
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.letterSpacing = `${size * tracking}px`;
    if (ctx.measureText(text).width <= room) break;
  }
  return size;
}

export function drawLabel(label: StudioLabel, family: string): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = SHEET;
  canvas.height = SHEET;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, SHEET, SHEET);

  // The printed strip's edge hairlines and panel dividers, as on the real label.
  ctx.fillStyle = RULE;
  ctx.fillRect(17, 0, 2, SHEET);
  ctx.fillRect(STRIP - 14, 0, 2, SHEET);
  ctx.fillRect(34, 588, STRIP - 68, 1);
  ctx.fillRect(34, 1342, STRIP - 68, 1);

  const name = label.name.toUpperCase();
  const line = label.line;

  /* FRONT PANEL — centred on y 965, as RETA's is. */
  const centre = 965;
  vertical(ctx, "NEOGEN", 75, centre, `500 26px ${family}`, 9, INK);
  ctx.fillStyle = RULE;
  ctx.fillRect(97, centre - 65, 2, 130);

  // The headline: as large as RETA's where it fits, tracked like it, and split
  // over two lines only when one line would drop below a legible size.
  const room = 560;
  let size = fit(ctx, name, family, 600, 104, room, 0.16);
  const words = name.split(" ");
  if (size < 56 && words.length > 1) {
    const cut = Math.ceil(words.length / 2);
    const lines = [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
    size = Math.min(...lines.map((part) => fit(ctx, part, family, 600, 74, room, 0.14)));
    vertical(ctx, lines[0], 160, centre, `600 ${size}px ${family}`, size * 0.14, INK);
    vertical(ctx, lines[1], 160 + size * 1.08, centre, `600 ${size}px ${family}`, size * 0.14, INK);
    vertical(ctx, line, 172 + size * 2, centre, `400 22px ${family}`, 4, MUTED);
  } else {
    vertical(ctx, name, 180, centre, `600 ${size}px ${family}`, size * 0.16, INK);
    vertical(ctx, line, 255, centre, `400 22px ${family}`, 4, MUTED);
    // RETA's short accent rule, in graphite: a neutral product carries no colour.
    ctx.fillStyle = MUTED;
    ctx.fillRect(279, centre - 43, 2, 86);
  }

  /* TOP PANEL — the identity at small size. */
  vertical(ctx, "NEOGEN", 85, 410, `500 15px ${family}`, 5, INK);
  const small = fit(ctx, name, family, 600, 22, 230, 0.12);
  vertical(ctx, name, 118, 410, `600 ${small}px ${family}`, small * 0.12, INK);
  vertical(ctx, line, 143, 410, `400 13px ${family}`, 2, MUTED);

  /* BOTTOM PANEL — the mark. */
  vertical(ctx, "NEOGEN", 85, 1780, `500 15px ${family}`, 5, INK);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // glTF textures are not flipped; this replaces one, so it must match.
  texture.flipY = false;
  return texture;
}
