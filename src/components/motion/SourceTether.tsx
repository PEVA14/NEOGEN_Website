"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./SourceTether.module.css";

/**
 * CLAIM ↔ SOURCE — the citation made physical.
 *
 * Every sourced sentence on NEOGEN already carries its numbers ([01, 03]) and
 * every number already has an entry in a reference list. This makes that
 * mapping something you can see and handle, without adding a word to it:
 *
 *   a marker, pointed at or focused  → its source lifts out of the list and a
 *                                      leader line is drawn from the number to
 *                                      it, as on a technical drawing; when the
 *                                      list is out of sight (a long record)
 *                                      the source comes to the sentence
 *                                      instead, as a margin card
 *   a source, pointed at or focused  → every sentence that cites it is marked
 *                                      in the margin; the rest step back
 *
 * It exposes structure that exists — `data-cite` on each marker link,
 * `data-cites` on each sentence, `data-ref` on each list entry, all written
 * by the server from the record's own numbering — and invents none.
 *
 * Progressive: without script the markers are plain links to their entries.
 * Touch has no hover, so a tap follows the link (and the entry marks itself
 * as the target, in CSS). Reduced motion: the line and card appear without
 * travelling.
 */
export function SourceTether({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = root.current;
    const line = svg.current;
    const lens = card.current;
    if (!node || !line || !lens) return;
    const path = line.querySelector("path");
    if (!path) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");

    let current: string | null = null;
    let hideTimer = 0;

    const clear = () => {
      current = null;
      delete node.dataset.active;
      delete node.dataset.citing;
      node.querySelectorAll("[data-lit]").forEach((el) => el.removeAttribute("data-lit"));
      line.dataset.on = "false";
      lens.dataset.on = "false";
    };

    const showClaim = (mark: HTMLElement) => {
      const n = mark.dataset.cite;
      if (!n) return;
      window.clearTimeout(hideTimer);
      if (current === `c${n}` && node.dataset.active) return;
      clear();
      current = `c${n}`;
      node.dataset.active = n;
      const entry = node.querySelector<HTMLElement>(`[data-ref="${n}"]`);
      const sentence = mark.closest<HTMLElement>("[data-cites]");
      sentence?.setAttribute("data-lit", "");
      mark.setAttribute("data-lit", "");
      if (!entry) return;
      entry.setAttribute("data-lit", "");

      const box = node.getBoundingClientRect();
      const m = mark.getBoundingClientRect();
      const e = entry.getBoundingClientRect();
      const index =
        entry.querySelector<HTMLElement>("[data-ref-index]")?.getBoundingClientRect() ?? e;
      const onScreen = e.top >= 0 && e.bottom <= window.innerHeight;
      const beside = index.left > m.right + 24;

      if (onScreen && beside) {
        /* The leader: out of the number, along the gutter, into the entry. */
        const x0 = m.right - box.left + 4;
        const y0 = m.top + m.height / 2 - box.top;
        const x2 = index.left - box.left - 8;
        const y2 = index.top + index.height / 2 - box.top;
        const xm = Math.max(x0 + 12, x2 - 28);
        path.setAttribute("d", `M ${x0} ${y0} H ${xm} V ${y2} H ${x2}`);
        line.style.setProperty("--x2", `${x2}px`);
        line.style.setProperty("--y2", `${y2}px`);
        line.style.setProperty("--x0", `${x0}px`);
        line.style.setProperty("--y0", `${y0}px`);
        line.dataset.on = "false";
        void line.getBoundingClientRect();
        line.dataset.on = "true";
        return;
      }

      /* The list is elsewhere on the page: bring the source to the sentence. */
      const body = entry.querySelector<HTMLElement>("[data-ref-body]");
      lens.replaceChildren();
      const head = document.createElement("p");
      head.className = styles.cardIndex;
      head.textContent = `[${n.padStart(2, "0")}]`;
      lens.append(head);
      if (body) {
        const copy = body.cloneNode(true) as HTMLElement;
        copy.querySelectorAll("a, [id]").forEach((el) => {
          if (el.tagName === "A") el.remove();
          else el.removeAttribute("id");
        });
        lens.append(copy);
      }
      const width = Math.min(360, box.width - 16);
      const left = Math.min(Math.max(8, m.left - box.left - 24), box.width - width - 8);
      lens.style.setProperty("--w", `${width}px`);
      lens.style.setProperty("--x", `${left}px`);
      lens.style.setProperty("--y", `${m.bottom - box.top + 10}px`);
      lens.dataset.on = "true";
    };

    const showSource = (entry: HTMLElement) => {
      const n = entry.dataset.ref;
      if (!n) return;
      window.clearTimeout(hideTimer);
      if (current === `s${n}`) return;
      clear();
      current = `s${n}`;
      node.dataset.citing = n;
      entry.setAttribute("data-lit", "");
      node.querySelectorAll<HTMLElement>("[data-cites]").forEach((s) => {
        if (s.dataset.cites?.split(" ").includes(n)) s.setAttribute("data-lit", "");
      });
    };

    const later = () => {
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(clear, 140);
    };

    const over = (event: Event) => {
      const target = event.target as HTMLElement;
      const mark = target.closest<HTMLElement>("[data-cite]");
      if (mark) return showClaim(mark);
      const entry = target.closest<HTMLElement>("[data-ref]");
      if (entry) return showSource(entry);
      if (current) later();
    };
    const pointerOver = (event: PointerEvent) => {
      if (event.pointerType === "mouse" || fine.matches) over(event);
    };

    node.addEventListener("pointerover", pointerOver);
    node.addEventListener("pointerleave", later);
    node.addEventListener("focusin", over);
    node.addEventListener("focusout", later);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", clear);
    return () => {
      window.clearTimeout(hideTimer);
      node.removeEventListener("pointerover", pointerOver);
      node.removeEventListener("pointerleave", later);
      node.removeEventListener("focusin", over);
      node.removeEventListener("focusout", later);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", clear);
    };
  }, []);

  return (
    <div ref={root} className={[styles.tether, className].filter(Boolean).join(" ")}>
      {children}
      <svg ref={svg} className={styles.leader} aria-hidden="true" data-on="false">
        <path pathLength={1} />
        <rect className={styles.foot} width="5" height="5" />
      </svg>
      <div ref={card} className={styles.card} aria-hidden="true" data-on="false" />
    </div>
  );
}
