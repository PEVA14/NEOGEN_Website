"use client";

import { useId, useMemo, useState } from "react";

import { Mono } from "@/components/typography";

import styles from "./DocumentExplorer.module.css";

export interface ExplorerRecord {
  id: string;
  product: string;
  productHref: string;
  presentation: string;
  lot: string | null;
  type: string;
  typeLabel: string;
  issuer: string;
  issuedOn: string;
  href: string;
  external: boolean;
  states: readonly string[];
}

export interface DocumentExplorerCopy {
  filters: {
    product: string;
    presentation: string;
    lot: string;
    type: string;
    issuer: string;
    all: string;
  };
  results: string;
  result: string;
  empty: string;
  caption: string;
  columns: {
    product: string;
    presentation: string;
    lot: string;
    type: string;
    issuer: string;
    date: string;
    document: string;
  };
  view: string;
  external: string;
}

type FilterKey = "product" | "presentation" | "lot" | "type" | "issuer";

/**
 * THE DOCUMENTATION EXPLORER — every public record, filterable five ways.
 *
 * Receives only records the resolver has already accepted, so it cannot show
 * an internal document, an unapproved one, or a Janoshik record without a
 * report id: those never reach its props. Filtering is local; the set is small
 * and a URL-serialised query would be architecture ahead of need.
 */
export function DocumentExplorer({
  records,
  copy,
}: {
  records: readonly ExplorerRecord[];
  copy: DocumentExplorerCopy;
}) {
  const [filters, setFilters] = useState<Record<FilterKey, string>>({
    product: "all",
    presentation: "all",
    lot: "all",
    type: "all",
    issuer: "all",
  });
  const baseId = useId();

  const valueOf = (record: ExplorerRecord, key: FilterKey): string =>
    key === "type" ? record.typeLabel : key === "lot" ? (record.lot ?? "—") : record[key];

  const options = useMemo(() => {
    const keys: FilterKey[] = ["product", "presentation", "lot", "type", "issuer"];
    return Object.fromEntries(
      keys.map((key) => [key, [...new Set(records.map((r) => valueOf(r, key)))].sort()]),
    ) as Record<FilterKey, string[]>;
  }, [records]);

  const results = records.filter((record) =>
    (Object.keys(filters) as FilterKey[]).every(
      (key) => filters[key] === "all" || valueOf(record, key) === filters[key],
    ),
  );

  return (
    <div className={styles.explorer}>
      <div className={styles.filters}>
        {(Object.keys(filters) as FilterKey[]).map((key) => (
          <div key={key} className={styles.filter}>
            <label htmlFor={`${baseId}-${key}`} className={styles.label}>
              <Mono size="2xs">{copy.filters[key]}</Mono>
            </label>
            <select
              id={`${baseId}-${key}`}
              className={styles.select}
              value={filters[key]}
              onChange={(event) => setFilters((f) => ({ ...f, [key]: event.target.value }))}
            >
              <option value="all">{copy.filters.all}</option>
              {options[key].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <Mono size="2xs" className={styles.count} aria-live="polite">
        {(results.length === 1 ? copy.result : copy.results).replace(
          "{n}",
          String(results.length).padStart(2, "0"),
        )}
      </Mono>

      {results.length === 0 ? (
        <p className={styles.empty}>{copy.empty}</p>
      ) : (
        <div className={styles.tableWrap} tabIndex={0} role="group" aria-label={copy.caption}>
          <table className={styles.table}>
            <caption className={styles.caption}>{copy.caption}</caption>
            <thead>
              <tr>
                <th scope="col">{copy.columns.product}</th>
                <th scope="col">{copy.columns.presentation}</th>
                <th scope="col">{copy.columns.lot}</th>
                <th scope="col">{copy.columns.type}</th>
                <th scope="col">{copy.columns.issuer}</th>
                <th scope="col">{copy.columns.date}</th>
                <th scope="col">{copy.columns.document}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((record) => (
                <tr key={record.id}>
                  <th scope="row">
                    <a href={record.productHref} className={styles.link}>
                      {record.product}
                    </a>
                  </th>
                  <td>{record.presentation}</td>
                  <td className={styles.mono}>{record.lot ?? "—"}</td>
                  <td>{record.typeLabel}</td>
                  <td>{record.issuer}</td>
                  <td className={styles.mono}>{record.issuedOn}</td>
                  <td>
                    <a
                      href={record.href}
                      className={styles.link}
                      {...(record.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      aria-label={`${copy.view} — ${record.typeLabel} — ${record.product} ${record.presentation}${
                        record.external ? ` (${copy.external})` : ""
                      }`}
                    >
                      {copy.view}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
