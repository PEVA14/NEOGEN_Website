import { getImageProps } from "next/image";

import { PLATE_SIZES } from "@/content/media";

import { scaleSizes, STAGE_SPECIMEN_SIZES } from "./SpecimenLayers";
import { specimenFor } from "./specimens";

const warmed = new Set<string>();

/**
 * WARM THE DESTINATION'S PICTURES ON INTENT.
 *
 * React holds a view transition until the images in the NEW state have loaded
 * — up to 500ms (react-dom's SUSPENSEY_FONT_AND_IMAGE_TIMEOUT) — so that it
 * never animates into a blank box. Measured on the spike, that wait was the
 * whole gap between the click and the first frame of movement: 0.5–0.8s of a
 * card that seemed not to have heard the click.
 *
 * So the pictures the product page will ask for are fetched while the pointer
 * settles on the card (or it takes focus, or a finger lands): the same URL,
 * `srcset` and `sizes` the page will use, via `getImageProps`, so the browser
 * picks the same candidate and the page finds it in the cache.
 */
export function warmDestination(slug: string, flagship: boolean): void {
  if (warmed.has(slug)) return;
  const specimen = specimenFor(slug);
  if (!specimen) return;
  warmed.add(slug);

  const wanted = flagship
    ? [{ src: specimen.specimen, sizes: STAGE_SPECIMEN_SIZES }]
    : [
        { src: specimen.ground, sizes: PLATE_SIZES },
        { src: specimen.specimen, sizes: scaleSizes(PLATE_SIZES, specimen.box.w) },
      ];

  for (const { src, sizes } of wanted) {
    const { props } = getImageProps({ src, alt: "", fill: true, sizes });
    const image = new Image();
    if (props.sizes) image.sizes = props.sizes;
    if (props.srcSet) image.srcset = props.srcSet;
    image.src = props.src;
  }
}
