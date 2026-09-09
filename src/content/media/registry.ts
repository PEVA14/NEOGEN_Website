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
