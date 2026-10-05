import Link from "next/link";
import { ViewTransition, type ReactNode } from "react";

import { Mono } from "@/components/typography";
import { AreaMarks } from "@/components/ui/AreaMarks";

import styles from "./KnowledgeHead.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface Crumb {
  label: string;
  href: string;
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
      <div className={styles.main}>
        {crumbs.length > 0 ? (
          <nav aria-label={crumbsLabel} className={styles.crumbs}>
            <ol>
              {crumbs.map((crumb) => (
                <li key={crumb.href}>
                  <Link href={crumb.href} className={styles.crumb}>
                    {crumb.label}
                  </Link>
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
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
