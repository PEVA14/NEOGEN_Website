"use client";

import { useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import styles from "./EvidenceStructure.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";

export interface EvidenceStructureCopy {
  hint: string;
  scrubProfiles: string;
  scrubReferences: string;
  scrubAreas: string;
  refs: string;
  refsOne: string;
  areas: string;
  areasOne: string;
  cited: string;
  citedOne: string;
  profiles: string;
  profilesOne: string;
}

type Row = "references" | "profiles" | "areas";
type Active = { row: Row; i: number } | null;

/**
 * THE EVIDENCE AS THE SETS IT COUNTS — not three big numbers.
 *
 * Seventy-four references, sixty-two sourced profiles, eight areas: each
 * count is set beside a row of marks, one mark per real item, so the figure
 * reads as what it is — a quantity of things that exist. Point at a mark (or
 * slide along a row: each row is a range input, for a finger or the arrow
 * keys) and the threads that really join it appear: a profile to the
 * references its profile cites and the areas it is filed in; a reference to
 * the profiles that cite it; an area to its profiles.
 *
 * WHAT IT DOES NOT SAY. Marks are in fixed orders (references newest first,
 * as the reference index lists them; profiles in catalogue order; areas in
 * the catalogue's order), so position means nothing. There is no weight,
 * score, ranking, progress or "strength" anywhere, and nothing counts up:
 * at rest it is a still picture of the archive's size, and it only draws a
 * connection the content states.
 *
 * COLOUR FOCUSES (color pass). At rest the only colour is the eight areas'
 * own marks — what an area is called and coloured everywhere on the site.
 * Pointed at, the connection takes colour: a profile's mark, its threads and
 * the references it cites take its first area's colour; an area lends its
 * colour to the profiles filed in it, each of which keeps its own. Colour here
 * means area membership and "these are connected now" — never strength,
 * similarity or effect. Off again, it returns to ink.
 */
export function EvidenceStructure({
  labels,
  profiles,
  references,
  areas,
  copy,
}: {
  labels: { profiles: string; references: string; areas: string };
  profiles: readonly { name: string; refs: readonly number[]; areas: readonly number[] }[];
  references: readonly { label: string }[];
  areas: readonly { id: DiscoveryAreaId; label: string }[];
  copy: EvidenceStructureCopy;
}) {
  const [active, setActive] = useState<Active>(null);
  const plate = useRef<HTMLDivElement>(null);
  const strips = useRef<Record<Row, HTMLDivElement | null>>({
    references: null,
    profiles: null,
    areas: null,
  });

  /* Where each strip lies inside the plate: measured, not read during render. */
  type Box = { left: number; width: number; top: number; bottom: number };
  const [boxes, setBoxes] = useState<Record<Row, Box> | null>(null);
  useLayoutEffect(() => {
    const node = plate.current;
    if (!node) return;
    const measure = () => {
      const p = node.getBoundingClientRect();
      const box = (row: Row): Box => {
        const r = strips.current[row]?.getBoundingClientRect();
        return r
          ? { left: r.left - p.left, width: r.width, top: r.top - p.top, bottom: r.bottom - p.top }
          : { left: 0, width: 0, top: 0, bottom: 0 };
      };
      setBoxes({ references: box("references"), profiles: box("profiles"), areas: box("areas") });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const citedBy = useMemo(() => {
    const out = references.map(() => [] as number[]);
    profiles.forEach((p, pi) => p.refs.forEach((r) => out[r]?.push(pi)));
    return out;
  }, [profiles, references]);
  const inArea = useMemo(() => {
    const out = areas.map(() => [] as number[]);
    profiles.forEach((p, pi) => p.areas.forEach((a) => out[a]?.push(pi)));
    return out;
  }, [profiles, areas]);

  const count: Record<Row, number> = {
    references: references.length,
    profiles: profiles.length,
    areas: areas.length,
  };
  const n = (template: string, one: string, k: number) =>
    k === 1 ? one : template.replace("{n}", String(k));

  /* What is lit, from what is active — only links the data states. */
  const lit: Record<Row, Set<number>> = {
    references: new Set(),
    profiles: new Set(),
    areas: new Set(),
  };
  const threads: { from: [Row, number]; to: [Row, number] }[] = [];
  let readout: { name: string; facts: string } | null = null;
  /* The areas the pointed-at thing is filed in: registration marks by its name. */
  let readoutAreas: DiscoveryAreaId[] = [];
  if (active) {
    const { row, i } = active;
    lit[row].add(i);
    if (row === "profiles") {
      const p = profiles[i];
      for (const r of p.refs) {
        lit.references.add(r);
        threads.push({ from: ["profiles", i], to: ["references", r] });
      }
      for (const a of p.areas) {
        lit.areas.add(a);
        threads.push({ from: ["profiles", i], to: ["areas", a] });
      }
      readoutAreas = p.areas.map((a) => areas[a]?.id).filter((id): id is DiscoveryAreaId => !!id);
      readout = {
        name: p.name,
        facts: `${n(copy.refs, copy.refsOne, p.refs.length)} · ${n(copy.areas, copy.areasOne, p.areas.length)}`,
      };
    } else if (row === "references") {
      for (const pi of citedBy[i]) {
        lit.profiles.add(pi);
        threads.push({ from: ["profiles", pi], to: ["references", i] });
      }
      readout = {
        name: references[i].label,
        facts: n(copy.cited, copy.citedOne, citedBy[i].length),
      };
    } else {
      for (const pi of inArea[i]) {
        lit.profiles.add(pi);
        threads.push({ from: ["profiles", pi], to: ["areas", i] });
      }
      readoutAreas = [areas[i].id];
      readout = {
        name: areas[i].label,
        facts: n(copy.profiles, copy.profilesOne, inArea[i].length),
      };
    }
  }

  /* The area colour each mark carries when it is part of a connection. */
  const areaOf = (row: Row, i: number): DiscoveryAreaId | undefined =>
    row === "areas"
      ? areas[i]?.id
      : row === "profiles"
        ? areas[profiles[i]?.areas[0] ?? -1]?.id
        : undefined;
  /* The connection's own colour, which the references take. */
  const context = active
    ? active.row === "references"
      ? undefined
      : areaOf(active.row, active.i)
    : undefined;

  /* Thread ends on the strips: the middle of a mark, at the strip's edge. */
  const at = (row: Row, i: number) => {
    const b = boxes?.[row];
    if (!b) return { x: 0, y: 0 };
    const x = b.left + ((i + 0.5) / count[row]) * b.width;
    const y = row === "references" ? b.bottom : row === "areas" ? b.top : (b.top + b.bottom) / 2;
    return { x, y };
  };

  const pick = (row: Row) => (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    /* The offset inside the strip, from the event itself (the strip's range
       input, flush with it, is what the pointer is over): no box to read. */
    const x = event.nativeEvent.offsetX;
    const width = boxes?.[row]?.width || event.currentTarget.clientWidth;
    const i = Math.min(count[row] - 1, Math.max(0, Math.floor((x / width) * count[row])));
    setActive((a) => (a && a.row === row && a.i === i ? a : { row, i }));
  };

  const strip = (row: Row, label: string, scrub: string, title: (i: number) => string) => (
    <div className={styles.row} data-row={row}>
      <dt className={styles.label}>{label}</dt>
      {/* The count and its marks are one definition: the strip is in the dd. */}
      <dd className={styles.cell}>
        <span className={styles.value}>{String(count[row]).padStart(2, "0")}</span>
        <div
          className={styles.strip}
          ref={(node) => {
            strips.current[row] = node;
          }}
          style={{ ["--n" as string]: count[row] }}
          onPointerMove={pick(row)}
          /* A touch "leaves" as it lifts: only a mouse lets go by leaving. */
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setActive(null);
          }}
        >
          <span className={styles.marks} aria-hidden="true">
            {Array.from({ length: count[row] }, (_, i) => (
              <span
                key={i}
                className={styles.mark}
                data-area={areaOf(row, i)}
                data-lit={lit[row].has(i) ? "true" : undefined}
                data-active={active?.row === row && active.i === i ? "true" : undefined}
              />
            ))}
          </span>
          <input
            type="range"
            className={styles.range}
            min={0}
            max={count[row] - 1}
            step={1}
            value={active?.row === row ? active.i : 0}
            aria-label={scrub}
            aria-valuetext={title(active?.row === row ? active.i : 0)}
            onChange={(event) => setActive({ row, i: Number(event.target.value) })}
            onPointerDown={(event) => {
              const r = event.currentTarget.getBoundingClientRect();
              const i = Math.round(((event.clientX - r.left) / r.width) * (count[row] - 1));
              setActive({ row, i: Math.min(count[row] - 1, Math.max(0, i)) });
            }}
            onBlur={() => setActive(null)}
          />
        </div>
      </dd>
    </div>
  );

  return (
    <div
      className={styles.structure}
      ref={plate}
      data-active={active ? active.row : undefined}
      data-area={context}
    >
      <dl className={styles.rows}>
        {strip(
          "references",
          labels.references,
          copy.scrubReferences,
          (i) => references[i]?.label ?? "",
        )}
        {strip("profiles", labels.profiles, copy.scrubProfiles, (i) => profiles[i]?.name ?? "")}
        {strip("areas", labels.areas, copy.scrubAreas, (i) => areas[i]?.label ?? "")}
      </dl>

      <svg className={styles.threads} aria-hidden="true">
        {threads.map(({ from, to }, k) => {
          const a = at(...from);
          const b = at(...to);
          const ay = to[0] === "references" ? a.y - 4 : a.y + 4;
          /* A thread to an area is that area's; to a reference, the profile's. */
          const tone = to[0] === "areas" ? areaOf("areas", to[1]) : areaOf("profiles", from[1]);
          return (
            <path
              key={`${active?.row}-${active?.i}-${k}`}
              data-area={tone}
              d={`M ${a.x} ${ay} C ${a.x} ${(ay + b.y) / 2}, ${b.x} ${(ay + b.y) / 2}, ${b.x} ${b.y}`}
              pathLength={1}
              className={styles.thread}
            />
          );
        })}
      </svg>

      <p className={styles.readout} aria-live="polite">
        {readout ? (
          <>
            <span className={styles.readoutName}>
              {readoutAreas.length > 0 ? (
                <span className={styles.readoutMarks} aria-hidden="true">
                  {readoutAreas.map((id) => (
                    <span key={id} data-area={id} />
                  ))}
                </span>
              ) : null}
              {readout.name}
            </span>
            <span className={styles.readoutFacts}>{readout.facts}</span>
          </>
        ) : (
          <span className={styles.hint}>{copy.hint}</span>
        )}
      </p>
    </div>
  );
}
