/**
 * Route-level loading state.
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
