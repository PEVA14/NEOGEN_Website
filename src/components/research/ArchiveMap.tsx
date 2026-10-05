"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
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
  /** The scrubber's accessible name: "Recorrer los compuestos". */
  scrub: string;
  /** Its value before anything is chosen. */
  scrubIdle: string;
  /** Phone: how to operate it. */
  touchHint: string;
  /** Lets go of the chosen compound. */
  clear: string;
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
 * THE SCRUBBER. The area bands across the top are also a slider (a real
 * range input): drag along them — a finger on a phone, the pointer or the
 * arrow keys anywhere — and the reticle walks the compounds column by
 * column; the lines the one under it belongs to light up, the readout names
 * it, and its record is a tap away.
 *
 * ON A PHONE the same map, re-set for a thumb: each line is its name over a
 * full-width strip of its dots, the readout and the scrubber are pinned at
 * the top of the map while it is read, and a line opens in place to list its
 * compounds — each opening to the sentence behind its dot. Nothing needs a
 * hover; nothing is smaller than its strip.
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
  /* The scrubber's compound; a line opened in place, and a claim opened in it. */
  const [scrub, setScrub] = useState<number | null>(null);
  const [openRow, setOpenRow] = useState<number | null>(null);
  const [openClaim, setOpenClaim] = useState<number | null>(null);
  const uid = useId();
  const [cursor, setCursor] = useState<Focus>(() => ({
    row: 0,
    col: rows[0]?.members[0] ?? 0,
  }));
  const cells = useRef<HTMLDivElement>(null);
  const dotRefs = useRef(new Map<string, HTMLButtonElement>());

  const base = pinned ?? hover;
  const shown: Focus = { row: base.row, col: base.col ?? scrub };
  const isMember = (row: number | null, col: number | null) =>
    row !== null && col !== null && rows[row]?.members.includes(col);

  /* The grid's box, read once per hover (and after a scroll), not per move:
     a read right after the reticle re-renders forces a layout every time. */
  const gridBox = useRef<DOMRect | null>(null);
  useEffect(() => {
    const forget = () => {
      gridBox.current = null;
    };
    window.addEventListener("scroll", forget, { passive: true });
    window.addEventListener("resize", forget);
    return () => {
      window.removeEventListener("scroll", forget);
      window.removeEventListener("resize", forget);
    };
  }, []);
  const onMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "mouse") return;
      const grid = cells.current;
      if (!grid) return;
      gridBox.current ??= grid.getBoundingClientRect();
      const r = gridBox.current;
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
  const scrubber = (variant: "wide" | "phone") => (
    <div className={styles.scrubber} data-variant={variant}>
      <div className={styles.bands} aria-hidden="true">
        {bands.map((band) => (
          <span
            key={`${band.area}-${band.from}`}
            className={styles.band}
            data-area={band.area ?? undefined}
            style={{ gridColumn: `${band.from + 1} / ${band.to + 2}` }}
          />
        ))}
      </div>
      <span
        className={styles.scrubMark}
        aria-hidden="true"
        data-on={scrub !== null ? "true" : undefined}
        style={{ ["--col" as string]: scrub ?? 0 }}
      />
      <input
        type="range"
        className={styles.range}
        min={0}
        max={compounds.length - 1}
        step={1}
        value={scrub ?? 0}
        aria-label={copy.scrub}
        aria-valuetext={
          scrub !== null
            ? `${compounds[scrub].name} · ${fill(copy.compoundCount, linesOf[scrub])}`
            : copy.scrubIdle
        }
        onChange={(event) => setScrub(Number(event.target.value))}
        onPointerDown={(event) => {
          /* A press at the first position changes nothing, so choose it here. */
          const r = event.currentTarget.getBoundingClientRect();
          const col = Math.round(((event.clientX - r.left) / r.width) * (compounds.length - 1));
          setScrub(Math.min(compounds.length - 1, Math.max(0, col)));
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setScrub(null);
        }}
      />
    </div>
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
          data-area={compound?.area ?? undefined}
          style={{ ["--col" as string]: shown.col ?? 0 }}
        />

        <div className={styles.head}>
          <span />
          {scrubber("wide")}
        </div>

        {groups.map((group, g) => (
          <div key={group.id} className={styles.group}>
            <h3 className={styles.groupTitle}>{group.label}</h3>
            <ul className={styles.rows}>
              {group.lines.map((l, j) => {
                const row = firstRow[g] + j;
                const open = openRow === row;
                return (
                  <li
                    key={l.id}
                    className={styles.row}
                    data-row={row}
                    data-lit={shown.row === row ? "true" : undefined}
                    data-holds={
                      shown.col !== null && l.members.includes(shown.col) ? "true" : undefined
                    }
                    data-open={open ? "true" : undefined}
                  >
                    <Link href={l.href} className={styles.rowLabel}>
                      <span className={styles.rowName}>{l.label}</span>
                      <span className={styles.rowCount}>{l.members.length}</span>
                    </Link>
                    {/* Phone: the line opens in place. */}
                    <button
                      type="button"
                      className={styles.rowToggle}
                      aria-expanded={open}
                      aria-controls={`${uid}-line-${row}`}
                      onClick={() => {
                        setOpenRow(open ? null : row);
                        setOpenClaim(null);
                      }}
                    >
                      <span className={styles.rowName}>{l.label}</span>
                      <span className={styles.rowCount}>{l.members.length}</span>
                      <span className={styles.rowChevron} aria-hidden="true" />
                    </button>
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

                    {/* Phone: the line's compounds, each opening to its sentence. */}
                    <div
                      id={`${uid}-line-${row}`}
                      className={styles.panel}
                      data-open={open ? "true" : undefined}
                      inert={!open}
                    >
                      <div className={styles.panelInner}>
                        <ul className={styles.members}>
                          {l.members.map((col) => {
                            const c = compounds[col];
                            const claim = statements[`${l.id}|${c.slug}`];
                            const shownClaim = open && openClaim === col;
                            return (
                              <li
                                key={col}
                                className={styles.member}
                                data-match={shown.col === col ? "true" : undefined}
                              >
                                <button
                                  type="button"
                                  className={styles.memberToggle}
                                  aria-expanded={shownClaim}
                                  onClick={() => setOpenClaim(shownClaim ? null : col)}
                                >
                                  {/* Where this compound sits in the strip above. */}
                                  <span
                                    className={styles.memberTick}
                                    aria-hidden="true"
                                    style={{ ["--col" as string]: col }}
                                  />
                                  <span className={styles.memberName}>{c.name}</span>
                                  {c.area ? (
                                    <span className={styles.memberArea} data-area={c.area}>
                                      {copy.areas[c.area]}
                                    </span>
                                  ) : null}
                                </button>
                                {shownClaim && claim ? (
                                  <div className={styles.claim}>
                                    <p className={styles.claimText}>{claim.text}</p>
                                    <p className={styles.claimMeta}>
                                      {claim.sources === 1
                                        ? copy.source
                                        : fill(copy.sources, claim.sources)}
                                    </p>
                                    <Link href={c.href} className={styles.claimLink}>
                                      {copy.openRecord} <span aria-hidden="true">→</span>
                                    </Link>
                                  </div>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                        <Link href={l.href} className={styles.claimLink}>
                          {copy.openLine} <span aria-hidden="true">→</span>
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* The inspector: what is under the reticle, and the claim behind a dot.
          On a phone it is the pinned readout and the scrubber. */}
      {/* The inspector takes the inspected compound's area (color pass). */}
      <div className={styles.inspector} data-area={compound?.area ?? undefined}>
        <div aria-live="polite" className={styles.wideReadout}>
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
              {compound && scrub !== null && !line ? (
                <Link href={compound.href} className={styles.claimLink}>
                  {copy.openRecord} <span aria-hidden="true">→</span>
                </Link>
              ) : null}
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

        {/* Phone: one compact line of readout over the scrubber. */}
        <div className={styles.phoneReadout}>
          {scrub !== null ? (
            <>
              <p className={styles.phoneName}>
                <span className={styles.readoutCompound}>{compounds[scrub].name}</span>
                <button
                  type="button"
                  className={styles.clear}
                  aria-label={copy.clear}
                  onClick={() => setScrub(null)}
                >
                  ×
                </button>
              </p>
              <p className={styles.phoneMeta}>
                {compounds[scrub].area ? (
                  <span
                    className={styles.readoutArea}
                    data-area={compounds[scrub].area ?? undefined}
                  >
                    {copy.areas[compounds[scrub].area as DiscoveryAreaId]}
                  </span>
                ) : null}
                <span className={styles.phoneCount}>
                  <ValueRoll value={String(linesOf[scrub]).padStart(2, "0")} />{" "}
                  {fill(copy.compoundCount, linesOf[scrub]).replace(/^\d+\s*/, "")}
                </span>
                <Link href={compounds[scrub].href} className={styles.claimLink}>
                  {copy.openRecord} <span aria-hidden="true">→</span>
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className={styles.phoneName}>
                <span className={styles.phoneFigure}>
                  <ValueRoll value={String(points)} />
                </span>{" "}
                <span className={styles.figureLabel}>{copy.points}</span>
              </p>
              <p className={styles.hint}>{copy.touchHint}</p>
            </>
          )}
          {scrubber("phone")}
        </div>
      </div>
    </div>
  );
}
