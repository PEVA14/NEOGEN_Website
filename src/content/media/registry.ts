import type { ProductMedia } from "./types";

/**
 * THE MEDIA REGISTRY — every declared asset, keyed by product slug.
 *
 * A file in `public/` does nothing until it is named here. That indirection is
 * the point: it keeps alt text mandatory, keeps intrinsic dimensions next to
 * the path where a validator can check both, and means one entry lights a
 * product up across the card, the product page and its social card at once.
 *
 * SPARSE ON PURPOSE. A product with no entry is not an error and not a gap in
 * the data — it is a product that has not been photographed. `productMedia()`
 * fills in the empty shape, so no component has to know the difference.
 *
 * See `public/images/README.md` for where the files go.
 */
export const MEDIA: Readonly<Record<string, Partial<ProductMedia>>> = {
  /*
   * RETA — the only product with a 3D asset.
   *
   * The GLB is real and shipping. There is no photograph and no rendered
   * poster, so the viewer falls back to the diagrammatic silhouette while it
   * loads and for anyone who cannot run WebGL.
   *
   * TODO(assets): capture `poster.jpg` from the live scene once its lighting
   * is signed off. A poster that disagrees with the canvas is worse than none,
   * which is why this is null rather than a rough render.
   */
  reta: {
    model: "/models/reta.glb",
    /*
     * THE STUDIO STILL (prototype, 2026-09-18, awaiting owner approval).
     *
     * The real GLB — its geometry and its own RETA label — rendered by the
     * studio rig (`components/experience/studio/rig.ts`, RETA_RIG) and captured
     * at 1600×2000 from `/es/estudio/reta`. A render, not a photograph: it is
     * the catalogue card's image and never the product's `primary`.
     */
    studio: {
      src: "/images/products/reta/studio.jpg",
      alt: "Vial RETA de NEOGEN: render de estudio del modelo 3D, etiqueta al frente, sobre fondo azul oscuro.",
      width: 1600,
      height: 2000,
    },
  },

  /*
   * SEMAGLUTIDE — the NEUTRAL studio prototype (2026-09-18, awaiting owner
   * approval; not yet propagated).
   *
   * No model of its own: it ships in the canonical NEOGEN container, whose
   * real geometry is `reta.glb` (owner, 2026-09-18). Rendered by NEUTRAL_RIG
   * with a label drawn from its registry name and presentation range in the
   * real RETA label's layout (`components/experience/studio/label.ts`).
   */
  semaglutide: {
    studio: {
      src: "/images/products/semaglutide/studio.jpg",
      alt: "Vial de Semaglutide de NEOGEN: render de estudio del envase NEOGEN, etiqueta al frente, sobre fondo neutro.",
      width: 1600,
      height: 2000,
    },
  },

  /*
   * GLOW and GHK-Cu have no entry at all, and that is the correct
   * configuration rather than an omission.
   *
   * Neither has a GLB and neither has photography. Their product pages open in
   * the full Experience environment — amber light for GLOW, copper strata for
   * GHK-Cu — which is a deliberate world fallback, not a missing image. The
   * environment carries the identity; inventing a render to fill the frame
   * would be manufacturing product imagery.
   */
};
