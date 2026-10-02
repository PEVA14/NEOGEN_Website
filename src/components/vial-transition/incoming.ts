/**
 * "A specimen is on its way to this page."
 *
 * The card records it on click; the product page reads it to decide whether to
 * HOLD its WebGL boot until the flight has landed. That boot is ~240ms of main
 * thread (model parse, three's init, the PMREM prefilter — measured in
 * docs/V2_LIVING_LABORATORY.md, trap 8), and nothing can hide a stalled main
 * thread; it has to happen after the animation, not during it.
 *
 * Nothing here intercepts navigation. A stale mark is inert data, and a new
 * tab, cmd-click or a reload simply has no mark.
 *
 * READ, NEVER CONSUMED: StrictMode runs state initialisers twice, and a
 * destructive read comes back empty the second time (trap 2). A short time
 * window does the job a consume would.
 */
const WINDOW_MS = 2500;

/** Where the card's media stood on screen when it was clicked. */
export interface OriginRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

let pending: {
  slug: string;
  at: number;
  origin: OriginRect | null;
  specimen: OriginRect | null;
} | null = null;

/** Whether a view transition can play at all in this browser, for this user. */
export function transitionWillPlay(): boolean {
  if (typeof document === "undefined") return false;
  if (!("startViewTransition" in document)) return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * `origin` is the card's whole media box (where a world's circle opens);
 * `specimen` the vial's own box inside it, which on a flagship card is off to
 * one side (where a world's light starts — `product/formation.ts`).
 */
export function markIncoming(
  slug: string,
  origin: OriginRect | null = null,
  specimen: OriginRect | null = null,
): void {
  if (!transitionWillPlay()) return;
  pending = { slug, at: performance.now(), origin, specimen };
}

/** The box a card's element occupied on screen, if there is one. */
export function boxOf(element: Element | null | undefined): OriginRect | null {
  const r = element?.getBoundingClientRect();
  return r ? { x: r.left, y: r.top, width: r.width, height: r.height } : null;
}

/** The specimen's own box on the card it left, else the card's media box. */
export function incomingSpecimen(slug: string): OriginRect | null {
  return isIncoming(slug) ? (pending?.specimen ?? pending?.origin ?? null) : null;
}

/** The origin of a specimen arriving at this product's page, if one is. */
export function incomingOrigin(slug: string): OriginRect | null {
  return isIncoming(slug) ? (pending?.origin ?? null) : null;
}

export function isIncoming(slug: string): boolean {
  if (typeof window === "undefined" || !pending) return false;
  return pending.slug === slug && performance.now() - pending.at < WINDOW_MS;
}
