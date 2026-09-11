import { Mono } from "@/components/typography";
import { VialSilhouette } from "@/components/ui/VialSilhouette";

import styles from "./SpecimenPlate.module.css";

import type { CSSProperties } from "react";
import type { DiscoveryAreaId } from "@/data/discovery";
import type { WorldId } from "@/config/worlds";

export type PlateSize = "card" | "plate" | "feature";

/**
 * THE DELIBERATE FALLBACK — a composed specimen, not a missing photograph.
 *
 * PHASE 12. The previous plate was an outlined vial centred on a near-white
 * ground with four hairlines. Honest, but at card scale it read as a wireframe
 * of a card rather than as a card: an empty box with a drawing in it, 85 times.
 * The failure was not the diagram — it was that nothing in the frame belonged
 * to THIS compound, so every plate was the same plate.
 *
 * THE NAME IS NOW THE ARTWORK. The compound's own name is set oversized,
 * condensed and cropped by the frame, with the silhouette passing in front of
 * it. That is the Hero's composition — wordmark behind, object in front —
 * brought down to product scale, so the catalogue is unmistakably the same
 * system as the front door. And because every compound's name is different,
 * every plate is different: the variation is the data, not a random seed.
 *
 * EVERYTHING STILL COMES FROM REAL DATA. Nothing is invented:
 *
 *   - the ground, hairline and ink come from the product's DISCOVERY AREA
 *     (or its world, which outranks it) — see `styles/areas.css`;
 *   - the ghosted name is the product's registry name;
 *   - the number of datum lines is its number of PRESENTATIONS;
 *   - the annotation is its presentation range.
 *
 * A photograph replaces this entirely — `stillMedia` picks the image and this
 * never renders. Nothing here is photographic, so it cannot be mistaken for
 * a product shot (see the social-card note in `content/media`).
 */
export function SpecimenPlate({
  areaId,
  world,
  name,
  presentations,
  index,
  annotation,
  size = "card",
}: {
  /** Primary discovery area, for tone. Null for the two unassigned products. */
  areaId: DiscoveryAreaId | null;
  /** A world outranks an area — the three flagships have authored colour. */
  world: WorldId | null;
  /**
   * The compound's name, set as the ghosted plate type.
   *
   * Decorative and `aria-hidden`: every surface that renders a plate also
   * renders the name as real text beside it, and a screen reader announcing
   * "Semaglutide Semaglutide" is worse than no plate at all.
   */
  name?: string;
  /** How many presentations this product is sold in. Drives the datum lines. */
  presentations: number;
  /** Catalogue index, shown as a corner mark where one is meaningful. */
  index?: string;
  /** Short technical line — the presentation range. */
  annotation?: string;
  size?: PlateSize;
}) {
  /*
   * Capped at five. Beyond that the lines stop reading as a count and start
   * reading as texture, and RETA has seven.
   */
  const datums = Math.max(1, Math.min(5, presentations));

  /*
   * THE NAME IS SIZED FROM ITS OWN LENGTH, so every plate crops the same
   * amount whatever the compound is called.
   *
   * At one fixed size "GLOW" floated in the middle of the frame while
   * "Retatrutide Research" showed four letters. The type is set to span about
   * 135% of the plate — cropped, deliberately — and the condensed display face
   * averages ~0.55em per uppercase character, so the size that achieves it is
   * 135 / (length × 0.55) ≈ 245 / length, in container-inline units. Clamped
   * at both ends: below 10 it stops reading as a poster, above 34 a short name
   * loses its own last letter.
   */
  const nameSize = name ? Math.max(10, Math.min(34, Math.round(245 / name.length))) : 0;

  return (
    <div
      className={styles.plate}
      data-size={size}
      data-area={world ? undefined : (areaId ?? undefined)}
      data-world={world ?? undefined}
    >
      {/* The ground. Area-toned, and the only place a category's colour
          appears at product scale. */}
      <div className={styles.ground} aria-hidden="true" />

      {/*
       * The compound name, behind everything. Cropped by both edges on
       * purpose — it is a graphic, not a label to be read, and letting it run
       * off the frame is what makes the plate read as a crop of something
       * larger rather than a centred logo.
       */}
      {name ? (
        <div className={styles.nameLayer} aria-hidden="true">
          <span
            className={styles.name}
            style={{ "--plate-name-size": `${nameSize}cqi` } as CSSProperties}
          >
            {name}
          </span>
        </div>
      ) : null}

      {/* Datum lines — one per presentation, rising from the base like a
          graduated cylinder's marks. */}
      <div className={styles.datums} aria-hidden="true">
        {Array.from({ length: datums }, (_, i) => (
          <span key={i} className={styles.datum} style={{ bottom: `${18 + i * 9}%` }} />
        ))}
      </div>

      <VialSilhouette className={styles.silhouette} />

      {index ? (
        <Mono size="2xs" className={styles.index}>
          {index}
        </Mono>
      ) : null}

      {annotation ? (
        <Mono size="2xs" className={styles.annotation}>
          {annotation}
        </Mono>
      ) : null}
    </div>
  );
}
