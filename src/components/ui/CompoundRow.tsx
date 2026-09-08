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
  world: WorldId;
  worldLabel: string;
  name: string;
  fields: CompoundRowField[];
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

export function CompoundRow({ index, world, worldLabel, name, fields }: CompoundRowProps) {
  return (
    <li className={styles.row}>
      <div className={styles.identity}>
        <Mono size="2xs" className={styles.index}>
          {index}
        </Mono>
        <Heading level={3} size="lg" className={styles.name}>
          {name}
        </Heading>
        <WorldDot world={world} className={styles.dot}>
          {worldLabel}
        </WorldDot>
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
