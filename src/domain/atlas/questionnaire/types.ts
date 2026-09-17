import type { LocalizedText } from "@/content/lifecycle";

/**
 * THE QUESTIONNAIRE SCHEMA — what a question can BE, never what one IS.
 *
 * Atlas has two halves and this file is the seam between them:
 *
 *   CONTENT  `src/content/atlas/questionnaire.ts` — the questions themselves,
 *            their ids, their Spanish and English wording, their options and
 *            their order. Edited freely, with no component to touch.
 *   SYSTEM   this schema, the engine beside it, and one renderer per kind.
 *            Edited only when a genuinely new KIND of interaction is needed.
 *
 * TWO RULES HOLD THE SEAM.
 *
 * 1. IDS ARE THE MACHINE'S, LABELS ARE THE READER'S. A question and every
 *    option carry a stable `id` that answers, the policy, the outbound prompt
 *    and stored drafts all speak in. Rewriting a label changes nothing else;
 *    changing an id is a data change and the checks say so.
 * 2. FACTS ARE NEVER COPIED IN HERE. Areas, products and research functions
 *    arrive as `{ kind: "registry" }` option sources resolved from NEOGEN's
 *    registries at render time, so no price, slug or count is ever duplicated
 *    into questionnaire content.
 *
 * WHAT A QUESTION MAY INFLUENCE is still the policy's decision alone. A
 * question declares a `role`; `ATLAS_POLICY` maps that role to its permitted
 * uses. A question with no role is collected and shown back to the visitor and
 * can move nothing.
 */

/** Every interaction the renderer knows how to draw. */
export type AtlasQuestionKind =
  "single-select" | "multi-select" | "toggle" | "number" | "range" | "short-text" | "long-text";

/**
 * How a select question is drawn. Presentation only — no kind of question
 * behaves differently because of it.
 *
 *   cards   option cards in a grid (the questionnaire's default)
 *   pills   compact inline pills, for short vocabularies
 *   tiles   large tiles with the area's own swatch and facts
 *   search  a search field and result pills, for long registry lists
 */
export type AtlasQuestionRender = "cards" | "pills" | "tiles" | "search";

/**
 * What an answer is ALLOWED to feed. The policy owns the mapping from role to
 * use; the questionnaire only says which role a question plays.
 *
 * A role may be filled by at most one question. Drop the question that fills a
 * role and the profile falls back to that role's documented default, so the
 * advisor keeps working with fewer questions.
 */
export type AtlasRole =
  | "topics"
  | "research-functions"
  | "intent"
  | "products-in-mind"
  | "first-name"
  | "experience"
  | "history"
  | "priorities"
  | "explanation-style"
  | "forms"
  | "presentation-size"
  | "include-supplies"
  | "budget-cap"
  | "purchase-horizon"
  | "timing"
  | "free-note";

/** Registry-backed option lists. The registry is read at render time. */
export type AtlasRegistrySource = "discovery-areas" | "published-products" | "research-functions";

/** One option: a stable id, the wording, and an optional numeric payload. */
export interface AtlasOptionSpec {
  id: string;
  label: LocalizedText;
  hint?: LocalizedText;
  /**
   * A number the role consumes — today only `budget-cap`, where it is the MXN
   * ceiling and `null` means no ceiling. Never a price read from a product.
   */
  value?: number | null;
}

export type AtlasOptionSource =
  | { kind: "static"; items: readonly AtlasOptionSpec[] }
  | { kind: "registry"; registry: AtlasRegistrySource };

/**
 * A condition over answers already given. Conditions may only reference
 * questions declared EARLIER, so visibility can never depend on an answer the
 * visitor has not reached — `validateQuestionnaire` enforces it.
 */
export type AtlasCondition =
  | { question: string; equals: string | number | boolean }
  | { question: string; includes: string }
  | { question: string; answered: true }
  | { all: readonly AtlasCondition[] }
  | { any: readonly AtlasCondition[] }
  | { not: AtlasCondition };

interface QuestionBase {
  /** Stable machine id. The key in `AtlasAnswers` and in a saved draft. */
  id: string;
  label: LocalizedText;
  /**
   * A few words for the places a whole question does not fit: the recap chips
   * and the ledger's first column. Defaults to `label`.
   */
  shortLabel?: LocalizedText;
  hint?: LocalizedText;
  /** A required question blocks its step until answered. Default: false. */
  required?: boolean;
  /**
   * Print "· Optional" beside the label. Off by default: most optional
   * questions say so in their own hint, and a marker on every one of them
   * reads as nagging.
   */
  markOptional?: boolean;
  role?: AtlasRole;
  /** Shown only while this holds. */
  visibleWhen?: AtlasCondition;
  /** Echo this answer in the result's "what we understood" summary. */
  recap?: boolean;
}

export interface SingleSelectQuestion extends QuestionBase {
  kind: "single-select";
  options: AtlasOptionSource;
  /** Option id selected before the visitor touches anything. */
  default?: string;
  render?: Extract<AtlasQuestionRender, "cards" | "pills">;
  /** Option cards per row at desktop width. */
  columns?: 2 | 3 | 4;
}

export interface MultiSelectQuestion extends QuestionBase {
  kind: "multi-select";
  options: AtlasOptionSource;
  /** Required means "at least `min`"; default min is 1 when required. */
  min?: number;
  max?: number;
  /** Selection order is meaningful and shown as rank labels. */
  ranked?: boolean;
  render?: AtlasQuestionRender;
  columns?: 2 | 3 | 4;
  /**
   * Skip the question entirely when its registry source resolves to nothing —
   * how the research-function question stays hidden until a sourced overview
   * is approved.
   */
  hideWithoutOptions?: boolean;
}

export interface ToggleQuestion extends QuestionBase {
  kind: "toggle";
  default?: boolean;
}

export interface NumberQuestion extends QuestionBase {
  kind: "number";
  min: number;
  max: number;
  step?: number;
  default?: number;
  unit?: LocalizedText;
}

export interface RangeQuestion extends QuestionBase {
  kind: "range";
  min: number;
  max: number;
  step?: number;
  default: number;
  unit?: LocalizedText;
  /** Wording for the ends of the track, when the numbers need help. */
  ends?: { min: LocalizedText; max: LocalizedText };
}

export interface ShortTextQuestion extends QuestionBase {
  kind: "short-text";
  maxLength: number;
  placeholder?: LocalizedText;
  /** A browser autofill token, when one genuinely applies. */
  autoComplete?: string;
}

export interface LongTextQuestion extends QuestionBase {
  kind: "long-text";
  maxLength: number;
  placeholder?: LocalizedText;
  /** Shown under the field, e.g. what will be ignored. */
  footnote?: LocalizedText;
}

export type AtlasQuestion =
  | SingleSelectQuestion
  | MultiSelectQuestion
  | ToggleQuestion
  | NumberQuestion
  | RangeQuestion
  | ShortTextQuestion
  | LongTextQuestion;

/** One step of the questionnaire. Groups are the progress rail. */
export interface AtlasQuestionGroup {
  id: string;
  /** The rail's short name. */
  label: LocalizedText;
  title: LocalizedText;
  lede: LocalizedText;
  visibleWhen?: AtlasCondition;
  questions: readonly AtlasQuestion[];
}

export interface AtlasQuestionnaire {
  /**
   * Bump when a change would make a saved draft wrong — a removed question, a
   * changed id, a narrowed option set. It keys the session draft, so a bump
   * discards drafts instead of restoring answers that no longer parse.
   */
  version: string;
  groups: readonly AtlasQuestionGroup[];
}

/* ---- Answers -------------------------------------------------------------- */

/** One answer. Which shapes are legal is the question's kind. */
export type AtlasAnswerValue = string | readonly string[] | number | boolean;

/** Every answer, keyed by question id. Absent means unanswered. */
export type AtlasAnswers = Readonly<Record<string, AtlasAnswerValue>>;

/* ---- Validation ----------------------------------------------------------- */

export type AtlasAnswerIssueCode =
  | "required"
  | "wrong_type"
  | "unknown_option"
  | "too_few"
  | "too_many"
  | "duplicate"
  | "out_of_range"
  | "too_long"
  | "unknown_question";

export interface AtlasAnswerIssue {
  question: string;
  code: AtlasAnswerIssueCode;
  detail?: string;
}

export type AtlasSchemaIssueCode =
  | "duplicate_question_id"
  | "duplicate_group_id"
  | "duplicate_option_id"
  | "duplicate_role"
  | "condition_unknown_question"
  | "condition_forward_reference"
  | "default_not_an_option"
  | "bad_bounds"
  | "registry_source_unknown"
  | "role_kind_mismatch";

export interface AtlasSchemaIssue {
  code: AtlasSchemaIssueCode;
  where: string;
  detail?: string;
}
