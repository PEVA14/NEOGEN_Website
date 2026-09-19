import Link from "next/link";

import { Container } from "@/components/primitives";
import { AreaIcon } from "@/components/ui";

import styles from "./ClosingShelf.module.css";

import type { WorldId } from "@/config/worlds";
import type { DiscoveryAreaId } from "@/data/discovery";

export interface DirectoryArea {
  id: DiscoveryAreaId;
  name: string;
  href: string;
  items: readonly { name: string; href: string; price: string | null; world: WorldId | null }[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * THE PAGE ENDS IN THE WHOLE CATALOGUE — as a directory.
 *
 * Owner direction (2026-09-19): fix the closing section. Ten more product
 * cards chosen by a round-robin rule read as a random handful, repeated the
 * card grid the page already shows twice, and ended a deep page flatly. The
 * close is now the catalogue at a glance: every product, filed by area in
 * its own hue and sign, A to Z, each with its entry price and one click from
 * its page. Flagships carry their world's dot. It is the store directory the
 * page has been pointing at — the proof there is far more than three products.
 *
 * On a phone each area shows its first five and a way to the rest, so the
 * directory stays a directory rather than a long scroll.
 */
export function ClosingShelf({
  copy,
  areas,
  counts,
  href,
}: {
  copy: {
    index: string;
    label: string;
    title: string;
    lede: string;
    count: string;
    more: string;
    facts: string;
    action: string;
    search: string;
  };
  areas: readonly DirectoryArea[];
  counts: { products: number; presentations: number; areas: number };
  href: string;
}) {
  const fill = (template: string, values: Record<string, string | number> = {}) =>
    template
      .replace("{products}", String(counts.products))
      .replace("{presentations}", String(counts.presentations))
      .replace("{areas}", String(counts.areas))
      .replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

  return (
    <section className={styles.closing} aria-labelledby="closing-title">
      <Container width="full">
        <header className={styles.head}>
          <p className={styles.index}>
            {copy.index} <span>/ {copy.label}</span>
          </p>
          <h2 id="closing-title" className={styles.title}>
            {copy.title}
          </h2>
          <p className={styles.lede}>{fill(copy.lede)}</p>
        </header>

        <div className={styles.directory}>
          {areas.map((area) => (
            <section
              key={area.id}
              className={styles.area}
              data-area={area.id}
              aria-labelledby={`dir-${area.id}`}
            >
              <h3 id={`dir-${area.id}`} className={styles.areaHead}>
                <Link prefetch={false} href={area.href} className={styles.areaLink}>
                  <AreaIcon id={area.id} className={styles.areaIcon} />
                  <span className={styles.areaName}>{area.name}</span>
                  <span className={styles.areaCount}>
                    <span aria-hidden="true">{pad(area.items.length)}</span>
                    <span className={styles.srOnly}>
                      {fill(copy.count, { n: area.items.length })}
                    </span>
                  </span>
                </Link>
              </h3>
              <ul className={styles.items}>
                {area.items.map((item) => (
                  <li key={item.href} className={styles.item}>
                    <Link prefetch={false} href={item.href} className={styles.product}>
                      <span className={styles.productName}>
                        {item.world ? (
                          <span
                            className={styles.worldDot}
                            data-world-tint={item.world}
                            aria-hidden="true"
                          />
                        ) : null}
                        {item.name}
                      </span>
                      {item.price ? (
                        <span className={styles.productPrice}>{item.price}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
              {area.items.length > 5 ? (
                <Link prefetch={false} href={area.href} className={styles.more}>
                  {fill(copy.more, { n: area.items.length, area: area.name })}{" "}
                  <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </section>
          ))}
        </div>

        <div className={styles.bar}>
          <p className={styles.facts}>{fill(copy.facts)}</p>
          <div className={styles.actions}>
            <search className={styles.searchWrap}>
              <form action={href} method="get" className={styles.search}>
                <label htmlFor="closing-search" className={styles.srOnly}>
                  {copy.search}
                </label>
                <input
                  id="closing-search"
                  name="q"
                  type="search"
                  autoComplete="off"
                  placeholder={copy.search}
                  className={styles.searchInput}
                />
              </form>
            </search>
            <Link prefetch={false} href={href} className={styles.action}>
              {copy.action} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
