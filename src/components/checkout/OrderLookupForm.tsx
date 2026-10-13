"use client";

import { useActionState } from "react";

import { lookupOrder, type LookupState } from "@/server/orderLookup";

import { Field } from "./Field";

import styles from "./OrderLookupForm.module.css";

export interface OrderLookupCopy {
  order: { label: string; hint: string };
  email: { label: string; hint: string };
  submit: string;
  pending: string;
  errors: Record<Exclude<LookupState["status"], "idle">, string>;
}

const INITIAL: LookupState = { status: "idle", order: "", email: "" };

/**
 * THE "RASTREAR MI PEDIDO" FORM — two fields and one answer.
 *
 * `useActionState` keeps what was typed when the answer is "no match", so a
 * typo is fixed in place; without JavaScript the same server action runs as a
 * plain form post. A match redirects to the order's status page.
 *
 * One message for every failure that could reveal something: a missing order
 * and a wrong email read the same.
 */
export function OrderLookupForm({ locale, copy }: { locale: string; copy: OrderLookupCopy }) {
  const [state, action, pending] = useActionState(lookupOrder, INITIAL);
  const failed = state.status !== "idle";

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="locale" value={locale} />

      {failed ? (
        <p className={styles.error} role="alert">
          {copy.errors[state.status as Exclude<LookupState["status"], "idle">]}
        </p>
      ) : null}

      <div className={styles.fields}>
        <Field
          name="order"
          autoComplete="off"
          maxLength={40}
          copy={copy.order}
          defaultValue={state.order}
          required
        />
        <Field
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          copy={copy.email}
          defaultValue={state.email}
          required
        />
      </div>

      <div>
        <button type="submit" className={styles.submit} disabled={pending}>
          {pending ? copy.pending : copy.submit}
        </button>
      </div>
    </form>
  );
}
