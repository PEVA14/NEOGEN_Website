import "server-only";

import { anthropicAdvisor } from "./adapters/anthropic";
import { noneAdvisor } from "./adapters/none";

import type { AdvisorProvider } from "./types";

export type {
  AdvisorError,
  AdvisorErrorCode,
  AdvisorProvider,
  AdvisorRequest,
  AdvisorResult,
  AdvisorUsage,
} from "./types";

/**
 * THE ADVISOR REGISTRY.
 *
 * Ordered: the first CONFIGURED adapter wins, and `none` is the terminal
 * fallback that never configures. Adding a provider means writing an adapter
 * against `AdvisorProvider` and listing it here — nothing in Atlas refers to a
 * provider by name.
 */
const PROVIDERS: readonly AdvisorProvider[] = [anthropicAdvisor, noneAdvisor];

export function activeAdvisor(): AdvisorProvider {
  return PROVIDERS.find((provider) => provider.isConfigured()) ?? noneAdvisor;
}

export function advisorAvailable(): boolean {
  return activeAdvisor().isConfigured();
}
