"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import { MARK_ARMS, MARK_BOX, MARK_HUB } from "./markGeometry";
import { assemble, reconnect } from "./markMotion";
import styles from "./NeogenMark.module.css";

/**
 * THE NEOGEN MARK — the one source of its geometry, and its small vocabulary.
 *
 * The owner's mark, as the parts `scripts/trace-mark.mjs` measured from the
 * artwork: a hub, four nodes, and four connections, each cut at the middle of
 * its gap into a half that belongs to the hub and a half that belongs to the
 * node. At rest the parts are exactly the artwork (98.96% pixel overlap; the
 * rest is antialiasing), inked in `currentColor` like the mask it replaces.
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
  label,
}: {
  className?: string;
  form?: "whole" | "points";
  assemble?: "hero" | "view" | "now";
  respond?: boolean;
  label?: string;
}) {
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
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path data-part="hub" className={styles.hub} d={MARK_HUB.d} />
      {MARK_ARMS.map((arm, k) => (
        <g
          key={arm.angle}
          style={
            {
              "--k": k,
              "--a": `${arm.angle}deg`,
              "--ux": Math.cos((arm.angle * Math.PI) / 180).toFixed(4),
              "--uy": Math.sin((arm.angle * Math.PI) / 180).toFixed(4),
              "--hx": `${arm.hubOrigin[0]}px`,
              "--hy": `${arm.hubOrigin[1]}px`,
              "--nx": `${arm.nodeOrigin[0]}px`,
              "--ny": `${arm.nodeOrigin[1]}px`,
            } as CSSProperties
          }
        >
          <path data-part="in" className={styles.in} d={arm.inner} />
          <g data-part="sat" className={styles.sat}>
            <path data-part="out" className={styles.out} d={arm.outer} />
            <circle
              data-part="node"
              className={styles.node}
              cx={arm.node.cx}
              cy={arm.node.cy}
              r={arm.node.r}
            />
          </g>
        </g>
      ))}
    </svg>
  );
}
