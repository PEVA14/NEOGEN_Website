import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import type { AdvisorProvider, AdvisorRequest, AdvisorResult } from "../types";

/**
 * THE ANTHROPIC ADAPTER, without its environment.
 *
 * Configuration arrives through a function, read on every call, so the
 * server-only wrapper (`./anthropic`) can source it from `process.env` while
 * `check:atlas` drives the same code with a fake transport and asserts the
 * exact request that would reach the API. Nothing here reads the environment
 * or imports `server-only`; nothing here is safe to import into a client
 * component either, and nothing does.
 *
 * WHY THESE SETTINGS.
 *
 *   Structured output (`output_config.format`) constrains the response to the
 *   caller's schema, so a parse failure is rare rather than routine. The caller
 *   still validates against the catalogue — a schema cannot know which slugs
 *   exist.
 *
 *   Adaptive thinking at `medium` effort by default. A research map is a
 *   composition task over a small, fully specified context; `medium` keeps
 *   latency and output spend down without disabling thinking outright.
 *
 *   `fallbacks: "default"`. A research-compound catalogue can occasionally trip
 *   a safety classifier on ordinary catalogue text. The server-side fallback
 *   re-runs a declined request on Anthropic's recommended substitute instead of
 *   handing a refusal to a reader.
 *
 *   The system prompt carries `cache_control`, so repeated generations reuse
 *   the instruction prefix where the model's minimum cacheable length allows.
 */

export const ANTHROPIC_DEFAULT_MODEL = "claude-opus-5";
export const ANTHROPIC_FALLBACK_BETA = "server-side-fallback-2026-07-01";

const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
type Effort = (typeof EFFORTS)[number];

type ClientOptions = NonNullable<ConstructorParameters<typeof Anthropic>[0]>;

export interface AnthropicAdvisorConfig {
  apiKey: string | undefined;
  model?: string;
  effort?: string;
  fetch?: ClientOptions["fetch"];
  timeoutMs?: number;
  maxRetries?: number;
}

export function createAnthropicAdvisor(config: () => AnthropicAdvisorConfig): AdvisorProvider {
  return {
    id: "anthropic",

    isConfigured: () => Boolean(config().apiKey),

    async generate<T>(request: AdvisorRequest<T>): Promise<AdvisorResult<T>> {
      const settings = config();
      const client = new Anthropic({
        apiKey: settings.apiKey,
        // The route allows 60s; one attempt plus a time-boxed correction fits.
        timeout: settings.timeoutMs ?? 25_000,
        maxRetries: settings.maxRetries ?? 1,
        ...(settings.fetch ? { fetch: settings.fetch } : {}),
      });
      const model = settings.model || ANTHROPIC_DEFAULT_MODEL;
      const effort: Effort = EFFORTS.includes(settings.effort as Effort)
        ? (settings.effort as Effort)
        : "medium";

      const messages: Anthropic.Beta.BetaMessageParam[] = [
        { role: "user", content: request.input },
      ];
      if (request.correction) {
        messages.push(
          { role: "assistant", content: request.correction.previous },
          {
            role: "user",
            content: [
              "That output failed validation against the NEOGEN catalogue. Return the full JSON again with these problems fixed and nothing else changed:",
              ...request.correction.issues.map((issue) => `- ${issue}`),
            ].join("\n"),
          },
        );
      }

      try {
        const response = await client.beta.messages.create({
          model,
          max_tokens: request.maxTokens,
          betas: [ANTHROPIC_FALLBACK_BETA],
          fallbacks: "default",
          system: [{ type: "text", text: request.system, cache_control: { type: "ephemeral" } }],
          thinking: { type: "adaptive" },
          output_config: { effort, format: betaZodOutputFormat(request.schema) },
          messages,
        });

        if (response.stop_reason === "refusal") {
          return {
            ok: false,
            error: { code: "refused", message: "The model declined the request." },
          };
        }
        if (response.stop_reason === "max_tokens") {
          return { ok: false, error: { code: "truncated", message: "Output hit max_tokens." } };
        }

        const raw = response.content
          .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
          .map((block) => block.text)
          .join("");

        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          return {
            ok: false,
            error: { code: "invalid_output", message: "Response was not JSON." },
          };
        }
        const parsed = request.schema.safeParse(json);
        if (!parsed.success) {
          return { ok: false, error: { code: "invalid_output", message: parsed.error.message } };
        }

        return {
          ok: true,
          data: parsed.data,
          raw,
          model: response.model,
          usage: {
            inputTokens:
              response.usage.input_tokens + (response.usage.cache_creation_input_tokens ?? 0),
            outputTokens: response.usage.output_tokens,
            cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
          },
        };
      } catch (error) {
        if (error instanceof Anthropic.AuthenticationError) {
          return {
            ok: false,
            error: { code: "provider_error", message: "Authentication failed." },
          };
        }
        if (error instanceof Anthropic.RateLimitError) {
          return { ok: false, error: { code: "provider_error", message: "Rate limited." } };
        }
        if (error instanceof Anthropic.APIError) {
          return {
            ok: false,
            error: { code: "provider_error", message: `API error ${error.status ?? "?"}` },
          };
        }
        return {
          ok: false,
          error: {
            code: "provider_error",
            message: error instanceof Error ? error.message : "Unknown failure.",
          },
        };
      }
    },
  };
}
