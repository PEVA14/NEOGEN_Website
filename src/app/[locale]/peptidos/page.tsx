import Link from "next/link";
import { notFound } from "next/navigation";

import { ResearchUseNotice, ShippingNote } from "@/components/commerce";
import { NoteIndex } from "@/components/editorial";
import { PeptideDiagram, RouteList } from "@/components/research";
import { SectionHeader } from "@/components/layout";
import { Container, Section } from "@/components/primitives";
import { EvidenceChain } from "@/components/quality";
import { Body, Mono } from "@/components/typography";
import { AreaIcon, TextLink } from "@/components/ui";
import { routes } from "@/config/routes";
import { publicArticles } from "@/content/editorial";
import { publicFaq } from "@/content/faq";
import { publicTerm } from "@/content/glossary";
import { productsInArea, publicAreas } from "@/data/discovery";
import { isLocale, localeTags } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";

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
  const description = dict.meta.descriptions.peptides;
  return {
    title: dict.peptides.title,
    description,
    ...socialMetadata({ locale, path: routes.peptides, title: dict.peptides.title, description }),
    alternates: alternates(locale, routes.peptides),
  };
}

/** The words the structure section defines, linked into the glossary. */
const ANATOMY_TERMS = [
  "aminoacido",
  "enlace-peptidico",
  "secuencia",
  "residuo",
  "proteina",
  "analogo",
];

/**
 * THE PEPTIDE GUIDE — the page that explains what this catalogue is.
 *
 * WHY IT EXISTS. A visitor who has just heard the word "peptide" arrives at a
 * shop of eighty-five compounds with no way in. The catalogue answers "which
 * one"; nothing answered "what is this, and what am I allowed to do with it".
 * This is that page, and it is deliberately in the header rather than the
 * footer.
 *
 * WHAT IT IS NOT. Not an encyclopedia entry, and not a landing page. Six short
 * sections, each ending somewhere useful: the evidence model, the notes, the
 * questions, the catalogue. The whole thing is designed to be READ ONCE and
 * then left, which is why there is no sidebar, no table of contents and no
 * newsletter.
 *
 * ITS CONTENT BOUNDARY. Every section here is either a definition (true of
 * peptides as a category, independently of NEOGEN) or a statement of NEOGEN's
 * own practice (checkable against this repository). Nothing on this page says
 * what a compound does — that lives on product pages, with the references
 * behind it. The dividing line is the same one `content/editorial` draws, and
 * it is what keeps an educational page from quietly becoming a claims page.
 */
export default async function PeptidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.peptides;
  const s = copy.sections;
  const tag = localeTags[locale];
  const path = (route: string) => localizePath(route, locale);

  const notes = publicArticles();
  const areas = publicAreas();
  /* Three questions, from the same registry the FAQ page renders — a teaser
     that cannot drift from the page it points at. */
  const questions = publicFaq(locale, dict.shipping.and).slice(0, 3);
  const anatomyTerms = ANATOMY_TERMS.map((id) => publicTerm(id)).filter((t) => t !== undefined);

  return (
    <>
      {/* 01–02 — what a peptide is, and why they are studied. */}
      <Section mode="quiet" aria-labelledby="peptides-title">
        <Container width="full">
          <SectionHeader
            index={s.what.index}
            label={copy.eyebrow}
            title={copy.title}
            lede={copy.lede}
            id="peptides-title"
            as="h1"
          />

          <div className={styles.opening}>
            <article className={styles.block}>
              <Mono size="2xs" className={styles.blockLabel}>
                {s.what.label}
              </Mono>
              <h2 className={styles.blockTitle}>{s.what.title}</h2>
              <Body size="lg" className={styles.blockBody}>
                {s.what.body}
              </Body>
            </article>

            <article className={styles.block}>
              <Mono size="2xs" className={styles.blockLabel}>
                {s.why.label}
              </Mono>
              <h2 className={styles.blockTitle}>{s.why.title}</h2>
              <Body size="lg" className={styles.blockBody}>
                {s.why.body}
              </Body>
            </article>
          </div>
        </Container>
      </Section>

      {/*
       * 02 — THE STRUCTURE, DRAWN. A schematic of the definition above it and
       * a comparison table — the two things a first-time reader actually needs
       * to hold "peptide" in their head. Both are definitions, never a
       * statement about any compound; the terms link into the glossary.
       */}
      <Section mode="quiet" aria-labelledby="anatomy-title" className="bg-(--surface-raised)">
        <Container width="full">
          <SectionHeader
            index={s.anatomy.index}
            label={s.anatomy.label}
            title={s.anatomy.title}
            lede={s.anatomy.lede}
            id="anatomy-title"
          />
          <div className={styles.anatomy}>
            <PeptideDiagram
              copy={{
                ...s.anatomy.diagram,
                scale: s.anatomy.scale,
                names: s.anatomy.table.columns,
              }}
            />
            {/* Scrolls sideways on a narrow phone, so it must be reachable
                and named for a keyboard: a focusable, labelled region. */}
            <div
              className={styles.compare}
              role="region"
              aria-label={s.anatomy.table.caption}
              tabIndex={0}
            >
              <table className={styles.table}>
                <caption className={styles.caption}>{s.anatomy.table.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col">
                      <span className={styles.srOnly}>{s.anatomy.table.property}</span>
                    </th>
                    {s.anatomy.table.columns.map((column) => (
                      <th key={column} scope="col">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {s.anatomy.table.rows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {row.values.map((value, i) => (
                        <td key={i}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {anatomyTerms.length > 0 ? (
            <nav aria-label={s.anatomy.terms} className={styles.anatomyTerms}>
              <Mono size="2xs" className={styles.anatomyTermsLabel}>
                {s.anatomy.terms}
              </Mono>
              <ul>
                {anatomyTerms.map((term) => (
                  <li key={term.id}>
                    <Link href={path(routes.glossaryTerm(term.id))} className={styles.termLink}>
                      {term.term[locale]}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </Container>
      </Section>

      {/* 03 — the condition of sale. The one section set on the dark surface:
          it is the most important thing on the page, and in this design system
          emphasis is a change of ground, not a change of colour. */}
      <Section
        mode="quiet"
        surface="dark"
        className={styles.dark}
        aria-labelledby="condition-title"
      >
        <Container width="full">
          <SectionHeader
            index={s.condition.index}
            label={s.condition.label}
            title={s.condition.title}
            id="condition-title"
          />
          <div className={styles.condition}>
            <Body size="lg" className={styles.conditionBody}>
              {s.condition.body}
            </Body>
            <ResearchUseNotice
              copy={dict.researchUse}
              href={path(routes.article("uso-exclusivo-en-investigacion"))}
              variant="panel"
              className={styles.conditionNotice}
            />
          </div>
        </Container>
      </Section>

      {/* 04 — how documentation works, drawn as the chain the rest of the site
          resolves evidence through. The same component the research hub uses. */}
      <Section mode="quiet" aria-labelledby="quality-title">
        <Container width="full">
          <SectionHeader
            index={s.quality.index}
            label={s.quality.label}
            title={s.quality.title}
            id="quality-title"
            action={<TextLink href={path(routes.research)}>{s.quality.action}</TextLink>}
          />
          <Body size="lg" className={styles.prose}>
            {s.quality.body}
          </Body>
          <div className={styles.chain}>
            <EvidenceChain copy={dict.quality.record.chain} />
          </div>
        </Container>
      </Section>

      {/* 05 — handling and shipping: the two physical facts about an order. */}
      <Section mode="quiet" aria-labelledby="handling-title">
        <Container width="full">
          <SectionHeader
            index={s.handling.index}
            label={s.handling.label}
            title={s.handling.title}
            id="handling-title"
          />
          <div className={styles.handling}>
            <Body size="lg" className={styles.prose}>
              {s.handling.body}
            </Body>
            <ShippingNote copy={dict.shipping} localeTag={tag} className={styles.shipping} />
          </div>
        </Container>
      </Section>

      {/* 06 — into the catalogue. The guide ends where the shop begins. */}
      <Section mode="quiet" aria-labelledby="entry-title">
        <Container width="full">
          <SectionHeader
            index={s.catalogue.index}
            label={s.catalogue.label}
            title={s.catalogue.title}
            id="entry-title"
            action={<TextLink href={path(routes.products)}>{s.catalogue.action}</TextLink>}
          />
          <Body size="lg" className={styles.prose}>
            {s.catalogue.body}
          </Body>

          <ul className={styles.areas}>
            {areas.map((area) => (
              <li key={area.id} className={styles.area} data-area={area.id}>
                <Link href={path(routes.area(area.slug))} className={styles.areaLink}>
                  <AreaIcon id={area.id} className={styles.areaIcon} />
                  <span className={styles.areaName}>{dict.discovery.areas[area.id].title}</span>
                  {/* The real count, from the same accessor the catalogue
                      counts with — never a rounded or decorative figure. */}
                  <Mono size="2xs" className={styles.areaCount}>
                    {productsInArea(area.id).length} {dict.discovery.countLabel}
                  </Mono>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* The notes and the questions — the two places to keep reading. */}
      <Section mode="quiet" aria-labelledby="guide-notes-title">
        <Container width="full">
          <div className={styles.tail}>
            <div className={styles.tailColumn}>
              <SectionHeader
                index="07"
                label={dict.editorial.eyebrow}
                title={copy.notes.title}
                lede={copy.notes.lede}
                id="guide-notes-title"
                action={<TextLink href={path(routes.articles)}>{copy.notes.action}</TextLink>}
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
                localeTag={tag}
                ordered={false}
              />
            </div>

            <div className={styles.questions}>
              <Mono size="2xs" className={styles.questionsLabel}>
                {copy.faq.title}
              </Mono>
              <ul className={styles.questionList}>
                {questions.map((question) => (
                  <li key={question.id}>
                    <Link href={`${path(routes.faq)}#${question.id}`} className={styles.question}>
                      {question.question}
                    </Link>
                  </li>
                ))}
              </ul>
              <TextLink href={path(routes.faq)}>{copy.faq.action}</TextLink>
            </div>
          </div>

          {/* The guide is the first page of the research system, not a dead
              end beside it: three doors onward. */}
          <nav aria-labelledby="guide-continue" className={styles.continue}>
            <Mono size="2xs" className={styles.questionsLabel} id="guide-continue">
              {copy.continue.title}
            </Mono>
            <RouteList
              routes={[
                { href: path(routes.start), title: copy.continue.start },
                { href: path(routes.glossary), title: copy.continue.glossary },
                { href: path(routes.compendium), title: copy.continue.compendium },
              ]}
            />
          </nav>
        </Container>
      </Section>
    </>
  );
}
