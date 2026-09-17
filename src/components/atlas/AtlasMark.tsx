import { cn } from "@/lib/cn";

import styles from "./AtlasMark.module.css";

/**
 * THE ATLAS MARK — three nodes joined through a centre.
 *
 * Drawn in the same structural language as the hub's marks: it depicts what
 * Atlas does (your areas, connected through the compounds that bridge them),
 * not a compass rose or a brain or a sparkle. `animated` lets the joining
 * lines trace themselves in, for the generation state; reduced motion holds it
 * still.
 */
export function AtlasMark({
  className,
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn(styles.mark, className)}
      data-animated={animated ? "" : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <line data-part="link" x1="16" y1="18" x2="7" y2="25" />
      <line data-part="link" x1="16" y1="18" x2="16" y2="7" />
      <line data-part="link" x1="16" y1="18" x2="25" y2="24" />
      <circle data-part="node" cx="7" cy="25" r="2.5" />
      <circle data-part="node" cx="16" cy="7" r="2.5" />
      <circle data-part="node" cx="25" cy="24" r="2.5" />
      <circle data-part="hub" cx="16" cy="18" r="3.25" fill="currentColor" />
    </svg>
  );
}
