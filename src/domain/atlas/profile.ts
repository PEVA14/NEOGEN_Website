import { ATLAS_FIELD_IDS, ATLAS_FIELDS, fieldOf } from "./fields";
import { isFieldTransmitted } from "./privacy";
import { allQuestions, questionVisible } from "./questionnaire";
import { normaliseText } from "./screen";

import type { AtlasFieldId, AtlasFieldValue } from "./fields";
import type { AtlasAnswers, AtlasAnswerValue, AtlasQuestionnaireView } from "./questionnaire";

/**
 * THE PROFILE — the complete answered questionnaire, typed.
 *
 * Every field of `fields.ts` has an entry, whatever any advisor is allowed to
 * do with it. A field's value is normalised to its declared kind (an option
 * id, a list of ids, a number in its unit, a boolean, trimmed text) and
 * carries where it came from. Nothing here knows about permissions: an
 * advisor policy reads PROJECTIONS of this profile (`policy.ts`), and
 * withholding a field from one advisor never removes it from the profile.
 *
 * TWO SCOPES, ONE TYPE. In the browser the profile is built from every answer
 * and is complete. On the server it is built from what the privacy policy let
 * cross (`privacy.ts`); a field that stayed on the device is present with
 * `source: "not-received"` — represented, marked, and empty. That is the
 * transmission boundary doing its job, not the advisor policy.
 */

export type AtlasEntrySource =
  /** A visible question bound to the field was answered. */
  | "answer"
  /** A question asks for it, and it was skipped or hidden. */
  | "unanswered"
  /** No question in this questionnaire asks for it. */
  | "not-asked"
  /** Asked, but kept on the device by the privacy policy: not on the server. */
  | "not-received";

export interface AtlasProfileEntry<K extends AtlasFieldId = AtlasFieldId> {
  value: AtlasFieldValue<K> | null;
  source: AtlasEntrySource;
  /** The questions that fill this field in the current questionnaire. */
  questions: readonly string[];
}

export type AtlasProfileFields = { readonly [K in AtlasFieldId]: AtlasProfileEntry<K> };

export interface AtlasProfile {
  /** The questionnaire version the answers belong to. */
  version: string;
  /** "device": built from every answer. "server": from transmitted answers only. */
  scope: "device" | "server";
  fields: AtlasProfileFields;
  /**
   * Answers to questions `fields.ts` does not bind yet. Kept, not dropped —
   * treated as unclassified and sensitive, so never transmitted or used.
   */
  unbound: readonly { question: string; value: AtlasAnswerValue }[];
}

const TEXT_LIMIT = 2000;

function answered(value: AtlasAnswerValue | undefined): value is AtlasAnswerValue {
  if (value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** An answer, normalised to the field's declared kind; null when it does not fit. */
function normalise(field: AtlasFieldId, value: AtlasAnswerValue): unknown {
  switch (ATLAS_FIELDS[field].kind) {
    case "enum":
      return typeof value === "string" ? value : null;
    case "enum-list":
      return Array.isArray(value) ? [...new Set(value as readonly string[])] : null;
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    case "boolean":
      return typeof value === "boolean" ? value : null;
    case "text":
      return typeof value === "string" ? normaliseText(value, TEXT_LIMIT) : null;
  }
}

export function buildAtlasProfile(
  view: AtlasQuestionnaireView,
  answers: AtlasAnswers,
  scope: "device" | "server",
): AtlasProfile {
  const questions = allQuestions(view);
  const fields = {} as Record<AtlasFieldId, AtlasProfileEntry>;

  for (const field of ATLAS_FIELD_IDS) {
    const bound = questions.filter((q) => fieldOf(q.id) === field);
    const ids = bound.map((q) => q.id);
    if (bound.length === 0) {
      fields[field] = { value: null, source: "not-asked", questions: ids };
      continue;
    }
    if (scope === "server" && !isFieldTransmitted(field)) {
      fields[field] = { value: null, source: "not-received", questions: ids };
      continue;
    }
    const hit = bound.find((q) => questionVisible(q, answers) && answered(answers[q.id]));
    const value = hit ? normalise(field, answers[hit.id]) : null;
    fields[field] = {
      value: value as AtlasProfileEntry["value"],
      source: value === null ? "unanswered" : "answer",
      questions: ids,
    };
  }

  const unbound =
    scope === "server"
      ? []
      : questions
          .filter((q) => fieldOf(q.id) === null)
          .filter((q) => questionVisible(q, answers) && answered(answers[q.id]))
          .map((q) => ({ question: q.id, value: answers[q.id] }));

  return { version: view.version, scope, fields: fields as AtlasProfileFields, unbound };
}

/** The value of a field, typed, or null. */
export function profileValue<K extends AtlasFieldId>(
  profile: Pick<AtlasProfile, "fields">,
  field: K,
): AtlasFieldValue<K> | null {
  return profile.fields[field].value;
}
