import type { WorldId } from "@/config/worlds";
import { products } from "@/data/catalog";

import { NO_MEDIA, productMedia } from ".";

import type { ProductMedia } from "./types";

/**
 * The media of the product a world depicts.
 *
 * SEPARATE FROM `./index` ON PURPOSE. This is the only media resolver that
 * needs the product registry, and `./index` is imported by client components —
 * so keeping the two together shipped the entire catalogue to the browser.
 * Only server code (the homepage's Experience sections) calls this.
 *
 * Resolved through the registry rather than a second world-to-slug table, so
 * there is nothing to keep in sync: a world with no product, or a product that
 * loses its world, resolves to no media instead of to a stale path.
 */
export function mediaForWorld(world: WorldId): ProductMedia {
  const product = products.find((item) => item.world === world);
  return product ? productMedia(product.slug) : NO_MEDIA;
}
