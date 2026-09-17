import "server-only";

import { activeAdvisor } from "@/advisor";
import { publishedProducts } from "@/data/catalog";
import { publicAreas } from "@/data/discovery";
import {
  atlasGenerationSchema,
  composeAtlasGeneration,
  retrieveAtlas,
  validateAtlasGeneration,
  type AtlasAnswers,
  type AtlasGeneration,
  type AtlasMode,
  type AtlasResultView,
  type AtlasValidationContext,
} from "@/domain/atlas";
import { relatedAreas } from "@/domain/discovery";
import { publicEvidenceIndex } from "@/domain/quality";
import { getDictionary } from "@/i18n/getDictionary";

import { assembleAtlasView } from "./assemble";
import { buildAtlasInput, ATLAS_SYSTEM } from "./prompt";
import { atlasSubjects } from "./subjects";

import type { Locale } from "@/i18n/config";

/**
 * ONE ATLAS REQUEST, END TO END.
 *
 *   answers  →  subjects (registries)  →  retrieval  →  generation
 *            →  validation (one correction, then fall back)  →  assembly
 *
 * The retry budget is time-boxed: a second attempt is made only if the first
 * finished quickly enough for another to fit inside the route's limit, so a
 * slow provider degrades to the catalogue view rather than timing out.
 */

const MAX_TOKENS = 16_000;
/** Only retry after validation failed if the first attempt took less than this. */
const RETRY_WITHIN_MS = 22_000;

export async function generateAtlas(
  answers: AtlasAnswers,
  locale: Locale,
): Promise<AtlasResultView> {
  const [dict, es, en, subjects] = await Promise.all([
    getDictionary(locale),
    getDictionary("es"),
    getDictionary("en"),
    atlasSubjects(),
  ]);

  const publicEvidence = publicEvidenceIndex(publishedProducts).length > 0;
  const retrieval = retrieveAtlas(answers, subjects, {
    relatedAreas: (id) => relatedAreas(id).map((related) => related.area.id),
    publicEvidence,
  });

  const nameBySlug = new Map(publishedProducts.map((p) => [p.slug, p.name]));
  const productName = (slug: string) => nameBySlug.get(slug) ?? slug;
  const areaLabel = (id: string) =>
    dict.discovery.areas[id as keyof typeof dict.discovery.areas]?.short ?? id;

  const context: AtlasValidationContext = {
    answers,
    retrieval,
    catalogue: publishedProducts.map((p) => ({ slug: p.slug, name: p.name })),
    approvedLabels: publicAreas().flatMap((area) => [
      es.discovery.areas[area.id].short,
      es.discovery.areas[area.id].title,
      en.discovery.areas[area.id].short,
      en.discovery.areas[area.id].title,
    ]),
  };

  const compose = (mode: "development" | "catalogue") =>
    composeAtlasGeneration({
      answers,
      retrieval,
      areaLabel,
      destinationLabel: (d) =>
        d.kind === "area"
          ? areaLabel(d.ref)
          : d.kind === "product"
            ? productName(d.ref)
            : dict.atlas.destinations[d.kind],
      copy: dict.atlas.compose,
      mode,
    });

  let generation: AtlasGeneration | null = null;
  let mode: AtlasMode;

  const advisor = activeAdvisor();
  if (retrieval.candidates.length === 0) {
    /* Nothing matched — there is nothing to write about, and nothing to spend. */
    mode = "catalogue";
  } else if (advisor.isConfigured()) {
    const started = Date.now();
    const input = buildAtlasInput({ answers, retrieval, locale, dict, productName });
    const request = {
      system: ATLAS_SYSTEM,
      input,
      schema: atlasGenerationSchema,
      maxTokens: MAX_TOKENS,
    };

    const first = await advisor.generate(request);
    let attempts = 1;
    let issues = first.ok ? validateAtlasGeneration(first.data, context) : [];

    if (first.ok && issues.length === 0) {
      generation = first.data;
    } else if (first.ok && Date.now() - started < RETRY_WITHIN_MS) {
      const second = await advisor.generate({
        ...request,
        correction: {
          previous: first.raw,
          issues: issues.map((issue) => `${issue.path}: ${issue.code} (${issue.detail})`),
        },
      });
      attempts = 2;
      if (second.ok) {
        issues = validateAtlasGeneration(second.data, context);
        if (issues.length === 0) generation = second.data;
      }
      log(
        advisor.id,
        second.ok ? second.usage : null,
        attempts,
        issues.map((i) => i.code),
      );
    }
    if (attempts === 1) {
      log(
        advisor.id,
        first.ok ? first.usage : null,
        attempts,
        first.ok ? issues.map((i) => i.code) : [first.error.code],
      );
    }
    mode = generation ? "ai" : "catalogue";
  } else {
    mode = process.env.NODE_ENV === "production" ? "catalogue" : "development";
  }

  if (!generation) {
    generation =
      retrieval.candidates.length === 0
        ? {
            title: "",
            summary: "",
            areas: [],
            compounds: [],
            path: [],
            notes: [],
            contextMentionsHealth: false,
          }
        : compose(mode === "development" ? "development" : "catalogue");
  }

  return assembleAtlasView({ generation, mode, answers, retrieval, locale, dict, publicEvidence });
}

/**
 * Cost and quality telemetry — token counts and issue CODES only. Never the
 * reader's note, never the model's text.
 */
function log(
  provider: string,
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number } | null,
  attempts: number,
  issues: readonly string[],
) {
  console.info(
    JSON.stringify({
      event: "atlas.generation",
      provider,
      attempts,
      usage,
      issues: [...new Set(issues)],
    }),
  );
}
