import Link from "next/link";

import { Heading, Mono } from "@/components/typography";
import { WorldDot } from "@/components/ui/WorldDot";
import type { WorldId } from "@/config/worlds";

import styles from "./CompoundRow.module.css";

export interface CompoundRowField {
  key: string;
  value: string;
}

interface CompoundRowProps {
  index: string;
  /** Null for most of the catalogue — only three products have a world. */
  world: WorldId | null;
  worldLabel: string;
  name: string;
  fields: CompoundRowField[];
  /**
   * Where the compound's own page is, when it has one.
   *
   * Optional because the register is also used to PRESENT compounds that have
   * no page yet. Where a page does exist the row has to reach it, or the
   * register becomes a view of the catalogue you cannot navigate from.
   */
  href?: string;
}

/**
 * A row in the compound index — Quiet Mode.
 *
 * The reference Research Hub sets this as a seven-column table on desktop and
 * RECOMPOSES it into attribute cards on mobile, which is the clearest
 * demonstration of "mobile is recomposed, never compressed" in the whole set.
 * This follows that: a real table-like row above 64rem, a stacked card below,
 * driven entirely by CSS.
 *
 * Every value is supplied by the caller from configuration or from the neutral
 * pending vocabulary. Nothing here fabricates a document count, a lot, or a
 * catalogue size.
 */
/**
 * Column heads for the register.
 *
 * Only shown at the width where the rows actually behave as a table. Below
 * that, each row is a self-labelling card and a detached header would describe
 * a layout that is no longer on screen.
 */
export function CompoundIndexHead({ columns }: { columns: string[] }) {
  return (
    <li className={styles.head} aria-hidden="true">
      <span />
      <div className={styles.headFields}>
        {columns.map((column) => (
          <Mono key={column} size="2xs" className={styles.headLabel}>
            {column}
          </Mono>
        ))}
      </div>
    </li>
  );
}

export function CompoundRow({ index, world, worldLabel, name, fields, href }: CompoundRowProps) {
  return (
    <li className={styles.row}>
      <div className={styles.identity}>
        <Mono size="2xs" className={styles.index}>
          {index}
        </Mono>
        {/* The NAME is the link, not the whole row: a row carries a definition
            list of technical values, and making all of it one target would put
            those values inside a link that does not describe them. */}
        <Heading level={3} size="lg" className={styles.name}>
          {href ? (
            <Link href={href} className={styles.link}>
              {name}
            </Link>
          ) : (
            name
          )}
        </Heading>
        {world ? (
          <WorldDot world={world} className={styles.dot}>
            {worldLabel}
          </WorldDot>
        ) : (
          <Mono size="2xs" className={styles.dot}>
            {worldLabel}
          </Mono>
        )}
      </div>

      <dl className={styles.fields}>
        {fields.map((field) => (
          <div key={field.key} className={styles.field}>
            <Mono as="dt" size="2xs" className={styles.fieldKey}>
              {field.key}
            </Mono>
            <Mono as="dd" size="xs" className={styles.fieldValue}>
              {field.value}
            </Mono>
          </div>
        ))}
      </dl>
    </li>
  );
}
