import { RESTRICTED_POLICY } from "./restricted";

import type { AtlasAdvisorPolicy } from "../policy";

/**
 * THE ACTIVE ADVISOR POLICY — one line to change.
 *
 * Every policy implements `AtlasAdvisorPolicy`. The request pipeline, the
 * ledger and the checks read this constant; nothing else names a policy.
 */
export const ACTIVE_ATLAS_POLICY: AtlasAdvisorPolicy = RESTRICTED_POLICY;

export {
  ATLAS_TOTAL_RANGE,
  EXPERIENCE_LEVELS,
  GOAL_AREAS,
  RESTRICTED_PERMISSIONS,
  RESTRICTED_POLICY,
  noteIsUsable,
  policyPins,
} from "./restricted";
