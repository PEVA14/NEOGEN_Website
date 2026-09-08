import { Body, Heading, Mono } from "@/components/typography";

import styles from "./NoteGrid.module.css";

export interface Note {
  title: string;
  body: string;
}

interface NoteGridProps {
  /** Readonly: dictionaries are `as const`, and copy is never mutated. */
  notes: readonly Note[];
  /** Column count above 64rem. Two-up reads editorially; four-up reads as a register. */
  columns?: 3 | 4;
  /** Prefix each note with its position, as `[ 01 ]`. */
  numbered?: boolean;
}

/**
 * The Quiet workhorse — a set of short definitional notes.
 *
 * Deliberately undecorated: a hairline, an optional index, a title and a
 * paragraph. The reference system gets its authority from typography, spacing
 * and alignment rather than from cards, so wrapping these in bordered boxes
 * would make the page louder AND less like the design it comes from.
 *
 * The hairline sits above each note rather than between them, so a column that
 * wraps to a new row still opens on a rule and the grid stays legible at every
 * breakpoint.
 */
export function NoteGrid({ notes, columns = 3, numbered = false }: NoteGridProps) {
  return (
    <div className={styles.grid} data-columns={columns}>
      {notes.map((note, index) => (
        <div key={note.title} className={styles.note}>
          {numbered ? (
            <Mono size="2xs" className={styles.index}>
              [ {String(index + 1).padStart(2, "0")} ]
            </Mono>
          ) : null}

          <Heading level={3} size="lg" className={styles.title}>
            {note.title}
          </Heading>

          <Body className={styles.body}>{note.body}</Body>
        </div>
      ))}
    </div>
  );
}
