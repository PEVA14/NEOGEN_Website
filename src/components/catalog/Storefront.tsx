import Link from "next/link";

import type React from "react";

import { Container } from "@/components/primitives";
import { SpecimenPlate } from "@/components/ui";

import { StoreSearch } from "./StoreSearch";
import styles from "./Storefront.module.css";

import type { WorldId } from "@/config/worlds";
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
}

export interface StoreArea {
  id: DiscoveryAreaId;
  href: string;
  label: string;
  count: number;
  /** The area's entry product — its cheapest priced one — as the tile's object. */
  entry: { name: string; range: string } | null;
  price: string | null;
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
}: {
  copy: StoreCopy;
  signatures: readonly StoreSignature[];
  resultsId: string;
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
                        <SpecimenPlate
                          areaId={null}
                          world={item.world}
                          name={item.name}
                          annotation={item.range}
                        />
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
 * EIGHT WAYS IN. Each area is shown by a real product from it — its entry
 * product, the cheapest priced one — standing on the area's own studio tone,
 * with the area's count and its entry price. One row on a wide screen, a
 * swiped shelf on a phone.
 */
export function AreaShelf({
  areas,
  copy,
}: {
  areas: readonly StoreArea[];
  copy: { index: string; label: string; title: string; count: string; from: string; all: string };
}) {
  if (areas.length === 0) return null;
  return (
    <section className={styles.areas} aria-labelledby="store-areas-title">
      <Container width="full">
        <StoreSectionHead
          index={copy.index}
          label={copy.label}
          title={copy.title}
          id="store-areas-title"
          action={{ href: "#catalogo", label: copy.all }}
        />
        <ul className={styles.areaList}>
          {areas.map((area, i) => (
            <li key={area.id} className={styles.areaItem} data-area={area.id}>
              <Link href={area.href} className={styles.area}>
                <span className={styles.areaHead}>
                  <span className={styles.areaIndex}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={styles.areaName}>{area.label}</span>
                  <span className={styles.areaCount}>
                    {copy.count.replace("{n}", String(area.count).padStart(2, "0"))}
                  </span>
                </span>
                {area.entry ? (
                  <span className={styles.areaMedia}>
                    <SpecimenPlate
                      areaId={area.id}
                      world={null}
                      name={area.entry.name}
                      annotation={area.entry.range}
                    />
                  </span>
                ) : null}
                <span className={styles.areaFoot}>
                  {area.price ? (
                    <span>
                      <span className={styles.from}>{copy.from} </span>
                      {area.price}
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className={styles.arrow} aria-hidden="true">
                    →
                  </span>
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
          {action.label} <span aria-hidden="true">↓</span>
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
