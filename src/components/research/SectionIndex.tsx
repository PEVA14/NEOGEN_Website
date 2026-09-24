"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./SectionIndex.module.css";

export interface SectionIndexItem {
  id: string;
  label: string;
  /** A count or short fact, set in mono after the label — "3", "12 ref." */
  meta?: string;
}

/**
 * THE LOCAL INDEX — where you are in a long document, and a way to jump.
 *
 * WHY AN INDEX AND NOT TABS. A compound record is read in order: mechanism
 * explains what the research measured, and the references number the whole.
 * Tabs would hide four fifths of it behind clicks, break in-page search and
 * make the citation markers point at panels that are not on the page. So the
 * record is one document, and this is its table of contents: sticky beside the
 * text on a wide screen, a sticky strip under the header on a phone.
 *
 * The only motion is the marker moving to the section being read — state,
 * which is the one thing this project allows to move. It is a class change,
 * not an animation, so reduced motion needs no special case.
 *
 * Without JavaScript it is still a working list of anchor links.
 */
export function SectionIndex({
  items,
  label,
  title,
}: {
  items: readonly SectionIndexItem[];
  /** Accessible name of the navigation landmark. */
  label: string;
  /** Visible mono heading, shown on wide screens. */
  title: string;
}) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);
  const stripRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const targets = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0 || typeof IntersectionObserver === "undefined") return;

    /*
     * The "reading line" is a band a third of the way down the viewport: the
     * section crossing it is the one being read. The last visible section
     * wins, so a short final section still becomes current at the page end.
     */
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting);
        const current = targets.find((t) => visible.get(t.id));
        if (current) setActive(current.id);
      },
      { rootMargin: "-25% 0px -65% 0px" },
    );
    for (const target of targets) observer.observe(target);
    return () => observer.disconnect();
  }, [items]);

  /* Keep the current item in view inside the horizontal strip on a phone —
     by scrolling the STRIP, never the page. */
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !active) return;
    const link = strip.querySelector<HTMLElement>(`[data-target="${active}"]`);
    if (!link || strip.scrollWidth <= strip.clientWidth) return;
    const left = link.offsetLeft - strip.clientWidth / 2 + link.clientWidth / 2;
    strip.scrollTo({ left: Math.max(0, left) });
  }, [active]);

  return (
    <nav aria-label={label} className={styles.index}>
      <p className={styles.title}>{title}</p>
      <ol className={styles.list} ref={stripRef}>
        {items.map((item, i) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              data-target={item.id}
              className={styles.link}
              aria-current={active === item.id ? "location" : undefined}
            >
              <span className={styles.number} aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className={styles.label}>{item.label}</span>
              {item.meta ? <span className={styles.meta}>{item.meta}</span> : null}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
