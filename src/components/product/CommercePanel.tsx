import { Mono } from "@/components/typography";
import { TextLink, WorldDot } from "@/components/ui";
import type { WorldId } from "@/config/worlds";

import styles from "./CommercePanel.module.css";

export interface CommerceCopy {
  index: string;
  section: string;
  qualifier: string;
  name: string;
  /**
   * Product description. Null until there is verified compound information to
   * write from — see COPYWRITING AFTER VERIFICATION. The line is then absent
   * rather than describing the packaging.
   */
  descriptor: string | null;
  variantLabel: string;
  /** Rendered when no verified variants exist. */
  variantPending: string;
  quantityLabel: string;
  priceLabel: string;
  /** Formatted retail price, or null where none is set. */
  price: string | null;
  /** Shown in place of a price when none is set. */
  pricePending: string;
  addToBag: string;
  /** Explains why the purchase control is inert. Never fabricates a reason. */
  commercePending: string;
  documentation: string;
  documentationHref: string;
  placeholder: string;
}

/**
 * The purchase interface.
 *
 * Follows the reference architecture exactly — breadcrumb, title, SKU,
 * descriptor, variant selector, quantity, price, ADD TO BAG, documentation
 * link, shipping note — with zero radius and charcoal as the only commerce
 * action colour.
 *
 * WHAT IS DELIBERATELY INERT, AND WHY
 * -----------------------------------
 * No verified commerce data exists: no price, no stock, no concentration
 * formats, and no cart. So the ARCHITECTURE is built and the CONTROLS are
 * disabled, with one neutral line explaining the state.
 *
 * The reference fills the variant selector with FORMAT A–E; inventing five
 * concentration formats to populate a control would be fabricating product
 * data, so the selector renders its real structure in a pending state and comes
 * alive the moment `variants` are supplied.
 *
 * The reference also marks stock with a green "Available [PLACEHOLDER]". A
 * positive status over unverified data is exactly what the verified token in
 * tokens.css is forbidden from doing, so the neutral vocabulary is used.
 *
 * A disabled control is honest. A live-looking ADD TO BAG that silently does
 * nothing would be a fake integration that appears production-ready.
 */
export function CommercePanel({
  copy,
  world,
  worldLabel,
  variants = [],
}: {
  copy: CommerceCopy;
  world: WorldId | null;
  /** Short world character label — "PRECISIÓN". Identity, never an action. */
  worldLabel: string;
  /** Verified concentration formats. Empty until real variant data exists. */
  variants?: readonly string[];
}) {
  const hasVariants = variants.length > 0;

  return (
    <div className={styles.panel}>
      <div className={styles.breadcrumb}>
        <Mono size="2xs" className={styles.index}>
          {copy.index}
        </Mono>
        <Mono size="2xs" className={styles.section}>
          / {copy.section}
        </Mono>
        <Mono size="2xs" className={styles.qualifier}>
          {/* Braced: a bare `//` in JSX children is parsed as a comment. */}
          {"// "}
          {copy.qualifier}
        </Mono>
      </div>

      {/* Identity, at the same scale and in the same language as the catalogue
          card's — the one place a product colour is allowed near commerce. */}
      {world ? (
        <WorldDot world={world} className={styles.identity}>
          {worldLabel}
        </WorldDot>
      ) : (
        <Mono size="2xs" className={styles.identity}>
          {worldLabel}
        </Mono>
      )}

      <h1 className={styles.name}>{copy.name}</h1>

      {/* No SKU line. It is an internal identifier and customers do not shop
          by it; displaying `SKU — PLACEHOLDER` only advertised an empty field. */}
      {copy.descriptor ? <p className={styles.descriptor}>{copy.descriptor}</p> : null}

      <div className={styles.rule} />

      {/* Variant selector — real architecture, pending state. */}
      <fieldset className={styles.variants} disabled={!hasVariants}>
        <legend className={styles.variantLegend}>
          <Mono size="2xs">{copy.variantLabel}</Mono>
        </legend>

        {hasVariants ? (
          <div className={styles.variantOptions}>
            {variants.map((variant, index) => (
              <label key={variant} className={styles.variant}>
                <input type="radio" name="variant" value={variant} defaultChecked={index === 0} />
                <span>{variant}</span>
              </label>
            ))}
          </div>
        ) : (
          <Mono size="2xs" className={styles.pending}>
            {copy.variantPending}
          </Mono>
        )}
      </fieldset>

      <div className={styles.purchase}>
        <div className={styles.quantity}>
          <Mono size="2xs" className={styles.fieldLabel}>
            {copy.quantityLabel}
          </Mono>
          <div className={styles.stepper} aria-hidden="true">
            <span className={styles.step}>−</span>
            <span className={styles.count}>1</span>
            <span className={styles.step}>+</span>
          </div>
        </div>

        <div className={styles.price}>
          {/* A real price, or nothing. Never "PRICE — PLACEHOLDER". */}
          {copy.price ? (
            <span className={styles.priceValue}>{copy.price}</span>
          ) : (
            <Mono size="2xs" className={styles.pending}>
              {copy.pricePending}
            </Mono>
          )}
        </div>
      </div>

      <button type="button" className={styles.addToBag} disabled>
        {copy.addToBag}
      </button>

      <Mono size="2xs" className={styles.pending}>
        {copy.commercePending}
      </Mono>

      <div className={styles.foot}>
        <TextLink href={copy.documentationHref}>{copy.documentation}</TextLink>
        {/* No shipping line. There is no shipping policy to state, and
            "SHIPPING — PLACEHOLDER" only labels an empty field. It returns
            when there is a real policy. */}
      </div>
    </div>
  );
}
