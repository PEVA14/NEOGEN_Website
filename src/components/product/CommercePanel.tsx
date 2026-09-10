import { Mono } from "@/components/typography";
import { TextLink, WorldDot } from "@/components/ui";
import type { WorldId } from "@/config/worlds";
import type { Availability } from "@/data/commerce";

import styles from "./CommercePanel.module.css";

export interface CommerceCopy {
  index: string;
  section: string;
  qualifier: string;
  name: string;
  /**
   * An alternative designation for the compound — never a description. Absent
   * for all but one product; see `Product.subtitle`.
   */
  subtitle: string | null;
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
 * One presentation, with whatever is known about being able to get it.
 *
 * `availability` is null for every variant today: there is no inventory
 * system, and an absent state renders no line rather than claiming stock we
 * have not checked. `unavailable` greys the option out rather than removing
 * it — a format that exists but cannot be had right now is information, and
 * deleting it from the selector makes the catalogue look smaller than it is.
 */
export interface CommerceVariant {
  label: string;
  availability: Availability | null;
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
  availabilityLabels,
}: {
  copy: CommerceCopy;
  world: WorldId | null;
  /** Short world character label — "PRECISIÓN". Identity, never an action. */
  worldLabel: string;
  /** The presentations this product is sold in. */
  variants?: readonly CommerceVariant[];
  /** Localized names for the three stock states. */
  availabilityLabels: Record<Availability, string>;
}) {
  const hasVariants = variants.length > 0;
  /*
   * The state shown next to the price belongs to the SELECTED variant, and
   * without client state that is the first one — the same one the radio group
   * defaults to. It stays in sync because both read index 0.
   */
  const selected = variants[0]?.availability ?? null;

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
      {/* An alternative name for the compound, above its composition. */}
      {copy.subtitle ? (
        <Mono size="2xs" className={styles.subtitle}>
          {copy.subtitle}
        </Mono>
      ) : null}

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
              <label
                key={variant.label}
                className={styles.variant}
                /* Greys the option out where the stock state says so. The
                   option stays selectable: it names a real presentation. */
                data-availability={variant.availability ?? undefined}
              >
                <input
                  type="radio"
                  name="variant"
                  value={variant.label}
                  defaultChecked={index === 0}
                />
                <span>{variant.label}</span>
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

      {/* Rendered only where a state is actually known. */}
      {selected ? (
        <Mono size="2xs" className={styles.availability} data-availability={selected}>
          {availabilityLabels[selected]}
        </Mono>
      ) : null}

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
