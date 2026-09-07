import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { notFound } from "next/navigation";

import { SiteFooter, SiteHeader } from "@/components/layout";
import { SkipLink } from "@/components/primitives";
import { siteConfig } from "@/config/site";
import { isLocale, locales, localeTags, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import "@/styles/globals.css";

/**
 * Instrument Sans, variable — carries BOTH the UI voice and the display voice.
 * The `wdth` axis (75–100) supplies the Design Bible's condensed treatment, so
 * no separate condensed font file is loaded.
 */
const instrumentSans = Instrument_Sans({
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
  variable: "--font-instrument-sans",
});

/** IBM Plex Mono — the technical register: specs, lots, COA fields, annotations. */
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
});

/** Pre-render both locales at build time. */
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};

  const dict = await getDictionary(locale);

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: `${dict.meta.siteName} — ${dict.meta.tagline}`,
      template: `%s — ${dict.meta.siteName}`,
    },
    description: dict.meta.description,
    alternates: {
      canonical: `/${locale}`,
      // hreflang for both locales, plus x-default pointing at Spanish.
      languages: {
        ...Object.fromEntries(locales.map((l) => [localeTags[l], `/${l}`])),
        "x-default": `/${siteConfig.defaultLocale}`,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typedLocale: Locale = locale;
  const dict = await getDictionary(typedLocale);

  return (
    <html
      lang={localeTags[typedLocale]}
      className={`${instrumentSans.variable} ${ibmPlexMono.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <SkipLink label={dict.a11y.skipToContent} />
        <SiteHeader locale={typedLocale} dict={dict} />
        {/* `tabIndex={-1}` makes the skip-link target programmatically focusable. */}
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <SiteFooter locale={typedLocale} dict={dict} />
      </body>
    </html>
  );
}
