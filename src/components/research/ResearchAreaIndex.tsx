"use client";

import Link from "next/link";
import { Fragment, useEffect, useId, useRef, useState } from "react";

import { Mono } from "@/components/typography";
import { AreaSignet } from "@/components/ui/AreaSignet";

import { DepthMarks, type DepthMarksCopy, type RecordDepth } from "./DepthMarks";
import styles from "./ResearchAreaIndex.module.css";

import type { CSSProperties } from "react";

import type { DiscoveryAreaId } from "@/data/discovery/types";

export interface AreaCompound {
  slug: string;
  name: string;
  depth: RecordDepth | null;
  /** The compendium, filtered to this area, with this compound's record open. */
  href: string;
}

export interface ResearchAreaEntry {
  id: DiscoveryAreaId;
  index: string;
  /** The commercial name, set as the row's title — "Metabolismo". */
  short: string;
  /** The research framing, in mono beneath it. */
  title: string;
  body: string;
  /** Without script, the tile's own link: the area in the compounds index
      (Research stays in Research — architecture pass). */
  href: string;
  /** The catalogue's view of the area — the roster's labelled way into
      commerce ("Ver en el catálogo"). */
  catalogHref: string;
  /** The compendium, filtered to this area. */
  compendiumHref: string;
  compounds: number;
  references: number;
  examples: readonly string[];
  /** Every compound filed in the area, A to Z. */
  roster: readonly AreaCompound[];
}

export interface ResearchAreaIndexCopy {
  compounds: string;
  references: string;
  enter: string;
  /** The tile's own action once it opens in place — "Ver sus compuestos". */
  open: string;
  close: string;
  compendium: string;
  /** "{area}, de la A a la Z" — the roster's accessible name. */
  roster: string;
  depth: DepthMarksCopy;
}

/**
 * RESEARCH AREAS — the hub's way in, as a browsing surface rather than a shop.
 *
 * Deliberately NOT the homepage's DiscoveryGrid. That one sells: tone panels,
 * entry prices. This one is for someone reading rather than buying: a grid of
 * tiles, each in its area's own material (the wash appears on hover, the hue
 * only in the symbol and the gauge), with the compound count set large and
 * the references the area's products cite beside it — only when that number
 * is above zero, because a "0 references" figure would read as a scoreboard of
 * absence. The gauge is the area's size against the largest area: a registry
 * fact, not a rating.
 *
 * AN AREA OPENS IN PLACE (finishing pass: the last static part of Research).
 * The tile is one magnification of the area; opened, the row it stands in
 * parts and the area's roster unfolds beneath it — every compound filed
 * there, A to Z, each with its record's depth marks (the compendium's own,
 * counted from the record). A name leads into the compendium, filtered to the
 * area, with that compound's record already open: area → compendium → quick
 * record → full record, one instrument. A notch under the open tile marks
 * which area the roster is; choosing another tile in the same row carries it
 * across. Nothing is arranged by likeness: the roster is alphabetical.
 *
 * The tile is a disclosure button (`aria-expanded`), Escape closes and
 * returns to it; without script it is the link to the catalogue it always
 * was. The roster unfolds in CSS (`@starting-style`) and appears at once for
 * reduced motion. Four across on a wide screen, two on a tablet, one on a
 * phone, where the roster opens straight under its tile.
 */
export function ResearchAreaIndex({
  entries,
  copy,
}: {
  entries: readonly ResearchAreaEntry[];
  copy: ResearchAreaIndexCopy;
}) {
  const max = Math.max(1, ...entries.map((e) => e.compounds));
  const id = useId();
  const grid = useRef<HTMLOListElement>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState<DiscoveryAreaId | null>(null);
  const [cols, setCols] = useState(1);

  /* Enhanced once mounted: before that every tile is its catalogue link. */
  useEffect(() => {
    const node = grid.current;
    if (!node) return;
    const measure = () =>
      setCols(
        Math.max(1, getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean).length),
      );
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    const frame = requestAnimationFrame(() => {
      measure();
      setReady(true);
    });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const openIndex = open ? entries.findIndex((e) => e.id === open) : -1;
  /* The roster follows the last tile of the open tile's row. */
  const rowEnd =
    openIndex < 0
      ? -1
      : Math.min(entries.length - 1, Math.floor(openIndex / cols) * cols + cols - 1);
  const openEntry = openIndex >= 0 ? entries[openIndex] : null;
  const panelId = `${id}-roster`;

  const close = () => {
    const was = open;
    setOpen(null);
    if (was) document.getElementById(`${id}-${was}`)?.focus();
  };

  return (
    <ol className={styles.grid} ref={grid}>
      {entries.map((entry, i) => {
        const expanded = open === entry.id;
        const face = (
          <>
            <span className={styles.top}>
              <AreaSignet id={entry.id} size="md" tone="plate" className={styles.icon} />
              <Mono size="2xs" className={styles.number} aria-hidden="true">
                {entry.index}
              </Mono>
            </span>
            {/* The commercial name leads, the research framing sits under it
                in mono — the same two-name treatment the discovery panels and
                the area mastheads use. */}
            <span className={styles.title}>{entry.short}</span>
            <Mono size="2xs" className={styles.framing}>
              {entry.title}
            </Mono>
            <span className={styles.body}>{entry.body}</span>
            {entry.examples.length > 0 ? (
              <Mono size="2xs" className={styles.examples}>
                {entry.examples.join(" · ")}
              </Mono>
            ) : null}
            <span className={styles.figures}>
              <span className={styles.figure}>
                <span className={styles.figureValue}>{entry.compounds}</span>
                <Mono size="2xs" className={styles.figureLabel}>
                  {copy.compounds}
                </Mono>
              </span>
              {entry.references > 0 ? (
                <span className={styles.figure}>
                  <span className={styles.figureValue}>{entry.references}</span>
                  <Mono size="2xs" className={styles.figureLabel}>
                    {copy.references}
                  </Mono>
                </span>
              ) : null}
            </span>
            <span className={styles.gauge} aria-hidden="true">
              <span className={styles.gaugeFill} />
            </span>
            <Mono size="2xs" className={styles.enter} aria-hidden="true">
              {ready ? (
                <>
                  {copy.open} <span className={styles.chevron}>↓</span>
                </>
              ) : (
                <>{copy.enter} →</>
              )}
            </Mono>
          </>
        );
        return (
          <Fragment key={entry.id}>
            <li className={styles.cell} data-area={entry.id} data-open={expanded || undefined}>
              {ready ? (
                <button
                  type="button"
                  id={`${id}-${entry.id}`}
                  className={styles.tile}
                  data-symbol-host=""
                  style={{ "--share": entry.compounds / max } as CSSProperties}
                  aria-expanded={expanded}
                  aria-controls={expanded ? panelId : undefined}
                  onClick={() => setOpen(expanded ? null : entry.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && expanded) setOpen(null);
                  }}
                >
                  {face}
                </button>
              ) : (
                <Link
                  href={entry.href}
                  className={styles.tile}
                  data-symbol-host=""
                  style={{ "--share": entry.compounds / max } as CSSProperties}
                >
                  {face}
                </Link>
              )}
            </li>
            {i === rowEnd && openEntry ? (
              <li
                key={`roster-${Math.floor(openIndex / cols)}`}
                className={styles.panel}
                data-area={openEntry.id}
                style={
                  {
                    "--notch": `${(((openIndex % cols) + 0.5) / cols) * 100}%`,
                  } as CSSProperties
                }
              >
                <section
                  id={panelId}
                  className={styles.roster}
                  aria-label={copy.roster.replace("{area}", openEntry.short)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") close();
                  }}
                >
                  <div className={styles.rosterInner}>
                    <div className={styles.rosterHead}>
                      <p className={styles.rosterTitle}>
                        <AreaSignet
                          id={openEntry.id}
                          size="sm"
                          tone="plate"
                          className={styles.rosterIcon}
                        />
                        {openEntry.short}
                        <Mono size="2xs" className={styles.rosterCount}>
                          {openEntry.compounds} {copy.compounds.toLowerCase()}
                        </Mono>
                      </p>
                      <ul className={styles.legend} aria-hidden="true">
                        {(["mechanism", "research", "notes", "references"] as const).map(
                          (key, n) => (
                            <li key={key}>
                              <span className={styles.legendMark}>
                                {[0, 1, 2, 3].map((m) => (
                                  <span key={m} data-on={m === n ? "true" : undefined} />
                                ))}
                              </span>
                              {copy.depth[key]}
                            </li>
                          ),
                        )}
                      </ul>
                      <button type="button" className={styles.close} onClick={close}>
                        {copy.close} <span aria-hidden="true">×</span>
                      </button>
                    </div>
                    <ol key={openEntry.id} className={styles.names}>
                      {openEntry.roster.map((compound) => (
                        <li key={compound.slug}>
                          <Link href={compound.href} className={styles.name}>
                            <span className={styles.nameText}>{compound.name}</span>
                            <DepthMarks depth={compound.depth} copy={copy.depth} />
                          </Link>
                        </li>
                      ))}
                    </ol>
                    <p className={styles.rosterActions}>
                      <Link href={openEntry.compendiumHref} className={styles.rosterAction}>
                        {copy.compendium} <span aria-hidden="true">→</span>
                      </Link>
                      <Link href={openEntry.catalogHref} className={styles.rosterAction}>
                        {copy.enter} <span aria-hidden="true">→</span>
                      </Link>
                    </p>
                  </div>
                </section>
              </li>
            ) : null}
          </Fragment>
        );
      })}
    </ol>
  );
}
