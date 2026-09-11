import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { DocumentExplorer, EvidenceChain } from "@/components/quality";
import { Mono } from "@/components/typography";
import { routes } from "@/config/routes";
import { formatStrength, getProduct, publishedProducts } from "@/data/catalog";
import { publicEvidenceIndex } from "@/domain/quality";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";

import type { Metadata } from "next";

/**
 * RESEARCH SUB-PAGES — one route, gated by the framework rather than by a
 * `notFound()` call.
 *
 * WHY THE EXPLORER LIVES HERE AND NOT AT ITS OWN STATIC ROUTE. It did, briefly,
 * as `investigacion/calidad/page.tsx`, calling `notFound()` when no public
 * document existed. That route is static beneath `[locale]`, so the 404 was
 * rendered at build time and baked into an ordinary page: the production
 * server answered **200 OK** with the not-found body under the explorer's
 * title — a soft 404, caught by `check:output`, the same failure the policy
 * route had in Phase 10.
 *
 * An empty or conditional `generateStaticParams` with `dynamicParams = false`
 * is the mechanism this codebase has already verified: a slug that is not
 * generated does not exist, so the router answers a real 404 and the build
 * emits no HTML at all.
 *
 * WHICH SLUGS EXIST.
 *   `calidad` — the documentation explorer, generated only once a public
 *               document resolves; in development it is always generated, so
 *               the architecture can be reviewed as a labelled preview.
 *   articles  — none. The authoring format (MDX versus structured blocks) is
 *               still to be chosen, and no slug is generated until it is.
 */
export const dynamicParams = false;

const QUALITY_SLUG = routes.qualityExplorer.split("/").pop() ?? "calidad";
const DEVELOPMENT = process.env.NODE_ENV !== "production";

function explorerIsPublic(): boolean {
  return publicEvidenceIndex(publishedProducts).length > 0;
}

export async function generateStaticParams() {
  return explorerIsPublic() || DEVELOPMENT ? [{ slug: QUALITY_SLUG }] : [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || slug !== QUALITY_SLUG) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.quality.explorer.title,
    description: dict.meta.descriptions.qualityExplorer,
    alternates: alternates(locale, routes.qualityExplorer),
    /* Indexable only once it is real; the development preview never is. */
    robots: explorerIsPublic() ? undefined : { index: false, follow: false },
  };
}

export default async function ResearchSubPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  /* Unreachable for any other slug while `generateStaticParams` is the gate;
     kept explicit so a future article slug cannot fall into the explorer. */
  if (slug !== QUALITY_SLUG) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.quality.explorer;
  const record = dict.quality.record;
  const path = (to: string) => localizePath(to, locale);
  const date = (iso: string | null) =>
    iso
      ? new Intl.DateTimeFormat(localeTags[locale], { dateStyle: "medium" }).format(new Date(iso))
      : "—";

  const records = publicEvidenceIndex(publishedProducts).map((entry) => {
    const product = getProduct(entry.slug);
    const variant = product?.variants.find((v) => v.id === entry.variantId);
    return {
      id: `${entry.slug}:${entry.documentId}`,
      product: product?.name ?? entry.slug,
      productHref: path(routes.product(entry.slug)),
      presentation: variant ? formatStrength(variant.strength) : record.compoundLevel,
      lot: entry.lot?.id ?? null,
      type: entry.type,
      typeLabel: record.types[entry.type],
      issuer: entry.issuer.name ?? record.issuerRoles[entry.issuer.kind],
      issuedOn: date(entry.issuedOn),
      href: entry.href,
      external: entry.external,
      states: entry.states,
    };
  });

  return (
    <Section mode="quiet" aria-labelledby="explorer-title">
      <Container width="full">
        <SectionHeader
          index={copy.index}
          label={`${copy.label} // ${copy.qualifier}`}
          title={copy.title}
          id="explorer-title"
          lede={copy.lede}
          as="h1"
        />
        {!explorerIsPublic() ? (
          <Mono
            size="2xs"
            className="mb-(--space-lg) block border-l-2 border-(--border-strong) pl-(--space-sm) text-(--ink-secondary) uppercase"
          >
            {copy.devNotice}
          </Mono>
        ) : null}
        <div className="mb-(--space-2xl)">
          <EvidenceChain copy={record.chain} />
        </div>
        <DocumentExplorer records={records} copy={copy} />
      </Container>
    </Section>
  );
}
