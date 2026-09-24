import { notFound } from "next/navigation";

import { CatalogBrowser } from "@/components/catalog";
import {
  AreaContext,
  AreaEvidence,
  AreaResearch,
  ContinueExploring,
  EntryCompounds,
  PreviewBanner,
  RelatedAreas,
  type AreaEvidenceRow,
  type ContinueDestination,
} from "@/components/discovery";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { ladderStep } from "@/components/product";
import { AreaMasthead, TextLink, type AreaFact, type ProductCardProps } from "@/components/ui";
import { routes } from "@/config/routes";
import { publicAreaOverview } from "@/content/areas";
import { areaResearch } from "@/content/research";
import { formatStrength, presentationRange, publishedProducts, type Product } from "@/data/catalog";
import { formatPrice, getPrices } from "@/data/commerce";
import { areaBySlug, productsInArea, publicAreas, publicAreasFor } from "@/data/discovery";
import { continuePlan, entryOrder, featuredInArea, relatedAreas } from "@/domain/discovery";
import { evidenceCoverage, publicEvidenceIndex, resolveEvidence } from "@/domain/quality";
import { localeTags, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { catalogCopy, catalogEntries } from "@/server/catalog";

import type { AreaPreviewSources } from "@/content/preview/areaPreview";

/**
 * WHERE AN AREA PAGE'S DATA COMES FROM.
 *
 * `undefined` everywhere is the live page: real registries, real resolvers.
 * The development-only design preview passes sample sources through the SAME
 * functions (`content/preview/areaPreview`), so what it shows is exactly what
 * the live page will render once real sources and documents are approved.
 */
export interface AreaSources {
  areaOverviews: AreaPreviewSources["areaOverviews"];
  research: AreaPreviewSources["research"];
  quality: AreaPreviewSources["quality"];
}

/**
 * THE AREA PAGE — rendered by the live route and by the design preview.
 *
 * One renderer, so the preview can never drift from the page it previews.
 */
export async function renderAreaPage({
  locale,
  areaSlug,
  sources,
  preview = false,
}: {
  locale: Locale;
  areaSlug: string;
  sources?: AreaSources;
  preview?: boolean;
}) {
  const area = areaBySlug(areaSlug);
  if (!area) notFound();

  const items = productsInArea(area.id);
  if (items.length === 0) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.discovery.areas[area.id];
  const page = dict.discovery.page;
  const tag = localeTags[locale];
  const path = (to: string) => localizePath(to, locale);

  const prices = await getPrices(items.flatMap((p) => p.variants.map((v) => v.id)));
  const cheapest = (product: Product) =>
    product.variants
      .map((v) => prices.get(v.id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .sort((a, b) => a.amount - b.amount)[0] ?? null;
  const from = (product: Product) => {
    const money = cheapest(product);
    return money ? formatPrice(money, tag) : null;
  };
  const presentationLabel = (product: Product, variantId: string | null) => {
    const variant = product.variants.find((v) => v.id === variantId);
    return variant
      ? `${formatStrength(variant.strength)}${variant.vials ? ` × ${variant.vials}` : ""}`
      : dict.quality.record.compoundLevel;
  };

  /* ---- 01 masthead facts ------------------------------------------------ */

  const entry = entryOrder(items);
  const entryPrice =
    items
      .map(cheapest)
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .sort((a, b) => a.amount - b.amount)[0] ?? null;

  const facts: AreaFact[] = [
    { key: dict.discovery.countLabel, value: String(items.length).padStart(2, "0") },
    ...(entryPrice
      ? [{ key: dict.products.catalog.from, value: formatPrice(entryPrice, tag) }]
      : []),
    {
      /*
       * The same order the entry section below uses — flagship first, then
       * catalogue order — so the names in the masthead are the compounds that
       * lead the page, not a second list that disagrees with it.
       */
      key: dict.discovery.masthead.examples,
      value: entry
        .slice(0, 3)
        .map((p) => p.name)
        .join(" · "),
      kind: "text",
    },
  ];

  /* ---- entry compounds -------------------------------------------------- */

  const featured = featuredInArea(items);
  const [leadProduct, ...otherProducts] = featured;
  const recordLabel = (product: Product) => {
    const evidence = resolveEvidence(product, sources?.quality);
    const n = evidence.product.length + evidence.presentations.flatMap((p) => p.records).length;
    if (n === 0) return null;
    return n === 1 ? page.entry.record : page.entry.records.replace("{n}", String(n));
  };
  const cardFor = (product: Product): ProductCardProps => ({
    slug: product.slug,
    world: product.world,
    worldLabel: product.world ? dict.home.products.worldLabels[product.world] : undefined,
    areaId: area.id,
    eyebrow: dict.products.catalog.categoryLabels[product.category],
    name: product.name,
    subtitle: product.subtitle,
    href: path(routes.product(product.slug)),
    price: from(product),
    priceFrom: dict.products.catalog.from,
    presentationRange: presentationRange(product),
    presentations: product.variants.length,
    ctaLabel: dict.home.products.cta,
    format: product.world ? "flagship" : "standard",
  });

  /* ---- sourced sections: context, research, evidence -------------------- */

  const context = publicAreaOverview(
    area.id,
    locale,
    sources
      ? { overviews: sources.areaOverviews, references: sources.research.references }
      : undefined,
  );

  const research = areaResearch(area.id, sources?.research);
  const researchReferences = research.map((entryRow) => entryRow.reference);
  const citingSlugs = new Set(research.flatMap((entryRow) => entryRow.products));
  const citingCompounds = items
    .filter((p) => citingSlugs.has(p.slug))
    .map((p) => ({ slug: p.slug, name: p.name, href: path(routes.product(p.slug)) }));

  const evidenceRecords = publicEvidenceIndex(items, sources?.quality);
  const coverage = evidenceCoverage(evidenceRecords);
  const date = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(new Date(iso)) : "—";
  const evidenceRows: AreaEvidenceRow[] = evidenceRecords.map((record) => {
    const product = items.find((p) => p.slug === record.slug)!;
    return {
      documentId: record.documentId,
      product: product.name,
      productHref: `${path(routes.product(product.slug))}#calidad`,
      scope: presentationLabel(product, record.variantId),
      lot: record.lot?.id ?? null,
      type: record.type,
      issuer: record.issuer.name ?? dict.quality.record.issuerRoles[record.issuer.kind],
      reportId: record.reportId,
      date: date(record.issuedOn),
      href: record.href,
      external: record.external,
      states: record.states,
    };
  });

  /* ---- related and continue --------------------------------------------- */

  const related = relatedAreas(area.id);
  const plan = continuePlan(
    area.id,
    related.map((r) => r.area.id),
  );
  const areaCount = (id: typeof area.id) => productsInArea(id).length;
  const countLabel = (n: number) => page.continue.count.replace("{n}", String(n));

  const destinations: ContinueDestination[] = [
    ...(plan.nextArea
      ? [
          {
            key: "next",
            kind: page.continue.nextArea,
            name: dict.discovery.areas[plan.nextArea.id].short,
            meta: countLabel(areaCount(plan.nextArea.id)),
            href: path(routes.area(plan.nextArea.slug)),
            areaId: plan.nextArea.id,
          },
        ]
      : []),
    ...(plan.materials
      ? [
          {
            key: "materials",
            kind: page.continue.materials,
            name: dict.discovery.areas.materials.short,
            meta: countLabel(areaCount("materials")),
            href: path(routes.area(plan.materials.slug)),
            areaId: plan.materials.id,
          },
        ]
      : []),
    {
      key: "catalogue",
      kind: page.continue.catalogue,
      name: page.continue.catalogueName,
      meta: countLabel(publishedProducts.length),
      href: path(routes.products),
    },
    {
      key: "research",
      kind: page.continue.research,
      name: page.continue.researchName,
      meta: page.continue.researchMeta,
      href: path(routes.research),
    },
  ];

  const catalog = await catalogEntries(items, {
    locale,
    dict,
    primaryArea: area.id,
    registries: sources?.quality,
    overviews: sources?.research.overviews,
  });

  /* ---- the spine, numbered from what renders ----------------------------- */

  const sections = [
    ...(leadProduct ? ["entry"] : []),
    ...(context ? ["context"] : []),
    "compounds",
    ...(research.length > 0 ? ["research"] : []),
    ...(evidenceRecords.length > 0 ? ["evidence"] : []),
    ...(related.length > 0 ? ["related"] : []),
    "continue",
  ];
  const index = (id: string) => String(sections.indexOf(id) + 1).padStart(2, "0");
  const label = (section: string, qualifier: string) => `${section} // ${qualifier}`;
  /*
   * Surfaces alternate by RENDERED position, paper then warm stone, so two
   * adjacent sections never share a ground whichever of the optional sections
   * exist. Hard-coding a surface per section put research and evidence on the
   * same stone the moment both rendered, and they read as one block.
   */
  const surface = (id: string) =>
    sections.indexOf(id) % 2 === 1 ? "bg-(--surface-raised)" : undefined;

  return (
    <>
      {preview ? (
        <PreviewBanner
          label={dict.discovery.preview.label}
          body={dict.discovery.preview.body}
          back={dict.discovery.preview.back}
          backHref={path(routes.area(area.slug))}
        />
      ) : null}
      <AreaMasthead
        areaId={area.id}
        index={String(area.order).padStart(2, "0")}
        eyebrow={dict.discovery.label}
        short={copy.short}
        framing={copy.title}
        body={copy.body}
        facts={facts}
        titleId="area-title"
      />

      {leadProduct ? (
        <Section
          mode="quiet"
          id="area-entry"
          className={surface("entry")}
          aria-labelledby="area-entry-title"
        >
          <Container width="full">
            <SectionHeader
              index={index("entry")}
              label={label(
                page.entry.label,
                page.entry.qualifier
                  .replace("{n}", String(featured.length))
                  .replace("{total}", String(items.length)),
              )}
              title={page.entry.title}
              id="area-entry-title"
            />
            <EntryCompounds
              lead={{
                slug: leadProduct.slug,
                name: leadProduct.name,
                subtitle: leadProduct.subtitle,
                href: path(routes.product(leadProduct.slug)),
                world: leadProduct.world,
                worldLabel: leadProduct.world
                  ? dict.home.products.worldLabels[leadProduct.world]
                  : undefined,
                areaId: area.id,
                classification: dict.products.catalog.categoryLabels[leadProduct.category],
                range: presentationRange(leadProduct),
                presentationCount: leadProduct.variants.length,
                ladder: leadProduct.variants.map((v) => ladderStep(v.strength, v.vials)),
                price: from(leadProduct),
                alsoIn: publicAreasFor(leadProduct.slug)
                  .filter((other) => other.id !== area.id)
                  .map((other) => ({
                    id: other.id,
                    label: dict.discovery.areas[other.id].short,
                    href: path(routes.area(other.slug)),
                  })),
                records: recordLabel(leadProduct),
              }}
              others={otherProducts.map(cardFor)}
              copy={{
                presentations: page.entry.presentations,
                pack: page.entry.pack,
                documentation: page.entry.documentation,
                alsoIn: page.entry.alsoIn,
                from: dict.products.catalog.from,
                cta: page.entry.cta,
              }}
            />
          </Container>
        </Section>
      ) : null}

      {context ? (
        <Section
          mode="quiet"
          id="area-context"
          className={surface("context")}
          aria-labelledby="area-context-title"
        >
          <Container width="full">
            <SectionHeader
              index={index("context")}
              label={label(page.context.label, page.context.qualifier)}
              title={page.context.title}
              id="area-context-title"
            />
            <AreaContext
              overview={context}
              copy={{ themes: page.context.themes, pathways: page.context.pathways }}
              citations={dict.citations}
            />
          </Container>
        </Section>
      ) : null}

      {/*
       * EVERY COMPOUND — the primary shopping surface, before any research.
       *
       * Every area gets the catalogue's own faceted browser scoped to the area.
       * Its area facet becomes "also in" — the other areas this area's
       * compounds are filed under — and any facet that cannot discriminate in
       * this scope is omitted by the browser itself. Server-rendered in full;
       * the browser only adds controls.
       */}
      <Section
        mode="quiet"
        id="area-compounds"
        className={surface("compounds")}
        aria-labelledby="area-compounds-title"
      >
        <Container width="full">
          <SectionHeader
            index={index("compounds")}
            label={label(
              page.compounds.label,
              page.compounds.qualifier.replace("{n}", String(items.length)),
            )}
            title={page.compounds.title}
            id="area-compounds-title"
            action={<TextLink href={path(routes.products)}>{dict.discovery.all}</TextLink>}
          />
          <CatalogBrowser
            cardHeadingLevel={3}
            products={catalog}
            copy={catalogCopy(dict)}
            localeTag={tag}
            areaFacet="alsoIn"
            variant="store"
            areaOrder={publicAreas()
              .filter((other) => other.id !== area.id)
              .map((other) => other.id)}
          />
        </Container>
      </Section>

      {research.length > 0 ? (
        <Section
          mode="quiet"
          id="area-research"
          className={surface("research")}
          aria-labelledby="area-research-title"
        >
          <Container width="full">
            <SectionHeader
              index={index("research")}
              label={label(dict.discovery.research.label, dict.discovery.research.qualifier)}
              title={dict.discovery.research.title}
              id="area-research-title"
              lede={dict.discovery.research.lede}
              action={
                <TextLink href={`${path(routes.compendium)}?area=${area.id}`}>
                  {dict.discovery.research.hub}
                </TextLink>
              }
            />
            <AreaResearch
              references={researchReferences}
              compounds={citingCompounds}
              copy={{
                references: dict.discovery.research.references,
                citingCompounds: dict.discovery.research.citingCompounds,
              }}
              citations={dict.citations}
            />
          </Container>
        </Section>
      ) : null}

      {evidenceRecords.length > 0 ? (
        <Section
          mode="quiet"
          id="area-evidence"
          className={surface("evidence")}
          aria-labelledby="area-evidence-title"
        >
          <Container width="full">
            <SectionHeader
              index={index("evidence")}
              label={label(page.evidence.label, page.evidence.qualifier)}
              title={page.evidence.title}
              id="area-evidence-title"
              lede={page.evidence.lede}
            />
            <AreaEvidence
              rows={evidenceRows}
              coverage={coverage}
              explorerHref={path(routes.qualityExplorer)}
              copy={{
                records: page.evidence.records,
                compounds: page.evidence.compounds,
                presentations: page.evidence.presentations,
                caption: page.evidence.caption,
                explorer: page.evidence.explorer,
                columns: dict.quality.record.columns,
                compound: dict.quality.explorer.columns.product,
                states: dict.quality.record.states,
                types: dict.quality.record.types,
                reportId: dict.quality.record.reportId,
                view: dict.quality.record.view,
                external: dict.quality.record.external,
              }}
            />
          </Container>
        </Section>
      ) : null}

      {related.length > 0 ? (
        <Section
          mode="quiet"
          id="area-related"
          className={surface("related")}
          aria-labelledby="area-related-title"
        >
          <Container width="full">
            <SectionHeader
              index={index("related")}
              label={label(dict.discovery.related.label, dict.discovery.related.qualifier)}
              title={dict.discovery.related.title}
              id="area-related-title"
            />
            <RelatedAreas
              total={items.length}
              entries={related.map(({ area: other, shared }) => ({
                id: other.id,
                href: path(routes.area(other.slug)),
                short: dict.discovery.areas[other.id].short,
                framing: dict.discovery.areas[other.id].title,
                shared: shared.length,
                compounds: shared.map((subject) => {
                  const product = items.find((p) => p.slug === subject.slug)!;
                  return {
                    slug: product.slug,
                    name: product.name,
                    href: path(routes.product(product.slug)),
                  };
                }),
              }))}
              copy={{
                shared: dict.discovery.related.shared,
                ofTotal: dict.discovery.related.ofTotal,
                sharedCompounds: dict.discovery.related.sharedCompounds,
                enter: dict.discovery.related.enter,
              }}
            />
          </Container>
        </Section>
      ) : null}

      <Section
        mode="quiet"
        id="area-continue"
        className={surface("continue")}
        aria-labelledby="area-continue-title"
      >
        <Container width="full">
          <SectionHeader
            index={index("continue")}
            label={label(page.continue.label, page.continue.qualifier)}
            title={page.continue.title}
            id="area-continue-title"
          />
          <ContinueExploring destinations={destinations} />
        </Container>
      </Section>
    </>
  );
}
