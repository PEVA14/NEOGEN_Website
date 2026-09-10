/**
 * THE CHECKOUT DOMAIN.
 *
 * Pure over plain data — no request, no React, no storage — which is what lets
 * `scripts/check-checkout.mjs` exercise the rules that matter (server-side
 * repricing, quantity clamping, placement gates) without a browser or a build.
 *
 * Note what is NOT re-exported: `pricing.ts`. It reads the catalogue and the
 * price map, so a client component that reached it through this barrel would
 * pull all 85 products and 147 prices into the browser bundle — the exact leak
 * `check:output` guards against. Server callers import it directly.
 */
export {
  CHECKOUT_STEPS,
  MX_STATES,
  type AcceptedAcknowledgement,
  type CheckoutDraft,
  type CheckoutStepId,
  type Contact,
  type DeliveryMethod,
  type DeliveryMethodId,
  type DeliverySelection,
  type IssueCode,
  type LineAdjustment,
  type MxAddress,
  type PriceSnapshot,
  type PricedLine,
  type ValidationIssue,
} from "./types";

export {
  clean,
  digits,
  formatAddress,
  formatPhoneDisplay,
  isEmail,
  isMxPhone,
  isMxPostalCode,
  isMxState,
  normaliseAddress,
  normaliseContact,
  validateAddress,
  validateContact,
} from "./validate";

export {
  isQuotable,
  methodById,
  methodsFor,
  provisionalShipping,
  routeForAddress,
  select,
} from "./delivery";

export {
  canEnter,
  firstIncomplete,
  missingAcknowledgements,
  placementBlock,
  progression,
  stepComplete,
  type PlacementBlock,
  type StepState,
} from "./steps";

export {
  createDraft,
  EMPTY_SNAPSHOT,
  markAttempted,
  newDraftId,
  snapshotMatches,
  touch,
  withSnapshot,
} from "./draft";
