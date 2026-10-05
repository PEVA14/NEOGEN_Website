"use client";

import { useEffect } from "react";

/**
 * NEOGEN BECOMES THE PAGE — the hero's exit (motion pass 2).
 *
 * The hero's poster-scale NEOGEN does not scroll away with the hero. As the
 * page is scrolled it shrinks and travels down, across the hero's lower
 * edge, and lands exactly on the "NEOGEN" of the next section's title,
 * "Explora NEOGEN": the brand's poster becomes the first word of the store.
 * Where it crosses from the dark hero into the paper section it changes
 * ink with the ground it is on — ghosted on the dark, charcoal on the paper —
 * because the part over the hero is the poster itself (still behind the
 * vial, clipped by the hero) and the part over the paper is its twin.
 *
 * Scroll-linked, not timed: it is wherever the scroll puts it, and scrolling
 * back up returns it to the poster. Everything is measured once (and on
 * resize); each frame only reads `scrollY` and writes two transforms.
 *
 * Reduced motion, or no JavaScript: the poster stays a poster and the title
 * is printed as it always was.
 */
export function HeroHandoff() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const poster = document.querySelector<HTMLElement>("[data-hero-condense]");
    const target = document.querySelector<HTMLElement>("[data-handoff-target]");
    const hero = poster?.closest("section");
    if (!poster || !target || !hero) return;

    const twin = document.createElement("span");
    twin.setAttribute("aria-hidden", "true");
    twin.textContent = poster.textContent;
    twin.className = poster.className;
    Object.assign(twin.style, {
      position: "fixed",
      left: "0",
      top: "0",
      margin: "0",
      zIndex: "19",
      pointerEvents: "none",
      color: "var(--ink-primary)",
      willChange: "transform, clip-path",
      visibility: "hidden",
    } satisfies Partial<CSSStyleDeclaration>);
    document.body.append(twin);
    poster.setAttribute("data-handoff", "");
    twin.setAttribute("data-handoff", "");

    const textBox = (el: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return range.getBoundingClientRect();
    };
    const css = (el: HTMLElement, prop: string) => getComputedStyle(el).getPropertyValue(prop);

    let geo: {
      r0: { left: number; top: number; h: number };
      t: { left: number; top: number; h: number };
      posterOrigin: { x: number; y: number };
      twinOrigin: { x: number; y: number };
      heroBottom: number;
      end: number;
      ls0: number;
      ls1: number;
    } | null = null;

    const measure = () => {
      poster.style.transform = "";
      poster.style.letterSpacing = "";
      twin.style.transform = "";
      twin.style.letterSpacing = "";
      const y = window.scrollY;
      const pr = poster.getBoundingClientRect();
      const pt = textBox(poster);
      const tt = textBox(target);
      const tw = twin.getBoundingClientRect();
      const twt = textBox(twin);
      const fs0 = parseFloat(css(poster, "font-size"));
      const fs1 = parseFloat(css(target, "font-size"));
      /* Where the name comes to rest: its title a third of the way down. */
      const end = Math.max(1, tt.top + y - window.innerHeight * 0.34);
      geo = {
        r0: { left: pt.left, top: pt.top + y, h: pt.height },
        t: { left: tt.left, top: tt.top + y, h: tt.height },
        posterOrigin: { x: pt.left - pr.left, y: pt.top - pr.top },
        twinOrigin: { x: twt.left - tw.left, y: twt.top - tw.top },
        heroBottom: hero.getBoundingClientRect().bottom + y,
        end,
        ls0: parseFloat(css(poster, "letter-spacing")) / fs0 || 0,
        ls1: parseFloat(css(target, "letter-spacing")) / fs1 || 0,
      };
      poster.style.transformOrigin = `${geo.posterOrigin.x}px ${geo.posterOrigin.y}px`;
      twin.style.transformOrigin = `${geo.twinOrigin.x}px ${geo.twinOrigin.y}px`;
    };

    const ease = (x: number) => x * x * (3 - 2 * x);
    let frame = 0;
    /* The last state written: once the name has landed (or is back at rest)
       nothing is written again until that changes — the rest of the page
       scrolls without this touching a style. */
    let written = -1;
    const draw = () => {
      frame = 0;
      if (!geo) return;
      const y = window.scrollY;
      const raw = Math.min(1, Math.max(0, y / geo.end));
      if ((raw === 1 || raw === 0) && raw === written) return;
      written = raw;
      const p = ease(raw);
      const scale = 1 + (geo.t.h / geo.r0.h - 1) * p;
      /* Both ends in viewport space at this scroll, then the path between. */
      const left = geo.r0.left + (geo.t.left - geo.r0.left) * p;
      const top = geo.r0.top + (geo.t.top - geo.r0.top) * p - y;
      const ls = `${geo.ls0 + (geo.ls1 - geo.ls0) * p}em`;
      const landed = raw >= 1;

      poster.style.letterSpacing = ls;
      poster.style.transform = `translate(${left - geo.r0.left}px, ${top - (geo.r0.top - y)}px) scale(${scale})`;
      poster.style.visibility = landed ? "hidden" : "";

      twin.style.letterSpacing = ls;
      twin.style.transform = `translate(${left - geo.twinOrigin.x}px, ${top - geo.twinOrigin.y}px) scale(${scale})`;
      /* The twin only where the paper is: below the hero's lower edge. */
      const twinTop = top - geo.twinOrigin.y * scale;
      const cut = Math.max(0, (geo.heroBottom - y - twinTop) / scale);
      twin.style.clipPath = `inset(${cut}px 0 0 0)`;
      twin.style.visibility = raw > 0 && !landed ? "visible" : "hidden";

      target.style.opacity = landed ? "" : "0";
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const remeasure = () => {
      measure();
      written = -1;
      draw();
    };

    void document.fonts.ready.then(remeasure);
    remeasure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", remeasure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", remeasure);
      twin.remove();
      poster.removeAttribute("data-handoff");
      poster.style.transform = "";
      poster.style.letterSpacing = "";
      poster.style.visibility = "";
      target.style.opacity = "";
    };
  }, []);
  return null;
}
