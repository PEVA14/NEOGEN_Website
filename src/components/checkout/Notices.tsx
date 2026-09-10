import Link from "next/link";

import { Body, Mono } from "@/components/typography";
import { formatPrice } from "@/data/commerce/format";

import styles from "./Notices.module.css";

import type { LineAdjustment } from "@/domain/checkout";

export interface AdjustmentCopy {
  title: string;
  note: string;
  removedUnknown: string;
  removedUnpriced: string;
  removedUnavailable: string;
  /** "{name}: {was} → {now}" */
  repriced: string;
  /** "{name}: {from} → {to}" */
  quantityClamped: string;
  acknowledge: string;
}

/**
 * WHAT THE SERVER CHANGED, AND WHY.
 *
 * This is the reconciliation UX, and it is the component that keeps the flow
 * honest. When the server reprices a bag it can find a withdrawn variant, an
 * unpriced one, or a price that has moved since the customer added it — and
 * every one of those must be SAID. A shop that silently drops a line or
 * silently charges a new amount is the failure mode this whole phase is
 * designed around.
 *
 * `role="status"` rather than `role="alert"`: the notice appears on a page the
 * customer has just navigated to, so it will be read in document order
 * anyway, and an assertive interruption on arrival is the wrong register for
 * information that is not an error on their part.
 *
 * WHY THERE IS NO DISMISS BUTTON. The adjustment is a fact about the current
 * order, not a message. It stops being shown when the thing it describes is
 * no longer true — which happens when the snapshot is refreshed — and a
 * dismissable warning about a changed price is a warning a customer can click
 * past without reading.
 */
export function AdjustmentNotice({
  adjustments,
  copy,
  localeTag,
}: {
  adjustments: readonly LineAdjustment[];
  copy: AdjustmentCopy;
  localeTag: string;
}) {
  if (adjustments.length === 0) return null;

  return (
    <div className={styles.adjust} role="status">
      <Mono size="2xs" className={styles.adjustTitle}>
        {copy.title}
      </Mono>
      <ul className={styles.adjustList}>
        {adjustments.map((adjustment, index) => (
          <li key={`${adjustment.kind}-${adjustment.variantId}-${index}`}>
            <Body size="sm">{describe(adjustment, copy, localeTag)}</Body>
          </li>
        ))}
      </ul>
      <Mono size="2xs" className={styles.adjustNote}>
        {copy.note}
      </Mono>
    </div>
  );
}

function describe(adjustment: LineAdjustment, copy: AdjustmentCopy, localeTag: string): string {
  switch (adjustment.kind) {
    case "removed_unknown":
      /* No name — the variant is not in the registry, so there is nothing
         truthful to call it beyond its identifier. */
      return copy.removedUnknown.replace("{id}", adjustment.variantId);
    case "removed_unpriced":
      return copy.removedUnpriced.replace("{name}", adjustment.name);
    case "removed_unavailable":
      return copy.removedUnavailable.replace("{name}", adjustment.name);
    case "repriced":
      return copy.repriced
        .replace("{name}", adjustment.name)
        .replace("{was}", formatPrice(adjustment.was, localeTag))
        .replace("{now}", formatPrice(adjustment.now, localeTag));
    case "quantity_clamped":
      return copy.quantityClamped
        .replace("{name}", adjustment.name)
        .replace("{from}", String(adjustment.from))
        .replace("{to}", String(adjustment.to));
  }
}

/**
 * A blocking condition, stated with the way out.
 *
 * The brief's rule: no generic "something went wrong" when a useful
 * explanation is known. Every block this flow can produce has a name and a
 * step that resolves it, so the notice names both — and the action is a link
 * to that step rather than advice about it.
 */
export function BlockNotice({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className={styles.block} role="alert">
      <Mono size="2xs" className={styles.blockTitle}>
        {title}
      </Mono>
      <Body size="sm" className={styles.blockBody}>
        {body}
      </Body>
      {action ? (
        <Link href={action.href} className={styles.blockAction}>
          {action.label} →
        </Link>
      ) : null}
    </div>
  );
}

/**
 * A whole-page state: commerce switched off, an empty bag, an expired session.
 *
 * Deliberately NOT a 404 and not a redirect. The customer asked for the
 * checkout, so the checkout answers — and says which of the several possible
 * reasons applies. A silent bounce to the catalogue leaves someone who filled
 * in an address wondering what they did wrong.
 */
export function FlowNotice({
  index,
  label,
  title,
  body,
  actions,
}: {
  index: string;
  label: string;
  title: string;
  body: string;
  actions: readonly { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <div className={styles.flow}>
      <div className={styles.flowHead}>
        <Mono size="2xs" className={styles.flowIndex}>
          {index}
        </Mono>
        <Mono size="2xs" className={styles.flowLabel}>
          {label}
        </Mono>
      </div>
      <h1 className={styles.flowTitle}>{title}</h1>
      <Body tone="muted" className={styles.flowBody}>
        {body}
      </Body>
      <div className={styles.flowActions}>
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={action.primary ? styles.flowPrimary : styles.flowSecondary}
          >
            {action.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
