import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface GridProps {
  children: ReactNode;
  className?: string;
}

/**
 * The disciplined editorial grid: 4 columns on mobile, 8 on tablet, 12 on
 * desktop. Column spans are expressed in CSS by the consumer — there is no
 * JavaScript viewport logic anywhere in the layout system.
 */
export function Grid({ children, className }: GridProps) {
  return (
    <div
      className={cn("grid grid-cols-4 gap-(--gutter) md:grid-cols-8 lg:grid-cols-12", className)}
    >
      {children}
    </div>
  );
}
