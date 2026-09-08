import type { ReactNode } from "react";

import type { DOMTag } from "@/types/polymorphic";

import type { WorldId } from "@/config/worlds";
import { cn } from "@/lib/cn";

/**
 * Quiet vs Experience — the core rhythm of the site.
 *
 *  - `quiet`  : navigation, information, specs, documentation, research
 *               reading, commerce and forms. Restrained, neutral, minimal motion.
 *  - `impact` : hero moments, flagship transitions, 3D, macro visuals and
 *               scroll-driven storytelling.
 *
 * Preferred page rhythm: Quiet → Impact → Quiet → Impact.
 */
export type SectionMode = "quiet" | "impact";

interface SectionProps {
  children: ReactNode;
  mode?: SectionMode;
  /**
   * Applies a product world to THIS SECTION ONLY.
   * Worlds transform experiential environments; they are not global UI accents,
   * so this must never be lifted onto <html> or <body>.
   */
  world?: WorldId;
  /** Opt into the world's atmospheric gradient wash. Static, not animated. */
  atmosphere?: boolean;
  /**
   * Whether this section paints a dark surface.
   *
   * Defaults to dark whenever a world is applied. Set explicitly for a dark
   * section that carries no product world — the brand hero, the footer. The
   * resulting `data-surface` is what lets the sticky header know to invert.
   */
  surface?: "paper" | "dark";
  /**
   * Set false for a section that owns its own vertical rhythm — a pinned,
   * full-viewport Experience Mode composition has no use for section padding.
   * `cn` deliberately does not tailwind-merge, so padding cannot be overridden
   * from `className`; it has to be opted out of here.
   */
  padded?: boolean;
  as?: DOMTag;
  /** Anchor target / skip-link destination. */
  id?: string;
  /** Accessible name when the section has no visible heading. */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  className?: string;
}

const modeClass: Record<SectionMode, string> = {
  quiet: "py-(--section-pad-quiet)",
  impact: "py-(--section-pad-impact)",
};

export function Section({
  children,
  mode = "quiet",
  world,
  atmosphere = false,
  surface,
  padded = true,
  as: Tag = "section",
  id,
  className,
  ...aria
}: SectionProps) {
  return (
    <Tag
      id={id}
      data-mode={mode}
      data-world={world}
      data-atmosphere={world && atmosphere ? "true" : undefined}
      data-surface={(surface ?? (world ? "dark" : "paper")) === "dark" ? "dark" : undefined}
      className={cn("relative w-full", padded && modeClass[mode], className)}
      {...aria}
    >
      {children}
    </Tag>
  );
}
