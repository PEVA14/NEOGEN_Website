import { Mono } from "@/components/typography";
import { VialSilhouette } from "@/components/ui";

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
 *
 * THE SEAM FOR REAL PHOTOGRAPHY IS `content/media`, AND IT IS NOT WIRED HERE.
 * ---------------------------------------------------------------------------
 * This component used to take a `world` and look an image up by it. Every
 * product that reaches this component has `world === null` by construction —
 * the three that have one open in `ProductStage` instead — so the lookup could
 * only ever return null and the image branch was unreachable. Worse, it aimed
 * the seam at the wrong key: photography will arrive per PRODUCT, not per
 * world, so `content/media` has to be keyed by slug before anything can be
 * wired through it. Removing the dead branch leaves that decision visible
 * instead of appearing to have been made.
 */
export function ProductPlate({
  mediaLabel,
  meta,
  children,
}: {
  mediaLabel: string;
  /**
   * The right-hand end of the caption rail — the compound's catalogue
   * classification. The rail is a two-column rule (the flagship plate puts the
   * cursor hint there), and with a single item it read as a stray label rather
   * than as a specimen caption.
   */
  meta: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.plate}>
      <div className={styles.media}>
        <div className={styles.frame}>
          <VialSilhouette className={styles.silhouette} />
        </div>
        <div className={styles.caption}>
          <Mono size="2xs" className={styles.captionLabel}>
            {mediaLabel}
          </Mono>
          <Mono size="2xs" className={styles.captionMeta}>
            {meta}
          </Mono>
        </div>
      </div>

      <div className={styles.commerce}>{children}</div>
    </div>
  );
}
