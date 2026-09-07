import { cn } from "@/lib/cn";

interface SkipLinkProps {
  /** Localized label — passed in, so this component stays locale-independent. */
  label: string;
  targetId?: string;
}

/**
 * First focusable element on every page. Visually hidden until focused.
 * Its transition is interface feedback (tier 1) and survives reduced-motion.
 */
export function SkipLink({ label, targetId = "main-content" }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus-visible:not-sr-only",
        "focus-visible:fixed focus-visible:top-(--space-sm) focus-visible:left-(--space-sm)",
        "focus-visible:z-(--z-skip-link)",
        "focus-visible:bg-(--surface-inverse) focus-visible:text-(--ink-inverse)",
        "focus-visible:rounded-(--radius-md) focus-visible:px-(--space-sm) focus-visible:py-(--space-2xs)",
        "focus-visible:text-sm focus-visible:font-medium",
      )}
    >
      {label}
    </a>
  );
}
