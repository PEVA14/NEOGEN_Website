import type { Locale } from "@/i18n/config";

/**
 * POLICIES — the route infrastructure, with no legal text in it.
 *
 * NEOGEN has no approved Terms, Privacy notice, shipping policy or returns
 * policy. Counsel has not reviewed anything, and the owner's answer on the
 * research-use position was explicitly provisional. So this module holds the
 * SLOTS and a review status, and the route serves only what is `approved`.
 *
 * WHY A STATUS FIELD RATHER THAN "IS IT WRITTEN YET".
 * --------------------------------------------------
 * Because written is not the bar. A policy passes through the owner and then
 * counsel, and text that exists but has not cleared both is more dangerous
 * than no text at all — it is a published promise nobody has agreed to. The
 * status is therefore the gate on PUBLICATION, not a progress note: `draft`,
 * `owner-review` and `counsel-review` all render nothing, and only `approved`
 * reaches a customer.
 *
 * The consequence is deliberate: every route below 404s today. An empty policy
 * page is worse than a missing one, because a customer who finds a Terms page
 * with nothing on it has been told the terms are nothing.
 */
export type PolicyStatus = "draft" | "owner-review" | "counsel-review" | "approved";

export type PolicyId =
  "terms" | "privacy" | "shipping" | "returns" | "quality" | "research-use" | "medical-disclaimer";

export interface Policy {
  id: PolicyId;
  /** URL segment under /politicas. Spanish, matching every other route. */
  slug: string;
  status: PolicyStatus;
  /**
   * ISO date the CURRENT text was approved. Null while unapproved.
   *
   * This is the date a customer is shown and the date an acceptance is
   * recorded against, so it is never a "last edited" convenience value.
   */
  approvedOn: string | null;
  /**
   * The text, per locale, as paragraphs.
   *
   * Null throughout. When counsel supplies text it lands here and the status
   * moves in the same change — the two must not be editable independently, or
   * a body could be added without a review and go straight out.
   */
  body: Record<Locale, readonly string[]> | null;
}

const POLICIES: readonly Policy[] = [
  { id: "terms", slug: "terminos", status: "draft", approvedOn: null, body: null },
  { id: "privacy", slug: "privacidad", status: "draft", approvedOn: null, body: null },
  { id: "shipping", slug: "envios", status: "draft", approvedOn: null, body: null },
  { id: "returns", slug: "devoluciones", status: "draft", approvedOn: null, body: null },
  { id: "quality", slug: "calidad", status: "draft", approvedOn: null, body: null },
  {
    /*
     * The research-use notice. The owner's position is that products carry a
     * short "for research purposes only" statement. That statement is a
     * PRODUCT LABEL, and it already appears on the product surfaces; this
     * policy would be the document behind it, which does not exist.
     */
    id: "research-use",
    slug: "uso-investigacion",
    status: "draft",
    approvedOn: null,
    body: null,
  },
  {
    id: "medical-disclaimer",
    slug: "aviso-medico",
    status: "draft",
    approvedOn: null,
    body: null,
  },
];

export const policies: readonly Policy[] = POLICIES;

export function isApproved(policy: Policy): boolean {
  /* Both halves, deliberately: an approved status with no text would render an
     empty page, and text with an unapproved status is unreviewed. */
  return policy.status === "approved" && policy.body !== null && policy.approvedOn !== null;
}

/** The only policies that may be rendered publicly. Empty today. */
export function publicPolicies(): readonly Policy[] {
  return POLICIES.filter(isApproved);
}

export function policyById(id: PolicyId): Policy | undefined {
  return POLICIES.find((p) => p.id === id);
}

/** Resolve a URL segment to a PUBLISHABLE policy. Unapproved → undefined → 404. */
export function publicPolicyBySlug(slug: string): Policy | undefined {
  return publicPolicies().find((p) => p.slug === slug);
}

export function policyStatus(id: PolicyId): PolicyStatus {
  return policyById(id)?.status ?? "draft";
}
