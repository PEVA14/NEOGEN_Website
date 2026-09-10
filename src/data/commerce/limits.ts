/**
 * ORDER LIMITS — in their own module, for the same reason as `format.ts`.
 *
 * The bag store, the quantity stepper and the bag page all need these, and all
 * three are client code. Importing them from `./index` pulls
 * `prices.generated.ts` — the whole 147-variant price map — into the browser
 * bundle, which is exactly what was happening before this split.
 *
 * Owner-set: no minimum beyond one pack, and a ceiling of 99 — a provisional
 * cap rather than a stock statement, since there is no stock figure to cap
 * against. Stated once so the control, the bag and any future server-side
 * validation read one number instead of three.
 */
export const ORDER_LIMITS = { min: 1, max: 99 } as const;
