/**
 * Route-level loading state — for the routes rendered on demand only.
 *
 * Checkout (and the order pages, `pedido/[id]/loading.tsx`) wait on the
 * server; nothing else does. It used to sit over every `[locale]` route, where
 * every page is prerendered and it never had a real wait to cover: a full page
 * load painted it first (the footer jumping up, then the page), and a card
 * navigation that missed its prefetch committed it instead of the destination,
 * so the vial had nothing to land on (`vial-transition/README.md`, trap 5).
 *
 * Deliberately quiet: a text status, not a spinner. This is also the pattern
 * Phase 2's 3D loading state will follow — announce progress to assistive
 * technology, never rely on motion to convey that something is happening.
 */
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50dvh] items-center justify-center px-(--gutter)"
    >
      {/* Localized text is not available here (no params in loading.tsx), so the
          status is exposed structurally and announced by aria-live. */}
      <span className="neogen-mono text-xs tracking-(--tracking-label) text-(--ink-muted) uppercase">
        NEOGEN
      </span>
    </div>
  );
}
