import { Body, Mono } from "@/components/typography";

import styles from "./ArticleBody.module.css";

import type { ArticleBlock } from "@/content/editorial";
import type { Locale } from "@/i18n/config";

/**
 * A NOTE'S BODY — structured blocks rendered as a document.
 *
 * Each block type maps to the element it actually is: a definition list is a
 * `<dl>`, a set-apart statement is an `<aside>`, a subheading is an `<h2>`.
 * That is not pedantry — it is the whole reason the editorial layer stores
 * structure instead of markup. A screen reader gets the document's shape, and
 * a search engine gets a heading outline it can read, from the same data the
 * gate checks for provenance.
 *
 * NOTHING HERE DECIDES WHAT MAY RENDER. `publicArticle` has already dropped
 * any block whose class requires evidence it does not have, so this component
 * never has to know about references or approval — it draws what it is given.
 */
export function ArticleBody({
  blocks,
  locale,
}: {
  blocks: readonly ArticleBlock[];
  locale: Locale;
}) {
  return (
    <div className={styles.body}>
      {blocks.map((block) => {
        switch (block.kind) {
          case "heading":
            return (
              <h2 key={block.id} id={block.id} className={styles.heading}>
                {block.text[locale]}
              </h2>
            );

          case "paragraph":
            return (
              <Body key={block.id} size="lg" className={styles.paragraph}>
                {block.text[locale]}
              </Body>
            );

          case "list":
            return (
              <ul key={block.id} className={styles.list}>
                {block.items[locale].map((item) => (
                  <li key={item}>
                    <Body>{item}</Body>
                  </li>
                ))}
              </ul>
            );

          case "terms":
            return (
              <dl key={block.id} className={styles.terms}>
                {block.terms.map((entry) => (
                  <div key={entry.term[locale]} className={styles.term}>
                    <dt className={styles.termName}>{entry.term[locale]}</dt>
                    <dd className={styles.termBody}>
                      <Body>{entry.definition[locale]}</Body>
                    </dd>
                  </div>
                ))}
              </dl>
            );

          case "note":
            return (
              <aside key={block.id} className={styles.note}>
                <Mono size="2xs" className={styles.noteMark} aria-hidden="true">
                  {/* Braced: a bare `//` in JSX children parses as a comment. */}
                  {"//"}
                </Mono>
                <Body size="sm" className={styles.noteText}>
                  {block.text[locale]}
                </Body>
              </aside>
            );
        }
      })}
    </div>
  );
}
