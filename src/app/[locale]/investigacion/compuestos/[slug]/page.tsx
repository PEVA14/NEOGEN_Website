import Link from "next/link";
import { notFound } from "next/navigation";

import { ResearchUseNotice } from "@/components/commerce";
import { Container, Section } from "@/components/primitives";
import {
  CitationMarks,
  CitationRail,
  KnowledgeHead,
  SectionIndex,
  type SectionIndexItem,
} from "@/components/research";
import { routes } from "@/config/routes";
import { compoundRecord, recordSlugs, relatedByLines } from "@/content/compendium";
import { termsInText } from "@/content/glossary";
import { productType } from "@/data/catalog";
import { publicAreasFor } from "@/data/discovery";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";
import { count, documentCount, fill, linkableLines, presentationLabels } from "@/server/knowledge";

import doc from "@/components/research/KnowledgeDocument.module.css";

import styles from "./page.module.css";

import type { RecordStatement } from "@/content/compendium";
import type { Metadata } from "next";

/**
 * A record exists only for a compound whose sourced profile publishes in both
 * locales. Every other slug is a real 404 — the compendium sends those
 * compounds to their product page instead, so nothing links a record that
 * does not exist.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  return locales.flatMap((locale) => recordSlugs().map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const record = compoundRecord(slug, locale);
  if (!record) return {};
  const dict = await getDictionary(locale);
  const title = `${record.product.name} — ${dict.knowledge.record.label}`;
  const description = fill(dict.meta.descriptions.compound, {
    name: record.product.name,
    statements: record.mechanism.length + record.research.length + record.byArea.length,
    references: record.references.length,
  });
  return {
    title,
    description,
    ...socialMetadata({ locale, path: routes.compound(slug), title, description }),
    alternates: alternates(locale, routes.compound(slug)),
  };
}

/** `ref-01` — the fragment a citation marker points at. */
const refAnchor = (n: number) => `ref-${String(n).padStart(2, "0")}`;

/**
 * THE SCIENTIFIC RECORD — the authoritative view of one compound.
 *
 * ONE DOCUMENT, NOT TABS. Read top to bottom it goes identity → how the
 * sources describe its action → what has been measured → the limits → the
 * sources themselves → documentation → the product → where to go next. The
 * local index (sticky beside the text, a strip under the header on a phone)
 * makes it navigable without hiding any of it; citation markers link each
 * sentence to its numbered source, and every source opens at its origin.
 *
 * EVERY SENTENCE HERE IS ALREADY PUBLIC ELSEWHERE. The statements are the
 * product page's sourced profile, numbered like a paper; the identity is the
 * catalogue's; the terms are the glossary's own matches against this text.
 * The page adds structure and navigation, never a claim.
 *
 * NO QUALITY STATE IS RENDERED HERE. Documentation is summarised as a count
 * and linked to the product page, which is the one surface allowed to render
 * `data-evidence-state` — `check:output` counts them against the resolver,
 * and a second rendering would double the count and blur which presentation
 * a document belongs to.
 */
export default async function CompoundRecordPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const record = compoundRecord(slug, locale);
  if (!record) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.knowledge.record;
  const counts = dict.knowledge.counts;
  const path = (route: string) => localizePath(route, locale);
  const { product } = record;

  const areas = publicAreasFor(product.slug);
  const linkable = linkableLines();
  const terms = termsInText(record.text, locale);
  const related = relatedByLines(product.slug, 6);
  const withRecord = new Set(recordSlugs());
  const documents = documentCount(product);
  const statementCount = record.mechanism.length + record.research.length + record.byArea.length;

  /* The sections that render, in order — the index and the numbering follow
     what exists, so a record without technical notes has no gap. */
  const sections: (SectionIndexItem & { key: string })[] = [
    { key: "identity", id: "identidad", label: copy.sections.identity },
    ...(record.mechanism.length > 0
      ? [
          {
            key: "mechanism",
            id: "mecanismo",
            label: copy.sections.mechanism,
            meta: String(record.mechanism.length),
          },
        ]
      : []),
    ...(record.research.length > 0
      ? [
          {
            key: "research",
            id: "investigacion",
            label: copy.sections.research,
            meta: String(record.research.length),
          },
        ]
      : []),
    ...(record.byArea.length > 0
      ? [{ key: "areas", id: "por-area", label: copy.sections.areas }]
      : []),
    ...(record.notes.length > 0 ? [{ key: "notes", id: "notas", label: copy.sections.notes }] : []),
    ...(record.references.length > 0
      ? [
          {
            key: "references",
            id: "referencias",
            label: copy.sections.references,
            meta: String(record.references.length),
          },
        ]
      : []),
    { key: "documentation", id: "documentacion", label: copy.sections.documentation },
    { key: "product", id: "catalogo", label: copy.sections.product },
    { key: "related", id: "relacionados", label: copy.sections.related },
  ];
  const number = (key: string) =>
    String(sections.findIndex((s) => s.key === key) + 1).padStart(2, "0");
  const heading = (key: string, id: string, label: string) => (
    <h2 id={`${id}-h`} className={doc.sectionTitle}>
      <span className={doc.sectionNumber} aria-hidden="true">
        {number(key)}
      </span>
      {label}
    </h2>
  );
  const statements = (list: readonly RecordStatement[]) => (
    <div className={styles.statements}>
      {list.map((s) => (
        <p key={s.id} className={styles.statement}>
          {s.text}{" "}
          <CitationMarks citations={s.citations} anchor={refAnchor} label={copy.citation} />
        </p>
      ))}
    </div>
  );

  return (
    <Section mode="quiet" aria-labelledby="record-title">
      <Container width="full">
        <KnowledgeHead
          crumbs={[
            { label: dict.knowledge.crumbs.research, href: path(routes.research) },
            { label: dict.knowledge.crumbs.compendium, href: path(routes.compendium) },
          ]}
          crumbsLabel={dict.knowledge.crumbs.research}
          eyebrow={[copy.label, ...areas.map((a) => dict.discovery.areas[a.id].title)].join(" // ")}
          title={product.name}
          titleId="record-title"
          lede={record.summary ?? undefined}
          meta={[
            ...(product.subtitle ? [product.subtitle] : []),
            count(statementCount, counts.statements, counts.statement),
            count(record.references.length, counts.references, counts.reference),
            ...(record.functions.length > 0
              ? [count(record.functions.length, counts.lines, counts.line)]
              : []),
          ]}
        />

        <div className={doc.layout}>
          <div className={doc.rail}>
            <SectionIndex
              items={sections.map(({ id, label, meta }) => ({ id, label, meta }))}
              label={copy.index}
              title={copy.index}
            />
          </div>

          <div className={doc.document}>
            {/* 01 — identity: what the catalogue itself states. */}
            <section id="identidad" aria-labelledby="identidad-h" className={doc.section}>
              {heading("identity", "identidad", copy.sections.identity)}
              <table className={styles.identity}>
                <caption className={doc.srOnly}>{copy.identity.caption}</caption>
                <tbody>
                  <tr>
                    <th scope="row">{copy.identity.name}</th>
                    <td>{product.name}</td>
                  </tr>
                  {product.subtitle ? (
                    <tr>
                      <th scope="row">{copy.identity.alias}</th>
                      <td>{product.subtitle}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <th scope="row">{copy.identity.type}</th>
                    <td>{dict.productTypes[productType(product)]}</td>
                  </tr>
                  {product.composition ? (
                    <tr>
                      <th scope="row">{copy.identity.composition}</th>
                      <td>{product.composition}</td>
                    </tr>
                  ) : null}
                  {record.identity?.formula ? (
                    <tr>
                      <th scope="row">{copy.identity.formula}</th>
                      <td className={styles.mono}>{record.identity.formula}</td>
                    </tr>
                  ) : null}
                  {record.identity?.molecularMass ? (
                    <tr>
                      <th scope="row">{copy.identity.mass}</th>
                      <td className={styles.mono}>{record.identity.molecularMass} g/mol</td>
                    </tr>
                  ) : null}
                  {record.identity?.sequence ? (
                    <tr>
                      <th scope="row">{copy.identity.sequence}</th>
                      <td className={styles.mono}>{record.identity.sequence}</td>
                    </tr>
                  ) : null}
                  {record.identity?.cas ? (
                    <tr>
                      <th scope="row">{copy.identity.cas}</th>
                      <td className={styles.mono}>{record.identity.cas}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <th scope="row">{copy.identity.presentations}</th>
                    <td>
                      {presentationLabels(product).map((label, i) => (
                        <span key={label} className={styles.nowrap}>
                          {i > 0 ? " · " : null}
                          {label}
                        </span>
                      ))}
                    </td>
                  </tr>
                  {areas.length > 0 ? (
                    <tr>
                      <th scope="row">{copy.identity.areas}</th>
                      <td>
                        {areas.map((area, i) => (
                          <span key={area.id}>
                            {i > 0 ? " · " : null}
                            <Link href={path(routes.area(area.slug))} className={doc.inline}>
                              {dict.discovery.areas[area.id].title}
                            </Link>
                          </span>
                        ))}
                      </td>
                    </tr>
                  ) : null}
                  {record.functions.length > 0 ? (
                    <tr>
                      <th scope="row">{copy.identity.lines}</th>
                      <td>
                        {record.functions.map((fn, i) => (
                          <span key={fn.id}>
                            {i > 0 ? " · " : null}
                            {linkable.has(fn.id) ? (
                              <Link href={path(routes.line(fn.id))} className={doc.inline}>
                                {fn.label[locale]}
                              </Link>
                            ) : (
                              fn.label[locale]
                            )}
                          </span>
                        ))}
                      </td>
                    </tr>
                  ) : null}
                  {record.identity ? (
                    <tr>
                      <th scope="row">{copy.identity.source}</th>
                      <td>
                        {record.identity.sourceUrl ? (
                          <a
                            href={record.identity.sourceUrl}
                            className={doc.inline}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {record.identity.sourceLabel} ↗
                          </a>
                        ) : (
                          record.identity.sourceLabel
                        )}
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </section>

            {record.mechanism.length > 0 ? (
              <section id="mecanismo" aria-labelledby="mecanismo-h" className={doc.section}>
                {heading("mechanism", "mecanismo", copy.sections.mechanism)}
                <p className={doc.lede}>{copy.ledes.mechanism}</p>
                {statements(record.mechanism)}
              </section>
            ) : null}

            {record.research.length > 0 ? (
              <section id="investigacion" aria-labelledby="investigacion-h" className={doc.section}>
                {heading("research", "investigacion", copy.sections.research)}
                <p className={doc.lede}>{copy.ledes.research}</p>
                {statements(record.research)}
              </section>
            ) : null}

            {record.byArea.length > 0 ? (
              <section id="por-area" aria-labelledby="por-area-h" className={doc.section}>
                {heading("areas", "por-area", copy.sections.areas)}
                <p className={doc.lede}>{copy.ledes.areas}</p>
                <dl className={styles.byArea}>
                  {record.byArea.map((entry) => (
                    <div key={entry.statement.id}>
                      <dt>{dict.discovery.areas[entry.area].title}</dt>
                      <dd>
                        {entry.statement.text}{" "}
                        <CitationMarks
                          citations={entry.statement.citations}
                          anchor={refAnchor}
                          label={copy.citation}
                        />
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            {record.notes.length > 0 ? (
              <section id="notas" aria-labelledby="notas-h" className={doc.section}>
                {heading("notes", "notas", copy.sections.notes)}
                <p className={doc.lede}>{copy.ledes.notes}</p>
                <div className={styles.notes}>
                  {record.notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </section>
            ) : null}

            {record.references.length > 0 ? (
              <section id="referencias" aria-labelledby="referencias-h" className={doc.section}>
                {heading("references", "referencias", copy.sections.references)}
                <p className={doc.lede}>{copy.ledes.references}</p>
                <CitationRail
                  references={record.references}
                  copy={dict.citations}
                  anchorPrefix="ref-"
                />
              </section>
            ) : null}

            <section id="documentacion" aria-labelledby="documentacion-h" className={doc.section}>
              {heading("documentation", "documentacion", copy.sections.documentation)}
              <div className={styles.split}>
                <p className={doc.body}>
                  {documents === 0 ? dict.quality.record.emptyTitle : copy.documentation.body}
                </p>
                <div className={styles.splitAside}>
                  {documents > 0 ? (
                    <p className={doc.metaLine}>
                      {count(documents, copy.documentation.count, copy.documentation.one)}
                    </p>
                  ) : null}
                  <Link
                    href={`${path(routes.product(product.slug))}#calidad`}
                    className={doc.textLink}
                  >
                    {copy.documentation.link} <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>
              {documents === 0 ? <p className={doc.note}>{dict.quality.record.emptyBody}</p> : null}
            </section>

            <section id="catalogo" aria-labelledby="catalogo-h" className={doc.section}>
              {heading("product", "catalogo", copy.sections.product)}
              <div className={styles.productCard}>
                <div className={styles.productMain}>
                  <p className={styles.productName}>{product.name}</p>
                  <p className={doc.body}>{copy.product.body}</p>
                  <ul className={styles.presentations}>
                    {presentationLabels(product).map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                </div>
                <Link href={path(routes.product(product.slug))} className={styles.productAction}>
                  {copy.product.link} <span aria-hidden="true">→</span>
                </Link>
              </div>
              <ResearchUseNotice
                copy={dict.researchUse}
                href={path(routes.article("uso-exclusivo-en-investigacion"))}
                className={styles.notice}
              />
            </section>

            <section id="relacionados" aria-labelledby="relacionados-h" className={doc.section}>
              {heading("related", "relacionados", copy.sections.related)}
              <div className={styles.related}>
                {related.length > 0 ? (
                  <div className={styles.relatedGroup}>
                    <h3 className={doc.groupTitle}>{copy.related.compounds}</h3>
                    <p className={doc.note}>{copy.related.compoundsBody}</p>
                    <ul className={styles.relatedList}>
                      {related.map(({ product: other, shared }) => (
                        <li key={other.slug}>
                          <Link
                            href={
                              withRecord.has(other.slug)
                                ? path(routes.compound(other.slug))
                                : path(routes.product(other.slug))
                            }
                            className={styles.relatedLink}
                          >
                            <span className={styles.relatedName}>{other.name}</span>
                            <span className={styles.relatedMeta}>
                              {count(shared.length, copy.related.shared, copy.related.sharedOne)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {terms.length > 0 ? (
                  <div className={styles.relatedGroup}>
                    <h3 className={doc.groupTitle}>{copy.related.terms}</h3>
                    <p className={doc.note}>{copy.related.termsBody}</p>
                    <ul className={doc.terms}>
                      {terms.map((term) => (
                        <li key={term.id}>
                          <Link href={path(routes.glossaryTerm(term.id))} className={doc.term}>
                            {term.term[locale]}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <Link href={path(routes.compendium)} className={doc.textLink}>
                <span aria-hidden="true">←</span> {copy.related.back}
              </Link>
            </section>
          </div>
        </div>
      </Container>
    </Section>
  );
}
