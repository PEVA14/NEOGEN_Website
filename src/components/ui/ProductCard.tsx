"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { Body, Heading, Mono } from "@/components/typography";
import { VialSilhouette } from "@/components/ui/VialSilhouette";
import { WorldDot } from "@/components/ui/WorldDot";
import { getWorld, type WorldId } from "@/config/worlds";
import { productMedia } from "@/content";

interface ProductCardProps {
  /**
   * The product's Experience world, when it has one.
   *
   * Null for most of the catalogue: three products have a world, 83 do not.
   * A worldless card takes the neutral surface rather than borrowing someone
   * else's identity.
   */
  world: WorldId | null;
  /** Short world character label — "PRECISION". Only where a world exists. */
  worldLabel?: string;
  name: string;
  href: string;
  /** Category or compound line, above the name. */
  eyebrow?: string;
  /** Formatted retail price. Null where none is set — the line is then absent. */
  price?: string | null;
  ctaLabel: string;
  /**
   * Where the card's name sits in the page outline.
   *
   * `3` suits the homepage, where cards hang under a section's own `h2`. The
   * catalogue has no such section — its `h1` is the page title and the cards
   * are the content directly beneath it — so a `3` there skips a level and
   * breaks the outline. Set `2` in that case.
   */
  headingLevel?: 2 | 3;
}

/**
 * The single shared product card.
 *
 * SYSTEM STATUS V1: "One shared product-card architecture. No bespoke card
 * systems per flagship." So the world never restyles the card — it appears
 * only in the image area and in the identifier dot.
 *
 * THE CTA IS CHARCOAL, NOT THE WORLD COLOUR. The homepage mock shows coloured
 * ADD TO BAG buttons, but the rules sheet and the catalog screen both say
 * commerce stays neutral, and the rules sheet wins. Colour here would make
 * three different CTA colours on one row of cards — the exact "every CTA is
 * blue" failure the system exists to prevent.
 *
 * The button is a LINK to the product page, not an add-to-bag control: no cart
 * state exists yet, and a button that silently does nothing is worse than one
 * that goes somewhere real.
 *
 * Pointing at a card starts loading the product page's 3D viewer, so the click
 * lands on a warm cache rather than a cold one. See `experience/preloadVial.ts`.
 */
export function ProductCard({
  world,
  worldLabel,
  name,
  href,
  eyebrow,
  price,
  ctaLabel,
  headingLevel = 3,
}: ProductCardProps) {
  const warmed = useRef(false);
  const image = world ? productMedia(world).card : null;

  /*
   * WARM THE DESTINATION ON INTENT.
   *
   * A pointer settling on a card, or the CTA taking focus, is a strong enough
   * signal to start paying for the product page: the 3D chunk and the GLB are
   * both expensive, and doing that work at CLICK time meant the opening
   * animation shared a frame budget with a GLB parse and a shader compile.
   *
   * Skipped on metered connections, and only for worlds that actually have a
   * page to open — there is no point fetching a model for a card that links
   * back to the listing.
   */
  const warm = () => {
    if (warmed.current) return;

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    if (connection?.saveData) return;

    // Only the flagships have a 3D viewer worth warming.
    if (!world) return;
    const target = getWorld(world);
    if (!target.modelPath) return;

    warmed.current = true;
    void import("@/components/experience/RetaCanvas");
    void import("@/components/experience/preloadVial").then((module) =>
      module.preloadVial(target.modelPath as string),
    );
  };

  return (
    <article
      onPointerEnter={warm}
      className="flex flex-col border border-(--border-subtle) bg-(--surface-raised) p-(--space-sm)"
    >
      {/*
       * Image area — the one place product identity is allowed to take over.
       *
       * Reads `content/media`. With a photograph it shows the photograph; with
       * none it shows a diagrammatic silhouette and says so, which is honest
       * about being a placeholder rather than impersonating product imagery.
       * The label is dropped once a real image is in: "image pending" over an
       * actual photograph would be a lie the layout tells.
       */}
      <div
        data-world={world ?? undefined}
        data-atmosphere={world ? "true" : undefined}
        className="relative flex aspect-4/5 items-center justify-center overflow-hidden"
      >
        {image ? (
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className="size-full object-cover"
            sizes="(min-width: 48rem) 33vw, 100vw"
          />
        ) : (
          /* No caption. The silhouette is already visibly diagrammatic; a label
             announcing that the image is pending only advertises what is
             missing on a page that is otherwise finished. */
          <VialSilhouette
            className={
              world ? "h-[62%] w-auto text-(--world-light)" : "h-[62%] w-auto text-(--ink-muted)"
            }
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-(--space-2xs) pt-(--space-md)">
        {world && worldLabel ? (
          <WorldDot world={world}>{worldLabel}</WorldDot>
        ) : eyebrow ? (
          <Mono size="2xs" className="tracking-(--tracking-label) text-(--ink-muted) uppercase">
            {eyebrow}
          </Mono>
        ) : null}

        <Heading level={headingLevel} size="lg">
          {name}
        </Heading>

        {/* Absent, not "PRICE — PLACEHOLDER", where no price is set. */}
        {price ? (
          <Body size="sm" tone="muted" className="neogen-mono">
            {price}
          </Body>
        ) : null}
      </div>

      <Link
        href={href}
        onFocus={warm}
        className="mt-(--space-md) inline-flex h-12 items-center justify-center bg-(--surface-inverse) text-sm font-medium text-(--ink-inverse) transition-opacity duration-(--motion-duration-base) ease-(--ease-standard) hover:opacity-90"
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
