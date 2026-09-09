/**
 * Fills a description template from the registry.
 *
 * Templates live in the dictionaries — they are copy — while the values come
 * from `data/catalog`, so a description can only ever state something the
 * catalogue already knows. Nothing here composes a claim: a name, a
 * classification and a list of presentations are the three facts a product
 * record actually carries.
 *
 * Search engines truncate around 155–160 characters, so a long presentation
 * list is collapsed to its range rather than being cut mid-value by the SERP.
 */
export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/**
 * A presentation list that fits a search result.
 *
 * Up to three doses are listed in full. Beyond that the list becomes a range —
 * "5 mg – 60 mg (7 presentaciones)" would need a localized noun, so the count
 * is left to the caller and the range alone is returned.
 */
export function presentationSummary(labels: readonly string[]): string {
  if (labels.length === 0) return "";
  if (labels.length <= 3) return labels.join(", ");
  return `${labels[0]} – ${labels[labels.length - 1]}`;
}
