import type { LocalizedText } from "@/content/lifecycle";

/**
 * SIMPLE EFFECTS — the owner-authored comprehension layer (2026-10-06).
 *
 * A short, everyday answer to "what is this for?": a few tags and one
 * sentence per language, written by the owner (by hand or from an AI draft)
 * and published only after the owner approves it.
 *
 * IT IS NOT THE SCIENTIFIC RECORD, and nothing here can change one. The
 * scientific record (`content/overview`, `content/references`) is strictly
 * source-backed and validated statement by statement. `StudiedFor` restates
 * that record in plain language. Simple Effects is editorial: the owner
 * decides what it says and approves it, nothing traces it to a source, and a
 * sentence here is never evidence because the owner wrote it. The three
 * share a product slug and nothing else.
 *
 * STORED in `simple-effects.json` (this folder), edited through the
 * operations console (`/ops/contenido/efectos`), versioned by git.
 */

export type EffectStatus = "draft" | "review" | "approved";
export const EFFECT_STATUSES: readonly EffectStatus[] = ["draft", "review", "approved"];

/** Where the current wording came from. An import is typically an AI draft. */
export type EffectSource = "manual" | "import";

/**
 * A comprehension tag: one everyday word, in both languages. Tags are
 * metadata for reading a product, never a recommendation, a ranking, a
 * filter by goal or a relationship between products — and they are not the
 * scientific taxonomy (Areas, research lines), which they never touch.
 */
export interface EffectTag {
  /** Stable, lowercase, hyphenated. Entries point at this. */
  id: string;
  label: LocalizedText;
}

export interface SimpleEffectsEntry {
  slug: string;
  status: EffectStatus;
  /** Tag ids from the vocabulary, in display order. */
  tags: readonly string[];
  /** One short sentence per language. Either may be empty while drafting. */
  description: LocalizedText;
  /** Internal only. Never rendered on a customer surface. */
  notes: string;
  source: EffectSource;
  /** Increments on every save — a stale editor cannot overwrite a newer one. */
  revision: number;
  updatedAt: string;
  updatedBy: string;
}

export interface SimpleEffectsFile {
  version: 1;
  vocabulary: readonly EffectTag[];
  entries: Readonly<Record<string, SimpleEffectsEntry>>;
}

/** What a customer surface receives: already resolved to one language. */
export interface PublicSimpleEffects {
  tags: readonly string[];
  description: string;
}
