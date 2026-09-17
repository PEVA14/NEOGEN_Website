import type { z } from "zod";

/**
 * THE ADVISOR CONTRACT — the only model-shaped thing the application sees.
 *
 * Mirrors `src/payments`: one interface, one adapter per provider under
 * `./adapters`, a registry where the first CONFIGURED adapter wins, and a
 * terminal `none` adapter that never configures. Switching provider or model
 * adds an adapter and touches nothing in Atlas — no route, no prompt builder,
 * no validator, no component names a provider.
 *
 * A request is text in, schema-typed data out. The caller supplies the schema;
 * the adapter's whole job is to get a response the schema parses, and to
 * translate a provider's failure vocabulary into the stable codes below.
 */

export type AdvisorErrorCode =
  /** No provider configured. */
  | "unavailable"
  /** The provider's safety systems declined the request. */
  | "refused"
  /** The response hit the output token limit before finishing. */
  | "truncated"
  /** The response did not parse against the requested schema. */
  | "invalid_output"
  /** Authentication, rate limit, outage or network failure. */
  | "provider_error";

export interface AdvisorError {
  code: AdvisorErrorCode;
  /** Server-side diagnostic only. Never shown to a reader. */
  message: string;
}

export interface AdvisorUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

export interface AdvisorRequest<T> {
  /** Stable instructions. Kept byte-identical across requests so it can cache. */
  system: string;
  /** This request's data. */
  input: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  /**
   * A second attempt after validation failed: the previous output and what was
   * wrong with it. The adapter replays them as conversation turns.
   */
  correction?: { previous: string; issues: readonly string[] };
}

export type AdvisorResult<T> =
  | { ok: true; data: T; raw: string; model: string; usage: AdvisorUsage }
  | { ok: false; error: AdvisorError };

export interface AdvisorProvider {
  readonly id: string;
  isConfigured(): boolean;
  generate<T>(request: AdvisorRequest<T>): Promise<AdvisorResult<T>>;
}
