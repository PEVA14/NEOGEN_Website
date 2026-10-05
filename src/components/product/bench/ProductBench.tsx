"use client";

import Image from "next/image";
import { useEffect, useRef, useState, ViewTransition, type ReactNode } from "react";

import { SpecimenPlate } from "@/components/ui/SpecimenPlate";
import { names, type Specimen } from "@/components/vial-transition/specimens";
import { scaleSizes } from "@/components/vial-transition/SpecimenLayers";
import { PLATE_SIZES } from "@/content/media";
import { prefersReducedMotion } from "@/lib/reducedMotion";

import { useArrival } from "../arrival";
import styles from "./ProductBench.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

import "@/components/vial-transition/vial-transition.css";

/** How much closer the page frames a rendered specimen than its card does. */
const MAGNIFICATION = 1.16;

/**
 * A DRAWN specimen's box in the frame (fractions of the frame): the drawing's
 * own 200 × 340 proportions, its foot at the same height a render's stands.
 */
const DRAWN = { h: 0.78, top: 0.07 };
const DRAWN_W = (DRAWN.h * (200 / 340)) / 0.8;
/** Where the drawing's glass meets the floor, as a share of its height. */
const DRAWN_FOOT = 316 / 340;

/** Peak lean towards the cursor, in degrees, and how quickly it follows. */
const LEAN = 2;
const LEAN_SETTLE = 5;
/** A liquid's surface: how stiffly it seeks level, and how it is damped. */
const LEVEL_STIFFNESS = 170;
const LEVEL_DAMPING = 5.5;
/** The slosh a set-down gives it, in degrees per second. */
const SET_DOWN_SLOSH = 70;

/** When a specimen arriving from a card touches down (ProductBench.module.css). */
const TOUCHDOWN_MS = { specimen: 760, direct: 140 } as const;

const pct = (n: number) => `${(n * 100).toFixed(3)}%`;

export interface BenchPresentation {
  /** The variant's id: the value of its radio in the commerce panel. */
  id: string;
  /** "5 mg × 10 viales" — the presentation as the price line prints it. */
  label: string;
}

/** What stands on the bench: a render (split into set and object), or the drawing. */
export type BenchSpecimen =
  | { kind: "render"; specimen: Specimen; alt: string }
  | { kind: "drawn"; name: string; annotation?: string };

/**
 * THE BENCH — every product's opening, in the bright field.
 *
 * A flagship is a specimen in a dark world of its own (`ProductStage`). Every
 * other product stands on the bench: the studio its picture was made in,
 * extended across the whole stage — not a picture in a box beside a form.
 * Light stone, the area's own tone in the lamp overhead, the instrument's
 * registration marks and caption rail, and the specimen standing in it.
 *
 * It is alive the way an object on a bench is, not the way a world is:
 *
 *   ARRIVAL    the specimen lands (the vial transition carries it from the
 *              card) and is SET DOWN: the last millimetres onto the bench,
 *              then its floor, shadow and reflection form from where it
 *              touches, and the marks register. Direct entry: the same,
 *              shorter, from the first paint.
 *   RESPONSE   under a cursor it leans, a couple of degrees, on its own base.
 *              A liquid inside keeps its surface level as it does, and
 *              settles when the vial is set down — the one place the
 *              product's form (sold by volume) changes how it behaves.
 *   STATE      the rail reads the presentation the panel has selected, and a
 *              change of presentation sets the specimen down again.
 *   REST       then nothing moves.
 *
 * Images, SVG and CSS: no canvas, no 3D — that is a flagship's.
 */
export function ProductBench({
  slug,
  areaId,
  specimen,
  presentations,
  children,
}: {
  slug: string;
  areaId: DiscoveryAreaId | null;
  specimen: BenchSpecimen;
  presentations: BenchPresentation[];
  /** The commerce panel, server-rendered. */
  children: ReactNode;
}) {
  const arrival = useArrival(slug);
  const stage = useRef<HTMLDivElement>(null);
  const lean = useRef<HTMLSpanElement>(null);
  const settle = useRef<HTMLSpanElement>(null);
  const [selected, setSelected] = useState(0);
  /** Gives the liquid a push (a set-down); set by the physics effect. */
  const slosh = useRef<(speed: number) => void>(() => undefined);

  /*
   * THE PHYSICS — one small loop, running only while something moves: the
   * lean (fine pointers only), and a liquid's level. Written straight to two
   * elements' `rotate`; nothing re-renders.
   */
  useEffect(() => {
    const node = stage.current;
    const vial = lean.current;
    if (!node || !vial) return;
    if (prefersReducedMotion()) return;
    const liquid = vial.querySelector<SVGGElement>('[data-part="liquid"]');

    let goal = 0;
    let tilt = 0;
    let level = 0;
    let spin = 0;
    let frame = 0;
    let last = 0;
    const tick = (time: number) => {
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 1 / 60;
      last = time;
      tilt += (goal - tilt) * (1 - Math.exp(-LEAN_SETTLE * dt));
      vial.style.rotate = `${tilt.toFixed(3)}deg`;
      if (liquid) {
        // The surface seeks level: against the glass, that is minus the tilt.
        spin += (-LEVEL_STIFFNESS * (level + tilt) - LEVEL_DAMPING * spin) * dt;
        level += spin * dt;
        liquid.style.rotate = `${level.toFixed(3)}deg`;
      }
      const moving =
        Math.abs(goal - tilt) > 0.005 ||
        (liquid !== null && (Math.abs(level + tilt) > 0.01 || Math.abs(spin) > 0.05));
      if (moving) frame = requestAnimationFrame(tick);
      else {
        frame = 0;
        last = 0;
      }
    };
    const run = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    slosh.current = (speed: number) => {
      if (!liquid) return;
      spin += speed;
      run();
    };

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const move = (event: PointerEvent) => {
      const box = node.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width) * 2 - 1;
      goal = Math.max(-1, Math.min(1, x)) * LEAN;
      run();
    };
    const leave = () => {
      goal = 0;
      run();
    };
    if (fine) {
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerleave", leave);
    }
    return () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
      slosh.current = () => undefined;
    };
  }, []);

  /* The set-down on arrival stirs a liquid once. */
  useEffect(() => {
    const timer = window.setTimeout(() => slosh.current(SET_DOWN_SLOSH), TOUCHDOWN_MS[arrival]);
    return () => window.clearTimeout(timer);
  }, [arrival]);

  /* A different presentation is set down on the bench. */
  const shown = useRef(selected);
  useEffect(() => {
    if (shown.current === selected) return;
    shown.current = selected;
    const node = settle.current;
    if (!node || prefersReducedMotion()) return;
    node.animate([{ translate: "0 -0.6%" }, { translate: "0 0" }], {
      duration: 520,
      // The system's settle (motion.css), read rather than copied.
      easing: getComputedStyle(node).getPropertyValue("--ease-settle").trim() || "ease-out",
    });
    window.setTimeout(() => slosh.current(SET_DOWN_SLOSH * 0.6), 120);
  }, [selected]);

  const current = presentations[selected] ?? presentations[0];
  const render = specimen.kind === "render" ? specimen.specimen : null;

  /* Where the specimen stands, and where it touches the floor (frame fractions). */
  const box = render ? render.box : { x: (1 - DRAWN_W) / 2, y: DRAWN.top, w: DRAWN_W, h: DRAWN.h };
  const contactY = render ? render.object.y + render.object.h : DRAWN.top + DRAWN.h * DRAWN_FOOT;
  const magnify = render ? MAGNIFICATION : 1;
  const originX = render ? render.object.x + render.object.w / 2 : 0.5;
  const originY = render ? render.object.y + render.object.h / 2 : contactY;

  return (
    <div
      ref={stage}
      className={styles.stage}
      data-area={areaId ?? undefined}
      data-arrival={arrival}
      data-specimen={specimen.kind}
      style={{ ["--bench-contact" as string]: pct(contactY) }}
    >
      <div className={styles.field} aria-hidden="true" />

      <div className={styles.composition}>
        <div className={styles.frame}>
          <span
            className={styles.fit}
            style={
              magnify === 1
                ? undefined
                : { scale: String(magnify), transformOrigin: `${pct(originX)} ${pct(originY)}` }
            }
          >
            {render ? (
              <span className={styles.set}>
                <Image src={render.ground} alt="" fill sizes={PLATE_SIZES} priority />
              </span>
            ) : (
              <span className={styles.drawnSet} aria-hidden="true" />
            )}
            <ViewTransition name={names.specimen(slug)} share="vt-specimen" default="none">
              <span
                className={styles.specimen}
                style={{ left: pct(box.x), top: pct(box.y), width: pct(box.w), height: pct(box.h) }}
                role={render ? undefined : "img"}
                aria-label={specimen.kind === "drawn" ? specimen.name : undefined}
              >
                <span
                  ref={lean}
                  className={styles.lean}
                  style={{ transformOrigin: `50% ${pct((contactY - box.y) / box.h)}` }}
                >
                  <span ref={settle} className={styles.settle}>
                    {specimen.kind === "render" ? (
                      <Image
                        src={specimen.specimen.specimen}
                        alt={specimen.alt}
                        fill
                        sizes={scaleSizes(PLATE_SIZES, box.w)}
                        className={styles.cutout}
                        priority
                      />
                    ) : (
                      <SpecimenPlate
                        bare
                        areaId={areaId}
                        world={null}
                        name={specimen.name}
                        annotation={specimen.annotation}
                        size="stage"
                      />
                    )}
                  </span>
                </span>
              </span>
            </ViewTransition>
          </span>

          {/* The instrument's caption: the presentation on the bench now. */}
          <div className={styles.rail} aria-hidden="true">
            <span key={current?.id} className={styles.reading}>
              {current?.label}
            </span>
            {presentations.length > 1 ? (
              <span className={styles.index}>
                P-{String(selected + 1).padStart(2, "0")} /{" "}
                {String(presentations.length).padStart(2, "0")}
              </span>
            ) : null}
          </div>
        </div>

        <div
          className={styles.commerce}
          onChange={(event) => {
            const input = event.target;
            if (!(input instanceof HTMLInputElement) || input.type !== "radio") return;
            const index = presentations.findIndex((p) => p.id === input.value);
            if (index >= 0) setSelected(index);
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
