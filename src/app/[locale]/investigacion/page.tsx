import { notFound } from "next/navigation";

import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { NoteIndex } from "@/components/editorial";
import { EvidenceChain } from "@/components/quality";
import { CitationRail, CompoundFinder, ResearchAreaIndex } from "@/components/research";
import { Body, Mono } from "@/components/typography";
import { TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
import { publicArticles } from "@/content/editorial";
import { researchReferenceIndex, referencesForArea } from "@/content/research";
import { formatStrength, publishedProducts } from "@/data/catalog";
import { productsInArea, publicAreas, publicAreasFor } from "@/data/discovery";
import { publicEvidenceIndex, resolveEvidence } from "@/domain/quality";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const description = dict.meta.descriptions.research;
  return {
    title: dict.research.title,
    description,
    ...socialMetadata({ locale, path: routes.research, title: dict.research.title, description }),
    alternates: alternates(locale, routes.research),
  };
}

/**
 * NEOGEN RESEARCH — an index and an evidence model.
 *
 * WHAT CHANGED. The hub used to be a static 85-row register above a ledger of
 * three "document unavailable" records and an empty literature section. It
 * read as an isolated table with two apologies under it. It is now built for
 * browsing without buying:
 *
 *   01  masthead
 *   02  RESEARCH AREAS   — the eight places, with real compound counts
 *   03  COMPOUND INDEX   — searchable, filterable by area
 *   04  QUALITY MODEL    — the rule evidence follows, drawn as a chain
 *   05  REFERENCES       — the citation index, from the same registry the
 *                          product pages cite
 *
 * Every section shows something that exists. The reference index is empty,
 * and says what would put something in it rather than implying an archive is
 * coming. Nothing here is "latest research": there is none to feature.
 *
 * SERVER-FIRST. The finder receives a thin list — names, area labels,
 * presentation summaries, a documentation label resolved here — and no
 * catalogue, price map or document registry reaches the browser.
 */
export default async function ResearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const hub = dict.research.hub;
  const path = (to: string) => localizePath(to, locale);
  const notes = publicArticles();

  const areas = publicAreas();
  const areaEntries = areas.map((area) => {
    const items = productsInArea(area.id);
    return {
      id: area.id,
      index: String(area.order).padStart(2, "0"),
      short: dict.discovery.areas[area.id].short,
      title: dict.discovery.areas[area.id].title,
      body: dict.discovery.areas[area.id].body,
      href: path(routes.area(area.slug)),
      compounds: items.length,
      references: referencesForArea(area.id).length,
      examples: items.slice(0, 3).map((p) => p.name),
    };
  });

  const finderEntries = [...publishedProducts]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((product) => {
      const evidence = resolveEvidence(product);
      const count = [...evidence.product, ...evidence.presentations.flatMap((p) => p.records)]
        .length;
      return {
        slug: product.slug,
        name: product.name,
        subtitle: product.subtitle,
        href: path(routes.product(product.slug)),
        areas: publicAreasFor(product.slug).map((a) => ({
          id: a.id,
          label: dict.discovery.areas[a.id].title,
        })),
        presentations: product.variants.map((v) => formatStrength(v.strength)).join(" · "),
        documentation:
          count === 0
            ? null
            : count === 1
              ? hub.finder.document
              : hub.finder.documents.replace("{n}", String(count)),
      };
    });

  const hasPublicDocuments = publicEvidenceIndex(publishedProducts).length > 0;
  const referenceIndex = researchReferenceIndex();
  /* Six is the most that reads as a sample rather than a truncated list. */
  const referencePreview = referenceIndex.slice(0, 6);
  const fill = (template: string, values: Record<string, number | string>) =>
    template.replace(/\{(\w+)\}/g, (match, key: string) =>
      key in values ? String(values[key]) : match,
    );

  return (
    <>
      <Section mode="quiet" aria-labelledby="research-title">
        <Container width="full">
          <SectionHeader
            index={hub.index}
            label={`${hub.label} // ${hub.qualifier}`}
            title={hub.title}
            id="research-title"
            lede={hub.lede}
            as="h1"
          />
        </Container>
      </Section>

      <Section mode="quiet" aria-labelledby="areas-title" className="pt-0">
        <Container width="full">
          <SectionHeader
            index={hub.areas.index}
            label={`${hub.areas.label} // ${hub.areas.qualifier}`}
            title={hub.areas.title}
            id="areas-title"
          />
          <ResearchAreaIndex entries={areaEntries} copy={hub.areas} />
        </Container>
      </Section>

      <Section mode="quiet" aria-labelledby="index-title" id="indice">
        <Container width="full">
          <SectionHeader
            index={hub.finder.index}
            label={`${hub.finder.label} // ${hub.finder.qualifier}`}
            title={hub.finder.title}
            id="index-title"
            action={<TextLink href={path(routes.products)}>{dict.discovery.all}</TextLink>}
          />
          <CompoundFinder
            entries={finderEntries}
            areas={areaEntries.map((a) => ({ id: a.id, label: a.title }))}
            copy={hub.finder}
          />
        </Container>
      </Section>

      <Section
        mode="quiet"
        aria-labelledby="quality-model-title"
        id="calidad"
        className="bg-(--surface-raised)"
      >
        <Container width="full">
          <SectionHeader
            index={hub.quality.index}
            label={`${hub.quality.label} // ${hub.quality.qualifier}`}
            title={hub.quality.title}
            id="quality-model-title"
            lede={hub.quality.lede}
            action={
              /* Only a link to a page that exists: the explorer 404s in
                 production until a public document does. */
              hasPublicDocuments ? (
                <TextLink href={path(routes.qualityExplorer)}>{hub.quality.explorer}</TextLink>
              ) : undefined
            }
          />
          <EvidenceChain copy={dict.quality.record.chain} />
        </Container>
      </Section>

      {/*
       * 06 — THE NOTES. The hub's reading section: the editorial layer belongs
       * beside the reference index because both are things to read, held to
       * the same evidence rules. It renders only while notes exist, from the
       * same accessor the routes are generated from.
       */}
      {notes.length > 0 ? (
        <Section mode="quiet" aria-labelledby="hub-notes-title">
          <Container width="full">
            <SectionHeader
              index={hub.notes.index}
              label={`${hub.notes.label} // ${hub.notes.qualifier}`}
              title={hub.notes.title}
              lede={hub.notes.lede}
              id="hub-notes-title"
              action={<TextLink href={path(routes.articles)}>{hub.notes.all}</TextLink>}
            />
            <NoteIndex
              notes={notes.map((note) => ({
                slug: note.slug,
                href: path(routes.article(note.slug)),
                topic: dict.editorial.topics[note.topic],
                title: note.title[locale],
                summary: note.summary[locale],
                publishedOn: note.publishedOn,
              }))}
              localeTag={localeTags[locale]}
            />
          </Container>
        </Section>
      ) : null}

      <Section mode="quiet" aria-labelledby="references-title">
        <Container width="full">
          <SectionHeader
            index={hub.references.index}
            label={`${hub.references.label} // ${hub.references.qualifier}`}
            title={hub.references.title}
            id="references-title"
          />
          {referenceIndex.length === 0 ? (
            <Body tone="muted" className="max-w-(--container-prose)">
              {hub.references.empty}
            </Body>
          ) : (
            <>
              {/*
               * A preview, not the registry. The hub is a map; the full index
               * has its own route, because 74 records rendered in full made
               * this page forty screens long on a phone.
               */}
              <Mono size="2xs" className="mb-(--space-sm) block text-(--ink-muted) uppercase">
                {fill(hub.references.showing, { n: referencePreview.length })}
              </Mono>
              <CitationRail
                references={referencePreview.map((e) => e.reference)}
                copy={dict.citations}
              />
              <div className="mt-(--space-lg) flex flex-wrap items-baseline gap-x-(--space-xl) gap-y-(--space-sm)">
                <TextLink href={path(routes.researchReferences)}>
                  {fill(hub.references.all, { n: referenceIndex.length })}
                </TextLink>
                <Mono size="2xs" className="text-(--ink-muted)">
                  {hub.references.citedBy} —{" "}
                  {[...new Set(referenceIndex.flatMap((e) => e.products))].length}
                </Mono>
              </div>
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
