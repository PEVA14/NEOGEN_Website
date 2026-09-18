import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { DocumentExplorer, EvidenceChain } from "@/components/quality";
import { ReferenceIndex } from "@/components/research";
import { Body, Mono } from "@/components/typography";
import { TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
import { researchReferenceIndex } from "@/content/research";
import { formatStrength, getProduct, publishedProducts } from "@/data/catalog";
import { publicEvidenceIndex } from "@/domain/quality";
import { isLocale, localeTags, type Locale } from "@/i18n/config";
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
 *   `calidad`     — the documentation explorer, generated only once a public
 *                   document resolves; in development it is always generated,
 *                   so the architecture can be reviewed as a labelled preview.
 *   `referencias` — the whole reference registry, generated once at least one
 *                   public reference is cited by a compound's profile. It came
 *                   out of the Research Hub, where 74 records in full made the
 *                   page forty screens long.
 *   articles      — none. The authoring format (MDX versus structured blocks)
 *                   is still to be chosen, and no slug is generated until it is.
 */
export const dynamicParams = false;

const QUALITY_SLUG = routes.qualityExplorer.split("/").pop() ?? "calidad";
const REFERENCES_SLUG = routes.researchReferences.split("/").pop() ?? "referencias";
const DEVELOPMENT = process.env.NODE_ENV !== "production";

function explorerIsPublic(): boolean {
  return publicEvidenceIndex(publishedProducts).length > 0;
}

function referencesArePublic(): boolean {
  return researchReferenceIndex().length > 0;
}

export async function generateStaticParams() {
  return [
    ...(explorerIsPublic() || DEVELOPMENT ? [{ slug: QUALITY_SLUG }] : []),
    ...(referencesArePublic() ? [{ slug: REFERENCES_SLUG }] : []),
  ];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  if (slug === REFERENCES_SLUG) {
    return {
      title: dict.research.references.title,
      description: dict.meta.descriptions.researchReferences,
      alternates: alternates(locale, routes.researchReferences),
    };
  }
  if (slug !== QUALITY_SLUG) return {};
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
  if (slug === REFERENCES_SLUG) return <ReferencesPage locale={locale} />;
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

/**
 * THE REFERENCE INDEX PAGE.
 *
 * Every public reference, grouped by year, each with the compounds whose
 * profile cites it. It is a derived page in the strict sense: no list of
 * "papers about NEOGEN" exists anywhere: `researchReferenceIndex()` is built
 * from the citations inside approved product overviews, so a reference leaves
 * this page the moment the last statement citing it stops rendering.
 */
async function ReferencesPage({ locale }: { locale: Locale }) {
  const dict = await getDictionary(locale);
  const copy = dict.research.references;
  const path = (to: string) => localizePath(to, locale);

  const entries = researchReferenceIndex().map((entry) => ({
    reference: entry.reference,
    products: entry.products.map((slug) => ({
      slug,
      name: getProduct(slug)?.name ?? slug,
      href: path(routes.product(slug)),
    })),
  }));
  const compounds = new Set(entries.flatMap((e) => e.products.map((p) => p.slug))).size;

  return (
    <Section mode="quiet" aria-labelledby="references-title">
      <Container width="full">
        <SectionHeader
          index={copy.index}
          label={`${copy.label} // ${copy.qualifier}`}
          title={copy.title}
          id="references-title"
          lede={copy.lede}
          as="h1"
          action={<TextLink href={path(routes.research)}>{copy.backToHub}</TextLink>}
        />
        {/* A description list needs dt/dd pairs, not bare divs: axe caught
            exactly that here at 375px. */}
        <dl className="mb-(--space-2xl) flex flex-wrap gap-x-(--space-2xl) gap-y-(--space-sm)">
          <div>
            <dt>
              <Mono size="2xs" className="block text-(--ink-muted) uppercase">
                {copy.countLabel}
              </Mono>
            </dt>
            <dd className="m-0">
              <Body>{String(entries.length).padStart(2, "0")}</Body>
            </dd>
          </div>
          <div>
            <dt>
              <Mono size="2xs" className="block text-(--ink-muted) uppercase">
                {copy.compoundsLabel}
              </Mono>
            </dt>
            <dd className="m-0">
              <Body>{String(compounds).padStart(2, "0")}</Body>
            </dd>
          </div>
        </dl>
        <ReferenceIndex
          entries={entries}
          copy={{
            sourceTypes: dict.citations.sourceTypes,
            doi: dict.citations.doi,
            pmid: dict.citations.pmid,
            open: dict.citations.open,
            external: dict.citations.external,
            etAl: dict.citations.etAl,
            citedBy: copy.citedBy,
            listLabel: copy.title,
          }}
        />
      </Container>
    </Section>
  );
}
