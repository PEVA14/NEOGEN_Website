import Link from "next/link";

import { Mono } from "@/components/typography";
import { VisuallyHidden } from "@/components/primitives";

import styles from "./CheckoutProgress.module.css";

import type { CheckoutStepId, StepState } from "@/domain/checkout";

export interface ProgressCopy {
  /** Names the whole progression for assistive technology. */
  label: string;
  /** "Paso {n} de {total}" — announced, not drawn. */
  stepOf: string;
  completed: string;
  current: string;
  steps: Record<CheckoutStepId, string>;
}

/**
 * THE PROGRESSION — an instrument scale, not a wizard's breadcrumb.
 *
 * The brief's requirement is that the customer always knows where they are,
 * what is complete and what remains. Three states, and each is legible without
 * colour: a completed step is a LINK carrying a filled index, the current step
 * is heavier and rule-marked, a future step is muted and inert.
 *
 * WHY COMPLETED STEPS ARE LINKS. Going back to fix an address is the single
 * most common thing anyone does in a checkout, and making them use the
 * browser's back button — which re-posts, or lands on a stale render — is how
 * a flow feels fragile. Forward steps are NOT links: `canEnter` would refuse
 * them anyway, and a link that bounces you back is worse than no link.
 *
 * `aria-current="step"` is what actually communicates position; the numerals
 * are decoration over it. The screen-reader text spells out "step 3 of 6"
 * because "03" alone tells a listener nothing about how much is left.
 */
export function CheckoutProgress({
  steps,
  copy,
  hrefFor,
}: {
  steps: readonly StepState[];
  copy: ProgressCopy;
  /** Localized path for a step, or null when it must not be a link. */
  hrefFor: (step: CheckoutStepId) => string | null;
}) {
  const total = steps.length;

  return (
    <nav aria-label={copy.label} className={styles.progress}>
      <ol className={styles.list}>
        {steps.map((step, index) => {
          const href = hrefFor(step.id);
          /* Linked only if it is DONE and not where we already are. */
          const linked = step.complete && !step.current && href !== null;
          const state = step.current ? "current" : step.complete ? "complete" : "pending";

          const inner = (
            <>
              <Mono size="2xs" className={styles.index}>
                {step.index}
              </Mono>
              <span className={styles.name}>{copy.steps[step.id]}</span>
              <VisuallyHidden>
                {" — "}
                {copy.stepOf.replace("{n}", String(index + 1)).replace("{total}", String(total))}
                {step.complete ? ` — ${copy.completed}` : null}
                {step.current ? ` — ${copy.current}` : null}
              </VisuallyHidden>
            </>
          );

          return (
            <li
              key={step.id}
              className={styles.step}
              data-state={state}
              aria-current={step.current ? "step" : undefined}
            >
              {linked ? (
                <Link href={href} className={styles.link}>
                  {inner}
                </Link>
              ) : (
                <span className={styles.static}>{inner}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
