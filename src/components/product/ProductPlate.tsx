import { Mono } from "@/components/typography";
import { VialSilhouette } from "@/components/ui";
import { productMedia } from "@/content";
import type { WorldId } from "@/config/worlds";

import styles from "./ProductPlate.module.css";

import type { ReactNode } from "react";

/**
 * THE GENERIC PRODUCT OPENING — for the ~83 products without a world.
 *
 * The flagships get `ProductStage`: a full Experience environment with a live
 * 3D viewer. That treatment costs a GLB, an art direction and a WebGL context,
 * and it exists for three products. Everything else opens here.
 *
 * Same information architecture — media left, commerce right, then the Quiet
 * spine below — but Quiet Mode throughout and static media. This is the
 * `neogen-pdp-v1` reference rather than `neogen-reta-flagship-pdp-v1`, and the
 * difference is deliberate: a catalogue of 86 products cannot afford, and does
 * not need, 86 bespoke environments.
 *
 * No photography exists yet, so the plate shows the diagrammatic silhouette.
 * `content/media` is the seam — one entry there turns this into a real image
 * and a thumbnail strip without touching this component's callers.
 */
export function ProductPlate({
  world,
  mediaLabel,
  children,
}: {
  /** Present only where a product has one; drives the plate's tint. */
  world: WorldId | null;
  mediaLabel: string;
  children: ReactNode;
}) {
  const image = world ? productMedia(world).card : null;

  return (
    <div className={styles.plate}>
      <div className={styles.media}>
        <div className={styles.frame}>
          {image ? null : <VialSilhouette className={styles.silhouette} />}
        </div>
        <div className={styles.caption}>
          <Mono size="2xs" className={styles.captionLabel}>
            {mediaLabel}
          </Mono>
        </div>
      </div>

      <div className={styles.commerce}>{children}</div>
    </div>
  );
}
