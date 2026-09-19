import Link from "next/link";

import { Container } from "@/components/primitives";
import { ProductCard } from "@/components/ui";

import styles from "./ClosingShelf.module.css";

import type { HomeProduct } from "@/server/home";

/**
 * THE PAGE ENDS IN THE STORE.
 *
 * After the last world, the collection once more: ten products that walk the
 * eight areas one at a time by entry price (none of them shown above), then
 * the whole catalogue as the page's final, largest action.
 *
 * On a phone the shelf is the catalogue's own two-up grid, cut to six so the
 * final action stays close.
 */
export function ClosingShelf({
  copy,
  items,
  areaLabels,
  counts,
  href,
}: {
  copy: {
    index: string;
    label: string;
    title: string;
    lede: string;
    allTitle: string;
    allBody: string;
    action: string;
    from: string;
    cta: string;
  };
  items: readonly HomeProduct[];
  areaLabels: Partial<Record<string, string>>;
  counts: { products: number; presentations: number };
  href: string;
}) {
  const fill = (t: string) =>
    t
      .replace("{products}", String(counts.products))
      .replace("{presentations}", String(counts.presentations))
      .replace("{n}", String(counts.products));

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
          <p className={styles.lede}>{copy.lede}</p>
        </header>

        {items.length > 0 ? (
          <ul className={styles.grid}>
            {items.map((item) => (
              <li key={item.slug} className={styles.item}>
                <ProductCard
                  slug={item.slug}
                  world={item.world}
                  areaId={item.areaId}
                  eyebrow={item.areaId ? areaLabels[item.areaId] : undefined}
                  name={item.name}
                  href={item.href}
                  price={item.price}
                  priceFrom={copy.from}
                  presentationRange={item.range}
                  presentations={item.presentations}
                  ctaLabel={copy.cta}
                  variant="store"
                />
              </li>
            ))}
          </ul>
        ) : null}

        <Link href={href} className={styles.all}>
          <span className={styles.allTitle}>{copy.allTitle}</span>
          <span className={styles.allBody}>{fill(copy.allBody)}</span>
          <span className={styles.allAction}>
            {fill(copy.action)} <span aria-hidden="true">→</span>
          </span>
        </Link>
      </Container>
    </section>
  );
}
