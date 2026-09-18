import Image from "next/image";

import { Mono } from "@/components/typography";
import { SpecimenPlate } from "@/components/ui/SpecimenPlate";
import type { WorldId } from "@/config/worlds";
import type { ProductImage } from "@/content/media";

import styles from "./RetaExperience.module.css";

interface VialFallbackProps {
  /**
   * The rendered still, from `content/media`. Null until one is captured.
   *
   * The whole asset rather than a bare path: alt text and intrinsic dimensions
   * travel with the file that needs them, so a poster cannot be added without
   * both.
   */
  poster: ProductImage | null;
  /**
   * Accessible name for the DIAGRAM drawn when there is no poster. A poster
   * carries its own alt; a drawing has none to carry.
   */
  diagramLabel: string;
  /** Status caption — "loading model" or "static view". */
  label: string;
  /** True while the GLB is in flight, false for a settled fallback. */
  loading?: boolean;
  /** Whose object to draw. Defaults to RETA, the one world with a model. */
  world?: WorldId;
  /** The name printed on its label. */
  name?: string;
  /**
   * Stand the object upright. RETA's fallback leans to match the 3D model's
   * resting pose; a world with no model has no pose to match.
   */
  upright?: boolean;
}

/**
 * The single static representation of the vial, used for THREE cases:
 *
 *   1. the GLB is still loading,
 *   2. the user prefers reduced motion,
 *   3. WebGL is unavailable.
 *
 * They deliberately share one component. MVP_SCOPE requires "basic
 * loading/error/fallback states for 3D", and a user who never gets the canvas
 * must still get the product — not an empty frame.
 *
 * Server-renderable: no hooks, no client boundary. That is what lets it paint
 * before any 3D JavaScript has been fetched.
 */
export function VialFallback({
  poster,
  diagramLabel,
  label,
  loading = false,
  world = "reta",
  name = "RETA",
  upright = false,
}: VialFallbackProps) {
  return (
    <div className={styles.fallback} data-loading={loading ? "true" : undefined}>
      {poster ? (
        <Image
          src={poster.src}
          alt={poster.alt}
          className={styles.poster}
          // Intrinsic dimensions from the registry, not assumed. They were
          // hardcoded 1200x1600 here, so any poster of another shape would
          // have reserved the wrong box and shifted the page on load.
          width={poster.width}
          height={poster.height}
          // The poster IS the largest contentful paint whenever 3D does not
          // run, so it must not be lazy.
          priority
        />
      ) : (
        /* No poster asset exists yet. RETA's own product object stands in —
           the same packaging drawing the catalogue uses, in RETA's palette —
           so a visitor without WebGL still meets the product, not a diagram.
           TODO(assets): capture a still from the GLB and declare it as `poster`. */
        <div
          className={styles.silhouette}
          data-upright={upright ? "true" : undefined}
          role="img"
          aria-label={diagramLabel}
        >
          <SpecimenPlate areaId={null} world={world} name={name} size="stage" bare />
        </div>
      )}

      {/* The caption only while the model is loading: a settled static view is
          simply the product, and needs no label saying so. */}
      {loading ? (
        <Mono size="2xs" className={styles.fallbackLabel}>
          {label}
        </Mono>
      ) : null}
    </div>
  );
}
