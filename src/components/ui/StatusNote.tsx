import { Mono } from "@/components/typography";
import { cn } from "@/lib/cn";

export type StatusKind = "pending" | "unavailable" | "tbd";

interface StatusNoteProps {
  /**
   * Localized label, passed in by a Server Component that has the dictionary.
   * Typically `dict.status.pending` / `.notAvailable` / `.tbd`.
   */
  label: string;
  kind?: StatusKind;
  /** Optional longer explanation, e.g. `dict.status.placeholderNotice`. */
  description?: string;
  className?: string;
}

/**
 * The neutral verification state.
 *
 * NEOGEN must never present unverified business or scientific data as fact.
 * When a `Verifiable<T>` is not `verified`, the UI renders THIS instead of a
 * value — deliberately neutral, carrying no colour of approval, warning or
 * error. It reads as "not established yet", not as "problem".
 *
 * Final business copy is NOT decided here; the label always arrives from the
 * dictionary so wording can change without touching components.
 */
export function StatusNote({ label, kind = "pending", description, className }: StatusNoteProps) {
  return (
    <span
      data-status={kind}
      className={cn(
        "inline-flex items-center gap-(--space-2xs)",
        "border border-dashed border-(--status-pending-border)",
        "bg-(--status-pending-surface) text-(--status-pending-ink)",
        "rounded-(--radius-sm) px-(--space-2xs) py-(--space-3xs)",
        className,
      )}
      title={description}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current opacity-50" />
      <Mono size="2xs" tone="secondary">
        {label}
      </Mono>
      {description ? <span className="sr-only">{description}</span> : null}
    </span>
  );
}
