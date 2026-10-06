"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import { MARK_ARMS, MARK_BOX, MARK_HUB } from "./markGeometry";
import {
  ASSEMBLY,
  GATHER,
  SPREAD,
  EASE_REACH,
  EASE_REGISTER,
  EASE_TENSION,
  TENSION,
  type Phase,
} from "./markPhases";
import { assemble, reconnect } from "./markMotion";
import styles from "./NeogenMark.module.css";

/**
 * THE NEOGEN MARK — the one source of its geometry, and its small vocabulary.
 *
 * The owner's mark, as the parts `scripts/trace-mark.mjs` measured from the
 * artwork: a hub, four nodes, and four connections, each cut at the middle of
 * its gap into a half that belongs to the hub and a half that belongs to the
 * node. At rest the parts are exactly the artwork (99.1% pixel overlap; the
 * rest is antialiasing) at any size from the header to a metre tall, inked
 * in `currentColor` like the mask it replaces.
 *
 * Its vocabulary is one idea — POINTS → CONNECTION → STRUCTURE — said a few
 * ways, every one of them caused by the reader:
 *
 *   form="points"     the nodes alone, unconnected: nothing here yet
 *                     (the empty bag, the 404). Static.
 *   assemble="hero"   the homepage header: the mark forms as the reader
 *                     scrolls the poster NEOGEN into the page — the same
 *                     scroll range the wordmark lands on.
 *   assemble="view"   the footer: the mark forms as the reader scrolls it
 *                     into view. Scrubbed, reversible, never on a clock.
 *   assemble="now"    once, on mount: a completed action (added to the bag).
 *   assemble="gather" architectural scale: the nodes start far out along
 *                     their arms and the reader's scroll draws them in
 *                     before the connections reach (`GATHER`). The caller
 *                     sets the timeline and range (`--mark-timeline`,
 *                     `--mark-range`, `--mark-span`) to its own section.
 *   arms, hub         a FRAGMENT: only these arms (clockwise from the top,
 *                     0–3), with or without the hub. The pieces are the
 *                     mark's own; a fragment is a crop by construction.
 *   respond           pointing at (or keyboard-focusing) its host — the
 *                     link or button it sits in, or the mark itself — lets
 *                     the connections go and reach again. Inside an area the
 *                     answer is in the area's colour, and returns to ink.
 *
 * Nothing loops, nothing breathes, nothing plays on load or on a timer. The
 * connections are BRAND, never data: the mark is never placed where its
 * nodes could be read as compounds, sources, lines or relationships.
 *
 * Decorative by default (`aria-hidden`): beside the word NEOGEN it would be
 * read twice. Give it a `label` only where it stands alone for the brand.
 * Reduced motion: the whole mark, at once, everywhere.
 */
export function NeogenMark({
  className,
  form = "whole",
  assemble: assembly,
  respond = false,
  arms = ALL_ARMS,
  hub = true,
  label,
}: {
  className?: string;
  form?: "whole" | "points";
  assemble?: "hero" | "view" | "now" | "gather";
  respond?: boolean;
  arms?: readonly number[];
  hub?: boolean;
  label?: string;
}) {
  const table = assembly === "gather" ? GATHER : ASSEMBLY;
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || assembly !== "now") return;
    assemble(svg);
  }, [assembly]);

  useEffect(() => {
    const svg = ref.current;
    if (!svg || !respond || form !== "whole") return;
    const host: Element = svg.closest("a, button, [data-mark-host]") ?? svg;
    const touch = (event: Event) => (event as PointerEvent).pointerType === "touch";
    const onPointer = (event: Event) => {
      if (!touch(event)) reconnect(svg);
    };
    /* Touch: the tap that follows the link. The header outlives the page, so
       the mark answers while the next page arrives. */
    const onDown = (event: Event) => {
      if (touch(event)) reconnect(svg);
    };
    const onFocus = () => {
      if (host.matches(":focus-visible")) reconnect(svg);
    };
    host.addEventListener("pointerenter", onPointer);
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("focus", onFocus);
    return () => {
      host.removeEventListener("pointerenter", onPointer);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("focus", onFocus);
    };
  }, [respond, form]);

  return (
    <svg
      ref={ref}
      className={[styles.mark, className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${MARK_BOX.width} ${MARK_BOX.height}`}
      data-form={form}
      data-assemble={assembly === "now" ? undefined : assembly}
      data-respond={respond ? "" : undefined}
      style={
        {
          "--tension": `${TENSION}px`,
          "--ease-register": EASE_REGISTER,
          "--ease-reach": EASE_REACH,
          "--ease-tension": EASE_TENSION,
          "--spread-default": SPREAD,
        } as CSSProperties
      }
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {hub ? (
        <path data-part="hub" className={styles.hub} d={MARK_HUB.d} style={phase(table.hub())} />
      ) : null}
      {MARK_ARMS.map((arm, k) =>
        arms.includes(k) ? (
          <g
            key={arm.angle}
            style={
              {
                "--a": `${arm.angle}deg`,
                "--ux": Math.cos((arm.angle * Math.PI) / 180).toFixed(4),
                "--uy": Math.sin((arm.angle * Math.PI) / 180).toFixed(4),
                "--hx": `${arm.hubOrigin[0]}px`,
                "--hy": `${arm.hubOrigin[1]}px`,
                "--nx": `${arm.nodeOrigin[0]}px`,
                "--ny": `${arm.nodeOrigin[1]}px`,
                "--dist": `${Math.hypot(arm.node.cx - MARK_HUB.cx, arm.node.cy - MARK_HUB.cy).toFixed(1)}px`,
              } as CSSProperties
            }
          >
            <path
              data-part="in"
              className={styles.in}
              d={arm.inner}
              style={phase(table.reach(k))}
            />
            <g data-part="sat" className={styles.sat} style={phase(table.tension(k))}>
              <path
                data-part="out"
                className={styles.out}
                d={arm.outer}
                style={phase(table.reach(k))}
              />
              <path
                data-part="node"
                className={styles.node}
                d={arm.node.d}
                style={phase(table.node(k))}
              />
            </g>
          </g>
        ) : null,
      )}
    </svg>
  );
}

const ALL_ARMS = [0, 1, 2, 3] as const;

/** A part's stretch of the scroll-linked assembly (`markPhases.ts`). */
const phase = ([start, end]: Phase) => ({ "--p0": start, "--p1": end }) as CSSProperties;
