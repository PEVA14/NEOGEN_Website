/**
 * THE PRODUCT MEDIA MODEL.
 *
 * Media is a CONTENT layer, deliberately separate from `src/data/catalog`.
 * The catalogue says what a product is; this says what it looks like. They
 * have different lifecycles — a product's identity is reviewed in a pull
 * request, while a photograph arrives whenever the shoot happens — and merging
 * them would mean regenerating the supplier-derived registry every time an
 * image lands.
 *
 * The join is the product SLUG, which is the same key the URL, the sitemap and
 * the commerce layer already use.
 */

/**
 * One image file.
 *
 * `width`/`height` are the file's INTRINSIC pixel dimensions, not a display
 * size. They are required because `next/image` uses them to reserve the box
 * before the bytes arrive; without them every image on the page is a layout
 * shift. `scripts/check-media.mjs` reads them back off the real file, so a
 * mistyped dimension is caught rather than shipped as a jump.
 */
export interface ProductImage {
  /** Path under `public/`, beginning with a slash. */
  src: string;
  /**
   * REQUIRED, never optional.
   *
   * A decorative image must say so with `alt: ""` — explicitly, so the choice
   * is visible in review. A missing alt attribute and a deliberate empty one
   * look identical to a validator but not to a screen reader.
   */
  alt: string;
  width: number;
  height: number;
}

/**
 * Everything that can exist for one product. Every field is nullable and every
 * field is currently null: no product photography exists.
 *
 * WHAT IS NOT HERE, AND WHY. No crop box, no focal point, no art direction per
 * breakpoint. Every frame in the system is a fixed 4:5 plate and the images
 * cover it, so a focal point would be a field with nothing reading it. It can
 * be added when a real photograph is genuinely off-centre in the frame —
 * which is a thing to observe, not to predict.
 */
export interface ProductMedia {
  /**
   * The lead image: the catalogue card, the PDP plate, and the social card.
   * If a product has exactly one photograph, this is it.
   */
  primary: ProductImage | null;
  /** Further angles of the same object, in display order. */
  alternates: readonly ProductImage[];
  /** Label or macro detail — the closest read on the product itself. */
  detail: ProductImage | null;
  /** The product as it ships. A different subject from `primary`. */
  packaging: ProductImage | null;
  /**
   * A rendered still of the 3D scene.
   *
   * Only meaningful alongside `model`: it is what paints while the GLB is in
   * flight, and what stands in for anyone without WebGL or with reduced
   * motion. NOT a substitute for `primary` — a viewport render is not
   * photography.
   */
  poster: ProductImage | null;
  /**
   * Path to a lightweight `.glb` under `public/models/`.
   *
   * This used to live in `config/worlds.ts`, which made a 3D asset a property
   * of an art direction rather than of a product. A model belongs to the thing
   * it depicts: it is media, and it is keyed by slug like every other asset
   * here. A world can then exist without one, which is exactly the case for
   * GLOW and GHK-Cu.
   */
  model: string | null;
}
