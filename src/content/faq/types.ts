import type { Locale } from "@/i18n/config";

/**
 * FAQ — customer questions, answered only where there is an answer.
 *
 * THE HARD PART OF AN FAQ IS NOT WRITING IT. It is refusing to write the four
 * or five entries whose answers nobody has decided yet — returns, cancellation
 * windows, the age rule, the shipping rate below the free threshold. Those
 * questions are exactly the ones a customer most wants answered, which is
 * precisely why an invented answer does the most damage.
 *
 * So an entry carries a status like every other content module in this
 * codebase, and `blockedOn` states what the owner has to decide before the
 * status can move. `blockedOn` is internal: it is never rendered, because an
 * FAQ that answers "we haven't decided" is worse than one that does not raise
 * the question — see `docs/PROJECT_STATE.md` §4 on placeholder language.
 *
 * ANSWERS THAT CONTAIN FACTS INTERPOLATE THEM. A shipping estimate written out
 * as prose is a copy of a fact, and copies drift. `{priorityDays}` and the
 * other tokens below are filled at render from `domain/fulfilment` and
 * `config/site`, which are the same sources the checkout quotes from — so the
 * FAQ cannot promise a delivery the checkout would not make.
 */
export type LocalizedText = Readonly<Record<Locale, string>>;

export type FaqTopic =
  "peptides" | "research-use" | "documentation" | "ordering" | "shipping" | "handling" | "contact";

export type FaqStatus = "draft" | "owner-review" | "approved";

/**
 * A value an answer may interpolate. A closed set: a token nothing resolves
 * would render as a literal `{brace}` on a customer's screen, so the resolver
 * covers every member and the gate proves that every token used exists.
 */
export type FaqValueId =
  /** "Guadalajara y Durango" — the confirmed one-business-day zone. */
  | "priorityZone"
  /** Business days to the priority zone. */
  | "priorityDays"
  /** Business days elsewhere in Mexico. */
  | "nationalDays"
  /** Business days for a made-to-order presentation. */
  | "madeToOrderDays"
  /** The free-shipping threshold, formatted as currency. */
  | "freeShipping"
  /** The one contact number, formatted for reading. */
  | "phone"
  /** How many compounds the catalogue publishes. */
  | "catalogueCount";

/**
 * An internal destination an answer may link to. Route ids, not URLs, so a
 * link here goes through `config/routes` and cannot point at a page that does
 * not exist.
 */
export type FaqLinkId =
  | "peptides"
  | "products"
  | "research"
  | "articles"
  | "article:que-es-un-peptido"
  | "article:uso-exclusivo-en-investigacion"
  | "article:como-leer-un-certificado-de-analisis"
  | "article:manejo-y-almacenamiento-en-laboratorio";

export interface FaqEntry {
  id: string;
  topic: FaqTopic;
  status: FaqStatus;
  question: LocalizedText;
  /** May contain `{token}` placeholders from `FaqValueId`. */
  answer: LocalizedText;
  /** Where to read more. Rendered as a short row of links under the answer. */
  links?: readonly FaqLinkId[];
  /**
   * INTERNAL. What must be decided or supplied before this entry may be
   * approved. Never rendered to a customer; read by the owner and by
   * `check:content`, which requires every unapproved entry to name one.
   */
  blockedOn?: string;
}
