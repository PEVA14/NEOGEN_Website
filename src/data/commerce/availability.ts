import type { Availability } from "./types";

/**
 * AVAILABILITY — owner-maintained, not generated.
 *
 * There is no inventory system. Stock is judged against what the supplier can
 * currently provide, which is a person's knowledge rather than a feed, so this
 * file is edited by hand and deliberately kept separate from
 * `prices.generated.ts` — that one is overwritten every time the importer
 * runs, and a hand-written value in it would be silently destroyed.
 *
 * KEYED BY VARIANT, not by product. A 5 mg pack being available says nothing
 * about the 60 mg pack.
 *
 * ABSENT MEANS NOT DETERMINED, and is the state of every variant today. An
 * absent entry renders no availability line at all — the honest reading, since
 * we cannot claim stock we have not checked. It does NOT mean "out of stock",
 * which is a claim of its own.
 *
 *   "reta-5mg": "in-stock",
 *   "reta-60mg": "made-to-order",
 *   "semaglutide-30mg": "unavailable",
 */
export const AVAILABILITY: Readonly<Record<string, Availability>> = {};
