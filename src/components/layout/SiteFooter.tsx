import Link from "next/link";

import { Container } from "@/components/primitives";
import { Body, Mono } from "@/components/typography";
import { primaryNav, routes } from "@/config/routes";
import type { Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";
import type { Dictionary } from "@/i18n/types";

interface SiteFooterProps {
  locale: Locale;
  dict: Dictionary;
}

/**
 * Global footer — Quiet Mode.
 *
 * TODO(pre-launch): legal, regulatory, contact and shipping links are absent
 * because none of that information has been established. Nothing is invented
 * here to fill the space.
 */
export function SiteFooter({ locale, dict }: SiteFooterProps) {
  return (
    <footer className="mt-auto border-t border-(--border-subtle) bg-(--surface-raised)">
      <Container width="full">
        <div className="flex flex-col gap-(--space-lg) py-(--space-xl) md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-(--space-2xs)">
            <span className="neogen-display text-2xl">{dict.meta.siteName}</span>
            <Mono size="2xs" tone="muted">
              {dict.meta.tagline}
            </Mono>
          </div>

          <nav aria-label={dict.a11y.footerNavigation}>
            <ul className="flex flex-col gap-(--space-2xs) md:items-end">
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
              <li>
                <Link
                  href={localizePath(routes.cart, locale)}
                  className="text-sm text-(--ink-secondary) transition-colors duration-(--motion-duration-fast) ease-(--ease-standard) hover:text-(--ink-primary)"
                >
                  {dict.nav.cart}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-(--border-subtle) py-(--space-md)">
          <Body size="xs" tone="muted">
            © {new Date().getFullYear()} {dict.meta.siteName}
          </Body>
        </div>
      </Container>
    </footer>
  );
}
