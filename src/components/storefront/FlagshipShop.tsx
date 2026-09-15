"use client";

import Link from "next/link";
import { useId, useRef, useState, type KeyboardEvent } from "react";

import { SpecimenPlate } from "@/components/ui/SpecimenPlate";
import { formatPrice } from "@/data/commerce/format";
import { useBag } from "@/domain/bag";
import { perVial, reachesThreshold } from "@/domain/storefront";

import styles from "./FlagshipShop.module.css";

import type { WorldId } from "@/config/worlds";
import type { DiscoveryAreaId } from "@/data/discovery/types";

export interface FlagshipShopProduct {
  slug: string;
  name: string;
  href: string;
  world: WorldId;
  areaId: DiscoveryAreaId | null;
  composition: string | null;
  areas: readonly string[];
  variants: readonly { id: string; label: string; amount: number | null; vials: number | null }[];
}

export interface FlagshipShopCopy {
  tabsLabel: string;
  worldLabels: Record<WorldId, string>;
  composition: string;
  presentation: string;
  /** "{price} por vial · empaque de {n}". */
  unit: string;
  /** "Con este empaque, el pedido alcanza el envío gratis". */
  freeReached: string;
  /** "Envío gratis en pedidos desde {price}". */
  freeFrom: string;
  add: string;
  added: string;
  view: string;
  presentations: string;
}

/**
 * THE FLAGSHIP SHOP — the three worlds, as a counter you can buy at.
 *
 * Every other homepage appearance of RETA, GLOW and GHK-Cu is an Experience
 * beat or a card that sends you away. This is the one place the homepage lets
 * a customer choose: pick a world, pick a presentation, see the price change,
 * see the unit price and whether the pack alone reaches free shipping, and
 * act on it without leaving the page.
 *
 * WORLD IN THE PLATE, NEUTRAL IN THE COUNTER. The specimen plate carries the
 * world (its ground, its light); the tabs, the radios, the price and the
 * action stay Quiet — CONVENTIONS §3 and §11. The tab marker is the world dot,
 * the one sanctioned place a product colour touches a control.
 *
 * THE ACTION IS GATED ON THE SERVER. `bagEnabled` is decided once by
 * `bagEnabled()`; with it false (today) the counter offers the product page
 * instead of a button that looks live and does nothing.
 */
export function FlagshipShop({
  products,
  initial,
  threshold,
  bagEnabled,
  copy,
  localeTag,
}: {
  products: readonly FlagshipShopProduct[];
  initial?: WorldId;
  threshold: number | null;
  bagEnabled: boolean;
  copy: FlagshipShopCopy;
  localeTag: string;
}) {
  const baseId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const [worldIndex, setWorldIndex] = useState(() =>
    Math.max(
      0,
      products.findIndex((p) => p.world === initial),
    ),
  );
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [justAdded, setJustAdded] = useState(false);
  const { add } = useBag();

  if (products.length === 0) return null;
  const product = products[worldIndex];
  const variant =
    product.variants.find((v) => v.id === selected[product.slug]) ?? product.variants[0];
  const money = (amount: number) => formatPrice({ amount, currency: "MXN" }, localeTag);
  const unit = variant ? perVial(variant.amount, variant.vials) : null;
  const free = variant ? reachesThreshold(variant.amount, threshold) : false;

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = products.length - 1;
    const next =
      event.key === "ArrowRight"
        ? worldIndex === last
          ? 0
          : worldIndex + 1
        : event.key === "ArrowLeft"
          ? worldIndex === 0
            ? last
            : worldIndex - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    setWorldIndex(next);
    tabs.current[next]?.focus();
  };

  const onAdd = () => {
    if (!bagEnabled || !variant || variant.amount === null) return;
    add({
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      presentation: variant.label,
      unitPrice: { amount: variant.amount, currency: "MXN" },
    });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2000);
  };

  return (
    <div className={styles.shop}>
      <div role="tablist" aria-label={copy.tabsLabel} className={styles.tabs}>
        {products.map((p, index) => (
          <button
            key={p.slug}
            ref={(node) => {
              tabs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${index}`}
            aria-selected={index === worldIndex}
            aria-controls={`${baseId}-panel`}
            tabIndex={index === worldIndex ? 0 : -1}
            className={styles.tab}
            onClick={() => setWorldIndex(index)}
            onKeyDown={onTabKey}
          >
            <span className={styles.tabDot} data-world-tint={p.world} aria-hidden="true" />
            <span className={styles.tabName}>{p.name}</span>
            <span className={styles.tabWorld}>{copy.worldLabels[p.world]}</span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${worldIndex}`}
        className={styles.panel}
      >
        {/* Keyed by product so the plate re-enters when the world changes. */}
        <div key={product.slug} className={styles.stage}>
          <SpecimenPlate
            world={product.world}
            areaId={product.areaId}
            name={product.name}
            presentations={product.variants.length}
            annotation={variant?.label}
            size="plate"
          />
        </div>

        <div className={styles.counter}>
          <p className={styles.meta}>
            <span className={styles.tabDot} data-world-tint={product.world} aria-hidden="true" />
            {copy.worldLabels[product.world]}
            {product.areas.length ? <span> · {product.areas.join(" · ")}</span> : null}
          </p>

          <h3 className={styles.name}>{product.name}</h3>

          {product.composition ? (
            <p className={styles.composition}>
              <span className={styles.label}>{copy.composition}</span>
              {product.composition}
            </p>
          ) : null}

          <fieldset className={styles.picker}>
            <legend className={styles.label}>
              {copy.presentation}
              <span className={styles.count}>
                {copy.presentations.replace("{n}", String(product.variants.length))}
              </span>
            </legend>
            <div className={styles.options}>
              {product.variants.map((v) => (
                <label key={v.id} className={styles.option}>
                  <input
                    type="radio"
                    name={`${baseId}-${product.slug}`}
                    value={v.id}
                    checked={v.id === variant?.id}
                    onChange={() => setSelected((s) => ({ ...s, [product.slug]: v.id }))}
                  />
                  <span className={styles.optionLabel}>{v.label}</span>
                  {v.amount !== null ? (
                    <span className={styles.optionPrice}>{money(v.amount)}</span>
                  ) : null}
                </label>
              ))}
            </div>
          </fieldset>

          {variant && variant.amount !== null ? (
            <div className={styles.priceBlock} aria-live="polite">
              <span className={styles.price}>{money(variant.amount)}</span>
              {unit !== null && variant.vials ? (
                <span className={styles.unit}>
                  {copy.unit.replace("{price}", money(unit)).replace("{n}", String(variant.vials))}
                </span>
              ) : null}
            </div>
          ) : null}

          {threshold !== null ? (
            <p className={styles.shipping} data-reached={free || undefined}>
              <span className={styles.shippingMark} aria-hidden="true" />
              {free ? copy.freeReached : copy.freeFrom.replace("{price}", money(threshold))}
            </p>
          ) : null}

          <div className={styles.actions}>
            {bagEnabled && variant?.amount !== null ? (
              <>
                <button type="button" className={styles.primary} onClick={onAdd}>
                  {justAdded ? copy.added : copy.add}
                </button>
                <Link href={product.href} className={styles.secondary}>
                  {copy.view}
                </Link>
              </>
            ) : (
              <Link href={product.href} className={styles.primary}>
                {copy.view} →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
