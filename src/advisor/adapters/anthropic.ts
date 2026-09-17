import "server-only";

import { createAnthropicAdvisor } from "./anthropic-core";

/**
 * ANTHROPIC — the V1 provider, bound to the server's environment.
 *
 *   ANTHROPIC_API_KEY       required; the adapter does not configure without it
 *   NEOGEN_ADVISOR_MODEL    optional; defaults to `claude-opus-5`
 *   NEOGEN_ADVISOR_EFFORT   optional; low | medium | high | xhigh | max,
 *                           defaults to `medium`
 *
 * None of these is `NEXT_PUBLIC_*`, and this module imports `server-only`, so
 * neither the key nor the client can reach a browser bundle. Read per call, so
 * a key added to a running deployment's environment takes effect on restart
 * without a code change.
 */
export const anthropicAdvisor = createAnthropicAdvisor(() => ({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.NEOGEN_ADVISOR_MODEL,
  effort: process.env.NEOGEN_ADVISOR_EFFORT,
}));
