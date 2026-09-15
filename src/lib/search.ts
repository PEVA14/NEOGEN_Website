/**
 * TEXT MATCHING FOR COMPOUND NAMES — shared by every search box on the site.
 *
 * The catalogue names compounds by their English INN — "Tirzepatide",
 * "Semaglutide" — and a Mexican reader types the Spanish one: "tirzepatida",
 * "semaglutida". Case and accent folding alone does not bridge that; the words
 * differ in their final vowel. So each word is also compared by its STEM — the
 * word with one trailing a/e/o removed, for words longer than five letters,
 * which is where INNs sit — and a query matches if either the folded text or
 * the stemmed text contains it.
 *
 * Pure and dependency-free, so a client component can import it without
 * dragging a registry into the browser.
 */
export function fold(value: string): string {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function stem(value: string): string {
  return fold(value)
    .split(/[\s\-/]+/)
    .map((word) => (word.length > 5 ? word.replace(/[aeo]$/, "") : word))
    .join(" ");
}

export function matchesText(haystack: string, query: string): boolean {
  const q = query.trim();
  if (!q) return true;
  return fold(haystack).includes(fold(q)) || stem(haystack).includes(stem(q));
}
