import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Tone = "default" | "muted";

interface TextLinkProps {
  href: string;
  children: ReactNode;
  /** Trailing arrow, as used throughout the reference system. */
  arrow?: boolean;
  tone?: Tone;
  className?: string;
}

const toneClass: Record<Tone, string> = {
  default: "text-(--ink-primary)",
  muted: "text-(--ink-muted) hover:text-(--ink-primary)",
};

/**
 * The technical link — mono, uppercase, letterspaced, underlined.
 *
 * DELIBERATELY NEUTRAL. The reference set uses RETA blue for links throughout
 * Quiet Mode, but that contradicts its own rule ("Product colors ... never
 * generic UI action colors"), so interaction here is communicated with
 * typography, underline and weight instead. `#2459D3` stays inside the RETA
 * world. Colour is not the only affordance, which is also the accessible
 * choice.
 */
export function TextLink({
  href,
  children,
  arrow = true,
  tone = "default",
  className,
}: TextLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        // min-h-6 = 24px, the WCAG 2.2 minimum target size. The label is 11px
        // mono, so without it these actions measure 17px tall.
        "neogen-mono inline-flex min-h-6 items-center gap-(--space-2xs) text-2xs",
        "uppercase underline decoration-(--border-default) underline-offset-4",
        "transition-colors duration-(--motion-duration-fast) ease-(--ease-standard)",
        "hover:decoration-(--ink-primary)",
        toneClass[tone],
        className,
      )}
    >
      <span className="tracking-(--tracking-label)">{children}</span>
      {arrow ? <span aria-hidden="true">→</span> : null}
    </Link>
  );
}
