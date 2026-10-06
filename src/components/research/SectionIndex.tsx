"use client";

import { useEffect, useRef, useState } from "react";

import { AreaIcon } from "@/components/ui/AreaIcon";
import styles from "./SectionIndex.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

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
 * THE NEEDLE (wide screens). The current section is marked by one rule that
 * READS the document: it travels down the index as you read, sitting on an
 * entry while its section begins and sliding toward the next as that
 * section is read through — a needle on a scale, not a highlight jumping
 * from row to row. It is the reading position, so it is state: kept under
 * reduced motion (it only moves when you do). Without script, or on a
 * phone, the current entry carries its own rule as before.
 *
 * Without JavaScript it is still a working list of anchor links.
 */
export function SectionIndex({
  items,
  label,
  title,
  subject,
}: {
  items: readonly SectionIndexItem[];
  /** Accessible name of the navigation landmark. */
  label: string;
  /** Visible mono heading, shown on wide screens. */
  title: string;
  /**
   * What the document is ABOUT — a record's compound (Research architecture
   * pass: "I am still investigating Semaglutide"). Kept in the sticky strip
   * on a phone and above the index beside the text, with its area's symbol.
   */
  subject?: { name: string; area?: DiscoveryAreaId | null };
}) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);
  const stripRef = useRef<HTMLOListElement>(null);
  const needleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const list = stripRef.current;
    const needle = needleRef.current;
    if (!list || !needle) return;
    const wide = window.matchMedia("(min-width: 64rem)");
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    const links = items.map((item) =>
      list.querySelector<HTMLElement>(`[data-target="${item.id}"]`),
    );
    let frame = 0;
    const read = () => {
      frame = 0;
      if (!wide.matches || sections.length === 0) return;
      /* The reading line: a third of the way down the viewport. */
      const line = window.innerHeight * 0.3;
      let i = 0;
      while (i < sections.length - 1 && sections[i + 1].getBoundingClientRect().top <= line) i++;
      const top = sections[i].getBoundingClientRect().top;
      const next = sections[i + 1]?.getBoundingClientRect().top;
      const span = next !== undefined ? next - top : sections[i].offsetHeight;
      const f = Math.min(1, Math.max(0, (line - top) / Math.max(span, 1)));
      const a = links[i];
      const b = links[i + 1] ?? a;
      if (!a || !b) return;
      /* Rest on the entry for the first part of its section, then travel. */
      const t = Math.min(1, Math.max(0, (f - 0.35) / 0.65));
      const y = list.offsetTop + a.offsetTop + (b.offsetTop - a.offsetTop) * t;
      needle.style.setProperty("--y", `${y}px`);
      needle.style.setProperty("--h", `${a.offsetHeight}px`);
      needle.dataset.placed = "true";
      list.dataset.needle = "true";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    wide.addEventListener("change", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      wide.removeEventListener("change", schedule);
    };
  }, [items]);

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
    <nav aria-label={label} className={styles.index} data-subject={subject ? "" : undefined}>
      {subject ? (
        <p className={styles.subject} data-area={subject.area ?? undefined}>
          {subject.area ? <AreaIcon id={subject.area} className={styles.subjectIcon} /> : null}
          <span className={styles.subjectName}>{subject.name}</span>
        </p>
      ) : null}
      <p className={styles.title}>{title}</p>
      <span ref={needleRef} className={styles.needle} aria-hidden="true" />
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
