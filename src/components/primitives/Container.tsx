import type { ReactNode } from "react";

import type { DOMTag } from "@/types/polymorphic";

import { cn } from "@/lib/cn";

type ContainerWidth = "full" | "content" | "prose";

const widthClass: Record<ContainerWidth, string> = {
  full: "max-w-(--container-max)",
  content: "max-w-(--container-content)",
  prose: "max-w-(--container-prose)",
};

interface ContainerProps {
  children: ReactNode;
  /** `prose` is the reading measure for Research; `content` is the default. */
  width?: ContainerWidth;
  as?: DOMTag;
  className?: string;
}

/**
 * Horizontal measure + gutter. The gutter is a fluid token, so mobile spacing
 * is designed rather than inherited from a desktop value.
 */
export function Container({
  children,
  width = "content",
  as: Tag = "div",
  className,
}: ContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full px-(--gutter)", widthClass[width], className)}>
      {children}
    </Tag>
  );
}
