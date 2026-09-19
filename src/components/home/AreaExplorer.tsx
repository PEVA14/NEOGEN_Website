"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import { Container } from "@/components/primitives/Container";
import { AreaIcon } from "@/components/ui/AreaIcon";
import { ProductCard } from "@/components/ui/ProductCard";

import styles from "./AreaExplorer.module.css";

import type { WorldId } from "@/config/worlds";
import type { DiscoveryAreaId } from "@/data/discovery";

export interface ExplorerProduct {
  slug: string;
  name: string;
  href: string;
  world: WorldId | null;
  range: string;
  presentations: number;
  price: string | null;
}

export interface ExplorerArea {
  id: DiscoveryAreaId;
  short: string;
  title: string;
  body: string;
  href: string;
  count: number;
  price: string | null;
  products: readonly ExplorerProduct[];
}

export interface ExplorerCopy {
  index: string;
  label: string;
  title: string;
  tabsLabel: string;
  count: string;
  from: string;
  enter: string;
  all: string;
  cta: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * EXPLORE BY AREA — the category atmosphere between two flagship worlds.
 *
 * The neutral store → a category's atmosphere → a flagship world. Choosing an
 * area tints the whole section in that area's own wash and hue (`areas.css`):
 * each discovery area keeps its own ground rather than every generic product
 * sharing one beige. The colour stays in grounds and marks; text and actions
 * stay charcoal.
 *
 * Each area shows four more of its products — past the entry product the
 * collection tiles above already show — as store cards, with the area's own
 * page one action away.
 *
 * Every panel is in the server HTML (inactive ones `hidden`), so the products
 * are indexable and the first area works before hydration.
 */
export function AreaExplorer({
  copy,
  areas,
}: {
  copy: ExplorerCopy;
  areas: readonly ExplorerArea[];
}) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  if (areas.length === 0) return null;
  const current = areas[active];

  const onKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = areas.length - 1;
    const next =
      event.key === "ArrowRight"
        ? active === last
          ? 0
          : active + 1
        : event.key === "ArrowLeft"
          ? active === 0
            ? last
            : active - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section
      className={styles.explorer}
      data-area={current.id}
      aria-labelledby={`${baseId}-title`}
      id="explora-areas"
    >
      <Container width="full">
        <header className={styles.head}>
          <p className={styles.index}>
            {copy.index} <span>/ {copy.label}</span>
          </p>
          <h2 id={`${baseId}-title`} className={styles.title}>
            {copy.title}
          </h2>
        </header>

        <div role="tablist" aria-label={copy.tabsLabel} className={styles.tabs}>
          {areas.map((area, index) => (
            <button
              key={area.id}
              ref={(node) => {
                tabs.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${area.id}`}
              aria-selected={index === active}
              aria-controls={`${baseId}-panel-${area.id}`}
              tabIndex={index === active ? 0 : -1}
              className={styles.tab}
              data-area={area.id}
              onClick={() => setActive(index)}
              onKeyDown={onKey}
            >
              <AreaIcon id={area.id} className={styles.tabIcon} />
              <span className={styles.tabName}>{area.short}</span>
              <span className={styles.tabCount}>{pad(area.count)}</span>
            </button>
          ))}
        </div>

        {areas.map((area, index) => (
          <div
            key={area.id}
            role="tabpanel"
            id={`${baseId}-panel-${area.id}`}
            aria-labelledby={`${baseId}-tab-${area.id}`}
            hidden={index !== active}
            className={styles.panel}
          >
            <div className={styles.intro}>
              <AreaIcon id={area.id} className={styles.introIcon} />
              <h3 className={styles.areaTitle}>{area.title}</h3>
              <p className={styles.areaBody}>{area.body}</p>
              <p className={styles.areaFacts}>
                <span>{copy.count.replace("{n}", pad(area.count))}</span>
                {area.price ? (
                  <span>
                    {copy.from} <strong>{area.price}</strong>
                  </span>
                ) : null}
              </p>
              <Link href={area.href} className={styles.enter}>
                {copy.enter} <span aria-hidden="true">→</span>
              </Link>
            </div>

            <ul className={styles.shelf}>
              {area.products.map((product) => (
                <li key={product.slug} className={styles.shelfItem}>
                  <ProductCard
                    slug={product.slug}
                    world={product.world}
                    areaId={area.id}
                    name={product.name}
                    href={product.href}
                    price={product.price}
                    priceFrom={copy.from}
                    presentationRange={product.range}
                    presentations={product.presentations}
                    ctaLabel={copy.cta}
                    variant="store"
                  />
                </li>
              ))}
              <li className={styles.shelfItem}>
                <Link href={area.href} className={styles.more}>
                  <span className={styles.moreFigure}>{pad(area.count)}</span>
                  <span className={styles.moreLabel}>
                    {copy.all.replace("{n}", String(area.count))}
                  </span>
                  <span className={styles.moreGo} aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        ))}
      </Container>
    </section>
  );
}
