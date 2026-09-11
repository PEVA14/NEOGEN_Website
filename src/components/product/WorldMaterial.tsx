import styles from "./WorldMaterial.module.css";

import type { WorldId } from "@/config/worlds";

/**
 * THE FLAGSHIP MATERIAL — each world's environment, drawn into the media well.
 *
 * GLOW and GHK-Cu have no GLB and no photography, and inventing either is
 * off the table. What they DO have is an art direction the Design Bible states
 * precisely: GLOW is light, GHK-Cu is material. So their media frame gets that
 * — an environment study behind the diagrammatic silhouette — and never a
 * render of a vial that does not exist.
 *
 *   RETA    precision  — a graticule: measurement ticks along the frame and a
 *                        fine alignment grid. Instrumentation, not decoration.
 *   GLOW    light      — a luminous field: a bloom, a halo ring, caustic rules.
 *   GHK-Cu  material   — a core sample: copper, patina and oxide strata with
 *                        depth markers.
 *
 * `interior` is false for RETA when its live model is running, so the grid
 * never draws over the object; only the edge ticks remain.
 *
 * STATIC. Nothing here moves: the product page's opening is deliberately
 * complete on first paint (see ProductStage). Decorative, so aria-hidden — the
 * silhouette's own label carries the accessible name.
 */
export function WorldMaterial({ world, interior = true }: { world: WorldId; interior?: boolean }) {
  return (
    <div className={styles.material} data-world-material={world} aria-hidden="true">
      {world === "reta" ? (
        <>
          <span className={styles.ticks} data-edge="top" />
          <span className={styles.ticks} data-edge="left" />
          {interior ? <span className={styles.graticule} /> : null}
          {interior ? <span className={styles.crosshair} /> : null}
        </>
      ) : null}

      {world === "glow" && interior ? (
        <>
          <span className={styles.bloom} />
          <span className={styles.halo} />
          <span className={styles.caustics} />
        </>
      ) : null}

      {world === "ghk-cu" && interior ? (
        <>
          <span className={styles.core}>
            <span className={styles.stratum} data-layer="oxide" />
            <span className={styles.stratum} data-layer="copper" />
            <span className={styles.stratum} data-layer="patina" />
            <span className={styles.stratum} data-layer="deep" />
          </span>
          <span className={styles.depth} />
        </>
      ) : null}
    </div>
  );
}
