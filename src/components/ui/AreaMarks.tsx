import styles from "./AreaMarks.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * AREA REGISTRATION — which catalogue areas a compound is filed in, as small
 * marks in the areas' own colours (color pass, 2026-10-04).
 *
 * One square per area, in the catalogue's area order, so a compound filed in
 * two areas carries two marks side by side — never a blended or striped
 * "rainbow". `rule` draws them as short parallel rules instead, for a record's
 * edge or a header. Colour means membership and nothing else: never effect,
 * mechanism, evidence, similarity or safety (areas.css).
 *
 * Never the only carrier: the area names are always in text nearby, so the
 * marks are hidden from assistive technology unless `label` is given.
 */
export function AreaMarks({
  areas,
  variant = "square",
  label,
  className,
}: {
  areas: readonly DiscoveryAreaId[];
  variant?: "square" | "rule";
  /** An accessible name, where no text nearby names the areas. */
  label?: string;
  className?: string;
}) {
  if (areas.length === 0) return null;
  return (
    <span
      className={[styles.marks, className].filter(Boolean).join(" ")}
      data-variant={variant}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {areas.map((id) => (
        <span key={id} className={styles.mark} data-area={id} />
      ))}
    </span>
  );
}
