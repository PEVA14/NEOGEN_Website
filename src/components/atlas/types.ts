import type { Dictionary } from "@/i18n/types";

/**
 * The copy Atlas's client components receive.
 *
 * `compose` is omitted: those are server-side templates for the registry-only
 * composition and have no business in a browser bundle. The bag's own copy
 * rides along for the result's actions.
 *
 * NOTE WHAT IS NOT HERE: the questions. Their wording travels resolved inside
 * `AtlasQuestionnaireView` (from `src/content/atlas/questionnaire.ts`), so the
 * dictionary carries only the chrome around them — the progress line, the
 * controls, the field labels a renderer needs.
 */
export type AtlasCopy = Omit<Dictionary["atlas"], "compose"> & {
  commerce: Dictionary["commerceUi"];
};

/** The strings `QuestionField` needs that are not a question's own words. */
export type AtlasFieldCopy = Dictionary["atlas"]["field"];
