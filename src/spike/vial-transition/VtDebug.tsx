"use client";

import { useEffect, useState } from "react";

/**
 * SPIKE — an on-screen log of the view transition, for phones, where there is
 * no console to read. Off unless the URL carries `?vtdebug` once (it is then
 * remembered for the tab). Renders nothing otherwise.
 *
 * It wraps `document.startViewTransition` and records what the browser did
 * with each transition — started, ready, finished or skipped (and why) — with
 * the page's scroll position at each step, because a new page captured at the
 * OLD scroll position sends the object off screen.
 */

interface Line {
  t: number;
  text: string;
}

declare global {
  interface Window {
    __vtDebug?: { lines: Line[]; installed: boolean };
  }
}

function enabled(): boolean {
  try {
    if (new URLSearchParams(location.search).has("vtdebug")) sessionStorage.setItem("vtdebug", "1");
    return sessionStorage.getItem("vtdebug") === "1";
  } catch {
    return false;
  }
}

function install() {
  const state = (window.__vtDebug ??= { lines: [], installed: false });
  if (state.installed) return state;
  state.installed = true;
  const t0 = performance.now();
  const log = (text: string) => {
    state.lines.push({ t: Math.round(performance.now() - t0), text });
    if (state.lines.length > 14) state.lines.shift();
  };
  const y = () => Math.round(scrollY);
  log(
    `vt:${typeof document.startViewTransition === "function" ? "yes" : "NO"} ` +
      `class:${CSS.supports("view-transition-class", "a") ? "yes" : "NO"} ` +
      `reduced:${matchMedia("(prefers-reduced-motion: reduce)").matches ? "YES" : "no"}`,
  );
  addEventListener("click", () => log(`click y=${y()}`), true);
  addEventListener("popstate", () => log(`popstate y=${y()}`));
  const original = Document.prototype.startViewTransition as unknown as
    ((this: Document, arg?: unknown) => ViewTransition) | undefined;
  if (!original) return state;
  (Document.prototype as unknown as { startViewTransition: unknown }).startViewTransition =
    function (this: Document, arg?: unknown) {
      const types = (arg as { types?: Iterable<string> } | undefined)?.types;
      log(`start y=${y()} types=${types ? [...types].join(",") : "-"}`);
      const vt = original.call(this, arg);
      vt.updateCallbackDone.then(
        () => log(`updated y=${y()}`),
        (e: unknown) => log(`update ERR ${String(e).slice(0, 60)}`),
      );
      vt.ready.then(
        () => {
          const groups = document
            .getAnimations()
            .map((a) => (a.effect as KeyframeEffect | null)?.pseudoElement ?? "")
            .filter((p) => p.includes("group(vt-"));
          log(`ready y=${y()} groups=${groups.length}`);
        },
        (e: unknown) => log(`SKIPPED ${String(e).slice(0, 70)}`),
      );
      vt.finished.then(() => log(`finished y=${y()}`));
      return vt;
    };
  return state;
}

export function VtDebug() {
  const [lines, setLines] = useState<Line[] | null>(null);
  useEffect(() => {
    if (!enabled()) return;
    const state = install();
    const id = setInterval(() => setLines([...state.lines]), 200);
    return () => clearInterval(id);
  }, []);
  if (!lines) return null;
  return (
    <pre
      aria-hidden
      style={{
        position: "fixed",
        left: 8,
        right: 8,
        top: 110,
        zIndex: 2147483647,
        margin: 0,
        padding: "6px 8px",
        font: "11px/1.35 ui-monospace, monospace",
        color: "#0f0",
        background: "rgba(0,0,0,.82)",
        pointerEvents: "none",
        whiteSpace: "pre-wrap",
      }}
    >
      {lines.map((l) => `${String(l.t).padStart(6)} ${l.text}`).join("\n")}
    </pre>
  );
}
