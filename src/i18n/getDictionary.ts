import type { Locale } from "./config";
import type { Dictionary } from "./types";

/**
 * Dictionaries are dynamically imported so each locale is code-split and only
 * the requested language is sent to the client.
 *
 * CONVENTION: this module is server-only. Import it from Server Components
 * (layouts/pages) exclusively; client components receive the strings they
 * need as props. That is what keeps shared components locale-independent.
 * (Adding the `server-only` package would turn a violation into a build
 * error — deliberately not installed yet, see docs/CONVENTIONS.md.)
 */
const dictionaries = {
  es: () => import("./dictionaries/es").then((m) => m.default as Dictionary),
  en: () => import("./dictionaries/en").then((m) => m.default),
} satisfies Record<Locale, () => Promise<Dictionary>>;

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
