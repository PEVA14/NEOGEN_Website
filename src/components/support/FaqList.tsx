import Link from "next/link";

import { Body, Mono } from "@/components/typography";

import styles from "./FaqList.module.css";

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  /** Resolved internal links: where to read more. */
  links: readonly { href: string; label: string }[];
}

export interface FaqGroup {
  topic: string;
  /** The topic's heading. */
  label: string;
  items: readonly FaqItem[];
}

/**
 * THE FAQ — questions answered in the open.
 *
 * NOT AN ACCORDION, and that is deliberate on two grounds. A customer scanning
 * for "do you ship to me" should find it by reading, not by opening seven
 * drawers; and content behind a click is content a search engine weights less
 * and a screen-reader user meets as a list of buttons. The answers are short
 * enough to stand open, which is itself a constraint on writing them.
 *
 * Each question is an `h3` under its topic's `h2`, so the page has a real
 * outline. The id on each entry makes every answer linkable — support can send
 * someone to the exact question rather than to the page.
 */
export function FaqList({ groups }: { groups: readonly FaqGroup[] }) {
  return (
    <div className={styles.faq}>
      {groups.map((group) => (
        <section key={group.topic} className={styles.group} aria-labelledby={`faq-${group.topic}`}>
          <h2 id={`faq-${group.topic}`} className={styles.groupTitle}>
            <Mono size="2xs">{group.label}</Mono>
          </h2>

          <div className={styles.items}>
            {group.items.map((item) => (
              <article key={item.id} id={item.id} className={styles.item}>
                <h3 className={styles.question}>{item.question}</h3>
                <Body className={styles.answer}>{item.answer}</Body>
                {item.links.length > 0 ? (
                  <p className={styles.links}>
                    {item.links.map((link) => (
                      <Link key={link.href} href={link.href} className={styles.link}>
                        <Mono size="2xs">{link.label}</Mono>
                      </Link>
                    ))}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
