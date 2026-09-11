import Link from "next/link";

import { Mono } from "@/components/typography";
import { ProductCard, type ProductCardProps } from "@/components/ui/ProductCard";

import styles from "./CompoundRail.module.css";

export interface CompoundRailCopy {
  /** Accessible name for the scrollable region. */
  label: string;
  /** Mono line under the tail figure — "compuestos en catálogo". */
  tailLabel: string;
  /** The tail's action — "Ver catálogo completo". */
  tailAction: string;
}

/**
 * THE COMPOUND RAIL — breadth, shown rather than stated.
 *
 * The homepage's compound section was a three-row table of the flagships with
 * a documentation column that read "—" three times: an 85-product catalogue
 * introducing itself with three rows and a blank. The rail shows a dozen real
 * products at product scale and runs off the right edge, which is what says
 * "there are more of these" — a grid that fits its row cannot say it.
 *
 * IT IS A SCROLL REGION, NOT A CAROUSEL. No autoplay, no timers, no arrows
 * that move things for you: it is an overflowing list, focusable so a keyboard
 * can scroll it, with a visible scrollbar so the affordance is not a secret.
 * Nothing moves unless the reader moves it — CONVENTIONS §4.
 *
 * The tail card closes the rail with the catalogue's real size and a link to
 * all of it, so the section ends in an action rather than in a cut-off card.
 */
export function CompoundRail({
  items,
  total,
  href,
  copy,
}: {
  items: readonly ProductCardProps[];
  /** The catalogue's real published count. */
  total: number;
  /** Where the tail card goes. */
  href: string;
  copy: CompoundRailCopy;
}) {
  return (
    <div className={styles.wrap}>
      {/*
       * THE SCROLL REGION IS THE WRAPPER, NOT THE LIST.
       *
       * `role="group"` on the `<ul>` replaces its implicit `list` role, which
       * orphans every `<li>` inside it — axe reports it as a serious
       * `listitem` violation, and a screen reader stops announcing the rail as
       * a list of anything. The region and the list are therefore two
       * elements: this one is focusable and labelled so a keyboard can scroll
       * it, and the list inside stays a plain list.
       */}
      <div className={styles.scroller} tabIndex={0} role="group" aria-label={copy.label}>
        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.slug} className={styles.item}>
              <ProductCard {...item} />
            </li>
          ))}

          <li className={styles.tail}>
            <Link href={href} className={styles.tailLink}>
              <span className={styles.tailCount}>{total}</span>
              <Mono size="2xs" className={styles.tailLabel}>
                {copy.tailLabel}
              </Mono>
              <Mono size="2xs" className={styles.tailAction}>
                {copy.tailAction} →
              </Mono>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
