/**
 * "1 día hábil" and "7 días hábiles".
 *
 * A one-line helper for one reason: Spanish agrees in number, and every
 * priority delivery in this catalogue is exactly one day — so the singular is
 * the common case, not the edge case. "1 días hábiles" appeared on the
 * delivery step, the review screen and the receipt, which is three places for
 * one grammatical mistake to be read by every customer in Guadalajara and
 * Durango.
 *
 * Takes both forms from the dictionary rather than deriving a plural, because
 * pluralisation is a property of the language and belongs with the copy.
 */
export interface DayCount {
  one: string;
  many: string;
}

export function formatDays(days: number, copy: DayCount): string {
  return (days === 1 ? copy.one : copy.many).replace("{n}", String(days));
}
