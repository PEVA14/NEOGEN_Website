import "server-only";

import { noneSink, sanitize } from "./events";

import type { AnalyticsSink, FunnelEvent } from "./events";

/**
 * SERVER EMITTER — for the funnel steps only the server can see reliably:
 * checkout progress (form posts that work without JavaScript), the payment
 * attempt, and the purchase, which is recorded when the PROVIDER confirms
 * payment rather than when a confirmation page happens to load.
 *
 * TODO(owner): choose an analytics product; register its server sink here.
 */
const sink: AnalyticsSink = noneSink;

export function trackServer(event: FunnelEvent): void {
  try {
    const clean = sanitize(event);
    if (!clean || !sink.isConfigured()) return;
    sink.send({ ...clean, at: new Date().toISOString(), currency: "MXN" });
  } catch {
    /* never fails a request */
  }
}
