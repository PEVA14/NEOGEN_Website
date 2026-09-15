"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { formatPrice } from "@/data/commerce/format";
import { perVial } from "@/domain/storefront";

import styles from "./PresentationMatrix.module.css";

import type { WorldId } from "@/config/worlds";

export interface PresentationMatrixRow {
  slug: string;
  name: string;
  href: string;
  world: WorldId | null;
  from: number | null;
  cells: readonly ({ amount: number | null; vials: number | null } | null)[];
}

export interface PresentationMatrixCopy {
  caption: string;
  compound: string;
  from: string;
  unitLabel: string;
  perPack: string;
  perVial: string;
  /** "Empaque de {n} viales en todas las presentaciones." */
  packNote: string;
  worldLabels: Record<WorldId, string>;
}

/**
 * THE PRESENTATION MATRIX — a size chart for compounds.
 *
 * The question a customer brings to a metabolic compound is not "what is it"
 * — the page cannot answer that — but "at which strength, and for how much,
 * compared with the alternatives". The catalogue answers it one card at a
 * time. This answers it at once: strengths across, products down, every cell
 * a real pack price, an empty cell where the product is simply not sold at
 * that strength.
 *
 * TWO READINGS OF THE SAME PRICE LIST. Per pack is what goes in the bag; per
 * vial is how packs of different sizes compare. The toggle changes the
 * arithmetic, never the data.
 *
 * INTERACTION IS A CROSSHAIR. Resting on a cell lights its row and its column
 * — the reading a finger makes on a printed table — through CSS `:has()`,
 * with no script. A native `<table>` with row and column headers, so a screen
 * reader announces every cell as "Tirzepatide, 20 mg, $8,900".
 */
export function PresentationMatrix({
  columns,
  rows,
  copy,
  localeTag,
}: {
  columns: readonly number[];
  rows: readonly PresentationMatrixRow[];
  copy: PresentationMatrixCopy;
  localeTag: string;
}) {
  const [unit, setUnit] = useState<"pack" | "vial">("pack");
  const unitLabelId = useId();
  const money = (amount: number) => formatPrice({ amount, currency: "MXN" }, localeTag);
  const packs = new Set(
    rows.flatMap((row) => row.cells.map((cell) => cell?.vials).filter((v) => v != null)),
  );
  const uniformPack = packs.size === 1 ? [...packs][0] : null;

  const value = (cell: { amount: number | null; vials: number | null }) => {
    const amount = unit === "pack" ? cell.amount : perVial(cell.amount, cell.vials);
    return amount === null ? null : money(amount);
  };

  return (
    <div className={styles.matrix}>
      <div className={styles.controls}>
        <span className={styles.controlLabel} id={unitLabelId}>
          {copy.unitLabel}
        </span>
        <div className={styles.segmented} role="group" aria-labelledby={unitLabelId}>
          {(
            [
              ["pack", copy.perPack],
              ["vial", copy.perVial],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={styles.segment}
              aria-pressed={unit === key}
              onClick={() => setUnit(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {uniformPack ? (
          <span className={styles.note}>{copy.packNote.replace("{n}", String(uniformPack))}</span>
        ) : null}
      </div>

      {/* Tables are the one element allowed to scroll sideways on a phone. */}
      <div className={styles.scroller} tabIndex={0} role="group" aria-label={copy.caption}>
        <table className={styles.table} data-unit={unit}>
          <caption className={styles.caption}>{copy.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className={styles.corner}>
                {copy.compound}
              </th>
              {columns.map((mg, col) => (
                <th key={mg} scope="col" data-col={col}>
                  {mg} mg
                </th>
              ))}
              <th scope="col" className={styles.fromHead}>
                {copy.from}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const fromCell = row.cells.find(
                (cell) => cell && cell.amount !== null && cell.amount === row.from,
              );
              return (
                <tr key={row.slug}>
                  <th scope="row" className={styles.rowHead}>
                    <Link href={row.href} className={styles.rowLink}>
                      {/* The world's accent as a dot — identity, never a colour on the
                          type. Every row keeps the slot so the names align. */}
                      <span
                        className={styles.worldDot}
                        data-world-tint={row.world ?? undefined}
                        aria-hidden="true"
                      />
                      <span className={styles.rowName}>{row.name}</span>
                    </Link>
                  </th>
                  {row.cells.map((cell, col) => (
                    <td key={columns[col]} data-col={col} data-empty={cell ? undefined : ""}>
                      {cell ? value(cell) : <span className={styles.absent} aria-hidden="true" />}
                    </td>
                  ))}
                  <td className={styles.fromCell}>{fromCell ? value(fromCell) : null}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
