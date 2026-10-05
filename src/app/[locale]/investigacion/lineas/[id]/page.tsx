import Link from "next/link";
import { notFound } from "next/navigation";

import { Container, Section } from "@/components/primitives";
import { SourceTether } from "@/components/motion/SourceTether";
import { CitationMarks, CitationRail, KnowledgeHead, RouteList } from "@/components/research";
import { AreaMarks } from "@/components/ui/AreaMarks";
import { routes } from "@/config/routes";
import { lineIds, researchLine, researchLines } from "@/content/compendium";
import { RESEARCH_FUNCTION_GROUPS } from "@/content/functions";
import { publicAreasFor } from "@/data/discovery";
import { isLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";
import { count, fill, linkableLines } from "@/server/knowledge";

import styles from "./page.module.css";

import type { Reference } from "@/content/references";
import type { Metadata } from "next";
import type { DiscoveryAreaId } from "@/data/discovery";

/** A line exists only while at least one compound's sourced statement backs it. */
export const dynamicParams = false;

export async function generateStaticParams() {
  return locales.flatMap((locale) => lineIds().map((id) => ({ locale, id })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const line = researchLine(id, locale);
  if (!line) return {};
  const dict = await getDictionary(locale);
  const title = `${line.fn.label[locale]} — ${dict.knowledge.lines.label}`;
  const description = fill(dict.meta.descriptions.line, { name: line.fn.label[locale] });
  return {
    title,
    description,
    ...socialMetadata({ locale, path: routes.line(id), title, description }),
    alternates: alternates(locale, routes.line(id)),
  };
}

const refAnchor = (n: number) => `ref-${String(n).padStart(2, "0")}`;

/**
 * ONE RESEARCH LINE — which compounds the literature studies for this, and
 * the sentence that says so for each.
 *
 * The page's evidence is quoted, not summarised: under every compound is the
 * sourced statement from its own record that put it in this line, with its
 * citation numbered against the references at the foot of the page. A reader
 * can check every membership without leaving. Compounds are in catalogue
 * order, and the note above them says what order does NOT mean.
 */
export default async function LinePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const line = researchLine(id, locale);
  if (!line) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.knowledge.lines;
  const counts = dict.knowledge.counts;
  const path = (route: string) => localizePath(route, locale);
  const group = RESEARCH_FUNCTION_GROUPS.find((g) => g.id === line.fn.group);
  const linkable = linkableLines();

  /* Number the sources across the whole page, in reading order. */
  const references: Reference[] = [];
  const cite = (refs: readonly Reference[]) =>
    refs.map((ref) => {
      let index = references.findIndex((r) => r.id === ref.id);
      if (index === -1) {
        references.push(ref);
        index = references.length - 1;
      }
      return index + 1;
    });
  const compounds = line.compounds.map(({ product, statements }) => ({
    product,
    statements: statements.map((s) => ({ id: s.id, text: s.text, citations: cite(s.references) })),
  }));

  /*
   * The other end of each source: the compounds IN THIS LINE whose statements
   * cite it, with their area marks (Research colour completion). The line
   * itself has no area and takes no colour; its compounds bring theirs.
   */
  const citedBy: Record<string, { name: string; href: string; areas: DiscoveryAreaId[] }[]> = {};
  for (const { product, statements } of line.compounds) {
    for (const ref of statements.flatMap((s) => s.references)) {
      const list = (citedBy[ref.id] ??= []);
      if (list.some((c) => c.href === path(routes.compound(product.slug)))) continue;
      list.push({
        name: product.name,
        href: path(routes.compound(product.slug)),
        areas: publicAreasFor(product.slug).map((a) => a.id),
      });
    }
  }

  const siblings = researchLines(locale).filter(
    (l) => l.fn.group === line.fn.group && l.fn.id !== line.fn.id && linkable.has(l.fn.id),
  );

  return (
    <Section mode="quiet" aria-labelledby="line-title">
      <Container width="full">
        <KnowledgeHead
          crumbs={[
            { label: dict.knowledge.crumbs.research, href: path(routes.research) },
            { label: dict.knowledge.crumbs.lines, href: path(routes.lines) },
          ]}
          crumbsLabel={dict.knowledge.crumbs.research}
          eyebrow={`${copy.label} // ${group?.label[locale] ?? ""}`}
          title={line.fn.label[locale]}
          titleId="line-title"
          lede={line.fn.hint[locale]}
          meta={[
            count(compounds.length, counts.compounds, counts.compound),
            count(references.length, counts.references, counts.reference),
          ]}
          aside={<p className={styles.note}>{copy.line.note}</p>}
        />

        {/* Claim ↔ source, as on a record: a citation draws to its source,
            the source marks the statements citing it — in the colour of the
            compound whose statement it is. */}
        <SourceTether>
          <section aria-labelledby="line-compounds" className={styles.section}>
            <h2 id="line-compounds" className={styles.sectionTitle}>
              {copy.line.compounds}
            </h2>
            <ol className={styles.compounds}>
              {compounds.map(({ product, statements }) => (
                /* Each compound carries its own first area as its context: its
                 marks, its area names, the rule it takes when pointed at and
                 the connections from its statements. Never the line's. */
                <li
                  key={product.slug}
                  className={styles.compound}
                  data-area={publicAreasFor(product.slug)[0]?.id}
                >
                  <div className={styles.compoundHead}>
                    <Link href={path(routes.compound(product.slug))} className={styles.name}>
                      {product.name}
                    </Link>
                    <p className={styles.areas}>
                      <AreaMarks areas={publicAreasFor(product.slug).map((a) => a.id)} />
                      {publicAreasFor(product.slug)
                        .map((a) => dict.discovery.areas[a.id].title)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className={styles.why}>
                    <p className={styles.whyLabel}>{copy.line.why}</p>
                    {statements.map((s) => (
                      <p key={s.id} className={styles.statement} data-cites={s.citations.join(" ")}>
                        {s.text}{" "}
                        <CitationMarks
                          citations={s.citations}
                          anchor={refAnchor}
                          label={dict.knowledge.record.citation}
                        />
                      </p>
                    ))}
                    <div className={styles.actions}>
                      <Link href={path(routes.compound(product.slug))} className={styles.action}>
                        {copy.line.record} <span aria-hidden="true">→</span>
                      </Link>
                      <Link href={path(routes.product(product.slug))} className={styles.action}>
                        {copy.line.product} <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="line-references" className={styles.section}>
            <h2 id="line-references" className={styles.sectionTitle}>
              {copy.line.references}
            </h2>
            <CitationRail
              references={references}
              copy={dict.citations}
              anchorPrefix="ref-"
              citedBy={{ label: dict.research.hub.references.citedBy, byReference: citedBy }}
            />
          </section>
        </SourceTether>

        {siblings.length > 0 ? (
          <section aria-labelledby="line-siblings" className={styles.section}>
            <h2 id="line-siblings" className={styles.sectionTitle}>
              {copy.line.others}
            </h2>
            <RouteList
              routes={siblings.map((l) => ({
                href: path(routes.line(l.fn.id)),
                title: l.fn.label[locale],
                body: l.fn.hint[locale],
                meta: count(l.compounds.length, counts.compounds, counts.compound),
              }))}
            />
          </section>
        ) : null}

        <Link href={path(routes.lines)} className={styles.back}>
          <span aria-hidden="true">←</span> {copy.line.back}
        </Link>
      </Container>
    </Section>
  );
}
