import Link from "next/link";
import { notFound } from "next/navigation";

import { Container, Section } from "@/components/primitives";
import { EvidenceChain } from "@/components/quality";
import { CitationRail, KnowledgeHead, RouteList, SectionIndex } from "@/components/research";
import doc from "@/components/research/KnowledgeDocument.module.css";
import { routes } from "@/config/routes";
import { compendiumStats, compoundRecord, recordSlugs } from "@/content/compendium";
import { publicArticle } from "@/content/editorial";
import { publicTerm } from "@/content/glossary";
import { publicAreas } from "@/data/discovery";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";
import { fill } from "@/server/knowledge";

import styles from "./page.module.css";

import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const title = dict.knowledge.start.title;
  const description = dict.meta.descriptions.start;
  return {
    title,
    description,
    ...socialMetadata({ locale, path: routes.start, title, description }),
    alternates: alternates(locale, routes.start),
  };
}

/**
 * The record Start Here dissects: the flagship's, when it has one, else the
 * first record in the catalogue. Always a REAL record, so the lesson and the
 * archive can never disagree about what a record looks like.
 */
const SPECIMEN = "reta";

/** Terms a first-time reader meets in step 03, linked to their definitions. */
const READING_TERMS = ["afirmacion-con-fuente", "referencia", "in-vitro", "modelo-animal", "fases"];

/**
 * START HERE — five steps, from "what is this" to "where next".
 *
 * NOT AN ARTICLE. Each step is short and ends in something to look at or use:
 * a definition and the condition of sale; a map of the archive's five levels
 * with their real counts, each one a door; a real record excerpt with its
 * parts annotated; the three questions any analytical document must answer,
 * with the evidence chain beside them; and four routes onward. The local
 * index keeps the reader oriented and lets someone skip straight to the step
 * they need.
 *
 * Nothing on this page is example data. The annotated excerpt is the
 * specimen record's first published sentence with its real citation, and the
 * counts are the registries'.
 */
export default async function StartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.knowledge.start;
  const hub = dict.research.hub;
  const path = (route: string) => localizePath(route, locale);
  const stats = compendiumStats();

  const specimenSlug = recordSlugs().includes(SPECIMEN) ? SPECIMEN : recordSlugs()[0];
  const specimen = specimenSlug ? compoundRecord(specimenSlug, locale) : null;
  const excerpt = specimen?.mechanism[0] ?? specimen?.research[0] ?? null;
  const excerptSection = specimen?.mechanism[0]
    ? dict.knowledge.record.sections.mechanism
    : dict.knowledge.record.sections.research;
  const excerptReference = excerpt ? specimen?.references[excerpt.citations[0] - 1] : undefined;
  const terms = READING_TERMS.map((id) => publicTerm(id)).filter((t) => t !== undefined);
  const coaNote = publicArticle("como-leer-un-certificado-de-analisis");

  const steps = [
    { id: "que-es", label: copy.what.label },
    { id: "organizacion", label: copy.map.label },
    ...(excerpt ? [{ id: "lectura", label: copy.anatomy.label }] : []),
    { id: "documentacion", label: copy.evidence.label },
    { id: "siguiente", label: copy.next.label },
  ];
  const number = (id: string) => String(steps.findIndex((s) => s.id === id) + 1).padStart(2, "0");
  const heading = (id: string, title: string) => (
    <h2 id={`${id}-h`} className={doc.sectionTitle}>
      <span className={doc.sectionNumber} aria-hidden="true">
        {number(id)}
      </span>
      {title}
    </h2>
  );

  const levels = [
    {
      key: "areas",
      href: path(routes.research) + "#areas-title",
      n: publicAreas().length,
      ...copy.map.levels.areas,
    },
    { key: "lines", href: path(routes.lines), n: stats.lines, ...copy.map.levels.lines },
    {
      key: "compounds",
      href: path(routes.compendium),
      n: stats.compounds,
      ...copy.map.levels.compounds,
    },
    {
      key: "records",
      href: `${path(routes.compendium)}?registro=1`,
      n: stats.records,
      ...copy.map.levels.records,
    },
    {
      key: "references",
      href: path(routes.researchReferences),
      n: stats.references,
      ...copy.map.levels.references,
    },
  ].filter((level) => level.n > 0);

  return (
    <Section mode="quiet" aria-labelledby="start-title">
      <Container width="full">
        <KnowledgeHead
          crumbs={[{ label: dict.knowledge.crumbs.research, href: path(routes.research) }]}
          crumbsLabel={dict.knowledge.crumbs.research}
          eyebrow={`${copy.label} // ${copy.qualifier}`}
          title={copy.title}
          titleId="start-title"
          lede={copy.lede}
        />

        <div className={doc.layout}>
          <div className={doc.rail}>
            <SectionIndex items={steps} label={copy.progress} title={copy.progress} />
          </div>

          <div className={doc.document}>
            {/* 01 — what this is */}
            <section id="que-es" aria-labelledby="que-es-h" className={doc.section}>
              {heading("que-es", copy.what.title)}
              <p className={doc.body}>{copy.what.body}</p>
              <p className={styles.condition}>{copy.what.condition}</p>
              <div className={styles.links}>
                <Link href={path(routes.peptides)} className={doc.textLink}>
                  {copy.what.peptides} <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href={path(routes.article("uso-exclusivo-en-investigacion"))}
                  className={doc.textLink}
                >
                  {copy.what.research} <span aria-hidden="true">→</span>
                </Link>
              </div>
            </section>

            {/* 02 — how it is organised: five levels, each a door */}
            <section id="organizacion" aria-labelledby="organizacion-h" className={doc.section}>
              {heading("organizacion", copy.map.title)}
              <p className={doc.body}>{copy.map.body}</p>
              <ol className={styles.map}>
                {levels.map((level, i) => (
                  <li key={level.key} className={styles.level}>
                    <Link href={level.href} className={styles.levelLink}>
                      <span className={styles.levelIndex} aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className={styles.levelCount}>{level.n}</span>
                      <span className={styles.levelTitle}>{level.title}</span>
                      <span className={styles.levelBody}>{level.body}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>

            {/* 03 — how to read a record: a real excerpt, annotated */}
            {specimen && excerpt ? (
              <section id="lectura" aria-labelledby="lectura-h" className={doc.section}>
                {heading("lectura", copy.anatomy.title)}
                <p className={doc.body}>
                  {fill(copy.anatomy.body, { name: specimen.product.name })}
                </p>

                <figure className={styles.specimen}>
                  <figcaption className={doc.srOnly}>
                    {fill(copy.anatomy.figure, { name: specimen.product.name })}
                  </figcaption>
                  <div className={styles.excerpt}>
                    <p className={styles.excerptSection}>
                      <span className={styles.callout} aria-hidden="true">
                        1
                      </span>
                      {excerptSection}
                    </p>
                    <p className={styles.excerptText}>
                      <span className={styles.callout} aria-hidden="true">
                        2
                      </span>
                      {excerpt.text}{" "}
                      <span className={styles.excerptMark}>
                        [{excerpt.citations.map((n) => String(n).padStart(2, "0")).join(", ")}]
                        <span className={styles.callout} aria-hidden="true">
                          3
                        </span>
                      </span>
                    </p>
                    {excerptReference ? (
                      <div className={styles.excerptRef}>
                        <CitationRail references={[excerptReference]} copy={dict.citations} />
                      </div>
                    ) : null}
                  </div>
                  <ol className={styles.annotations}>
                    {(["section", "statement", "marker", "model"] as const).map((key, i) => (
                      <li key={key}>
                        <span
                          className={styles.key}
                          aria-hidden="true"
                          data-plain={i > 2 ? "true" : undefined}
                        >
                          {i < 3 ? i + 1 : "·"}
                        </span>
                        <div>
                          <p className={styles.annotationTitle}>{copy.anatomy.notes[key].title}</p>
                          <p className={styles.annotationBody}>{copy.anatomy.notes[key].body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </figure>

                {terms.length > 0 ? (
                  <ul className={doc.terms}>
                    {terms.map((term) => (
                      <li key={term.id}>
                        <Link href={path(routes.glossaryTerm(term.id))} className={doc.term}>
                          {term.term[locale]}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <Link href={path(routes.compound(specimen.product.slug))} className={doc.textLink}>
                  {copy.anatomy.open} — {specimen.product.name} <span aria-hidden="true">→</span>
                </Link>
              </section>
            ) : null}

            {/* 04 — how to weigh documentation */}
            <section id="documentacion" aria-labelledby="documentacion-h" className={doc.section}>
              {heading("documentacion", copy.evidence.title)}
              <p className={doc.body}>{copy.evidence.body}</p>
              <ol className={styles.questions}>
                {copy.evidence.questions.map((q, i) => (
                  <li key={q}>
                    <span className={styles.questionIndex} aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {q}
                  </li>
                ))}
              </ol>
              <div className={styles.chain}>
                <EvidenceChain copy={dict.quality.record.chain} />
              </div>
              {coaNote ? (
                <Link href={path(routes.article(coaNote.slug))} className={doc.textLink}>
                  {copy.evidence.note} <span aria-hidden="true">→</span>
                </Link>
              ) : null}
            </section>

            {/* 05 — where next */}
            <section id="siguiente" aria-labelledby="siguiente-h" className={doc.section}>
              {heading("siguiente", copy.next.title)}
              <RouteList
                routes={[
                  {
                    href: path(routes.compendium),
                    title: copy.next.compendium.title,
                    body: copy.next.compendium.body,
                    meta: fill(hub.paths.explore.compendium.body, {
                      n: stats.compounds,
                      records: stats.records,
                    }),
                  },
                  {
                    href: path(routes.lines),
                    title: copy.next.lines.title,
                    body: copy.next.lines.body,
                  },
                  {
                    href: path(routes.glossary),
                    title: copy.next.glossary.title,
                    body: copy.next.glossary.body,
                  },
                  {
                    href: path(routes.handling),
                    title: copy.next.handling.title,
                    body: copy.next.handling.body,
                  },
                ]}
              />
            </section>
          </div>
        </div>
      </Container>
    </Section>
  );
}
