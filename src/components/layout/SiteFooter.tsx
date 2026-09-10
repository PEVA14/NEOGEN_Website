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
 * WHAT IS DELIBERATELY ABSENT, AND WHY IT IS ABSENT RATHER THAN PENDING.
 * ---------------------------------------------------------------------
 * The reference footer lists a service area ("GUADALAJARA · DURANGO ·
 * NACIONAL") and a legal column. Both are unverified business facts —
 * `siteConfig.tbd.sameDayDeliveryCities`, `nationalCourier` and the legal
 * documents that have not been written — so stating them would be the
 * fabrication CONVENTIONS §8 forbids.
 *
 * They used to render as "Zona de servicio: Por definir" and a Legal column
 * containing the words "Por definir". That is worse than either alternative:
 * it puts an internal to-do in front of a customer on all 176 pages, and a
 * footer heading with no links under it reads as a broken build, not as
 * candour. A field nobody can act on is removed; when the values are
 * confirmed, the field returns with them.
 *
 * SERVICE AREA HAS NOW RETURNED, because it was confirmed: national. The Legal
 * column has not, because Terms, Privacy and returns still do not exist.
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

            {/*
             * Now that fulfilment is confirmed, these are facts rather than
             * pending fields. Service area is stated because "do you ship to
             * me" is the first question a browsing customer has; rates and
             * estimates are NOT here, because a rate model has not been chosen
             * and an estimate is a promise that belongs next to an order.
             */}
            <Mono size="2xs" className={styles.pending}>
              {dict.footer.serviceArea}: {dict.footer.national}
            </Mono>
            <Mono size="2xs" className={styles.pending}>
              {dict.footer.contact}:{" "}
              <a href={`tel:${siteConfig.contact.phone}`} className={styles.link}>
                {siteConfig.contact.phoneDisplay}
              </a>
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
