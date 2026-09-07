import type es from "./dictionaries/es";

/** Recursively strips the `as const` readonly modifiers from the source dictionary. */
type Mutable<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Mutable<U>[]
    : { -readonly [K in keyof T]: Mutable<T[K]> };

/**
 * The contract every locale must satisfy, derived from the Spanish source.
 * Adding a key to `es.ts` makes `en.ts` fail to compile until it is translated.
 */
export type Dictionary = Mutable<typeof es>;
