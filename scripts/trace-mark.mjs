/**
 * TRACE THE OWNER'S MARK INTO GEOMETRY THE SITE CAN MOVE.
 *
 *   node scripts/trace-mark.mjs        (also run by `npm run brand`)
 *
 * The mark exists only as the owner's black-on-alpha PNG — no vector source.
 * A PNG can be painted (the mask technique, CONVENTIONS §19) but not moved
 * part by part, and the brand motion needs its parts: the hub, the four
 * nodes, the four connections between them. This script MEASURES those parts
 * from the artwork's own pixels. It draws nothing: every coordinate it writes
 * is read off `public/branding/neogen-mark.png`.
 *
 *   1. The outline: a sub-pixel contour of the alpha channel at 50%.
 *   2. The nodes: the five maxima of the shape's distance transform are the
 *      centres of its five round parts; each is refined by a least-squares
 *      circle fit to the outline points that lie on it. The four outer nodes
 *      are true circles (≈0.4px RMS on a 44–54px radius); the hub is not
 *      quite, so the hub keeps its traced outline rather than its circle.
 *   3. The connections: the stretches of outline that lie on no node are the
 *      two sides of each neck, flares included. Each neck is closed through
 *      the inside of its two nodes and cut in two at the middle of its gap
 *      (with a 1.5-unit overlap, so no seam shows at rest): a half that
 *      belongs to the hub and a half that belongs to the node — which is what
 *      lets a connection reach from both ends and meet.
 *   4. The proof: the parts are rasterised together and compared with the
 *      artwork pixel for pixel. Below 98.5% overlap the script refuses to
 *      write — a geometry that is not the owner's mark is worse than none.
 *
 * Writes `src/components/brand/markGeometry.ts`. Re-run it after the owner
 * replaces the artwork (after `prepare-brand.mjs`, which trims it); commit
 * what it writes.
 */
import { writeFileSync } from "node:fs";

import sharp from "sharp";

const SRC = "public/branding/neogen-mark.png";
const OUT = "src/components/brand/markGeometry.ts";
/** Simplification tolerance, in artwork pixels (the mark is 389×485). */
const EPS = 0.2;
/** How far into a node a connection's half begins, so it grows out of it. */
const INSET = 8;
const OVERLAP = 1.5;
const MIN_IOU = 0.985;

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const alpha = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : data[(y * W + x) * 4 + 3] / 255);
const inside = (x, y) => alpha(x, y) >= 0.5;
const fx = (v) => +v.toFixed(1);

/* 1. Sub-pixel outline (marching squares, linear interpolation). */
const segs = [];
const lerp = (a, b, va, vb) => a + (b - a) * ((0.5 - va) / (vb - va));
for (let y = -1; y < H; y++) {
  for (let x = -1; x < W; x++) {
    const v0 = alpha(x, y);
    const v1 = alpha(x + 1, y);
    const v2 = alpha(x + 1, y + 1);
    const v3 = alpha(x, y + 1);
    const c = (v0 >= 0.5 ? 8 : 0) | (v1 >= 0.5 ? 4 : 0) | (v2 >= 0.5 ? 2 : 0) | (v3 >= 0.5 ? 1 : 0);
    if (c === 0 || c === 15) continue;
    const top = [lerp(x, x + 1, v0, v1), y];
    const right = [x + 1, lerp(y, y + 1, v1, v2)];
    const bot = [lerp(x, x + 1, v3, v2), y + 1];
    const left = [x, lerp(y, y + 1, v0, v3)];
    const table = {
      1: [[left, bot]],
      2: [[bot, right]],
      3: [[left, right]],
      4: [[top, right]],
      5: [
        [left, top],
        [bot, right],
      ],
      6: [[top, bot]],
      7: [[left, top]],
      8: [[left, top]],
      9: [[top, bot]],
      10: [
        [left, bot],
        [top, right],
      ],
      11: [[top, right]],
      12: [[left, right]],
      13: [[bot, right]],
      14: [[left, bot]],
    };
    for (const s of table[c]) segs.push(s);
  }
}
const key = (p) => `${p[0].toFixed(4)},${p[1].toFixed(4)}`;
const adj = new Map();
for (const [a, b] of segs) {
  for (const [p, q] of [
    [a, b],
    [b, a],
  ]) {
    if (!adj.has(key(p))) adj.set(key(p), []);
    adj.get(key(p)).push(q);
  }
}
const used = new Set();
const loops = [];
for (const [a] of segs) {
  if (used.has(key(a))) continue;
  const loop = [a];
  used.add(key(a));
  let cur = a;
  for (;;) {
    const next = adj.get(key(cur)).find((q) => !used.has(key(q)));
    if (!next) break;
    used.add(key(next));
    loop.push(next);
    cur = next;
  }
  if (loop.length > 20) loops.push(loop);
}
loops.sort((a, b) => b.length - a.length);
if (loops.length !== 1) throw new Error(`expected one outline, found ${loops.length}`);
/* Marching squares works on pixel indices; pixel centres sit at +0.5. */
const C = loops[0].map(([x, y]) => [x + 0.5, y + 0.5]);
const n = C.length;

/* 2. Nodes: distance-transform maxima, then circle fits. */
const edge = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (
      inside(x, y) &&
      (!inside(x + 1, y) || !inside(x - 1, y) || !inside(x, y + 1) || !inside(x, y - 1))
    )
      edge.push([x, y]);
  }
}
const dt = new Float32Array(W * H);
for (let y = 0; y < H; y += 1) {
  for (let x = 0; x < W; x += 1) {
    if (!inside(x, y)) continue;
    let m = Infinity;
    for (const [bx, by] of edge) m = Math.min(m, (bx - x) ** 2 + (by - y) ** 2);
    dt[y * W + x] = Math.sqrt(m);
  }
}
const maxima = [];
for (let y = 6; y < H - 6; y++) {
  for (let x = 6; x < W - 6; x++) {
    const v = dt[y * W + x];
    if (v < 15) continue;
    let top = true;
    for (let dy = -6; dy <= 6 && top; dy++)
      for (let dx = -6; dx <= 6; dx++)
        if ((dx || dy) && dt[(y + dy) * W + x + dx] > v) {
          top = false;
          break;
        }
    if (!top) continue;
    const near = maxima.find((m) => Math.hypot(m.x - x, m.y - y) < 20);
    if (!near) maxima.push({ x, y, r: v });
    else if (v > near.r) Object.assign(near, { x, y, r: v });
  }
}
if (maxima.length !== 5) throw new Error(`expected five nodes, found ${maxima.length}`);

function circleFit(pts) {
  let sx = 0,
    sy = 0,
    sxx = 0,
    syy = 0,
    sxy = 0,
    sxz = 0,
    syz = 0,
    sz = 0;
  for (const [x, y] of pts) {
    const z = x * x + y * y;
    sx += x;
    sy += y;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
    sxz += x * z;
    syz += y * z;
    sz += z;
  }
  const M = [
    [sxx, sxy, sx, sxz],
    [sxy, syy, sy, syz],
    [sx, sy, pts.length, sz],
  ];
  for (let i = 0; i < 3; i++) {
    let p = i;
    for (let j = i + 1; j < 3; j++) if (Math.abs(M[j][i]) > Math.abs(M[p][i])) p = j;
    [M[i], M[p]] = [M[p], M[i]];
    for (let j = 0; j < 3; j++) {
      if (j === i) continue;
      const f = M[j][i] / M[i][i];
      for (let k = i; k < 4; k++) M[j][k] -= f * M[i][k];
    }
  }
  const cx = M[0][3] / M[0][0] / 2;
  const cy = M[1][3] / M[1][1] / 2;
  return { cx, cy, r: Math.sqrt(M[2][3] / M[2][2] + cx * cx + cy * cy) };
}
const circles = maxima.map((m) => {
  let c = { cx: m.x + 0.5, cy: m.y + 0.5, r: m.r };
  for (let it = 0; it < 6; it++)
    c = circleFit(C.filter(([x, y]) => Math.abs(Math.hypot(x - c.cx, y - c.cy) - c.r) < 2.5));
  return c;
});
const hubIndex = circles.reduce((b, c, i) => (c.r > circles[b].r ? i : b), 0);
const hub = circles[hubIndex];

/* 3. Necks: outline runs on no node. */
const onNode = C.map(([x, y]) =>
  circles.findIndex((c) => Math.abs(Math.hypot(x - c.cx, y - c.cy) - c.r) < 1),
);
const start = onNode.findIndex((v) => v >= 0);
const runs = [];
let run = null;
for (let s = 0; s < n; s++) {
  const i = (start + s) % n;
  if (onNode[i] < 0) (run ??= []).push(i);
  else if (run) {
    runs.push(run);
    run = null;
  }
}
if (run) runs.push(run);
const sides = runs
  .filter((r) => r.length > 60)
  .map((r) => ({ pts: r, from: onNode[(r[0] - 1 + n) % n], to: onNode[(r.at(-1) + 1) % n] }));

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts.at(-1)];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  let at = 0;
  let far = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs((pts[i][0] - a[0]) * dy - (pts[i][1] - a[1]) * dx) / len;
    if (d > far) {
      far = d;
      at = i;
    }
  }
  if (far <= eps) return [a, b];
  return [...rdp(pts.slice(0, at + 1), eps).slice(0, -1), ...rdp(pts.slice(at), eps)];
}
const poly = (pts) => `${pts.map((p, i) => `${i ? "L" : "M"}${fx(p[0])} ${fx(p[1])}`).join("")}Z`;
function halfPlane(pts, keep) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const fa = keep(a);
    const fb = keep(b);
    if (fa >= 0) out.push(a);
    if (fa >= 0 !== fb >= 0) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

const arms = circles
  .map((node, index) => ({ node, index }))
  .filter(({ index }) => index !== hubIndex)
  .map(({ node, index }) => {
    const out = sides.find((s) => s.from === hubIndex && s.to === index);
    const back = sides.find((s) => s.from === index && s.to === hubIndex);
    if (!out || !back) throw new Error(`node ${index} has no connection to the hub`);
    const L = Math.hypot(node.cx - hub.cx, node.cy - hub.cy);
    const ux = (node.cx - hub.cx) / L;
    const uy = (node.cy - hub.cy) / L;
    const neck = [
      ...rdp(
        out.pts.map((i) => C[i]),
        EPS,
      ),
      [node.cx, node.cy],
      ...rdp(
        back.pts.map((i) => C[i]),
        EPS,
      ),
      [hub.cx, hub.cy],
    ];
    const t = (p) => (p[0] - hub.cx) * ux + (p[1] - hub.cy) * uy;
    const mid = (hub.r + (L - node.r)) / 2;
    return {
      out,
      back,
      angle: (Math.atan2(uy, ux) * 180) / Math.PI,
      node,
      inner: poly(halfPlane(neck, (p) => mid + OVERLAP - t(p))),
      outer: poly(halfPlane(neck, (p) => t(p) - (mid - OVERLAP))),
      hubOrigin: [hub.cx + ux * (hub.r - INSET), hub.cy + uy * (hub.r - INSET)],
      nodeOrigin: [node.cx - ux * (node.r - INSET), node.cy - uy * (node.r - INSET)],
    };
  })
  /* Clockwise from the top: the order the connections close in. */
  .sort((a, b) => ((a.angle + 450) % 360) - ((b.angle + 450) % 360));

/* The hub: its traced outline, each connection's mouth closed by a hub arc. */
const mouthStart = new Map(arms.map((a) => [a.out.pts[0], a]));
let i = (arms[0].back.pts.at(-1) + 1) % n;
const first = i;
let hubPath = "";
let chunk = [];
const flush = () => {
  const pts = rdp(chunk, EPS);
  hubPath += pts.map((p, k) => `${hubPath || k ? "L" : "M"}${fx(p[0])} ${fx(p[1])}`).join("");
  chunk = [];
};
do {
  const arm = mouthStart.get(i);
  chunk.push(C[i]);
  if (arm) {
    flush();
    const end = arm.back.pts.at(-1);
    const [sx, sy] = C[i];
    const [ex, ey] = C[end];
    const sweep = (sx - hub.cx) * (ey - hub.cy) - (sy - hub.cy) * (ex - hub.cx) > 0 ? 1 : 0;
    hubPath += `A${fx(hub.r)} ${fx(hub.r)} 0 0 ${sweep} ${fx(ex)} ${fx(ey)}`;
    i = end;
    chunk.push(C[i]);
  }
  i = (i + 1) % n;
} while (i !== first);
flush();
hubPath += "Z";

/* 4. The proof. */
const S = 2;
const body =
  `<path d="${hubPath}"/>` +
  arms
    .map(
      (a) =>
        `<path d="${a.inner}"/><path d="${a.outer}"/><circle cx="${fx(a.node.cx)}" cy="${fx(a.node.cy)}" r="${fx(a.node.r)}"/>`,
    )
    .join("");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * S}" height="${H * S}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
const drawn = await sharp(Buffer.from(svg)).ensureAlpha().raw().toBuffer();
const ref = await sharp(SRC)
  .resize(W * S, H * S)
  .ensureAlpha()
  .raw()
  .toBuffer();
let both = 0;
let either = 0;
for (let k = 3; k < drawn.length; k += 4) {
  const a = drawn[k] >= 128;
  const b = ref[k] >= 128;
  if (a && b) both++;
  if (a || b) either++;
}
const iou = both / either;
console.log(`trace-mark: parts vs artwork, ${(iou * 100).toFixed(2)}% overlap`);
if (iou < MIN_IOU)
  throw new Error(`the traced parts do not match the artwork (< ${MIN_IOU * 100}%) — not written`);

const ts = `/*
 * THE NEOGEN MARK, AS PARTS — generated by \`scripts/trace-mark.mjs\` from the
 * owner's artwork (\`public/branding/neogen-mark.png\`). Do not edit by hand:
 * replace the artwork and run \`npm run brand\`.
 *
 * Measured, not drawn: the parts rasterised together overlap the artwork's
 * own pixels ${(iou * 100).toFixed(2)}% (the rest is antialiasing at the edge).
 */

/** The artwork's trimmed box: every coordinate below is in these units. */
export const MARK_BOX = { width: ${W}, height: ${H} } as const;

/** The hub: its traced outline, each connection's mouth closed by an arc. */
export const MARK_HUB = { cx: ${fx(hub.cx)}, cy: ${fx(hub.cy)}, r: ${fx(hub.r)}, d: "${hubPath}" } as const;

export interface MarkArm {
  /** The outer node: a true circle. */
  node: { cx: number; cy: number; r: number };
  /** Degrees, hub → node, screen coordinates (y down). */
  angle: number;
  /** The connection's half that belongs to the hub. */
  inner: string;
  /** The connection's half that belongs to the node. */
  outer: string;
  /** Where each half grows from: just inside its own node, on the axis. */
  hubOrigin: readonly [number, number];
  nodeOrigin: readonly [number, number];
}

/** The four arms, clockwise from the top — the order the connections close. */
export const MARK_ARMS: readonly MarkArm[] = [
${arms
  .map(
    (a) => `  {
    node: { cx: ${fx(a.node.cx)}, cy: ${fx(a.node.cy)}, r: ${fx(a.node.r)} },
    angle: ${fx(a.angle)},
    inner: "${a.inner}",
    outer: "${a.outer}",
    hubOrigin: [${a.hubOrigin.map(fx).join(", ")}],
    nodeOrigin: [${a.nodeOrigin.map(fx).join(", ")}],
  },`,
  )
  .join("\n")}
];
`;
writeFileSync(OUT, ts);
console.log(`trace-mark: wrote ${OUT}`);
