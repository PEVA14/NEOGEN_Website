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
 * TWO KINDS OF DECLARATION, AND THE DIFFERENCE DECIDES WHAT EACH NEEDS.
 * ---------------------------------------------------------------------
 * An AGREEMENT is consent to a document: the Terms, a privacy notice. It is
 * publishable only when its own copy is approved AND the policy it points at
 * is approved. A checkbox reading "I accept the Terms" beside a link that 404s
 * collects a consent to a document the customer could not read and NEOGEN
 * cannot produce — worse than no checkbox, both as an experience and as
 * evidence. No policy is approved (see `content/policies.ts`), so every
 * agreement here still renders nothing.
 *
 * A CONDITION OF SALE is different in kind. It is not consent to NEOGEN's
 * text; it is the customer stating what they are doing. "I am acquiring this
 * material for research work and not for consumption or human use" is a fact
 * about the buyer's own intent, it needs no document behind it to be
 * meaningful, and it is exactly what the rest of the site already says on
 * every product surface. So it publishes on owner approval alone.
 *
 * THE RESEARCH-USE DECLARATION IS STILL NOT A SAFE HARBOUR. COFEPRIS applies
 * a "use destined" criterion: a ticked box does not change what a product is,
 * and it does not make a transaction lawful. It is collected because the
 * condition should be explicit on both sides and because an order ought to
 * carry evidence of what was agreed — never as a defence, and never as a
 * reason to soften anything else on the site.
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

/**
 * What the customer is doing when they tick the box.
 *
 * `agreement` — consenting to a NEOGEN document. Needs that document approved.
 * `condition-of-sale` — declaring something about their own purchase. Needs
 * only its own wording approved, because there is no document to read.
 */
export type AcknowledgementKind = "agreement" | "condition-of-sale";

export interface AcknowledgementDefinition {
  id: string;
  kind: AcknowledgementKind;
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
  {
    id: "age-18",
    kind: "agreement",
    version: "0",
    required: true,
    policy: "terms",
    status: "draft",
  },
  {
    id: "terms",
    kind: "agreement",
    version: "0",
    required: true,
    policy: "terms",
    status: "draft",
  },
  {
    /*
     * THE RESEARCH-USE DECLARATION — published, required, and blocking.
     *
     * Owner instruction (2026-09-20): a customer must explicitly acknowledge
     * the research-use condition before completing a purchase, and must not be
     * able to proceed without it. That instruction is what approves this
     * declaration; the wording it approves is `checkout.steps.review
     * .acknowledgements.declarations["research-use"]` in the dictionaries.
     *
     * It is a CONDITION OF SALE, not an agreement, so it does not wait on the
     * research-use policy document — which remains a draft, and which would
     * add nothing to a statement the customer is making about themselves.
     *
     * VERSION 1 IS THE FIRST PUBLISHED WORDING. If counsel changes a word of
     * it, bump the version: acceptances are stored as `id@version`, so a new
     * version deliberately stops inheriting consent given to the old text
     * rather than quietly re-labelling it.
     */
    id: "research-use",
    kind: "condition-of-sale",
    version: "1",
    required: true,
    policy: null,
    status: "approved",
  },
];

export const acknowledgements: readonly AcknowledgementDefinition[] = ACKNOWLEDGEMENTS;

/**
 * Publishable — approved wording, plus an approved policy for an agreement.
 *
 * The policy half is the important half for an agreement. It is what makes it
 * structurally impossible to publish a declaration whose linked document is
 * not approved, rather than something a reviewer has to remember.
 *
 * A condition of sale that names a policy is held to the same rule: if a
 * declaration points at a document, the document has to exist. Only a
 * standalone declaration — one the customer can fully read in the checkbox
 * itself — is exempt, because there is nothing else for them to read.
 */
export function isPublishable(ack: AcknowledgementDefinition): boolean {
  if (ack.status !== "approved") return false;
  if (ack.policy === null) return ack.kind === "condition-of-sale";
  const policy = policyById(ack.policy);
  return policy !== undefined && isApproved(policy);
}

/** What the checkout renders: the research-use condition, today. */
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
