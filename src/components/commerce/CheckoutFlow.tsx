import { Body, Mono } from "@/components/typography";

import styles from "./CheckoutFlow.module.css";

export interface CheckoutStepsCopy {
  contact: { index: string; title: string; note: string; email: string };
  shipping: {
    index: string;
    title: string;
    note: string;
    name: string;
    address: string;
    city: string;
    state: string;
    postal: string;
    country: string;
  };
  payment: { index: string; title: string; note: string };
  confirmation: { index: string; title: string; note: string };
}

/**
 * THE CHECKOUT FLOW — architecture, inert.
 *
 * WHY THERE ARE NO PAYMENT FIELDS, AND WHY THAT IS NOT A SHORTCUT.
 * ----------------------------------------------------------------
 * Step 03 renders no inputs at all. That is not a placeholder standing in for
 * fields we would otherwise have written — it is the correct shape. Card data
 * is captured by the processor's own hosted component (Stripe Elements,
 * Mercado Pago Bricks, or whatever review selects), so a card number never
 * passes through markup this project authors. Hand-rolling a card field would
 * be wrong on a finished site and dangerous on one with no processor behind it.
 *
 * WHY THE OTHER STEPS DO HAVE FIELDS.
 * -----------------------------------
 * Contact and shipping are ordinary form architecture, and rendering them as
 * real `<fieldset disabled>` blocks is the same decision the product page makes
 * for its variant selector: show the real structure in a pending state rather
 * than invent values to populate it. A disabled field collects nothing and
 * submits nothing — the flow comes alive when there is somewhere for it to go.
 *
 * Nothing here is a form element that posts. There is no `<form>`, no action
 * and no handler, because a checkout that appeared to submit and silently did
 * nothing would be exactly the fake integration the project rules forbid.
 */
export function CheckoutFlow({ copy }: { copy: CheckoutStepsCopy }) {
  const { contact, shipping, payment, confirmation } = copy;

  return (
    <ol className={styles.flow}>
      <li className={styles.step}>
        <StepHead index={contact.index} title={contact.title} note={contact.note} />
        <fieldset className={styles.fields} disabled>
          <Field label={contact.email} type="email" span="full" />
        </fieldset>
      </li>

      <li className={styles.step}>
        <StepHead index={shipping.index} title={shipping.title} note={shipping.note} />
        <fieldset className={styles.fields} disabled>
          <Field label={shipping.name} span="full" />
          <Field label={shipping.address} span="full" />
          <Field label={shipping.city} />
          <Field label={shipping.state} />
          <Field label={shipping.postal} />
          <Field label={shipping.country} />
        </fieldset>
      </li>

      <li className={styles.step}>
        <StepHead index={payment.index} title={payment.title} note={payment.note} />
        {/*
         * THE SLOT. Where the processor's hosted component mounts — deliberately
         * empty, and marked as empty. No inputs, by design.
         */}
        <div className={styles.slot} aria-hidden="true" />
      </li>

      <li className={styles.step}>
        <StepHead index={confirmation.index} title={confirmation.title} note={confirmation.note} />
      </li>
    </ol>
  );
}

function StepHead({ index, title, note }: { index: string; title: string; note: string }) {
  return (
    <div className={styles.head}>
      <Mono size="2xs" className={styles.index}>
        {index}
      </Mono>
      <div className={styles.headText}>
        <h2 className={styles.title}>{title}</h2>
        <Body tone="muted" size="sm" className={styles.note}>
          {note}
        </Body>
      </div>
    </div>
  );
}

/**
 * A field. Underlined rather than boxed, matching the catalogue's search input
 * so the system has one field shape.
 *
 * Labelled by a real `<label>` wrapping its control — no `htmlFor`/`id` pairing
 * to keep in sync, and no placeholder standing in for a label, which disappears
 * the moment anyone types.
 */
function Field({
  label,
  type = "text",
  span = "half",
}: {
  label: string;
  type?: "text" | "email";
  span?: "half" | "full";
}) {
  return (
    <label className={styles.field} data-span={span}>
      <Mono size="2xs" className={styles.fieldLabel}>
        {label}
      </Mono>
      <input type={type} className={styles.input} />
    </label>
  );
}
