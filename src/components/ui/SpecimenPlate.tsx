import { useId } from "react";

import { Mono } from "@/components/typography";

import styles from "./SpecimenPlate.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";
import type { WorldId } from "@/config/worlds";

export type PlateSize = "card" | "plate" | "feature" | "stage";

/**
 * THE PRODUCT OBJECT — the deliberate fallback for a product with no photograph.
 *
 * V1 COMMERCE PASS. The plate used to be a specimen diagram: a pale outlined
 * vial in front of the compound's name set as ghosted poster type. Honest, but
 * across 85 cards it read as a database entry — a record OF a product rather
 * than the product. The Design Bible now says the products get loud, so the
 * fallback is an OBJECT: the NEOGEN vial, drawn from the proportions of the
 * real model (`public/models/reta.glb`), standing on a lit studio sweep, with
 * NEOGEN's own packaging identity — the wordmark, the product's name, its
 * strength — printed on the paper label, exactly as the model's label is.
 *
 * IT IS NOT A PHOTOGRAPH AND DOES NOT PRETEND TO BE ONE. It is flat vector
 * drawing in the brand's own type, with no texture, grain or lens behaviour,
 * so it reads as packaging art direction rather than as a product shot. A real
 * photograph replaces it entirely (`stillMedia` picks the image and this never
 * renders).
 *
 * EVERYTHING ON IT IS REGISTRY DATA:
 *
 *   label name    the product's registry name
 *   label line    its presentation range
 *   contents      powder for a product sold by mass or units, liquid for one
 *                 sold by volume — read off the range itself ("3 ml – 10 ml")
 *   stripe        its discovery area's colour (or its world's, for flagships)
 *   ground        a neutral studio sweep; a dark world stage only for the
 *                 three flagships, which is where controlled product colour
 *                 interrupts the neutral store
 *
 * SIZES. `card` in grids, `plate` on the product page, `feature` for a wide
 * lead card, `stage` for an Experience moment where the object IS the scene.
 */
export function SpecimenPlate({
  areaId,
  world,
  name,
  presentations,
  index,
  annotation,
  size = "card",
  bare = false,
}: {
  /** Primary discovery area, for the label stripe. Null for unassigned products. */
  areaId: DiscoveryAreaId | null;
  /** A world outranks an area: the three flagships stand on their own ground. */
  world: WorldId | null;
  /**
   * The name printed on the label. Decorative and `aria-hidden` — every
   * surface that renders a plate also renders the name as real text.
   */
  name?: string;
  /** Kept for callers; the object no longer draws per-presentation marks. */
  presentations?: number;
  /** Catalogue index, as a small corner mark where a composition wants one. */
  index?: string;
  /** The presentation range, printed on the label and read for contents. */
  annotation?: string;
  size?: PlateSize;
  /**
   * The object alone, on a transparent ground — for an Experience moment whose
   * own light is the scene. The world's vial palette still applies.
   */
  bare?: boolean;
}) {
  void presentations;
  return (
    <div
      className={styles.plate}
      data-size={size}
      data-area={world ? undefined : (areaId ?? undefined)}
      data-world={world ?? undefined}
      data-bare={bare ? "" : undefined}
    >
      {bare ? null : (
        <>
          <div className={styles.ground} aria-hidden="true" />
          <div className={styles.floor} aria-hidden="true" />
        </>
      )}
      <VialObject
        className={styles.vial}
        name={name}
        line={annotation}
        liquid={isLiquid(annotation)}
      />
      {index ? (
        <Mono size="2xs" className={styles.index}>
          {index}
        </Mono>
      ) : null}
    </div>
  );
}

/** Sold by volume ("3 ml – 10 ml", "200 mg / 10 ml") → liquid. Mass or units → powder. */
function isLiquid(range: string | undefined): boolean {
  return range ? /\bml\b/i.test(range) : false;
}

/**
 * Break a name for the label: one line when it fits, otherwise two, split at
 * the space nearest the middle so the lines balance.
 */
function labelLines(name: string): string[] {
  const upper = name.toUpperCase();
  if (upper.length <= 11 || !upper.includes(" ")) return [upper];
  const words = upper.split(" ");
  let best: string[] = [upper];
  let bestWidth = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const width = Math.max(a.length, b.length);
    if (width < bestWidth) {
      best = [a, b];
      bestWidth = width;
    }
  }
  return best;
}

const LABEL_WIDTH = 104;
/** The condensed display face averages ~0.5em per uppercase character. */
const CHAR = 0.5;

/**
 * THE VIAL. viewBox 200 × 340, drawn from the GLB's proportions: a straight
 * cylinder with a short shoulder, a crimped aluminium collar and a flip cap.
 * Every colour is a CSS custom property set by the plate's area/world scope,
 * so one drawing serves the neutral store and all three worlds.
 */
function VialObject({
  className,
  name,
  line,
  liquid,
}: {
  className?: string;
  name?: string;
  line?: string;
  liquid: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const id = (part: string) => `${uid}-${part}`;
  const lines = name ? labelLines(name) : [];
  const longest = Math.max(1, ...lines.map((l) => l.length));
  const fontSize = Math.max(10, Math.min(30, LABEL_WIDTH / (longest * CHAR)));
  const nameTop = lines.length === 1 ? 214 : 200;
  const fits = (text: string) => text.length * CHAR * fontSize <= LABEL_WIDTH;

  return (
    <svg viewBox="0 0 200 340" className={className} aria-hidden="true" focusable="false">
      <defs>
        {/* Glass: darker at the silhouette, clear through the middle. */}
        <linearGradient id={id("glass")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--vial-edge)" stopOpacity="0.55" />
          <stop offset="0.16" stopColor="var(--vial-glass)" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="var(--vial-glass)" stopOpacity="0.12" />
          <stop offset="0.84" stopColor="var(--vial-glass)" stopOpacity="0.3" />
          <stop offset="1" stopColor="var(--vial-edge)" stopOpacity="0.6" />
        </linearGradient>
        {/* Metal: a brushed cylinder, lit from the upper left. */}
        <linearGradient id={id("metal")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--vial-cap-dark)" />
          <stop offset="0.28" stopColor="var(--vial-cap-light)" />
          <stop offset="0.55" stopColor="var(--vial-cap)" />
          <stop offset="1" stopColor="var(--vial-cap-dark)" />
        </linearGradient>
        <linearGradient id={id("collar")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--vial-collar-dark)" />
          <stop offset="0.3" stopColor="var(--vial-collar-light)" />
          <stop offset="1" stopColor="var(--vial-collar-dark)" />
        </linearGradient>
        {/* The label wraps a cylinder: its edges turn away from the light. */}
        <linearGradient id={id("wrap")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.2" />
          <stop offset="0.14" stopColor="#000" stopOpacity="0" />
          <stop offset="0.78" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>
        <linearGradient id={id("fill")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--vial-fill)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--vial-fill)" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id={id("shadow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="var(--vial-shadow, 0.28)" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id("body")}>
          <path d={BODY} />
        </clipPath>
      </defs>

      {/* Contact shadow — the object stands on something. */}
      <ellipse cx="100" cy="321" rx="86" ry="9" fill={`url(#${id("shadow")})`} />

      {/* Contents, clipped to the glass. */}
      <g clipPath={`url(#${id("body")})`}>
        {liquid ? (
          <>
            <rect x="30" y="196" width="140" height="130" fill={`url(#${id("fill")})`} />
            <ellipse cx="100" cy="196" rx="64" ry="4" fill="var(--vial-fill)" opacity="0.9" />
          </>
        ) : (
          <>
            {/* A lyophilised cake: a domed top catching the light. */}
            <path
              d="M36 288 C 58 274, 142 274, 164 288 L164 330 L36 330 Z"
              fill="var(--vial-powder)"
            />
            <path
              d="M40 287 C 62 276, 138 276, 160 287"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.9"
              strokeWidth="1.4"
            />
            <path d="M36 300 L164 300 L164 330 L36 330 Z" fill="#000" opacity="0.05" />
          </>
        )}
      </g>

      {/* Glass body. */}
      <path d={BODY} fill={`url(#${id("glass")})`} />
      <path d={BODY} fill="none" stroke="var(--vial-edge)" strokeOpacity="0.55" strokeWidth="1.2" />

      {/* Label — NEOGEN packaging identity, printed with registry data. */}
      <g>
        <rect x="36" y="150" width="128" height="116" fill="var(--vial-label)" />
        <text
          x="100"
          y="170"
          textAnchor="middle"
          className={styles.labelMark}
          fill="var(--vial-label-ink)"
        >
          NEOGEN
        </text>
        <rect x="58" y="178" width="84" height="0.8" fill="var(--vial-label-ink)" opacity="0.35" />
        {lines.map((text, i) => (
          <text
            key={text}
            x="100"
            y={nameTop + i * fontSize * 0.98}
            textAnchor="middle"
            className={styles.labelName}
            fill="var(--vial-label-ink)"
            style={{ fontSize }}
            {...(fits(text) ? {} : { textLength: LABEL_WIDTH, lengthAdjust: "spacingAndGlyphs" })}
          >
            {text}
          </text>
        ))}
        {line ? (
          <text
            x="100"
            y="250"
            textAnchor="middle"
            className={styles.labelLine}
            fill="var(--vial-label-ink)"
            {...(line.length > 22 ? { textLength: 108, lengthAdjust: "spacingAndGlyphs" } : {})}
          >
            {line.toUpperCase()}
          </text>
        ) : null}
        <rect x="36" y="259" width="128" height="7" fill="var(--vial-stripe)" />
        <rect x="36" y="150" width="128" height="116" fill={`url(#${id("wrap")})`} />
      </g>

      {/* Specular — one vertical highlight down the glass, over everything. */}
      <rect x="47" y="104" width="5" height="206" fill="#fff" opacity="var(--vial-spec, 0.55)" />
      <rect x="146" y="112" width="2" height="190" fill="#fff" opacity="0.18" />

      {/* Collar and cap. */}
      <rect x="62" y="58" width="76" height="18" fill={`url(#${id("collar")})`} />
      <rect x="62" y="66" width="76" height="1" fill="#000" opacity="0.18" />
      <rect x="56" y="14" width="88" height="46" fill={`url(#${id("metal")})`} />
      <rect x="56" y="14" width="88" height="3" fill="#fff" opacity="0.25" />
      <rect x="56" y="57" width="88" height="3" fill="#000" opacity="0.18" />
    </svg>
  );
}

/** Neck, shoulder, straight wall, rounded heel. */
const BODY =
  "M68 76 L132 76 L132 90 C 132 100 164 100 164 116 L164 308 Q164 318 154 318 L46 318 Q36 318 36 308 L36 116 C 36 100 68 100 68 90 Z";
