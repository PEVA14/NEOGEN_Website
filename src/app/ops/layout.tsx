import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

import "@/styles/globals.css";

import type { Metadata } from "next";

/**
 * THE OPERATIONS CONSOLE'S ROOT — separate from the storefront's.
 *
 * `/ops` has its own root layout (there is no `app/layout.tsx`, so the
 * locale layout and this one are siblings): no site header, no footer, no
 * locale prefix, no storefront chrome. Same fonts and tokens, so it is
 * recognisably NEOGEN, but it is a tool — Quiet Mode throughout, dense, and
 * fast to scan. Moving between the two is a full page load, which is fine
 * for two audiences that never share a session.
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
  title: { default: "Operaciones — NEOGEN", template: "%s — Operaciones NEOGEN" },
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" className={`${instrumentSans.variable} ${ibmPlexMono.variable}`}>
      <body suppressHydrationWarning className="min-h-dvh bg-(--surface-base) text-(--ink-primary)">
        {children}
      </body>
    </html>
  );
}
