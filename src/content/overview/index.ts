import { RESEARCH_FUNCTION_IDS, type ResearchFunctionId } from "@/content/functions";
import { forbiddenTermIn, isPublishable } from "@/content/lifecycle";
import { publicReferencesById, REFERENCES } from "@/content/references";

import { studiedForIssues, type StudiedForIssue } from "./plainLanguage";
import { OVERVIEWS } from "./registry";
import { STUDIED_FOR } from "./studiedFor";

import type { Locale } from "@/i18n/config";
import type { Reference } from "@/content/references";
import type { DiscoveryAreaId } from "@/data/discovery/types";
import type {
  CopyBlock,
  ProductOverview,
  SourcedStatement,
  StatementAspect,
  StudiedFor,
  StudiedForScope,
} from "./types";

export type { CopyBlock, ProductOverview, SourcedStatement, StudiedFor } from "./types";
export { OVERVIEWS } from "./registry";
export { STUDIED_FOR } from "./studiedFor";
export { promotionalTermIn, studiedForIssues, STUDIED_FOR_MAX_WORDS } from "./plainLanguage";

export interface PublicStatement {
  id: string;
  text: string;
  references: readonly Reference[];
  aspect: StatementAspect | null;
}

/**
 * What a compound is studied for, in plain language, as it renders: the
 * sentence, how far it reaches, and the sources of the statements it
 * restates — the same sources, never new ones.
 */
export interface PublicStudiedFor {
  text: string;
  scope: StudiedForScope;
  /** The statements it restates, by id. */
  statements: readonly string[];
  references: readonly Reference[];
}

export interface PublicOverview {
  summary: string | null;
  /** The orientation sentence (`StudiedFor`). Null where none renders. */
  studiedFor: PublicStudiedFor | null;
  researchContext: readonly PublicStatement[];
  areasOfInvestigation: readonly { area: DiscoveryAreaId; statement: PublicStatement }[];
  mechanismNotes: readonly PublicStatement[];
  keyReferences: readonly Reference[];
  technicalNotes: readonly string[];
}

export type OverviewIssueCode =
  | "statement_without_reference"
  | "reference_not_public"
  | "statement_not_scientific_class"
  | "forbidden_term"
  | "derived_copy_without_lineage"
  | "empty_text"
  | "function_unknown"
  | "function_without_statement"
  | "studied_for_without_overview"
  | "studied_for_rule"
  | "studied_for_statement_not_public";

export interface OverviewIssue {
  slug: string;
  itemId: string;
  code: OverviewIssueCode;
  detail?: string;
}

interface Deps {
  overviews: Readonly<Record<string, ProductOverview>>;
  references: readonly Reference[];
  /** Plain-language summaries. Absent in a fixture means none. */
  studiedFor?: Readonly<Record<string, StudiedFor>>;
}

const DEFAULT_DEPS: Deps = {
  overviews: OVERVIEWS,
  references: REFERENCES,
  studiedFor: STUDIED_FOR,
};

/**
 * Can this sourced statement render, in this locale?
 *
 * Four conditions, all required: its lifecycle is publishable, it is class C
 * (a scientific statement dressed as derived copy is how a claim avoids
 * needing a source), its text contains no forbidden vocabulary, and at least
 * one of its references is public. A statement whose only reference was
 * withdrawn disappears with it.
 */
export function publicStatement(
  statement: SourcedStatement,
  locale: Locale,
  references: readonly Reference[],
): PublicStatement | null {
  if (!isPublishable(statement.provenance)) return null;
  if (statement.provenance.class !== "scientific-source") return null;
  const text = statement.text[locale]?.trim();
  if (!text) return null;
  if (
    forbiddenTermIn(text) ||
    forbiddenTermIn(statement.text.es) ||
    forbiddenTermIn(statement.text.en)
  ) {
    return null;
  }
  const refs = publicReferencesById(statement.references, references);
  if (refs.length === 0) return null;
  return { id: statement.id, text, references: refs, aspect: statement.aspect ?? null };
}

/*
 * Both validators are exported so the AREA overview (`content/areas`) applies
 * exactly these rules rather than a second copy of them that could drift.
 */
export function publicCopy(block: CopyBlock | null, locale: Locale): string | null {
  if (!block || !isPublishable(block.provenance)) return null;
  /* A copy block may not carry a scientific claim at all — that is what
     `SourcedStatement` is for. */
  if (block.provenance.class === "scientific-source") return null;
  const text = block.text[locale]?.trim();
  if (!text) return null;
  if (forbiddenTermIn(block.text.es) || forbiddenTermIn(block.text.en)) return null;
  return text;
}

/**
 * The publishable part of a product's overview, or null when nothing is.
 *
 * Null is the common case and the correct one: the product page omits the
 * section entirely rather than rendering a heading over nothing.
 */
/*
 * MEMOISED FOR THE REAL REGISTRIES. The registries are constants, so a
 * (slug, locale) always resolves to the same public overview — and it is asked
 * for constantly: `publicFunctions` and `citedReferenceIds` both call it twice
 * per product, and the reference index calls those for every reference × every
 * product. Uncached, one reference index was ~12,500 resolutions and a second
 * of server time on every request that printed a count. Injected deps (the
 * check scripts' fixtures) bypass the cache, so a fixture can never read a
 * real result or leave one behind.
 */
const overviewCache = new Map<string, PublicOverview | null>();

export function publicOverview(
  slug: string,
  locale: Locale,
  deps: Deps = DEFAULT_DEPS,
): PublicOverview | null {
  if (deps !== DEFAULT_DEPS) return resolveOverview(slug, locale, deps);
  const key = `${slug}:${locale}`;
  if (!overviewCache.has(key)) overviewCache.set(key, resolveOverview(slug, locale, deps));
  return overviewCache.get(key) ?? null;
}

function resolveOverview(slug: string, locale: Locale, deps: Deps): PublicOverview | null {
  const overview = deps.overviews[slug];
  if (!overview) return null;

  const pick = (list: readonly SourcedStatement[]) =>
    list
      .map((s) => publicStatement(s, locale, deps.references))
      .filter((s): s is PublicStatement => s !== null);

  const result: PublicOverview = {
    summary: publicCopy(overview.summary, locale),
    studiedFor: resolveStudiedFor(slug, locale, deps),
    researchContext: pick(overview.researchContext),
    areasOfInvestigation: overview.areasOfInvestigation
      .map((entry) => {
        const statement = publicStatement(entry.statement, locale, deps.references);
        return statement ? { area: entry.area, statement } : null;
      })
      .filter((e): e is { area: DiscoveryAreaId; statement: PublicStatement } => e !== null),
    mechanismNotes: pick(overview.mechanismNotes),
    keyReferences: publicReferencesById(overview.keyReferences, deps.references),
    technicalNotes: overview.technicalNotes
      .map((n) => publicCopy(n, locale))
      .filter((n): n is string => n !== null),
  };

  const empty =
    !result.summary &&
    result.researchContext.length === 0 &&
    result.areasOfInvestigation.length === 0 &&
    result.mechanismNotes.length === 0 &&
    result.keyReferences.length === 0 &&
    result.technicalNotes.length === 0;
  return empty ? null : result;
}

/** Every sourced statement in an overview, by id. */
function statementsOf(overview: ProductOverview): ReadonlyMap<string, SourcedStatement> {
  return new Map(
    [
      ...overview.researchContext,
      ...overview.mechanismNotes,
      ...overview.areasOfInvestigation.map((a) => a.statement),
    ].map((s) => [s.id, s]),
  );
}

/**
 * Can this plain-language summary render, in this locale?
 *
 * All of: it is approved; it is derived copy whose only lineage is sourced
 * science; it breaks none of the rules in `plainLanguage.ts`; and EVERY
 * statement it restates renders in BOTH languages — so a summary can never
 * outlive a statement it rests on, and neither language can carry a summary
 * the other cannot. Its references are those statements' public references.
 */
function resolveStudiedFor(slug: string, locale: Locale, deps: Deps): PublicStudiedFor | null {
  const entry = deps.studiedFor?.[slug];
  const overview = deps.overviews[slug];
  if (!entry || !overview) return null;
  if (!isPublishable(entry.provenance)) return null;
  const statements = statementsOf(overview);
  if (studiedForIssues(entry, statements).length > 0) return null;

  const ids = [...new Set(entry.concepts.map((c) => c.statement))];
  const references = new Map<string, Reference>();
  for (const id of ids) {
    const statement = statements.get(id);
    if (!statement) return null;
    const es = publicStatement(statement, "es", deps.references);
    const en = publicStatement(statement, "en", deps.references);
    if (!es || !en) return null;
    for (const ref of (locale === "es" ? es : en).references) references.set(ref.id, ref);
  }
  return {
    text: entry.text[locale].trim(),
    scope: entry.scope,
    statements: ids,
    references: [...references.values()],
  };
}

/**
 * The plain-language summary alone — for the surfaces that need nothing else
 * (a catalogue card). Same rules, same cache, as the overview it belongs to.
 */
export function publicStudiedFor(
  slug: string,
  locale: Locale,
  deps: Deps = DEFAULT_DEPS,
): PublicStudiedFor | null {
  return publicOverview(slug, locale, deps)?.studiedFor ?? null;
}

/**
 * The research functions a product is PUBLICLY tagged with: those whose
 * backing statement renders in every locale. A tag never outlives its source.
 */
export function publicFunctions(
  slug: string,
  deps: Deps = DEFAULT_DEPS,
): readonly ResearchFunctionId[] {
  const overview = deps.overviews[slug];
  if (!overview) return [];
  const rendered = (locale: Locale) => {
    const o = publicOverview(slug, locale, deps);
    return new Set([...(o?.mechanismNotes ?? []), ...(o?.researchContext ?? [])].map((s) => s.id));
  };
  const es = rendered("es");
  const en = rendered("en");
  const ids = (overview.functions ?? [])
    .filter((tag) => RESEARCH_FUNCTION_IDS.includes(tag.id))
    .filter((tag) => es.has(tag.statement) && en.has(tag.statement))
    .map((tag) => tag.id);
  return [...new Set(ids)];
}

/**
 * A product's approved statements BY ID — the evidence Atlas may point at.
 *
 * Only statements public in EVERY locale, so an id the model cites resolves
 * whichever language the page renders in. Each carries the research functions
 * it backs and its public reference ids; the text is resolved at render time
 * by `publicOverview`, never handed around as a string to be paraphrased.
 */
export function publicStatementRefs(
  slug: string,
  deps: Deps = DEFAULT_DEPS,
): readonly {
  id: string;
  kind: "mechanism" | "research";
  functions: readonly ResearchFunctionId[];
  referenceIds: readonly string[];
}[] {
  const overview = deps.overviews[slug];
  const es = publicOverview(slug, "es", deps);
  const en = publicOverview(slug, "en", deps);
  if (!overview || !es || !en) return [];
  const inEn = new Set([...en.mechanismNotes, ...en.researchContext].map((s) => s.id));
  const tagged = (id: string) =>
    (overview.functions ?? [])
      .filter((tag) => tag.statement === id && RESEARCH_FUNCTION_IDS.includes(tag.id))
      .map((tag) => tag.id);
  const rows = (list: readonly PublicStatement[], kind: "mechanism" | "research") =>
    list
      .filter((s) => inEn.has(s.id))
      .map((s) => ({
        id: s.id,
        kind,
        functions: [...new Set(tagged(s.id))],
        referenceIds: s.references.map((r) => r.id),
      }));
  return [...rows(es.mechanismNotes, "mechanism"), ...rows(es.researchContext, "research")];
}

/** Every reference id a product's public overview cites. */
export function citedReferenceIds(slug: string, deps: Deps = DEFAULT_DEPS): readonly string[] {
  const ids = new Set<string>();
  for (const locale of ["es", "en"] as const) {
    const o = publicOverview(slug, locale, deps);
    if (!o) continue;
    for (const s of [
      ...o.researchContext,
      ...o.mechanismNotes,
      ...o.areasOfInvestigation.map((a) => a.statement),
    ]) {
      for (const r of s.references) ids.add(r.id);
    }
    for (const r of o.keyReferences) ids.add(r.id);
  }
  return [...ids];
}

/**
 * Everything wrong with the declared overviews — for tooling, not pages.
 *
 * Pages call `publicOverview`, which silently drops what cannot render. This
 * reports it, so an approved statement that quietly vanished because its paper
 * was withdrawn shows up as a failing check rather than as a shorter page.
 */
export function auditOverviews(deps: Deps = DEFAULT_DEPS): readonly OverviewIssue[] {
  const issues: OverviewIssue[] = [];
  const known = new Map(deps.references.map((r) => [r.id, r]));

  for (const overview of Object.values(deps.overviews)) {
    const statements = [
      ...overview.researchContext,
      ...overview.mechanismNotes,
      ...overview.areasOfInvestigation.map((a) => a.statement),
    ];
    for (const s of statements) {
      if (!s.text.es.trim() || !s.text.en.trim()) {
        issues.push({ slug: overview.slug, itemId: s.id, code: "empty_text" });
      }
      const term = forbiddenTermIn(s.text.es) ?? forbiddenTermIn(s.text.en);
      if (term)
        issues.push({ slug: overview.slug, itemId: s.id, code: "forbidden_term", detail: term });
      if (s.provenance.class !== "scientific-source") {
        issues.push({ slug: overview.slug, itemId: s.id, code: "statement_not_scientific_class" });
      }
      if (s.references.length === 0) {
        issues.push({ slug: overview.slug, itemId: s.id, code: "statement_without_reference" });
      }
      if (s.provenance.status === "approved") {
        for (const id of s.references) {
          const ref = known.get(id);
          if (!ref || publicReferencesById([id], deps.references).length === 0) {
            issues.push({
              slug: overview.slug,
              itemId: s.id,
              code: "reference_not_public",
              detail: id,
            });
          }
        }
      }
    }
    const statementIds = new Set(
      [...overview.researchContext, ...overview.mechanismNotes].map((s) => s.id),
    );
    for (const tag of overview.functions ?? []) {
      if (!RESEARCH_FUNCTION_IDS.includes(tag.id)) {
        issues.push({
          slug: overview.slug,
          itemId: tag.statement,
          code: "function_unknown",
          detail: tag.id,
        });
      }
      if (!statementIds.has(tag.statement)) {
        issues.push({
          slug: overview.slug,
          itemId: tag.statement,
          code: "function_without_statement",
          detail: tag.id,
        });
      }
    }
    for (const block of [overview.summary, ...overview.technicalNotes]) {
      if (!block) continue;
      const term = forbiddenTermIn(block.text.es) ?? forbiddenTermIn(block.text.en);
      if (term)
        issues.push({
          slug: overview.slug,
          itemId: block.id,
          code: "forbidden_term",
          detail: term,
        });
      if (
        block.provenance.class === "derived-copy" &&
        !isPublishable({ ...block.provenance, status: "approved" })
      ) {
        issues.push({
          slug: overview.slug,
          itemId: block.id,
          code: "derived_copy_without_lineage",
        });
      }
    }
  }
  for (const [slug, entry] of Object.entries(deps.studiedFor ?? {})) {
    const overview = deps.overviews[slug];
    if (!overview) {
      issues.push({ slug, itemId: entry.id, code: "studied_for_without_overview" });
      continue;
    }
    const statements = statementsOf(overview);
    for (const issue of studiedForIssues(entry, statements) as readonly StudiedForIssue[]) {
      issues.push({
        slug,
        itemId: entry.id,
        code: "studied_for_rule",
        detail: [issue.rule, issue.locale, issue.detail].filter(Boolean).join(" · "),
      });
    }
    /* An approved summary must render: one resting on a statement that does
       not would vanish silently, which is a shorter page, not a failing check. */
    if (entry.provenance.status === "approved") {
      for (const id of new Set(entry.concepts.map((c) => c.statement))) {
        const statement = statements.get(id);
        if (!statement) continue;
        const shown = (["es", "en"] as const).every((l) =>
          publicStatement(statement, l, deps.references),
        );
        if (!shown) {
          issues.push({
            slug,
            itemId: entry.id,
            code: "studied_for_statement_not_public",
            detail: id,
          });
        }
      }
    }
  }
  return issues;
}
