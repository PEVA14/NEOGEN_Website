import { Body, Mono } from "@/components/typography";
import { formatPrice } from "@/data/commerce/format";

import styles from "./PaymentSlot.module.css";

import type { Money } from "@/data/commerce";
import type { PaymentErrorCode } from "@/payments";

/**
 * THE PAYMENT STEP — every state a processor can put us in, and one of them live.
 *
 * WHY ALL SEVEN ARE BUILT NOW. The brief asked for them, and the reason is
 * sound: these branches are not speculative UI. They are the complete set of
 * things `PaymentAction` can be, plus the three outcomes a payment can have,
 * and each needs different copy, a different affordance and a different
 * promise. Discovering that after a processor is live means designing a
 * failure screen while payments are failing.
 *
 * THE SHAPES, NOT THE PROCESSORS. `embedded`, `redirect` and `instructions`
 * are the three ways a payment can be completed anywhere; nothing below knows
 * whether it is talking to Mercado Pago, Clip or a bank transfer reference.
 * Adding a provider therefore adds no state and no branch here.
 *
 * NO SDK IS LOADED, EVER, and certainly not on a page where no provider
 * exists. The `embedded` branch renders an empty, labelled MOUNT POINT — the
 * processor's own hosted fields go there when there is one. It does not render
 * card inputs, because a card number must never pass through markup this
 * project authors, and hand-rolling one on a site with no processor behind it
 * would be dangerous as well as wrong.
 *
 * THE INACTIVE STATE IS DESIGNED, not disabled. `no_provider` is what every
 * customer sees today, so it gets a real frame, a real explanation and a real
 * next action — the phone number that is NEOGEN's only live channel. A greyed
 * box would read as a broken build; this reads as a deliberate stage.
 */
export type PaymentView =
  /** No adapter configured. The only reachable state today. */
  | { kind: "no_provider" }
  /** The processor's hosted fields mount into our page. */
  | { kind: "embedded"; publicToken: string }
  /** We hand the customer to the processor and they come back. */
  | { kind: "redirect"; url: string }
  /** SPEI or similar: a reference the customer takes to their bank. */
  | { kind: "instructions"; reference: string; expiresAt: string; amount: Money }
  | { kind: "processing" }
  | { kind: "failed"; code: PaymentErrorCode }
  | { kind: "approved" };

export interface PaymentStateCopy {
  title: string;
  body: string;
  /** Label for the affordance, where the state has one. */
  action?: string;
}

export interface PaymentSlotCopy {
  stateLabel: string;
  states: {
    no_provider: PaymentStateCopy & { contactLabel: string };
    embedded: PaymentStateCopy & { mountLabel: string };
    redirect: PaymentStateCopy;
    instructions: PaymentStateCopy & {
      referenceLabel: string;
      amountLabel: string;
      expiresLabel: string;
    };
    processing: PaymentStateCopy;
    failed: PaymentStateCopy & { reasons: Record<PaymentErrorCode, string> };
    approved: PaymentStateCopy;
  };
  /** Short mono badge per state — "SIN PROCESADOR", "APROBADO"… */
  badges: Record<PaymentView["kind"], string>;
}

export function PaymentSlot({
  view,
  copy,
  localeTag,
  contact,
}: {
  view: PaymentView;
  copy: PaymentSlotCopy;
  localeTag: string;
  /** NEOGEN's only live channel, for the states where there is nothing to click. */
  contact: { href: string; display: string };
}) {
  const state = copy.states[view.kind];

  return (
    <div className={styles.slot} data-state={view.kind}>
      <header className={styles.head}>
        <Mono size="2xs" className={styles.stateLabel}>
          {copy.stateLabel}
        </Mono>
        <Mono size="2xs" className={styles.badge}>
          {copy.badges[view.kind]}
        </Mono>
      </header>

      <h3 className={styles.title}>{state.title}</h3>
      <Body tone="muted" size="sm" className={styles.body}>
        {state.body}
      </Body>

      {view.kind === "no_provider" ? (
        <p className={styles.contact}>
          <Mono size="2xs" className={styles.contactLabel}>
            {copy.states.no_provider.contactLabel}
          </Mono>
          <a href={contact.href} className={styles.contactLink}>
            {contact.display}
          </a>
        </p>
      ) : null}

      {view.kind === "embedded" ? (
        /*
         * THE MOUNT POINT. Empty by design — the processor's hosted component
         * attaches here. `aria-hidden` because until it is mounted there is
         * nothing to announce, and a labelled empty region would be a promise
         * of a control that is not there.
         */
        <div className={styles.mount} aria-hidden="true" data-mount="payment">
          <Mono size="2xs" className={styles.mountLabel}>
            {copy.states.embedded.mountLabel}
          </Mono>
        </div>
      ) : null}

      {view.kind === "redirect" ? (
        <a href={view.url} className={styles.action} rel="noopener">
          {copy.states.redirect.action}
        </a>
      ) : null}

      {view.kind === "instructions" ? (
        <dl className={styles.reference}>
          <div className={styles.referenceRow}>
            <Mono as="dt" size="2xs" className={styles.referenceKey}>
              {copy.states.instructions.referenceLabel}
            </Mono>
            {/* Selectable and monospaced: this is a number someone retypes
                into a banking app, so digit shapes must not be ambiguous. */}
            <dd className={styles.referenceValue}>{view.reference}</dd>
          </div>
          <div className={styles.referenceRow}>
            <Mono as="dt" size="2xs" className={styles.referenceKey}>
              {copy.states.instructions.amountLabel}
            </Mono>
            <dd className={styles.referenceValue}>{formatPrice(view.amount, localeTag)}</dd>
          </div>
          <div className={styles.referenceRow}>
            <Mono as="dt" size="2xs" className={styles.referenceKey}>
              {copy.states.instructions.expiresLabel}
            </Mono>
            <dd className={styles.referenceValue}>
              {new Intl.DateTimeFormat(localeTag, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(view.expiresAt))}
            </dd>
          </div>
        </dl>
      ) : null}

      {view.kind === "failed" ? (
        <Mono size="2xs" className={styles.reason}>
          {copy.states.failed.reasons[view.code]}
        </Mono>
      ) : null}
    </div>
  );
}
