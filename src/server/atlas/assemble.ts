import "server-only";

import { routes } from "@/config/routes";
import { REFERENCES, referenceHref } from "@/content/references";
import { presentationRange, publishedProducts } from "@/data/catalog";
import { formatPrice } from "@/data/commerce";
import { getArea } from "@/data/discovery";
import { publicEvidenceIndex } from "@/domain/quality";
import { localeTags, type Locale } from "@/i18n/config";
import { localizePath } from "@/i18n/routing";

import type {
  AtlasAnswers,
  AtlasCandidate,
  AtlasDestination,
  AtlasGeneration,
  AtlasMode,
  AtlasResultCompound,
  AtlasResultView,
  AtlasRetrieval,
} from "@/domain/atlas";
import type { DiscoveryAreaId } from "@/data/discovery";
import type { Dictionary } from "@/i18n/types";

/**
 * ASSEMBLY — where written text meets registry facts.
 *
 * The generation contributes identifiers and prose. Everything a reader could
 * act on — a name, a price, a presentation range, a documentation state, a
 * link — is read here from the registries, by the identifier the validator has
 * already confirmed exists. There is no path by which a model-written figure
 * reaches the page.
 */
export function assembleAtlasView({
  generation,
  mode,
  answers,
  retrieval,
  locale,
  dict,
  publicEvidence,
}: {
  generation: AtlasGeneration;
  mode: AtlasMode;
  answers: AtlasAnswers;
  retrieval: AtlasRetrieval;
  locale: Locale;
  dict: Dictionary;
  publicEvidence: boolean;
}): AtlasResultView {
  const tag = localeTags[locale];
  const path = (to: string) => localizePath(to, locale);
  const money = (amount: number | null) =>
    amount === null ? null : formatPrice({ amount, currency: "MXN" }, tag);
  const areaCopy = (id: DiscoveryAreaId) => dict.discovery.areas[id];

  const bySlug = new Map(publishedProducts.map((p) => [p.slug, p]));
  const candidateBySlug = new Map<string, AtlasCandidate>(
    [...retrieval.candidates, ...retrieval.materials].map((c) => [c.slug, c]),
  );
  const materialSlugs = new Set(retrieval.materials.map((m) => m.slug));

  const compoundView = (
    candidate: AtlasCandidate,
    role: AtlasResultCompound["role"],
    rationale: string | null,
  ): AtlasResultCompound => {
    const product = bySlug.get(candidate.slug)!;
    return {
      slug: candidate.slug,
      name: product.name,
      href: path(routes.product(candidate.slug)),
      role,
      rationale,
      world: product.world,
      worldLabel: product.world ? dict.home.products.worldLabels[product.world] : null,
      areas: candidate.areas.map((id) => ({ id, label: areaCopy(id).short })),
      bridges: candidate.bridges,
      classification: dict.products.catalog.categoryLabels[product.category],
      presentationRange: presentationRange(product),
      presentations: product.variants.length,
      entryPrice: money(candidate.entryPrice),
      entryAmount: candidate.entryPrice,
      withinBudget: candidate.withinBudget,
      documented: candidate.documented,
    };
  };

  const compounds: AtlasResultCompound[] = [];
  const materials: AtlasResultCompound[] = [];
  for (const entry of generation.compounds) {
    const candidate = candidateBySlug.get(entry.slug);
    if (!candidate) continue;
    if (materialSlugs.has(entry.slug)) {
      materials.push(compoundView(candidate, "material", entry.rationale));
    } else {
      compounds.push(compoundView(candidate, entry.role, entry.rationale));
    }
  }
  /* Materials the reader asked for still appear, even when the text did not mention them. */
  for (const material of retrieval.materials) {
    if (!materials.some((m) => m.slug === material.slug)) {
      materials.push(compoundView(material, "material", null));
    }
  }

  const rationaleByArea = new Map(generation.areas.map((a) => [a.areaId, a.rationale]));
  const areas = retrieval.areas.map((stat) => ({
    id: stat.id,
    rank: stat.rank,
    label: areaCopy(stat.id).short,
    framing: areaCopy(stat.id).title,
    href: path(routes.area(getArea(stat.id).slug)),
    compounds: stat.compounds,
    entryPrice: money(stat.entryPrice),
    rationale: rationaleByArea.get(stat.id) ?? null,
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

  const steps = generation.path
    .map((step) => ({ step, destination: destinationById.get(step.destinationId) }))
    .filter(
      (entry): entry is { step: (typeof generation.path)[number]; destination: AtlasDestination } =>
        entry.destination !== undefined,
    )
    .map(({ step, destination }) => ({
      id: destination.id,
      kind: destination.kind,
      label: destinationLabel(destination),
      href: destinationHref(destination),
      note: step.note,
    }));

  /* Budget: sums of entry presentations, read from the registry. */
  const sum = (items: readonly AtlasResultCompound[]) =>
    items.every((c) => c.entryAmount !== null) && items.length > 0
      ? items.reduce((total, c) => total + (c.entryAmount ?? 0), 0)
      : null;
  const core = compounds.filter((c) => c.role === "core");
  const coreAmount = sum(core);
  const allAmount = sum(compounds);
  const cap = retrieval.budgetCap;

  const mapProducts = [...compounds, ...materials]
    .map((c) => bySlug.get(c.slug))
    .filter((p) => p !== undefined);

  return {
    mode,
    title: generation.title,
    summary: generation.summary,
    areas,
    compounds,
    materials,
    path: steps,
    notes: generation.notes,
    budget: {
      budget: answers.budget,
      cap: money(cap),
      capAmount: cap,
      coreEntry: money(coreAmount),
      coreEntryAmount: coreAmount,
      coreCount: core.length,
      allEntry: money(allAmount),
      allEntryAmount: allAmount,
      allCount: compounds.length,
      fitsCore: cap === null || coreAmount === null ? null : coreAmount <= cap,
      fitsAll: cap === null || allAmount === null ? null : allAmount <= cap,
    },
    poolSize: retrieval.poolSize,
    candidateCount: retrieval.candidates.length,
    healthNotice: generation.contextMentionsHealth && !answers.contextScreened,
    contextScreened: answers.contextScreened,
    references: retrieval.referenceIds
      .map((id) => REFERENCES.find((ref) => ref.id === id))
      .filter((ref) => ref !== undefined)
      .map((ref) => ({ id: ref.id, title: ref.title, href: referenceHref(ref) })),
    documentation: {
      publicRecords: publicEvidenceIndex(mapProducts).length,
      modelHref: `${path(routes.research)}#calidad`,
      explorerHref: publicEvidence ? path(routes.qualityExplorer) : null,
    },
    inputs: {
      depth: answers.depth,
      focus: answers.focus,
      forms: answers.forms,
      includeMaterials: answers.includeMaterials,
    },
  };
}
