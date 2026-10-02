"use client";

import dynamic from "next/dynamic";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

import { CanvasErrorBoundary } from "@/components/experience/CanvasErrorBoundary";

import type { Bench } from "./benches";
import { setOpacity } from "./ribbon";

import styles from "./RibbonBench.module.css";

const RibbonOverlay = dynamic(() => import("./RibbonOverlay"), { ssr: false });

export interface RibbonStep {
  index: string;
  value: string;
  unit: string;
  pack: string | null;
}

/**
 * THE SPECIFICATIONS, UNROLLED (owner's sketches, 2026-09-30; permanent
 * 2026-10-01).
 *
 * A full-width bench, nearly a screen tall, on the page's own paper. A vial
 * stands against its left edge, half off the page — a still, not a scene.
 * Wound round its body is a band in the label's language, its free end rolled
 * up just past the vial's edge. The first time the band comes into view it
 * unwinds from the vial and the roll travels right, laying it down — once, in
 * under two seconds, and never wound back — until it is the panel that holds
 * section 02: every fact the ladder and the table hold, in real DOM.
 *
 * Without a wide screen, motion and WebGL: section 02 as it always was
 * (`children`). If the band cannot be drawn after all, the panel shows at once.
 */
export function RibbonBench({
  bench: config,
  heading,
  name,
  range,
  steps,
  stepsLabel,
  rows,
  notice,
  children,
}: {
  bench: Bench;
  heading: ReactNode;
  name: string;
  range: string;
  steps: readonly RibbonStep[];
  /** "Escala de presentaciones" — the ladder's own label. */
  stepsLabel: string;
  /** The specification table's rows the panel does not already show. */
  rows: readonly { key: string; value: string }[];
  notice: string;
  /** Section 02's ladder and table, as they are: the fallback. */
  children: ReactNode;
}) {
  const run = useRibbonAllowed();
  const bench = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const hairline = useRef<HTMLSpanElement>(null);
  const stripe = useRef<HTMLParagraphElement>(null);
  const lockup = useRef<HTMLSpanElement>(null);
  const vial = useRef<HTMLImageElement>(null);
  const near = useNear(bench, run);
  /* One pack for every presentation (RETA: ten vials) is said once. */
  const sharedPack = steps.every((step) => step.pack === steps[0]?.pack) ? steps[0]?.pack : null;

  if (!run) {
    return (
      <>
        {heading}
        {children}
      </>
    );
  }

  const { vial: still } = config;
  const look = {
    "--vial-radius": still.radius,
    "--vial-body": (still.bodyTop + still.bodyBottom) / 2,
    "--stripe-a": config.stripe[0],
    "--stripe-b": config.stripe[1],
    "--stripe-c": config.stripe[2],
    "--ribbon-ink": config.ink,
  } as CSSProperties;

  return (
    <div className={styles.layout}>
      <div className={styles.stage}>
        <div ref={bench} className={styles.bench} style={look}>
          {/* The section's heading, in the bench beside the vial's shoulder —
            first in the reading order, as it always was. */}
          <div className={styles.heading}>{heading}</div>
          {/* eslint-disable-next-line @next/next/no-img-element -- sized by the bench, decorative */}
          <img
            ref={vial}
            className={styles.vial}
            src={still.src}
            width={still.width}
            height={still.height}
            alt=""
            decoding="async"
          />

          {near ? (
            <CanvasErrorBoundary fallback={<Reveal panel={panel} />}>
              <RibbonOverlay
                marks={{ bench, panel, hairline, stripe, lockup, vial }}
                stripe={config.stripe}
              />
            </CanvasErrorBoundary>
          ) : null}

          {/* The band, laid down: hidden until it lands (the canvas writes its
            opacity), in the reading order all along. */}
          <div ref={panel} className={styles.panel}>
            <span ref={hairline} className={styles.hairline} aria-hidden="true" />
            <span ref={lockup} className={styles.lockup} aria-hidden="true" />
            <div className={styles.content}>
              <div className={styles.identity}>
                <p className={styles.name}>
                  {name.split(" ").map((word, i) => (
                    <span key={i}>
                      {i > 0 ? " " : null}
                      <span className={styles.word}>{word}</span>
                    </span>
                  ))}
                </p>
                <p className={styles.range}>{range}</p>
              </div>
              <div className={styles.ladder}>
                <p className={styles.key}>{stepsLabel}</p>
                <ol>
                  {steps.map((step) => (
                    <li key={step.index}>
                      <span className={styles.stepIndex}>{step.index}</span>
                      <span className={styles.stepValue}>
                        {step.value}
                        <span className={styles.stepUnit}>{step.unit}</span>
                      </span>
                      {step.pack && !sharedPack ? (
                        <span className={styles.stepPack}>{step.pack}</span>
                      ) : null}
                    </li>
                  ))}
                </ol>
                {sharedPack ? <p className={styles.stepPack}>{sharedPack}</p> : null}
              </div>
              <dl className={styles.facts}>
                {rows.map((row) => (
                  <div key={row.key}>
                    <dt className={styles.key}>{row.key}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <p ref={stripe} className={styles.stripe}>
              {notice}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Wide screen, motion allowed, WebGL 2. Decided on the client, after hydration. */
function useRibbonAllowed(): boolean {
  const [run, setRun] = useState(false);
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 64rem)");
    const still = window.matchMedia("(prefers-reduced-motion: reduce)");
    const webgl = (() => {
      try {
        return document.createElement("canvas").getContext("webgl2") !== null;
      } catch {
        return false;
      }
    })();
    const update = () => setRun(webgl && wide.matches && !still.matches);
    update();
    wide.addEventListener("change", update);
    still.addEventListener("change", update);
    return () => {
      wide.removeEventListener("change", update);
      still.removeEventListener("change", update);
    };
  }, []);
  return run;
}

/**
 * The band's canvas — its WebGL context, its shader — is made only once the
 * bench is within a screen of the window, not with the page. It has drawn the
 * band at rest well before the bench is in view.
 */
function useNear(bench: RefObject<HTMLElement | null>, run: boolean): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    const node = bench.current;
    if (!run || !node) return;
    const watch = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        watch.disconnect();
        setNear(true);
      },
      { rootMargin: "100% 0px" },
    );
    watch.observe(node);
    return () => watch.disconnect();
  }, [bench, run]);
  return near;
}

/** The band failed (its code, or WebGL itself): the panel shows as it is. */
function Reveal({ panel }: { panel: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    if (panel.current) setOpacity(panel.current, 1);
  }, [panel]);
  return null;
}
