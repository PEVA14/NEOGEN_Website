import { notFound } from "next/navigation";

import {
  GlowMoment,
  Hero,
  MaterialMoment,
  RetaExperience,
  type HeroCopy,
  type RetaExperienceCopy,
  type WorldMomentCopy,
} from "@/components/experience";
import { SectionHeader } from "@/components/layout";
import { Container, Grid, Section } from "@/components/primitives";
import {
  CatalogIndex,
  CompoundIndexHead,
  CompoundRow,
  DocumentLedger,
  EditorialSpread,
  ProductCard,
  TextLink,
} from "@/components/ui";
import { routes } from "@/config/routes";
import { worldIds, type WorldId } from "@/config/worlds";
import { isLocale, localeTags } from "@/i18n/config";
import { formatStrength, isPublishable, products } from "@/data/catalog";
import { formatPrice, getPrices } from "@/data/commerce";
import { getDictionary } from "@/i18n/getDictionary";
import { alternates } from "@/lib/alternates";
import { localizePath } from "@/i18n/routing";

import type { Metadata } from "next";

/**
 * HOME — Phase 3.
 *
 *   Hero (Impact) → 01 Evolution (Quiet) → RETA (Impact)
 *   → 04 Catalogue (Quiet) → GLOW (Impact) → 06 Research + 07 Quality (Quiet)
 *   → GHK-Cu (Impact) → 08 Products (Quiet) → Footer
 *
 * Two structural rules from the reference set are load-bearing:
 *
 *  1. ONLY QUIET SECTIONS ARE NUMBERED. Experience beats carry a mono eyebrow
 *     and sit outside the spine, so they read as interruptions in the
 *     informational structure rather than entries in it.
 *
 *  2. NO TWO IMPACT SECTIONS ARE ADJACENT. Every world is separated by Quiet
 *     material, which is what makes the worlds land at all.
 *
 * The three worlds use DIFFERENT mechanisms — object choreography, luminance,
 * material strata — so the page never repeats one trick three times.
 *
 * COPY IS PRODUCT COPY. It describes the compounds and their material
 * environments, in the voice of the reference set. Where the reference states a
 * receptor mechanism, a formulation, a purity grade or a lot number, the FIELD
 * is reproduced and the VALUE is an explicit placeholder — none of it is
 * verified (CLAUDE.md regulatory guardrail, CONVENTIONS §8).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  // Title comes from the layout's default; only the canonical is page-specific.
  return { alternates: alternates(locale, routes.home) };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const home = dict.home;

  const path = (to: string) => localizePath(to, locale);

  const heroCopy: HeroCopy = { ...home.hero, ctaHref: path(routes.products) };

  const reta = home.reta;
  /*
   * THE FLAGSHIPS, FROM THE REGISTRY.
   *
   * This section used to iterate `worldIds` and read names and slugs off
   * `config/worlds` — a second source of truth for product identity, which the
   * world config's own header forbids ("no product claims, prices, specs or
   * availability here"). A world is a property some products have; it is not
   * where products live. Iterating the registry means a flagship that loses
   * its world, changes its name or becomes unpublishable cannot leave a stale
   * card behind.
   *
   * "From" prices are batched through `getPrices`, which resolves locally today
   * and over a network later; the call shape does not change.
   */
  const flagships = worldIds
    .map((id) => products.find((product) => product.world === id && isPublishable(product)))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));

  const priceMap = await getPrices(flagships.flatMap((p) => p.variants.map((v) => v.id)));
  const fromPrice = (product: (typeof flagships)[number]) => {
    const cheapest = product.variants
      .map((v) => priceMap.get(v.id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .sort((a, b) => a.amount - b.amount)[0];
    return cheapest ? formatPrice(cheapest, localeTags[locale]) : null;
  };
  const relatedPrices = new Map(flagships.map((p) => [p.world as WorldId, fromPrice(p)]));

  /*
   * The Experience rails used to carry three unfillable fields each — purity,
   * molecular action, lot. Those need a verified source we do not have, and a
   * labelled empty field makes a finished page look unfinished. They now carry
   * what the catalogue actually knows.
   */
  const railFor = (world: WorldId) => {
    const p = flagships.find((item) => item.world === world);
    if (!p) return [];
    const from = relatedPrices.get(world);
    return [
      {
        key: home.reta.specs.presentation,
        value: p.variants.map((v) => formatStrength(v.strength)).join(" · "),
      },
      { key: home.reta.specs.category, value: dict.products.catalog.categoryLabels[p.category] },
      ...(from ? [{ key: home.reta.specs.from, value: from }] : []),
    ];
  };

  const retaCopy: RetaExperienceCopy = {
    beats: reta.beats.map((beat, index) => ({
      eyebrow: beat.eyebrow,
      statement: beat.statement,
      body: beat.body,
      // The specification block lands on the final beat, so the sequence
      // resolves from product statement into technical reference.
      annotations: index === reta.beats.length - 1 ? railFor("reta") : undefined,
    })),
    vialAlt: reta.vialAlt,
    loadingLabel: reta.loadingLabel,
    staticLabel: reta.staticLabel,
    progressLabel: reta.progressLabel,
  };

  const glowCopy: WorldMomentCopy = {
    eyebrow: home.glow.eyebrow,
    statement: home.glow.statement,
    body: home.glow.body,
    annotations: railFor("glow"),
    mediaLabel: home.glow.mediaLabel,
  };

  const ghkCuCopy: WorldMomentCopy = {
    eyebrow: home.ghkcu.eyebrow,
    statement: home.ghkcu.statement,
    body: home.ghkcu.body,
    annotations: railFor("ghk-cu"),
    mediaLabel: home.ghkcu.mediaLabel,
  };

  return (
    <>
      <Hero copy={heroCopy} />

      {/* 01 — Quiet. The editorial spread that sets NEOGEN's informational
          voice: an oversized index numeral against a dense right column. */}
      <Section mode="quiet" aria-labelledby="evolution-title">
        <Container width="full">
          <EditorialSpread
            index={home.evolution.index}
            label={home.evolution.label}
            title={home.evolution.title}
            titleId="evolution-title"
            lede={home.evolution.lede}
            principles={home.evolution.points}
          />
        </Container>
      </Section>

      {/* Impact — the object. */}
      <RetaExperience copy={retaCopy} />

      {/* 04 — Quiet. A catalogue index, not a feature grid: oversized category
          names, hanging indices, rules, and the whole row as the target. */}
      <Section mode="quiet" aria-labelledby="catalog-title">
        <Container width="full">
          <SectionHeader
            index={home.catalog.index}
            label={home.catalog.label}
            title={home.catalog.title}
            id="catalog-title"
            action={<TextLink href={path(routes.products)}>{home.catalog.action}</TextLink>}
          />
          <CatalogIndex
            entries={home.catalog.categories.map((category) => ({
              index: category.index,
              title: category.title,
              body: category.body,
              href: path(routes.products),
              linkLabel: category.link,
            }))}
          />
        </Container>
      </Section>

      {/* Impact — light. */}
      <GlowMoment copy={glowCopy} />

      {/*
       * 06 — Quiet. The compound register, drawn from the product registry.
       * Category and presentation count are facts; documentation is the one
       * genuinely unknown field, and it is the only one that says "pending".
       */}
      <Section mode="quiet" aria-labelledby="research-title">
        <Container width="full">
          <SectionHeader
            index={home.research.index}
            label={home.research.label}
            title={home.research.title}
            id="research-title"
            lede={home.research.lede}
            action={<TextLink href={path(routes.research)}>{home.research.action}</TextLink>}
          />
          <ul>
            <CompoundIndexHead columns={[...home.research.columns]} />
            {flagships.map((product, index) => (
              <CompoundRow
                key={product.id}
                index={String(index + 1).padStart(2, "0")}
                world={product.world}
                worldLabel={
                  product.world
                    ? home.products.worldLabels[product.world]
                    : dict.products.catalog.categoryLabels[product.category]
                }
                name={product.name}
                href={path(routes.product(product.slug))}
                /*
                 * Every value is read off the registry except documentation,
                 * which is genuinely unknown and says so. The row previously
                 * put the category under "Código" and the VARIANT COUNT under
                 * "Artículos" — reading, for RETA, as "7 articles", of which
                 * zero exist.
                 */
                fields={[
                  {
                    key: home.research.fields.category,
                    value: dict.products.catalog.categoryLabels[product.category],
                  },
                  {
                    key: home.research.fields.presentations,
                    value: String(product.variants.length),
                  },
                  { key: home.research.fields.documentation, value: dict.status.pending },
                ]}
              />
            ))}
          </ul>
        </Container>
      </Section>

      {/* 07 — Quiet, on warm stone. Documentation treated as material: framed
          records with identifiers and a neutral verification state. */}
      <Section mode="quiet" aria-labelledby="quality-title" className="bg-(--surface-raised)">
        <Container width="full">
          <SectionHeader
            index={home.quality.index}
            label={home.quality.label}
            title={home.quality.title}
            id="quality-title"
          />
          <DocumentLedger
            records={home.quality.points}
            identifierLabel={home.research.recordLabel}
            stateLabel={home.research.stateLabel}
            stateValue={dict.status.pending}
          />
        </Container>
      </Section>

      {/* Impact — material. */}
      <MaterialMoment copy={ghkCuCopy} />

      {/* 08 — Quiet. Commerce stays neutral: charcoal CTAs, world colour only
          in the identifier dot (SYSTEM STATUS V1). */}
      <Section mode="quiet" aria-labelledby="products-title">
        <Container width="full">
          <SectionHeader
            index={home.products.index}
            label={home.products.label}
            title={home.products.title}
            id="products-title"
            action={<TextLink href={path(routes.products)}>{home.products.action}</TextLink>}
          />
          {/*
           * Staggered, not a centred row of three.
           *
           * The card architecture is identical for every flagship — SYSTEM
           * STATUS V1 is explicit that there are no bespoke card systems per
           * product — so the composition is what carries the art direction. A
           * descending step gives the row a reading direction and stops it
           * resolving into the three-rectangle shape the rest of the page has
           * been working to avoid.
           */}
          <Grid className="items-start">
            {flagships.map((product, position) => (
              <div
                key={product.id}
                className={
                  "col-span-12 md:col-span-4 " +
                  ["", "md:mt-(--space-2xl)", "md:mt-(--space-4xl)"][position]
                }
              >
                <ProductCard
                  slug={product.slug}
                  world={product.world}
                  worldLabel={product.world ? home.products.worldLabels[product.world] : undefined}
                  name={product.name}
                  href={path(routes.product(product.slug))}
                  price={fromPrice(product)}
                  ctaLabel={home.products.cta}
                />
              </div>
            ))}
          </Grid>
        </Container>
      </Section>
    </>
  );
}
