import { publicGlossary } from "@/content/glossary";
import { publicIdentity, type PublicIdentity } from "@/content/identity";
import {
  RESEARCH_FUNCTION_GROUPS,
  RESEARCH_FUNCTIONS,
  type ResearchFunction,
  type ResearchFunctionGroup,
  type ResearchFunctionId,
} from "@/content/functions";
import {
  OVERVIEWS,
  publicFunctions,
  publicOverview,
  type PublicOverview,
  type PublicStatement,
} from "@/content/overview";
import type { Reference } from "@/content/references";
import { researchReferenceIndex } from "@/content/research";
import { getProduct, publishedProducts, type Product } from "@/data/catalog";

import type { DiscoveryAreaId } from "@/data/discovery/types";
import type { Locale } from "@/i18n/config";

/**
 * THE COMPENDIUM — the catalogue read as a scientific reference.
 *
 * NOT A SECOND SOURCE OF TRUTH. Everything here is derived from the registries
 * that already exist: the catalogue says what a compound is and how it is
 * sold, `content/overview` says what the literature reports about it (every
 * sentence sourced), `content/references` holds the sources, and
 * `content/functions` names what is studied. A compound record is those four
 * read together and numbered like a paper. Nothing in this file writes a
 * sentence; it only decides which already-public sentences go where.
 *
 * Server-only by construction — it imports the catalogue and every registry.
 * Pages pass thin, already-public values to client components as props.
 */

/* ------------------------------------------------------------ memoisation */

/*
 * `publicOverview` walks every statement's references; a static build asks
 * for the same (slug, locale) from the library, every record, every line page
 * and the hub. Pure input, pure output, so caching it is safe.
 */
const overviewCache = new Map<string, PublicOverview | null>();
function overview(slug: string, locale: Locale): PublicOverview | null {
  const key = `${slug}:${locale}`;
  if (!overviewCache.has(key)) overviewCache.set(key, publicOverview(slug, locale));
  return overviewCache.get(key) ?? null;
}

/* --------------------------------------------------------------- records */

/**
 * A compound has a scientific record when its sourced profile publishes in
 * BOTH locales. One-locale records would give `/en/…` and `/es/…` different
 * sets of pages, and hreflang would point at a 404.
 */
export function hasRecord(slug: string): boolean {
  const product = getProduct(slug);
  if (!product || !publishedProducts.includes(product)) return false;
  return overview(slug, "es") !== null && overview(slug, "en") !== null;
}

/** The slugs `generateStaticParams` builds, in catalogue order. */
export function recordSlugs(): readonly string[] {
  return publishedProducts.filter((p) => hasRecord(p.slug)).map((p) => p.slug);
}

export interface RecordStatement {
  id: string;
  text: string;
  /** 1-based positions in the record's own reference list. */
  citations: readonly number[];
}

export interface CompoundRecord {
  product: Product;
  summary: string | null;
  mechanism: readonly RecordStatement[];
  research: readonly RecordStatement[];
  byArea: readonly { area: DiscoveryAreaId; statement: RecordStatement }[];
  notes: readonly string[];
  /** Numbered in order of first citation, as a paper numbers them. */
  references: readonly Reference[];
  functions: readonly ResearchFunction[];
  identity: PublicIdentity | null;
  /** Every published sentence of the record, for term matching. */
  text: string;
}

/**
 * The record, or null when the compound has none.
 *
 * REFERENCE NUMBERING follows the reading order — mechanism, then published
 * research, then research by area — so [01] is the first source a reader
 * meets. A key reference the text never cites is appended after the cited
 * ones rather than slotted in, so a number always means the same thing in
 * the text and in the list.
 */
export function compoundRecord(slug: string, locale: Locale): CompoundRecord | null {
  if (!hasRecord(slug)) return null;
  const product = getProduct(slug);
  const o = overview(slug, locale);
  if (!product || !o) return null;

  const order: Reference[] = [];
  const cite = (refs: readonly Reference[]) =>
    refs.map((ref) => {
      let index = order.findIndex((r) => r.id === ref.id);
      if (index === -1) {
        order.push(ref);
        index = order.length - 1;
      }
      return index + 1;
    });
  const statement = (s: PublicStatement): RecordStatement => ({
    id: s.id,
    text: s.text,
    citations: cite(s.references),
  });

  const mechanism = o.mechanismNotes.map(statement);
  const research = o.researchContext.map(statement);
  const byArea = o.areasOfInvestigation.map((entry) => ({
    area: entry.area,
    statement: statement(entry.statement),
  }));
  cite(o.keyReferences);

  const functions = publicFunctions(slug)
    .map((id) => RESEARCH_FUNCTIONS.find((f) => f.id === id))
    .filter((f): f is ResearchFunction => f !== undefined);

  return {
    product,
    summary: o.summary,
    mechanism,
    research,
    byArea,
    notes: o.technicalNotes,
    references: order,
    functions,
    identity: publicIdentity(slug),
    text: [
      o.summary ?? "",
      ...mechanism.map((s) => s.text),
      ...research.map((s) => s.text),
      ...byArea.map((a) => a.statement.text),
      ...o.technicalNotes,
    ].join(" "),
  };
}

/* ------------------------------------------------------- research lines */

/**
 * A RESEARCH LINE is a research function read from the other end: not "what
 * this compound is studied for" but "which compounds the literature studies
 * for this". It is NEOGEN's answer to a competitor's "stacks", and the
 * difference is the point. A stack groups compounds to be combined, which is
 * a protocol by another name. A line groups compounds by what published
 * research examined, each one present only because a sourced statement in its
 * own record says so — and the line page quotes that statement.
 *
 * No line recommends, combines or ranks. Compounds are listed in catalogue
 * order.
 */
export interface LineCompound {
  product: Product;
  /** The sourced statements that put this compound in the line. */
  statements: readonly PublicStatement[];
}

export interface ResearchLine {
  fn: ResearchFunction;
  compounds: readonly LineCompound[];
}

/** Statements in a product's public overview that back a given function. */
function backingStatements(
  slug: string,
  fn: ResearchFunctionId,
  locale: Locale,
): readonly PublicStatement[] {
  const declared = OVERVIEWS[slug]?.functions ?? [];
  const ids = new Set(declared.filter((tag) => tag.id === fn).map((tag) => tag.statement));
  const o = overview(slug, locale);
  if (!o) return [];
  return [...o.mechanismNotes, ...o.researchContext].filter((s) => ids.has(s.id));
}

export function researchLine(id: string, locale: Locale): ResearchLine | null {
  const fn = RESEARCH_FUNCTIONS.find((f) => f.id === id);
  if (!fn) return null;
  const compounds = publishedProducts
    .filter((p) => publicFunctions(p.slug).includes(fn.id))
    .map((product) => ({ product, statements: backingStatements(product.slug, fn.id, locale) }))
    .filter((c) => c.statements.length > 0);
  return compounds.length > 0 ? { fn, compounds } : null;
}

/** Every line with at least one compound, in vocabulary order. */
const linesCache = new Map<Locale, readonly ResearchLine[]>();

export function researchLines(locale: Locale): readonly ResearchLine[] {
  if (!linesCache.has(locale)) {
    linesCache.set(
      locale,
      RESEARCH_FUNCTIONS.map((fn) => researchLine(fn.id, locale)).filter(
        (line): line is ResearchLine => line !== null,
      ),
    );
  }
  return linesCache.get(locale) ?? [];
}

/**
 * Lines that exist in BOTH locales — the set `generateStaticParams` emits.
 * A function whose only backing statement fails in one language would
 * otherwise be a page in one locale and a 404 in the other.
 */
export function lineIds(): readonly ResearchFunctionId[] {
  const es = new Set(researchLines("es").map((l) => l.fn.id));
  return researchLines("en")
    .map((l) => l.fn.id)
    .filter((id) => es.has(id));
}

export function linesByGroup(
  locale: Locale,
): readonly { group: ResearchFunctionGroup; lines: readonly ResearchLine[] }[] {
  const lines = researchLines(locale);
  return RESEARCH_FUNCTION_GROUPS.map((g) => ({
    group: g.id,
    lines: lines.filter((l) => l.fn.group === g.id),
  })).filter((g) => g.lines.length > 0);
}

/**
 * Compounds that share research lines with this one, most shared first.
 *
 * "Related" in the only sense this site can defend: the literature studies
 * them for the same thing. Not similar effects, not a combination — a shared,
 * sourced line of research, and the record says which.
 */
export function relatedByLines(
  slug: string,
  limit = 6,
): readonly { product: Product; shared: readonly ResearchFunctionId[] }[] {
  const own = new Set(publicFunctions(slug));
  if (own.size === 0) return [];
  return publishedProducts
    .filter((p) => p.slug !== slug)
    .map((product) => ({
      product,
      shared: publicFunctions(product.slug).filter((id) => own.has(id)),
    }))
    .filter((row) => row.shared.length > 0)
    .sort(
      (a, b) => b.shared.length - a.shared.length || a.product.name.localeCompare(b.product.name),
    )
    .slice(0, limit);
}

/* ---------------------------------------------------------------- counts */

/**
 * What NEOGEN Research holds, counted from the registries. The hub prints
 * these; nothing is rounded, estimated or padded.
 */
export function compendiumStats(): {
  compounds: number;
  records: number;
  references: number;
  lines: number;
  terms: number;
} {
  return {
    compounds: publishedProducts.length,
    records: recordSlugs().length,
    references: researchReferenceIndex().length,
    lines: lineIds().length,
    terms: publicGlossary().length,
  };
}
