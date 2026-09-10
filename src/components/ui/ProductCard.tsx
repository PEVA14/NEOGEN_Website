"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { Mono } from "@/components/typography";
import { SpecimenPlate } from "@/components/ui/SpecimenPlate";
import { WorldDot } from "@/components/ui/WorldDot";
import { CARD_SIZES, productMedia, stillMedia } from "@/content/media";

import styles from "./ProductCard.module.css";

import type { WorldId } from "@/config/worlds";
import type { DiscoveryAreaId } from "@/data/discovery";

export interface ProductCardProps {
  /** Identity key: the link, the media lookup and the plate all read it. */
  slug: string;
  /** The Experience world, for the three flagships. Null for the other 82. */
  world: WorldId | null;
  /** Short world character label — "PRECISIÓN". Only where a world exists. */
  worldLabel?: string;
  /** Primary discovery area — drives the plate's tone. */
  areaId?: DiscoveryAreaId | null;
  /** Area or category name, above the product name. */
  eyebrow?: string;
  name: string;
  /** Alternative designation, under the name. */
  subtitle?: string | null;
  href: string;
  /** Formatted "from" price. Null where none is set — the line is then absent. */
  price?: string | null;
  /** Localized "from" qualifier, e.g. "Desde". Only shown with a price. */
  priceFrom?: string;
  /** Dose ladder summary — "5 mg – 60 mg". */
  presentationRange?: string | null;
  /** How many presentations, for the plate's datum lines. */
  presentations?: number;
  /** Catalogue index, shown as the plate's corner mark. */
  index?: string;
  ctaLabel: string;
  headingLevel?: 2 | 3;
}

/**
 * THE PRODUCT CARD — one shared architecture, no bespoke card per flagship.
 *
 * WHAT CHANGED, AND WHY IT MATTERS COMMERCIALLY.
 * ---------------------------------------------
 * The previous card was a database row with a picture of nothing on top: an
 * identical grey silhouette, a name, and a price in muted body text. Repeated
 * 85 times it made a real catalogue look like one product photographed
 * repeatedly, and nothing on it gave a reason to open one card over another.
 *
 * Three changes, all fed by data the registry already holds:
 *
 *   1. THE MEDIA IS A SPECIMEN PLATE toned by the product's discovery area,
 *      with one datum line per presentation. Two products now look different
 *      exactly when they ARE different.
 *   2. THE PRESENTATION RANGE is on the card. "5 mg – 60 mg" is a reason to
 *      click; a bare name is not.
 *   3. PRICE IS PROMINENT — mono, at the card's largest non-heading size,
 *      against the name rather than buried beneath it.
 *
 * The world still never restyles the card: it appears in the plate and in the
 * identifier dot, exactly as SYSTEM STATUS V1 requires. The CTA stays charcoal
 * for every product, because three coloured buttons in one row is the failure
 * the system exists to prevent.
 */
export function ProductCard({
  slug,
  world,
  worldLabel,
  areaId = null,
  eyebrow,
  name,
  subtitle,
  href,
  price,
  priceFrom,
  presentationRange,
  presentations = 1,
  index,
  ctaLabel,
  headingLevel = 3,
}: ProductCardProps) {
  const warmed = useRef(false);
  const still = stillMedia(slug);
  const Heading = `h${headingLevel}` as "h2" | "h3";

  /*
   * WARM THE DESTINATION ON INTENT. A pointer settling on a card, or the CTA
   * taking focus, is a strong enough signal to start paying for the product
   * page: the 3D chunk and the GLB are both expensive, and doing that work at
   * CLICK time made the opening share a frame budget with a GLB parse.
   *
   * Skipped on metered connections, and only for the one product that has a
   * model — there is no point fetching a viewer for a page that has none.
   */
  const warm = () => {
    if (warmed.current) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (connection?.saveData) return;

    const model = productMedia(slug).model;
    if (!model) return;

    warmed.current = true;
    void import("@/components/experience/RetaCanvas");
    void import("@/components/experience/preloadVial").then((m) => m.preloadVial(model));
  };

  return (
    <article className={styles.card} onPointerEnter={warm}>
      {/*
       * The whole card is the target, with the CTA as the visible affordance.
       * One link rather than several: a card with a linked image, a linked
       * name and a linked button is three tab stops to reach one destination.
       */}
      <Link href={href} className={styles.link} onFocus={warm}>
        <span className={styles.media}>
          {still.kind === "image" ? (
            <Image
              src={still.image.src}
              alt={still.image.alt}
              width={still.image.width}
              height={still.image.height}
              className={styles.photo}
              sizes={CARD_SIZES}
              loading="lazy"
            />
          ) : (
            <SpecimenPlate
              areaId={areaId}
              world={world}
              presentations={presentations}
              index={index}
              annotation={presentationRange ?? undefined}
            />
          )}
        </span>

        <span className={styles.body}>
          {world && worldLabel ? (
            <WorldDot world={world}>{worldLabel}</WorldDot>
          ) : eyebrow ? (
            <Mono size="2xs" className={styles.eyebrow}>
              {eyebrow}
            </Mono>
          ) : null}

          <Heading className={styles.name}>{name}</Heading>

          {subtitle ? (
            <Mono size="2xs" className={styles.subtitle}>
              {subtitle}
            </Mono>
          ) : null}

          <span className={styles.spacer} />

          {/* The commercial line: range on the left, price on the right, on
              one baseline above the action. */}
          <span className={styles.commerce}>
            {presentationRange ? (
              <Mono size="2xs" className={styles.range}>
                {presentationRange}
              </Mono>
            ) : (
              <span />
            )}
            {price ? (
              <span className={styles.price}>
                {priceFrom ? <span className={styles.priceFrom}>{priceFrom} </span> : null}
                {price}
              </span>
            ) : null}
          </span>
        </span>

        <span className={styles.cta}>{ctaLabel}</span>
      </Link>
    </article>
  );
}
