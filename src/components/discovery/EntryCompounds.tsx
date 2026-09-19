import Link from "next/link";

import { PresentationLadder, type LadderStep } from "@/components/product/PresentationLadder";
import { Mono } from "@/components/typography";
import { ProductCard, type ProductCardProps } from "@/components/ui/ProductCard";
import { SpecimenPlate } from "@/components/ui/SpecimenPlate";
import { WorldDot } from "@/components/ui/WorldDot";
import { TextLink } from "@/components/ui/TextLink";

import styles from "./EntryCompounds.module.css";

import type { WorldId } from "@/config/worlds";
import type { DiscoveryAreaId } from "@/data/discovery";

export interface EntryLead {
  slug: string;
  name: string;
  subtitle: string | null;
  href: string;
  world: WorldId | null;
  worldLabel?: string;
  areaId: DiscoveryAreaId;
  /** The factual catalogue classification, as the eyebrow when there is no world. */
  classification: string;
  range: string;
  presentationCount: number;
  ladder: readonly LadderStep[];
  /** Formatted cheapest price, or null where none is set. */
  price: string | null;
  /** The other public areas this compound is filed under. */
  alsoIn: readonly { id: DiscoveryAreaId; label: string; href: string }[];
  /** Resolver-derived record count label, or null when there is no public record. */
  records: string | null;
}

export interface EntryCompoundsCopy {
  presentations: string;
  pack: string;
  documentation: string;
  alsoIn: string;
  from: string;
  cta: string;
}

/**
 * ENTRY COMPOUNDS — the first thing to look at in an area.
 *
 * Not four cards in a row. One compound leads as an editorial SPREAD — the
 * specimen plate at feature scale beside its record: the presentation ladder
 * set as figures, the other areas it belongs to, its entry price — and the
 * rest sit beside it in the Phase 12 card formats.
 *
 * TWO SHAPES, CHOSEN BY THE AREA'S SIZE (`featuredCount`):
 *
 *   three  the lead runs the full width, plate left and record right, with
 *          two wide `feature` cards beneath it;
 *   two    a 7/5 split: the lead stacked in seven columns, one card in five.
 *
 * THE LEAD TAKES ITS PRODUCT'S MATERIAL. A flagship leads on its world's dark
 * ground (RETA in Metabolism, GLOW in Recovery and Skin), anything else on its
 * area's wash — so two areas never open this section on the same surface
 * unless their catalogues genuinely look alike.
 *
 * NOTHING HERE RANKS. The order is flagship first, then catalogue order, and
 * no line on the page says a compound is popular, recommended or better. The
 * record count appears only when the evidence resolver produced records.
 */
export function EntryCompounds({
  lead,
  others,
  copy,
}: {
  lead: EntryLead;
  others: readonly ProductCardProps[];
  copy: EntryCompoundsCopy;
}) {
  const shape = others.length >= 2 ? "three" : "two";

  return (
    <div className={styles.entry} data-shape={shape}>
      <article
        className={styles.lead}
        data-world={lead.world ?? undefined}
        data-area={lead.world ? undefined : lead.areaId}
        aria-labelledby={`entry-${lead.slug}`}
      >
        {/*
         * The plate is a mouse convenience into the same page the action links
         * to — out of the tab order and hidden from assistive technology, so a
         * keyboard or screen-reader user meets ONE link to this compound, not
         * two.
         */}
        <Link href={lead.href} className={styles.media} tabIndex={-1} aria-hidden="true">
          <SpecimenPlate
            areaId={lead.areaId}
            world={lead.world}
            name={lead.name}
            presentations={lead.presentationCount}
            annotation={lead.range}
            size="feature"
          />
        </Link>

        <div className={styles.record}>
          {lead.world && lead.worldLabel ? (
            <WorldDot world={lead.world}>{lead.worldLabel}</WorldDot>
          ) : (
            <Mono size="2xs" className={styles.eyebrow}>
              {lead.classification}
            </Mono>
          )}

          <h3 id={`entry-${lead.slug}`} className={styles.name}>
            {lead.name}
          </h3>
          {lead.subtitle ? (
            <Mono size="2xs" className={styles.subtitle}>
              {lead.subtitle}
            </Mono>
          ) : null}

          <div className={styles.ladder}>
            <PresentationLadder
              steps={lead.ladder}
              label={copy.presentations}
              packLabel={copy.pack}
            />
          </div>

          <dl className={styles.facts}>
            {lead.price ? (
              <div className={styles.fact}>
                <Mono as="dt" size="2xs" className={styles.factKey}>
                  {copy.from}
                </Mono>
                <dd className={styles.price}>{lead.price}</dd>
              </div>
            ) : null}
            {lead.alsoIn.length > 0 ? (
              <div className={styles.fact}>
                <Mono as="dt" size="2xs" className={styles.factKey}>
                  {copy.alsoIn}
                </Mono>
                <dd className={styles.links}>
                  {lead.alsoIn.map((area) => (
                    <TextLink key={area.id} href={area.href} arrow={false}>
                      {area.label}
                    </TextLink>
                  ))}
                </dd>
              </div>
            ) : null}
            {lead.records ? (
              <div className={styles.fact}>
                <Mono as="dt" size="2xs" className={styles.factKey}>
                  {copy.documentation}
                </Mono>
                <dd className={styles.value}>{lead.records}</dd>
              </div>
            ) : null}
          </dl>

          <Link href={lead.href} className={styles.cta} aria-label={`${copy.cta} — ${lead.name}`}>
            {copy.cta} →
          </Link>
        </div>
      </article>

      {others.map((item) => (
        <div key={item.slug} className={styles.other}>
          <ProductCard
            {...item}
            format={shape === "three" ? "feature" : item.format}
            variant="store"
          />
        </div>
      ))}
    </div>
  );
}
