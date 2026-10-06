import { prefersReducedMotion } from "@/lib/reducedMotion";

import { MARK_ARMS, MARK_HUB } from "./markGeometry";
import { OUTLINE_ARMS, OUTLINE_PARTS, OUTLINE_POINTS } from "./markOutline";

/*
 * LIVING INK — the mark at macro scale as a material (2026-10-05; CONVENTIONS
 * §19, PROJECT_STATE §8ay).
 *
 * The mark's silhouette as a slow, viscous material: the outline the static
 * mark is drawn from (`markOutline.ts`, the same points the curves pass
 * through), each point moved a little along its own normal and redrawn as
 * the same smooth curves. Nothing here is noise and nothing is a filter: the
 * movement is AUTHORED, from the mark's own structure.
 *
 *   volume      each node slowly swells or gives a little, and the hub
 *               answers the other way — material redistributing through the
 *               structure, never the whole mark breathing at once;
 *   tension     each connection's neck slowly thins or thickens at its
 *               middle;
 *   migration   now and then a small swell travels along one connection,
 *               from the hub to its node or back, over several seconds;
 *   episodes    (where the caller asks for a READABLE rest) one region at a
 *               time changes slowly and coherently, then settles — see
 *               `Episode`;
 *   pointer     while the pointer is near, the surface nearest it leans
 *               toward it, following a little behind, and lets go slowly
 *               when it leaves — a presence, never a trigger;
 *   disturbance a tap, an area change or a connection closing sends a
 *               ripple round the surface from that point, and the node it
 *               starts in catches and settles. Then living rest again.
 *
 * Each slow signal is a sum of three sines with periods of 17s to 2 min and
 * random phases, so the movement is irregular and never visibly repeats.
 * Amplitudes are in the artwork's units (485 tall): a `rest` of 1 moves the
 * edge about 2px on a mark 1000px tall.
 *
 * Brand material only — it does not depict anything.
 *
 * Cost: one path. At rest it is computed ten (with episodes, twenty) times a
 * second and rewritten only when the edge has moved a third of a pixel on
 * screen; while a disturbance travels or the pointer is near, every frame
 * (still written only when it has moved). NOTHING runs while the
 * mark is off screen, the tab is hidden, or the reader prefers reduced
 * motion (then the path is simply the canonical outline).
 */

const N = OUTLINE_POINTS.length / 2;
const TAU = Math.PI * 2;

interface Point {
  x: number;
  y: number;
  nx: number;
  ny: number;
  /** 0–3: an arm's node or connection; 4: the hub. */
  owner: number;
  neck: boolean;
  /** Along a connection: 0 at the hub's surface, 1 at the node's. */
  u: number;
  /** Arc length round the outline. */
  s: number;
}

const points: Point[] = (() => {
  const out: Point[] = [];
  for (let i = 0; i < N; i++) {
    const x = OUTLINE_POINTS[i * 2];
    const y = OUTLINE_POINTS[i * 2 + 1];
    const c = OUTLINE_PARTS[i];
    const owner = c === "h" ? 4 : "abcd".includes(c) ? "abcd".indexOf(c) : "ABCD".indexOf(c);
    const neck = "abcd".includes(c);
    let u = 0;
    if (owner < 4) {
      const arm = MARK_ARMS[owner];
      const ax = arm.node.cx - MARK_HUB.cx;
      const ay = arm.node.cy - MARK_HUB.cy;
      const L = Math.hypot(ax, ay);
      const along = ((x - MARK_HUB.cx) * ax + (y - MARK_HUB.cy) * ay) / L;
      u = Math.min(1, Math.max(0, (along - MARK_HUB.r) / (L - MARK_HUB.r - arm.node.r)));
      if (!neck) u = 1;
    }
    out.push({ x, y, nx: 0, ny: 0, owner, neck, u, s: 0 });
  }
  /* Normals from the neighbours, turned to face out of the shape. */
  for (let i = 0; i < N; i++) {
    const a = out[(i - 1 + N) % N];
    const b = out[(i + 1) % N];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const l = Math.hypot(tx, ty) || 1;
    out[i].nx = ty / l;
    out[i].ny = -tx / l;
  }
  const h = out.find((p) => p.owner === 4)!;
  if ((h.x - MARK_HUB.cx) * h.nx + (h.y - MARK_HUB.cy) * h.ny < 0) {
    for (const p of out) {
      p.nx = -p.nx;
      p.ny = -p.ny;
    }
  }
  for (let i = 1; i < N; i++)
    out[i].s = out[i - 1].s + Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y);
  return out;
})();
const PERIMETER =
  points[N - 1].s + Math.hypot(points[0].x - points[N - 1].x, points[0].y - points[N - 1].y);

/** A slow, irregular signal in [-1, 1]: three sines, incommensurate periods. */
function signal(ranges: readonly [number, number][]) {
  const parts = ranges.map(([lo, hi], j) => ({
    w: [0.55, 0.3, 0.15][j],
    T: lo + Math.random() * (hi - lo),
    phase: Math.random() * TAU,
  }));
  return (t: number) =>
    parts.reduce((sum, p) => sum + p.w * Math.sin((TAU * t) / p.T + p.phase), 0);
}

const smooth = (x: number) => x * x * (3 - 2 * x);

export interface InkOptions {
  /** Living-rest amplitude, artwork units. 0: still until disturbed. */
  rest: number;
  /** Disturbance amplitude, artwork units. 0: never disturbed. */
  disturb: number;
  /** A fragment: only these arms (clockwise from the top); the rest closed by hub arcs. */
  arms?: readonly number[];
  /**
   * EPISODES (a perceptible living rest): amplitudes in artwork units for
   * slow, local events laid over the drift — see `Episode`. Absent: the drift
   * alone (the footer).
   */
  episodes?: { swell: number; tension: number; migrate: number };
}

/*
 * AN EPISODE — one region of the material changing, slowly and coherently,
 * then settling: the drift alone moves a tenth of a pixel a second in every
 * direction at once and cancels itself out, so nobody sees it. An episode is
 * readable because it is ONE thing: a node swelling over about four seconds
 * while the hub gives a little, a neck gaining or losing tension, a bulge
 * travelling from the hub along a connection into its node. At most two at
 * once, on different regions, started a few seconds apart, so the parts
 * evolve out of step; now and then one is a little stronger.
 */
interface Episode {
  kind: "swell" | "tension" | "migrate";
  /** 0–3: an arm; 4: the hub (swell only). */
  region: number;
  t0: number;
  rise: number;
  hold: number;
  fall: number;
  amp: number;
}

function envelope(e: Episode, t: number): number {
  const k = t - e.t0;
  if (k <= 0) return 0;
  if (k < e.rise) return smooth(k / e.rise);
  if (k < e.rise + e.hold) return 1;
  if (k < e.rise + e.hold + e.fall) return 1 - smooth((k - e.rise - e.hold) / e.fall);
  return 0;
}

interface Impulse {
  s0: number;
  t0: number;
  strength: number;
}

export class LivingInk {
  private path: SVGPathElement;
  private options: InkOptions;
  private volume = [0, 1, 2, 3].map(() =>
    signal([
      [26, 40],
      [41, 67],
      [70, 120],
    ]),
  );
  private tension = [0, 1, 2, 3].map(() =>
    signal([
      [17, 29],
      [31, 47],
      [53, 89],
    ]),
  );
  private pulse: { arm: number; out: boolean; t0: number; dur: number } | null = null;
  private nextPulse = 6 + Math.random() * 8;
  private impulses: Impulse[] = [];
  /* The pointer: where it is, where the material has followed it to (a
     viscous lag), and how present it is (eases in, and out after it leaves). */
  private target: { x: number; y: number } | null = null;
  private follow = { x: 0, y: 0 };
  private presence = 0;
  private lastTick = 0;
  private active: Episode[] = [];
  private nextEpisode = 0;
  private lastRegion = -1;
  private frame = 0;
  private timer = 0;
  private running = false;
  private visible = false;
  /** The displacement last written, per point, to skip writes nobody could see. */
  private written = new Float64Array(N);
  /** Screen pixels per artwork unit, measured when the mark is seen. */
  private pxPerUnit = 1;
  private start = performance.now();
  private observer: IntersectionObserver;
  private onVisibility = () => this.wake();
  /** Path writes so far, for measuring its cost. */
  writes = 0;

  constructor(path: SVGPathElement, options: InkOptions) {
    this.path = path;
    this.options = options;
    this.draw(null);
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.wake();
    });
    this.observer.observe(path.ownerSVGElement ?? path);
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  set(options: Partial<InkOptions>) {
    this.options = { ...this.options, ...options };
    this.wake();
  }

  /** A disturbance from the outline point nearest (x, y), in artwork units. */
  touch(x: number, y: number, strength = 1) {
    if (prefersReducedMotion() || this.options.disturb === 0) return;
    let best = 0;
    let d = Infinity;
    points.forEach((p, i) => {
      const e = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (e < d && this.included(p)) {
        d = e;
        best = i;
      }
    });
    this.impulses.push({ s0: points[best].s, t0: this.now(), strength });
    this.wake();
  }

  /**
   * The pointer at (x, y), artwork units, or gone (null). Not an event but a
   * presence: while it is near, the material leans toward it, following it
   * a little behind; when it leaves, the material lets go slowly.
   */
  point(at: { x: number; y: number } | null) {
    if (prefersReducedMotion() || this.options.disturb === 0) return;
    if (at && this.presence < 0.02) this.follow = { ...at };
    this.target = at;
    this.wake();
  }

  /** Something that moves faster than rest: a disturbance, or the pointer. */
  private get fast() {
    return this.impulses.length > 0 || this.target !== null || this.presence > 0;
  }

  /** The connection closing on arm k: surface tension catching at its middle. */
  contact(k: number, strength = 1) {
    const arm = MARK_ARMS[k];
    const mx = (MARK_HUB.cx + arm.node.cx) / 2;
    const my = (MARK_HUB.cy + arm.node.cy) / 2;
    this.touch(mx, my, strength);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.timer);
    this.observer.disconnect();
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  private now() {
    return (performance.now() - this.start) / 1000;
  }

  private included(p: Point) {
    return p.owner === 4 || !this.options.arms || this.options.arms.includes(p.owner);
  }

  private wake() {
    const live =
      this.visible &&
      document.visibilityState === "visible" &&
      !prefersReducedMotion() &&
      (this.options.rest > 0 || this.fast);
    if (live && !this.running) {
      this.running = true;
      const box = (this.path.ownerSVGElement ?? this.path).getBoundingClientRect();
      this.pxPerUnit = box.height / 485 || 1;
      this.lastTick = this.now();
      /* Whoever has just started looking sees something begin soon. */
      if (this.options.episodes && this.active.length === 0) this.nextEpisode = this.now() + 0.8;
      this.schedule();
    } else if (!live && this.running) {
      this.running = false;
      cancelAnimationFrame(this.frame);
      window.clearTimeout(this.timer);
      if (prefersReducedMotion()) this.draw(null);
    } else if (live && this.fast) {
      /* A disturbance or the pointer during rest: from the slow clock to every frame. */
      window.clearTimeout(this.timer);
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(this.tick);
    }
  }

  /*
   * TWO CLOCKS. At rest the material moves a fraction of a pixel a second, so
   * it is computed ten times a second and WRITTEN only when some point of the
   * edge has moved a third of a pixel on screen since the last write — a few
   * writes a second. A disturbance, or the pointer near, moves faster: every
   * frame until it settles (still written only when it has moved).
   */
  private schedule() {
    if (!this.running) return;
    if (this.fast) this.frame = requestAnimationFrame(this.tick);
    /* Episodes move the edge a few pixels a second: twenty steps a second
       keeps each one under a third of a pixel. */
    else this.timer = window.setTimeout(this.tick, this.options.episodes ? 50 : 100);
  }

  private tick = () => {
    if (!this.running) return;
    const t = this.now();
    const dt = Math.min(0.1, t - this.lastTick);
    this.lastTick = t;
    this.impulses = this.impulses.filter((imp) => t - imp.t0 < 3);
    if (this.target) {
      const k = 1 - Math.exp(-dt / 0.3);
      this.follow.x += (this.target.x - this.follow.x) * k;
      this.follow.y += (this.target.y - this.follow.y) * k;
    }
    const goal = this.target ? 1 : 0;
    this.presence += (goal - this.presence) * (1 - Math.exp(-dt / (goal ? 0.45 : 0.9)));
    if (!this.target && this.presence < 0.002) this.presence = 0;
    this.draw(t, this.fast ? 0.1 : 0.33);
    if (this.options.rest === 0 && !this.fast) {
      this.draw(null);
      this.running = false;
      return;
    }
    this.schedule();
  };

  /** The episodes running at time t, with their envelopes; starts the next when due. */
  private episodesAt(t: number): [Episode, number][] {
    const amps = this.options.episodes!;
    this.active = this.active.filter((e) => t - e.t0 < e.rise + e.hold + e.fall);
    if (t >= this.nextEpisode && this.active.length < 2) {
      const arms = (this.options.arms ?? [0, 1, 2, 3]).filter(
        (k) => k !== this.lastRegion && !this.active.some((e) => e.region === k),
      );
      const r = Math.random();
      const kind: Episode["kind"] = r < 0.45 ? "swell" : r < 0.75 ? "tension" : "migrate";
      const hubFree = this.lastRegion !== 4 && !this.active.some((e) => e.region === 4);
      const region =
        kind === "swell" && hubFree && Math.random() < 0.25
          ? 4
          : arms[Math.floor(Math.random() * arms.length)];
      if (region !== undefined) {
        const strong = Math.random() < 0.25 ? 1.35 : 0.85 + Math.random() * 0.3;
        const sign =
          kind === "migrate" ? 1 : Math.random() < (kind === "swell" ? 0.7 : 0.6) ? 1 : -1;
        this.active.push({
          kind,
          region,
          t0: t,
          rise: 3.5 + Math.random() * 1.5,
          hold: 0.8 + Math.random() * 0.8,
          fall: 5 + Math.random() * 2,
          amp: amps[kind] * strong * sign,
        });
        this.lastRegion = region;
      }
      this.nextEpisode = t + 2.5 + Math.random() * 2;
    }
    return this.active.map((e) => [e, e.kind === "migrate" ? 1 : envelope(e, t)]);
  }

  /** One episode's displacement of one point (before its envelope). */
  private episodeAt(e: Episode, p: Point, t: number): number {
    if (e.kind === "swell") {
      if (e.region === 4) {
        if (p.owner === 4) return e.amp;
        if (p.neck) return (1 - smooth(p.u)) * e.amp - smooth(p.u) * 0.2 * e.amp;
        return -0.2 * e.amp;
      }
      /* A node swells; the hub, and the neck's hub end, give a little. */
      if (p.owner === e.region)
        return p.neck ? smooth(p.u) * e.amp - (1 - smooth(p.u)) * 0.35 * e.amp : e.amp;
      return p.owner === 4 ? -0.35 * e.amp : 0;
    }
    if (p.owner !== e.region) return 0;
    if (e.kind === "tension") return p.neck ? -e.amp * Math.sin(Math.PI * p.u) ** 2 : 0;
    /* A bulge from the hub, along the connection, into the node. */
    const k = (t - e.t0) / (e.rise + e.hold + e.fall);
    const at = p.neck ? p.u : 1;
    return e.amp * Math.sin(Math.PI * k) * Math.exp(-(((at - k * 1.15) / 0.17) ** 2));
  }

  /** The displaced outline at time t (null: the canonical outline). */
  private draw(t: number | null, lazy = 0) {
    const { rest, disturb } = this.options;
    const xs = new Float64Array(N);
    const ys = new Float64Array(N);
    const ds = new Float64Array(N);
    let v: number[] = [0, 0, 0, 0, 0];
    let n: number[] = [0, 0, 0, 0];
    if (t !== null && rest > 0) {
      v = this.volume.map((f) => f(t));
      v.push((-0.6 * (v[0] + v[1] + v[2] + v[3])) / 4);
      n = this.tension.map((f) => f(t));
      if (!this.pulse && t > this.nextPulse) {
        this.pulse = {
          arm: Math.floor(Math.random() * 4),
          out: Math.random() < 0.6,
          t0: t,
          dur: 6 + Math.random() * 4,
        };
      }
      if (this.pulse && t - this.pulse.t0 > this.pulse.dur) {
        this.pulse = null;
        this.nextPulse = t + 14 + Math.random() * 14;
      }
    }
    const episodes = t !== null && this.options.episodes ? this.episodesAt(t) : [];
    /* The episodes, softened along the outline so no junction (neck to node,
       neck to hub) ever shows as a corner. */
    const es = new Float64Array(N);
    if (episodes.length > 0) {
      for (let i = 0; i < N; i++)
        for (const [e, env] of episodes) es[i] += env * this.episodeAt(e, points[i], t!);
      soften(es);
      soften(es);
    }
    for (let i = 0; i < N; i++) {
      const p = points[i];
      let d = 0;
      if (t !== null && rest > 0) {
        if (p.owner === 4) d += v[4];
        else if (!p.neck) d += v[p.owner];
        else {
          const w = smooth(p.u);
          d += (1 - w) * v[4] * 0.8 + w * v[p.owner] * 0.8;
          d -= n[p.owner] * Math.sin(Math.PI * p.u) ** 2 * 0.9;
        }
        if (this.pulse && p.owner === this.pulse.arm) {
          const k = (t - this.pulse.t0) / this.pulse.dur;
          const env = Math.sin(Math.PI * k);
          const uc = this.pulse.out ? k : 1 - k;
          d += 0.9 * env * Math.exp(-((((p.neck ? p.u : 1) - uc) / 0.16) ** 2));
        }
        d *= rest;
      }
      /* The episodes are not scaled by the drift: their amplitudes are their own. */
      d += es[i];
      if (t !== null && disturb > 0) {
        for (const imp of this.impulses) {
          const a = t - imp.t0;
          let dist = Math.abs(p.s - imp.s0);
          dist = Math.min(dist, PERIMETER - dist);
          /* A ripple travelling both ways round the surface, fading as it goes. */
          const x = (dist - 150 * a) / 26;
          const ripple = (1 - 2 * x * x) * Math.exp(-x * x) * Math.exp(-a / 0.8);
          /* The point where it started catches, swells and settles. */
          const local =
            Math.exp(-((dist / 45) ** 2)) * Math.exp(-a / 0.45) * Math.cos((TAU * a) / 0.9);
          d += disturb * imp.strength * (0.55 * ripple + local);
        }
        /* The pointer: the surface nearest it leans toward it. */
        if (this.presence > 0) {
          const r2 = (p.x - this.follow.x) ** 2 + (p.y - this.follow.y) ** 2;
          d += disturb * 1.5 * this.presence * Math.exp(-r2 / 55 ** 2);
        }
      }
      ds[i] = d;
      xs[i] = p.x + p.nx * d;
      ys[i] = p.y + p.ny * d;
    }
    if (lazy) {
      let moved = 0;
      for (let i = 0; i < N; i++) moved = Math.max(moved, Math.abs(ds[i] - this.written[i]));
      if (moved * this.pxPerUnit < lazy) return;
    }
    this.written = ds;
    this.writes++;
    this.path.setAttribute("d", outline(xs, ys, this.options.arms));
  }
}

/** A [1 4 6 4 1] pass round the closed outline. */
function soften(a: Float64Array) {
  const b = Float64Array.from(a);
  for (let i = 0; i < N; i++)
    a[i] =
      (b[(i - 2 + N) % N] +
        4 * b[(i - 1 + N) % N] +
        6 * b[i] +
        4 * b[(i + 1) % N] +
        b[(i + 2) % N]) /
      16;
}

/** Smooth curves through the points; an omitted arm's excursion becomes a hub arc. */
function outline(xs: ArrayLike<number>, ys: ArrayLike<number>, arms?: readonly number[]) {
  const skip = new Set<number>();
  const arcs = new Map<number, number>();
  OUTLINE_ARMS.forEach(([a, b], k) => {
    if (arms && !arms.includes(k)) {
      /* From the last point on the hub circle either side: the excursion's
         own ends already lean into the neck's fillet. */
      arcs.set((a - 1 + N) % N, (b + 1) % N);
      for (let i = a; i <= b; i++) skip.add(i % N);
    }
  });
  /* The arc is laid as more points round the hub, its radius going from
     where one end is to where the other is, so it swells and gives with the
     hub and the curves pass through it like any other stretch — no join. */
  const px: number[] = [];
  const py: number[] = [];
  for (let i = 0; i < N; i++) {
    if (skip.has(i)) continue;
    px.push(xs[i]);
    py.push(ys[i]);
    const to = arcs.get(i);
    if (to === undefined) continue;
    const r1 = Math.hypot(xs[i] - MARK_HUB.cx, ys[i] - MARK_HUB.cy);
    const r2 = Math.hypot(xs[to] - MARK_HUB.cx, ys[to] - MARK_HUB.cy);
    const a1 = Math.atan2(ys[i] - MARK_HUB.cy, xs[i] - MARK_HUB.cx);
    let da = Math.atan2(ys[to] - MARK_HUB.cy, xs[to] - MARK_HUB.cx) - a1;
    da -= TAU * Math.round(da / TAU);
    const steps = Math.ceil((Math.abs(da) * (r1 + r2)) / 2 / 5);
    for (let j = 1; j < steps; j++) {
      const k = j / steps;
      const r = r1 + (r2 - r1) * k;
      px.push(MARK_HUB.cx + r * Math.cos(a1 + da * k));
      py.push(MARK_HUB.cy + r * Math.sin(a1 + da * k));
    }
  }
  const m = px.length;
  const f = (v: number) => v.toFixed(2);
  const w = (j: number) => (j + m) % m;
  let d = `M${f(px[0])} ${f(py[0])}`;
  for (let j = 0; j < m; j++) {
    const [h, i1, i2, i3] = [w(j - 1), j, w(j + 1), w(j + 2)];
    const c1x = px[i1] + (px[i2] - px[h]) / 6;
    const c1y = py[i1] + (py[i2] - py[h]) / 6;
    const c2x = px[i2] - (px[i3] - px[i1]) / 6;
    const c2y = py[i2] - (py[i3] - py[i1]) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(px[i2])} ${f(py[i2])}`;
  }
  return `${d}Z`;
}

/** The canonical outline (no movement) — the first paint, and reduced motion. */
export function canonicalOutline(arms?: readonly number[]): string {
  return outline(
    points.map((p) => p.x),
    points.map((p) => p.y),
    arms,
  );
}
