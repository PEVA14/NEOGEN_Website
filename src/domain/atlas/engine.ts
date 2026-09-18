import { composeAtlasGeneration } from "./compose";
import { planAtlas } from "./plan";

import type { AtlasComposeCopy } from "./compose";
import type { AtlasMode } from "./result";
import type { AtlasGeneration } from "./schema";
import type {
  AtlasConstraints,
  AtlasContextEntry,
  AtlasDestination,
  AtlasNarrativeSignals,
  AtlasRetrieval,
} from "./types";
import type { Locale } from "@/i18n/config";

/**
 * THE ADVISOR ENGINE — whatever writes the result, behind one interface.
 *
 * An engine receives exactly what the policy released and what retrieval
 * resolved, and nothing else:
 *
 *   context      the policy's AI-context projection, field by field, each with
 *                its category and sensitivity — never the profile
 *   narrative    the policy's derived signals (areas, levels, defaults marked)
 *   constraints  the rules the result must meet
 *   retrieval    specific candidate product ids with approved catalogue facts,
 *                approved evidence ids, supplies and destinations
 *
 * It returns an `AtlasGeneration` — identifiers and prose, nothing a reader
 * could act on — which the validator checks and the assembler joins to the
 * registries. Provider-independent: the model engine
 * (`server/atlas/engines/model.ts`) wraps whichever adapter `@/advisor`
 * configures; the composer below needs no provider at all. A new provider is a
 * new adapter; a new kind of engine is a new object with this shape. Neither
 * touches the policy, retrieval or the result UI.
 */

export interface AtlasEngineInput {
  locale: Locale;
  policy: { id: string; version: string };
  context: readonly AtlasContextEntry[];
  narrative: AtlasNarrativeSignals;
  constraints: AtlasConstraints;
  retrieval: AtlasRetrieval;
}

export interface AtlasEngineOutput {
  /** Null when the engine could not produce a result that validates. */
  generation: AtlasGeneration | null;
  mode: AtlasMode;
}

export interface AtlasAdvisorEngine {
  id: string;
  advise(input: AtlasEngineInput): Promise<AtlasEngineOutput>;
}

export interface AtlasComposerDeps {
  copy: AtlasComposeCopy;
  topicLabel: (id: string) => string;
  destinationLabel: (destination: AtlasDestination) => string;
  /** "development" on a local machine with no model; "catalogue" otherwise. */
  mode: Extract<AtlasMode, "development" | "catalogue">;
}

/** The registry-only engine: the deterministic plan, written from fixed copy. */
export function createComposerEngine(deps: AtlasComposerDeps): AtlasAdvisorEngine {
  return {
    id: "composer",
    async advise(input) {
      if (input.retrieval.candidates.length === 0) return { generation: null, mode: "catalogue" };
      return {
        generation: composeAtlasGeneration({
          narrative: input.narrative,
          retrieval: input.retrieval,
          plan: planAtlas(input.retrieval, input.constraints),
          topicLabel: deps.topicLabel,
          destinationLabel: deps.destinationLabel,
          copy: deps.copy,
        }),
        mode: deps.mode,
      };
    },
  };
}
