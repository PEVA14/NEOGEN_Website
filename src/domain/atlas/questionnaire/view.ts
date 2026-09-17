import type { AtlasCondition, AtlasQuestionKind, AtlasQuestionRender, AtlasRole } from "./types";

/**
 * THE RESOLVED QUESTIONNAIRE — one locale, registries already read.
 *
 * The schema is bilingual and refers to registries by name; this is what is
 * left once a locale is chosen and those registries have been read: plain
 * strings and plain numbers. It is what crosses to the browser, and it is what
 * the engine validates against — so the field a visitor fills, the rule that
 * accepts it and the rule the server re-checks it with are the same object.
 *
 * Deliberately flat. The renderer switches on `kind` and reads the few fields
 * that kind uses; a new kind adds fields here and a branch there, and touches
 * no question content.
 */

export interface AtlasOptionView {
  id: string;
  label: string;
  hint: string | null;
  /** The numeric payload a role may consume (today: the budget ceiling). */
  value: number | null;
  /** Registry facts for the tile and card renderers. Never authored by hand. */
  meta: AtlasOptionMeta | null;
}

export interface AtlasOptionMeta {
  /** Discovery area id, for the area swatch and tone. */
  area?: string;
  /** The area's own framing line. */
  framing?: string;
  /** Longer registry copy, e.g. the area's body. */
  body?: string;
  /** How many compounds sit behind this option. */
  compounds?: number;
  /** Formatted entry price, already localised by the commerce layer. */
  entryPrice?: string;
  /** The areas a product belongs to, for the search field's default pool. */
  areas?: readonly string[];
  /**
   * A heading this option sits under. Set by the resolver when a registry's
   * list is long enough to need sections; the renderer groups on it, in the
   * order the options arrive, and ignores it otherwise.
   */
  group?: string;
  groupLabel?: string;
}

export interface AtlasQuestionView {
  id: string;
  kind: AtlasQuestionKind;
  label: string;
  /** For the recap and the ledger; falls back to `label`. */
  shortLabel: string;
  hint: string | null;
  required: boolean;
  markOptional: boolean;
  role: AtlasRole | null;
  recap: boolean;
  visibleWhen: AtlasCondition | null;
  /* select */
  options: readonly AtlasOptionView[];
  render: AtlasQuestionRender;
  columns: 2 | 3 | 4;
  ranked: boolean;
  min: number | null;
  max: number | null;
  /* number, range */
  step: number | null;
  unit: string | null;
  ends: { min: string; max: string } | null;
  /* text */
  maxLength: number | null;
  placeholder: string | null;
  footnote: string | null;
  autoComplete: string | null;
  /** The answer before the visitor touches anything; null means unanswered. */
  initial: string | readonly string[] | number | boolean | null;
}

export interface AtlasGroupView {
  id: string;
  label: string;
  title: string;
  lede: string;
  visibleWhen: AtlasCondition | null;
  questions: readonly AtlasQuestionView[];
}

export interface AtlasQuestionnaireView {
  version: string;
  groups: readonly AtlasGroupView[];
}
