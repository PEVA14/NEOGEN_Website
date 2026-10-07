import { fold, forbiddenTermIn } from "@/content/lifecycle";

import { EFFECT_STATUSES } from "./types";

import type { Locale } from "@/i18n/config";
import type {
  EffectStatus,
  EffectTag,
  PublicSimpleEffects,
  SimpleEffectsEntry,
  SimpleEffectsFile,
} from "./types";

/**
 * THE RULES OF THE SIMPLE-EFFECTS LAYER — THE EDITOR WARNS, THE OWNER
 * DECIDES (owner direction, 2026-10-06).
 *
 * Simple Effects warnings are advisory editorial signals. They never
 * determine publication eligibility. Publication is an explicit owner
 * decision.
 *
 *   warnings  what the wording says: dosing or administration vocabulary,
 *             personal recommendations, strong effect verbs, treatment
 *             verbs, a missing translation, no tags, too many tags, a
 *             sentence too long to stay simple. Shown in the editor before
 *             approval; they block nothing — not saving, not approving, not
 *             rendering, not importing.
 *   errors    structure only: a tag that is not in the vocabulary. The
 *             wording of a description is never an error.
 *
 * APPROVAL needs both languages written and only known tags
 * (`approvalBlockers`). PUBLICATION (`isPublishable`) is approved plus those
 * same two facts — nothing about what the sentence says.
 */

const LOCALES = ["es", "en"] as const;

export type FindingCode =
  | "forbidden_term"
  | "personal_recommendation"
  | "unknown_tag"
  | "strong_effect"
  | "therapeutic_claim"
  | "missing_translation"
  | "no_tags"
  | "too_many_tags"
  | "too_long";

export interface Finding {
  code: FindingCode;
  /** "error" is structural (an unknown tag). Everything about wording is a warning. */
  level: "error" | "warning";
  locale?: Locale;
  detail?: string;
}

/** Above this, a "simple" description has stopped being simple. */
export const DESCRIPTION_SOFT_LIMIT = 160;
export const TAGS_SOFT_LIMIT = 4;

/* Verbs that state an effect as fact. Folded; whole words. Advisory. */
const STRONG: Readonly<Record<Locale, readonly string[]>> = {
  es: (
    "reduce reducen reducir disminuye disminuyen disminuir baja bajan aumenta aumentan aumentar " +
    "incrementa mejora mejoran mejorar evita evitan elimina eliminan eliminar quema queman quemar " +
    "repara reparan reparar regenera regeneran revierte acelera aceleran favorece favorecen " +
    "potencia estimula estimulan quita quitan combate combaten rejuvenece fortalece fortalecen " +
    "suprime controla controlan"
  ).split(" "),
  en: (
    "reduces reduce decreases decrease lowers lower increases increase boosts boost improves " +
    "improve eliminates eliminate burns burn repairs repair regenerates reverses reverse " +
    "accelerates promotes promote enhances enhance stimulates stimulate removes remove fights " +
    "rejuvenates strengthens builds build suppresses suppress controls supports"
  ).split(" "),
};

/* Verbs that state a medical outcome. Advisory. */
const THERAPEUTIC: Readonly<Record<Locale, readonly string[]>> = {
  es: "trata tratan tratar cura curan curar previene previenen prevenir sana sanan sanar cicatriza diagnostica".split(
    " ",
  ),
  en: "treats treat cures cure prevents prevent heals heal diagnoses".split(" "),
};

/* Telling a reader what THEY should do. Advisory. Folded phrases. */
const PERSONAL: Readonly<Record<Locale, readonly string[]>> = {
  es: [
    "te recomendamos",
    "le recomendamos",
    "recomendamos",
    "recomendado para ti",
    "ideal para ti",
    "para ti",
    "deberias",
    "debes tomar",
    "tomalo",
    "toma este",
    "tomar este",
    "usted debe",
  ],
  en: [
    "we recommend",
    "recommended for you",
    "you should",
    "ideal for you",
    "for you",
    "take this",
    "take it",
  ],
};

const bounded = (phrase: string) =>
  new RegExp(
    `(?:^|[^\\p{L}\\p{N}])${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^\\p{L}\\p{N}])`,
    "u",
  );

const matches = (text: string, list: readonly string[]) => {
  const folded = fold(text);
  return list.filter((w) => bounded(w).test(folded));
};

/** Everything worth knowing about one entry before approving it. Advisory, except unknown tags. */
export function effectFindings(
  entry: Pick<SimpleEffectsEntry, "tags" | "description">,
  vocabulary: readonly EffectTag[],
): readonly Finding[] {
  const found: Finding[] = [];
  const known = new Set(vocabulary.map((t) => t.id));
  for (const id of entry.tags) {
    if (!known.has(id)) found.push({ code: "unknown_tag", level: "error", detail: id });
  }
  if (entry.tags.length === 0) found.push({ code: "no_tags", level: "warning" });
  if (entry.tags.length > TAGS_SOFT_LIMIT) {
    found.push({ code: "too_many_tags", level: "warning", detail: String(entry.tags.length) });
  }
  const written = LOCALES.filter((l) => entry.description[l].trim());
  for (const locale of LOCALES) {
    const text = entry.description[locale].trim();
    if (!text) {
      if (written.length > 0) found.push({ code: "missing_translation", level: "warning", locale });
      continue;
    }
    const forbidden = forbiddenTermIn(text);
    if (forbidden) {
      found.push({ code: "forbidden_term", level: "warning", locale, detail: forbidden });
    }
    for (const phrase of matches(text, PERSONAL[locale])) {
      found.push({ code: "personal_recommendation", level: "warning", locale, detail: phrase });
    }
    const strong = matches(text, STRONG[locale]);
    if (strong.length) {
      found.push({ code: "strong_effect", level: "warning", locale, detail: strong.join(", ") });
    }
    const therapeutic = matches(text, THERAPEUTIC[locale]);
    if (therapeutic.length) {
      found.push({
        code: "therapeutic_claim",
        level: "warning",
        locale,
        detail: therapeutic.join(", "),
      });
    }
    if (text.length > DESCRIPTION_SOFT_LIMIT) {
      found.push({ code: "too_long", level: "warning", locale, detail: String(text.length) });
    }
  }
  return found;
}

/**
 * Why an entry cannot be approved, or an empty list when it can. Structural
 * only: both languages written, every tag known. Never the wording.
 */
export function approvalBlockers(
  entry: Pick<SimpleEffectsEntry, "tags" | "description">,
  vocabulary: readonly EffectTag[],
): readonly string[] {
  const blockers: string[] = [];
  for (const locale of LOCALES) {
    if (!entry.description[locale].trim()) blockers.push(`description_${locale}`);
  }
  const known = new Set(vocabulary.map((t) => t.id));
  if (entry.tags.some((id) => !known.has(id))) blockers.push("unknown_tags");
  return blockers;
}

/**
 * THE PUBLICATION GATE: the owner approved it, and it is still structurally
 * complete. No warning about its wording can change the answer.
 */
export function isPublishable(
  entry: SimpleEffectsEntry | undefined,
  vocabulary: readonly EffectTag[],
): entry is SimpleEffectsEntry {
  return (
    entry !== undefined &&
    entry.status === "approved" &&
    approvalBlockers(entry, vocabulary).length === 0
  );
}

/** The customer-facing shape, in one language, or null. */
export function publicEffects(
  file: SimpleEffectsFile,
  slug: string,
  locale: Locale,
): PublicSimpleEffects | null {
  const entry = file.entries[slug];
  if (!isPublishable(entry, file.vocabulary)) return null;
  const labels = new Map(file.vocabulary.map((t) => [t.id, t.label[locale]]));
  return {
    tags: entry.tags.map((id) => labels.get(id) ?? "").filter(Boolean),
    description: entry.description[locale].trim(),
  };
}

/* ------------------------------------------------------------- editing */

export interface EffectEdit {
  tags: readonly string[];
  description: { es: string; en: string };
  notes: string;
  status: EffectStatus;
}

export type EditResult =
  | { ok: true; entry: SimpleEffectsEntry }
  | { ok: false; reason: "stale" | "approval_blocked"; blockers?: readonly string[] };

export const blankEntry = (slug: string): SimpleEffectsEntry => ({
  slug,
  status: "draft",
  tags: [],
  description: { es: "", en: "" },
  notes: "",
  source: "manual",
  revision: 0,
  updatedAt: "",
  updatedBy: "",
});

const sameContent = (a: Pick<EffectEdit, "tags" | "description">, b: typeof a) =>
  a.tags.join("|") === b.tags.join("|") &&
  a.description.es.trim() === b.description.es.trim() &&
  a.description.en.trim() === b.description.en.trim();

/**
 * Apply one save from the editor. The status is what the owner chose; an
 * approved entry stays approved when its wording changes, and the new
 * wording publishes on the next build.
 */
export function applyEdit(
  current: SimpleEffectsEntry,
  edit: EffectEdit,
  vocabulary: readonly EffectTag[],
  { operator, now, revision }: { operator: string; now: string; revision: number },
): EditResult {
  if (revision !== current.revision) return { ok: false, reason: "stale" };
  const changed = !sameContent(edit, current);
  const next: SimpleEffectsEntry = {
    ...current,
    tags: [...new Set(edit.tags)],
    description: { es: edit.description.es.trim(), en: edit.description.en.trim() },
    notes: edit.notes.trim(),
    status: edit.status,
    source: changed ? "manual" : current.source,
    revision: current.revision + 1,
    updatedAt: now,
    updatedBy: operator,
  };
  if (next.status === "approved") {
    const blockers = approvalBlockers(next, vocabulary);
    if (blockers.length) return { ok: false, reason: "approval_blocked", blockers };
  }
  return { ok: true, entry: next };
}

export interface BulkStatusResult {
  file: SimpleEffectsFile;
  /** Slugs whose status changed. */
  changed: readonly string[];
  /** Already in that status: left exactly as they were. */
  unchanged: readonly string[];
  /** Could not be approved, and why. Left exactly as they were. */
  skipped: readonly { slug: string; blockers: readonly string[] }[];
}

/**
 * Set one status on many entries at once — the owner's bulk decision. Only
 * the status moves: wording, tags, notes and source stay as written. The
 * same structural gate as a single save applies to each entry; warnings
 * about wording never skip one. Slugs with no entry are ignored.
 */
export function applyBulkStatus(
  file: SimpleEffectsFile,
  slugs: readonly string[],
  status: EffectStatus,
  { operator, now }: { operator: string; now: string },
): BulkStatusResult {
  const entries = { ...file.entries };
  const changed: string[] = [];
  const unchanged: string[] = [];
  const skipped: { slug: string; blockers: readonly string[] }[] = [];
  for (const slug of new Set(slugs)) {
    const current = entries[slug];
    if (!current) continue;
    if (current.status === status) {
      unchanged.push(slug);
      continue;
    }
    if (status === "approved") {
      const blockers = approvalBlockers(current, file.vocabulary);
      if (blockers.length) {
        skipped.push({ slug, blockers });
        continue;
      }
    }
    entries[slug] = {
      ...current,
      status,
      revision: current.revision + 1,
      updatedAt: now,
      updatedBy: operator,
    };
    changed.push(slug);
  }
  return { file: { ...file, entries }, changed, unchanged, skipped };
}

/* ------------------------------------------------------- list, search */

export interface EffectsRow {
  slug: string;
  name: string;
  entry: SimpleEffectsEntry | null;
  findings: readonly Finding[];
}

export type EffectsFilter = EffectStatus | "empty" | "flagged" | "all";
export const EFFECT_FILTERS: readonly EffectsFilter[] = [
  "all",
  "empty",
  ...EFFECT_STATUSES,
  "flagged",
];

const isEmpty = (entry: SimpleEffectsEntry | null) =>
  !entry ||
  (!entry.description.es.trim() && !entry.description.en.trim() && entry.tags.length === 0);

/** The list's filter and search, as one pure function. */
export function filterRows(
  rows: readonly EffectsRow[],
  { filter, query }: { filter: EffectsFilter; query: string },
): readonly EffectsRow[] {
  const q = fold(query.trim());
  return rows.filter((row) => {
    if (filter === "empty" && !isEmpty(row.entry)) return false;
    if (filter === "flagged" && row.findings.length === 0) return false;
    if (EFFECT_STATUSES.includes(filter as EffectStatus)) {
      if (isEmpty(row.entry) || row.entry?.status !== filter) return false;
    }
    if (!q) return true;
    return fold(`${row.name} ${row.slug}`).includes(q);
  });
}

export function countRows(rows: readonly EffectsRow[]): Record<EffectsFilter, number> {
  return Object.fromEntries(
    EFFECT_FILTERS.map((f) => [f, filterRows(rows, { filter: f, query: "" }).length]),
  ) as Record<EffectsFilter, number>;
}

/* --------------------------------------------------------- the file */

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Read an untrusted object as a `SimpleEffectsFile`, or explain why not. Used
 * when the file is loaded (publicly and by the editor), so a hand-edited file
 * that is malformed renders NOTHING rather than something half-valid.
 */
export function parseEffectsFile(
  raw: unknown,
): { ok: true; file: SimpleEffectsFile } | { ok: false; problem: string } {
  const bad = (problem: string) => ({ ok: false as const, problem });
  if (!raw || typeof raw !== "object") return bad("not an object");
  const r = raw as Record<string, unknown>;
  if (r.version !== 1) return bad("version must be 1");
  if (!Array.isArray(r.vocabulary)) return bad("vocabulary must be a list");
  const ids = new Set<string>();
  for (const t of r.vocabulary as Record<string, unknown>[]) {
    const label = t?.label as Record<string, unknown> | undefined;
    if (typeof t?.id !== "string" || !SLUG.test(t.id)) return bad(`bad tag id ${String(t?.id)}`);
    if (ids.has(t.id)) return bad(`duplicate tag ${t.id}`);
    if (typeof label?.es !== "string" || typeof label?.en !== "string") {
      return bad(`tag ${t.id} needs es and en labels`);
    }
    ids.add(t.id);
  }
  if (!r.entries || typeof r.entries !== "object") return bad("entries must be an object");
  for (const [slug, e] of Object.entries(r.entries as Record<string, Record<string, unknown>>)) {
    const description = e?.description as Record<string, unknown> | undefined;
    const ok =
      e?.slug === slug &&
      EFFECT_STATUSES.includes(e.status as EffectStatus) &&
      Array.isArray(e.tags) &&
      (e.tags as unknown[]).every((t) => typeof t === "string") &&
      typeof description?.es === "string" &&
      typeof description?.en === "string" &&
      typeof e.notes === "string" &&
      ["manual", "import"].includes(String(e.source)) &&
      typeof e.revision === "number" &&
      typeof e.updatedAt === "string" &&
      typeof e.updatedBy === "string";
    if (!ok) return bad(`entry ${slug} is malformed`);
  }
  return { ok: true, file: raw as SimpleEffectsFile };
}

/** Stable JSON: entries in slug order, so a save diffs as the change made. */
export function serializeEffectsFile(file: SimpleEffectsFile): string {
  const entries = Object.fromEntries(
    Object.keys(file.entries)
      .sort()
      .map((slug) => [slug, file.entries[slug]]),
  );
  return `${JSON.stringify({ version: 1, vocabulary: file.vocabulary, entries }, null, 2)}\n`;
}

/** A tag id from a label: "SALUD INTESTINAL" → "salud-intestinal". */
export const tagIdFrom = (label: string) =>
  fold(label)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
