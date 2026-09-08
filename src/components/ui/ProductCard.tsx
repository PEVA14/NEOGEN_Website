import Link from "next/link";

import { Body, Heading, Mono } from "@/components/typography";
import { VialSilhouette } from "@/components/ui/VialSilhouette";
import { WorldDot } from "@/components/ui/WorldDot";
import type { WorldId } from "@/config/worlds";

interface ProductCardProps {
  world: WorldId;
  /** Short world character label — "PRECISION", "LUMINOUS", "MATERIAL". */
  worldLabel: string;
  name: string;
  href: string;
  /** e.g. "SKU — PLACEHOLDER // PRICE — PLACEHOLDER". Never an invented value. */
  meta: string;
  ctaLabel: string;
  /** Placeholder copy for the image area, until real product imagery exists. */
  mediaLabel: string;
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
 */
export function ProductCard({
  world,
  worldLabel,
  name,
  href,
  meta,
  ctaLabel,
  mediaLabel,
}: ProductCardProps) {
  return (
    <article className="flex flex-col border border-(--border-subtle) bg-(--surface-raised) p-(--space-sm)">
      {/*
       * Image area — the one place product identity is allowed to take over.
       * No real product photography exists yet, so this is an explicitly
       * labelled placeholder rather than invented imagery: the world's void and
       * a neutral note. Swap for a real asset without touching the layout.
       */}
      <div
        data-world={world}
        data-atmosphere="true"
        className="relative flex aspect-4/5 items-center justify-center overflow-hidden"
      >
        <VialSilhouette className="h-[62%] w-auto text-(--world-light)" />
        <Mono
          size="2xs"
          className="absolute bottom-(--space-sm) left-(--space-sm) tracking-(--tracking-label) text-(--ink-muted) uppercase"
        >
          {mediaLabel}
        </Mono>
      </div>

      <div className="flex flex-1 flex-col gap-(--space-2xs) pt-(--space-md)">
        <WorldDot world={world}>{worldLabel}</WorldDot>

        <Heading level={3} size="lg">
          {name}
        </Heading>

        <Body size="sm" tone="muted" className="neogen-mono">
          {meta}
        </Body>
      </div>

      <Link
        href={href}
        className="mt-(--space-md) inline-flex h-12 items-center justify-center bg-(--surface-inverse) text-sm font-medium text-(--ink-inverse) transition-opacity duration-(--motion-duration-base) ease-(--ease-standard) hover:opacity-90"
      >
        {ctaLabel}
      </Link>
    </article>
  );
}
