import Link from "next/link";

import { AreaIcon } from "./AreaIcon";
import styles from "./AreaSignet.module.css";

import type { ReactNode } from "react";

import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * THE AREA SIGNET — an area's own symbol (`AreaIcon`, never redrawn) at the
 * scale of an identity rather than an icon (areas identity pass, 2026-10-05).
 *
 * The eight areas are sub-identities of NEOGEN: each is its symbol and its
 * colour (`areas.css`), always together, always with its name in text nearby.
 * The signet carries its own `data-area`, so it resolves its colours wherever
 * it is placed — on a product card, in a record's head, beside a filter.
 *
 *   tone="line"   the symbol alone, in `--area-mark`
 *   tone="plate"  on the area's wash, framed by its hairline, under a rule in
 *                 its mark colour — the registration plate
 *   tone="deep"   on the area's inverted ground, for dark compositions
 *
 *   size          xs (inline, 1.1em) · sm 2rem · md 3rem · lg ~7rem · xl ~16rem
 *
 * At display sizes the stroke is held at a drawn weight instead of growing
 * with the symbol, so a 16rem signet is the same line, not a heavier one.
 * Decorative: `aria-hidden`; the name beside it is the information.
 */
export function AreaSignet({
  id,
  size = "md",
  tone = "plate",
  enter = false,
  className,
}: {
  id: DiscoveryAreaId;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  tone?: "line" | "plate" | "deep";
  /** Arrives when it appears — a signet that comes with a choice. */
  enter?: boolean;
  className?: string;
}) {
  return (
    <span
      className={[styles.signet, className].filter(Boolean).join(" ")}
      data-area={id}
      data-size={size}
      data-tone={tone}
      data-enter={enter ? "" : undefined}
      aria-hidden="true"
    >
      <AreaIcon id={id} className={styles.symbol} />
    </span>
  );
}

/**
 * AN AREA TAG — symbol and name, in the area's text colour: the compact form
 * of membership, for a card's eyebrow, a product's identity line, a filter
 * chip. A link when it leads somewhere (the area's page).
 */
export function AreaTag({
  id,
  children,
  href,
  plate = false,
  className,
}: {
  id: DiscoveryAreaId;
  children: ReactNode;
  href?: string;
  /** The signet on its registration plate (2rem) — a page's identity line. */
  plate?: boolean;
  className?: string;
}) {
  const content = (
    <>
      <AreaSignet id={id} size={plate ? "sm" : "xs"} tone={plate ? "plate" : "line"} />
      <span className={styles.tagLabel}>{children}</span>
      {href ? (
        <span className={styles.tagGo} aria-hidden="true">
          →
        </span>
      ) : null}
    </>
  );
  const className_ = [styles.tag, className].filter(Boolean).join(" ");
  const plated = plate ? "true" : undefined;
  return href ? (
    <Link href={href} className={className_} data-area={id} data-plate={plated} data-symbol-host="">
      {content}
    </Link>
  ) : (
    <span className={className_} data-area={id} data-plate={plated}>
      {content}
    </span>
  );
}

export interface AreaScopeLink {
  href: string;
  label: string;
}

/**
 * AN AREA SCOPE — what a list becomes when the reader narrows it to one area:
 * not a filter quietly applied, but the area arriving. Its signet, its name,
 * how much is here, and the way across the ecosystem — from the catalogue to
 * the area's research, from the research to its products.
 *
 * A Level-2 field (CONVENTIONS §4b): the area's wash under a rule in its mark
 * colour, charcoal text. Several areas at once are several scopes' marks side
 * by side (`signets`), never a blend.
 */
export function AreaScope({
  areas,
  name,
  detail,
  links = [],
  className,
}: {
  /** One area: the scope takes its colour. Several: their signets, no colour. */
  areas: readonly DiscoveryAreaId[];
  name: string;
  detail?: string;
  links?: readonly AreaScopeLink[];
  className?: string;
}) {
  if (areas.length === 0) return null;
  const single = areas.length === 1;
  return (
    <div
      className={[styles.scope, className].filter(Boolean).join(" ")}
      data-area={single ? areas[0] : undefined}
      data-single={single ? "true" : undefined}
      data-symbol-host=""
    >
      <span className={styles.scopeSignets}>
        {areas.map((id) => (
          <AreaSignet key={id} id={id} size={single ? "lg" : "md"} tone="plate" enter />
        ))}
      </span>
      <span className={styles.scopeText}>
        <span className={styles.scopeName}>{name}</span>
        {detail ? <span className={styles.scopeDetail}>{detail}</span> : null}
      </span>
      {links.length > 0 ? (
        <span className={styles.scopeLinks}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={styles.scopeLink}>
              {link.label} <span aria-hidden="true">→</span>
            </Link>
          ))}
        </span>
      ) : null}
    </div>
  );
}
