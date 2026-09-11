import Image from "next/image";

import { Mono } from "@/components/typography";
import { SpecimenPlate } from "@/components/ui";
import { PLATE_SIZES, stillMedia } from "@/content/media";

import styles from "./ProductPlate.module.css";

import type { ReactNode } from "react";
import type { DiscoveryAreaId } from "@/data/discovery";

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
 * MEDIA IS RESOLVED BY SLUG, THROUGH THE SAME CALL THE CARD MAKES.
 * ----------------------------------------------------------------
 * The plate previously looked media up by WORLD. Every product that reaches
 * this component has `world === null` by construction — the three that have one
 * open in `ProductStage` — so that lookup could only ever return null, and the
 * 80 products this template serves had no route to a photograph at all.
 *
 * Now `stillMedia(slug)` answers, and it is the same function
 * `ProductCard` calls. A product cannot show a photograph in the catalogue and
 * a diagram on the page it links to.
 *
 * The frame is a fixed 4:5 in both branches, so gaining a photograph changes
 * what is inside the box and never the box.
 */
export function ProductPlate({
  slug,
  name,
  areaId,
  presentations,
  annotation,
  mediaLabel,
  meta,
  children,
}: {
  /** Product identity — the key its media is registered under. */
  slug: string;
  /** The compound's name, set as the plate's ghosted type. */
  name: string;
  /** Primary discovery area, for the plate's tone. */
  areaId: DiscoveryAreaId | null;
  /** How many presentations, for the plate's datum lines. */
  presentations: number;
  /** The presentation range, as the plate's technical annotation. */
  annotation?: string;
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
  const still = stillMedia(slug);

  return (
    <div className={styles.plate}>
      <div className={styles.media}>
        {/*
         * The specimen plate brings its own frame, ground and registration
         * marks, so in that branch this element carries none of its own —
         * otherwise every border and corner mark is drawn twice, one pixel
         * apart.
         */}
        <div className={styles.frame} data-chrome={still.kind === "image" ? "frame" : "none"}>
          {still.kind === "image" ? (
            <Image
              src={still.image.src}
              alt={still.image.alt}
              width={still.image.width}
              height={still.image.height}
              className={styles.photo}
              sizes={PLATE_SIZES}
              /* The plate is this page's largest contentful paint and sits
                 above the fold, so it is the one image on the site that earns
                 `priority`. Cards never do. */
              priority
            />
          ) : (
            /*
             * The SAME specimen plate the card shows, at plate scale.
             *
             * This frame used to hold a bare silhouette on a flat ground: the
             * one product page treatment that had no tone, no identity and
             * nothing of the compound in it, on the 83 products that need the
             * most help. A customer arriving from a composed card met a
             * blank box. It is now the card's plate, larger — so the media a
             * product shows in the catalogue and the media it shows on its own
             * page are the same object.
             */
            <SpecimenPlate
              areaId={areaId}
              world={null}
              name={name}
              presentations={presentations}
              annotation={annotation}
              size="plate"
            />
          )}
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
