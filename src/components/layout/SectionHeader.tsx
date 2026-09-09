import type { ReactNode } from "react";

import { Display, Mono } from "@/components/typography";

import styles from "./SectionHeader.module.css";

interface SectionHeaderProps {
  /** Two-digit position in the Quiet spine — "01", "04", "06". */
  index: string;
  /** Mono category label — "NEOGEN", "DISCOVERY", "RESEARCH". */
  label: string;
  title: string;
  /** Heading id, so the section can be `aria-labelledby` it. */
  id?: string;
  /** Optional right-aligned action, typically a TextLink. */
  action?: ReactNode;
  /** Optional editorial lede, set below the rule at reading measure. */
  lede?: string;
  /**
   * Heading level. `h2` by default, because a numbered section is almost always
   * one entry in a page's spine rather than the page's own subject.
   *
   * Set `h1` on the FIRST header of a page that has no other document title —
   * a catalogue or a hub is built entirely out of these, so without it the page
   * ships with no `h1` at all and its outline starts at level 2.
   */
  as?: "h1" | "h2";
}

/**
 * The numbered spine.
 *
 * A structural discovery from the reference set: ONLY Quiet sections are
 * numbered. Experience Mode beats are introduced by a mono eyebrow and sit
 * outside the numbering entirely — so the spine is what gives the informational
 * half of the page its skeleton, and the Experience beats read as
 * interruptions in it.
 *
 * The title is set in condensed display caps at a deliberately large scale.
 * At the Phase 2 size it read as a subheading and the numbering looked like
 * decoration; at this scale the spine actually structures the page, which is
 * what the reference set uses it for.
 */
export function SectionHeader({
  index,
  label,
  title,
  id,
  action,
  lede,
  as = "h2",
}: SectionHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.rule} />

      <div className={styles.row}>
        <div className={styles.identity}>
          <Mono size="2xs" className={styles.index}>
            {index}
          </Mono>
          <Mono size="2xs" className={styles.label}>
            / {label}
          </Mono>
        </div>

        {action ? <div className={styles.action}>{action}</div> : null}
      </div>

      <Display id={id} as={as} size="4xl" className={styles.title}>
        {title}
      </Display>

      {lede ? <p className={styles.lede}>{lede}</p> : null}
    </header>
  );
}
