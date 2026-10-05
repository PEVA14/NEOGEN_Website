"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import styles from "./ArchivePlate.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface PlateCompound {
  slug: string;
  name: string;
  /** Whether a sourced scientific record exists. */
  record: boolean;
  /** The compendium, filtered to its area, with its record open. */
  href: string;
}

export interface PlateRow {
  /** The area the compounds are first filed in; null for none approved. */
  area: DiscoveryAreaId | null;
  label: string;
  compounds: readonly PlateCompound[];
}

export interface ArchivePlateCopy {
  /** "El archivo, compuesto por compuesto". */
  label: string;
  /** What a mark is, and what filled means — the plate's own legend. */
  legend: { record: string; none: string };
  /** The accessible summary of the whole plate. */
  summary: string;
}

/**
 * THE ARCHIVE, COMPOUND BY COMPOUND (Research colour completion).
 *
 * This graphic shows every compound in the archive once, as one mark in the
 * colour of the catalogue area it is first filed in, filled where a sourced
 * scientific record exists and hollow where none does.
 *
 * It is the hub's front door made of the archive itself: eight short rows in
 * the catalogue's area order, so the first thing Research shows is how much
 * there is, where it is filed and how much of it is documented — the same
 * facts the compendium lists, at the smallest magnification. Pointing at a
 * mark names it; choosing it opens that compound in the compendium, filtered
 * to its area, with its record open (one record, many magnifications).
 *
 * Colour is area membership only; filled/hollow is shape, and every fact is
 * in the summary and in the compendium, so nothing depends on colour. The
 * marks are pointer conveniences, not tab stops: 85 of them would be a wall
 * for a keyboard, and the compendium they lead to is one link away.
 */
export function ArchivePlate({
  rows,
  copy,
}: {
  rows: readonly PlateRow[];
  copy: ArchivePlateCopy;
}) {
  const router = useRouter();
  const [shown, setShown] = useState<{ row: number; compound: PlateCompound } | null>(null);

  return (
    <figure className={styles.plate} data-active={shown ? "true" : undefined}>
      <figcaption className={styles.caption}>
        <span className={styles.label}>{copy.label}</span>
        <span className={styles.legend} aria-hidden="true">
          <span className={styles.key}>
            <span className={styles.keyFilled} /> {copy.legend.record}
          </span>
          <span className={styles.key}>
            <span className={styles.keyHollow} /> {copy.legend.none}
          </span>
        </span>
      </figcaption>

      <div className={styles.rows} role="img" aria-label={copy.summary}>
        {rows.map((row, r) => (
          <div
            key={row.area ?? "none"}
            className={styles.row}
            data-area={row.area ?? undefined}
            data-lit={shown?.row === r ? "true" : undefined}
          >
            <span className={styles.rowLabel} aria-hidden="true">
              {row.label}
            </span>
            <span className={styles.marks} aria-hidden="true">
              {row.compounds.map((compound) => (
                <span
                  key={compound.slug}
                  className={styles.mark}
                  data-record={compound.record ? "true" : undefined}
                  data-on={shown?.compound.slug === compound.slug ? "true" : undefined}
                  onPointerEnter={() => setShown({ row: r, compound })}
                  onPointerLeave={() => setShown(null)}
                  onClick={() => router.push(compound.href)}
                />
              ))}
            </span>
            <span className={styles.rowCount} aria-hidden="true">
              {String(row.compounds.length).padStart(2, "0")}
            </span>
          </div>
        ))}
      </div>

      {/* What is under the pointer, said in words. */}
      <p className={styles.readout} aria-hidden="true">
        {shown ? (
          <>
            <span className={styles.readoutName}>{shown.compound.name}</span>
            <span className={styles.readoutMeta}>
              {rows[shown.row]?.label} ·{" "}
              {shown.compound.record ? copy.legend.record : copy.legend.none}
            </span>
          </>
        ) : null}
      </p>
    </figure>
  );
}
