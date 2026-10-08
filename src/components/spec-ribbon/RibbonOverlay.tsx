"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import {
  CanvasTexture,
  DoubleSide,
  ShaderMaterial,
  Texture,
  type BufferGeometry,
  type Mesh,
} from "three";

import {
  layRibbon,
  phase,
  planRibbon,
  RIBBON,
  ribbonGeometry,
  ribbonPrint,
  setOpacity,
  type Box,
  type RibbonPlan,
  type RibbonPrint,
} from "./ribbon";

/*
 * The band's camera looks down a little, so the band is seen to curve round
 * the vial and the roll shows the spiral at its top. The plane the band lies
 * flat in (z = 0) is stretched by 1 / cos to land exactly on the panel.
 */
const TILT = 0.08;
const DISTANCE = 3000;

/** The whole unroll and resolve, in seconds. */
const DURATION = 1.7;
/** It starts once the band's top edge is this far up the window. */
const TRIGGER = 0.7;

/*
 * The vial's shadow on the band where it comes out from behind the glass:
 * how dark at the vial's edge, and how far it reaches, in vial radii. The
 * panel draws the same (`.panel::after`), so nothing changes as it resolves.
 */
const SHADOW = 0.12;
const SHADOW_REACH = 0.18;

export interface RibbonMarks {
  bench: RefObject<HTMLElement | null>;
  panel: RefObject<HTMLElement | null>;
  hairline: RefObject<HTMLElement | null>;
  stripe: RefObject<HTMLElement | null>;
  lockup: RefObject<HTMLElement | null>;
  /** The panel's name and range: what the vial carries at rest, upright. */
  name: RefObject<HTMLElement | null>;
  range: RefObject<HTMLElement | null>;
  vial: RefObject<HTMLElement | null>;
}

/**
 * The band, drawn by a canvas laid over the bench:
 * orthographic, one unit to the CSS pixel, everything placed from the DOM. The
 * vial is the DOM's still underneath; a depth-only cylinder of its size stands
 * where it stands, so what passes behind the glass is hidden by it.
 *
 * The canvas spans the band's strip of the bench, not all of it: a little
 * above (nothing rises past the band's top edge) and more below (what curves
 * toward the viewer is seen a little lower, looking down).
 *
 * UPRIGHT (a phone; owner, 2026-10-01: "the exact same thing but
 * vertically"): the same scene a quarter turn clockwise — the vial lies along
 * the bench's top, the band unrolls down the page. Nothing is re-modelled:
 * every box the page measures is turned back into the band's own frame
 * (`frame`), and the camera rolls a quarter, so the picture it draws is the
 * wide one, turned.
 */
export default function RibbonOverlay({
  marks,
  stripe,
  upright,
}: {
  marks: RibbonMarks;
  /** The label's stripe, three stops (`Bench.stripe`). */
  stripe: readonly [string, string, string];
  /** The band runs down the page, not across it. */
  upright: boolean;
}) {
  return (
    <Canvas
      key={upright ? "upright" : "across"}
      style={
        upright
          ? {
              /* Turned: "above" the band is the page's right, "below" its left. */
              position: "absolute",
              insetBlock: 0,
              left: "calc(var(--band-left) - var(--band-w) * 0.2)",
              width: "calc(var(--band-w) * 1.2 + 1rem)",
              height: "100%",
              pointerEvents: "none",
            }
          : {
              position: "absolute",
              insetInline: 0,
              top: "calc(var(--band-top) - 1rem)",
              width: "100%",
              height: "calc(var(--band-h) * 1.2 + 1rem)",
              pointerEvents: "none",
            }
      }
      /* Multisampling only on 1× screens: at 2× the band's edges hold without
         it, and its buffers would be most of the canvas's memory. */
      gl={{ alpha: true, antialias: window.devicePixelRatio < 2 }}
      frameloop="demand"
      // It never reads its offset on the page: no re-measuring on every scroll.
      resize={{ scroll: false }}
      dpr={[1, 2]}
      orthographic
      camera={{
        position: [0, DISTANCE * Math.sin(TILT), DISTANCE * Math.cos(TILT)],
        // Upright, rolled a quarter: the band's length runs down the screen.
        rotation: [-TILT, 0, upright ? Math.PI / 2 : 0],
        zoom: 1,
        near: 1,
        far: DISTANCE * 2,
      }}
      aria-hidden="true"
    >
      <Band marks={marks} colours={stripe} upright={upright} />
    </Canvas>
  );
}

/**
 * A page box in the band's frame. Across, as it is. Upright, turned a quarter
 * back: the band's length is the page's downward axis, and across the band
 * "down" is the page's leftward one.
 */
function frame(box: DOMRect, upright: boolean): Box {
  if (!upright) return box;
  return {
    left: box.top,
    right: box.bottom,
    top: -box.right,
    bottom: -box.left,
    width: box.height,
    height: box.width,
  };
}

function Band({
  marks,
  colours,
  upright,
}: {
  marks: RibbonMarks;
  colours: readonly [string, string, string];
  upright: boolean;
}) {
  const mesh = useRef<Mesh>(null);
  const occluder = useRef<Mesh>(null);
  const geometry = useRef<BufferGeometry | null>(null);
  const paper = useRef<Paper | null>(null);
  const plan = useRef<RibbonPlan | null>(null);
  const logo = useRef<Texture | null>(null);
  /** The name and range, drawn once per size for the vial's front (upright). */
  const words = useRef<{ key: string; texture: CanvasTexture } | null>(null);
  const label = useRef<[number, number, number, number] | null>(null);
  /** The two lockups would share the vial's face mid-run (`RibbonPrint.handover`). */
  const handover = useRef(false);
  const shown = useRef(-1);
  /** The band has come into view: it starts on the next frame. */
  const due = useRef(false);
  const started = useRef<number | null>(null);

  /*
   * DEMAND MODE: a frame at mount, on a resize, and for each frame of the run
   * — nothing while the page scrolls, before or after.
   */
  const invalidate = useThree((state) => state.invalidate);

  // The start: the first time the band's top passes TRIGGER up the window.
  useEffect(() => {
    const panel = marks.panel.current;
    if (!panel) return;
    const watch = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        watch.disconnect();
        due.current = true;
        invalidate();
      },
      { rootMargin: `0px 0px ${-(1 - TRIGGER) * 100}% 0px` },
    );
    watch.observe(panel);
    return () => watch.disconnect();
  }, [marks.panel, invalidate]);

  useEffect(() => {
    const bench = marks.bench.current;
    if (!bench) return;
    const watch = new ResizeObserver(() => invalidate());
    watch.observe(bench);
    return () => watch.disconnect();
  }, [marks.bench, invalidate]);

  // The lockup's mark: the logo's alpha, inked like the panel's mask.
  useEffect(() => {
    const image = new Image();
    let texture: Texture | null = null;
    image.onload = () => {
      texture = new Texture(image);
      texture.flipY = false;
      texture.anisotropy = 4;
      texture.needsUpdate = true;
      logo.current = texture;
      invalidate();
    };
    image.src = "/branding/neogen-logo.png";
    return () => {
      image.onload = null;
      texture?.dispose();
    };
  }, [invalidate]);

  useFrame((state) => {
    const node = mesh.current;
    const hide = occluder.current;
    const panel = marks.panel.current;
    const vial = marks.vial.current;
    const hairline = marks.hairline.current;
    const stripe = marks.stripe.current;
    const lock = marks.lockup.current;
    if (!node || !hide || !panel || !vial || !hairline || !stripe || !lock) return;

    /*
     * PROGRESS — ONCE, BY THE CLOCK (owner, 2026-10-01: no hold, faster, and
     * "it shouldn't get unscrolled if you go up"). It starts the first time the
     * band is well into view and runs to the end on its own; scrolling back
     * never winds it up again.
     */
    if (due.current && started.current === null) started.current = state.clock.elapsedTime;
    const p =
      started.current === null
        ? 0
        : Math.min(1, (state.clock.elapsedTime - started.current) / DURATION);
    // Frames only while it moves.
    if (started.current !== null && p < 1) state.invalidate();

    const resolve = phase(p, ...RIBBON.resolve);
    if (resolve !== shown.current) {
      setOpacity(panel, resolve);
      shown.current = resolve;
    }

    if (!geometry.current) {
      geometry.current = ribbonGeometry();
      node.geometry = geometry.current;
    }

    // Page pixels → this canvas's world (centre origin, y up, z = 0 plane).
    const canvasBox = frame(state.gl.domElement.getBoundingClientRect(), upright);
    const toX = (x: number) => x - canvasBox.left - canvasBox.width / 2;
    const toY = (y: number) => (canvasBox.top + canvasBox.height / 2 - y) / Math.cos(TILT);

    const box = frame(panel.getBoundingClientRect(), upright);
    const vialBox = frame(vial.getBoundingClientRect(), upright);
    const axisPage = vialBox.left + vialBox.width / 2;
    const radius = vialBox.right - axisPage;

    /* The band's plan and print, redone whenever the bench changes size. */
    if (!paper.current) {
      paper.current = makePaper(colours);
      node.material = paper.current.material;
    }
    const key = `${Math.round(box.width)}x${Math.round(box.height)}:${Math.round(radius)}`;
    if (paper.current.key !== key) {
      plan.current = planRibbon(radius, box.right - axisPage, box.height);
      const print = ribbonPrint(
        plan.current,
        axisPage,
        box,
        {
          hairline: frame(hairline.getBoundingClientRect(), upright),
          stripe: frame(stripe.getBoundingClientRect(), upright),
          lockup: frame(lock.getBoundingClientRect(), upright),
        },
        radius,
        upright,
      );
      label.current = print.label;
      handover.current = print.handover;
      paper.current.print(print, key);
    }
    paper.current.ink(logo.current);
    const nameEl = marks.name.current;
    const rangeEl = marks.range.current;
    if (label.current && nameEl && rangeEl && words.current?.key !== paper.current.key) {
      const [x0, x1, y0, y1] = label.current;
      words.current?.texture.dispose();
      words.current = {
        key: paper.current.key,
        texture: drawWords(nameEl, rangeEl, y1 - y0, x1 - x0),
      };
    }

    const top = toY(box.top);
    const bottom = toY(box.bottom);
    const t = phase(p, ...RIBBON.unroll);
    /* Upright, the logo that ends at the vial's front would show under the
       name at rest; it comes in as the name goes. Across, each is printed
       where it sits and turns with the band — the first rolls past the front
       and off the page, the second comes round the right silhouette — unless
       the band unwinds too little to part them: then the second takes over
       from the first while both are on the turn. */
    paper.current.logos(
      handover.current ? 1 - phase(t, 0.1, 0.45) : 1,
      upright ? phase(t, 0.3, 0.75) : handover.current ? phase(t, 0.5, 0.9) : 1,
    );
    paper.current.words(
      label.current && words.current ? words.current.texture : null,
      label.current,
      1 - phase(t, 0.15, 0.55),
    );
    const axisZ = layRibbon(geometry.current, plan.current!, {
      t,
      axis: toX(axisPage),
      radius,
      top,
      bottom,
      level: Math.tan(TILT),
    });
    // Where the flat band comes out from behind the vial: its edge, in world x.
    paper.current.behind(toX(axisPage) + radius, radius * SHADOW_REACH);

    /* The vial's body, in depth only: what passes behind the glass is hidden. */
    hide.position.set(toX(axisPage), (top + bottom) / 2, axisZ);
    hide.scale.set(radius, (top - bottom) * 1.2, radius);
    node.visible = true;
    hide.visible = true;
  });

  return (
    <>
      <mesh ref={occluder} visible={false} renderOrder={-1}>
        <cylinderGeometry args={[1, 1, 1, 96, 1, true]} />
        <meshBasicMaterial colorWrite={false} />
      </mesh>
      {/* Always on screen when drawn: no bounds to keep. */}
      <mesh ref={mesh} visible={false} frustumCulled={false} />
    </>
  );
}

interface Paper {
  material: ShaderMaterial;
  key: string;
  print(print: RibbonPrint, key: string): void;
  ink(logo: Texture | null): void;
  /** The name and range at rest (upright): their picture, where, how much. */
  words(texture: Texture | null, rect: [number, number, number, number] | null, on: number): void;
  /** The vial's silhouette edge (world x) and how far its shadow reaches. */
  behind(edge: number, reach: number): void;
  /** How much of each logo shows: the one at rest, the one laid down. */
  logos(atRest: number, atEnd: number): void;
}

/**
 * PAPER. Front: the side that ends up facing the viewer — where it lies flat,
 * the print's exact colours (what the DOM panel paints; no seam). Back: the
 * side wound outward on the vial and round the roll. Both shaded by their
 * normal against a light from the upper left, exactly 1.0 when square to the
 * viewer, so the band reads as round where it is round and flat where flat.
 *
 * The print is drawn here, per pixel, from where its marks are (`RibbonPrint`):
 * no textures to paint or upload but the logo's, sharp at any size. Composed
 * in sRGB, as the page composes the panel, then lit in linear.
 */
function makePaper(stripe: readonly [string, string, string]): Paper {
  const uniforms = {
    stripeA: { value: srgb(stripe[0]) },
    stripeB: { value: srgb(stripe[1]) },
    stripeC: { value: srgb(stripe[2]) },
    size: { value: [1, 1] },
    hairline: { value: [0, 0] },
    stripe: { value: [0, 0, 0, 1] },
    lockup: { value: [0, 1, 1] },
    lockupBack: { value: [0, 0] },
    logo: { value: null as Texture | null },
    inked: { value: 0 },
    label: { value: null as Texture | null },
    labelRect: { value: [0, 1, 0, 1] },
    labelOn: { value: 0 },
    uprightMarks: { value: 0 },
    logoOn: { value: [1, 1] },
    edge: { value: 0 },
    reach: { value: 1 },
  };
  const material = new ShaderMaterial({
    uniforms,
    side: DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      varying float vX;
      void main() {
        vUv = uv;
        vNormal = normal;
        vX = position.x;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec2 size;
      uniform vec2 hairline;
      uniform vec4 stripe;
      uniform vec3 lockup;
      uniform vec2 lockupBack;
      uniform sampler2D logo;
      uniform float inked;
      uniform sampler2D label;
      uniform vec4 labelRect;
      uniform float labelOn;
      uniform float uprightMarks;
      uniform vec2 logoOn;
      uniform float edge;
      uniform float reach;
      varying float vX;
      uniform vec3 stripeA;
      uniform vec3 stripeB;
      uniform vec3 stripeC;
      varying vec2 vUv;
      varying vec3 vNormal;
      // From the front, a little right: white across the vial's front, falling
      // to ~75% at its edge — round, without the grey seam a light from the
      // left made where the band meets the white panel.
      const vec3 LIGHT = vec3(0.45, 0.2, 0.9);
      // The vial's shadow on the band passing behind it (the panel's ::after).
      const float SHADOW = ${SHADOW.toFixed(3)};
      const vec3 PAPER = vec3(1.0);
      const vec3 RULE = vec3(180.0) / 255.0;

      // How much of this pixel's footprint along v lies in [a, b]: edges
      // antialiased as the page rasterises them.
      float cover(float v, float a, float b) {
        float w = max(fwidth(v), 1e-4);
        return clamp((min(v + 0.5 * w, b) - max(v - 0.5 * w, a)) / w, 0.0, 1.0);
      }

      void main() {
        vec3 n = normalize(gl_FrontFacing ? vNormal : -vNormal);
        float shade = clamp(0.5 + 0.5 * dot(n, LIGHT) / LIGHT.z, 0.4, 1.0);
        float sheen = 0.1 * pow(max(0.0, dot(n, LIGHT)), 8.0) * (1.0 - step(0.999, n.z));

        float x = vUv.x * size.x;
        float y = vUv.y * size.y;
        vec3 ink = PAPER;
        ink = mix(ink, RULE, cover(y, hairline.x, hairline.x + hairline.y));
        float g = clamp((x - stripe.z) / (stripe.w - stripe.z), 0.0, 1.0);
        vec3 band = g < 0.5 ? mix(stripeA, stripeB, g * 2.0) : mix(stripeB, stripeC, g * 2.0 - 1.0);
        ink = mix(ink, band, cover(y, stripe.x, stripe.x + stripe.y));
        // Upright, the vial's own name and range at rest, upright on the page:
        // across the band is the page's width (right to left), along it the
        // page's height — wound outward, bottom to top.
        if (!gl_FrontFacing && labelOn > 0.0) {
          vec2 at = vec2(
            (labelRect.w - y) / (labelRect.w - labelRect.z),
            (labelRect.y - x) / (labelRect.y - labelRect.x)
          );
          vec4 words = texture2D(label, clamp(at, 0.0, 1.0));
          ink = mix(ink, words.rgb, words.a * labelOn
            * cover(x, labelRect.x, labelRect.y) * cover(y, labelRect.z, labelRect.w));
        }
        // The lockup is on the back only, twice. Seen from outside the wound
        // band that side runs right-to-left, so it is mirrored.
        float mark = 0.0;
        if (!gl_FrontFacing) {
          for (int i = 0; i < 2; i++) {
            float left = i == 0 ? lockupBack.x : lockupBack.y;
            // Across: mirrored along the band. Upright: set upright on the page,
            // as the name beside it is.
            vec2 at = uprightMarks > 0.5
              ? vec2((lockup.x + lockup.z - y) / lockup.z, (left + lockup.y - x) / lockup.y)
              : vec2(1.0 - (x - left) / lockup.y, (y - lockup.x) / lockup.z);
            mark = max(mark, texture2D(logo, clamp(at, 0.0, 1.0)).a * (i == 0 ? logoOn.x : logoOn.y)
              * cover(x, left, left + lockup.y) * cover(y, lockup.x, lockup.x + lockup.z));
          }
        }
        mark *= inked;
        ink = mix(ink, vec3(0.0), mark);
        // Where the flat band comes out from behind the vial, the vial's soft
        // shadow on it — composed in sRGB, as the panel's own gradient is.
        if (gl_FrontFacing && n.z > 0.999) {
          ink *= 1.0 - SHADOW * clamp(1.0 - (vX - edge) / reach, 0.0, 1.0);
        }

        vec3 base = sRGBTransferEOTF(vec4(ink, 1.0)).rgb;
        // The sheen lights the paper, not the ink: black stays black at the seam.
        gl_FragColor = vec4(base * (shade + sheen), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
  const paper: Paper = {
    material,
    key: "",
    print(print, key) {
      uniforms.size.value = [print.length, print.height];
      uniforms.hairline.value = print.hairline;
      uniforms.stripe.value = print.stripe;
      uniforms.lockup.value = print.lockup;
      uniforms.lockupBack.value = print.lockupBack;
      uniforms.uprightMarks.value = print.upright ? 1 : 0;
      paper.key = key;
    },
    ink(logo) {
      uniforms.logo.value = logo;
      uniforms.inked.value = logo ? 1 : 0;
    },
    words(texture, rect, on) {
      uniforms.label.value = texture;
      if (rect) uniforms.labelRect.value = rect;
      uniforms.labelOn.value = texture && rect ? on : 0;
    },
    logos(atRest, atEnd) {
      uniforms.logoOn.value = [atRest, atEnd];
    },
    behind(edge, reach) {
      uniforms.edge.value = edge;
      uniforms.reach.value = reach;
    },
  };
  return paper;
}

/** A `#rrggbb` colour as its sRGB components, 0–1 — composed as the page composes it. */
function srgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/**
 * The panel's name and range, set as the panel sets them — their own fonts,
 * tracking, case and ink — on a transparent picture `width` × `height` CSS
 * pixels (the page's own axes), for the vial's front at rest.
 */
function drawWords(name: HTMLElement, range: HTMLElement, width: number, height: number) {
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);
  ctx.textBaseline = "top";

  const set = (element: HTMLElement, size: number) => {
    const style = getComputedStyle(element);
    ctx.font = `${style.fontWeight} ${size}px ${style.fontFamily}`;
    ctx.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;
    ctx.fillStyle = style.color;
    return style;
  };

  // The name and the range, each wrapped by words to the width, at the panel's
  // sizes or smaller — small enough that every line fits the label's height.
  // The range breaks where the panel's does: between its ends, and inside one
  // only after a sign (RibbonBench joins the rest with no-break spaces).
  const nameStyle = getComputedStyle(name);
  const words = (name.textContent ?? "").toUpperCase().split(/\s+/).filter(Boolean);
  // The range's ends (`rangeEnds`): whole where they fit, else by their signs.
  const ends = [...range.querySelectorAll<HTMLElement>(":scope > span > span")].map((end) =>
    (end.textContent ?? "").toUpperCase(),
  );
  const rangeFont = parseFloat(getComputedStyle(range).fontSize);
  const wrap = (parts: string[]) => {
    const lines: string[] = [];
    for (const part of parts) {
      const last = lines[lines.length - 1];
      if (last && ctx.measureText(`${last} ${part}`).width <= width)
        lines[lines.length - 1] = `${last} ${part}`;
      else lines.push(part);
    }
    return lines;
  };
  const widest = (parts: string[]) => Math.max(0, ...parts.map((p) => ctx.measureText(p).width));
  let size = parseFloat(nameStyle.fontSize);
  set(name, size);
  if (widest(words) > width) size *= width / widest(words);
  let lines: string[] = [];
  let rangeLines: string[] = [];
  let rangeSize = 0;
  let total = 0;
  // Shrinking can re-wrap into fewer lines, so measure until it fits.
  for (let pass = 0; pass < 4; pass++) {
    set(name, size);
    lines = wrap(words);
    rangeSize = Math.min(rangeFont, size * 0.8);
    set(range, rangeSize);
    const terms = ends.flatMap((end) =>
      ctx.measureText(end).width <= width ? [end] : end.split(" "),
    );
    if (widest(terms) > width) rangeSize *= width / widest(terms);
    set(range, rangeSize);
    rangeLines = wrap(terms);
    total = (lines.length * size + (rangeLines.length - 1) * rangeSize) * 1.15 + rangeSize * 1.7;
    if (total <= height) break;
    size *= height / total;
  }
  let y = Math.max(0, (height - total) / 2);
  set(name, size);
  for (const line of lines) {
    ctx.fillText(line, 0, y);
    y += size * 1.15;
  }
  y += rangeSize * 0.7;
  set(range, rangeSize);
  for (const line of rangeLines) {
    ctx.fillText(line, 0, y);
    y += rangeSize * 1.15;
  }

  const texture = new CanvasTexture(canvas);
  texture.flipY = false;
  return texture;
}
