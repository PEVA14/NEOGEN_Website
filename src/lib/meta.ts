import { siteConfig } from "@/config/site";
import { localeTags, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";

import type { ProductImage } from "@/content";
import type { Metadata } from "next";

/**
 * Fills a description template from the registry.
 *
 * Templates live in the dictionaries — they are copy — while the values come
 * from `data/catalog`, so a description can only ever state something the
 * catalogue already knows. Nothing here composes a claim: a name, a
 * classification and a list of presentations are the three facts a product
 * record actually carries.
 *
 * Search engines truncate around 155–160 characters, so a long presentation
 * list is collapsed to its range rather than being cut mid-value by the SERP.
 */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/**
 * A presentation list that fits a search result.
 *
 * Up to three doses are listed in full. Beyond that the list becomes a range —
 * "5 mg – 60 mg (7 presentaciones)" would need a localized noun, so the count
 * is left to the caller and the range alone is returned.
 */
export function presentationSummary(labels: readonly string[]): string {
  if (labels.length === 0) return "";
  if (labels.length <= 3) return labels.join(", ");
  return `${labels[0]} – ${labels[labels.length - 1]}`;
}

/**
 * The social block for one page.
 *
 * WHY THIS IS NOT JUST `openGraph: { title, description }`.
 * --------------------------------------------------------
 * Next merges metadata per FIELD, and `openGraph` is one field. A page that
 * declares it replaces the layout's object wholesale — including `siteName`,
 * `url`, `type`, and the image Next injects from `opengraph-image.tsx`. So the
 * moment the catalogue, the research hub and the product pages started setting
 * their own social title, they silently stopped having a share image at all:
 * a shared link rendered as a bare headline.
 *
 * Composing the whole object in one place makes that impossible to half-do.
 *
 * `image` is the product's own photography when it has some. Otherwise the
 * locale's generated brand card stands in — the same one the home page uses.
 * The diagrammatic silhouette is never a candidate: on the page it sits in a
 * frame that reads as a technical drawing, and in a link preview it would
 * arrive with no frame at all.
 */
export function socialMetadata({
  locale,
  path,
  title,
  description,
  image,
}: {
  locale: Locale;
  /** Unlocalised route from `config/routes`. */
  path: string;
  title: string;
  description: string;
  image?: ProductImage | null;
}): Pick<Metadata, "openGraph" | "twitter"> {
  const images = image
    ? [{ url: image.src, width: image.width, height: image.height, alt: image.alt }]
    : [
        {
          url: localizePath("/opengraph-image", locale),
          width: 1200,
          height: 630,
          alt: siteConfig.name,
        },
      ];

  return {
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: localeTags[locale],
      url: localizePath(path, locale),
      title,
      description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
    },
  };
}
