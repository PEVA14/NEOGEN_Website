import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "bg-(--accent) text-(--accent-contrast) hover:opacity-90",
  secondary:
    "border border-(--border-default) text-(--ink-primary) hover:border-(--border-strong) hover:bg-(--surface-raised)",
  ghost: "text-(--ink-primary) hover:bg-(--surface-raised)",
};

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-(--space-xs) text-sm",
  md: "h-11 px-(--space-sm) text-sm",
  lg: "h-13 px-(--space-md) text-base",
};

interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
}

/**
 * Button.
 *
 * Colour comes from `--accent`, which resolves to ink in Quiet Mode and only
 * becomes a product colour inside a `data-world` section. That is the mechanism
 * that prevents "every CTA is blue".
 *
 * The transition is INTERFACE feedback (tier 1): it is shortened under
 * reduced-motion, never removed, because it communicates state.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-(--space-2xs)",
        "rounded-(--radius-md) font-medium whitespace-nowrap",
        "transition-[background-color,border-color,opacity,color]",
        "duration-(--motion-duration-base) ease-(--ease-standard)",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
