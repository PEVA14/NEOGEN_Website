"use client";

import { useEffect, useRef } from "react";

import { canonicalOutline, LivingInk, type InkOptions } from "./livingInk";
import { MARK_ARMS, MARK_HUB } from "./markGeometry";
import styles from "./MarkField.module.css";

/**
 * LIVING INK in a mark field. See `livingInk.ts`.
 *
 * One path, the mark's outline as a slow material. It answers its section:
 * the pointer near it (the material leans toward it and follows, continuously;
 * a tap on touch screens), and a change of the section's `data-area` (a touch
 * at the hub). In a field that
 * also gathers (`handover`), the parts carry the scroll-linked assembly and
 * this layer takes over only when the page has ended — the moment the mark is
 * whole — and the four connections' contacts run through the material,
 * clockwise from the top.
 */
export function LivingLayer({
  className,
  rest,
  disturb,
  arms,
  episodes,
  handover = false,
}: InkOptions & { className?: string; handover?: boolean }) {
  const ref = useRef<SVGPathElement>(null);
  /* A fragment's arms as a value, so a parent's re-render (a new array with
     the same arms) does not restart the material. */
  const armsKey = arms?.join(",") ?? "";
  const episodesKey = episodes ? JSON.stringify(episodes) : "";

  useEffect(() => {
    const path = ref.current;
    const svg = path?.ownerSVGElement;
    const field = svg?.closest<HTMLElement>("[data-mark-field]");
    const host = field?.parentElement;
    if (!path || !svg || !field || !host) return;
    const ink = new LivingInk(path, {
      rest,
      disturb,
      arms: armsKey ? armsKey.split(",").map(Number) : undefined,
      episodes: episodesKey ? (JSON.parse(episodesKey) as InkOptions["episodes"]) : undefined,
    });

    /* The pointer, in the artwork's units; null when it is nowhere near. */
    const at = (event: PointerEvent) => {
      const m = svg.getScreenCTM();
      if (!m || field.dataset.ink === "off") return null;
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(m.inverse());
      return p.x < -60 || p.y < -60 || p.x > 450 || p.y > 545 ? null : { x: p.x, y: p.y };
    };
    /* A mouse or pen: followed, once a frame at most. */
    let latest: PointerEvent | null = null;
    let pending = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      latest = event;
      if (pending) return;
      pending = requestAnimationFrame(() => {
        pending = 0;
        if (latest) ink.point(at(latest));
      });
    };
    const onLeave = () => ink.point(null);
    /* A finger: a tap is a touch where it lands. */
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const p = at(event);
      if (p) ink.touch(p.x, p.y, 0.7);
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown);

    /* A change of area: the hub catches it. */
    const areaWatch = new MutationObserver(() => ink.touch(MARK_HUB.cx, MARK_HUB.cy, 0.8));
    areaWatch.observe(host, { attributes: true, attributeFilter: ["data-area"] });

    /* The hand-over: the gathered parts until the page ends, then the ink. */
    let onScroll: (() => void) | null = null;
    if (handover) {
      let whole = false;
      onScroll = () => {
        const r = host.getBoundingClientRect();
        const ended = window.innerHeight - r.top >= r.height - 2;
        if (ended === whole) return;
        whole = ended;
        field.dataset.ink = ended ? "on" : "off";
        if (ended)
          MARK_ARMS.forEach((_, k) => window.setTimeout(() => ink.contact(k, 0.9), 120 * k));
      };
      field.dataset.ink = "off";
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    return () => {
      ink.destroy();
      cancelAnimationFrame(pending);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerdown", onDown);
      areaWatch.disconnect();
      if (onScroll) window.removeEventListener("scroll", onScroll);
    };
  }, [rest, disturb, armsKey, episodesKey, handover]);

  return (
    <svg
      className={[styles.mark, styles.living, className].filter(Boolean).join(" ")}
      viewBox="0 0 389 485"
      aria-hidden="true"
      focusable="false"
    >
      <path ref={ref} d={canonicalOutline(arms)} fill="currentColor" />
    </svg>
  );
}
