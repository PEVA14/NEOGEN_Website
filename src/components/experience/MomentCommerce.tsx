import Link from "next/link";

import { Mono } from "@/components/typography";

import styles from "./MomentCommerce.module.css";

export interface MomentCommerceProps {
  name: string;
  /** Presentation range — "5 mg – 60 mg". */
  range: string | null;
  /** Formatted cheapest pack price, or null when none is set. */
  price: string | null;
  priceFrom: string;
  href: string;
  cta: string;
  /** False where the surrounding statement already names the product. */
  showName?: boolean;
}

/**
 * WHERE AN EXPERIENCE MOMENT RESOLVES INTO COMMERCE.
 *
 * Every world moment ends here: the product's name, its presentations, its
 * price and one action. The moment earns attention; this is what it spends it
 * on. Quiet by construction — mono data, one hairline, and an action pinned to
 * the paper/charcoal pair that no world redefines (CONVENTIONS §11), so RETA,
 * GLOW and GHK-Cu never produce a coloured button.
 */
export function MomentCommerce({
  name,
  range,
  price,
  priceFrom,
  href,
  cta,
  showName = true,
}: MomentCommerceProps) {
  return (
    <div className={styles.commerce}>
      <div className={styles.record}>
        {showName ? <span className={styles.name}>{name}</span> : null}
        {range ? (
          <Mono size="2xs" className={styles.range}>
            {range}
          </Mono>
        ) : null}
      </div>
      {price ? (
        <p className={styles.price}>
          <span className={styles.from}>{priceFrom}</span> {price}
        </p>
      ) : null}
      <Link href={href} className={styles.action}>
        {cta}
        <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
