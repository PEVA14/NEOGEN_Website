import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import Link from "next/link";

import en from "@/i18n/dictionaries/en";
import es from "@/i18n/dictionaries/es";

import "@/styles/globals.css";

import type { Metadata } from "next";

/**
 * THE 404 FOR A URL THAT MATCHES NO ROUTE AT ALL.
 *
 * The site has two root layouts (`[locale]` and `/ops`), so an unmatched
 * address — `/es/typo`, `/whatever` — never reaches `[locale]/not-found.tsx`,
 * and Next served its own unbranded page, in English, with no `lang`. This is
 * Next's documented answer for multiple root layouts (`globalNotFound` in
 * next.config). It cannot know the locale, so it speaks both, Spanish first —
 * the primary market — and sends people into the catalogue rather than to a
 * dead end. Real 404 status; nothing here renders the storefront chrome.
 */
const instrumentSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-instrument-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

export const metadata: Metadata = {
  title: `404 — ${es.error.notFoundTitle} · NEOGEN`,
  robots: { index: false, follow: true },
};

const link =
  "inline-flex min-h-11 items-center font-mono text-xs uppercase tracking-(--tracking-label) text-(--ink-primary) underline underline-offset-4";

export default function GlobalNotFound() {
  return (
    <html lang="es-MX" className={`${instrumentSans.variable} ${ibmPlexMono.variable}`}>
      <body suppressHydrationWarning className="min-h-dvh bg-(--surface-base) text-(--ink-primary)">
        <main
          id="main-content"
          className="mx-auto grid min-h-dvh max-w-(--container-content) content-center gap-(--space-xl) px-(--gutter) py-(--space-3xl)"
        >
          <Link
            href="/es"
            className="neogen-display w-fit text-xl tracking-(--tracking-tight) text-(--ink-primary) no-underline"
          >
            NEOGEN
          </Link>
          <div className="grid gap-(--space-sm) border-t border-(--border-strong) pt-(--space-md)">
            <p className="m-0 font-mono text-xs tracking-(--tracking-label) text-(--ink-muted) uppercase">
              404
            </p>
            <h1 className="neogen-display m-0 text-5xl leading-(--leading-tight)">
              {es.error.notFoundTitle}
            </h1>
            <p className="m-0 max-w-[48ch] text-lg text-(--ink-secondary)">
              {es.error.notFoundBody}
            </p>
            <p lang="en" className="m-0 max-w-[48ch] text-sm text-(--ink-muted)">
              {en.error.notFoundTitle}. {en.error.notFoundBody}
            </p>
          </div>
          <nav
            aria-label="NEOGEN"
            className="flex flex-wrap gap-x-(--space-lg) gap-y-(--space-2xs)"
          >
            <Link href="/es/productos" className={link}>
              {es.nav.products} →
            </Link>
            <Link href="/es" className={link}>
              {es.error.backHome}
            </Link>
            <Link href="/en" lang="en" className={link}>
              English
            </Link>
          </nav>
        </main>
      </body>
    </html>
  );
}
