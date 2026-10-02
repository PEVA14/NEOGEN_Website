"use client";

import { useState } from "react";

import { isIncoming } from "@/components/vial-transition/incoming";

/**
 * HOW A PRODUCT PAGE WAS ARRIVED AT — the one fact every opening's formation
 * keys off, flagship or not.
 *
 *   specimen  a catalogue card sent the specimen here (the vial transition is
 *             carrying it in now): the page forms around its landing.
 *   direct    anything else — a typed URL, a reload, any other link, the back
 *             button. Nothing travelled, so nothing pretends to: the page
 *             wakes around a specimen already standing there.
 *
 * Decided once per mount. On the server, and so on a direct load's first
 * paint and its hydration, it is always `direct`, which is what lets a
 * direct arrival's formation be plain CSS that plays without JavaScript.
 */
export type Arrival = "specimen" | "direct";

export function useArrival(slug: string, enabled = true): Arrival {
  const [arrival] = useState<Arrival>(() => (enabled && isIncoming(slug) ? "specimen" : "direct"));
  return arrival;
}
