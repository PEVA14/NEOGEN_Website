import "server-only";

import { activeAdvisor } from "@/advisor";
import { publishedProducts } from "@/data/catalog";
import { publicAreas } from "@/data/discovery";
import {
  applyAtlasPolicy,
  atlasGenerationSchema,
  composeAtlasGeneration,
  planAtlas,
  retrieveAtlas,
  validateAtlasGeneration,
  type AtlasGeneration,
  type AtlasMode,
  type AtlasProfile,
  type AtlasResultView,
  type AtlasValidationContext,
} from "@/domain/atlas";
import { relatedAreas } from "@/domain/discovery";
import { publicEvidenceIndex } from "@/domain/quality";
import { getDictionary } from "@/i18n/getDictionary";
import { bagEnabled } from "@/payments";

import { assembleAtlasView } from "./assemble";
import { ATLAS_SYSTEM, buildAtlasInput } from "./prompt";
import { atlasSubjects } from "./subjects";

import type { Locale } from "@/i18n/config";

/**
 * ONE ATLAS REQUEST, END TO END.
 *
 *   profile → POLICY → selection signals → retrieval → (model | plan)
 *           → validation against the policy's constraints → assembly
 *
 * The profile is handed to the policy and to nothing else. The retry budget is
 * time-boxed: a correction is attempted only if the first answer came back
 * quickly enough for another to fit inside the route's limit.
 */

const MAX_TOKENS = 16_000;
const RETRY_WITHIN_MS = 22_000;

export async function generateAtlas(
  profile: AtlasProfile,
  locale: Locale,
): Promise<AtlasResultView> {
  const [dict, es, en, subjects] = await Promise.all([
    getDictionary(locale),
    getDictionary("es"),
    getDictionary("en"),
    atlasSubjects(),
  ]);

  const decision = applyAtlasPolicy(profile);
  const publicEvidence = publicEvidenceIndex(publishedProducts).length > 0;
  const retrieval = retrieveAtlas(decision.selection, subjects, {
    relatedAreas: (id) => relatedAreas(id).map((related) => related.area.id),
    publicEvidence,
  });

  const nameBySlug = new Map(publishedProducts.map((p) => [p.slug, p.name]));
  const productName = (slug: string) => nameBySlug.get(slug) ?? slug;
  const topicLabel = (id: string) =>
    dict.discovery.areas[id as keyof typeof dict.discovery.areas]?.short ?? id;

  const context: AtlasValidationContext = {
    retrieval,
    constraints: decision.constraints,
    catalogue: publishedProducts.map((p) => ({ slug: p.slug, name: p.name })),
    approvedLabels: publicAreas().flatMap((area) => [
      es.discovery.areas[area.id].short,
      es.discovery.areas[area.id].title,
      en.discovery.areas[area.id].short,
      en.discovery.areas[area.id].title,
    ]),
  };

  const compose = () =>
    composeAtlasGeneration({
      narrative: decision.narrative,
      retrieval,
      plan: planAtlas(retrieval, decision.constraints),
      topicLabel,
      destinationLabel: (d) =>
        d.kind === "area"
          ? topicLabel(d.ref)
          : d.kind === "product"
            ? productName(d.ref)
            : dict.atlas.destinations[d.kind],
      copy: dict.atlas.compose,
    });

  let generation: AtlasGeneration | null = null;
  let mode: AtlasMode;

  const advisor = activeAdvisor();
  if (retrieval.candidates.length === 0) {
    mode = "catalogue";
  } else if (advisor.isConfigured()) {
    const started = Date.now();
    const request = {
      system: ATLAS_SYSTEM,
      input: buildAtlasInput({
        narrative: decision.narrative,
        constraints: decision.constraints,
        retrieval,
        locale,
        dict,
        productName,
      }),
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
        second.ok ? issues.map((i) => i.code) : [second.error.code],
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
            headline: "",
            summary: "",
            aboutYou: "",
            start: [],
            more: [],
            topics: [],
            nextSteps: [],
            tips: [],
            contextMentionsHealth: false,
          }
        : compose();
  }

  return assembleAtlasView({
    generation,
    mode,
    decision,
    retrieval,
    locale,
    dict,
    publicEvidence,
    bagEnabled: bagEnabled(),
  });
}

/**
 * Cost and quality telemetry — token counts and issue CODES only. Never the
 * visitor's answers, never the model's text.
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
