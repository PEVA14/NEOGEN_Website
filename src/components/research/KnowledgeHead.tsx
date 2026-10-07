import Link from "next/link";
import { ViewTransition, type ReactNode } from "react";

import { MarkField } from "@/components/brand/MarkField";
import { Mono } from "@/components/typography";
import { AreaMarks } from "@/components/ui/AreaMarks";
import { AreaTag } from "@/components/ui/AreaSignet";

import styles from "./KnowledgeHead.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface Crumb {
  label: string;
  href: string;
}

/**
 * THE TRAIL — where this page sits in Research, ending on the page itself
 * (`aria-current`, not a link). Exported for pages with a head of their own
 * (a guide). It supports the Research navigation; it does not replace it.
 */
export function Breadcrumbs({
  crumbs,
  label,
  current,
  className,
}: {
  crumbs: readonly Crumb[];
  label: string;
  current?: string;
  className?: string;
}) {
  if (crumbs.length === 0) return null;
  return (
    <nav aria-label={label} className={[styles.crumbs, className].filter(Boolean).join(" ")}>
      <ol>
        {crumbs.map((crumb) => (
          <li key={crumb.href}>
            <Link href={crumb.href} className={styles.crumb}>
              {crumb.label}
            </Link>
          </li>
        ))}
        {current ? (
          <li>
            <span className={styles.crumb} aria-current="page" data-current="">
              {current}
            </span>
          </li>
        ) : null}
      </ol>
    </nav>
  );
}

/**
 * THE HEAD OF A RESEARCH PAGE — where the reader is, what this is, and what
 * it holds.
 *
 * Every page in the knowledge system opens the same way, so moving between
 * the compendium, a record, a line and the glossary feels like turning pages
 * in one archive rather than visiting five sites. The breadcrumb is real
 * navigation (every page here is two or three levels deep), the title is the
 * page's only `h1`, and `meta` carries the counts that tell a reader how much
 * is here before they scroll — always derived, never decorative.
 */
export function KnowledgeHead({
  crumbs,
  crumbsLabel,
  eyebrow,
  title,
  titleId,
  lede,
  meta,
  aside,
  children,
  transition,
  areas,
  areaLinks,
  current,
  purpose,
  catalog,
  effects,
}: {
  crumbs: readonly Crumb[];
  crumbsLabel: string;
  eyebrow: string;
  title: string;
  titleId: string;
  lede?: string;
  /** Short mono facts under the lede — "62 registros · 74 referencias". */
  meta?: readonly string[];
  /** Right-hand column on wide screens: a search, a legend. */
  aside?: ReactNode;
  children?: ReactNode;
  /**
   * A record's names (`recordTransition.ts`): the title and the head pair with
   * the compendium row opened in place, so arriving from it reads as the same
   * record seen closer.
   */
  transition?: { title: string; frame: string };
  /**
   * A record's catalogue areas (color pass): registered beside the eyebrow,
   * and the head's closing rule takes the first — the record's context
   * colour, which its index, numbers and connections then carry.
   */
  areas?: readonly DiscoveryAreaId[];
  /**
   * The record's areas as places to go (areas identity pass): each one's
   * signet plate and name, leading to the area's products — research →
   * catalogue in one step.
   */
  areaLinks?: readonly { id: DiscoveryAreaId; label: string; href: string }[];
  /**
   * The page itself, as the breadcrumb's last step (Research architecture
   * pass): "Investigación / Compuestos / Semaglutide", the current one
   * marked `aria-current` and not a link.
   */
  current?: string;
  /**
   * What this page is, in one sentence, for a reader who arrives here first
   * — from a search engine, a shared link — without the overview.
   */
  purpose?: string;
  /**
   * The one commerce transition from Research: this compound in the
   * catalogue ("Ver en el catálogo"), set apart from the research links.
   */
  catalog?: { href: string; label: string };
  /**
   * Owner-authored Simple Effects for a record's compound, when approved
   * (`content/effects`) — under the title, before the page says what it is.
   * Editorial, not evidence: the record's own sentences follow.
   */
  effects?: ReactNode;
}) {
  const heading = (
    <h1 id={titleId} className={styles.title}>
      {title}
    </h1>
  );
  const head = (
    <header
      className={styles.head}
      data-has-aside={aside ? "true" : undefined}
      data-registered={areas && areas.length > 0 ? "true" : undefined}
    >
      {/*
       * A record's head carries the mark in its area's colour: the field the
       * record opens on is NEOGEN's. Brand layer only — far larger than any
       * figure in the record, cropped by the page, behind the title.
       */}
      {areas && areas.length > 0 ? <MarkField name="record" className={styles.field} /> : null}
      <div className={styles.main}>
        <Breadcrumbs crumbs={crumbs} label={crumbsLabel} current={current} />
        <Mono size="2xs" className={styles.eyebrow}>
          {areas && areas.length > 0 ? <AreaMarks areas={areas} /> : null}
          {eyebrow}
        </Mono>
        {transition ? (
          <ViewTransition name={transition.title} share="vt-record-title" default="none">
            {heading}
          </ViewTransition>
        ) : (
          heading
        )}
        {effects}
        {purpose ? <p className={styles.purpose}>{purpose}</p> : null}
        {lede ? <p className={styles.lede}>{lede}</p> : null}
        {meta && meta.length > 0 ? (
          <ul className={styles.meta}>
            {meta.map((item) => (
              <li key={item}>
                <Mono size="2xs">{item}</Mono>
              </li>
            ))}
          </ul>
        ) : null}
        {(areaLinks && areaLinks.length > 0) || catalog ? (
          <ul className={styles.areaLinks}>
            {areaLinks?.map((area) => (
              <li key={area.id}>
                <Mono size="2xs">
                  <AreaTag id={area.id} href={area.href} plate>
                    {area.label}
                  </AreaTag>
                </Mono>
              </li>
            ))}
            {catalog ? (
              <li className={styles.catalog}>
                <Link href={catalog.href} className={styles.catalogLink}>
                  {catalog.label} <span aria-hidden="true">→</span>
                </Link>
              </li>
            ) : null}
          </ul>
        ) : null}
        {children}
      </div>
      {aside ? <div className={styles.aside}>{aside}</div> : null}
    </header>
  );
  return transition ? (
    <ViewTransition name={transition.frame} share="vt-record-frame" default="none">
      {head}
    </ViewTransition>
  ) : (
    head
  );
}
