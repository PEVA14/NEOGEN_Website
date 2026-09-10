import Link from "next/link";

import { BagIndicator } from "@/components/layout/BagIndicator";
import { HeaderSurfaceSync } from "@/components/layout/HeaderSurfaceSync";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Container } from "@/components/primitives";
import { primaryNav, routes } from "@/config/routes";
import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import type { Dictionary } from "@/i18n/types";

import styles from "./SiteHeader.module.css";

interface SiteHeaderProps {
  locale: Locale;
  dict: Dictionary;
}

/**
 * Global navigation — Quiet Mode.
 *
 * A Server Component: it reads the dictionary directly and ships no JavaScript
 * beyond the language switcher and the surface-sync island.
 *
 * MOBILE IS RECOMPOSED, NOT COLLAPSED. The links wrap onto their own row below
 * the wordmark rather than disappearing behind a hamburger — with two primary
 * destinations, a disclosure menu would hide the whole site behind a tap for no
 * benefit. Every destination stays reachable without JavaScript.
 *
 * Active and hover states are communicated with WEIGHT and UNDERLINE, never
 * with colour. The reference set paints the active item in RETA blue, but that
 * would make a product world into NEOGEN's generic UI accent — and colour alone
 * is a weak affordance regardless.
 *
 * `About NEOGEN` is routed in `config/routes.ts` but deliberately absent from
 * the nav until the page exists — a link to a 404 is worse than no link.
 */
export function SiteHeader({ locale, dict }: SiteHeaderProps) {
  return (
    <header id="site-header" data-surface="light" className={styles.header}>
      <HeaderSurfaceSync />

      <Container width="full">
        <div className={styles.inner}>
          <Link
            href={localizePath(routes.home, locale)}
            className={`neogen-display text-xl tracking-(--tracking-tight) ${styles.wordmark}`}
          >
            <span aria-hidden="true" className={styles.wordmarkDot} />
            {dict.meta.siteName}
          </Link>

          <nav aria-label={dict.a11y.mainNavigation} className={styles.nav}>
            <ul className={styles.navList}>
              {primaryNav.map((item) => (
                <li key={item.key}>
                  <Link href={localizePath(item.href, locale)} className={styles.navLink}>
                    {dict.nav[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <LanguageSwitcher currentLocale={locale} label={dict.a11y.languageSwitcher} />

            {/*
             * `[ BAG: N ]` — the reference system's bag affordance, now live.
             *
             * A one-element client island (`BagIndicator`) reads the bag store
             * directly, so the count moves the moment something is added. The
             * rest of the header stays a server component.
             */}
            <BagIndicator
              href={localizePath(routes.cart, locale)}
              label={dict.nav.bag}
              ariaLabel={dict.nav.bag}
              className={styles.bag}
            />
          </div>
        </div>
      </Container>
    </header>
  );
}
