import Link from "next/link";
import { notFound } from "next/navigation";

import { Container, Section } from "@/components/primitives";
import { KnowledgeHead } from "@/components/research";
import { routes } from "@/config/routes";
import { linesByGroup } from "@/content/compendium";
import { RESEARCH_FUNCTION_GROUPS } from "@/content/functions";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/getDictionary";
import { localizePath } from "@/i18n/routing";
import { alternates } from "@/lib/alternates";
import { socialMetadata } from "@/lib/meta";
import { count, linkableLines } from "@/server/knowledge";

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
  const title = dict.knowledge.lines.title;
  const description = dict.meta.descriptions.lines;
  return {
    title,
    description,
    ...socialMetadata({ locale, path: routes.lines, title, description }),
    alternates: alternates(locale, routes.lines),
  };
}

/**
 * RESEARCH LINES — the compendium grouped by what is studied.
 *
 * NEOGEN's reading of a competitor's "stacks", and deliberately not one. A
 * stack is a set of compounds to be combined for an outcome: a protocol with
 * a product list attached. A line is a receptor, a pathway or a process that
 * published research examines, and the compounds the records say were
 * studied for it. Nothing here suggests using two compounds together, and the
 * page states that in its own principle block rather than leaving a reader to
 * infer it from a grid of names.
 *
 * Grouped by the vocabulary's five groups, each line one ruled row: its name,
 * the literature's scope in one line, and the compounds as links into their
 * records. Every compound listed is backed by a sourced statement the line's
 * own page quotes.
 */
export default async function LinesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = await getDictionary(locale);
  const copy = dict.knowledge.lines;
  const counts = dict.knowledge.counts;
  const path = (route: string) => localizePath(route, locale);
  const linkable = linkableLines();
  const groups = linesByGroup(locale).map((g) => ({
    ...g,
    lines: g.lines.filter((l) => linkable.has(l.fn.id)),
  }));
  const total = groups.reduce((n, g) => n + g.lines.length, 0);

  return (
    <Section mode="quiet" aria-labelledby="lines-title">
      <Container width="full">
        <KnowledgeHead
          crumbs={[{ label: dict.knowledge.crumbs.research, href: path(routes.research) }]}
          crumbsLabel={dict.knowledge.crumbs.research}
          eyebrow={`${copy.label} // ${copy.qualifier}`}
          title={copy.title}
          titleId="lines-title"
          lede={copy.lede}
          meta={[count(total, counts.lines, counts.line)]}
          aside={
            <div className={styles.principle}>
              <p className={styles.principleLabel}>{copy.principle.label}</p>
              <p className={styles.principleBody}>{copy.principle.body}</p>
            </div>
          }
        />

        <nav aria-label={copy.title} className={styles.jump}>
          <ul>
            {groups.map(({ group }) => (
              <li key={group}>
                <a href={`#grupo-${group}`}>
                  {RESEARCH_FUNCTION_GROUPS.find((g) => g.id === group)?.label[locale]}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.groups}>
          {groups.map(({ group, lines }) => (
            <section
              key={group}
              id={`grupo-${group}`}
              aria-labelledby={`grupo-${group}-h`}
              className={styles.group}
            >
              <h2 id={`grupo-${group}-h`} className={styles.groupTitle}>
                {RESEARCH_FUNCTION_GROUPS.find((g) => g.id === group)?.label[locale]}
                <span className={styles.groupCount}>
                  {count(lines.length, counts.lines, counts.line)}
                </span>
              </h2>
              <ul className={styles.lines}>
                {lines.map((line) => (
                  <li key={line.fn.id} className={styles.line}>
                    <div className={styles.lineMain}>
                      <Link href={path(routes.line(line.fn.id))} className={styles.lineName}>
                        {line.fn.label[locale]}
                      </Link>
                      <p className={styles.hint}>{line.fn.hint[locale]}</p>
                    </div>
                    <div className={styles.compounds}>
                      <p className={styles.compoundCount}>
                        {count(line.compounds.length, counts.compounds, counts.compound)}
                      </p>
                      <ul className={styles.compoundList}>
                        {line.compounds.map(({ product }) => (
                          <li key={product.slug}>
                            <Link
                              href={path(routes.compound(product.slug))}
                              className={styles.compound}
                            >
                              {product.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Container>
    </Section>
  );
}
