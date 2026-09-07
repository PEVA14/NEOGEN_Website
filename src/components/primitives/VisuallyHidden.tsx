import type { ElementType, ReactNode } from "react";

interface VisuallyHiddenProps {
  children: ReactNode;
  as?: ElementType;
}

/**
 * Hidden visually, available to assistive technology.
 * Use for icon-button labels and context that sighted users get from layout.
 */
export function VisuallyHidden({ children, as: Tag = "span" }: VisuallyHiddenProps) {
  return <Tag className="sr-only">{children}</Tag>;
}
