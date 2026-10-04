"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { incomingSpecimen } from "@/components/vial-transition/incoming";

import { useArrival, type Arrival } from "../arrival";
import styles from "./ghk.module.css";
import { FRAGMENT, plateAt, SETTLED_MS, settledPlate, VERTEX, type PlateState } from "./material";

/**
 * GHK-Cu — "the environment becomes material" (flagship idea #6).
 *
 * RETA's world is an instrument that calibrates round its specimen; GLOW's is
 * lit by it. GHK-Cu's is MATTER THAT RESPONDS TO IT: a copper plate, tarnished
 * until the specimen burnishes it. The vial combs the plate's grain along its
 * path as it travels, and where it lands the grain settles into a turned
 * finish that spreads outward and turns lustrous; the name etched in the plate
 * is what stays matte (`material.ts`). Afterwards the plate behaves as metal
 * does: moving over it (or scrolling it) changes how it meets the light, and
 * the reflection and the walls of the etching follow.
 *
 * A metaphor for the interface, not a picture of anything the compound does:
 * no particles, fields, binding or tissue — a finished surface and its light.
 *
 * One WebGL quad. It draws only while something changes (the arrival, a
 * pointer, a scroll) and never while off screen; no React state per frame.
 * Without WebGL the stage keeps its ordinary ground and ghosted name.
 */

/** If the plate is never seen to settle, stop holding the 3D. */
const FORMING_LIMIT_MS = 2600;

export function useBurnishArrival(
  slug: string,
  enabled: boolean,
): { arrival: Arrival; forming: boolean; onFormed: () => void } {
  const arrival = useArrival(slug, enabled);
  /* The canvas waits for the plate to settle: its boot is main-thread work,
     and the plate is drawn every frame until then. */
  const [forming, setForming] = useState(enabled && arrival === "specimen");

  useEffect(() => {
    if (!forming) return;
    const timer = window.setTimeout(() => setForming(false), FORMING_LIMIT_MS);
    return () => window.clearTimeout(timer);
  }, [forming]);

  const onFormed = useCallback(() => setForming(false), []);
  return { arrival, forming, onFormed };
}

interface Geometry {
  w: number;
  h: number;
  /** The specimen's resting centre, its frame's height, and the card it left. */
  C: [number, number];
  frame: number;
  S0: [number, number];
  quiet: [number, number, number, number];
  etchBox: [number, number, number, number];
  reach: number;
}

export function BurnishField({
  slug,
  arrival,
  reducedMotion,
  finePointer,
  onFormed,
}: {
  slug: string;
  arrival: Arrival;
  reducedMotion: boolean;
  finePointer: boolean;
  onFormed: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  /* The card the vial left is read once, at the first layout of the page. */
  const [origin] = useState(() => (arrival === "specimen" ? incomingSpecimen(slug) : null));
  const formedRef = useRef(onFormed);
  useLayoutEffect(() => {
    formedRef.current = onFormed;
  }, [onFormed]);

  /*
   * A LAYOUT effect, so the plate's first frame is drawn — and the printed
   * name has stood down — before the view transition captures the new page,
   * and so it draws through the flight: React holds a transition's passive
   * effects until the animation has finished, which left the plate blank
   * until after the vial had landed.
   *
   * The stage and the frame are found in the DOM, not through the stage's
   * refs: this sits in the field, BEFORE the frame, and a child's layout
   * effect runs before a later sibling's ref is attached (the frame was null
   * after a card tap). The DOM itself is complete by now.
   */
  useLayoutEffect(() => {
    const node = canvas.current;
    const root = node?.closest<HTMLElement>("[data-burnish]");
    const frame = root?.querySelector<HTMLElement>("[data-stage-frame]");
    if (!node || !root || !frame) return;

    const gl = node.getContext("webgl2", { antialias: false, alpha: false });
    const program = gl ? build(gl) : null;
    if (!gl || !program) {
      root.setAttribute("data-burnish-unsupported", "");
      formedRef.current();
      return;
    }
    const u = (name: string) => gl.getUniformLocation(program, name);
    const etch = gl.createTexture();

    /* The type cut from the same metal: its highlight follows the plate's. */
    const metal = [
      ...root.querySelectorAll<HTMLElement>("[data-product-name], [data-price-value]"),
    ];
    let sheenAt = -1;
    const start = performance.now();
    const settledAt = reducedMotion ? 0 : SETTLED_MS[arrival];
    let geometry: Geometry | null = null;
    let colours: [number, number, number][] = [];
    let frameId = 0;
    let visible = true;
    let formed = reducedMotion;
    /* The light: where the room's key light falls on the plate, and the
       offset a pointer or a scroll gives it — eased, never jumped. */
    const tilt = { x: 0, y: 0, tx: 0, ty: 0 };

    const measure = () => {
      const box = root.getBoundingClientRect();
      const land = frame.getBoundingClientRect();
      const commerce = root.querySelector<HTMLElement>("[data-stage-commerce]");
      const q = commerce?.getBoundingClientRect();
      const C: [number, number] = [
        land.left + land.width / 2 - box.left,
        land.top + land.height / 2 - box.top,
      ];
      // The card is where it was on screen; the stage is at its document
      // position once the navigation has scrolled to the top.
      const S0: [number, number] = origin
        ? [
            origin.x + origin.width / 2 - (box.left + window.scrollX),
            origin.y + origin.height / 2 - (box.top + window.scrollY),
          ]
        : C;
      geometry = {
        w: box.width,
        h: box.height,
        C,
        frame: land.height,
        S0,
        quiet: q
          ? [q.left - box.left, q.top - box.top, q.width, q.height]
          : [box.width + 999, 0, 0, 0],
        /* Where the page does not set the name, it is cut across the vial. */
        etchBox: bake(gl, etch, root, land.width > box.width * 0.7 ? C[1] : null),
        reach: Math.hypot(box.width, box.height),
      };
      const css = getComputedStyle(root);
      colours = ["--world-void", "--world-accent", "--world-light"].map((v) =>
        rgb(css.getPropertyValue(v)),
      );
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      node.width = Math.round(box.width * dpr);
      node.height = Math.round(box.height * dpr);
      gl.viewport(0, 0, node.width, node.height);
    };

    const draw = (plate: PlateState) => {
      const g = geometry;
      if (!g) return;
      const dpr = node.width / Math.max(g.w, 1);
      const P = [
        g.S0[0] + (g.C[0] - g.S0[0]) * plate.along,
        g.S0[1] + (g.C[1] - g.S0[1]) * plate.along,
      ];
      // Above and to the left of the vial, as the stage's key light is; the
      // tilt moves it a little, and scrolling the plate past it does too.
      const scroll = Math.min(window.scrollY, g.h);
      const L = [
        g.C[0] - g.frame * 0.55 + tilt.x * g.frame * 0.7,
        g.C[1] - g.frame * 0.75 + tilt.y * g.frame * 0.5 + scroll * 0.6,
        g.frame * 0.8,
      ];
      gl.useProgram(program);
      gl.uniform2f(u("res"), g.w, g.h);
      gl.uniform1f(u("dpr"), dpr);
      gl.uniform2f(u("C"), g.C[0], g.C[1]);
      gl.uniform2f(u("S0"), g.S0[0], g.S0[1]);
      gl.uniform2f(u("P"), P[0], P[1]);
      gl.uniform1f(u("wake"), plate.wake);
      gl.uniform1f(u("R"), plate.R);
      gl.uniform1f(u("swirl"), plate.swirl);
      gl.uniform1f(u("relief"), plate.relief);
      gl.uniform3f(u("L"), L[0], L[1], L[2]);
      gl.uniform4f(u("quiet"), ...g.quiet);
      gl.uniform3f(u("voidc"), ...colours[0]);
      gl.uniform3f(u("accent"), ...colours[1]);
      gl.uniform3f(u("light"), ...colours[2]);
      gl.uniform4f(u("etchBox"), ...g.etchBox);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, etch);
      gl.uniform1i(u("etch"), 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      /*
       * The highlight on the type, as a share of its band's travel (100%: off
       * the left of the letters, 0%: off the right): burnished across once as
       * the plate settles, then where the light falls.
       */
      const rest = 0.55 - tilt.x * 0.22;
      const settled = plate.relief;
      const sheen = settled >= 1 ? rest : 1.05 + (rest - 1.05) * settled;
      if (Math.abs(sheen - sheenAt) > 0.002) {
        sheenAt = sheen;
        for (const el of metal) el.style.setProperty("--ghk-sheen", `${(sheen * 100).toFixed(1)}%`);
      }
    };

    /* One frame: the clock while the plate settles, then only the light. */
    const tick = () => {
      frameId = 0;
      const t = performance.now() - start;
      const settling = t < settledAt;
      tilt.x += (tilt.tx - tilt.x) * 0.12;
      tilt.y += (tilt.ty - tilt.y) * 0.12;
      const easing = Math.abs(tilt.tx - tilt.x) + Math.abs(tilt.ty - tilt.y) > 0.002;
      const reach = geometry?.reach ?? 2000;
      draw(settling ? plateAt(t, arrival, reach) : settledPlate(reach));
      if (!settling && !formed) {
        formed = true;
        formedRef.current();
      }
      /* The arrival always plays out: while a view transition runs, the page
         under it can be reported as not intersecting, and gating the arrival
         on that froze the plate mid-flight. Visibility gates only the light. */
      if (settling || (easing && visible)) frameId = requestAnimationFrame(tick);
    };
    const schedule = () => {
      if (!frameId && (visible || performance.now() - start < settledAt)) {
        frameId = requestAnimationFrame(tick);
      }
    };

    measure();
    root.setAttribute("data-burnish-ready", "");
    if (reducedMotion) formedRef.current();
    tick();

    const resized = new ResizeObserver(() => {
      measure();
      schedule();
    });
    resized.observe(root);
    void document.fonts?.ready.then(() => {
      measure();
      schedule();
    });
    const seen = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) schedule();
    });
    seen.observe(root);

    /* The plate meets the light differently as it is moved over or scrolled. */
    const move = (event: PointerEvent) => {
      const g = geometry;
      if (!g) return;
      const box = root.getBoundingClientRect();
      tilt.tx = ((event.clientX - box.left) / box.width) * 2 - 1;
      tilt.ty = ((event.clientY - box.top) / box.height) * 2 - 1;
      schedule();
    };
    const lost = (event: Event) => {
      event.preventDefault();
      root.removeAttribute("data-burnish-ready");
      root.setAttribute("data-burnish-unsupported", "");
      formedRef.current();
    };
    if (!reducedMotion && finePointer)
      root.addEventListener("pointermove", move, { passive: true });
    if (!reducedMotion) window.addEventListener("scroll", schedule, { passive: true });
    node.addEventListener("webglcontextlost", lost);

    return () => {
      cancelAnimationFrame(frameId);
      resized.disconnect();
      seen.disconnect();
      root.removeEventListener("pointermove", move);
      window.removeEventListener("scroll", schedule);
      node.removeEventListener("webglcontextlost", lost);
      root.removeAttribute("data-burnish-ready");
      for (const el of metal) el.style.removeProperty("--ghk-sheen");
      gl.deleteTexture(etch);
      gl.deleteProgram(program);
    };
  }, [arrival, origin, reducedMotion, finePointer]);

  return <canvas ref={canvas} className={styles.plate} aria-hidden="true" />;
}

/* --- WebGL ------------------------------------------------------------------ */

function build(gl: WebGL2RenderingContext): WebGLProgram | null {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = shader(gl.VERTEX_SHADER, VERTEX);
  const fs = shader(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const at = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(at);
  gl.vertexAttribPointer(at, 2, gl.FLOAT, false, 0, 0);
  return program;
}

/**
 * The name across the field, drawn where the page sets it — white on black,
 * a shade soft at the edge so the cut has walls — as the etching's texture.
 * Returns where it lies in the field.
 */
function bake(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture | null,
  root: HTMLElement,
  /** Centre the name on this line of the field instead of where the page sets it. */
  across: number | null,
): [number, number, number, number] {
  const word = root.querySelector<HTMLElement>("[data-stage-wordmark]");
  if (!word) return [-1, -1, 1, 1];
  const box = root.getBoundingClientRect();
  const r = word.getBoundingClientRect();
  const style = getComputedStyle(word);
  const text = (word.textContent ?? "").toUpperCase();
  const setFont = (ctx: CanvasRenderingContext2D, px: number) => {
    ctx.font = `${style.fontWeight} ${px}px ${style.fontFamily}`;
    const stretch = parseFloat(style.fontStretch);
    ctx.fontStretch =
      stretch <= 62.5
        ? "extra-condensed"
        : stretch <= 75
          ? "condensed"
          : stretch <= 87.5
            ? "semi-condensed"
            : "normal";
    ctx.letterSpacing = style.letterSpacing;
  };
  /*
   * The compact layout does not set the name at all (it measures 0×0): the
   * plate is still etched, measured from the text itself and centred.
   */
  const set = r.width > 0;
  /* Unset (a phone), it is cut large: about a third of the plate's width. */
  const size = set ? parseFloat(style.fontSize) : Math.min(box.width * 0.32, 160);
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return [-1, -1, 1, 1];
  setFont(probe, size);
  /* The canvas's condensed face can run a little wider than the page's box
     for the same name: the sheet is the drawn text's width, centred on the
     box, or its last letter is clipped (it read "COPPE", then "GHK-CI"). */
  const drawn = probe.measureText(text).width;
  const w = set ? Math.max(r.width, drawn) : drawn;
  const h = set ? r.height : size * 0.8;
  const left = set ? r.left - box.left + (r.width - w) / 2 : (box.width - w) / 2;
  const top = !set && across !== null ? across - h / 2 : r.top - box.top;

  const pad = 16;
  const scale = 2;
  const sheet = document.createElement("canvas");
  sheet.width = Math.ceil((w + pad * 2) * scale);
  sheet.height = Math.ceil((h + pad * 2) * scale);
  const ctx = sheet.getContext("2d");
  if (!ctx) return [-1, -1, 1, 1];
  ctx.scale(scale, scale);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, sheet.width, sheet.height);
  setFont(ctx, size);
  ctx.filter = "blur(0.7px)";
  ctx.fillStyle = "#fff";
  const m = ctx.measureText(text);
  ctx.fillText(
    text,
    pad + (w - m.width) / 2,
    pad + (h + m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2,
  );
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sheet);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return [left - pad, top - pad, w + pad * 2, h + pad * 2];
}

function rgb(value: string): [number, number, number] {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return [0, 0, 0];
  ctx.fillStyle = value.trim() || "#000";
  const hex = ctx.fillStyle;
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
}
