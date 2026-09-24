"use client";

import { noneSink, sanitize } from "./events";

import type { AnalyticsSink, FunnelEvent } from "./events";

/**
 * CLIENT EMITTER. Never throws, never blocks: analytics is not allowed to
 * break a click. Each event goes to the registered sink (none today) and is
 * dispatched on `window` as `neogen:analytics` for anything listening.
 */
const sink: AnalyticsSink = noneSink;

export function track(event: FunnelEvent): void {
  try {
    const clean = sanitize(event);
    if (!clean) return;
    const detail = { ...clean, at: new Date().toISOString(), currency: "MXN" as const };
    if (sink.isConfigured()) sink.send(detail);
    window.dispatchEvent(new CustomEvent("neogen:analytics", { detail }));
  } catch {
    /* swallowed on purpose */
  }
}
