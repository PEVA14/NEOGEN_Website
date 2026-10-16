import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import Link from "next/link";

import { NeogenMark } from "@/components/brand/NeogenMark";

import en from "@/i18n/dictionaries/en";
import es from "@/i18n/dictionaries/es";

import { GlobalNotFoundCopy } from "./GlobalNotFoundCopy";

import "@/styles/globals.css";

import type { Metadata } from "next";

/**
 * THE 404 FOR A URL THAT MATCHES NO ROUTE AT ALL.
 *
 * The site has two root layouts (`[locale]` and `/ops`), so an unmatched
 * address — `/es/typo`, `/whatever` — never reaches `[locale]/not-found.tsx`,
 * and Next served its own unbranded page, in English, with no `lang`. This is
 * Next's documented answer for multiple root layouts (`globalNotFound` in
 * next.config). It speaks both languages, the address's own first
 * (`GlobalNotFoundCopy`, B11; Spanish when the address has none), and sends
 * people into the catalogue rather than to a dead end. Real 404 status;
 * nothing here renders the storefront chrome. Static on purpose.
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
  /* Neutral: the page may be in either language. */
  title: "404 · NEOGEN",
  robots: { index: false, follow: true },
};

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
            className="neogen-display inline-flex w-fit items-center gap-(--space-2xs) text-xl tracking-(--tracking-tight) text-(--ink-primary) no-underline"
          >
            {/* Nothing connects here: the mark's nodes, without their
                connections. Decorative — the word is the link's name. */}
            <NeogenMark form="points" className="h-[1.05em]" />
            NEOGEN
          </Link>
          <GlobalNotFoundCopy
            copy={{
              es: {
                title: es.error.notFoundTitle,
                body: es.error.notFoundBody,
                backHome: es.error.backHome,
                products: es.nav.products,
              },
              en: {
                title: en.error.notFoundTitle,
                body: en.error.notFoundBody,
                backHome: en.error.backHome,
                products: en.nav.products,
              },
            }}
          />
        </main>
      </body>
    </html>
  );
}
