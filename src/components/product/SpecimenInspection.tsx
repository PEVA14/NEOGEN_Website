"use client";

import { useCallback, useEffect, useRef, type RefObject } from "react";

import type { SpecimenProbe, SpecimenReading } from "@/components/experience/specimenProbe";

import { LIVE_FRAME_MARGIN } from "./liveFrame";
import styles from "./SpecimenInspection.module.css";

/** The live box's margin as a share of the live box: where the frame starts. */
const INSET = LIVE_FRAME_MARGIN / (1 + 2 * LIVE_FRAME_MARGIN);
const toFrame = (c: number) => (c - INSET) / (1 - 2 * INSET);

/** How squarely the label must face the lens to be read (`facing`, 0–1). */
const READ_FROM = 0.45;
const READ_FULL = 0.8;

/** A finger's turn: half a turn per frame width. */
const DRAG_TURN = Math.PI;

const pct = (n: number) => `${(n * 100).toFixed(2)}%`;

/**
 * FLAGSHIP IDEA #4 — THE SPECIMEN UNDER INSPECTION (RETA first).
 *
 * The live vial is always being read by its frame — there is no control to
 * open it (owner, 2026-10-02: "something very simple", so always on). It
 * keeps its slow turn, and the frame keeps up with it:
 *
 *   - the frame's two graduated edges read the specimen's extent: a mark at
 *     each side of its silhouette and the span between them, on the scale,
 *     never on the object;
 *   - the label is read: an index on the top edge follows the label's front
 *     round as the vial turns, and carries the reading — the compound and its
 *     research-use status, both verified site copy. It shows only while the
 *     label faces the lens, and fades as it turns away.
 *
 * There are no numbers on the scales. NEOGEN has no verified dimension of the
 * vial to print, so the scales mark extent and leave it unquantified; the
 * draft label's strength and purity are never repeated (`DEMO_ARTWORK`).
 *
 * Every position comes from the live model through the scene's own camera
 * (`experience/specimenProbe`), written straight to transforms once a frame —
 * nothing re-renders.
 */
export function SpecimenInspection({
  reading: lines,
  probe,
  onTurn,
}: {
  /** What reading the label yields: verified product facts only. */
  reading: string[];
  probe: RefObject<SpecimenProbe>;
  /** Turns the vial by this many radians (a finger's drag). */
  onTurn: (radians: number) => void;
}) {
  const markLeft = useRef<HTMLSpanElement>(null);
  const markRight = useRef<HTMLSpanElement>(null);
  const spanAcross = useRef<HTMLSpanElement>(null);
  const markTop = useRef<HTMLSpanElement>(null);
  const markBottom = useRef<HTMLSpanElement>(null);
  const spanDown = useRef<HTMLSpanElement>(null);
  const index = useRef<HTMLSpanElement>(null);
  const reading = useRef<HTMLSpanElement>(null);
  const readingText = useRef<HTMLSpanElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  /** The reading's width, as a share of the frame. */
  const width = useRef(0.5);

  /*
   * THE WRITER — called by the scene once a frame. Transforms and opacity
   * only, on a handful of hairlines.
   */
  const write = useCallback((r: SpecimenReading) => {
    const left = toFrame(r.left);
    const right = toFrame(r.right);
    const top = toFrame(r.top);
    const bottom = toFrame(r.bottom);
    markLeft.current?.style.setProperty("translate", `${pct(left)} 0`);
    markRight.current?.style.setProperty("translate", `${pct(right)} 0`);
    spanAcross.current?.style.setProperty("translate", `${pct(left)} 0`);
    spanAcross.current?.style.setProperty("scale", `${(right - left).toFixed(4)} 1`);
    markTop.current?.style.setProperty("translate", `0 ${pct(top)}`);
    markBottom.current?.style.setProperty("translate", `0 ${pct(bottom)}`);
    spanDown.current?.style.setProperty("translate", `0 ${pct(top)}`);
    spanDown.current?.style.setProperty("scale", `1 ${(bottom - top).toFixed(4)}`);

    const label = r.label;
    const legible = label
      ? Math.min(1, Math.max(0, (label.facing - READ_FROM) / (READ_FULL - READ_FROM)))
      : 0;
    const x = label ? toFrame(label.x) : 0;
    const at = Math.max(0, Math.min(x, 1 - width.current));
    index.current?.style.setProperty("translate", `${pct(x)} 0`);
    index.current?.style.setProperty("opacity", legible.toFixed(3));
    reading.current?.style.setProperty("translate", `${pct(at)} 0`);
    reading.current?.style.setProperty("opacity", legible.toFixed(3));
  }, []);

  /* The scene calls the writer through the probe. */
  useEffect(() => {
    const line = probe.current;
    line.listen(write);
    return () => line.listen(null);
  }, [probe, write]);

  /* The reading's own width, so it can follow the index without leaving the
     frame. */
  useEffect(() => {
    const frame = layer.current;
    const text = readingText.current;
    if (!frame || !text) return;
    const measure = () => {
      width.current = (text.offsetLeft + text.offsetWidth) / (frame.clientWidth || 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  /*
   * A FINGER TURNS IT. With a mouse the stage already turns the vial as the
   * cursor crosses it; a touch screen has no hover, so a horizontal drag
   * across the frame turns it. Vertical drags stay the page's
   * (`touch-action: pan-y`): nothing here holds the scroll.
   */
  useEffect(() => {
    const node = layer.current;
    if (!node) return;
    let last: number | null = null;
    const down = (event: PointerEvent) => {
      if (event.pointerType === "mouse") return;
      last = event.clientX;
    };
    const move = (event: PointerEvent) => {
      if (last === null || event.pointerType === "mouse") return;
      const across = node.clientWidth || 1;
      onTurn(((event.clientX - last) / across) * DRAG_TURN);
      last = event.clientX;
    };
    const up = () => {
      last = null;
    };
    node.addEventListener("pointerdown", down);
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerup", up);
    node.addEventListener("pointercancel", up);
    return () => {
      node.removeEventListener("pointerdown", down);
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerup", up);
      node.removeEventListener("pointercancel", up);
    };
  }, [onTurn]);

  return (
    <div ref={layer} className={styles.layer}>
      <span className={styles.geometry} aria-hidden="true">
        <span ref={spanAcross} className={styles.spanAcross} />
        <span ref={markLeft} className={styles.markAcross} />
        <span ref={markRight} className={styles.markAcross} />
        <span ref={spanDown} className={styles.spanDown} />
        <span ref={markTop} className={styles.markDown} />
        <span ref={markBottom} className={styles.markDown} />
        <span ref={index} className={styles.index} />
        <span ref={reading} className={styles.reading}>
          <span ref={readingText} className={styles.readingText}>
            {lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </span>
      </span>
    </div>
  );
}
