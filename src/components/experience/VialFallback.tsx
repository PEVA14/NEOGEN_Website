import Image from "next/image";

import { Mono } from "@/components/typography";
import { VialSilhouette } from "@/components/ui/VialSilhouette";
import type { ProductImage } from "@/content";

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
export function VialFallback({ poster, diagramLabel, label, loading = false }: VialFallbackProps) {
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
        /* No poster asset exists yet. A diagrammatic silhouette drawn from
           the model's real proportions stands in — honest about being a
           placeholder rather than impersonating product photography.
           TODO(assets): capture a still and declare it as `poster`. */
        <VialSilhouette label={diagramLabel} className={styles.silhouette} />
      )}

      <Mono size="2xs" className={styles.fallbackLabel}>
        {label}
      </Mono>
    </div>
  );
}
