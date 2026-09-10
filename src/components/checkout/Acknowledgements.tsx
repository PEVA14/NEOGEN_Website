import Link from "next/link";

import { Mono } from "@/components/typography";

import styles from "./Acknowledgements.module.css";

export interface AcknowledgementItem {
  id: string;
  version: string;
  /** Localized declaration text. Only ever present for an APPROVED declaration. */
  label: string;
  required: boolean;
  /** The policy being agreed to. Null when the declaration stands alone. */
  policy: { href: string; label: string } | null;
}

/**
 * DECLARATIONS — and today, nothing.
 *
 * `items` is empty because no declaration is approved and no policy behind one
 * is approved (`domain/acknowledgements`, `content/policies`). So this renders
 * null, and the review screen has no checkboxes.
 *
 * THAT IS THE FEATURE. A checkbox reading "I accept the Terms & Conditions"
 * beside a link that 404s collects a consent to a document the customer could
 * not read and NEOGEN cannot produce — which is worse than no checkbox, both
 * as an experience and as evidence. So the framework is complete, iterates
 * data, and shows the honest zero.
 *
 * WHEN THEY ARRIVE: each is an unchecked box carrying the declaration text and
 * a link to its policy, and the id AND VERSION accepted are persisted on the
 * order. Nothing is pre-ticked — a pre-ticked consent is not a consent.
 */
export function Acknowledgements({
  items,
  copy,
}: {
  items: readonly AcknowledgementItem[];
  copy: { title: string; requiredNote: string };
}) {
  if (items.length === 0) return null;

  return (
    <fieldset className={styles.set}>
      <legend className={styles.legend}>
        <Mono size="2xs">{copy.title}</Mono>
      </legend>

      {items.map((item) => (
        <div key={item.id} className={styles.item}>
          <label className={styles.label}>
            <input
              type="checkbox"
              /* One field name for all of them, read with `getAll` — so adding
                 a declaration needs no change to the action. */
              name="acknowledge"
              value={item.id}
              required={item.required}
              className={styles.checkbox}
            />
            <span className={styles.text}>
              {item.label}
              {item.policy ? (
                <>
                  {" "}
                  <Link href={item.policy.href} className={styles.policy}>
                    {item.policy.label}
                  </Link>
                </>
              ) : null}
            </span>
          </label>
        </div>
      ))}

      <Mono size="2xs" className={styles.note}>
        {copy.requiredNote}
      </Mono>
    </fieldset>
  );
}
