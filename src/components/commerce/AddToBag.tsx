"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { NeogenMark } from "@/components/brand/NeogenMark";
import { useIndicator } from "@/components/motion/useIndicator";
import { ValueRoll } from "@/components/motion/ValueRoll";
import { Mono } from "@/components/typography";
import { ORDER_LIMITS } from "@/data/commerce/limits";
import { formatPrice } from "@/data/commerce/format";
import { useBag } from "@/domain/bag";

import styles from "./AddToBag.module.css";

import type { Availability, Money } from "@/data/commerce";

export interface AddToBagVariant {
  variantId: string;
  presentation: string;
  /**
   * What one pack holds — "× 10 viales". Shown under the price and carried
   * into the bag line, because the price is for the pack, not for one vial.
   */
  pack?: string | null;
  price: Money | null;
  availability: Availability | null;
}

export interface AddToBagCopy {
  variantLabel: string;
  quantityLabel: string;
  priceLabel: string;
  add: string;
  added: string;
  /** Rendered instead of the button when purchasing is switched off. */
  unavailable: string;
  decrease: string;
  increase: string;
  availability: Record<Availability, string>;
  soldOut: string;
}

/**
 * PRESENTATION → QUANTITY → PRICE → ADD TO BAG.
 *
 * The commerce block, and the only client island on a product page. It owns
 * the selected presentation because price and availability both follow from it
 * — a server component cannot express "the price of whichever one you picked".
 *
 * PRICE IS THE LOUDEST THING HERE. It is set at display scale next to a
 * charcoal button, because this is the moment the page asks for a decision and
 * the previous version buried the figure in a row of mono labels.
 *
 * `enabled` is the master switch, passed from the server so the decision is
 * made once (`paymentAvailable()`) rather than re-derived in the browser.
 * With it false the control renders the real architecture in a stated,
 * non-clickable form — never a live-looking button that silently does nothing.
 */
export function AddToBag({
  slug,
  name,
  variants,
  copy,
  enabled,
  localeTag,
}: {
  slug: string;
  name: string;
  variants: readonly AddToBagVariant[];
  copy: AddToBagCopy;
  enabled: boolean;
  /**
   * BCP-47 tag for `Intl`. A TAG, not a formatter: functions do not cross the
   * server/client boundary, and importing the price map to get one would ship
   * 147 prices to the browser.
   */
  localeTag: string;
}) {
  const groupId = useId();
  const [selectedId, setSelectedId] = useState(variants[0]?.variantId ?? "");
  const [quantity, setQuantity] = useState<number>(ORDER_LIMITS.min);
  const [justAdded, setJustAdded] = useState(false);
  const { add } = useBag();
  const blockRef = useRef<HTMLDivElement>(null);
  /*
   * THE DOCK — mobile only. Once the buy box has scrolled up out of view, a
   * slim bar with the selected presentation, its price and the same action
   * holds the bottom edge, so a long product page never strands the reader
   * away from the one thing it sells. Only while the bag is enabled: a dock
   * offering a disabled button would be a permanent reminder of nothing.
   */
  const [docked, setDocked] = useState(false);
  const browser = useBrowser();
  useEffect(() => {
    const el = blockRef.current;
    if (!el || !enabled || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setDocked(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  const selected = variants.find((v) => v.variantId === selectedId) ?? variants[0];

  /*
   * THE CHOICE TRAVELS, AND THE PRICE ANSWERS IT. One charcoal mark moves to
   * the presentation chosen (rather than one chip going dark as another goes
   * light), and the price rolls to its new figure in the direction it moved —
   * a bigger presentation reads as the price going up (`ValueRoll`). Never on
   * first paint: both are simply there.
   */
  const optionsRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  useIndicator(optionsRef, markRef, "label:has(input:checked)", selectedId);

  const soldOut = selected?.availability === "unavailable";
  const canAdd = enabled && Boolean(selected?.price) && !soldOut;

  const step = (delta: number) =>
    setQuantity((q) => Math.min(ORDER_LIMITS.max, Math.max(ORDER_LIMITS.min, q + delta)));

  const onAdd = () => {
    if (!canAdd || !selected?.price) return;
    add(
      {
        variantId: selected.variantId,
        slug,
        name,
        presentation: selected.pack
          ? `${selected.presentation} ${selected.pack}`
          : selected.presentation,
        unitPrice: selected.price,
      },
      quantity,
    );
    /*
     * Back to one. The quantity has been committed, and carrying it over means
     * the next add silently repeats it — someone who adds 3 of one strength
     * and then clicks again on another gets 3 of that too.
     */
    setQuantity(ORDER_LIMITS.min);
    /* Confirmation on the button itself. No toast: the header count also
       moves, and two simultaneous confirmations of one action is noise. */
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 2000);
  };

  if (variants.length === 0) return null;

  return (
    <div className={styles.block} ref={blockRef}>
      {variants.length > 1 ? (
        <fieldset className={styles.variants}>
          <legend className={styles.legend}>
            <Mono size="2xs">{copy.variantLabel}</Mono>
          </legend>
          <div className={styles.options} ref={optionsRef}>
            <span ref={markRef} className={styles.mark} aria-hidden="true" />
            {variants.map((variant) => (
              <label
                key={variant.variantId}
                className={styles.variant}
                data-availability={variant.availability ?? undefined}
              >
                <input
                  type="radio"
                  name={`variant-${groupId}`}
                  value={variant.variantId}
                  checked={variant.variantId === selectedId}
                  onChange={() => setSelectedId(variant.variantId)}
                />
                <span>{variant.presentation}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className={styles.single}>
          <Mono size="2xs" className={styles.legend}>
            {copy.variantLabel}
          </Mono>
          <span className={styles.singleValue}>{variants[0].presentation}</span>
        </div>
      )}

      <div className={styles.purchase}>
        <div className={styles.quantity}>
          <Mono size="2xs" className={styles.legend}>
            {copy.quantityLabel}
          </Mono>
          <div className={styles.stepper}>
            <button
              type="button"
              className={styles.step}
              onClick={() => step(-1)}
              disabled={quantity <= ORDER_LIMITS.min}
              aria-label={copy.decrease}
            >
              −
            </button>
            {/* A live region: a screen reader hears the new number without
                the focused button's own label changing. */}
            <output className={styles.count} aria-live="polite">
              {quantity}
            </output>
            <button
              type="button"
              className={styles.step}
              onClick={() => step(1)}
              disabled={quantity >= ORDER_LIMITS.max}
              aria-label={copy.increase}
            >
              +
            </button>
          </div>
        </div>

        <div className={styles.price}>
          <Mono size="2xs" className={styles.legend}>
            {copy.priceLabel}
          </Mono>
          {selected?.price ? (
            <>
              {/* `data-price-value`: a world may set its price in its own material. */}
              <span className={styles.priceValue} data-price-value="">
                <ValueRoll value={formatPrice(selected.price, localeTag)} />
              </span>
              {selected.pack ? (
                <Mono size="2xs" className={styles.pack}>
                  <ValueRoll value={`${selected.presentation} ${selected.pack}`} />
                </Mono>
              ) : null}
            </>
          ) : (
            <span className={styles.priceValue} data-pending="true">
              —
            </span>
          )}
        </div>
      </div>

      {selected?.availability ? (
        <Mono size="2xs" className={styles.availability} data-availability={selected.availability}>
          {copy.availability[selected.availability]}
        </Mono>
      ) : null}

      <button
        type="button"
        className={styles.add}
        onClick={onAdd}
        disabled={!canAdd}
        data-added={justAdded ? "true" : undefined}
      >
        {soldOut ? copy.soldOut : justAdded ? <Added label={copy.added} /> : copy.add}
      </button>

      {!enabled ? (
        <Mono size="2xs" className={styles.note}>
          {copy.unavailable}
        </Mono>
      ) : null}

      {/*
       * The dock belongs to the viewport, so it is rendered at the end of the
       * body. Inside the page it inherited whatever stacking context its
       * ancestors made — the bench's `isolation: isolate` kept it under every
       * positioned element further down (the profile's cited sentences), which
       * painted over it on a phone and took its taps. After hydration only:
       * it is never docked before then.
       */}
      {enabled && browser
        ? createPortal(
            <div className={styles.dock} data-docked={docked ? "true" : undefined} inert={!docked}>
              <div className={styles.dockRecord}>
                <span className={styles.dockName}>{name}</span>
                <Mono size="2xs" className={styles.dockMeta}>
                  {selected?.presentation}
                  {selected?.pack ? ` ${selected.pack}` : ""}
                </Mono>
              </div>
              {selected?.price ? (
                <span className={styles.dockPrice}>
                  <ValueRoll value={formatPrice(selected.price, localeTag)} />
                </span>
              ) : null}
              <button
                type="button"
                className={styles.dockAdd}
                onClick={onAdd}
                disabled={!canAdd}
                data-added={justAdded ? "true" : undefined}
              >
                {soldOut ? copy.soldOut : justAdded ? <Added label={copy.added} /> : copy.add}
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

const noSubscription = () => () => {};

/** True once rendering in the browser (false on the server and in hydration). */
function useBrowser(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
}

/*
 * THE CONFIRMATION FORMS THE MARK. When a presentation joins the bag, the
 * word "Añadido" arrives with the NEOGEN mark forming beside it — the nodes,
 * then the connections closing — once, caused by the click, inside the two
 * seconds the confirmation already holds. Decorative: the word is the
 * message, and the button's text is what a screen reader hears.
 */
function Added({ label }: { label: string }) {
  return (
    <span className={styles.added}>
      <NeogenMark className={styles.addedMark} assemble="now" />
      {label}
    </span>
  );
}
