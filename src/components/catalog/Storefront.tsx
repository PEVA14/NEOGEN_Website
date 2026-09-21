import Image from "next/image";
import Link from "next/link";

import type React from "react";

import { Container } from "@/components/primitives";
import { AreaCap, AreaIcon, SpecimenPlate } from "@/components/ui";

import { StoreSearch } from "./StoreSearch";
import styles from "./Storefront.module.css";

import type { WorldId } from "@/config/worlds";
import type { ProductImage } from "@/content/media";
import type { DiscoveryAreaId } from "@/data/discovery";

/**
 * THE STOREFRONT — /productos as NEOGEN's primary store.
 *
 * The UI stays quiet; the products get loud. The page opens on the brand's
 * charcoal with the store's count and its one search field on the left and
 * the three signature products standing on their own world grounds on the
 * right — the only coloured grounds on the page. Then eight ways in by area,
 * each shown by a real product from it. Then the whole catalogue.
 *
 * Every figure is counted from the registry, every object is the product
 * object drawn from registry data, and every price is the catalogue's own.
 * There is no photography yet, so none is shown.
 */

export interface StoreSignature {
  slug: string;
  name: string;
  href: string;
  world: WorldId;
  /** "Precisión". */
  worldLabel: string;
  range: string;
  price: string | null;
  /** The product's commerce still — a studio render of its model — when one exists. */
  image: ProductImage | null;
}

export interface StoreArea {
  id: DiscoveryAreaId;
  href: string;
  label: string;
  count: number;
}

export interface StoreCopy {
  eyebrow: string;
  title: string;
  stats: string;
  lede: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchSubmit: string;
  browseAll: string;
  signatureLabel: string;
  from: string;
}

export function StoreMasthead({
  copy,
  signatures,
  resultsId,
  conditions,
}: {
  copy: StoreCopy;
  signatures: readonly StoreSignature[];
  resultsId: string;
  /**
   * The conditions of the sale — fulfilment and research use — on the store
   * front itself.
   *
   * They sit at the FOOT of the masthead rather than under the title: a
   * customer arriving at the catalogue is looking for products, and the two
   * facts that change whether they keep looking ("do you ship to me", "what
   * am I allowed to do with this") belong at the end of the introduction
   * rather than in front of it.
   */
  conditions?: React.ReactNode;
}) {
  return (
    <section className={styles.masthead} data-surface="dark" aria-labelledby="catalog-title">
      <Container width="full">
        <div className={styles.mastheadGrid}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h1 id="catalog-title" className={styles.title}>
              {copy.title}
            </h1>
            <p className={styles.stats}>{copy.stats}</p>
            <p className={styles.lede}>{copy.lede}</p>
            <StoreSearch
              label={copy.searchLabel}
              placeholder={copy.searchPlaceholder}
              submit={copy.searchSubmit}
              resultsId={resultsId}
            />
            <a href={`#${resultsId}`} className={styles.browseAll}>
              {copy.browseAll} <span aria-hidden="true">↓</span>
            </a>
            {conditions ? <div className={styles.conditions}>{conditions}</div> : null}
          </div>

          {signatures.length > 0 ? (
            <nav className={styles.signatures} aria-label={copy.signatureLabel}>
              <p className={styles.signaturesLabel} aria-hidden="true">
                {copy.signatureLabel}
              </p>
              <ul className={styles.signatureList}>
                {signatures.map((item) => (
                  <li key={item.slug} className={styles.signatureItem}>
                    <Link href={item.href} className={styles.signature} data-world={item.world}>
                      <span className={styles.signatureMedia}>
                        {item.image ? (
                          <Image
                            src={item.image.src}
                            alt={item.image.alt}
                            width={item.image.width}
                            height={item.image.height}
                            sizes="(min-width: 64rem) 20rem, 60vw"
                            className={styles.signatureImage}
                            priority
                          />
                        ) : (
                          <SpecimenPlate
                            areaId={null}
                            world={item.world}
                            name={item.name}
                            annotation={item.range}
                          />
                        )}
                      </span>
                      <span className={styles.signatureBody}>
                        <span className={styles.signatureWorld}>{item.worldLabel}</span>
                        <span className={styles.signatureName}>{item.name}</span>
                        <span className={styles.signatureCommerce}>
                          <span className={styles.signatureRange}>{item.range}</span>
                          {item.price ? (
                            <span className={styles.signaturePrice}>
                              <span className={styles.from}>{copy.from} </span>
                              {item.price}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </Container>
    </section>
  );
}

/**
 * EIGHT WAYS IN. Compact doors (owner direction, 2026-09-19): each area is
 * its number, name and count over its own tint, and the top of a NEOGEN vial
 * rising from the tile's foot with its cap in the area's colour — a shelf of
 * these, without showing any one product. No price: the tile opens the area,
 * and the area's own page carries the prices. One row on a wide screen, four
 * across on a tablet, two across on a phone.
 */
export function AreaShelf({
  areas,
  copy,
  allHref = "#catalogo",
  id,
}: {
  areas: readonly StoreArea[];
  copy: { index: string; label: string; title: string; count: string; all: string };
  /** Where "see all" goes. The storefront scrolls to its own collection; the
      homepage opens the catalogue. */
  allHref?: string;
  /** Anchor for the section, so another part of the page can point at it. */
  id?: string;
}) {
  if (areas.length === 0) return null;
  return (
    <section className={styles.areas} aria-labelledby="store-areas-title" id={id}>
      {/*
       * THE HANDOFF. The area heading stays on the masthead's charcoal and the
       * tiles rise out of it onto the paper: the dark store front hands the
       * visitor to the shelves instead of stopping at a hard edge.
       */}
      <div className={styles.areasBand} data-surface="dark">
        <Container width="full">
          <StoreSectionHead
            index={copy.index}
            label={copy.label}
            title={copy.title}
            id="store-areas-title"
            action={{ href: allHref, label: copy.all }}
          />
        </Container>
      </div>
      <Container width="full">
        <ul className={styles.areaList}>
          {areas.map((area, i) => (
            <li key={area.id} className={styles.areaItem} data-area={area.id}>
              <Link prefetch={false} href={area.href} className={styles.area}>
                <span className={styles.areaHead}>
                  <AreaIcon id={area.id} className={styles.areaIcon} />
                  <span className={styles.areaIndex}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.areaName}>{area.label}</span>
                  <span className={styles.areaCount}>
                    {copy.count.replace("{n}", String(area.count).padStart(2, "0"))}
                  </span>
                </span>
                <span className={styles.areaFoot} aria-hidden="true">
                  <AreaCap className={styles.areaCap} />
                  <span className={styles.arrow}>→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

/** The storefront's section head: rule, index, condensed title, one action. */
export function StoreSectionHead({
  index,
  label,
  title,
  id,
  action,
}: {
  index: string;
  label: string;
  title: string;
  id: string;
  action?: { href: string; label: string };
}) {
  return (
    <header className={styles.sectionHead}>
      <p className={styles.sectionIndex}>
        {index} <span>/ {label}</span>
      </p>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {action ? (
        <a href={action.href} className={styles.sectionAction}>
          {action.label} <span aria-hidden="true">{action.href.startsWith("#") ? "↓" : "→"}</span>
        </a>
      ) : null}
    </header>
  );
}

/** The collection: the whole catalogue, under its own head. */
export function StoreCollection({
  head,
  resultsId,
  children,
}: {
  head: { index: string; label: string; title: string };
  resultsId: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.collection} aria-labelledby="store-collection-title">
      <Container width="full">
        <StoreSectionHead {...head} id="store-collection-title" />
        <div id={resultsId} className={styles.collectionBody}>
          {children}
        </div>
      </Container>
    </section>
  );
}
