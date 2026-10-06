"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { canonicalOutline, LivingInk, type InkOptions } from "./livingInk";
import { assemble } from "./markMotion";
import { MARK_ARMS, MARK_HUB } from "./markGeometry";
import { NeogenMark } from "./NeogenMark";

/*
 * THE MATERIAL LAB — development only, see `app/[locale]/estudio/marca`.
 * Every panel is the mark at page scale; click one to disturb it.
 */

const PAPER = "#faf9f6";
const INK = "#111111";

function Ink({
  height,
  options,
  color,
  onReady,
}: {
  height: number;
  options: InkOptions;
  color: string;
  onReady?: (ink: LivingInk) => void;
}) {
  const ref = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [rate, setRate] = useState(0);
  const key = JSON.stringify(options);
  useEffect(() => {
    const path = ref.current;
    if (!path) return;
    const ink = new LivingInk(path, JSON.parse(key) as InkOptions);
    onReady?.(ink);
    const svg = svgRef.current!;
    const onClick = (e: MouseEvent) => {
      const m = svg.getScreenCTM();
      if (!m) return;
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
      ink.touch(p.x, p.y, 1);
    };
    svg.addEventListener("click", onClick);
    let prev = 0;
    const timer = window.setInterval(() => {
      setRate(ink.writes - prev);
      prev = ink.writes;
    }, 1000);
    return () => {
      ink.destroy();
      svg.removeEventListener("click", onClick);
      window.clearInterval(timer);
    };
  }, [key, onReady]);
  return (
    <div style={{ position: "relative" }}>
      <svg
        ref={svgRef}
        viewBox="0 0 389 485"
        style={{ height, display: "block", cursor: "pointer", color }}
      >
        <path ref={ref} d={canonicalOutline(options.arms)} fill="currentColor" />
      </svg>
      <span
        data-rate=""
        style={{ position: "absolute", right: 0, bottom: 0, font: "10px monospace", opacity: 0.5 }}
      >
        {rate} writes/s
      </span>
    </div>
  );
}

function Panel({
  label,
  note,
  children,
  dark,
}: {
  label: string;
  note: string;
  children: ReactNode;
  dark?: boolean;
}) {
  return (
    <figure
      data-panel={label}
      style={{
        margin: 0,
        padding: 24,
        display: "grid",
        gap: 12,
        justifyItems: "center",
        background: dark ? INK : PAPER,
        color: dark ? PAPER : INK,
      }}
    >
      {children}
      <figcaption
        style={{
          font: "11px/1.4 monospace",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          textAlign: "center",
        }}
      >
        <strong>{label}</strong> · {note}
      </figcaption>
    </figure>
  );
}

/* Generic technique 1: turbulence displacement over the static mark. */
function Turbulence({ height }: { height: number }) {
  const turb = useRef<SVGFETurbulenceElement>(null);
  useEffect(() => {
    let frame = 0;
    const t0 = performance.now();
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      turb.current?.setAttribute(
        "baseFrequency",
        `${0.011 + 0.002 * Math.sin(t / 3)} ${0.013 + 0.002 * Math.cos(t / 4)}`,
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <svg viewBox="0 0 389 485" style={{ height, display: "block", overflow: "visible" }}>
      <filter id="lab-turb" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence
          ref={turb}
          type="fractalNoise"
          baseFrequency="0.012"
          numOctaves={2}
          seed={4}
        />
        <feDisplacementMap in="SourceGraphic" scale={7} xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <path d={canonicalOutline()} fill="currentColor" filter="url(#lab-turb)" />
    </svg>
  );
}

/* Generic technique 2: metaball "goo" (blur + threshold) for the contact. */
function Goo({ height }: { height: number }) {
  const [gap, setGap] = useState(1);
  useEffect(() => {
    let frame = 0;
    let t0 = 0;
    const run = (ms: number) => {
      if (!t0) t0 = ms;
      const k = Math.min(1, (ms - t0) / 1600);
      setGap(1 - k * k * (3 - 2 * k));
      if (k < 1) frame = requestAnimationFrame(run);
    };
    const start = () => {
      t0 = 0;
      frame = requestAnimationFrame(run);
    };
    window.addEventListener("lab:form", start);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("lab:form", start);
    };
  }, []);
  const arm = MARK_ARMS[3];
  const off = 70 * gap;
  const ux = (arm.node.cx - MARK_HUB.cx) / 240;
  const uy = (arm.node.cy - MARK_HUB.cy) / 240;
  return (
    <svg viewBox="0 0 389 485" style={{ height, display: "block" }}>
      <filter id="lab-goo">
        <feGaussianBlur stdDeviation="9" />
        <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 28 -12" />
      </filter>
      <g filter="url(#lab-goo)" fill="currentColor">
        <circle cx={MARK_HUB.cx} cy={MARK_HUB.cy} r={MARK_HUB.r} />
        <circle cx={arm.node.cx + ux * off} cy={arm.node.cy + uy * off} r={arm.node.r} />
        <line
          x1={MARK_HUB.cx}
          y1={MARK_HUB.cy}
          x2={arm.node.cx + ux * off}
          y2={arm.node.cy + uy * off}
          stroke="currentColor"
          strokeWidth={22 * (1 - gap)}
        />
      </g>
    </svg>
  );
}

/* The authored version: the parts assemble with the connection catching,
   then the material takes over and the contacts run through it. */
function Formation({ height }: { height: number }) {
  const parts = useRef<HTMLDivElement>(null);
  const ink = useRef<LivingInk | null>(null);
  const [mode, setMode] = useState<"parts" | "ink">("ink");
  useEffect(() => {
    const go = () => {
      setMode("parts");
      const svg = parts.current?.querySelector("svg");
      if (!svg) return;
      void assemble(svg, {
        catching: true,
        onContact: (k) => ink.current?.contact(k, 0.9),
      }).then(() => setMode("ink"));
    };
    window.addEventListener("lab:form", go);
    return () => window.removeEventListener("lab:form", go);
  }, []);
  return (
    <div style={{ position: "relative", height }}>
      <div ref={parts} style={{ visibility: mode === "parts" ? "visible" : "hidden" }}>
        <NeogenMark className="lab-parts" />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          visibility: mode === "ink" ? "visible" : "hidden",
        }}
      >
        <Ink
          height={height}
          options={{ rest: 0.8, disturb: 2.2 }}
          color="currentColor"
          onReady={(i) => (ink.current = i)}
        />
      </div>
      <style>{`.lab-parts{height:${height}px}`}</style>
    </div>
  );
}

export function InkLab() {
  const H = 440;
  const grid: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 2,
    background: "#ccc",
  };
  return (
    <main style={{ background: PAPER, color: INK, paddingBlock: 24 }}>
      <header style={{ padding: "0 24px 16px", font: "12px/1.5 monospace" }}>
        <strong>NEOGEN · LIVING INK — LAB (prototype, dev only)</strong> · click a mark to disturb
        it ·{" "}
        <button type="button" onClick={() => window.dispatchEvent(new Event("lab:form"))}>
          form (connection catching)
        </button>
      </header>
      <section style={grid} data-row="paper">
        <Panel label="A" note="almost imperceptible · rest 0.5">
          <Ink height={H} options={{ rest: 0.5, disturb: 0 }} color={INK} />
        </Panel>
        <Panel label="B" note="viscous · rest 1.4">
          <Ink height={H} options={{ rest: 1.4, disturb: 0 }} color={INK} />
        </Panel>
        <Panel label="C" note="disturbance only · click">
          <Ink height={H} options={{ rest: 0, disturb: 2.2 }} color={INK} />
        </Panel>
        <Panel label="D" note="rest 0.8 + disturbance · click">
          <Ink height={H} options={{ rest: 0.8, disturb: 2.2 }} color={INK} />
        </Panel>
      </section>
      <section style={grid} data-row="dark">
        <Panel label="B" note="paper on charcoal" dark>
          <Ink height={H} options={{ rest: 1.4, disturb: 0 }} color={PAPER} />
        </Panel>
        <Panel label="D" note="paper on charcoal · click" dark>
          <Ink height={H} options={{ rest: 0.8, disturb: 2.2 }} color={PAPER} />
        </Panel>
        <Panel label="D" note="area colour (metabolism) on its wash · click">
          <div style={{ background: "#e3e7ee", padding: 8 }}>
            <Ink height={H - 16} options={{ rest: 0.8, disturb: 2.2 }} color="#4a6fa5" />
          </div>
        </Panel>
        <Panel label="FORM" note="parts gather, the connection catches, the ink takes over">
          <Formation height={H} />
        </Panel>
      </section>
      <section
        style={{ ...grid, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
        data-row="techniques"
      >
        <Panel label="T1" note="feTurbulence + feDisplacementMap (rejected)">
          <Turbulence height={H} />
        </Panel>
        <Panel label="T2" note="goo filter: blur + threshold contact (rejected)">
          <Goo height={H} />
        </Panel>
        <Panel label="T3" note="authored outline (chosen family) · rest 0.8">
          <Ink height={H} options={{ rest: 0.8, disturb: 2.2 }} color={INK} />
        </Panel>
      </section>
    </main>
  );
}
