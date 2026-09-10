import { requiredAcknowledgements } from "@/domain/acknowledgements";

import { CHECKOUT_STEPS } from "./types";
import { isQuotable } from "./delivery";
import { validateAddress, validateContact } from "./validate";

import type { CheckoutDraft, CheckoutStepId } from "./types";

/**
 * PROGRESSION — derived from the draft, never stored.
 *
 * The brief's requirement is that the customer always knows where they are,
 * what is complete and what remains. The reliable way to deliver that is to
 * make completeness a FUNCTION of the data rather than a cursor that advances:
 * a stored "current step" and a half-filled address can disagree, and when
 * they do the customer is told they finished something they did not.
 *
 * So a step is complete when the data it collects is valid. Going back and
 * clearing a field un-completes it, and every screen agrees instantly because
 * they all ask the same function.
 */

export interface StepState {
  id: CheckoutStepId;
  index: string;
  complete: boolean;
  /** Reachable — every earlier step is complete. */
  available: boolean;
  current: boolean;
}

/**
 * Is this step's own data satisfied?
 *
 * `payment` is the interesting case. It collects nothing today: there is no
 * configured provider, so there is no instrument to choose and no intent to
 * create. Rather than mark it permanently incomplete — which would make the
 * progression indicator lie about a step the customer genuinely finished — it
 * is complete once they have continued past it. When a real adapter is
 * registered, this is the one line that changes.
 */
export function stepComplete(draft: CheckoutDraft, step: CheckoutStepId): boolean {
  switch (step) {
    case "contact":
      return validateContact(draft.contact).length === 0;
    case "shipping":
      return validateAddress(draft.address).length === 0;
    case "delivery":
      return draft.delivery !== null;
    case "payment":
      return draft.attempted.payment === true;
    case "review":
      return draft.orderId !== null;
    case "confirmation":
      return draft.orderId !== null;
  }
}

/** Every acknowledgement that must be accepted before an order may be created. */
export function missingAcknowledgements(draft: CheckoutDraft): readonly string[] {
  const accepted = new Set(draft.acknowledged.map((a) => `${a.id}@${a.version}`));
  return requiredAcknowledgements()
    .filter((ack) => !accepted.has(`${ack.id}@${ack.version}`))
    .map((ack) => ack.id);
}

/**
 * Can an order actually be created from this draft?
 *
 * Every gate stated once, in the order a customer meets them, and returning
 * a CODE rather than a boolean so the review screen can say which one stopped
 * it instead of disabling a button with no explanation.
 */
export type PlacementBlock =
  | "empty"
  | "contact_incomplete"
  | "shipping_incomplete"
  | "delivery_missing"
  | "delivery_unquotable"
  | "acknowledgements_missing"
  | "already_placed";

export function placementBlock(draft: CheckoutDraft): PlacementBlock | null {
  if (draft.orderId) return "already_placed";
  if (draft.snapshot.lines.length === 0) return "empty";
  if (!stepComplete(draft, "contact")) return "contact_incomplete";
  if (!stepComplete(draft, "shipping")) return "shipping_incomplete";
  if (!draft.delivery) return "delivery_missing";
  /* No rate model below the free-shipping threshold — a hard stop, not a
     guessed number. The delivery screen explains it; this is the enforcement. */
  if (!isQuotable(draft.delivery)) return "delivery_unquotable";
  if (missingAcknowledgements(draft).length > 0) return "acknowledgements_missing";
  return null;
}

/** The whole progression, for the indicator. */
export function progression(draft: CheckoutDraft, current: CheckoutStepId): readonly StepState[] {
  let available = true;
  return CHECKOUT_STEPS.map((id, i) => {
    const complete = stepComplete(draft, id);
    const state: StepState = {
      id,
      index: String(i + 1).padStart(2, "0"),
      complete,
      available,
      current: id === current,
    };
    /* A step is reachable only if everything before it is done. Confirmation
       is therefore unreachable until an order exists, which is correct. */
    available = available && complete;
    return state;
  });
}

/** Where a customer entering checkout should land. */
export function firstIncomplete(draft: CheckoutDraft): CheckoutStepId {
  for (const step of CHECKOUT_STEPS) {
    if (step === "confirmation") break;
    if (!stepComplete(draft, step)) return step;
  }
  return "review";
}

/**
 * May this customer view this step?
 *
 * Enforced on the SERVER at render time, not by hiding links: a URL typed
 * directly must not skip validation, because the steps it skips are the ones
 * that collect the address the order ships to.
 */
export function canEnter(draft: CheckoutDraft, step: CheckoutStepId): boolean {
  const order = CHECKOUT_STEPS.indexOf(step);
  for (let i = 0; i < order; i += 1) {
    if (!stepComplete(draft, CHECKOUT_STEPS[i])) return false;
  }
  return true;
}
