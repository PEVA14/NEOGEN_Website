"use client";

import Link from "next/link";
import { useState } from "react";

import { formatPrice } from "@/data/commerce/format";

import styles from "./CatalogTicker.module.css";

import type { DiscoveryAreaId } from "@/data/discovery/types";

export interface CatalogTickerItem {
  slug: string;
  name: string;
  href: string;
  areaId: DiscoveryAreaId | null;
  range: string;
  amount: number | null;
}

export interface CatalogTickerCopy {
  /** Accessible name of the band — "El catálogo completo". */
  label: string;
  /** "Desde". */
  from: string;
  pause: string;
  play: string;
}

/**
 * THE CATALOGUE TICKER — the whole register passing under the hero.
 *
 * One thin mono line of every published product: an area swatch, the name,
 * its strength range and its entry price. It is the first thing after the
 * Impact beat, and it answers the question the hero leaves open — "what do
 * they actually sell?" — without a heading, by showing all of it.
 *
 * THE MOTION COMMUNICATES BREADTH, and nothing else: 85 products do not fit a
 * screen, so the line moves slowly enough to read (about 40px a second).
 *
 * WCAG 2.2.2. Anything that moves for more than five seconds needs a way to
 * stop it. The line pauses while a pointer rests on it or focus is inside it,
 * and a visible control stops it outright. Under reduced motion it never moves
 * at all and becomes a scrollable row.
 *
 * The line is rendered twice for a seamless loop; the second copy is `inert`
 * and hidden from assistive technology, so the register is announced once and
 * tabbed through once.
 */
export function CatalogTicker({
  items,
  copy,
  localeTag,
}: {
  items: readonly CatalogTickerItem[];
  copy: CatalogTickerCopy;
  localeTag: string;
}) {
  const [paused, setPaused] = useState(false);
  if (items.length === 0) return null;

  const line = (hidden: boolean) => (
    <ul className={styles.line} aria-hidden={hidden || undefined} inert={hidden || undefined}>
      {items.map((item) => (
        <li key={item.slug} data-area={item.areaId ?? undefined} className={styles.item}>
          <Link href={item.href} className={styles.link} tabIndex={hidden ? -1 : undefined}>
            <span className={styles.swatch} aria-hidden="true" />
            <span className={styles.name}>{item.name}</span>
            <span className={styles.range}>{item.range}</span>
            {item.amount !== null ? (
              <span className={styles.price}>
                <span className={styles.from}>{copy.from}</span>{" "}
                {formatPrice({ amount: item.amount, currency: "MXN" }, localeTag)}
              </span>
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <section className={styles.ticker} aria-label={copy.label} data-paused={paused || undefined}>
      <div
        className={styles.viewport}
        style={{ "--ticker-duration": `${items.length * 6.5}s` } as React.CSSProperties}
      >
        <div className={styles.track}>
          {line(false)}
          {line(true)}
        </div>
      </div>
      <button
        type="button"
        className={styles.control}
        aria-pressed={paused}
        aria-label={paused ? copy.play : copy.pause}
        onClick={() => setPaused((value) => !value)}
      >
        <span aria-hidden="true" data-icon={paused ? "play" : "pause"} />
      </button>
    </section>
  );
}
