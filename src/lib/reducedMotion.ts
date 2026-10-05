/**
 * `prefers-reduced-motion`, spelled once.
 *
 * For imperative code running in the browser — an effect, a handler, a Web
 * Animation about to start — which re-reads the preference at the moment it
 * would move rather than subscribing. Components that render differently use
 * `useReducedMotion()` (`hooks/useReducedMotion`), built on the same query.
 * Anything a media query can express stays in CSS (`styles/motion.css`).
 */
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
