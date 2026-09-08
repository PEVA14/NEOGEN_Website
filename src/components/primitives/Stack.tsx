import type { ReactNode } from "react";

import type { DOMTag } from "@/types/polymorphic";

import { cn } from "@/lib/cn";

type Gap = "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const gapClass: Record<Gap, string> = {
  "3xs": "gap-(--space-3xs)",
  "2xs": "gap-(--space-2xs)",
  xs: "gap-(--space-xs)",
  sm: "gap-(--space-sm)",
  md: "gap-(--space-md)",
  lg: "gap-(--space-lg)",
  xl: "gap-(--space-xl)",
  "2xl": "gap-(--space-2xl)",
};

interface StackProps {
  children: ReactNode;
  gap?: Gap;
  direction?: "vertical" | "horizontal";
  as?: DOMTag;
  className?: string;
}

/** One-dimensional flow with token-driven spacing. */
export function Stack({
  children,
  gap = "md",
  direction = "vertical",
  as: Tag = "div",
  className,
}: StackProps) {
  return (
    <Tag
      className={cn(
        "flex",
        direction === "vertical" ? "flex-col" : "flex-row items-center",
        gapClass[gap],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
