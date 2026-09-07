import Link from "next/link";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Container } from "@/components/primitives";
import { primaryNav, routes } from "@/config/routes";
import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import type { Dictionary } from "@/i18n/types";

interface SiteHeaderProps {
  locale: Locale;
  dict: Dictionary;
}

/**
 * Global navigation — Quiet Mode.
 *
 * A Server Component: it reads the dictionary directly and ships no JavaScript
 * except the language switcher island.
 *
 * TODO(nav-phase): the mobile disclosure menu and cart affordance are
 * deliberately not built in Phase 1. The header is a structural landmark here,
 * not the finished navigation.
 */
export function SiteHeader({ locale, dict }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-(--z-header) border-b border-(--border-subtle) bg-(--surface-base)/85 backdrop-blur-sm">
      <Container width="full">
        <div className="flex h-16 items-center justify-between gap-(--space-md)">
          <Link
            href={localizePath(routes.home, locale)}
            className="neogen-display text-xl tracking-(--tracking-tight)"
          >
            {dict.meta.siteName}
          </Link>

          <nav aria-label={dict.a11y.mainNavigation}>
            <ul className="flex items-center gap-(--space-md)">
              {primaryNav.map((item) => (
                <li key={item.key}>
                  <Link
                    href={localizePath(item.href, locale)}
                    className="text-sm text-(--ink-secondary) transition-colors duration-(--motion-duration-fast) ease-(--ease-standard) hover:text-(--ink-primary)"
                  >
                    {dict.nav[item.key]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <LanguageSwitcher currentLocale={locale} label={dict.a11y.languageSwitcher} />
        </div>
      </Container>
    </header>
  );
}
