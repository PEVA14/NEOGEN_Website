import { siteConfig } from "@/config/site";
import { formatPrice } from "@/data/commerce/format";
import { publishedProducts } from "@/data/catalog";
import { fulfilmentFacts, priorityZone } from "@/domain/fulfilment";
import { localeTags, type Locale } from "@/i18n/config";

import { FAQ_ENTRIES } from "./registry";

import type { FaqEntry, FaqLinkId, FaqTopic, FaqValueId } from "./types";

export { FAQ_ENTRIES } from "./registry";
export type { FaqEntry, FaqLinkId, FaqStatus, FaqTopic, FaqValueId } from "./types";

/**
 * FAQ — resolution.
 *
 * Server-only by construction: it reads the catalogue to count compounds. The
 * page resolves the entries and passes plain strings down, so no registry
 * reaches the browser.
 *
 * The answer a customer reads is assembled here, from the facts, at render
 * time. That is the whole point of the token layer: change the free-shipping
 * threshold in `config/site.ts` and this page changes with the checkout, in
 * the same commit, with no chance of the two disagreeing.
 */

/** A question with its facts filled in and its links resolved to labels. */
export interface ResolvedFaqEntry {
  id: string;
  topic: FaqTopic;
  question: string;
  answer: string;
  links: readonly FaqLinkId[];
}

/**
 * Every value a token can carry, for one locale.
 *
 * `and` is passed into `priorityZone` rather than hard-coded, because the
 * conjunction between two city names is copy, and copy is localized.
 */
function values(locale: Locale, and: string): Record<FaqValueId, string> {
  const facts = fulfilmentFacts();
  const tag = localeTags[locale];
  return {
    priorityZone: priorityZone(and),
    priorityDays: String(facts.priorityDays),
    nationalDays: String(facts.nationalDays),
    madeToOrderDays: String(facts.madeToOrderDays),
    freeShipping: formatPrice(
      { amount: facts.freeShippingThreshold, currency: siteConfig.market.currency },
      tag,
    ),
    phone: siteConfig.contact.phoneDisplay,
    catalogueCount: String(publishedProducts.length),
  };
}

/** Tokens a text uses, in order of appearance. Used by the gate. */
export function tokensIn(text: string): readonly string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]);
}

export function isPublishableEntry(entry: FaqEntry): boolean {
  if (entry.status !== "approved") return false;
  /* An approved entry with an empty answer in either locale would render a
     question with nothing under it — which is how an FAQ acquires the "we
     haven't decided" rows this module exists to prevent. */
  return entry.question.es !== "" && entry.answer.es !== "" && entry.answer.en !== "";
}

/** What renders. Unapproved entries and their `blockedOn` notes never leave here. */
export function publicFaq(locale: Locale, and: string): readonly ResolvedFaqEntry[] {
  const table = values(locale, and);
  return FAQ_ENTRIES.filter(isPublishableEntry).map((entry) => ({
    id: entry.id,
    topic: entry.topic,
    question: entry.question[locale],
    answer: entry.answer[locale].replace(
      /\{(\w+)\}/g,
      (match, key: string) => table[key as FaqValueId] ?? match,
    ),
    links: entry.links ?? [],
  }));
}

/** Published entries of one topic, in registry order. */
export function faqByTopic(
  locale: Locale,
  and: string,
  topic: FaqTopic,
): readonly ResolvedFaqEntry[] {
  return publicFaq(locale, and).filter((entry) => entry.topic === topic);
}

/**
 * The topics that actually have a published question, in registry order.
 *
 * Derived rather than listed, so a topic whose only entry is blocked does not
 * render as an empty heading.
 */
export function publishedTopics(locale: Locale, and: string): readonly FaqTopic[] {
  const seen: FaqTopic[] = [];
  for (const entry of publicFaq(locale, and)) {
    if (!seen.includes(entry.topic)) seen.push(entry.topic);
  }
  return seen;
}

/** INTERNAL. Questions waiting on an owner decision — for docs and the gate. */
export function blockedFaq(): readonly FaqEntry[] {
  return FAQ_ENTRIES.filter((entry) => !isPublishableEntry(entry));
}
