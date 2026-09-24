import Link from "next/link";
import { notFound } from "next/navigation";

import { ResearchUseNotice } from "@/components/commerce";
import { Container, Section } from "@/components/primitives";
import { KnowledgeHead, RouteList, SectionIndex } from "@/components/research";
import { routes } from "@/config/routes";
import { publicArticle } from "@/content/editorial";
import { faqByTopic } from "@/content/faq";
import { publicTerm } from "@/content/glossary";
import { isPublishable } from "@/data/catalog";
import { productsInArea } from "@/data/discovery";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";
import { presentationLabels } from "@/server/knowledge";

import doc from "@/components/research/KnowledgeDocument.module.css";

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
  const title = dict.knowledge.handling.title;
  const description = dict.meta.descriptions.handling;
  return {
    title,
    description,
    ...socialMetadata({ locale, path: routes.handling, title, description }),
    alternates: alternates(locale, routes.handling),
  };
}

/** The glossary terms this reference leans on, in reading order. */
const HANDLING_TERMS = [
  "liofilizado",
  "higroscopico",
  "fotosensible",
  "degradacion",
  "vial",
  "lote",
  "coa",
];
/** The notes that treat this page's subjects at length. */
const HANDLING_NOTES = [
  "manejo-y-almacenamiento-en-laboratorio",
  "como-leer-un-certificado-de-analisis",
];

/**
 * LABORATORY HANDLING — the structure of a lab reference, and only what can
 * honestly fill it.
 *
 * WHAT THE BRIEF ASKED FOR, AND WHAT IS NOT HERE. The reference it pointed at
 * is a reconstitution guide: syringes, diluent volumes, injection technique,
 * a calculator. That is a preparation procedure for human use, and the owner
 * ruled it out for every phase (PROJECT_STATE §4: "no reconstitution
 * calculator or protocol system"); `FORBIDDEN_PUBLIC_TERMS` refuses its
 * vocabulary outright. So the page keeps the reference's useful SHAPE —
 * what arrives, what to record, what affects stability, common errors,
 * documented data, questions, related reading — and fills it with the
 * approved handling note and NEOGEN's own documentation practice.
 *
 * The boundary is stated on the page, in its own section, rather than left
 * as an absence a reader has to notice: "no preparation procedures, amounts,
 * calculations or instructions for use", and why.
 *
 * PER-COMPOUND CONDITIONS are not generalised. Storage temperature and shelf
 * life are documented facts, and no document exists yet; the page says where
 * they will appear and gives no figure in the meantime.
 */
export default async function HandlingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.knowledge.handling;
  const path = (route: string) => localizePath(route, locale);

  const materials = productsInArea("materials").filter(isPublishable);
  const questions = faqByTopic(locale, dict.shipping.and, "handling");
  const terms = HANDLING_TERMS.map((id) => publicTerm(id)).filter((t) => t !== undefined);
  const notes = HANDLING_NOTES.map((slug) => publicArticle(slug)).filter((n) => n !== undefined);

  const sections = [
    { id: "recepcion", label: copy.arrives.label },
    { id: "registro", label: copy.receiving.label },
    { id: "estabilidad", label: copy.stability.label },
    { id: "errores", label: copy.errors.label },
    { id: "datos", label: copy.documented.label },
    { id: "alcance", label: copy.boundary.label },
    ...(materials.length > 0 ? [{ id: "materiales", label: copy.materials.label }] : []),
    ...(questions.length > 0 ? [{ id: "preguntas", label: copy.faq.label }] : []),
    { id: "relacionado", label: copy.related.label },
  ];
  const number = (id: string) =>
    String(sections.findIndex((s) => s.id === id) + 1).padStart(2, "0");
  const heading = (id: string, title: string) => (
    <h2 id={`${id}-h`} className={doc.sectionTitle}>
      <span className={doc.sectionNumber} aria-hidden="true">
        {number(id)}
      </span>
      {title}
    </h2>
  );

  return (
    <Section mode="quiet" aria-labelledby="handling-title">
      <Container width="full">
        <KnowledgeHead
          crumbs={[{ label: dict.knowledge.crumbs.research, href: path(routes.research) }]}
          crumbsLabel={dict.knowledge.crumbs.research}
          eyebrow={`${copy.label} // ${copy.qualifier}`}
          title={copy.title}
          titleId="handling-title"
          lede={copy.lede}
          aside={
            <ResearchUseNotice
              copy={dict.researchUse}
              href={path(routes.article("uso-exclusivo-en-investigacion"))}
              variant="panel"
            />
          }
        />

        <div className={doc.layout}>
          <div className={doc.rail}>
            <SectionIndex items={sections} label={copy.index} title={copy.index} />
          </div>

          <div className={doc.document}>
            <section id="recepcion" aria-labelledby="recepcion-h" className={doc.section}>
              {heading("recepcion", copy.arrives.title)}
              <p className={doc.body}>{copy.arrives.body}</p>
              <dl className={styles.facts}>
                {copy.arrives.facts.map((fact) => (
                  <div key={fact.term}>
                    <dt>{fact.term}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section id="registro" aria-labelledby="registro-h" className={doc.section}>
              {heading("registro", copy.receiving.title)}
              <ol className={styles.checklist}>
                {copy.receiving.items.map((item, i) => (
                  <li key={item}>
                    <span className={styles.checkIndex} aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {item}
                  </li>
                ))}
              </ol>
            </section>

            <section id="estabilidad" aria-labelledby="estabilidad-h" className={doc.section}>
              {heading("estabilidad", copy.stability.title)}
              <p className={doc.lede}>{copy.stability.lede}</p>
              <dl className={styles.factors}>
                {copy.stability.factors.map((factor) => (
                  <div key={factor.term} className={styles.factor}>
                    <dt>{factor.term}</dt>
                    <dd>{factor.body}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section id="errores" aria-labelledby="errores-h" className={doc.section}>
              {heading("errores", copy.errors.title)}
              <ul className={styles.errors}>
                {copy.errors.items.map((item) => (
                  <li key={item.title}>
                    <p className={styles.errorTitle}>{item.title}</p>
                    <p className={styles.errorBody}>{item.body}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section id="datos" aria-labelledby="datos-h" className={doc.section}>
              {heading("datos", copy.documented.title)}
              <p className={doc.body}>{copy.documented.body}</p>
              <Link href={`${path(routes.research)}#calidad`} className={doc.textLink}>
                {dict.research.hub.paths.evaluate.quality.title} <span aria-hidden="true">→</span>
              </Link>
            </section>

            <section id="alcance" aria-labelledby="alcance-h" className={doc.section}>
              {heading("alcance", copy.boundary.title)}
              <p className={styles.boundary}>{copy.boundary.body}</p>
            </section>

            {materials.length > 0 ? (
              <section id="materiales" aria-labelledby="materiales-h" className={doc.section}>
                {heading("materiales", copy.materials.title)}
                <p className={doc.lede}>{copy.materials.body}</p>
                <RouteList
                  routes={materials.map((product) => ({
                    href: path(routes.product(product.slug)),
                    title: product.name,
                    meta: presentationLabels(product).join(" · "),
                  }))}
                />
              </section>
            ) : null}

            {questions.length > 0 ? (
              <section id="preguntas" aria-labelledby="preguntas-h" className={doc.section}>
                {heading("preguntas", copy.faq.title)}
                <div className={styles.questions}>
                  {questions.map((q) => (
                    <article key={q.id} className={styles.question}>
                      <h3>{q.question}</h3>
                      <p>{q.answer}</p>
                    </article>
                  ))}
                </div>
                <Link href={path(routes.faq)} className={doc.textLink}>
                  {dict.peptides.faq.action} <span aria-hidden="true">→</span>
                </Link>
              </section>
            ) : null}

            <section id="relacionado" aria-labelledby="relacionado-h" className={doc.section}>
              {heading("relacionado", copy.related.title)}
              <RouteList
                routes={[
                  ...notes.map((note) => ({
                    href: path(routes.article(note.slug)),
                    title: note.title[locale],
                    body: note.summary[locale],
                  })),
                  {
                    href: path(routes.compendium),
                    title: dict.research.hub.paths.explore.compendium.title,
                    body: dict.research.hub.paths.explore.body,
                  },
                ]}
              />
              {terms.length > 0 ? (
                <div className={styles.termsBlock}>
                  <p className={doc.groupTitle}>{copy.related.terms}</p>
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
            </section>
          </div>
        </div>
      </Container>
    </Section>
  );
}
