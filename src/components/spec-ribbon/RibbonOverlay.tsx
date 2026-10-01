"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import { DoubleSide, ShaderMaterial, Texture, type BufferGeometry, type Mesh } from "three";

import {
  layRibbon,
  phase,
  planRibbon,
  RIBBON,
  ribbonGeometry,
  ribbonPrint,
  setOpacity,
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

export interface RibbonMarks {
  bench: RefObject<HTMLElement | null>;
  panel: RefObject<HTMLElement | null>;
  hairline: RefObject<HTMLElement | null>;
  stripe: RefObject<HTMLElement | null>;
  lockup: RefObject<HTMLElement | null>;
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
 */
export default function RibbonOverlay({
  marks,
  stripe,
}: {
  marks: RibbonMarks;
  /** The label's stripe, three stops (`Bench.stripe`). */
  stripe: readonly [string, string, string];
}) {
  return (
    <Canvas
      style={{
        position: "absolute",
        insetInline: 0,
        top: "calc(var(--band-top) - 1rem)",
        width: "100%",
        height: "calc(var(--band-h) * 1.2 + 1rem)",
        pointerEvents: "none",
      }}
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
        rotation: [-TILT, 0, 0],
        zoom: 1,
        near: 1,
        far: DISTANCE * 2,
      }}
      aria-hidden="true"
    >
      <Band marks={marks} colours={stripe} />
    </Canvas>
  );
}

function Band({
  marks,
  colours,
}: {
  marks: RibbonMarks;
  colours: readonly [string, string, string];
}) {
  const mesh = useRef<Mesh>(null);
  const occluder = useRef<Mesh>(null);
  const geometry = useRef<BufferGeometry | null>(null);
  const paper = useRef<Paper | null>(null);
  const plan = useRef<RibbonPlan | null>(null);
  const logo = useRef<Texture | null>(null);
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
    const canvasBox = state.gl.domElement.getBoundingClientRect();
    const toX = (x: number) => x - canvasBox.left - canvasBox.width / 2;
    const toY = (y: number) => (canvasBox.top + canvasBox.height / 2 - y) / Math.cos(TILT);

    const box = panel.getBoundingClientRect();
    const vialBox = vial.getBoundingClientRect();
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
      paper.current.print(
        ribbonPrint(
          plan.current,
          axisPage,
          box,
          {
            hairline: hairline.getBoundingClientRect(),
            stripe: stripe.getBoundingClientRect(),
            lockup: lock.getBoundingClientRect(),
          },
          radius,
        ),
        key,
      );
    }
    paper.current.ink(logo.current);

    const top = toY(box.top);
    const bottom = toY(box.bottom);
    const axisZ = layRibbon(geometry.current, plan.current!, {
      t: phase(p, ...RIBBON.unroll),
      axis: toX(axisPage),
      radius,
      top,
      bottom,
    });

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
    lockup: { value: [0, 0, 1, 1] },
    lockupBack: { value: 0 },
    logo: { value: null as Texture | null },
    inked: { value: 0 },
  };
  const material = new ShaderMaterial({
    uniforms,
    side: DoubleSide,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormal;
      void main() {
        vUv = uv;
        vNormal = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec2 size;
      uniform vec2 hairline;
      uniform vec4 stripe;
      uniform vec4 lockup;
      uniform float lockupBack;
      uniform sampler2D logo;
      uniform float inked;
      uniform vec3 stripeA;
      uniform vec3 stripeB;
      uniform vec3 stripeC;
      varying vec2 vUv;
      varying vec3 vNormal;
      const vec3 LIGHT = vec3(-0.4, 0.27, 0.876);
      const vec3 FRONT = vec3(1.0);
      const vec3 BACK = vec3(247.0, 246.0, 242.0) / 255.0;
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
        vec3 ink = gl_FrontFacing ? FRONT : BACK;
        ink = mix(ink, RULE, cover(y, hairline.x, hairline.x + hairline.y));
        float g = clamp((x - stripe.z) / (stripe.w - stripe.z), 0.0, 1.0);
        vec3 band = g < 0.5 ? mix(stripeA, stripeB, g * 2.0) : mix(stripeB, stripeC, g * 2.0 - 1.0);
        ink = mix(ink, band, cover(y, stripe.x, stripe.x + stripe.y));
        // Seen from outside the wound band, the back runs right-to-left: mirrored.
        float left = gl_FrontFacing ? lockup.x : lockupBack;
        vec2 at = vec2((x - left) / lockup.z, (y - lockup.y) / lockup.w);
        if (!gl_FrontFacing) at.x = 1.0 - at.x;
        float mark = texture2D(logo, clamp(at, 0.0, 1.0)).a
          * cover(x, left, left + lockup.z) * cover(y, lockup.y, lockup.y + lockup.w) * inked;
        ink = mix(ink, vec3(0.0), mark);

        vec3 base = sRGBTransferEOTF(vec4(ink, 1.0)).rgb;
        gl_FragColor = vec4(base * shade + sheen, 1.0);
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
      paper.key = key;
    },
    ink(logo) {
      uniforms.logo.value = logo;
      uniforms.inked.value = logo ? 1 : 0;
    },
  };
  return paper;
}

/** A `#rrggbb` colour as its sRGB components, 0–1 — composed as the page composes it. */
function srgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
