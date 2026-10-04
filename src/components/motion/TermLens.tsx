"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, type ReactNode } from "react";

import styles from "./TermLens.module.css";

/**
 * THE WORD, DEFINED WHERE IT IS READ.
 *
 * A record is written in the glossary's vocabulary — "agonista", "vida
 * media", "ensayo abierto" — and used to list those words at its foot. Here
 * each one is marked at its first use in the record's own sentences (the
 * server cuts them with `termSpans`, never rewording a statement), and its
 * definition — the glossary's own, word for word — opens out of the line,
 * just under it. The card ends in a link to the term's own entry in the
 * glossary, for whoever wants it on its own.
 *
 *   pointer      pointing at the word previews the card; the pointer can
 *                move into it (to reach the link); leaving both closes it
 *   tap / click  opens it and keeps it open — on a phone this is the only
 *                way, so a word no longer leaves the record; tapping the word
 *                again, outside, or Escape closes it
 *   keyboard     focus previews it; Enter keeps it open and moves focus to
 *                the card's link; Escape closes it and returns to the word
 *
 * A modified click (new tab, new window) still follows the word's own link,
 * and without script the words are plain links to the glossary. The
 * definitions are on the page already (a hidden block, `data-def`), so
 * nothing loads. Reduced motion: the card appears without unfolding.
 */
export function TermLens({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const id = useId();
  const router = useRouter();

  useEffect(() => {
    const node = root.current;
    const lens = card.current;
    if (!node || !lens) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    let current: HTMLElement | null = null;
    /* Opened by a click, tap or Enter: stays until closed on purpose. */
    let pinned = false;
    let timer = 0;
    /* Escape hands focus back to the word: that is not a request to reopen. */
    let returning = false;

    const hide = () => {
      window.clearTimeout(timer);
      current?.removeAttribute("data-open");
      current?.setAttribute("aria-expanded", "false");
      current = null;
      pinned = false;
      lens.setAttribute("data-on", "false");
      lens.removeAttribute("role");
      lens.removeAttribute("aria-label");
      lens.setAttribute("inert", "");
    };
    const show = (term: HTMLElement) => {
      window.clearTimeout(timer);
      if (current === term) return;
      hide();
      const def = node.querySelector<HTMLElement>(`[data-def="${term.dataset.term}"]`);
      if (!def) return;
      current = term;
      lens.replaceChildren(...[...def.children].map((c) => c.cloneNode(true)));
      const box = node.getBoundingClientRect();
      const r = term.getBoundingClientRect();
      const width = Math.min(340, box.width);
      const left = Math.min(Math.max(0, r.left - box.left), box.width - width);
      lens.style.setProperty("--w", `${width}px`);
      lens.style.setProperty("--x", `${left}px`);
      lens.style.setProperty("--y", `${r.bottom - box.top + 8}px`);
      /* The fold opens from where the word is. */
      lens.style.setProperty(
        "--origin",
        `${Math.max(0, r.left - box.left - left + r.width / 2)}px`,
      );
      term.setAttribute("data-open", "");
      term.setAttribute("aria-expanded", "true");
      lens.setAttribute("role", "dialog");
      lens.setAttribute("aria-label", term.textContent ?? "");
      lens.removeAttribute("inert");
      lens.setAttribute("data-on", "false");
      void lens.offsetWidth;
      lens.setAttribute("data-on", "true");
    };
    const later = () => {
      if (pinned) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(hide, 160);
    };

    const termOf = (target: EventTarget | null) =>
      (target as HTMLElement | null)?.closest<HTMLElement>("[data-term]") ?? null;
    const inCard = (target: EventTarget | null) => lens.contains(target as Node);

    /* Pointer preview (fine pointers only). */
    const pointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" && !fine.matches) return;
      const term = termOf(event.target);
      if (term) {
        if (!pinned) show(term);
        else if (term === current) window.clearTimeout(timer);
        return;
      }
      if (inCard(event.target)) return window.clearTimeout(timer);
      if (current) later();
    };

    /* Click, tap or Enter on a word: open it and keep it open (or close it). */
    const click = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>("[data-def-link]");
      if (link && inCard(link)) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        const href = link.getAttribute("href");
        hide();
        if (href) router.push(href);
        return;
      }
      const term = termOf(event.target);
      if (!term) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
      event.preventDefault();
      if (pinned && current === term) {
        hide();
        return;
      }
      show(term);
      pinned = true;
      /* From the keyboard (a click with no pointer), go on into the card. */
      if (event.detail === 0) lens.querySelector<HTMLElement>("[data-def-link]")?.focus();
    };

    /* Keyboard focus previews; leaving the word and the card closes. */
    const focusIn = (event: FocusEvent) => {
      if (inCard(event.target)) return window.clearTimeout(timer);
      if (returning) {
        returning = false;
        return;
      }
      const term = termOf(event.target);
      if (term && term !== current) show(term);
    };
    const focusOut = (event: FocusEvent) => {
      const next = event.relatedTarget as Node | null;
      if (next && (lens.contains(next) || next === current)) return;
      if (current && (inCard(event.target) || termOf(event.target) === current)) {
        pinned = false;
        later();
      }
    };

    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !current) return;
      const term = current;
      const fromCard = lens.contains(document.activeElement);
      hide();
      if (fromCard) {
        returning = true;
        term.focus();
      }
    };
    /* A tap or click anywhere else lets go of a kept-open card. */
    const away = (event: PointerEvent) => {
      if (!current || inCard(event.target) || termOf(event.target)) return;
      hide();
    };

    hide();
    /* Each word now discloses its card (it no longer leaves the page). */
    node.querySelectorAll<HTMLElement>("[data-term]").forEach((term) => {
      term.setAttribute("aria-expanded", "false");
      term.setAttribute("aria-controls", `${id}-lens`);
    });
    node.addEventListener("pointerover", pointerOver);
    node.addEventListener("pointerleave", later);
    node.addEventListener("click", click);
    node.addEventListener("focusin", focusIn);
    node.addEventListener("focusout", focusOut);
    document.addEventListener("pointerdown", away);
    window.addEventListener("keydown", key);
    window.addEventListener("resize", hide);
    return () => {
      window.clearTimeout(timer);
      node.removeEventListener("pointerover", pointerOver);
      node.removeEventListener("pointerleave", later);
      node.removeEventListener("click", click);
      node.removeEventListener("focusin", focusIn);
      node.removeEventListener("focusout", focusOut);
      document.removeEventListener("pointerdown", away);
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", hide);
    };
  }, [id, router]);

  return (
    <div ref={root} className={[styles.lensRoot, className].filter(Boolean).join(" ")}>
      {children}
      {/* A non-modal dialog while it holds a definition (`role` set then),
          inert and empty otherwise. */}
      <div ref={card} id={`${id}-lens`} className={styles.card} data-on="false" />
    </div>
  );
}
