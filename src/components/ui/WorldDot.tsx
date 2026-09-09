import type { WorldId } from "@/config/worlds";
import { cn } from "@/lib/cn";

interface WorldDotProps {
  /** Loads the world's palette variables onto this element only. */
  world: WorldId;
  /** Short world character label — "PRECISION", "LUMINOUS", "MATERIAL". */
  children: string;
  className?: string;
}

/**
 * The one place a product colour is allowed into Quiet Mode.
 *
 * SYSTEM STATUS V1 draws the line precisely: "Product identity in IMAGE AREA.
 * Below image: neutral Quiet Mode" and "Product colors ... never generic UI
 * action colors". A small identifier is identity, not an action — so the dot
 * carries the world's accent while the card's title, metadata and CTA stay
 * neutral.
 *
 * Uses `data-world-tint`, NOT `data-world`: the tint scope loads the palette
 * variables without inverting surface and ink, so the dot cannot repaint the
 * card it sits in (CONVENTIONS §3).
 *
 * THE DOT IS COLOURED; THE LABEL IS NOT.
 * --------------------------------------
 * Setting the label in the world's accent failed AA badly on paper — GLOW's
 * amber at 2.87:1 and GHK-Cu's copper at 3.98:1, as 11px text. Only RETA's blue
 * passed, which is the tell that the colour was never carrying the label's
 * legibility in the first place.
 *
 * So identity moves entirely to the dot, which is decorative and redundant with
 * the word beside it, and the word is set in ordinary ink. This is also a
 * cleaner reading of SYSTEM STATUS V1 than the original: product colour marks
 * identity, it does not set type.
 */
export function WorldDot({ world, children, className }: WorldDotProps) {
  return (
    <span
      data-world-tint={world}
      className={cn(
        "inline-flex items-center gap-(--space-2xs)",
        "neogen-mono text-2xs tracking-(--tracking-label) text-(--ink-secondary) uppercase",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="inline-block size-1.5 rounded-(--radius-pill) bg-(--world-accent)"
      />
      {children}
    </span>
  );
}
