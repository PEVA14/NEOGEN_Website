"use client";

import Link from "next/link";
import { useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { formatPrice } from "@/data/commerce/format";
import {
  cheapestPresentation,
  perVial,
  registerLayout,
  type RegisterPresentation,
} from "@/domain/storefront";

import styles from "./RegisterMatrix.module.css";

import type { CatalogProduct } from "./filters";

export interface RegisterMatrixCopy {
  caption: string;
  othersCaption: string;
  /** Label above the second table — "Otras unidades". */
  others: string;
  compound: string;
  from: string;
  unitLabel: string;
  perPack: string;
  perVial: string;
  /** "Empaques de {n} viales". */
  packNote: string;
  /** "Presentación {n}" — the accessible name of a sequential column. */
  step: string;
}

/**
 * THE REGISTER — the catalogue's second view, as a presentation matrix.
 *
 * It replaced a list of rows that said "5 mg · 10 mg · 20 mg" and one "from"
 * price. The question the register exists for is comparison — at which
 * strength, for how much, against the neighbours — and that is a table.
 *
 * THE LAYOUT FOLLOWS THE RESULTS (`registerLayout`). Filter to an area and the
 * solid products share strength columns, a size chart with pack prices in the
 * cells; the few blends, solutions and IU products follow in a second table.
 * Unfiltered, nineteen strength columns would be unreadable, so every product
 * lists its presentations in order, strength and price in each cell.
 *
 * Per pack or per vial: the same price list, two readings. Resting on a cell
 * lights its row and column through CSS `:has()`, with no script. Native
 * tables with row and column headers, so every cell is announced with its
 * compound and its strength.
 */
export function RegisterMatrix({
  products,
  copy,
  localeTag,
}: {
  products: readonly CatalogProduct[];
  copy: RegisterMatrixCopy;
  localeTag: string;
}) {
  const [unit, setUnit] = useState<"pack" | "vial">("pack");
  const unitLabelId = useId();
  const layout = useMemo(() => registerLayout(products), [products]);

  const money = (amount: number) => formatPrice({ amount, currency: "MXN" }, localeTag);
  const figure = (p: RegisterPresentation | null) => {
    if (!p) return null;
    const amount = unit === "pack" ? p.amount : perVial(p.amount, p.vials);
    return amount === null ? null : money(amount);
  };
  const packs = new Set(
    products.flatMap((p) => p.presentationList.map((x) => x.vials).filter((v) => v !== null)),
  );
  const uniformPack = packs.size === 1 ? [...packs][0] : null;

  const stepHeaders = (width: number) =>
    Array.from({ length: width }, (_, i) => ({
      key: `p${i}`,
      label: (
        <>
          <span aria-hidden="true">P-{String(i + 1).padStart(2, "0")}</span>
          <span className={styles.srOnly}>{copy.step.replace("{n}", String(i + 1))}</span>
        </>
      ),
    }));
  const sequentialRows = (rows: readonly CatalogProduct[], width: number) =>
    rows.map((product) => ({
      product,
      cells: Array.from({ length: width }, (_, i) => product.presentationList[i] ?? null),
    }));

  const shared = { copy, figure };

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

      {layout.mode === "aligned" ? (
        <>
          <Table
            {...shared}
            caption={copy.caption}
            headers={layout.columns.map((mg) => ({ key: `mg${mg}`, label: `${mg} mg` }))}
            rows={layout.rows.map((row) => ({ product: row.item, cells: row.cells }))}
            showStrength={false}
          />
          {layout.others.length > 0 ? (
            <>
              <p className={styles.othersLabel}>{copy.others}</p>
              <Table
                {...shared}
                caption={copy.othersCaption}
                headers={stepHeaders(layout.othersWidth)}
                rows={sequentialRows(layout.others, layout.othersWidth)}
                showStrength
              />
            </>
          ) : null}
        </>
      ) : (
        <Table
          {...shared}
          caption={copy.caption}
          headers={stepHeaders(layout.width)}
          rows={sequentialRows(layout.rows, layout.width)}
          showStrength
        />
      )}
    </div>
  );
}

function Table({
  caption,
  headers,
  rows,
  showStrength,
  copy,
  figure,
}: {
  caption: string;
  headers: readonly { key: string; label: ReactNode }[];
  rows: readonly { product: CatalogProduct; cells: readonly (RegisterPresentation | null)[] }[];
  /** Sequential tables name the strength in each cell; aligned ones carry it in the header. */
  showStrength: boolean;
  copy: RegisterMatrixCopy;
  figure: (p: RegisterPresentation | null) => string | null;
}) {
  return (
    /* Tables are the one element allowed to scroll sideways on a phone. */
    <div className={styles.scroller} tabIndex={0} role="group" aria-label={caption}>
      <table className={styles.table} style={{ "--cols": headers.length } as CSSProperties}>
        <caption className={styles.srOnly}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.corner}>
              {copy.compound}
            </th>
            {headers.map((header, col) => (
              <th key={header.key} scope="col" data-col={col}>
                {header.label}
              </th>
            ))}
            <th scope="col" className={styles.fromHead}>
              {copy.from}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ product, cells }) => (
            <tr key={product.id}>
              <th scope="row" className={styles.rowHead}>
                <Link href={product.href} className={styles.rowLink}>
                  {/* The world's accent as a dot — identity, never a colour on the
                      type. Every row keeps the slot so the names align. */}
                  <span
                    className={styles.worldDot}
                    data-world-tint={product.world ?? undefined}
                    aria-hidden="true"
                  />
                  <span className={styles.rowName}>{product.name}</span>
                </Link>
              </th>
              {cells.map((cell, col) => (
                <td key={headers[col].key} data-col={col} data-empty={cell ? undefined : ""}>
                  {cell ? (
                    <>
                      {showStrength ? <span className={styles.strength}>{cell.label}</span> : null}
                      <span>{figure(cell)}</span>
                    </>
                  ) : (
                    <span className={styles.absent} aria-hidden="true" />
                  )}
                </td>
              ))}
              <td className={styles.fromCell}>
                {figure(cheapestPresentation(product.presentationList))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
