import Link from "next/link";
import type { ReactNode } from "react";

import { Mono } from "@/components/typography";

import styles from "./KnowledgeHead.module.css";

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
}) {
  return (
    <header className={styles.head} data-has-aside={aside ? "true" : undefined}>
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
          {eyebrow}
        </Mono>
        <h1 id={titleId} className={styles.title}>
          {title}
        </h1>
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
}
