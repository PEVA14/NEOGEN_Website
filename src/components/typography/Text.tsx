import type { AriaAttributes, ReactNode } from "react";

import type { DOMTag } from "@/types/polymorphic";

import { cn } from "@/lib/cn";

type Size = "2xs" | "xs" | "sm" | "base" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl";
type Tone = "primary" | "secondary" | "muted" | "accent";

const sizeClass: Record<Size, string> = {
  "2xs": "text-2xs",
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
  "6xl": "text-6xl",
};

const toneClass: Record<Tone, string> = {
  primary: "text-(--ink-primary)",
  secondary: "text-(--ink-secondary)",
  muted: "text-(--ink-muted)",
  accent: "text-(--accent)",
};

/**
 * ARIA passes through; everything else does not.
 *
 * These primitives used to accept exactly `children/size/tone/as/id/className`
 * and render only `id` and `className`. Anything else was accepted at the call
 * site and then silently dropped on the way to the DOM — which cost three real
 * accessibility features:
 *
 *   - the catalogue's result count carried `aria-live="polite"` and was never
 *     announced, so filtering changed the page silently;
 *   - two decorative index numerals carried `aria-hidden="true"` and were read
 *     out as content.
 *
 * ARIA is forwarded because it is the one class of attribute a text primitive
 * genuinely needs and can never express through `size`/`tone`. The prop list
 * stays otherwise closed: these are typographic primitives, not `div`s, and
 * opening them to arbitrary DOM props is how a design system stops being one.
 */
interface BaseProps extends AriaAttributes {
  children: ReactNode;
  size?: Size;
  tone?: Tone;
  as?: DOMTag;
  id?: string;
  className?: string;
  /** Only where the element's implicit role is wrong — e.g. `role="status"`. */
  role?: string;
}

/**
 * Display — Experience Mode voice. Uses Instrument Sans' variable WIDTH axis
 * (font-stretch) for the condensed treatment rather than a second font file.
 */
export function Display({
  children,
  size = "5xl",
  tone = "primary",
  as: Tag = "h1",
  id,
  className,
  ...aria
}: BaseProps) {
  return (
    <Tag
      id={id}
      className={cn("neogen-display", sizeClass[size], toneClass[tone], className)}
      {...aria}
    >
      {children}
    </Tag>
  );
}

/**
 * Heading — Quiet Mode voice.
 *
 * `level` sets the semantic tag; `size` sets the visual scale. They are
 * separate on purpose so heading order stays correct for screen readers even
 * when the design calls for a different visual weight.
 */
export function Heading({
  children,
  level = 2,
  size = "2xl",
  tone = "primary",
  id,
  className,
  ...aria
}: Omit<BaseProps, "as"> & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const Tag = `h${level}` as DOMTag;
  return (
    <Tag
      id={id}
      className={cn("neogen-heading", sizeClass[size], toneClass[tone], className)}
      {...aria}
    >
      {children}
    </Tag>
  );
}

export function Body({
  children,
  size = "base",
  tone = "secondary",
  as: Tag = "p",
  id,
  className,
  ...aria
}: BaseProps) {
  return (
    <Tag
      id={id}
      className={cn("neogen-body", sizeClass[size], toneClass[tone], className)}
      {...aria}
    >
      {children}
    </Tag>
  );
}

/** Technical register — specs, lot numbers, COA fields, annotations, data. */
export function Mono({
  children,
  size = "sm",
  tone = "secondary",
  as: Tag = "span",
  id,
  className,
  ...aria
}: BaseProps) {
  return (
    <Tag
      id={id}
      className={cn("neogen-mono", sizeClass[size], toneClass[tone], className)}
      {...aria}
    >
      {children}
    </Tag>
  );
}

/** Small capitalised label above a heading. */
export function Eyebrow({
  children,
  as: Tag = "p",
  id,
  className,
  ...aria
}: Omit<BaseProps, "size">) {
  return (
    <Tag id={id} className={cn("neogen-eyebrow", className)} {...aria}>
      {children}
    </Tag>
  );
}

/** Long-form editorial wrapper for the Research Hub. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("neogen-prose", className)}>{children}</div>;
}
