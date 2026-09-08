import type { ReactNode } from "react";

import type { DOMTag } from "@/types/polymorphic";

interface VisuallyHiddenProps {
  children: ReactNode;
  as?: DOMTag;
}

/**
 * Hidden visually, available to assistive technology.
 * Use for icon-button labels and context that sighted users get from layout.
 */
export function VisuallyHidden({ children, as: Tag = "span" }: VisuallyHiddenProps) {
  return <Tag className="sr-only">{children}</Tag>;
}
