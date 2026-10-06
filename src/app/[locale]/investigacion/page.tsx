import Link from "next/link";
import { notFound } from "next/navigation";

import { MarkField } from "@/components/brand/MarkField";
import { NoteIndex } from "@/components/editorial";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { EvidenceChain } from "@/components/quality";
import {
  CitationRail,
  KnowledgeHead,
  PathPicker,
  ResearchAreaIndex,
  type PathEntry,
} from "@/components/research";
import { Body, Mono } from "@/components/typography";
import { TextLink } from "@/components/ui";
import { ArchivePlate } from "@/components/research/ArchivePlate";
import { routes } from "@/config/routes";
import { compendiumStats, hasRecord, linesByGroup } from "@/content/compendium";
import { publicArticles } from "@/content/editorial";
import { RESEARCH_FUNCTION_GROUPS } from "@/content/functions";
import { researchReferenceIndex, referencesForArea } from "@/content/research";
import { getProduct, publishedProducts } from "@/data/catalog";
import {
  ArchiveMap,
  type ArchiveCompound,
  type ArchiveStatements,
} from "@/components/research/ArchiveMap";
import { productsInArea, publicAreas, publicAreasFor } from "@/data/discovery";
import { publicEvidenceIndex } from "@/domain/quality";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";
import { count, fill, libraryEntries, linkableLines } from "@/server/knowledge";

import styles from "./page.module.css";

import type { Metadata } from "next";
import type { DiscoveryAreaId } from "@/data/discovery";

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
 * NEOGEN RESEARCH — the entry point to the knowledge system.
 *
 * WHAT CHANGED. The hub was an index page: areas, a searchable compound
 * register, the quality model, notes and references, one after another. The
 * register has become the COMPENDIUM (its own page, with filters and a quick
 * view), and the hub now does the job an entry point should: it tells a
 * reader what the archive holds and where to begin, by who they are.
 *
 *   01  FRONT DOOR — title, a search, the three-way chooser (first time /
 *                    looking for a compound / weighing the evidence) whose
 *                    panel opens that path's doors, and the counts readout
 *   02  AREAS      — the eight places as tiles in their own materials
 *   03  LINES      — what the literature studies, each with a count bar
 *   04  QUALITY    — the rule evidence follows, drawn as a chain
 *   05  NOTES  +  06  SOURCES — side by side
 *
 * Every count is derived; every link goes to a page that exists — the
 * reference index and the documentation explorer are linked only while they
 * do (`check:output` asserts both).
 */
export default async function ResearchPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const hub = dict.research.hub;
  const path = (to: string) => localizePath(to, locale);
  const notes = publicArticles();
  const stats = compendiumStats();

  const areas = publicAreas();
  const library = libraryEntries(locale, dict);
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
      compendiumHref: `${path(routes.compendium)}?area=${area.id}`,
      /* The roster the tile opens into: the compendium's own rows for the
         area, A to Z, each leading to its record opened in the compendium. */
      roster: library
        .filter((entry) => entry.areas.some((a) => a.id === area.id))
        .map((entry) => ({
          slug: entry.slug,
          name: entry.name,
          depth: entry.depth,
          href: `${path(routes.compendium)}?area=${area.id}&ficha=${entry.slug}`,
        })),
    };
  });

  const linkable = linkableLines();
  const lineGroups = linesByGroup(locale)
    .map((g) => ({ ...g, lines: g.lines.filter((l) => linkable.has(l.fn.id)) }))
    .filter((g) => g.lines.length > 0);

  /*
   * THE ARCHIVE MAP's data — every linkable line, every compound placed in
   * one by a sourced statement, and that statement. Columns are filed by the
   * compound's first area, then by name: catalogue facts, never a grouping
   * by likeness.
   */
  const areaOrder = publicAreas().map((a) => a.id);
  const placed = new Map<string, { product: (typeof publishedProducts)[number] }>();
  for (const g of lineGroups)
    for (const l of g.lines) for (const c of l.compounds) placed.set(c.product.slug, c);
  const mapCompounds: ArchiveCompound[] = [...placed.values()]
    .map(({ product }) => {
      const area = publicAreasFor(product.slug)[0]?.id ?? null;
      return {
        slug: product.slug,
        name: product.name,
        area,
        href: hasRecord(product.slug)
          ? path(routes.compound(product.slug))
          : path(routes.product(product.slug)),
      };
    })
    .sort((a, b) => {
      const ia = a.area ? areaOrder.indexOf(a.area) : 99;
      const ib = b.area ? areaOrder.indexOf(b.area) : 99;
      return ia - ib || a.name.localeCompare(b.name, locale);
    });
  const column = new Map(mapCompounds.map((c, i) => [c.slug, i]));
  const mapStatements: Record<string, { text: string; sources: number }> = {};
  const mapGroups = lineGroups.map(({ group, lines }) => ({
    id: group,
    label: RESEARCH_FUNCTION_GROUPS.find((g) => g.id === group)?.label[locale] ?? group,
    lines: lines.map((line) => {
      for (const c of line.compounds) {
        const sources = new Set(c.statements.flatMap((st) => st.references.map((r) => r.id)));
        mapStatements[`${line.fn.id}|${c.product.slug}`] = {
          text: c.statements.map((st) => st.text).join(" "),
          sources: sources.size,
        };
      }
      return {
        id: line.fn.id,
        label: line.fn.label[locale],
        href: path(routes.line(line.fn.id)),
        members: line.compounds
          .map((c) => column.get(c.product.slug) ?? -1)
          .filter((i) => i >= 0)
          .sort((a, b) => a - b),
      };
    }),
  }));
  const mapAreaNames = Object.fromEntries(
    areaOrder.map((id) => [id, dict.discovery.areas[id].short]),
  );

  const hasPublicDocuments = publicEvidenceIndex(publishedProducts).length > 0;
  const referenceIndex = researchReferenceIndex();
  /* Four: a sample rather than a truncated list, and a column that sits
     level with the notes beside it. */
  const referencePreview = referenceIndex.slice(0, 4);

  /*
   * THE ARCHIVE PLATE (Research colour completion): every compound once, in
   * the catalogue's area order, under the first area it is filed in — the
   * same entries and the same record facts the compendium lists.
   */
  const plateRows = [
    ...areas.map((area) => ({
      area: area.id as DiscoveryAreaId | null,
      label: dict.discovery.areas[area.id].short,
    })),
    { area: null, label: hub.plate.none },
  ]
    .map((row) => ({
      ...row,
      compounds: library
        .filter((entry) => (entry.areas[0]?.id ?? null) === row.area)
        .map((entry) => ({
          slug: entry.slug,
          name: entry.name,
          record: entry.recordHref !== null,
          href: `${path(routes.compendium)}?${row.area ? `area=${row.area}&` : ""}ficha=${entry.slug}`,
        })),
    }))
    .filter((row) => row.compounds.length > 0);
  const plateSummary = fill(hub.plate.summary, {
    n: library.length,
    areas: areas.length,
    records: library.filter((entry) => entry.recordHref !== null).length,
  });

  const statList = [
    { label: hub.stats.compounds, n: stats.compounds, href: path(routes.compendium) },
    {
      label: hub.stats.records,
      n: stats.records,
      href: `${path(routes.compendium)}?registro=1`,
    },
    ...(referenceIndex.length > 0
      ? [
          {
            label: hub.stats.references,
            n: stats.references,
            href: path(routes.researchReferences),
          },
        ]
      : []),
    { label: hub.stats.lines, n: stats.lines, href: path(routes.lines) },
    { label: hub.stats.terms, n: stats.terms, href: path(routes.glossary) },
  ];

  const paths = hub.paths;
  const counts = dict.knowledge.counts;
  /* The flagships' records — the three compounds with a world of their own,
     a catalogue fact, not a ranking. Only those with a record are offered. */
  const flagships = publishedProducts.filter((p) => p.world !== null && hasRecord(p.slug));

  const searchForm = (id: string) => (
    /* A plain GET form: it works before hydration and without JavaScript, and
       lands on the compendium already filtered. */
    <form action={path(routes.compendium)} method="get" className={styles.search}>
      <label htmlFor={id} className={styles.searchLabel}>
        {hub.search.label}
      </label>
      <div className={styles.searchRow}>
        <input
          id={id}
          name="q"
          type="search"
          placeholder={hub.search.placeholder}
          className={styles.searchInput}
          autoComplete="off"
        />
        <button type="submit" className={styles.searchButton}>
          {hub.search.submit}
        </button>
      </div>
    </form>
  );

  const pathEntries: PathEntry[] = [
    {
      id: "begin",
      letter: "A",
      question: paths.begin.question,
      body: paths.begin.body,
      doors: [
        {
          href: path(routes.start),
          title: paths.begin.start.title,
          body: paths.begin.start.body,
          meta: paths.begin.start.meta,
        },
        {
          href: path(routes.peptides),
          title: paths.begin.peptides.title,
          body: paths.begin.peptides.body,
          meta: paths.begin.peptides.meta,
        },
        {
          href: path(routes.glossary),
          title: paths.begin.glossary.title,
          body: fill(paths.begin.glossary.body, { n: stats.terms }),
          meta: count(stats.terms, counts.terms, counts.term),
        },
      ],
    },
    {
      id: "explore",
      letter: "B",
      question: paths.explore.question,
      body: paths.explore.body,
      doors: [
        {
          href: path(routes.compendium),
          title: paths.explore.compendium.title,
          body: fill(paths.explore.compendium.body, { n: stats.compounds, records: stats.records }),
          meta: count(stats.compounds, counts.compounds, counts.compound),
        },
        {
          href: path(routes.lines),
          title: paths.explore.lines.title,
          body: fill(paths.explore.lines.body, { n: stats.lines }),
          meta: count(stats.lines, counts.lines, counts.line),
        },
        {
          href: "#areas-title",
          title: paths.explore.areas.title,
          body: paths.explore.areas.body,
          meta: fill(paths.explore.areasMeta, { n: areas.length }),
        },
      ],
      extra: (
        <div className={styles.explore}>
          {flagships.length > 0 ? (
            <div className={styles.flagships}>
              <p className={styles.flagshipsLabel}>{paths.explore.flagships}</p>
              <ul>
                {flagships.map((p) => (
                  <li key={p.slug}>
                    <Link href={path(routes.compound(p.slug))} className={styles.flagship}>
                      {p.name} <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "evaluate",
      letter: "C",
      question: paths.evaluate.question,
      body: paths.evaluate.body,
      doors: [
        ...(referenceIndex.length > 0
          ? [
              {
                href: path(routes.researchReferences),
                title: paths.evaluate.references.title,
                body: fill(paths.evaluate.references.body, { n: referenceIndex.length }),
                meta: fill(paths.evaluate.referencesMeta, { n: referenceIndex.length }),
              },
            ]
          : []),
        {
          href: "#calidad",
          title: paths.evaluate.quality.title,
          body: paths.evaluate.quality.body,
          meta: paths.evaluate.qualityMeta,
        },
        {
          href: path(routes.handling),
          title: paths.evaluate.handling.title,
          body: paths.evaluate.handling.body,
          meta: paths.evaluate.handlingMeta,
        },
        ...(notes.length > 0
          ? [
              {
                href: path(routes.articles),
                title: paths.evaluate.notes.title,
                body: paths.evaluate.notes.body,
                meta: fill(paths.evaluate.notesMeta, { n: notes.length }),
              },
            ]
          : []),
      ],
    },
  ];

  return (
    <>
      {/*
       * 01 — THE FRONT DOOR. Title, a search for the reader who already knows
       * what they want, and the three-way choice for everyone else; the
       * archive's counts close the section as a readout.
       */}
      <Section mode="quiet" aria-labelledby="research-title" className={styles.hero}>
        {/*
         * NEOGEN RESEARCH, set inside the mark. The BRAND layer only: one mark,
         * far larger than any figure, cropped by the page's edge, in the
         * paper's own stone, behind the title — and kept out of the column
         * where the archive plate (data) sits.
         */}
        <MarkField name="research" className={styles.heroField} />
        <Container width="full">
          <KnowledgeHead
            crumbs={[]}
            crumbsLabel={hub.label}
            eyebrow={`${hub.label} // ${hub.qualifier}`}
            title={hub.title}
            titleId="research-title"
            lede={hub.lede}
            aside={
              <div className={styles.heroAside}>
                <ArchivePlate
                  rows={plateRows}
                  copy={{
                    label: hub.plate.label,
                    legend: { record: hub.plate.record, none: hub.plate.noRecord },
                    summary: plateSummary,
                  }}
                />
                {searchForm("hub-search")}
              </div>
            }
          />

          <div className={styles.chooser}>
            <PathPicker paths={pathEntries} label={paths.chooser} />
          </div>

          <div className={styles.readout}>
            <p className={styles.readoutLabel}>{hub.stats.label}</p>
            <ul className={styles.readoutList}>
              {statList.map((stat) => (
                <li key={stat.label}>
                  <Link href={stat.href} className={styles.readoutItem}>
                    <span className={styles.readoutValue}>{stat.n}</span>
                    <span className={styles.readoutName}>{stat.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section mode="quiet" aria-labelledby="areas-title" className="bg-(--surface-raised)">
        <Container width="full">
          <SectionHeader
            index={hub.areas.index}
            label={`${hub.areas.label} // ${hub.areas.qualifier}`}
            title={hub.areas.title}
            id="areas-title"
            /* The one route from the hub to the whole catalogue. The tiles
               below lead to an area's products; a reader who does not want to
               choose an area had no way through from here. */
            action={<TextLink href={path(routes.products)}>{hub.areas.all}</TextLink>}
          />
          <ResearchAreaIndex
            entries={areaEntries}
            copy={{ ...hub.areas, depth: dict.knowledge.compendium.depth }}
          />
        </Container>
      </Section>

      {lineGroups.length > 0 ? (
        <Section mode="quiet" aria-labelledby="hub-lines-title">
          <Container width="full">
            <SectionHeader
              index={hub.lines.index}
              label={`${hub.lines.label} // ${hub.lines.qualifier}`}
              title={hub.lines.title}
              lede={hub.lines.lede}
              id="hub-lines-title"
              action={<TextLink href={path(routes.lines)}>{hub.lines.all}</TextLink>}
            />
            <ArchiveMap
              groups={mapGroups}
              compounds={mapCompounds}
              statements={mapStatements as ArchiveStatements}
              copy={{ ...hub.lines.map, areas: mapAreaNames }}
            />
          </Container>
        </Section>
      ) : null}

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
          <EvidenceChain copy={dict.quality.record.chain} variant="layers" />
        </Container>
      </Section>

      {/* 05 + 06 — the reading and the sources, side by side: both are
          things to read, held to the same evidence rules. */}
      <Section mode="quiet" aria-label={`${hub.notes.title} · ${hub.references.title}`}>
        <Container width="full">
          <div className={styles.reading}>
            {notes.length > 0 ? (
              <div className={styles.readingColumn}>
                <SectionHeader
                  scale="record"
                  index={hub.notes.index}
                  label={`${hub.notes.label} // ${hub.notes.qualifier}`}
                  title={hub.notes.title}
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
                  ordered={false}
                />
              </div>
            ) : null}

            <div className={styles.readingColumn}>
              <SectionHeader
                scale="record"
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
                  <Mono size="2xs" className="mb-(--space-sm) block text-(--ink-muted) uppercase">
                    {fill(hub.references.showing, { n: referencePreview.length })}
                  </Mono>
                  <CitationRail
                    references={referencePreview.map((e) => e.reference)}
                    copy={dict.citations}
                    citedBy={{
                      label: hub.references.citedBy,
                      byReference: Object.fromEntries(
                        referencePreview.map((e) => [
                          e.reference.id,
                          e.products.map((slug) => {
                            const area = publicAreasFor(slug)[0]?.id;
                            return {
                              name: getProduct(slug)?.name ?? slug,
                              href: `${path(routes.compendium)}?${area ? `area=${area}&` : ""}ficha=${slug}`,
                              areas: publicAreasFor(slug).map((a) => a.id),
                            };
                          }),
                        ]),
                      ),
                    }}
                  />
                  <div className="mt-(--space-lg) flex flex-wrap items-baseline gap-x-(--space-xl) gap-y-(--space-sm)">
                    <TextLink href={path(routes.researchReferences)}>
                      {fill(hub.references.all, { n: referenceIndex.length })}
                    </TextLink>
                    <Mono size="2xs" className="text-(--ink-muted)">
                      {hub.references.citedBy} —{" "}
                      {count(
                        [...new Set(referenceIndex.flatMap((e) => e.products))].length,
                        counts.compounds,
                        counts.compound,
                      )}
                    </Mono>
                  </div>
                </>
              )}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
