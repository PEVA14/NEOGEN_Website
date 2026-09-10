import { Mono } from "@/components/typography";
import { TextLink, WorldDot } from "@/components/ui";
import type { WorldId } from "@/config/worlds";

import type { ReactNode } from "react";

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
  children,
}: {
  copy: CommerceCopy;
  world: WorldId | null;
  /** Short world character label — "PRECISIÓN". Identity, never an action. */
  worldLabel: string;
  /** The commerce block — `AddToBag`. */
  children: ReactNode;
}) {
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

      {/*
       * THE COMMERCE BLOCK, INJECTED.
       *
       * Presentation, quantity, price and ADD TO BAG live in `AddToBag`, which
       * is a client island: the selected presentation drives both the price and
       * the stock state, and a server component cannot express "the price of
       * whichever one you picked".
       *
       * Keeping it as `children` is what lets this panel stay a server
       * component. The identity above — breadcrumb, world dot, name, subtitle,
       * composition — and the documentation link below never needed the client.
       */}
      <div className={styles.commerceSlot}>{children}</div>

      <div className={styles.foot}>
        <TextLink href={copy.documentationHref}>{copy.documentation}</TextLink>
        {/* No shipping line. There is no shipping policy to state, and
            "SHIPPING — PLACEHOLDER" only labels an empty field. It returns
            when there is a real policy. */}
      </div>
    </div>
  );
}
