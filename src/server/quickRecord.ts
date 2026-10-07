import "server-only";

import { publicSimpleEffects } from "@/content/effects";
import { routes } from "@/config/routes";
import { compoundRecord } from "@/content/compendium";
import { termsInText } from "@/content/glossary";
import { referenceHref } from "@/content/references";
import { getProduct, publishedProducts } from "@/data/catalog";
import { formatPrice, getPrices } from "@/data/commerce";
import { resolveEvidence } from "@/domain/quality";
import { localeTags, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { presentationLabels } from "@/server/knowledge";

import type {
  QuickRecordData,
  QuickSource,
  QuickStatement,
} from "@/components/research/quickRecordData";

/**
 * ONE COMPOUND'S QUICK RECORD — everything the compendium drawer can show,
 * resolved from the registries the full record reads.
 *
 * Nothing is written here. Statements are the record's own sourced sentences
 * with the record's own citation numbers; sources are the reference records;
 * prices come from the commerce layer; documentation counts come from the
 * quality resolver. A compound without a scientific record gets `record:
 * null` and still gets its product and documentation zones — the drawer says
 * what is missing instead of filling the space.
 */
export async function quickRecord(slug: string, locale: Locale): Promise<QuickRecordData | null> {
  const product = getProduct(slug);
  if (!product || !publishedProducts.includes(product)) return null;

  const dict = await getDictionary(locale);
  const path = (to: string) => localizePath(to, locale);
  const tag = localeTags[locale];
  const record = compoundRecord(slug, locale);
  const recordHref = path(routes.compound(slug));

  /* ---- the scientific record ------------------------------------------- */
  let recordData: QuickRecordData["record"] = null;
  if (record) {
    const statements: QuickStatement[] = [
      ...record.mechanism.map((s) => ({
        s,
        section: "mechanism" as const,
        area: null,
        anchor: "mecanismo",
      })),
      ...record.research.map((s) => ({
        s,
        section: "research" as const,
        area: null,
        anchor: "investigacion",
      })),
      ...record.byArea.map((e) => ({
        s: e.statement,
        section: "area" as const,
        area: dict.discovery.areas[e.area].title,
        anchor: "por-area",
      })),
    ].map(({ s, section, area, anchor }) => ({
      id: s.id,
      section,
      area,
      text: s.text,
      citations: s.citations,
      aspect: s.aspect,
      recordHref: `${recordHref}#${anchor}`,
    }));

    const sources: QuickSource[] = record.references.map((ref, i) => {
      const n = i + 1;
      return {
        n,
        title: ref.title,
        authors:
          ref.authors.length > 3
            ? `${ref.authors.slice(0, 3).join(", ")} ${dict.citations.etAl}`
            : ref.authors.join(", "),
        publication: ref.publication,
        year: ref.year,
        type: dict.citations.sourceTypes[ref.sourceType],
        doi: ref.doi,
        pmid: ref.pmid,
        href: referenceHref(ref),
        citedBy: statements.filter((s) => s.citations.includes(n)).map((s) => s.id),
      };
    });

    const years = record.references.map((r) => r.year).filter((y): y is number => y !== null);
    const typeCounts = new Map<string, number>();
    for (const s of sources) typeCounts.set(s.type, (typeCounts.get(s.type) ?? 0) + 1);

    recordData = {
      href: recordHref,
      summary: record.summary,
      studiedFor: record.studiedFor,
      statements,
      notes: record.notes,
      sources,
      span: years.length ? [Math.min(...years), Math.max(...years)] : null,
      types: [...typeCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count })),
      terms: termsInText(record.text, locale).map((t) => ({
        id: t.id,
        label: t.term[locale],
        href: path(routes.glossaryTerm(t.id)),
      })),
      identity: record.identity
        ? {
            formula: record.identity.formula,
            mass:
              record.identity.molecularMass === null
                ? null
                : `${record.identity.molecularMass} g/mol`,
            sequence: record.identity.sequence,
            cas: record.identity.cas,
            source: record.identity.sourceLabel,
            sourceUrl: record.identity.sourceUrl,
          }
        : null,
    };
  }

  /* ---- NEOGEN's product ---------------------------------------------------- */
  const prices = await getPrices(product.variants.map((v) => v.id));
  const labels = presentationLabels(product);
  const presentations = product.variants.map((v, i) => {
    const price = prices.get(v.id) ?? null;
    return { label: labels[i], price: price ? formatPrice(price, tag) : null };
  });
  const cheapest = product.variants
    .map((v) => prices.get(v.id) ?? null)
    .filter((p) => p !== null)
    .sort((a, b) => a.amount - b.amount)[0];

  /* ---- documentation of NEOGEN's material, by level ----------------------- */
  const evidence = resolveEvidence(product);
  const variantRecords = evidence.presentations.flatMap((p) => p.records);

  return {
    slug,
    simpleEffects: publicSimpleEffects(slug, locale),
    record: recordData,
    product: {
      href: path(routes.product(slug)),
      presentations,
      from: cheapest ? formatPrice(cheapest, tag) : null,
    },
    docs: {
      product: evidence.product.length,
      presentation: variantRecords.filter((r) => r.level === "variant").length,
      lot: variantRecords.filter((r) => r.level === "lot").length,
      href: `${path(routes.product(slug))}#calidad`,
    },
  };
}
