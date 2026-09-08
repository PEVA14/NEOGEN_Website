import Image from "next/image";

import { Mono } from "@/components/typography";
import { VialSilhouette } from "@/components/ui/VialSilhouette";

import styles from "./RetaExperience.module.css";

interface VialFallbackProps {
  /** Rendered still of the model. Null until a poster exists. */
  posterPath: string | null;
  /** Alt text for the poster. Required by the type system — never optional. */
  posterAlt: string;
  /** Shown while the 3D layer is still loading. */
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
export function VialFallback({ posterPath, posterAlt, label, loading = false }: VialFallbackProps) {
  return (
    <div className={styles.fallback} data-loading={loading ? "true" : undefined}>
      {posterPath ? (
        <Image
          src={posterPath}
          alt={posterAlt}
          className={styles.poster}
          width={1200}
          height={1600}
          // The poster IS the largest contentful paint whenever 3D does not
          // run, so it must not be lazy.
          priority
        />
      ) : (
        /* No poster asset exists yet. A diagrammatic silhouette drawn from
           the model's real proportions stands in — honest about being a
           placeholder rather than impersonating product photography.
           TODO(assets): replace with a rendered still via posterPath. */
        <VialSilhouette label={posterAlt} className={styles.silhouette} />
      )}

      <Mono size="2xs" className={styles.fallbackLabel}>
        {label}
      </Mono>
    </div>
  );
}
