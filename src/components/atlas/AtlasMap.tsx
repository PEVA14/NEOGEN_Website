"use client";

import styles from "./AtlasMap.module.css";

import type { CSSProperties } from "react";
import type { AtlasResultProduct, AtlasResultTopic } from "@/domain/atlas/result";

/**
 * THE MAP — the visitor's topics, and the products that connect them.
 *
 * Two renderings of the same facts, exactly one in the accessibility tree at a
 * time (the other is `display: none`):
 *
 *   constellation — wide screens. Areas across the top in the reader's rank
 *                   order; compounds beneath, each placed under the mean
 *                   position of the areas it is filed in, so a compound that
 *                   bridges two areas sits BETWEEN them and its two lines make
 *                   the bridge visible. Nothing here is decorative: every node
 *                   is a real area or compound, and every line is a real
 *                   assignment from the registry.
 *   matrix        — phones. At 375px the constellation's labels would be
 *                   illegible, so a phone gets the same relation as a table:
 *                   compounds down, areas across, a dot where it is filed.
 *
 * Hovering or focusing a compound lights its lines and its card below.
 */

const W = 1000;
const PAD = 90;
const AREA_Y = 96;
const AREA_R = 34;
const ROW_Y = 318;

const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

export function AtlasMap({
  areas,
  compounds,
  label,
  columnLabel,
  legend,
  active,
  onActive,
}: {
  areas: readonly AtlasResultTopic[];
  compounds: readonly AtlasResultProduct[];
  label: string;
  columnLabel: string;
  legend: { start: string; more: string; bridges: string };
  active: string | null;
  onActive: (slug: string | null) => void;
}) {
  const areaIndex = new Map(areas.map((area, index) => [area.id, index]));
  const areaX = (index: number) =>
    PAD + ((W - 2 * PAD) * (index + 0.5)) / Math.max(areas.length, 1);

  const placed = compounds
    .map((compound) => {
      const indices = compound.areas
        .map((a) => areaIndex.get(a.id))
        .filter((n): n is number => n !== undefined);
      const mean =
        indices.length > 0
          ? indices.reduce((s, n) => s + n, 0) / indices.length
          : (areas.length - 1) / 2;
      return { compound, indices, mean };
    })
    .sort((a, b) => a.mean - b.mean || (a.compound.list === "start" ? -1 : 1));

  const stagger = placed.length > 5;
  const nodeX = (j: number) => PAD + ((W - 2 * PAD) * (j + 0.5)) / Math.max(placed.length, 1);
  const nodeY = (j: number) => ROW_Y + (stagger && j % 2 === 1 ? 58 : 0);
  const height = ROW_Y + (stagger ? 58 : 0) + 64;

  let linkOrder = 0;

  return (
    <figure className={styles.figure}>
      <svg
        className={styles.constellation}
        viewBox={`0 0 ${W} ${height}`}
        role="group"
        aria-label={label}
        data-has-active={active ? "" : undefined}
      >
        {/* Lines first, so every node paints over them. */}
        {placed.map(({ compound, indices }, j) =>
          indices.map((k) => {
            const x = nodeX(j);
            const y = nodeY(j);
            const ax = areaX(k);
            const mid = (y + AREA_Y + AREA_R) / 2;
            const order = linkOrder++;
            return (
              <g key={`${compound.slug}-${areas[k].id}`} data-area={areas[k].id}>
                <path
                  className={styles.link}
                  data-active={active === compound.slug ? "" : undefined}
                  d={`M ${x} ${y - 12} C ${x} ${mid}, ${ax} ${mid}, ${ax} ${AREA_Y + AREA_R}`}
                  pathLength={1}
                  style={{ "--order": order } as CSSProperties}
                />
              </g>
            );
          }),
        )}

        {areas.map((area, index) => (
          <g
            key={area.id}
            data-area={area.id}
            transform={`translate(${areaX(index)} ${AREA_Y})`}
            className={styles.areaGroup}
          >
            <a href={area.href}>
              <title>{area.label}</title>
              <circle className={styles.areaCircle} r={AREA_R} />
              <text className={styles.areaCount} y={1}>
                {String(area.compounds).padStart(2, "0")}
              </text>
              <text className={styles.areaLabel} y={-AREA_R - 18}>
                {area.label}
              </text>
            </a>
          </g>
        ))}

        {placed.map(({ compound }, j) => (
          <g
            key={compound.slug}
            transform={`translate(${nodeX(j)} ${nodeY(j)})`}
            className={styles.nodeGroup}
            data-active={active === compound.slug ? "" : undefined}
            style={{ "--order": j } as CSSProperties}
          >
            <a
              href={compound.href}
              onMouseEnter={() => onActive(compound.slug)}
              onMouseLeave={() => onActive(null)}
              onFocus={() => onActive(compound.slug)}
              onBlur={() => onActive(null)}
            >
              <title>{compound.name}</title>
              {compound.bridges ? <circle className={styles.bridgeRing} r={19} /> : null}
              <circle
                className={styles.node}
                r={compound.list === "start" ? 12 : 8}
                data-role={compound.list === "start" ? "core" : "complement"}
              />
              <text className={styles.nodeLabel} y={38}>
                {truncate(compound.name, stagger ? 20 : 24)}
              </text>
            </a>
          </g>
        ))}
      </svg>

      <table className={styles.matrix}>
        <caption className={styles.srOnly}>{label}</caption>
        <thead>
          <tr>
            <th scope="col" className={styles.matrixCorner}>
              {columnLabel}
            </th>
            {areas.map((area) => (
              <th key={area.id} scope="col" data-area={area.id} className={styles.matrixArea}>
                {area.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compounds.map((compound) => (
            <tr key={compound.slug}>
              <th scope="row" className={styles.matrixRow}>
                <a href={compound.href} className={styles.matrixName}>
                  {compound.name}
                </a>
                {compound.bridges ? (
                  <span className={styles.matrixBridge}>{legend.bridges}</span>
                ) : null}
              </th>
              {areas.map((area) => {
                const filed = compound.areas.some((a) => a.id === area.id);
                return (
                  <td key={area.id} data-area={area.id} className={styles.matrixCell}>
                    {filed ? (
                      <span
                        className={styles.dot}
                        role="img"
                        aria-label={`${compound.name} · ${area.label}`}
                      />
                    ) : (
                      <span className={styles.srOnly}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <figcaption className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendNode} data-role="core" aria-hidden="true" />
          {legend.start}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendNode} data-role="complement" aria-hidden="true" />
          {legend.more}
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendBridge} aria-hidden="true" />
          {legend.bridges}
        </span>
      </figcaption>
    </figure>
  );
}
