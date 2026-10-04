"use client";

import Link from "next/link";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { ValueRoll } from "@/components/motion/ValueRoll";

import styles from "./ArchiveMap.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface ArchiveCompound {
  slug: string;
  name: string;
  area: DiscoveryAreaId | null;
  href: string;
}

export interface ArchiveLine {
  id: string;
  label: string;
  href: string;
  /** Column indexes of the compounds a sourced statement places here. */
  members: readonly number[];
}

export interface ArchiveGroup {
  id: string;
  label: string;
  lines: readonly ArchiveLine[];
}

/** The sentence(s) behind one dot, keyed `line|slug`. */
export type ArchiveStatements = Readonly<Record<string, { text: string; sources: number }>>;

export interface ArchiveMapCopy {
  /** "Cada punto es una afirmación con fuente…" */
  rest: string;
  lines: string;
  compounds: string;
  points: string;
  /** "{n} compuestos" for a line. */
  lineCount: string;
  /** "{n} líneas" for a compound. */
  compoundCount: string;
  sources: string;
  source: string;
  openRecord: string;
  openLine: string;
  hint: string;
  /** Accessible name for a dot: "{compound} en {line}". */
  dot: string;
  areas: Partial<Record<DiscoveryAreaId, string>>;
}

type Focus = { row: number | null; col: number | null };

/**
 * THE ARCHIVE, LINE BY COMPOUND — NEOGEN Research's map of itself.
 *
 * Every research line down the side, every compound with a record across the
 * top (filed by area, then name — catalogue facts, not a clustering), and a
 * dot wherever a sourced statement in that compound's record places it in
 * that line. Nothing else is drawn: no distances, no similarity, no strength.
 * An empty cell is graph paper. The dot is the claim, and the claim is one
 * pointer away — the inspector quotes the record's own sentence behind it.
 *
 * It is an instrument, so it is operated rather than watched: a reticle
 * follows the pointer (row and column), the rest steps back, the readout
 * rolls to what is under it, and a dot can be pinned. Keyboard: one tab stop
 * into the dots, arrows move between them (along a line, or to the nearest in
 * the next line), Enter pins, Escape lets go.
 *
 * Wide screens only. On a phone the lines stay the list they were, each with
 * a strip of its dots in the same order — the same structure, read rather
 * than operated (the page renders that list itself).
 */
export function ArchiveMap({
  groups,
  compounds,
  statements,
  copy,
}: {
  groups: readonly ArchiveGroup[];
  compounds: readonly ArchiveCompound[];
  statements: ArchiveStatements;
  copy: ArchiveMapCopy;
}) {
  const rows = useMemo(() => groups.flatMap((g) => g.lines), [groups]);
  const points = useMemo(() => rows.reduce((n, l) => n + l.members.length, 0), [rows]);
  const linesOf = useMemo(() => {
    const counts = compounds.map(() => 0);
    for (const line of rows) for (const c of line.members) counts[c] += 1;
    return counts;
  }, [rows, compounds]);
  /* Area bands across the top: runs of columns that share an area. */
  const bands = useMemo(() => {
    const out: { area: DiscoveryAreaId | null; from: number; to: number }[] = [];
    compounds.forEach((c, i) => {
      const last = out.at(-1);
      if (last && last.area === c.area) last.to = i;
      else out.push({ area: c.area, from: i, to: i });
    });
    return out;
  }, [compounds]);

  const [hover, setHover] = useState<Focus>({ row: null, col: null });
  const [pinned, setPinned] = useState<Focus | null>(null);
  const [cursor, setCursor] = useState<Focus>(() => ({
    row: 0,
    col: rows[0]?.members[0] ?? 0,
  }));
  const cells = useRef<HTMLDivElement>(null);
  const dotRefs = useRef(new Map<string, HTMLButtonElement>());

  const shown = pinned ?? hover;
  const isMember = (row: number | null, col: number | null) =>
    row !== null && col !== null && rows[row]?.members.includes(col);

  const onMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse") return;
      const grid = cells.current;
      if (!grid) return;
      const r = grid.getBoundingClientRect();
      const x = event.clientX - r.left;
      const col =
        x >= 0 && x <= r.width
          ? Math.min(compounds.length - 1, Math.floor((x / r.width) * compounds.length))
          : null;
      const rowEl = (event.target as HTMLElement).closest<HTMLElement>("[data-row]");
      const row = rowEl ? Number(rowEl.dataset.row) : null;
      setHover((h) => (h.row === row && h.col === col ? h : { row, col }));
    },
    [compounds.length],
  );

  const key = (row: number, col: number) => `${row}:${col}`;
  const focusDot = (row: number, col: number) => {
    setCursor({ row, col });
    dotRefs.current.get(key(row, col))?.focus();
  };

  const onKey = (event: KeyboardEvent<HTMLButtonElement>, row: number, col: number) => {
    const members = rows[row].members;
    const at = members.indexOf(col);
    const nearest = (target: number) => {
      for (let step = 1; step < rows.length; step++) {
        const r = row + step * target;
        if (r < 0 || r >= rows.length) return null;
        const m = rows[r].members;
        if (m.length === 0) continue;
        const best = m.reduce((a, b) => (Math.abs(b - col) < Math.abs(a - col) ? b : a));
        return { r, c: best };
      }
      return null;
    };
    let next: { r: number; c: number } | null = null;
    if (event.key === "ArrowRight" && at < members.length - 1)
      next = { r: row, c: members[at + 1] };
    if (event.key === "ArrowLeft" && at > 0) next = { r: row, c: members[at - 1] };
    if (event.key === "ArrowDown") next = nearest(1);
    if (event.key === "ArrowUp") next = nearest(-1);
    if (event.key === "Escape") {
      setPinned(null);
      return;
    }
    if (next) {
      event.preventDefault();
      focusDot(next.r, next.c);
    }
  };

  const statement =
    shown.row !== null && shown.col !== null && isMember(shown.row, shown.col)
      ? statements[`${rows[shown.row].id}|${compounds[shown.col].slug}`]
      : undefined;
  const line = shown.row !== null ? rows[shown.row] : null;
  const compound = shown.col !== null ? compounds[shown.col] : null;
  const fill = (template: string, n: number) => template.replace("{n}", String(n));

  /* Each group's first row, so a line knows its row in the whole map. */
  const firstRow = groups.reduce<number[]>(
    (starts, g, i) => [...starts, i === 0 ? 0 : starts[i - 1] + groups[i - 1].lines.length],
    [],
  );
  return (
    <div
      className={styles.map}
      style={{ ["--cols" as string]: compounds.length }}
      data-row={shown.row ?? undefined}
      data-col={shown.col ?? undefined}
      data-active={shown.row !== null || shown.col !== null ? "true" : undefined}
    >
      <div
        className={styles.plate}
        onPointerMove={onMove}
        onPointerLeave={() => setHover({ row: null, col: null })}
      >
        {/* The reticle: a column band and a row band, travelling. */}
        <span
          className={styles.colBand}
          aria-hidden="true"
          data-on={shown.col !== null ? "true" : undefined}
          style={{ ["--col" as string]: shown.col ?? 0 }}
        />

        <div className={styles.head} aria-hidden="true">
          <span />
          <div className={styles.bands}>
            {bands.map((band) => (
              <span
                key={`${band.area}-${band.from}`}
                className={styles.band}
                data-area={band.area ?? undefined}
                style={{ gridColumn: `${band.from + 1} / ${band.to + 2}` }}
              >
                <span className={styles.bandName}>{band.area ? copy.areas[band.area] : ""}</span>
              </span>
            ))}
          </div>
        </div>

        {groups.map((group, g) => (
          <div key={group.id} className={styles.group}>
            <h3 className={styles.groupTitle}>{group.label}</h3>
            <ul className={styles.rows}>
              {group.lines.map((l, j) => {
                const row = firstRow[g] + j;
                return (
                  <li
                    key={l.id}
                    className={styles.row}
                    data-row={row}
                    data-lit={shown.row === row ? "true" : undefined}
                  >
                    <Link href={l.href} className={styles.rowLabel}>
                      <span className={styles.rowName}>{l.label}</span>
                      <span className={styles.rowCount}>{l.members.length}</span>
                    </Link>
                    <div className={styles.cells} ref={row === 0 ? cells : undefined}>
                      {l.members.map((col) => {
                        const c = compounds[col];
                        const pin = pinned?.row === row && pinned?.col === col;
                        return (
                          <button
                            key={col}
                            ref={(node) => {
                              if (node) dotRefs.current.set(key(row, col), node);
                              else dotRefs.current.delete(key(row, col));
                            }}
                            type="button"
                            className={styles.dot}
                            style={{ gridColumn: col + 1 }}
                            data-col={col}
                            data-area={c.area ?? undefined}
                            data-pinned={pin ? "true" : undefined}
                            data-match={shown.col === col ? "true" : undefined}
                            aria-pressed={pin}
                            aria-label={copy.dot
                              .replace("{compound}", c.name)
                              .replace("{line}", l.label)}
                            tabIndex={cursor.row === row && cursor.col === col ? 0 : -1}
                            onFocus={() => {
                              setCursor({ row, col });
                              setHover({ row, col });
                            }}
                            onBlur={() => setHover({ row: null, col: null })}
                            onClick={() => setPinned(pin ? null : { row, col })}
                            onKeyDown={(event) => onKey(event, row, col)}
                          />
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* The inspector: what is under the reticle, and the claim behind a dot. */}
      <div className={styles.inspector} aria-live="polite">
        <p className={styles.readout}>
          {line ? <span className={styles.readoutLine}>{line.label}</span> : null}
          {compound ? <span className={styles.readoutCompound}>{compound.name}</span> : null}
          {compound?.area ? (
            <span className={styles.readoutArea} data-area={compound.area}>
              {copy.areas[compound.area]}
            </span>
          ) : null}
        </p>

        {statement && line && compound ? (
          <div key={`${line.id}|${compound.slug}`} className={styles.claim}>
            <p className={styles.claimText}>{statement.text}</p>
            <p className={styles.claimMeta}>
              {statement.sources === 1 ? copy.source : fill(copy.sources, statement.sources)}
            </p>
            <div className={styles.claimLinks}>
              <Link href={compound.href} className={styles.claimLink}>
                {copy.openRecord} <span aria-hidden="true">→</span>
              </Link>
              <Link href={line.href} className={styles.claimLink}>
                {copy.openLine} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.figures}>
            <p className={styles.figure}>
              <ValueRoll
                value={String(
                  line ? line.members.length : compound ? linesOf[shown.col ?? 0] : points,
                ).padStart(2, "0")}
                className={styles.figureValue}
              />
              <span className={styles.figureLabel}>
                {line
                  ? fill(copy.lineCount, line.members.length).replace(/^\d+\s*/, "")
                  : compound
                    ? fill(copy.compoundCount, linesOf[shown.col ?? 0]).replace(/^\d+\s*/, "")
                    : copy.points}
              </span>
            </p>
            {!line && !compound ? (
              <>
                <p className={styles.rest}>{copy.rest}</p>
                <p className={styles.small}>
                  {rows.length} {copy.lines} · {compounds.length} {copy.compounds}
                </p>
                <p className={styles.hint}>{copy.hint}</p>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
