"use client";

import { useEffect, useRef, useState } from "react";

import { ValueRoll } from "@/components/motion/ValueRoll";
import { useIndicator } from "@/components/motion/useIndicator";

import styles from "./QualityRecord.module.css";

export interface InHandPresentation {
  variantId: string;
  /** "10 mg × 10 viales". */
  label: string;
  /** Public documents resolved for exactly this presentation. */
  documents: number;
}

export interface PresentationInHandCopy {
  /** "En inspección". */
  label: string;
  /** Accessible name of the presentation choice. */
  choose: string;
  /** "Documentos publicados". */
  documents: string;
  /** "Certificados y validación" — in place of the count when it is 0. */
  onRequestLabel: string;
  /** "Bajo solicitud tras la compra". */
  onRequest: string;
}

/**
 * THE PRESENTATION IN HAND — the quality record inspects what is being bought.
 *
 * A document is bound to the exact presentation it examined (the evidence
 * model), so the record reads the presentation chosen in the buy box above
 * and says what is on file for that one: its code, its strength and pack,
 * and how many public documents name it. Choosing another presentation here
 * chooses it in the buy box too — it is one choice, shown where the price is
 * and where the evidence is (the bench and its rail follow it as well).
 *
 * The buy box's own radios are the single source of truth: this listens to
 * their `change` and, to choose, clicks the matching radio. Nothing here can
 * show a document, a state or a count the resolver did not produce. With
 * nothing published for the presentation, it does not show a 0 — which read
 * as "no documentation exists" — but NEOGEN's policy: certificates and
 * validation are available on request after purchase (owner, 2026-10-07).
 * Without script, the record above states the policy once.
 */
export function PresentationInHand({
  presentations,
  copy,
}: {
  presentations: readonly InHandPresentation[];
  copy: PresentationInHandCopy;
}) {
  const [selected, setSelected] = useState(presentations[0]?.variantId ?? "");
  const options = useRef<HTMLDivElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  useIndicator(options, mark, '[aria-pressed="true"]', selected);

  useEffect(() => {
    /* Both start on the first presentation (the buy box's own default). */
    const ids = new Set(presentations.map((p) => p.variantId));
    const change = (event: Event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement && input.type === "radio" && ids.has(input.value)) {
        setSelected(input.value);
      }
    };
    document.addEventListener("change", change);
    return () => document.removeEventListener("change", change);
  }, [presentations]);

  const choose = (id: string) => {
    const input = [...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')].find(
      (radio) => radio.value === id,
    );
    /* The buy box decides; its change event brings the choice back here. */
    if (input) input.click();
    else setSelected(id);
  };

  const index = Math.max(
    0,
    presentations.findIndex((p) => p.variantId === selected),
  );
  const current = presentations[index];
  if (!current) return null;
  const code = (i: number) => `P-${String(i + 1).padStart(2, "0")}`;

  return (
    <div className={styles.inHand}>
      <p className={styles.inHandLabel}>
        {copy.label} ·{" "}
        <span className={styles.inHandCode}>
          <ValueRoll value={code(index)} />
        </span>{" "}
        / {String(presentations.length).padStart(2, "0")}
      </p>

      {presentations.length > 1 ? (
        <div className={styles.codes} ref={options} role="group" aria-label={copy.choose}>
          <span ref={mark} className={styles.codeMark} aria-hidden="true" />
          {presentations.map((p, i) => (
            <button
              key={p.variantId}
              type="button"
              className={styles.code}
              aria-pressed={p.variantId === selected}
              aria-label={`${code(i)} — ${p.label}`}
              onClick={() => choose(p.variantId)}
            >
              {code(i)}
            </button>
          ))}
        </div>
      ) : null}

      <dl className={styles.inHandFacts} aria-live="polite">
        <div>
          <dt className={styles.srOnly}>{copy.label}</dt>
          <dd className={styles.inHandName}>
            <ValueRoll value={current.label} />
          </dd>
        </div>
        <div className={styles.inHandCount}>
          {current.documents > 0 ? (
            <>
              <dt>{copy.documents}</dt>
              <dd>{current.documents}</dd>
            </>
          ) : (
            <>
              <dt>{copy.onRequestLabel}</dt>
              <dd data-policy="">{copy.onRequest}</dd>
            </>
          )}
        </div>
      </dl>
    </div>
  );
}
