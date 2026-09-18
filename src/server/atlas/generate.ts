import "server-only";

import { activeAdvisor } from "@/advisor";
import { publishedProducts } from "@/data/catalog";
import { publicAreas } from "@/data/discovery";
import {
  ACTIVE_ATLAS_POLICY,
  applyAtlasPolicy,
  buildAtlasProfile,
  createComposerEngine,
  retrieveAtlas,
  type AtlasAdvisorEngine,
  type AtlasAdvisorPolicy,
  type AtlasAnswers,
  type AtlasEngineInput,
  type AtlasGeneration,
  type AtlasMode,
  type AtlasQuestionnaireView,
  type AtlasResultView,
} from "@/domain/atlas";
import { relatedAreas } from "@/domain/discovery";
import { publicEvidenceIndex } from "@/domain/quality";
import { getDictionary } from "@/i18n/getDictionary";
import { bagEnabled } from "@/payments";

import { assembleAtlasView } from "./assemble";
import { createModelEngine } from "./engines/model";
import { atlasSubjects } from "./subjects";

import type { Locale } from "@/i18n/config";

/**
 * ONE ATLAS REQUEST, LAYER BY LAYER.
 *
 *   transmitted answers                 (privacy.ts decided what crossed)
 *   → AtlasProfile, scope "server"      every field present; untransmitted
 *                                        ones marked not-received
 *   → advisor policy over projections   ACTIVE_ATLAS_POLICY
 *   → candidate retrieval               registry facts, reasons, evidence ids
 *   → advisor engine                    model if configured, else composer;
 *                                        a model result that fails validation
 *                                        falls back to the composer
 *   → assembly                          registry facts joined to the text
 *
 * Swapping the policy or the engine changes one argument here; the
 * questionnaire, the profile, retrieval and the result UI stay as they are.
 */
export async function generateAtlas(
  questionnaire: AtlasQuestionnaireView,
  answers: AtlasAnswers,
  locale: Locale,
  policy: AtlasAdvisorPolicy = ACTIVE_ATLAS_POLICY,
): Promise<AtlasResultView> {
  const [dict, es, en, subjects] = await Promise.all([
    getDictionary(locale),
    getDictionary("es"),
    getDictionary("en"),
    atlasSubjects(),
  ]);

  const profile = buildAtlasProfile(questionnaire, answers, "server");
  const decision = applyAtlasPolicy(profile, policy);
  const publicEvidence = publicEvidenceIndex(publishedProducts).length > 0;
  const retrieval = retrieveAtlas(decision.selection, subjects, {
    relatedAreas: (id) => relatedAreas(id).map((related) => related.area.id),
    publicEvidence,
  });

  const nameBySlug = new Map(publishedProducts.map((p) => [p.slug, p.name]));
  const productName = (slug: string) => nameBySlug.get(slug) ?? slug;
  const topicLabel = (id: string) =>
    dict.discovery.areas[id as keyof typeof dict.discovery.areas]?.short ?? id;

  const composer = createComposerEngine({
    copy: dict.atlas.compose,
    topicLabel,
    destinationLabel: (d) =>
      d.kind === "area"
        ? topicLabel(d.ref)
        : d.kind === "product"
          ? productName(d.ref)
          : dict.atlas.destinations[d.kind],
    mode: process.env.NODE_ENV === "production" ? "catalogue" : "development",
  });
  const advisor = activeAdvisor();
  const engine: AtlasAdvisorEngine = advisor.isConfigured()
    ? createModelEngine({
        advisor,
        dict,
        productName,
        validation: {
          catalogue: publishedProducts.map((p) => ({ slug: p.slug, name: p.name })),
          approvedLabels: publicAreas().flatMap((area) => [
            es.discovery.areas[area.id].short,
            es.discovery.areas[area.id].title,
            en.discovery.areas[area.id].short,
            en.discovery.areas[area.id].title,
          ]),
        },
      })
    : composer;

  const input: AtlasEngineInput = {
    locale,
    policy: decision.policy,
    context: decision.context,
    narrative: decision.narrative,
    constraints: decision.constraints,
    retrieval,
  };

  let generation: AtlasGeneration | null = null;
  let mode: AtlasMode = "catalogue";
  let engineId = engine.id;
  if (retrieval.candidates.length > 0) {
    const out = await engine.advise(input);
    generation = out.generation;
    mode = out.mode;
    if (!generation && engine !== composer) {
      /* The model failed validation: the registry map, labelled as such. */
      generation = (await composer.advise(input)).generation;
      mode = "catalogue";
      engineId = `${engine.id}→${composer.id}`;
    }
  }

  return assembleAtlasView({
    generation: generation ?? {
      headline: "",
      summary: "",
      aboutYou: "",
      start: [],
      more: [],
      topics: [],
      nextSteps: [],
      tips: [],
      contextMentionsHealth: false,
    },
    mode,
    engine: engineId,
    decision,
    retrieval,
    locale,
    dict,
    publicEvidence,
    bagEnabled: bagEnabled(),
  });
}
