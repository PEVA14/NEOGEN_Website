import { useId, ViewTransition } from "react";

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
 * real model (the V4 crimp-top, `public/models/reta-v7.glb`), standing on the
 * same warm studio sweep as the renders beside it in the catalogue, with
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
  travel = null,
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
  /**
   * The vial transition: the view-transition name the OBJECT carries, so the
   * drawn vial can leave its card alone and its set stay behind, as a
   * rendered specimen does (`"auto"` while the card is not the tapped one).
   * Null: the plate travels whole, or not at all, as its caller decides.
   */
  travel?: string | null;
}) {
  void presentations;
  const vial = (
    <VialObject
      className={styles.vial}
      name={name}
      line={annotation}
      liquid={isLiquid(annotation)}
    />
  );
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
      {travel ? (
        <ViewTransition name={travel} share="vt-specimen" default="none">
          {vial}
        </ViewTransition>
      ) : (
        vial
      )}
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

const LABEL_WIDTH = 116;
/** The condensed display face averages ~0.5em per uppercase character. */
const CHAR = 0.5;

/**
 * THE VIAL. viewBox 200 × 340, drawn from the V4 crimp-top (`reta-v7.glb`,
 * the container every NEOGEN product ships in), measured off the mesh and
 * checked against its studio still. As fractions of the vial's height H:
 *
 *   flip-off cap     0 – 14 %   Ø 0.87 × body, rounded top edge
 *   crimp band      14 – 20 %   Ø 0.67 × body
 *   neck            20 – 23 %   Ø 0.64 × body
 *   shoulder        23 – 30 %   short, into
 *   body            30 – 100 %  Ø 0.47 H, straight wall, rounded heel
 *   label           38 – 88 %   nearly the full width of the body
 *
 * The vial stands from y 16 to y 316. Every colour is a CSS custom property
 * set by the plate's area/world scope, so one drawing serves the neutral store
 * and all three worlds.
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
  const fontSize = Math.max(10, Math.min(28, LABEL_WIDTH / (longest * CHAR)));
  const nameTop = lines.length === 1 ? 210 : 198;
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
        {/* Metal: a polished cylinder, lit from the upper left. */}
        <linearGradient id={id("metal")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--vial-cap-dark)" />
          <stop offset="0.22" stopColor="var(--vial-cap-light)" />
          <stop offset="0.5" stopColor="var(--vial-cap)" />
          <stop offset="0.8" stopColor="var(--vial-cap-light)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--vial-cap-dark)" />
        </linearGradient>
        <linearGradient id={id("collar")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--vial-collar-dark)" />
          <stop offset="0.3" stopColor="var(--vial-collar-light)" />
          <stop offset="0.7" stopColor="var(--vial-collar-light)" stopOpacity="0.85" />
          <stop offset="1" stopColor="var(--vial-collar-dark)" />
        </linearGradient>
        {/* The label wraps a cylinder: its edges turn away from the light. */}
        <linearGradient id={id("wrap")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.2" />
          <stop offset="0.12" stopColor="#000" stopOpacity="0" />
          <stop offset="0.8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.24" />
        </linearGradient>
        <linearGradient id={id("fill")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--vial-fill)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--vial-fill)" stopOpacity="0.85" />
        </linearGradient>
        {/* The floor gives back a trace of the glass, gone within a heel's height. */}
        <linearGradient id={id("reflection")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--vial-edge)" stopOpacity="0.1" />
          <stop offset="1" stopColor="var(--vial-edge)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id("shadow")} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#000" stopOpacity="var(--vial-shadow, 0.28)" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id("body")}>
          <path d={BODY} />
        </clipPath>
      </defs>

      {/* Contact shadow and reflection — the object stands on something.
          Tagged so a page can form them when the object is set down. */}
      <ellipse
        data-part="contact"
        cx="100"
        cy="317"
        rx="80"
        ry="7"
        fill={`url(#${id("shadow")})`}
      />
      <rect
        data-part="reflection"
        x="31"
        y="317"
        width="138"
        height="20"
        fill={`url(#${id("reflection")})`}
      />

      {/* Contents, clipped to the glass. */}
      <g clipPath={`url(#${id("body")})`}>
        {liquid ? (
          /* The liquid in a group of its own, wider than the glass, so a page
             can keep its surface level when the vial leans. */
          <g data-part="liquid">
            <rect x="0" y="200" width="200" height="220" fill={`url(#${id("fill")})`} />
            <ellipse cx="100" cy="200" rx="72" ry="4" fill="var(--vial-fill)" opacity="0.9" />
          </g>
        ) : (
          <>
            {/* A lyophilised cake below the label: a domed top catching the light. */}
            <path
              d="M31 293 C 56 282, 144 282, 169 293 L169 316 L31 316 Z"
              fill="var(--vial-powder)"
            />
            <path
              d="M35 292 C 60 284, 140 284, 165 292"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.9"
              strokeWidth="1.4"
            />
            <path d="M31 302 L169 302 L169 316 L31 316 Z" fill="#000" opacity="0.05" />
          </>
        )}
      </g>

      {/* Glass body. */}
      <path d={BODY} fill={`url(#${id("glass")})`} />
      <path d={BODY} fill="none" stroke="var(--vial-edge)" strokeOpacity="0.55" strokeWidth="1.2" />

      {/* Label — NEOGEN packaging identity, printed with registry data, in
          the layout of the real label: the identity high, the name at the
          centre, the presentation under it, a band near the foot. */}
      <g>
        <rect x="30" y="130" width="140" height="149" rx="1.5" fill="var(--vial-label)" />
        {/*
          The identity, as the rendered label sets it: the mark, then the
          wordmark. The MARK ALONE, not the full lockup — this plate is drawn
          at 200 units wide and shown smaller still inside a homepage moment,
          and "PEPTIDES" does not survive that. The mark is five filled
          circles and does.

          Its ink is the artwork's own black against `--vial-label-ink`, which
          is charcoal in both of this plate's surfaces; an <image> cannot take
          `currentColor`, and at 9 units the difference is not visible.
        */}
        <image href="/branding/neogen-mark.png" x="70" y="150" width="9" height="11.25" />
        <text
          x="106"
          y="159.5"
          textAnchor="middle"
          className={styles.labelMark}
          fill="var(--vial-label-ink)"
        >
          NEOGEN
        </text>
        <rect x="56" y="171" width="88" height="0.8" fill="var(--vial-label-ink)" opacity="0.3" />
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
            y="237"
            textAnchor="middle"
            className={styles.labelLine}
            fill="var(--vial-range, var(--vial-label-ink))"
            {...(line.length > 22 ? { textLength: 118, lengthAdjust: "spacingAndGlyphs" } : {})}
          >
            {line.toUpperCase()}
          </text>
        ) : null}
        <rect x="30" y="262" width="140" height="9" fill="var(--vial-stripe)" />
        <rect x="30" y="130" width="140" height="149" rx="1.5" fill={`url(#${id("wrap")})`} />
      </g>

      {/* Specular — one vertical highlight down the glass, over everything. */}
      <rect x="40" y="110" width="5" height="194" fill="#fff" opacity="var(--vial-spec, 0.55)" />
      <rect x="157" y="116" width="2" height="184" fill="#fff" opacity="0.18" />

      {/* Crimp band: the aluminium seal rolled under the lip. */}
      <rect x="52.5" y="55" width="95" height="20" fill={`url(#${id("collar")})`} />
      <rect x="52.5" y="56" width="95" height="1.2" fill="#fff" opacity="0.35" />
      <rect x="52.5" y="71.5" width="95" height="1.6" fill="#000" opacity="0.2" />

      {/* Flip-off cap: a broad disc with a rounded top edge. */}
      <path d={CAP} fill={`url(#${id("metal")})`} />
      <path d="M43 16.5 L157 16.5" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.6" />
      <rect x="38" y="23" width="124" height="0.9" fill="#000" opacity="0.1" />
      <rect x="38" y="53" width="124" height="4" fill="#000" opacity="0.2" />
    </svg>
  );
}

/** Neck, a short shoulder, straight wall, rounded heel. */
const BODY =
  "M54.5 70 L145.5 70 L145.5 84 C 145.5 96 171 94 171 107 L171 306 Q171 316 161 316 L39 316 Q29 316 29 306 L29 107 C 29 94 54.5 96 54.5 84 Z";

/** The flip-off cap, its top edge rounded. */
const CAP = "M38 57 L38 21 Q38 15 44 15 L156 15 Q162 15 162 21 L162 57 Z";
