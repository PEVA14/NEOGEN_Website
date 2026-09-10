import { isApproved, policyById } from "@/content/policies";

import type { PolicyId } from "@/content/policies";
import type { AcceptedAcknowledgement } from "@/domain/checkout/types";

/**
 * ACKNOWLEDGEMENTS — a data-driven declaration framework that renders nothing.
 *
 * The architecture the Commercial Architecture Plan called for: declarations
 * are DATA, the checkout iterates them, and adding an age gate or a terms
 * checkbox later is an entry in this list rather than a change to a form.
 *
 * TODAY IT RENDERS ZERO, and that is the correct output rather than a gap.
 * A checkbox saying "I accept the Terms" next to a link that 404s is worse
 * than no checkbox: it collects a consent to a document the customer could not
 * read and NEOGEN cannot produce. So a declaration is publishable only when
 * its own copy is approved AND the policy it points at is approved — and no
 * policy is (see `content/policies.ts`).
 *
 * WHAT GETS PERSISTED, AND WHY IT IS THE ID AND VERSION.
 * -----------------------------------------------------
 * Policy text changes. An order that recorded "accepted the Terms" would, a
 * year later, be a record of accepting whatever the Terms happen to say then —
 * which is not evidence of anything. Recording `terms@2` pins the acceptance
 * to a specific text, and bumping the version deliberately invalidates old
 * consent rather than silently inheriting it.
 */
export type AcknowledgementStatus = "draft" | "owner-review" | "counsel-review" | "approved";

export interface AcknowledgementDefinition {
  id: string;
  /**
   * Bumped whenever the declaration's own wording or its policy changes.
   *
   * A string, not a number, so a version can carry a date if that turns out
   * to be how counsel wants them identified.
   */
  version: string;
  /** Required declarations block order creation. Optional ones do not. */
  required: boolean;
  /** The document being agreed to. Null for a declaration that stands alone. */
  policy: PolicyId | null;
  status: AcknowledgementStatus;
}

/**
 * THE DECLARATIONS UNDER CONSIDERATION — all drafts.
 *
 * Listed so the framework has something real to be tested against and so the
 * owner can see exactly what is proposed, not because any of it is ready. The
 * wording of each is deliberately absent: copy is localized and would live in
 * the dictionaries, and writing it here would be writing legal text.
 */
const ACKNOWLEDGEMENTS: readonly AcknowledgementDefinition[] = [
  /*
   * Age. The owner asked for "a simple one, +18 for now, maybe in the ToS".
   * That is a decision to make one, not an approved declaration — and if it
   * lands inside the Terms it may not need to be a separate checkbox at all.
   */
  { id: "age-18", version: "0", required: true, policy: "terms", status: "draft" },
  { id: "terms", version: "0", required: true, policy: "terms", status: "draft" },
  {
    /*
     * The research-use declaration. NOT a legal safe harbour: COFEPRIS
     * applies a "use destined" criterion, so a customer ticking a box does
     * not change what a product is. It is listed as a candidate declaration
     * and nothing more, and it must not ship before the classification review.
     */
    id: "research-use",
    version: "0",
    required: true,
    policy: "research-use",
    status: "draft",
  },
];

export const acknowledgements: readonly AcknowledgementDefinition[] = ACKNOWLEDGEMENTS;

/**
 * Publishable — approved copy AND an approved policy behind it.
 *
 * The policy half is the important half. It is what makes it structurally
 * impossible to publish a declaration whose linked document is not approved,
 * rather than something a reviewer has to remember.
 */
export function isPublishable(ack: AcknowledgementDefinition): boolean {
  if (ack.status !== "approved") return false;
  if (ack.policy === null) return true;
  const policy = policyById(ack.policy);
  return policy !== undefined && isApproved(policy);
}

/** What the checkout renders. Empty today. */
export function publicAcknowledgements(): readonly AcknowledgementDefinition[] {
  return ACKNOWLEDGEMENTS.filter(isPublishable);
}

export function requiredAcknowledgements(): readonly AcknowledgementDefinition[] {
  return publicAcknowledgements().filter((a) => a.required);
}

/**
 * Record an acceptance — refusing anything unpublishable.
 *
 * The server action calls this rather than trusting the ids that arrive in a
 * form body. Without it, a posted `research-use=on` would store consent to a
 * declaration the site never showed and never approved.
 */
export function accept(
  ids: readonly string[],
  at: string = new Date().toISOString(),
): readonly AcceptedAcknowledgement[] {
  const publishable = new Map(publicAcknowledgements().map((a) => [a.id, a]));
  return ids
    .map((id) => publishable.get(id))
    .filter((a): a is AcknowledgementDefinition => a !== undefined)
    .map((a) => ({ id: a.id, version: a.version, acceptedAt: at }));
}
