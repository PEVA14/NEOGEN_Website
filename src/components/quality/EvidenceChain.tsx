import type { ReactNode } from "react";

import { Mono } from "@/components/typography";

import styles from "./EvidenceChain.module.css";

import type { EvidenceLevel } from "@/domain/quality";

export interface EvidenceChainCopy {
  label: string;
  steps: Record<"product" | "variant" | "lot" | "document", { title: string; rule: string }>;
  resolved: string;
  unresolved: string;
}

/**
 * THE EVIDENCE CHAIN — how NEOGEN's documentation resolves, drawn.
 *
 *   PRODUCT → PRESENTATION → LOT → DOCUMENT
 *
 * A diagram of the SYSTEM, which is why it may render when no document
 * exists: it states the rule evidence will follow, not that evidence exists.
 * Each step carries its own one-line rule — "an analysis names a presentation",
 * "a lot COA covers that lot only" — so the reader learns why a badge on one
 * strength does not transfer to another before they ever see a badge.
 *
 * `resolvedTo` marks how far real evidence reaches for the thing being shown.
 * Null — the state of every product today — leaves every node hollow. Marked
 * by shape and by visually-hidden text, never by colour alone.
 */
export function EvidenceChain({
  copy,
  resolvedTo = null,
  variant = "chain",
}: {
  copy: EvidenceChainCopy;
  resolvedTo?: EvidenceLevel | null;
  /**
   * `layers` (the Research hub, colour completion): the same four levels as
   * sheets laid one inside the next — see `Layers`.
   */
  variant?: "chain" | "layers";
}) {
  const order = ["product", "variant", "lot", "document"] as const;
  if (variant === "layers") return <Layers copy={copy} order={order} />;

  return (
    <ol className={styles.chain} aria-label={copy.label}>
      {order.map((step, index) => {
        /* A document at any level resolves the chain through to "document";
           which intermediate steps it passes is what `resolvedTo` says. */
        const reached =
          resolvedTo !== null &&
          (step === "document" ||
            step === "product" ||
            (step === "variant" && (resolvedTo === "variant" || resolvedTo === "lot")) ||
            (step === "lot" && resolvedTo === "lot"));
        return (
          <li key={step} className={styles.step} data-reached={reached ? "true" : undefined}>
            <div className={styles.head}>
              <Mono size="2xs" className={styles.index}>
                {String(index + 1).padStart(2, "0")}
              </Mono>
              <span className={styles.marker} aria-hidden="true" />
            </div>
            <p className={styles.title}>
              {copy.steps[step].title}
              <span className={styles.srOnly}>
                {" — "}
                {reached ? copy.resolved : copy.unresolved}
              </span>
            </p>
            <p className={styles.rule}>{copy.steps[step].rule}</p>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * THE MODEL AS MATERIAL — documentation is not area navigation, so it takes
 * no area colour. This graphic shows how a quality document is bound: the
 * compound holds its presentations, a presentation its lots, a lot the
 * document that examined it — each sheet laid inside the one it belongs to,
 * each saying only what it examined. Paper, stone, chalk, then the document
 * itself in ink: the site's own materials, layered, with the registration
 * marks a document carries. It states the rule, never that a document exists.
 */
function Layers({
  copy,
  order,
}: {
  copy: EvidenceChainCopy;
  order: readonly ("product" | "variant" | "lot" | "document")[];
}) {
  const sheet = (i: number): ReactNode => {
    const step = order[i];
    if (!step) return null;
    return (
      <li className={styles.sheet} data-level={step}>
        {step === "document" ? (
          <>
            <span className={styles.registration} data-corner="tl" aria-hidden="true" />
            <span className={styles.registration} data-corner="br" aria-hidden="true" />
          </>
        ) : null}
        <div className={styles.sheetHead}>
          <Mono size="2xs" className={styles.index}>
            {String(i + 1).padStart(2, "0")}
          </Mono>
          <p className={styles.title}>{copy.steps[step].title}</p>
          <p className={styles.rule}>{copy.steps[step].rule}</p>
        </div>
        {i + 1 < order.length ? <ol className={styles.inner}>{sheet(i + 1)}</ol> : null}
      </li>
    );
  };
  return (
    <ol className={styles.layers} aria-label={copy.label}>
      {sheet(0)}
    </ol>
  );
}
