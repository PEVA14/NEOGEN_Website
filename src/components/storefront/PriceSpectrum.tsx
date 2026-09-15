"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";

import { formatPrice } from "@/data/commerce/format";

import styles from "./PriceSpectrum.module.css";

import type { DiscoveryAreaId } from "@/data/discovery/types";

export interface SpectrumPoint {
  slug: string;
  name: string;
  href: string;
  areaId: DiscoveryAreaId | null;
  range: string;
  amount: number;
  x: number;
  level: number;
}

export interface PriceSpectrumCopy {
  /** Accessible name of the plot. */
  plotLabel: string;
  /** "Todas". */
  allAreas: string;
  areaLabels: Record<string, string>;
  /** "{count} compuestos · de {min} a {max}". */
  summary: string;
  /** "Envío gratis desde {price}". */
  threshold: string;
  from: string;
  view: string;
  /** Instruction for the keyboard, visually hidden. */
  keys: string;
  /** "Filtrar por área". */
  areaFilter: string;
  /** "Hasta {price}" — the first band. */
  under: string;
}

/**
 * THE PRICE SPECTRUM — every product placed by what it costs to start.
 *
 * A shop usually offers a price filter: two handles and a promise. This shows
 * the answer before the question. Each of the 85 published products is one
 * mark on a logarithmic price axis, stacked where prices crowd, coloured by
 * its discovery area. A customer with a budget sees immediately where it
 * lands and what lives there; a customer browsing sees the catalogue's shape.
 *
 * THE FREE-SHIPPING LINE IS DRAWN ON THE AXIS. It is the one commercial rule
 * the owner has confirmed, and on a price axis it becomes spatial: every mark
 * to its right is a single pack that already ships free.
 *
 * INTERACTION.
 *   - pointer or focus on a mark fills the readout with that product;
 *   - area chips dim every other area, and the readout summarises the area;
 *   - one tab stop for the whole plot; arrow keys walk the marks in price
 *     order, Home and End jump to either end, Enter opens the product.
 *
 * NARROW SCREENS get price bands instead: a dot plot cannot be read by touch
 * at 375px, and eighty-five 6px targets are not a touch interface. Bands are
 * native `<details>` with ordinary links, and the same area chips.
 */
export function PriceSpectrum({
  points,
  ticks,
  threshold,
  bands,
  areas,
  height,
  copy,
  localeTag,
}: {
  points: readonly SpectrumPoint[];
  ticks: readonly { value: number; x: number }[];
  threshold: { value: number; x: number } | null;
  bands: readonly { from: number; to: number | null; slugs: readonly string[] }[];
  areas: readonly DiscoveryAreaId[];
  height: number;
  copy: PriceSpectrumCopy;
  localeTag: string;
}) {
  const [area, setArea] = useState<DiscoveryAreaId | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const keysId = useId();
  const router = useRouter();
  const money = (amount: number) => formatPrice({ amount, currency: "MXN" }, localeTag);

  const bySlug = useMemo(() => new Map(points.map((p) => [p.slug, p])), [points]);
  const inScope = (p: SpectrumPoint) => area === null || p.areaId === area;
  const scoped = points.filter(inScope);
  const current = active ? bySlug.get(active) : undefined;

  const summary = copy.summary
    .replace("{count}", String(scoped.length))
    .replace("{min}", scoped.length ? money(Math.min(...scoped.map((p) => p.amount))) : "")
    .replace("{max}", scoped.length ? money(Math.max(...scoped.map((p) => p.amount))) : "");

  /* Keyboard walks the marks in scope, in price order (points arrive sorted). */
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    if (scoped.length === 0) return;
    if (event.key === "Enter" && current) {
      event.preventDefault();
      router.push(current.href);
      return;
    }
    const index = current ? scoped.indexOf(current) : -1;
    const last = scoped.length - 1;
    const next =
      event.key === "ArrowRight" || event.key === "ArrowUp"
        ? Math.min(last, index + 1)
        : event.key === "ArrowLeft" || event.key === "ArrowDown"
          ? Math.max(0, index - 1)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(scoped[Math.max(0, next)].slug);
  };

  return (
    <div className={styles.spectrum}>
      <div className={styles.chips} role="group" aria-label={copy.areaFilter}>
        <button
          type="button"
          className={styles.chip}
          aria-pressed={area === null}
          onClick={() => {
            setArea(null);
            setActive(null);
          }}
        >
          {copy.allAreas}
        </button>
        {areas.map((id) => (
          <button
            key={id}
            type="button"
            className={styles.chip}
            data-area={id}
            aria-pressed={area === id}
            onClick={() => {
              setArea(area === id ? null : id);
              setActive(null);
            }}
          >
            <span className={styles.chipSwatch} aria-hidden="true" />
            {copy.areaLabels[id] ?? id}
          </button>
        ))}
      </div>

      {/* The readout: a product when one is under the pointer, the scope's shape otherwise. */}
      {/* Announced only while the plot has keyboard focus — a pointer sweeping
          the marks must not flood a screen reader. */}
      <div className={styles.readout} aria-live={focused ? "polite" : "off"}>
        {current ? (
          <>
            <span className={styles.readoutArea} data-area={current.areaId ?? undefined}>
              <span className={styles.chipSwatch} aria-hidden="true" />
              {current.areaId ? copy.areaLabels[current.areaId] : null}
            </span>
            <span className={styles.readoutName}>{current.name}</span>
            <span className={styles.readoutRange}>{current.range}</span>
            <span className={styles.readoutPrice}>
              <span className={styles.readoutFrom}>{copy.from}</span> {money(current.amount)}
            </span>
            <Link href={current.href} className={styles.readoutLink}>
              {copy.view} →
            </Link>
          </>
        ) : (
          <span className={styles.readoutSummary}>{summary}</span>
        )}
      </div>

      {/* ---- the plot, 48rem and up ---- */}
      <div className={styles.plotWrap}>
        <p id={keysId} className={styles.srOnly}>
          {copy.keys}
        </p>
        {/*
         * ONE FOCUSABLE INSTRUMENT, not 85 links. The marks are 10px — far below
         * a usable target — so they are decorative: the plot takes focus, the
         * arrow keys walk the marks, the readout above announces each one and
         * carries a full-size link. A pointer can still click a mark to go
         * straight to the product; the readout link is the equivalent control.
         */}
        <div
          className={styles.plot}
          style={{ "--levels": Math.max(height, 6) } as CSSProperties}
          role="group"
          tabIndex={0}
          aria-label={copy.plotLabel}
          aria-describedby={keysId}
          onKeyDown={move}
          onFocus={() => {
            setFocused(true);
            if (!active && scoped[0]) setActive(scoped[0].slug);
          }}
          onBlur={() => setFocused(false)}
        >
          {threshold ? (
            <div
              className={styles.threshold}
              style={{ "--x": threshold.x } as CSSProperties}
              aria-hidden="true"
            >
              <span>{copy.threshold.replace("{price}", money(threshold.value))}</span>
            </div>
          ) : null}

          <div className={styles.points} aria-hidden="true">
            {points.map((point) => (
              <span
                key={point.slug}
                className={styles.point}
                style={{ "--x": point.x, "--level": point.level } as CSSProperties}
                data-area={point.areaId ?? undefined}
                data-dim={inScope(point) ? undefined : ""}
                data-active={active === point.slug ? "" : undefined}
                onPointerEnter={() => inScope(point) && setActive(point.slug)}
                onClick={() => router.push(point.href)}
              />
            ))}
          </div>

          <div className={styles.axis} aria-hidden="true">
            {ticks.map((tick) => (
              <span
                key={tick.value}
                className={styles.tick}
                style={{ "--x": tick.x } as CSSProperties}
              >
                {money(tick.value)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ---- bands, below 48rem ---- */}
      <div className={styles.bands}>
        {bands.map((band) => {
          const members = band.slugs
            .map((slug) => bySlug.get(slug))
            .filter((p): p is SpectrumPoint => Boolean(p) && inScope(p as SpectrumPoint));
          if (members.length === 0) return null;
          const label =
            band.to === null
              ? `${money(band.from)} +`
              : band.from === 0
                ? copy.under.replace("{price}", money(band.to))
                : `${money(band.from)} – ${money(band.to)}`;
          const free = threshold !== null && band.from >= threshold.value;
          return (
            <details key={band.from} className={styles.band}>
              <summary>
                <span>{label}</span>
                <span className={styles.bandCount}>{String(members.length).padStart(2, "0")}</span>
              </summary>
              {free ? (
                <p className={styles.bandNote}>
                  {copy.threshold.replace("{price}", money(threshold.value))}
                </p>
              ) : null}
              <ul>
                {members.map((p) => (
                  <li key={p.slug} data-area={p.areaId ?? undefined}>
                    <Link href={p.href} className={styles.bandLink}>
                      <span className={styles.chipSwatch} aria-hidden="true" />
                      <span className={styles.bandName}>{p.name}</span>
                      <span className={styles.bandPrice}>{money(p.amount)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </div>
  );
}
