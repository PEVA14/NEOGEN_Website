"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { locales, localeNames, type Locale } from "@/i18n/config";
import { switchLocalePath } from "@/i18n/routing";
import { cn } from "@/lib/cn";

interface LanguageSwitcherProps {
  currentLocale: Locale;
  /** Localized group label, e.g. dict.a11y.languageSwitcher. */
  label: string;
}

/**
 * Language switcher.
 *
 * Plain links, not a JS-driven control: each locale is a real, crawlable URL,
 * it works without JavaScript, and it preserves the current page. The active
 * locale is marked with `aria-current` so screen reader users know where they
 * are without relying on the visual weight.
 *
 * This is a Client Component only because it needs `usePathname()`. It receives
 * its label as a prop and holds no copy of its own.
 */
export function LanguageSwitcher({ currentLocale, label }: LanguageSwitcherProps) {
  const pathname = usePathname();

  return (
    <nav aria-label={label} className="flex items-center gap-(--space-3xs)">
      {locales.map((locale) => {
        const isActive = locale === currentLocale;
        return (
          <Link
            key={locale}
            href={switchLocalePath(pathname, locale)}
            hrefLang={locale}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              /*
               * WCAG 2.2 SC 2.5.8 — measured at 24x25, which technically clears
               * the 24px floor and is still a poor tap target for a two-letter
               * control on a phone. The header's own nav links already stand at
               * 2.75rem for exactly this reason; the switcher had been left out
               * of that decision. Height comes from the box, not from the type,
               * so nothing moves.
               */
              "inline-flex min-h-11 min-w-11 items-center justify-center",
              "rounded-(--radius-sm) px-(--space-3xs) py-(--space-3xs)",
              "font-mono text-2xs tracking-(--tracking-label) uppercase",
              "transition-colors duration-(--motion-duration-fast) ease-(--ease-standard)",
              isActive ? "text-(--ink-primary)" : "text-(--ink-muted) hover:text-(--ink-secondary)",
            )}
          >
            <span className="sr-only">{localeNames[locale]}</span>
            <span aria-hidden="true">{locale}</span>
          </Link>
        );
      })}
    </nav>
  );
}
