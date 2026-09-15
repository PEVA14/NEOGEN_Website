/**
 * STOREFRONT DERIVATIONS — pure arithmetic over the registries.
 *
 * The card reveal, the catalogue's presentation register and the parked
 * flagship shop read their numbers through here, so the rules are in one
 * place and `check:catalog` can drive them with fixtures. Nothing in this
 * module knows a product name, a price list or a locale: it takes numbers and
 * returns numbers.
 *
 * WHAT IT REFUSES TO DO. It never ranks by popularity, never invents a
 * discount, never estimates stock and never states what anything is for. The
 * derivations are the ones a careful shop assistant could do with the price
 * list and a calculator: a price per vial, whether one pack alone crosses the
 * free-shipping line the owner confirmed, and which strengths a set of
 * products shares.
 */

/* ---- unit price ---------------------------------------------------------- */

/**
 * Price per vial, rounded to the peso. Null when either side is unknown — a
 * pack with no stated vial count has no unit price, it does not have "one".
 */
export function perVial(amount: number | null, vials: number | null): number | null {
  if (amount === null || vials === null || vials <= 0) return null;
  return Math.round(amount / vials);
}

/** Whether a single pack at this price already reaches the free-shipping threshold. */
export function reachesThreshold(amount: number | null, threshold: number | null): boolean {
  return amount !== null && threshold !== null && amount >= threshold;
}

/* ---- the presentation register ------------------------------------------- */

/** One presentation as the register needs it. `mg` is set only for solids. */
export interface RegisterPresentation {
  /** Formatted strength — "10 mg", "200 mg / 10 ml", "100 IU". */
  label: string;
  mg: number | null;
  amount: number | null;
  vials: number | null;
}

export interface RegisterSubject {
  presentationList: readonly RegisterPresentation[];
}

export interface AlignedRow<T> {
  item: T;
  /** One entry per column; null where the product is not sold at that strength. */
  cells: readonly (RegisterPresentation | null)[];
}

export type RegisterLayout<T> =
  | {
      /**
       * Solid products share strength columns, so a row can be read against
       * the rows above it — the size chart. Everything else (solutions,
       * volumes, IU, blends) follows in a sequential table.
       */
      mode: "aligned";
      columns: readonly number[];
      rows: readonly AlignedRow<T>[];
      others: readonly T[];
      othersWidth: number;
    }
  | {
      /**
       * Too many distinct strengths to align (the unfiltered catalogue has
       * nineteen), or no solids at all: each product lists its presentations
       * in order, strength and price in every cell.
       */
      mode: "sequential";
      width: number;
      rows: readonly T[];
    };

/** Above this many strength columns an aligned table stops being readable. */
export const REGISTER_MAX_COLUMNS = 10;

/**
 * How to lay out a set of products as a presentation register.
 *
 * DERIVED FROM THE RESULTS, never chosen by hand: filter the catalogue to one
 * area and the solids align by strength (every area today yields three to
 * nine columns); leave it unfiltered and the register lists presentations in
 * order instead. Row order is the input order, so the catalogue's sort holds.
 */
export function registerLayout<T extends RegisterSubject>(
  items: readonly T[],
  maxColumns = REGISTER_MAX_COLUMNS,
): RegisterLayout<T> {
  const isSolid = (item: T) =>
    item.presentationList.length > 0 && item.presentationList.every((p) => p.mg !== null);
  const solid = items.filter(isSolid);
  const others = items.filter((item) => !isSolid(item));
  const width = (list: readonly T[]) =>
    list.reduce((n, item) => Math.max(n, item.presentationList.length), 0);
  const columns = [
    ...new Set(solid.flatMap((item) => item.presentationList.map((p) => p.mg as number))),
  ].sort((a, b) => a - b);

  if (solid.length === 0 || columns.length > maxColumns) {
    return { mode: "sequential", width: width(items), rows: items };
  }
  return {
    mode: "aligned",
    columns,
    rows: solid.map((item) => ({
      item,
      cells: columns.map((mg) => item.presentationList.find((p) => p.mg === mg) ?? null),
    })),
    others,
    othersWidth: width(others),
  };
}

/** The cheapest priced presentation, for a row's "from" figure. */
export function cheapestPresentation(
  list: readonly RegisterPresentation[],
): RegisterPresentation | null {
  return list.reduce<RegisterPresentation | null>(
    (best, p) =>
      p.amount !== null && (best === null || p.amount < (best.amount as number)) ? p : best,
    null,
  );
}
