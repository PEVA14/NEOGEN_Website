"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState } from "react";

import { Mono } from "@/components/typography";
import { SpecimenPlate } from "@/components/ui/SpecimenPlate";
import { WorldDot } from "@/components/ui/WorldDot";
import { CARD_SIZES, productMedia, stillMedia } from "@/content/media";

import styles from "./ProductCard.module.css";

import type { WorldId } from "@/config/worlds";
import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * THREE FORMATS, ONE ARCHITECTURE.
 *
 *   standard  the grid card. 4:5 plate over the commercial block.
 *   feature   the wide card: a 5:4 plate beside the block on a wide screen,
 *             for the one product a composition is led by. Stacks below 64rem.
 *   flagship  the dark card — the world's own ground, for RETA, GLOW and
 *             GHK-Cu. The action stays neutral (paper on a dark card) exactly
 *             as it stays charcoal on a light one: CONVENTIONS §11.
 *
 * The card is never restyled BY the product beyond this: there is no bespoke
 * per-compound card, and the format is chosen by the composition that renders
 * it, not by the product's own record.
 */
export type ProductCardFormat = "standard" | "feature" | "flagship";

/**
 * What a card reveals beyond its face. Built on the server by
 * `server/catalog#cardDetails`; every field is a registry fact, already
 * formatted. See that builder for the priority order.
 */
export interface CardDetails {
  /** Approved overview summary. Null for every product today. */
  summary: string | null;
  /** Verbatim composition, where the source printed one and there is no summary. */
  composition: string | null;
  /** Every presentation, with its pack price where one is set. */
  ladder: readonly { label: string; price: string | null }[];
  /** "10 viales por empaque". */
  pack: string | null;
  /** Unit price of the cheapest pack — "$390 por vial". */
  perVial: string | null;
  /** Product type label — "Compuesto". */
  type: string | null;
  /** Short names of every public area the product is filed under. */
  areas: readonly string[];
}

export interface CardDetailsCopy {
  /** "Ver detalles de {name}" — the touch toggle's accessible name. */
  open: string;
  close: string;
  presentations: string;
  composition: string;
}

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
  /** Composition role. See `ProductCardFormat`. */
  format?: ProductCardFormat;
  /** The reveal. Absent → the card is exactly its face, as before. */
  details?: CardDetails;
  detailsCopy?: CardDetailsCopy;
  /**
   * "store": the /productos storefront card — a softened product surface, the
   * price as the commercial line's headline and a compact square action in
   * place of the full-width bar. Everywhere else keeps the default card until
   * the owner has reviewed the storefront.
   */
  variant?: "default" | "store";
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
  format = "standard",
  details,
  detailsCopy,
  variant = "default",
}: ProductCardProps) {
  const warmed = useRef(false);
  const revealId = useId();
  const [open, setOpen] = useState(false);
  /* The feature card's plate changes shape at 64rem; the reveal is sized to the
     4:5 plate, so it belongs to the formats that always have one. */
  const reveals = Boolean(details && detailsCopy) && format !== "feature";
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
    <article
      className={styles.card}
      data-format={format}
      /* The dark card carries the world so `areas.css` can resolve its ground,
         its hairlines and its ink from one attribute — the same mechanism the
         plate uses, rather than a second palette for cards. */
      data-world={format === "flagship" ? (world ?? undefined) : undefined}
      data-reveal={reveals ? (open ? "open" : "closed") : undefined}
      data-variant={variant === "store" ? "store" : undefined}
      onPointerEnter={warm}
    >
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
              name={name}
              presentations={presentations}
              /* A store shelf is not a numbered register. */
              index={variant === "store" ? undefined : index}
              annotation={presentationRange ?? undefined}
              size={format === "feature" ? "feature" : "card"}
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
            {variant === "store" ? (
              <span className={styles.go} aria-hidden="true">
                →
              </span>
            ) : null}
          </span>
        </span>

        <span className={styles.cta}>{ctaLabel}</span>
      </Link>

      {reveals && details && detailsCopy ? (
        <>
          {/* Toned like the plate it covers — the same `data-area` / `data-world`
              scope — so the record reads as the back of the specimen. */}
          <div
            className={styles.reveal}
            data-area={world ? undefined : (areaId ?? undefined)}
            data-world={world ?? undefined}
          >
            <CardReveal id={revealId} details={details} copy={detailsCopy} />
            {/*
             * THE TOUCH EQUIVALENT. Hover does not exist on a phone, so the
             * reveal has a button of its own: a sibling of the link, never
             * inside it (an interactive element in an anchor is invalid and
             * unreachable in a sensible order). Shown only where the primary
             * pointer is coarse — a mouse user gets the reveal on hover and a
             * keyboard user on focus, without a second tab stop per card.
             */}
            <button
              type="button"
              className={styles.revealToggle}
              aria-expanded={open}
              aria-controls={revealId}
              aria-label={(open ? detailsCopy.close : detailsCopy.open).replace("{name}", name)}
              onClick={() => setOpen((value) => !value)}
            >
              <span aria-hidden="true" />
            </button>
          </div>
        </>
      ) : null}
    </article>
  );
}

/**
 * THE REVEAL — laid over the plate, anchored to its foot.
 *
 * The plate is identity; the reveal is the record behind it. It rises over
 * the plate rather than replacing it, so the top of the specimen — the name
 * crop and the index mark — stays visible and the card never loses who it is.
 *
 * `pointer-events: none` throughout: a click anywhere on the revealed panel
 * still lands on the card's link underneath, so revealing never costs a click.
 * Density follows the data — a blend with a printed composition, a compound
 * with a seven-step ladder and a solvent with one volume all get the blocks
 * they have and nothing else.
 */
function CardReveal({
  id,
  details,
  copy,
}: {
  id: string;
  details: CardDetails;
  copy: CardDetailsCopy;
}) {
  /*
   * The ladder yields to the text above it, so the panel always fits the plate
   * at the narrowest grid width: five rows alone, four under a composition,
   * three under a summary. The rest fold into a count.
   */
  const cap = details.summary ? 3 : details.composition ? 4 : 5;
  const shown = details.ladder.slice(0, cap);
  const hidden = details.ladder.length - shown.length;
  const meta = [details.type, ...details.areas].filter(Boolean).join(" · ");

  return (
    <div id={id} className={styles.revealPanel}>
      <div className={styles.revealBody}>
        {details.summary ? <p className={styles.revealSummary}>{details.summary}</p> : null}

        {details.composition ? (
          <p className={styles.revealComposition}>
            <span className={styles.revealLabel}>{copy.composition}</span>
            {details.composition}
          </p>
        ) : null}

        <div className={styles.revealLadder}>
          <span className={styles.revealHead}>
            <span className={styles.revealLabel}>{copy.presentations}</span>
            {details.pack ? <span className={styles.revealLabel}>{details.pack}</span> : null}
          </span>
          <ul>
            {shown.map((row) => (
              <li key={row.label}>
                <span>{row.label}</span>
                {row.price ? (
                  <>
                    <span className={styles.revealLeader} aria-hidden="true" />
                    <span className={styles.revealPrice}>{row.price}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
          {hidden > 0 ? <span className={styles.revealMore}>+{hidden}</span> : null}
        </div>

        {details.perVial || meta ? (
          <p className={styles.revealMeta}>
            {details.perVial ? <span>{details.perVial}</span> : null}
            {meta ? <span>{meta}</span> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
