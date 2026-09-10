import { Mono } from "@/components/typography";
import { VialSilhouette } from "@/components/ui/VialSilhouette";

import styles from "./SpecimenPlate.module.css";

import type { DiscoveryAreaId } from "@/data/discovery";
import type { WorldId } from "@/config/worlds";

/**
 * THE DELIBERATE FALLBACK.
 *
 * No product photography exists, and one identical grey silhouette repeated 85
 * times made the catalogue read as a single product shot 85 times over — the
 * single biggest reason the site did not look like a shop.
 *
 * This is the same honest diagram, presented as a CATALOGUED SPECIMEN: an
 * area-toned ground, registration marks, a fill datum, and a technical
 * annotation. It looks composed rather than missing.
 *
 * EVERY VARIATION COMES FROM REAL DATA. Nothing here is random and nothing is
 * invented:
 *
 *   - the ground and silhouette tone come from the product's DISCOVERY AREA
 *     (or its world, which outranks it) — see `styles/areas.css`;
 *   - the number of datum lines is its number of PRESENTATIONS;
 *   - the annotation is its presentation count and area code.
 *
 * So two products look different exactly when they ARE different. A photograph
 * replaces this entirely — `stillMedia` picks the image and this never renders.
 */
export function SpecimenPlate({
  areaId,
  world,
  presentations,
  index,
  annotation,
  size = "card",
}: {
  /** Primary discovery area, for tone. Null for the two unassigned products. */
  areaId: DiscoveryAreaId | null;
  /** A world outranks an area — the three flagships have authored colour. */
  world: WorldId | null;
  /** How many presentations this product is sold in. Drives the datum lines. */
  presentations: number;
  /** Catalogue index, shown as a corner mark where one is meaningful. */
  index?: string;
  /** Short technical line — presentation count, area code. */
  annotation?: string;
  size?: "card" | "plate";
}) {
  /*
   * Capped at five. Beyond that the lines stop reading as a count and start
   * reading as texture, and RETA has seven.
   */
  const datums = Math.max(1, Math.min(5, presentations));

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
