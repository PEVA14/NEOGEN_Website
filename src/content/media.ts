import type { WorldId } from "@/config/worlds";

/**
 * PRODUCT MEDIA — the seam real photography lands in.
 *
 * Today every entry is `null`, and that is the honest state: no product
 * photography exists. What matters is that the ABSENCE is declared in one
 * place, so components branch on data rather than each hardcoding a fallback.
 *
 * Before this, dropping a photo into `public/images/products/` did nothing at
 * all — the product card rendered a hardcoded silhouette and no component could
 * consume an image. Adding one is now a single entry here.
 *
 * ALT TEXT IS NON-OPTIONAL, by the rule in `public/images/README.md`. A
 * decorative image must say so with `alt: ""`, never by omission.
 *
 * `width`/`height` are the file's INTRINSIC pixel dimensions, required so
 * `next/image` can reserve space and avoid layout shift. They are not a
 * display size.
 */
export interface ProductImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

interface ProductMedia {
  /**
   * The catalogue and card image. Null → the diagrammatic silhouette, which is
   * honest about being a placeholder rather than impersonating a photograph.
   */
  card: ProductImage | null;
  /**
   * Rendered still of the 3D scene, for the loading state and for anyone
   * without WebGL or with reduced motion. Null → the silhouette again.
   *
   * TODO(assets): capture from the live scene once its lighting is signed off —
   * a poster that disagrees with the canvas is worse than none.
   */
  poster: ProductImage | null;
}

const MEDIA: Record<WorldId, ProductMedia> = {
  reta: { card: null, poster: null },
  glow: { card: null, poster: null },
  "ghk-cu": { card: null, poster: null },
};

export function productMedia(world: WorldId): ProductMedia {
  return MEDIA[world];
}
