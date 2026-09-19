import { notFound } from "next/navigation";

import { AreaShelf } from "@/components/catalog/Storefront";
import {
  GlowMoment,
  Hero,
  MaterialMoment,
  RetaExperience,
  type HeroCopy,
  type RetaExperienceCopy,
} from "@/components/experience";
import { AreaExplorer, ClosingShelf, HomeGateway, ScienceBand, WorldBand } from "@/components/home";
import { routes } from "@/config/routes";
import { getWorld, type WorldId } from "@/config/worlds";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { homeData } from "@/server/home";

import type { Metadata } from "next";

/**
 * HOME — the brand, then the store opening up beneath it.
 *
 *   Hero            Experience  the poster NEOGEN; on scroll it condenses into
 *                               the header's wordmark
 *   01 Explora      Quiet       the gateway: six doors into what exists
 *   02 Insignia     Dark        the three worlds, each resolving into commerce
 *   03 Colección    Dark→paper  eight areas, each shown by its entry product
 *   RETA            Impact      the object, resolving into RETA
 *   04 Por área     Area wash   a category's atmosphere and four more products
 *   GLOW            Impact      light, resolving into GLOW
 *   05 Evidencia    Quiet       counted, sourced, brief
 *   GHK-Cu          Impact      material, resolving into GHK-Cu
 *   06 Catálogo     Quiet       ten more products, then the whole catalogue
 *
 * brand → exploration → products → experience → discovery → trust → products.
 *
 * THE UI STAYS QUIET; THE PRODUCTS GET LOUD. Colour arrives in steps: the
 * neutral NEOGEN interface, then an area's own wash (never one beige for every
 * generic product), then a flagship world. RETA blue, GLOW amber and GHK-Cu
 * copper stay the strongest moments on the page.
 *
 * EVERYTHING IS READ FROM THE REGISTRIES (`server/home`): counts, prices,
 * presentations, the products on every shelf and the rule that picked them.
 * Media is what exists — the approved studio stills and, where none exists,
 * the drawn product object. No badge, review, discount, stock level or claim
 * appears anywhere. Atlas is V2 and is not linked.
 *
 * Two structural rules from the reference set still hold: only Quiet sections
 * are numbered, and no two Impact sections are adjacent.
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
  const from = dict.products.catalog.from;
  const path = (to: string) => localizePath(to, locale);

  const data = await homeData(locale);
  const areaLabel = (id: keyof typeof dict.discovery.areas) => dict.discovery.areas[id].short;

  const heroCopy: HeroCopy = { ...home.hero, ctaHref: path(routes.products) };

  /*
   * WHERE EACH EXPERIENCE MOMENT RESOLVES: the product itself — name, range,
   * price and one action into its page — read from the same registry data as
   * every shelf.
   */
  const commerceFor = (world: WorldId, cta: string) => {
    const p = data.flagships.find((item) => item.world === world);
    if (!p) return null;
    return { name: p.name, range: p.range, price: p.price, priceFrom: from, href: p.href, cta };
  };
  const retaCommerce = commerceFor("reta", home.reta.cta);
  const glowProduct = commerceFor("glow", home.glow.cta);
  const ghkProduct = commerceFor("ghk-cu", home.ghkcu.cta);

  /*
   * RETA's facts: labelled, plain, and read from the registry — its area, its
   * pack, every presentation with its own price.
   */
  const reta = data.flagships.find((item) => item.world === "reta");
  const facts = home.reta.facts;
  const retaArea = reta?.primaryArea ? dict.discovery.areas[reta.primaryArea].short : null;
  const retaCopy: RetaExperienceCopy = {
    eyebrow: home.reta.eyebrow,
    title: home.reta.title,
    subtitle: reta?.name ?? home.reta.subtitle,
    lede: home.reta.lede,
    facts: [
      [
        {
          label: facts.what.label,
          title: facts.what.title,
          body: (reta?.pack ? facts.what.body : facts.what.bodyNoPack)
            .replace("{area}", retaArea ?? "")
            .replace("{pack}", String(reta?.pack ?? "")),
        },
        { label: facts.packaging.label, title: facts.packaging.title, body: facts.packaging.body },
      ],
      [
        {
          label: facts.presentations.label,
          title: facts.presentations.title.replace("{n}", String(reta?.ladder.length ?? 0)),
          ladder: reta?.ladder ?? [],
        },
        {
          label: facts.documentation.label,
          title: facts.documentation.title,
          body: facts.documentation.body,
        },
      ],
    ],
    commerce: retaCommerce ?? undefined,
    vialAlt: home.reta.vialAlt,
    loadingLabel: home.reta.loadingLabel,
    staticLabel: home.reta.staticLabel,
  };

  const catalogPath = path(routes.products);

  return (
    <>
      <Hero copy={heroCopy} />

      <HomeGateway
        copy={home.gateway}
        data={{
          counts: data.counts,
          lowestPrice: data.lowestPrice,
          productsImage: data.catalogFace?.image ?? null,
          productsFallback: data.catalogFace
            ? {
                name: data.catalogFace.name,
                range: data.catalogFace.range,
                areaId: data.catalogFace.areaId,
              }
            : null,
          areas: data.areas.map((area) => ({
            id: area.id,
            label: areaLabel(area.id),
            count: area.count,
            href: area.href,
          })),
          worlds: data.flagships.map((f) => ({
            world: f.world,
            label: getWorld(f.world).label,
            name: f.name,
            range: f.range,
            href: f.href,
            price: f.price,
            image: f.image,
          })),
          /* Real searches: each area's entry compound, straight to its results. */
          suggestions: [
            ...new Set(
              data.areas.flatMap((area) =>
                area.entry && !area.entry.world ? [area.entry.name] : [],
              ),
            ),
          ]
            .slice(0, 6)
            .map((name) => ({ label: name, href: `${catalogPath}?q=${encodeURIComponent(name)}` })),
          strengths: data.strengths.map((label) => ({
            label,
            href: `${catalogPath}?q=${encodeURIComponent(label)}`,
          })),
          recentReferences: data.recentReferences,
          links: {
            catalog: catalogPath,
            areas: "#coleccion",
            research: data.links.research,
            explorer: data.links.explorer,
          },
        }}
      />

      <WorldBand
        copy={{
          index: home.worlds.index,
          label: home.worlds.label,
          title: home.worlds.title,
          lede: home.worlds.lede,
          action: home.worlds.action,
          actionHref: catalogPath,
          from,
        }}
        panels={data.flagships.map((f) => ({
          world: f.world,
          brand: getWorld(f.world).label,
          worldLabel: home.products.worldLabels[f.world],
          tagline: home.worlds.taglines[f.world],
          name: f.name,
          href: f.href,
          range: f.range,
          price: f.price,
          image: f.image,
        }))}
      />

      <AreaShelf
        id="coleccion"
        allHref={catalogPath}
        areas={data.areas.map((area) => ({
          id: area.id,
          href: area.href,
          label: areaLabel(area.id),
          count: area.count,
          entry: area.entry ? { name: area.entry.name, range: area.entry.range } : null,
          price: area.entry?.price ?? null,
        }))}
        copy={{
          index: home.collection.index,
          label: home.collection.label,
          title: home.collection.title
            .replace("{n}", String(data.counts.products))
            .replace("{areas}", String(data.counts.areas)),
          count: home.collection.count,
          from,
          all: home.collection.action,
        }}
      />

      {/* Impact — the object, resolving into RETA. */}
      <RetaExperience copy={retaCopy} />

      <AreaExplorer
        copy={{ ...home.explorer, cta: home.products.cta }}
        areas={data.areas.map((area) => ({
          id: area.id,
          short: areaLabel(area.id),
          title: dict.discovery.areas[area.id].title,
          body: dict.discovery.areas[area.id].body,
          href: area.href,
          count: area.count,
          price: area.entry?.price ?? null,
          products: area.shelf.map((p) => ({
            slug: p.slug,
            name: p.name,
            href: p.href,
            world: p.world,
            range: p.range,
            presentations: p.presentations,
            price: p.price,
          })),
        }))}
      />

      {/* Impact — light, resolving into GLOW. */}
      {glowProduct ? (
        <GlowMoment
          copy={{
            eyebrow: home.glow.eyebrow,
            statement: home.glow.statement,
            body: home.glow.body,
            product: glowProduct,
          }}
        />
      ) : null}

      <ScienceBand
        index={home.science.index}
        label={home.science.label}
        title={home.science.title}
        lede={home.science.lede}
        stats={[
          { value: data.counts.profiles, label: home.science.profiles },
          { value: data.counts.references, label: home.science.references },
          { value: data.counts.areas, label: home.science.areas },
        ]}
        actions={[
          { href: data.links.research, label: home.science.action },
          ...(data.links.references
            ? [{ href: data.links.references, label: home.science.referencesAction }]
            : []),
        ]}
      />

      {/* Impact — material, resolving into GHK-Cu. */}
      {ghkProduct ? (
        <MaterialMoment
          copy={{
            eyebrow: home.ghkcu.eyebrow,
            statement: home.ghkcu.statement,
            body: home.ghkcu.body,
            product: ghkProduct,
          }}
        />
      ) : null}

      <ClosingShelf
        copy={{ ...home.closing, from, cta: home.products.cta }}
        items={data.closing}
        areaLabels={Object.fromEntries(data.areas.map((a) => [a.id, areaLabel(a.id)]))}
        counts={data.counts}
        href={catalogPath}
      />
    </>
  );
}
