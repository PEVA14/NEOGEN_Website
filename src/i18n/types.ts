import type es from "./dictionaries/es";

/**
 * Widens the `as const` source dictionary into the contract every locale meets:
 * literal strings become `string`, and readonly tuples become readonly arrays
 * of the widened element type.
 *
 * Arrays stay READONLY on purpose. A dictionary is data to read, never to
 * mutate, and widening `readonly ["a", "b"]` to a mutable `string[]` is not a
 * legal assertion — it would break the `as Dictionary` cast in getDictionary.
 */
type Mutable<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Mutable<U>[]
    : { -readonly [K in keyof T]: Mutable<T[K]> };

/**
 * The contract every locale must satisfy, derived from the Spanish source.
 * Adding a key to `es.ts` makes `en.ts` fail to compile until it is translated.
 */
export type Dictionary = Mutable<typeof es>;
