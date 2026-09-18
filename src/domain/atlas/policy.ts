import { ATLAS_FIELD_IDS, ATLAS_FIELDS } from "./fields";

import type { AtlasFieldId } from "./fields";
import type { AtlasProfile, AtlasProfileFields } from "./profile";
import type { AtlasContextEntry, AtlasPolicyDecision } from "./types";

/**
 * THE ADVISOR POLICY LAYER — between the complete profile and an advisor.
 *
 * The profile holds everything the visitor answered. A POLICY decides what
 * one advisor implementation may do with each field, as five independent
 * permissions:
 *
 *   candidate-selection  which products become candidates, and their order
 *   retrieval            which approved statements and references are put
 *                        forward for those products
 *   ai-context           what the advisor ENGINE (a model, or the composer)
 *                        is told about the visitor
 *   recap                shown back to the visitor on the result page
 *   presentation         shapes the page itself (a name, a tone)
 *
 * They are separate on purpose: a field may select candidates without the
 * model ever reading it (the current policy's goal), or reach the model
 * without moving selection (the current note).
 *
 * ENFORCEMENT IS STRUCTURAL. `applyAtlasPolicy` never hands a policy the
 * profile. It builds one PROJECTION per permission — only the fields that
 * permission grants — and the policy's `decide` works from those. The AI
 * context it returns is then checked against the ai-context grant, so a
 * policy cannot pass the engine a field it was not granted even by mistake.
 * The profile itself is never modified: withholding is a property of a
 * projection, not a loss of data.
 *
 * A NEW POLICY is a new object implementing `AtlasAdvisorPolicy` (see
 * `policies/`). The questionnaire, the profile, retrieval, the engines and the
 * result UI do not change. If it needs a sensitive field on the server, that is
 * also a deliberate change to `privacy.ts`, and `check:atlas` says so.
 */

export type AtlasPermission =
  "candidate-selection" | "retrieval" | "ai-context" | "recap" | "presentation";

export const ATLAS_PERMISSIONS: readonly AtlasPermission[] = [
  "candidate-selection",
  "retrieval",
  "ai-context",
  "recap",
  "presentation",
];

/** Permissions exercised on the server — a field needs transmitting for them to work. */
export const SERVER_PERMISSIONS: readonly AtlasPermission[] = [
  "candidate-selection",
  "retrieval",
  "ai-context",
  "presentation",
];

/** One permission's view of the profile: the granted fields and nothing else. */
export interface AtlasProjection {
  permission: AtlasPermission;
  fields: Readonly<Partial<AtlasProfileFields>>;
}

export interface AtlasPolicyInput {
  selection: AtlasProjection;
  retrieval: AtlasProjection;
  context: AtlasProjection;
  presentation: AtlasProjection;
}

/** The decision a policy returns; `policy` is stamped by `applyAtlasPolicy`. */
export type AtlasPolicyOutput = Omit<AtlasPolicyDecision, "policy">;

export interface AtlasAdvisorPolicy {
  id: string;
  version: string;
  /** One line a reviewer can read: what this policy is for. */
  description: string;
  /** Per field, what this policy may do with it. Absent means nothing. */
  permissions: Readonly<Record<AtlasFieldId, readonly AtlasPermission[]>>;
  decide(input: AtlasPolicyInput): AtlasPolicyOutput;
}

export function permits(
  policy: Pick<AtlasAdvisorPolicy, "permissions">,
  field: AtlasFieldId,
  permission: AtlasPermission,
): boolean {
  return policy.permissions[field]?.includes(permission) ?? false;
}

/** The profile as one permission of one policy sees it. A pure read. */
export function projectProfile(
  profile: AtlasProfile,
  policy: Pick<AtlasAdvisorPolicy, "permissions">,
  permission: AtlasPermission,
): AtlasProjection {
  const fields: Partial<Record<AtlasFieldId, AtlasProfileFields[AtlasFieldId]>> = {};
  for (const field of ATLAS_FIELD_IDS) {
    if (permits(policy, field, permission)) fields[field] = profile.fields[field];
  }
  return { permission, fields: fields as Partial<AtlasProfileFields> };
}

/** An entry for the engine, carrying the field's declared category and sensitivity. */
export function contextEntry(
  field: AtlasFieldId,
  value: AtlasContextEntry["value"],
): AtlasContextEntry {
  const spec = ATLAS_FIELDS[field];
  return { field, category: spec.category, sensitivity: spec.sensitivity, value };
}

export class AtlasPolicyViolation extends Error {}

export function applyAtlasPolicy(
  profile: AtlasProfile,
  policy: AtlasAdvisorPolicy,
): AtlasPolicyDecision {
  const output = policy.decide({
    selection: projectProfile(profile, policy, "candidate-selection"),
    retrieval: projectProfile(profile, policy, "retrieval"),
    context: projectProfile(profile, policy, "ai-context"),
    presentation: projectProfile(profile, policy, "presentation"),
  });
  const leaked = output.context.find((entry) => !permits(policy, entry.field, "ai-context"));
  if (leaked) {
    throw new AtlasPolicyViolation(
      `${policy.id} put ${leaked.field} in the AI context without the ai-context permission`,
    );
  }
  return {
    policy: { id: policy.id, version: policy.version, permissions: policy.permissions },
    ...output,
  };
}
