import { notFound } from "next/navigation";

import { Container, Section } from "@/components/primitives";
import { GlossaryExplorer, KnowledgeHead, type GlossaryEntry } from "@/components/research";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";
import { compoundRecord, recordSlugs } from "@/content/compendium";
import { publicArticle, publicArticles } from "@/content/editorial";
import {
  GLOSSARY_CATEGORIES,
  publicGlossary,
  publicTerm,
  termsInText,
  type GlossaryDestination,
} from "@/content/glossary";
import { researchReferenceIndex } from "@/content/research";
import { isLocale, localeTags, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";
import { count, fill } from "@/server/knowledge";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const title = dict.knowledge.glossary.title;
  const description = fill(dict.meta.descriptions.glossary, { count: publicGlossary().length });
  return {
    title,
    description,
    ...socialMetadata({ locale, path: routes.glossary, title, description }),
    alternates: alternates(locale, routes.glossary),
  };
}

/** Where a term's destination key goes — or nowhere, if that page does not exist. */
function destinationRoute(key: GlossaryDestination): string | null {
  switch (key) {
    case "peptides":
      return routes.peptides;
    case "compendium":
      return routes.compendium;
    case "lines":
      return routes.lines;
    case "handling":
      return routes.handling;
    case "start":
      return routes.start;
    case "references":
      /* The reference index 404s while nothing is cited; so does this link. */
      return researchReferenceIndex().length > 0 ? routes.researchReferences : null;
    case "quality-model":
      return `${routes.research}#calidad`;
  }
}

/**
 * Term id → the published prose, in this locale, that uses it.
 *
 * COMPOUND RECORDS AND THE NOTES, not records alone. Eight terms — COA, lot,
 * purity, HPLC, mass spectrometry, lyophilised, vial, hygroscopic — are used
 * by a published note and by no record, because documentation and handling
 * are written about in the notes. Indexing records only left each of them
 * defined with no route to anywhere it is used, which is the opposite of what
 * a glossary is for.
 */
interface TermUsage {
  records: readonly string[];
  notes: readonly string[];
}

const usageCache = new Map<Locale, ReadonlyMap<string, TermUsage>>();

/** A note as prose: every publishable block's text, in reading order. */
function articleText(slug: string, locale: Locale): string {
  const article = publicArticle(slug);
  if (!article) return "";
  return article.body
    .map((block) => {
      switch (block.kind) {
        case "paragraph":
        case "heading":
        case "note":
          return block.text[locale];
        case "list":
          return block.items[locale].join(" ");
        case "terms":
          return block.terms
            .map((entry) => `${entry.term[locale]} ${entry.definition[locale]}`)
            .join(" ");
      }
    })
    .join(" ");
}

function usage(locale: Locale): ReadonlyMap<string, TermUsage> {
  /* 63 terms matched over 62 records and the notes, all constant registries:
     computed once per locale, not on every request. */
  const cached = usageCache.get(locale);
  if (cached) return cached;
  const byTerm = new Map<string, { records: string[]; notes: string[] }>();
  const add = (id: string, kind: "records" | "notes", value: string) => {
    const entry = byTerm.get(id) ?? { records: [], notes: [] };
    entry[kind].push(value);
    byTerm.set(id, entry);
  };
  for (const slug of recordSlugs()) {
    const record = compoundRecord(slug, locale);
    if (!record) continue;
    for (const term of termsInText(record.text, locale)) add(term.id, "records", slug);
  }
  for (const article of publicArticles()) {
    for (const term of termsInText(articleText(article.slug, locale), locale)) {
      add(term.id, "notes", article.slug);
    }
  }
  usageCache.set(locale, byTerm);
  return byTerm;
}

/**
 * THE GLOSSARY — infrastructure for everything else in NEOGEN Research.
 *
 * Each term is defined once and linked from both ends: a compound record lists
 * the terms its text uses, and each term here lists the records that use it.
 * The list is computed by matching the glossary against the records' own
 * published sentences at build time, so neither side is a hand-kept list that
 * could drift.
 *
 * `DefinedTermSet` structured data is built from the same resolved entries
 * the page renders — nothing is said to a crawler that a reader cannot see.
 */
export default async function GlossaryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.knowledge.glossary;
  const path = (route: string) => localizePath(route, locale);
  const terms = publicGlossary();
  const used = usage(locale);
  const names = new Map(
    recordSlugs().map((slug) => [slug, compoundRecord(slug, locale)?.product.name ?? slug]),
  );

  const entries: GlossaryEntry[] = terms.map((term) => {
    const note = term.note ? publicArticle(term.note) : undefined;
    const destination = term.destination ? destinationRoute(term.destination) : null;
    return {
      id: term.id,
      category: term.category,
      term: term.term[locale],
      abbreviation: term.abbreviation ?? null,
      definition: term.definition[locale],
      seeAlso: (term.seeAlso ?? [])
        .map((id) => publicTerm(id))
        .filter((t) => t !== undefined)
        .map((t) => ({ id: t.id, label: t.term[locale] })),
      /* Records first, then the notes: a compound is the more specific answer
         to "where is this word used", and a note the wider one. */
      usedIn: [
        ...(used.get(term.id)?.records ?? [])
          .map((slug) => ({ name: names.get(slug) ?? slug, href: path(routes.compound(slug)) }))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
        ...(used.get(term.id)?.notes ?? [])
          /* The note a term already offers as "read more" is not also listed
             as a place the word is used: one destination, one route. */
          .filter((slug) => slug !== term.note)
          .map((slug) => ({
            name: publicArticle(slug)?.title[locale] ?? slug,
            href: path(routes.article(slug)),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "es")),
      ],
      note: note ? { href: path(routes.article(note.slug)), label: note.title[locale] } : null,
      destination:
        term.destination && destination
          ? { href: path(destination), label: copy.destinations[term.destination] }
          : null,
    };
  });

  const schema = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: `${dict.meta.siteName} — ${copy.title}`,
    inLanguage: localeTags[locale],
    url: `${siteConfig.url}${path(routes.glossary)}`,
    hasDefinedTerm: entries.map((entry) => ({
      "@type": "DefinedTerm",
      name: entry.term,
      ...(entry.abbreviation ? { termCode: entry.abbreviation } : {}),
      description: entry.definition,
      url: `${siteConfig.url}${path(routes.glossary)}#${entry.id}`,
    })),
  };

  return (
    <Section mode="quiet" aria-labelledby="glossary-title">
      <Container width="full">
        <KnowledgeHead
          crumbs={[{ label: dict.knowledge.crumbs.research, href: path(routes.research) }]}
          crumbsLabel={dict.knowledge.crumbs.research}
          eyebrow={`${copy.label} // ${copy.qualifier}`}
          title={copy.title}
          titleId="glossary-title"
          lede={copy.lede}
          meta={[count(entries.length, dict.knowledge.counts.terms, dict.knowledge.counts.term)]}
          aside={
            <p className="m-0 border-s-2 border-(--ink-primary) ps-(--space-md) text-sm leading-(--leading-relaxed) text-(--ink-secondary)">
              {copy.scope}
            </p>
          }
        />
        <div className="mt-(--space-xl)">
          <GlossaryExplorer
            entries={entries}
            categories={GLOSSARY_CATEGORIES.map((id) => ({ id, label: copy.categories[id] }))}
            copy={{
              search: copy.search,
              searchPlaceholder: copy.searchPlaceholder,
              categoryAll: copy.categories.all,
              view: copy.view,
              results: copy.results,
              result: copy.result,
              empty: copy.empty,
              seeAlso: copy.seeAlso,
              usedIn: copy.usedIn,
              more: copy.more,
              readMore: copy.readMore,
              letters: copy.letters,
            }}
          />
        </div>
      </Container>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, "\\u003c") }}
      />
    </Section>
  );
}
