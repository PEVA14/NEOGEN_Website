import "server-only";

import { routes } from "@/config/routes";
import { publicOverview } from "@/content/overview";
import { REFERENCES, referenceHref } from "@/content/references";
import { referencesForProduct } from "@/content/research";
import { formatStrength, presentationRange, publishedProducts } from "@/data/catalog";
import { formatPrice } from "@/data/commerce";
import { getArea } from "@/data/discovery";
import { atlasRecap, buildAtlasLedger } from "@/domain/atlas";
import { publicEvidenceIndex } from "@/domain/quality";
import { localeTags, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";

import type {
  AtlasCandidate,
  AtlasAnswers,
  AtlasDestination,
  AtlasGeneration,
  AtlasMode,
  AtlasPickList,
  AtlasPolicyDecision,
  AtlasQuestionnaireView,
  AtlasResultProduct,
  AtlasResultSum,
  AtlasResultView,
  AtlasRetrieval,
} from "@/domain/atlas";
import type { DiscoveryAreaId } from "@/data/discovery";
import type { Dictionary } from "@/i18n/types";

/**
 * ASSEMBLY — where written text meets registry facts.
 *
 * The generation contributes identifiers and prose. Everything a visitor could
 * act on — a name, a price, a presentation, a documentation state, a link, a
 * bag line — is read here from the registries, by identifiers the validator
 * has already confirmed. The policy decision contributes the page's
 * personalisation; the questionnaire and the answers contribute the ledger and
 * the recap, so the result page needs no knowledge of today's questions.
 * Nothing here decides what to recommend.
 */
export function assembleAtlasView({
  generation,
  mode,
  decision,
  questionnaire,
  answers,
  retrieval,
  locale,
  dict,
  publicEvidence,
  bagEnabled,
}: {
  generation: AtlasGeneration;
  mode: AtlasMode;
  decision: AtlasPolicyDecision;
  questionnaire: AtlasQuestionnaireView;
  answers: AtlasAnswers;
  retrieval: AtlasRetrieval;
  locale: Locale;
  dict: Dictionary;
  publicEvidence: boolean;
  bagEnabled: boolean;
}): AtlasResultView {
  const tag = localeTags[locale];
  const path = (to: string) => localizePath(to, locale);
  const money = (amount: number | null) =>
    amount === null ? null : formatPrice({ amount, currency: "MXN" }, tag);
  const areaCopy = (id: DiscoveryAreaId) => dict.discovery.areas[id];

  const bySlug = new Map(publishedProducts.map((p) => [p.slug, p]));
  const offered = new Map<string, AtlasCandidate>(
    [...retrieval.candidates, ...retrieval.supplies].map((c) => [c.slug, c]),
  );
  const supplySlugs = new Set(retrieval.supplies.map((s) => s.slug));

  /* Sourced statements only: publicOverview drops anything unapproved or unreferenced. */
  const researchView = (slug: string): AtlasResultProduct["research"] => {
    const overview = publicOverview(slug, locale);
    const mechanism = overview?.mechanismNotes[0]?.text ?? null;
    const studied = overview?.researchContext[0]?.text ?? null;
    if (!mechanism && !studied) return null;
    return {
      mechanism,
      studied,
      sources: referencesForProduct(slug).length,
      href: `${path(routes.product(slug))}#overview-title`,
    };
  };

  const productView = (
    candidate: AtlasCandidate,
    list: AtlasPickList,
    why: string | null,
  ): AtlasResultProduct => {
    const product = bySlug.get(candidate.slug)!;
    const variant = product.variants.find((v) => v.id === candidate.suggestedVariantId);
    return {
      slug: candidate.slug,
      name: product.name,
      href: path(routes.product(candidate.slug)),
      list,
      why,
      inMind: candidate.inMind,
      world: product.world,
      worldLabel: product.world ? dict.home.products.worldLabels[product.world] : null,
      areas: candidate.areas.map((id) => ({ id, label: areaCopy(id).short })),
      bridges: candidate.bridges,
      classification: dict.products.catalog.categoryLabels[product.category],
      presentationRange: presentationRange(product),
      presentations: product.variants.length,
      entryPrice: money(candidate.entryPrice),
      suggestion:
        variant && candidate.suggestedPrice !== null
          ? {
              variantId: variant.id,
              presentation: formatStrength(variant.strength),
              price: { amount: candidate.suggestedPrice, currency: "MXN" },
              priceLabel: money(candidate.suggestedPrice)!,
            }
          : null,
      withinBudget: candidate.withinBudget,
      documented: candidate.documented,
      research: researchView(candidate.slug),
    };
  };

  const pick = (list: "start" | "more") => (entry: { slug: string; why: string }) => {
    const candidate = offered.get(entry.slug);
    if (!candidate) return null;
    return productView(candidate, supplySlugs.has(entry.slug) ? "supply" : list, entry.why);
  };
  const picked = [
    ...generation.start.map(pick("start")),
    ...generation.more.map(pick("more")),
  ].filter((p): p is AtlasResultProduct => p !== null);
  const start = picked.filter((p) => p.list === "start");
  const more = picked.filter((p) => p.list === "more");
  const supplies = picked.filter((p) => p.list === "supply");
  /* Supplies the visitor asked for still appear when the text left them out. */
  for (const supply of retrieval.supplies) {
    if (!supplies.some((s) => s.slug === supply.slug)) {
      supplies.push(productView(supply, "supply", null));
    }
  }

  const noteByTopic = new Map(generation.topics.map((t) => [t.areaId, t.note]));
  const topics = retrieval.areas.map((stat) => ({
    id: stat.id,
    rank: stat.rank,
    label: areaCopy(stat.id).short,
    framing: areaCopy(stat.id).title,
    href: path(routes.area(getArea(stat.id).slug)),
    compounds: stat.compounds,
    entryPrice: money(stat.entryPrice),
    note: noteByTopic.get(stat.id) ?? null,
  }));

  const destinationById = new Map(retrieval.destinations.map((d) => [d.id, d]));
  const destinationHref = (d: AtlasDestination): string => {
    switch (d.kind) {
      case "area":
        return path(routes.area(getArea(d.ref as DiscoveryAreaId).slug));
      case "product":
        return path(routes.product(d.ref));
      case "catalogue":
        return path(routes.products);
      case "research-index":
        return `${path(routes.research)}#indice`;
      case "quality-model":
        return `${path(routes.research)}#calidad`;
      case "explorer":
        return path(routes.qualityExplorer);
    }
  };
  const destinationLabel = (d: AtlasDestination): string =>
    d.kind === "area"
      ? areaCopy(d.ref as DiscoveryAreaId).short
      : d.kind === "product"
        ? (bySlug.get(d.ref)?.name ?? d.ref)
        : dict.atlas.destinations[d.kind];
  const nextSteps = generation.nextSteps.flatMap((step) => {
    const destination = destinationById.get(step.destinationId);
    return destination
      ? [
          {
            id: destination.id,
            kind: destination.kind,
            label: destinationLabel(destination),
            href: destinationHref(destination),
            note: step.note,
          },
        ]
      : [];
  });

  /* Budget: sums of suggested presentations, read from the registry. */
  const cap = retrieval.budgetCap;
  const sum = (items: readonly AtlasResultProduct[]): AtlasResultSum => {
    const priced = items.length > 0 && items.every((p) => p.suggestion !== null);
    const amount = priced ? items.reduce((t, p) => t + p.suggestion!.price.amount, 0) : null;
    return {
      count: items.length,
      amount,
      label: money(amount),
      fits: cap === null || amount === null ? null : amount <= cap,
    };
  };

  /* The three strings the ledger needs that are not a question's own words. */
  const ledgerCopy = {
    yes: dict.atlas.result.ledger.yes,
    no: dict.atlas.result.ledger.no,
    noteGiven: dict.atlas.result.ledger.noteGiven,
  };

  const resultProducts = [...start, ...more, ...supplies]
    .map((p) => bySlug.get(p.slug))
    .filter((p) => p !== undefined);

  return {
    mode,
    firstName: decision.presentation.firstName,
    style: decision.presentation.style,
    returning: decision.presentation.history === "returning",
    headline: generation.headline,
    summary: generation.summary,
    aboutYou: generation.aboutYou,
    start,
    more,
    supplies,
    topics,
    nextSteps,
    tips: generation.tips,
    budget: {
      cap: money(cap),
      capAmount: cap,
      start: sum(start),
      all: sum([...start, ...more]),
    },
    poolSize: retrieval.poolSize,
    candidateCount: retrieval.candidates.length,
    notices: {
      noteDiscarded: decision.noteDiscarded,
      healthMentioned: generation.contextMentionsHealth && !decision.noteDiscarded,
    },
    ledger: buildAtlasLedger(questionnaire, answers, ledgerCopy, decision.noteDiscarded),
    recap: atlasRecap(questionnaire, answers, ledgerCopy),
    references: retrieval.referenceIds
      .map((id) => REFERENCES.find((ref) => ref.id === id))
      .filter((ref) => ref !== undefined)
      .map((ref) => ({ id: ref.id, title: ref.title, href: referenceHref(ref) })),
    documentation: {
      publicRecords: publicEvidenceIndex(resultProducts).length,
      modelHref: `${path(routes.research)}#calidad`,
      explorerHref: publicEvidence ? path(routes.qualityExplorer) : null,
    },
    commerce: { bagEnabled, localeTag: tag },
  };
}
