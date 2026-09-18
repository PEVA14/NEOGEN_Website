import { ATLAS_FIELD_IDS, ATLAS_FIELDS, fieldOf } from "./fields";
import { SERVER_PERMISSIONS, permits } from "./policy";

import type { AtlasFieldId } from "./fields";
import type { AtlasAdvisorPolicy } from "./policy";
import type { AtlasAnswers, AtlasQuestionnaireView } from "./questionnaire";

/**
 * THE PRIVACY / TRANSMISSION POLICY — what may leave the visitor's browser.
 *
 * A separate decision from what any advisor may USE (`policy.ts`). A field
 * that stays on the device is still fully represented in the browser's
 * profile, still in the ledger and the recap; the server's profile marks it
 * `not-received`.
 *
 * Every transmitted field states its BASIS in words. A sensitive field
 * (`fields.ts`) is never transmitted without one, and `check:atlas` fails if a
 * field is transmitted that no server-side permission of the active advisor
 * policy uses (data minimisation), or if the active policy is granted a
 * server-side use of a field that is never transmitted (it could not work).
 *
 * To let a future advisor receive a field on the server, change its entry
 * here — deliberately, with a basis — and grant the permission in that
 * advisor's policy. Nothing else moves.
 */

export type AtlasTransmission = { transmit: false } | { transmit: true; basis: string };

const device: AtlasTransmission = { transmit: false };
const sent = (basis: string): AtlasTransmission => ({ transmit: true, basis });

export const ATLAS_PRIVACY_POLICY: Readonly<Record<AtlasFieldId, AtlasTransmission>> = {
  goal: sent(
    "Mapped on the server to the catalogue area it corresponds to. The goal id is not stored, logged or sent to a model.",
  ),
  experience: sent("Sets how many products the selection starts with, and is told to the model."),
  "context-note": sent(
    "Screened on the server; discarded whole when it carries health detail, otherwise told to the model as untrusted text.",
  ),

  "goal-focus": device,
  "compounds-used": device,
  "age-band": device,
  sex: device,
  "weight-kg": device,
  "height-cm": device,
  activity: device,
  "sleep-quality": device,
  stress: device,
  "administration-route": device,
  "protocol-duration": device,
  "injection-tolerance": device,
  conditions: device,
  medications: device,
  "medications-other": device,
  injuries: device,
  frustrations: device,
  "outcome-goal": device,
  "outcome-priority": device,
  training: device,
  schedule: device,
  work: device,
  alcohol: device,
  caffeine: device,

  /* Purchasing preferences — not asked by v4; transmitted if a question asks. */
  "research-functions": sent(
    "Catalogue research functions: selection, evidence order, model context.",
  ),
  products: sent("Catalogue product ids the visitor named."),
  intent: sent("What the visitor wants to get done with the order."),
  history: sent("First visit or returning, for the page and the model's tone."),
  priorities: sent("Shopping priorities: documentation, price, signature line, overlap."),
  style: sent("How much explanation the visitor wants."),
  forms: sent("Presentation formats to filter the catalogue by."),
  size: sent("Which presentation of a product to put forward."),
  supplies: sent("Whether to include laboratory supplies."),
  budget: sent("An MXN ceiling applied to registry prices."),
  horizon: sent("One order or several."),
  timing: sent("Whether availability matters now."),
  name: sent("Shown on the result page only; never sent to a model."),
};

export function isFieldTransmitted(field: AtlasFieldId): boolean {
  const rule = ATLAS_PRIVACY_POLICY[field];
  if (!rule.transmit) return false;
  /* Belt and braces: a sensitive field needs a written basis to cross. */
  return ATLAS_FIELDS[field].sensitivity !== "sensitive" || rule.basis.trim().length > 0;
}

/** May this question's answer leave the browser? Unbound questions never do. */
export function isTransmitted(questionId: string): boolean {
  const field = fieldOf(questionId);
  return field !== null && isFieldTransmitted(field);
}

/** The answers that may leave the browser. The API route applies it again on arrival. */
export function transmittableAnswers(answers: AtlasAnswers): AtlasAnswers {
  return Object.fromEntries(Object.entries(answers).filter(([id]) => isTransmitted(id)));
}

/**
 * The questionnaire as the SERVER validates it: transmitted questions only, so
 * the server cannot accept an answer to one that should have stayed behind.
 */
export function transmittedView(view: AtlasQuestionnaireView): AtlasQuestionnaireView {
  return {
    ...view,
    groups: view.groups
      .map((group) => ({
        ...group,
        questions: group.questions.filter((question) => isTransmitted(question.id)),
      }))
      .filter((group) => group.questions.length > 0),
  };
}

/* ---- consistency with an advisor policy ----------------------------------- */

/**
 * Fields a policy is granted a server-side use of that never reach the
 * server. Such a grant cannot work; `check:atlas` requires none for the
 * active policy, and a new policy that needs one must change this file first.
 */
export function unreachableGrants(
  policy: Pick<AtlasAdvisorPolicy, "permissions">,
): readonly AtlasFieldId[] {
  return ATLAS_FIELD_IDS.filter(
    (field) =>
      SERVER_PERMISSIONS.some((p) => permits(policy, field, p)) && !isFieldTransmitted(field),
  );
}

/** Fields transmitted that a policy never uses on the server — data minimisation. */
export function unusedTransmissions(
  policy: Pick<AtlasAdvisorPolicy, "permissions">,
): readonly AtlasFieldId[] {
  return ATLAS_FIELD_IDS.filter(
    (field) =>
      isFieldTransmitted(field) && !SERVER_PERMISSIONS.some((p) => permits(policy, field, p)),
  );
}
