import "server-only";

import { routes } from "@/config/routes";
import { compoundRecord, lineIds, linesByGroup } from "@/content/compendium";
import { RESEARCH_FUNCTION_GROUPS } from "@/content/functions";
import { formatStrength, productType, publishedProducts, type Product } from "@/data/catalog";
import { publicAreasFor } from "@/data/discovery";
import { resolveEvidence } from "@/domain/quality";
import { localizePath } from "@/i18n/routing";

import type { LibraryEntry } from "@/components/research";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

/**
 * THE KNOWLEDGE PAGES' SHARED SERVER HELPERS.
 *
 * Small on purpose: template filling, the singular/plural choice every count
 * needs, a product's presentation labels, and the thin entries the
 * compendium hands to the browser. Anything with an opinion about content
 * lives in `content/compendium`.
 */

/** "{n} compuestos" → "85 compuestos". Unknown tokens are left visible, not blanked. */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/** The singular template for one, the plural for everything else. */
export function count(n: number, plural: string, singular: string): string {
  return n === 1 ? singular : fill(plural, { n });
}

/** "5 mg × 10" — strength as the source states it, then the pack size. */
export function presentationLabels(product: Product): readonly string[] {
  return product.variants.map(
    (v) => `${formatStrength(v.strength)}${v.vials ? ` × ${v.vials}` : ""}`,
  );
}

/** How many public documents a product has, across every presentation. */
export function documentCount(product: Product): number {
  const evidence = resolveEvidence(product);
  return [...evidence.product, ...evidence.presentations.flatMap((p) => p.records)].length;
}

/**
 * Research lines that have a page in BOTH locales — the only lines any page
 * may link. A tag whose line page does not exist is shown as text, never as
 * a link to a 404.
 */
export function linkableLines(): ReadonlySet<string> {
  return new Set(lineIds());
}

/** The compendium's line filter: groups in vocabulary order, linkable lines only. */
export function lineGroups(locale: Locale): readonly {
  label: string;
  lines: readonly { id: string; label: string }[];
}[] {
  const linkable = linkableLines();
  return linesByGroup(locale)
    .map(({ group, lines }) => ({
      label: RESEARCH_FUNCTION_GROUPS.find((g) => g.id === group)?.label[locale] ?? group,
      lines: lines
        .filter((l) => linkable.has(l.fn.id))
        .map((l) => ({ id: l.fn.id, label: l.fn.label[locale] })),
    }))
    .filter((g) => g.lines.length > 0);
}

/**
 * One thin, already-public entry per published compound, alphabetical.
 *
 * What crosses to the browser: labels, counts, presentation strings, and the
 * record's FIRST sourced sentence verbatim — the same sentence the record
 * page prints with its citation. Never a registry, a price, a variant id or a
 * document.
 */
export function libraryEntries(locale: Locale, dict: Dictionary): readonly LibraryEntry[] {
  const path = (route: string) => localizePath(route, locale);
  const linkable = linkableLines();
  const copy = dict.knowledge.record.documentation;

  return [...publishedProducts]
    .sort((a, b) => a.name.localeCompare(b.name, "es"))
    .map((product) => {
      const record = compoundRecord(product.slug, locale);
      const documents = documentCount(product);
      const first = record?.mechanism[0] ?? null;
      const firstResearch = record?.research[0] ?? null;
      return {
        slug: product.slug,
        name: product.name,
        alias: product.subtitle,
        composition: product.composition,
        type: dict.productTypes[productType(product)],
        /* The short, commercial area name: the row is scanned, not read. */
        areas: publicAreasFor(product.slug).map((area) => ({
          id: area.id,
          label: dict.discovery.areas[area.id].short,
        })),
        lines: (record?.functions ?? [])
          .filter((fn) => linkable.has(fn.id))
          .map((fn) => ({ id: fn.id, label: fn.label[locale], href: path(routes.line(fn.id)) })),
        presentations: presentationLabels(product),
        depth: record
          ? {
              mechanism: record.mechanism.length,
              research: record.research.length + record.byArea.length,
              notes: record.notes.length,
              references: record.references.length,
            }
          : null,
        lead: first
          ? { section: "mechanism" as const, text: first.text }
          : firstResearch
            ? { section: "research" as const, text: firstResearch.text }
            : null,
        recordHref: record ? path(routes.compound(product.slug)) : null,
        productHref: path(routes.product(product.slug)),
        documentation: documents === 0 ? null : count(documents, copy.count, copy.one),
      };
    });
}
