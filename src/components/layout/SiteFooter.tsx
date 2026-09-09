import Link from "next/link";

import { Container } from "@/components/primitives";
import { Body, Mono } from "@/components/typography";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import type { Dictionary } from "@/i18n/types";

import styles from "./SiteFooter.module.css";

interface SiteFooterProps {
  locale: Locale;
  dict: Dictionary;
}

/**
 * Global footer — Quiet Mode, inverted surface.
 *
 * Follows the reference structure: oversized wordmark, italic tagline, a 1px
 * rule, then a five-column link grid, then a legal bar.
 *
 * WHAT IS DELIBERATELY ABSENT: the reference footer lists a service area
 * ("GUADALAJARA · DURANGO · NACIONAL") and links for cold shipping and
 * preservation protocols. Those are unverified business facts —
 * `siteConfig.tbd.sameDayDeliveryCities` and `nationalCourier` are explicitly
 * `null` — so presenting them as fact would be exactly the fabrication
 * CONVENTIONS §8 forbids. The column renders a neutral pending note instead,
 * and the real values drop in when they are confirmed.
 */
export function SiteFooter({ locale, dict }: SiteFooterProps) {
  const columns = [
    {
      heading: dict.footer.columns.products,
      links: [
        { label: dict.nav.products, href: routes.products },
        { label: dict.footer.links.allCompounds, href: routes.products },
      ],
    },
    {
      heading: dict.footer.columns.research,
      links: [
        { label: dict.nav.research, href: routes.research },
        { label: dict.footer.links.documentation, href: routes.research },
      ],
    },
    {
      heading: dict.footer.columns.help,
      // SYSTEM STATUS V1: BAG, not Cart. The header, the page title and this
      // link have to agree; only the ROUTE stays /carrito.
      links: [{ label: dict.cart.title, href: routes.cart }],
    },
  ];

  return (
    <footer data-surface="dark" className={styles.footer}>
      <Container width="full">
        <div className={styles.brand}>
          <span className={styles.wordmark}>{dict.meta.siteName}_</span>
          <Body size="lg" className={styles.tagline}>
            {dict.footer.tagline}
          </Body>
        </div>

        <div className={styles.rule} />

        <div className={styles.columns}>
          <div className={styles.column}>
            <Mono size="2xs" className={styles.heading}>
              {dict.meta.siteName}
            </Mono>
            <Body size="sm" className={styles.about}>
              {dict.footer.about}
            </Body>
            {/* Service area is an unverified business fact — see the note above. */}
            <Mono size="2xs" className={styles.pending}>
              {dict.footer.serviceArea}: {dict.status.tbd}
            </Mono>
          </div>

          {columns.map((column) => (
            <nav key={column.heading} className={styles.column} aria-label={column.heading}>
              <Mono size="2xs" className={styles.heading}>
                {column.heading}
              </Mono>
              <ul className={styles.links}>
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link href={localizePath(link.href, locale)} className={styles.link}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className={styles.column}>
            <Mono size="2xs" className={styles.heading}>
              {dict.footer.columns.legal}
            </Mono>
            {/* No Terms, Privacy or compliance pages exist. Listing them would
                imply legal documents that have not been written or reviewed. */}
            <Mono size="2xs" className={styles.pending}>
              {dict.status.tbd}
            </Mono>
          </div>
        </div>

        <div className={styles.rule} />

        <div className={styles.legal}>
          <Mono size="2xs" className={styles.pending}>
            © {new Date().getFullYear()} {dict.meta.siteName}
          </Mono>
          <Mono size="2xs" className={styles.pending}>
            {siteConfig.market.country} · {siteConfig.market.currency}
          </Mono>
        </div>
      </Container>
    </footer>
  );
}
