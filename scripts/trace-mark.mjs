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
 *   1. The outline: a sub-pixel contour of the alpha channel at 50%,
 *      smoothed along its length by about a pixel (the export's antialiasing
 *      is quantised to its pixel grid; at 800px and more that grid showed as
 *      a ripple along every curve).
 *   2. The nodes: the five maxima of the shape's distance transform are the
 *      centres of its five round parts; each is refined by a least-squares
 *      circle fit to the outline points that lie on it. The fits find where
 *      each connection leaves and meets its nodes, and give each node a
 *      centre and radius for motion — but no node is DRAWN as a circle: at
 *      macro scale a fitted circle and the drawing differ by up to a pixel
 *      where they meet, and that showed as a step at every join.
 *   3. The pieces: the outline is cut where it leaves and meets each node —
 *      the hub's stretches, each connection's two sides (flares included),
 *      each node's stretch — and the whole loop becomes ONE chain of smooth
 *      curves (Catmull-Rom through evenly spaced points) before it is cut,
 *      so neighbouring pieces share their end point and tangent and no seam
 *      can show at any size. Each node and the hub close across a
 *      connection's mouth with an arc of their circle (inside the
 *      connection); each connection is cut in two at the middle of its gap
 *      (a 1.5-unit overlap): a half that belongs to the hub and a half that
 *      belongs to the node — which is what lets it reach from both ends.
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
/**
 * Spacing of the points the curves pass through, in artwork pixels (the mark
 * is 389×485). Even spacing, not a simplification: Catmull-Rom curves through
 * unevenly spaced points kink where a long chord meets a short one.
 */
const STEP = 5;
/**
 * The outline is smoothed along its length with a Gaussian of this many
 * samples (≈1px) before anything is measured: the export's antialiasing is
 * quantised to the pixel grid, and at 800px and more those steps showed as a
 * faint ripple along every curve. One pixel of smoothing removes the grid,
 * not the drawing (the proof below still compares with the raw artwork).
 */
const SIGMA = 3;
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
const C = smoothLoop(
  loops[0].map(([x, y]) => [x + 0.5, y + 0.5]),
  SIGMA,
);
const n = C.length;

function smoothLoop(pts, sigma) {
  const k = Math.ceil(sigma * 3);
  const w = Array.from({ length: 2 * k + 1 }, (_, j) =>
    Math.exp(-((j - k) ** 2) / (2 * sigma * sigma)),
  );
  const sum = w.reduce((a, b) => a + b, 0);
  return pts.map((_, i) => {
    let x = 0;
    let y = 0;
    for (let j = -k; j <= k; j++) {
      const [px, py] = pts[(i + j + pts.length) % pts.length];
      x += px * w[j + k];
      y += py * w[j + k];
    }
    return [x / sum, y / sum];
  });
}

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

/* 3. The pieces: the outline cut where it leaves and meets each node. */
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

const arms = circles
  .map((node, index) => ({ node, index }))
  .filter(({ index }) => index !== hubIndex)
  .map(({ node, index }) => {
    const out = sides.find((s) => s.from === hubIndex && s.to === index);
    const back = sides.find((s) => s.from === index && s.to === hubIndex);
    if (!out || !back) throw new Error(`node ${index} has no connection to the hub`);
    const L = Math.hypot(node.cx - hub.cx, node.cy - hub.cy);
    return {
      node,
      out,
      back,
      ux: (node.cx - hub.cx) / L,
      uy: (node.cy - hub.cy) / L,
      L,
      angle: (Math.atan2(node.cy - hub.cy, node.cx - hub.cx) * 180) / Math.PI,
    };
  })
  /* Clockwise from the top: the order the connections close in. */
  .sort((a, b) => ((a.angle + 450) % 360) - ((b.angle + 450) % 360));

/*
 * ONE OUTLINE, CUT INTO PIECES THAT SHARE THEIR ENDS. Going round the
 * outline: the hub's own stretch, a connection's side out to its node, the
 * node's stretch, the side back, the hub again… Each stretch is simplified
 * with its ends kept, and the whole loop is turned into one chain of smooth
 * curves (Catmull-Rom through the kept points, each tangent from the points
 * either side) BEFORE it is cut — so where a node meets its connection the
 * two pieces share the point and the tangent, and no seam or step can show
 * at any size. Nothing is fitted where the pieces join: the nodes are their
 * own traced outlines (closed through the mouth by an arc of their circle,
 * which lies inside the connection), not circles laid over the drawing.
 */
/** Points every ~STEP along a stretch of the outline, its two ends kept. */
function resample(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++)
    acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = acc.at(-1);
  const count = Math.max(1, Math.round(total / STEP));
  const out = [];
  let j = 0;
  for (let k = 0; k <= count; k++) {
    const d = (total * k) / count;
    while (j < pts.length - 2 && acc[j + 1] < d) j++;
    const t = (d - acc[j]) / (acc[j + 1] - acc[j] || 1);
    out.push([
      pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t,
      pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t,
    ]);
  }
  return out;
}

const idxRange = (from, to) => {
  const out = [from];
  for (let i = from; i !== to;) {
    i = (i + 1) % n;
    out.push(i);
  }
  return out;
};
const stretches = [];
arms.forEach((arm, k) => {
  const next = arms[(k + 1) % arms.length];
  stretches.push({ kind: "out", arm: k, idx: idxRange(arm.out.pts[0], arm.out.pts.at(-1)) });
  stretches.push({ kind: "node", arm: k, idx: idxRange(arm.out.pts.at(-1), arm.back.pts[0]) });
  stretches.push({ kind: "back", arm: k, idx: idxRange(arm.back.pts[0], arm.back.pts.at(-1)) });
  stretches.push({ kind: "hub", arm: k, idx: idxRange(arm.back.pts.at(-1), next.out.pts[0]) });
});
/* The loop of kept points, each stretch owning the segments from its first point. */
const loop = [];
for (const st of stretches) {
  const kept = resample(st.idx.map((i) => C[i]));
  st.first = loop.length;
  loop.push(...kept.slice(0, -1));
  st.count = kept.length - 1;
}
const m = loop.length;
const P = (i) => loop[(i + m) % m];
/** Segment i: from loop point i to i+1, as a cubic [p0, c1, c2, p1]. */
const seg = (i) => {
  const [p0, p1, p2, p3] = [P(i - 1), P(i), P(i + 1), P(i + 2)];
  return [
    p1,
    [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
    [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
    p2,
  ];
};
const segsOf = (st) => Array.from({ length: st.count }, (_, j) => seg(st.first + j));
const pt = (p) => `${fx(p[0])} ${fx(p[1])}`;
const curves = (segs) => segs.map(([, c1, c2, p1]) => `C${pt(c1)} ${pt(c2)} ${pt(p1)}`).join("");
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function split([p0, c1, c2, p1], t) {
  const a = lerp2(p0, c1, t);
  const b = lerp2(c1, c2, t);
  const c = lerp2(c2, p1, t);
  const d = lerp2(a, b, t);
  const e = lerp2(b, c, t);
  const f = lerp2(d, e, t);
  return [
    [p0, a, d, f],
    [f, e, c, p1],
  ];
}
const at = ([p0, c1, c2, p1], t) => {
  const u = 1 - t;
  return [
    u ** 3 * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * p1[0],
    u ** 3 * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * p1[1],
  ];
};
/** Cut a chain of curves where `f` (linear along the arm) changes sign: [before, after]. */
function cut(segs, f) {
  for (let j = 0; j < segs.length; j++) {
    const s0 = f(segs[j][0]);
    const s1 = f(segs[j][3]);
    if (s0 === 0 || s0 > 0 === s1 > 0) continue;
    let lo = 0;
    let hi = 1;
    for (let it = 0; it < 40; it++) {
      const mid = (lo + hi) / 2;
      if (f(at(segs[j], mid)) > 0 === s0 > 0) lo = mid;
      else hi = mid;
    }
    const [x, y] = split(segs[j], (lo + hi) / 2);
    return [
      [...segs.slice(0, j), x],
      [y, ...segs.slice(j + 1)],
    ];
  }
  throw new Error("a connection does not cross its own middle");
}

/** The short arc of a node's circle across a connection's mouth, from a to b. */
const mouth = (c, a, b) => {
  const sweep = (a[0] - c.cx) * (b[1] - c.cy) - (a[1] - c.cy) * (b[0] - c.cx) > 0 ? 1 : 0;
  return `A${fx(c.r)} ${fx(c.r)} 0 0 ${sweep} ${pt(b)}`;
};

const pieces = arms.map((arm, k) => {
  const { node, ux, uy, L } = arm;
  const outSegs = segsOf(stretches.find((s) => s.kind === "out" && s.arm === k));
  const backSegs = segsOf(stretches.find((s) => s.kind === "back" && s.arm === k));
  const nodeSegs = segsOf(stretches.find((s) => s.kind === "node" && s.arm === k));
  const along = (v) => (p) => (p[0] - hub.cx) * ux + (p[1] - hub.cy) * uy - v;
  const mid = (hub.r + (L - node.r)) / 2;
  /* Hub half: out-side up to just past the middle, across, back-side home. */
  const [outIn] = cut(outSegs, along(mid + OVERLAP));
  const [, backIn] = cut(backSegs, along(mid + OVERLAP));
  const [, outOut] = cut(outSegs, along(mid - OVERLAP));
  const [backOut] = cut(backSegs, along(mid - OVERLAP));
  const inner =
    `M${pt(outIn[0][0])}${curves(outIn)}L${pt(backIn[0][0])}${curves(backIn)}` +
    `L${pt([hub.cx, hub.cy])}Z`;
  const outer =
    `M${pt(outOut[0][0])}${curves(outOut)}L${pt([node.cx, node.cy])}L${pt(backOut[0][0])}` +
    `${curves(backOut)}Z`;
  const nodeStart = nodeSegs[0][0];
  const nodeEnd = nodeSegs.at(-1)[3];
  const nodePath = `M${pt(nodeStart)}${curves(nodeSegs)}${mouth(node, nodeEnd, nodeStart)}Z`;
  return {
    ...arm,
    nodeEnd,
    nodePath,
    inner,
    outer,
    hubOrigin: [hub.cx + ux * (hub.r - INSET), hub.cy + uy * (hub.r - INSET)],
    nodeOrigin: [node.cx - ux * (node.r - INSET), node.cy - uy * (node.r - INSET)],
  };
});

/* The hub: its own stretches, each connection's mouth closed by an arc. */
let hubPath = "";
arms.forEach((arm, k) => {
  const st = stretches.find((s) => s.kind === "hub" && s.arm === k);
  const segs = segsOf(st);
  if (!hubPath) hubPath = `M${pt(segs[0][0])}`;
  hubPath += curves(segs);
  const j = (k + 1) % arms.length;
  const mouthStart = segs.at(-1)[3];
  const mouthEnd = segsOf(stretches.find((s) => s.kind === "back" && s.arm === j)).at(-1)[3];
  hubPath += mouth(hub, mouthStart, mouthEnd);
});
hubPath += "Z";

/* 4. The proof. */
const S = 2;
const body =
  `<path d="${hubPath}"/>` +
  pieces
    .map((a) => `<path d="${a.inner}"/><path d="${a.outer}"/><path d="${a.nodePath}"/>`)
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
  /** The outer node: its traced outline, closed across the mouth by an arc of its circle (centre and radius fitted). */
  node: { cx: number; cy: number; r: number; d: string };
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
${pieces
  .map(
    (a) => `  {
    node: { cx: ${fx(a.node.cx)}, cy: ${fx(a.node.cy)}, r: ${fx(a.node.r)}, d: "${a.nodePath}" },
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

/*
 * THE OUTLINE AS POINTS — for a mark whose silhouette is computed at run time
 * (the Living Ink prototype, `brand/livingInk.ts`). The same evenly spaced
 * points the curves above pass through, in order round the outline, each
 * labelled with the piece it belongs to: h = hub, a–d = a connection's sides
 * (arm 0–3, clockwise from the top), A–D = that arm's node. A separate
 * module so the static mark never carries it.
 */
const label = { hub: "h", out: "abcd", back: "abcd", node: "ABCD" };
let parts = "";
for (const st of stretches)
  parts += (st.kind === "hub" ? "h" : label[st.kind][st.arm]).repeat(st.count);
const OUTLINE = "src/components/brand/markOutline.ts";
writeFileSync(
  OUTLINE,
  `/*
 * THE NEOGEN MARK'S OUTLINE AS POINTS — generated by \`scripts/trace-mark.mjs\`
 * with \`markGeometry.ts\`. Do not edit by hand.
 */

/** x0, y0, x1, y1… round the outline (artwork units), evenly spaced. */
export const OUTLINE_POINTS: readonly number[] = [${loop.map(([x, y]) => `${fx(x)},${fx(y)}`).join(",")}];

/** Per point: h hub · a–d a connection's side (arm 0–3) · A–D that arm's node. */
export const OUTLINE_PARTS = "${parts}";

/** Each arm's excursion: first and last point index (from the hub, round the node, back). */
export const OUTLINE_ARMS: readonly (readonly [number, number])[] = [${arms
    .map((_, k) => {
      const out = stretches.find((st) => st.kind === "out" && st.arm === k);
      const back = stretches.find((st) => st.kind === "back" && st.arm === k);
      return `[${out.first}, ${back.first + back.count}]`;
    })
    .join(", ")}];
`,
);
console.log(`trace-mark: wrote ${OUTLINE} (${m} points)`);
console.log(`trace-mark: wrote ${OUT}`);
