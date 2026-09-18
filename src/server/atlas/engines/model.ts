import "server-only";

import {
  atlasGenerationSchema,
  validateAtlasGeneration,
  type AtlasAdvisorEngine,
  type AtlasGeneration,
  type AtlasValidationContext,
} from "@/domain/atlas";

import { ATLAS_SYSTEM, buildAtlasInput } from "../prompt";

import type { AdvisorProvider } from "@/advisor";
import type { Dictionary } from "@/i18n/types";

/**
 * THE MODEL ENGINE — an `AtlasAdvisorEngine` over whichever adapter
 * `@/advisor` configures. Provider-independent: it speaks the adapter's
 * `generate` contract, never a vendor SDK.
 *
 * It sends the engine input — the AI-context projection, the policy's
 * signals, the constraints and the retrieved candidates — and accepts only a
 * generation that passes the validator. One correction is attempted when the
 * first answer came back quickly enough for another to fit inside the route's
 * limit; otherwise it returns null and the caller falls back to the composer.
 */

const MAX_TOKENS = 16_000;
const RETRY_WITHIN_MS = 22_000;

export function createModelEngine(deps: {
  advisor: AdvisorProvider;
  dict: Dictionary;
  productName: (slug: string) => string;
  validation: Omit<AtlasValidationContext, "retrieval" | "constraints">;
}): AtlasAdvisorEngine {
  const { advisor } = deps;
  return {
    id: `model:${advisor.id}`,
    async advise(input) {
      const context: AtlasValidationContext = {
        ...deps.validation,
        retrieval: input.retrieval,
        constraints: input.constraints,
      };
      const started = Date.now();
      const request = {
        system: ATLAS_SYSTEM,
        input: buildAtlasInput({
          context: input.context,
          narrative: input.narrative,
          constraints: input.constraints,
          retrieval: input.retrieval,
          locale: input.locale,
          dict: deps.dict,
          productName: deps.productName,
        }),
        schema: atlasGenerationSchema,
        maxTokens: MAX_TOKENS,
      };

      let generation: AtlasGeneration | null = null;
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
          input.policy.id,
          second.ok ? second.usage : null,
          attempts,
          second.ok ? issues.map((i) => i.code) : [second.error.code],
        );
      }
      if (attempts === 1) {
        log(
          advisor.id,
          input.policy.id,
          first.ok ? first.usage : null,
          attempts,
          first.ok ? issues.map((i) => i.code) : [first.error.code],
        );
      }
      return { generation, mode: generation ? "ai" : "catalogue" };
    },
  };
}

/**
 * Cost and quality telemetry — token counts and issue CODES only. Never the
 * visitor's answers, never the model's text.
 */
function log(
  provider: string,
  policy: string,
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number } | null,
  attempts: number,
  issues: readonly string[],
) {
  console.info(
    JSON.stringify({
      event: "atlas.generation",
      provider,
      policy,
      attempts,
      usage,
      issues: [...new Set(issues)],
    }),
  );
}
