import type { ElementType, ReactNode } from "react";

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
  as?: ElementType;
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
      className={cn("relative w-full", modeClass[mode], className)}
      {...aria}
    >
      {children}
    </Tag>
  );
}
