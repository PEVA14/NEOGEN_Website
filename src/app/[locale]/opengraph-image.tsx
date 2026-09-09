import { ImageResponse } from "next/og";

import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "NEOGEN";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * The share card, generated per locale at build time.
 *
 * BRAND MARKS ONLY. No product name, no compound, no imagery — there is no
 * verified product content, and a share card is the one surface where an
 * invented claim travels furthest from the page that could qualify it.
 *
 * The composition is the identity: paper ground, a hairline rule, the wordmark
 * with its dot, and the tagline. That is the same restraint the site opens
 * with, which is why it survives having nothing else in it.
 *
 * FONTS ARE BEST-EFFORT, DELIBERATELY. Instrument Sans is fetched at build so
 * the card matches the site, but a failed fetch falls back to the renderer's
 * default rather than failing the build. A share image is not worth a broken
 * deploy, and the layout carries the brand even in a substitute grotesque.
 */
async function loadDisplayFont(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@700&display=swap",
      { headers: { "User-Agent": "Mozilla/5.0" } },
    ).then((r) => r.text());

    const url = css.match(/src:\s*url\((https:[^)]+\.(?:woff2|ttf))\)/)?.[1];
    if (!url) return null;

    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OpengraphImage({
  params,
}: {
  // A Promise, as everywhere else in Next 16. Typing it as a plain object
  // compiled cleanly and silently yielded `undefined`, so both locales fell
  // back to Spanish and the English card shipped the Spanish tagline.
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(isLocale(locale) ? locale : "es");
  const font = await loadDisplayFont();

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#faf9f6",
        color: "#111111",
        padding: 88,
        fontFamily: font ? "Instrument Sans" : "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 24, height: 24, borderRadius: 999, backgroundColor: "#111111" }} />
        <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: "0.02em" }}>
          {dict.meta.siteName}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        <div style={{ width: "100%", height: 1, backgroundColor: "#c9c6bf" }} />
        <div style={{ fontSize: 104, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {dict.meta.tagline}
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: font
        ? [{ name: "Instrument Sans", data: font, weight: 700 as const, style: "normal" as const }]
        : undefined,
    },
  );
}
