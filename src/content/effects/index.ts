import { parseEffectsFile, publicEffects } from "./rules";
import DATA from "./simple-effects.json";

import type { Locale } from "@/i18n/config";
import type { PublicSimpleEffects, SimpleEffectsFile } from "./types";

export type { PublicSimpleEffects, SimpleEffectsEntry, SimpleEffectsFile } from "./types";

/**
 * THE PUBLIC READ of Simple Effects — what customer surfaces call.
 *
 * The file is read at BUILD time (a static import), so publishing is a build:
 * an entry approved in the console reaches the site when the site is rebuilt
 * with that file, never by itself. A malformed file publishes nothing.
 *
 * Today the file holds no approved entry, so this returns null for every
 * product and every surface renders exactly as before.
 */
const parsed = parseEffectsFile(DATA);
const FILE: SimpleEffectsFile = parsed.ok
  ? parsed.file
  : { version: 1, vocabulary: [], entries: {} };

export function publicSimpleEffects(slug: string, locale: Locale): PublicSimpleEffects | null {
  return publicEffects(FILE, slug, locale);
}
