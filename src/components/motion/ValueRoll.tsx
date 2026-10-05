"use client";

import { useLayoutEffect, useRef, useState } from "react";

import styles from "./ValueRoll.module.css";
import { prefersReducedMotion } from "@/lib/reducedMotion";

/**
 * A FIGURE THAT ROLLS TO ITS NEW VALUE — the everyday number transition.
 *
 * Borrowed from Motion+'s AnimateNumber (digits as columns that travel, a
 * `trend` that keeps every column turning the same way), rebuilt in CSS so it
 * costs no dependency: each digit is a strip of 0–9 twice over, and changing
 * the value moves each strip to its new digit, all of them in the direction
 * the value moved — up for more, down for less. A price going from $4,000 to
 * $8,900 is read as a price going UP, not as a crossfade between two numbers.
 *
 * Units stay put: columns are matched from the right, so the thousands of one
 * price sit over the thousands of the next. Separators and currency signs
 * never roll; a column that is new (a price gaining a digit) opens in place.
 *
 * Text, not decoration: the whole string is the element's accessible text
 * (one visually hidden copy), and the strips are aria-hidden. First paint is
 * the value at rest — nothing rolls until the value changes. Under reduced
 * motion the strips jump (interface motion, shortened to nothing visible).
 */
export function ValueRoll({
  value,
  className,
}: {
  /** The formatted figure: "$4,000", "16", "5 mg". */
  value: string;
  className?: string;
}) {
  const [shown, setShown] = useState({ value, trend: 1 as 1 | -1, key: 0 });
  const last = useRef(value);

  useLayoutEffect(() => {
    if (last.current === value) return;
    const before = parseFloat(last.current.replace(/[^\d.]/g, "")) || 0;
    const after = parseFloat(value.replace(/[^\d.]/g, "")) || 0;
    last.current = value;
    setShown((s) => ({ value, trend: after >= before ? 1 : -1, key: s.key + 1 }));
  }, [value]);

  const chars = [...shown.value];
  return (
    <span className={[styles.roll, className].filter(Boolean).join(" ")} data-roll="">
      <span className={styles.text}>{shown.value}</span>
      <span className={styles.strips} aria-hidden="true" data-trend={shown.trend}>
        {chars.map((ch, i) => {
          /* Keyed from the right, so a column keeps its identity (and rolls)
             when the figure gains or loses a digit on the left. */
          const fromRight = chars.length - i;
          if (!/\d/.test(ch)) {
            return (
              <span key={`s${fromRight}`} className={styles.sep} data-roll-glyph="">
                {ch}
              </span>
            );
          }
          return <Column key={`d${fromRight}`} digit={Number(ch)} trend={shown.trend} />;
        })}
      </span>
    </span>
  );
}

/**
 * One digit. At rest it is just the figure. When it changes, the old figure
 * leaves through the top of its window and the new one comes up from below
 * (or the other way, for a smaller value) — and nothing else passes through:
 * a figure in transition never shows a value it does not hold. A $4,000
 * price going to $10,900 never reads, even for a frame, as $16,300.
 */
function Column({ digit, trend }: { digit: number; trend: 1 | -1 }) {
  const cell = useRef<HTMLSpanElement>(null);
  const at = useRef(digit);

  useLayoutEffect(() => {
    const node = cell.current;
    const from = at.current;
    at.current = digit;
    if (!node || from === digit) return;
    if (prefersReducedMotion()) return;
    const { duration, easing } = settle();
    rolling(node, duration);
    const leaving = document.createElement("span");
    leaving.className = styles.leaving;
    leaving.setAttribute("data-roll-glyph", "");
    leaving.textContent = String(from);
    node.append(leaving);
    const now = node.firstElementChild as HTMLElement | null;
    const timing = { duration, easing, fill: "both" as const };
    now?.animate({ translate: [`0 ${trend * 100}%`, "0 0"] }, timing);
    leaving.animate({ translate: ["0 0", `0 ${trend * -100}%`] }, timing).finished.then(
      () => leaving.remove(),
      () => leaving.remove(),
    );
  }, [digit, trend]);

  return (
    <span ref={cell} className={styles.column}>
      <span className={styles.figure} data-roll-glyph="">
        {digit}
      </span>
    </span>
  );
}

/*
 * THE SITE'S TEMPO, READ ONCE (finishing pass, profiling). Each changing digit
 * used to read the tokens off its own computed style inside a layout effect,
 * right after React's DOM writes: one forced style recalculation per digit,
 * which in the compendium's count landed on every keystroke. The tokens are
 * the root's and do not change while the page lives, so they are read from
 * the root the first time a figure moves and kept.
 */
let tempo: { duration: number; easing: string } | null = null;

function settle(): { duration: number; easing: string } {
  if (!tempo) {
    const style = getComputedStyle(document.documentElement);
    tempo = {
      duration: ms(style.getPropertyValue("--motion-duration-slow")) * 1.6 || 540,
      easing: style.getPropertyValue("--ease-settle").trim() || "ease-out",
    };
  }
  return tempo;
}

/*
 * WHILE A FIGURE ROLLS, SAY SO (GHK-Cu, owner, 2026-10-04: "when changing the
 * format the price animation glitches"). A world may paint its price as metal
 * clipped to the text (`background-clip: text` on the price). The browser
 * paints that through each glyph where it RESTS, ignoring the columns' travel
 * and their windows, so the old and new figures printed over each other for
 * the whole roll. `data-rolling` on the figure lets such a world hand its
 * material to the moving glyphs (`data-roll-glyph`) for as long as they move.
 */
const settling = new WeakMap<Element, number>();

function rolling(node: Element, duration: number): void {
  const root = node.closest("[data-roll]");
  if (!root) return;
  root.setAttribute("data-rolling", "");
  window.clearTimeout(settling.get(root));
  settling.set(
    root,
    window.setTimeout(() => root.removeAttribute("data-rolling"), duration + 60),
  );
}

/** A CSS time token in milliseconds — "340ms", or ".34s" once minified. */
function ms(value: string): number {
  const v = value.trim();
  const n = parseFloat(v);
  return v.endsWith("ms") ? n : v.endsWith("s") ? n * 1000 : n;
}
