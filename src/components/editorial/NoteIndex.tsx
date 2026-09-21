import Link from "next/link";

import { Body, Mono } from "@/components/typography";

import styles from "./NoteIndex.module.css";

export interface NoteEntry {
  slug: string;
  href: string;
  topic: string;
  title: string;
  summary: string;
  /** ISO date; rendered through `<time>` so the machine-readable form ships. */
  publishedOn: string;
}

/**
 * THE NOTES, AS A LIST OF ROWS.
 *
 * Rows rather than a grid of cards, and this is the one decision worth
 * defending: a card grid of four short essays looks exactly like every content
 * marketing section on the internet, and it would be the first thing on this
 * site that did. A ruled list reads as an index — the same register as the
 * reference index and the compound register it sits beside — and it scales to
 * forty notes without becoming a wall of boxes.
 *
 * The whole row is the link, with the title carrying the accessible name.
 */
export function NoteIndex({
  notes,
  localeTag,
  ordered = true,
}: {
  notes: readonly NoteEntry[];
  localeTag: string;
  /** Number the rows. Off in the "read next" rail, where a count means nothing. */
  ordered?: boolean;
}) {
  /*
   * UTC, deliberately. `publishedOn` is a calendar date ("2026-09-20"), which
   * `Date` parses as midnight UTC; formatting that in Mexico City prints the
   * 19th. A publication date is not an instant and must not move with the
   * reader's timezone.
   */
  const format = new Intl.DateTimeFormat(localeTag, { dateStyle: "long", timeZone: "UTC" });

  return (
    <ul className={styles.list} data-ordered={ordered ? "true" : "false"}>
      {notes.map((note, index) => (
        <li key={note.slug} className={styles.row}>
          <Link href={note.href} className={styles.link}>
            {ordered ? (
              <Mono size="2xs" className={styles.index} aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </Mono>
            ) : null}
            <span className={styles.main}>
              <Mono size="2xs" className={styles.topic}>
                {note.topic}
              </Mono>
              <span className={styles.title}>{note.title}</span>
              <Body size="sm" className={styles.summary}>
                {note.summary}
              </Body>
            </span>
            <time dateTime={note.publishedOn} className={styles.date}>
              <Mono size="2xs">{format.format(new Date(note.publishedOn))}</Mono>
            </time>
          </Link>
        </li>
      ))}
    </ul>
  );
}
