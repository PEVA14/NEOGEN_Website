/**
 * STOREFRONT DERIVATIONS — pure arithmetic over the registries.
 *
 * Every commercial moment added to the homepage and every card reveal reads
 * its numbers through here, so the rules are in one place and `check:catalog`
 * can drive them with fixtures. Nothing in this module knows a product name, a
 * price list or a locale: it takes numbers and returns numbers.
 *
 * WHAT IT REFUSES TO DO. It never ranks by popularity, never invents a
 * discount, never estimates stock and never states what anything is for. The
 * derivations are the ones a careful shop assistant could do with the price
 * list and a calculator: a price per vial, where a price falls on a scale,
 * which strengths a family of products shares, and whether one pack alone
 * crosses the free-shipping line the owner confirmed.
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

/* ---- the presentation matrix --------------------------------------------- */

export interface MatrixInput {
  slug: string;
  /** Solid presentations only: milligrams per vial and the pack's price. */
  cells: readonly { mg: number; amount: number | null; vials: number | null }[];
}

export interface MatrixRow<T> {
  item: T;
  /** One entry per column; null where the product is not sold at that strength. */
  cells: readonly ({ amount: number | null; vials: number | null } | null)[];
  /** Cheapest priced cell, for the row's "from" figure. */
  from: number | null;
}

export interface Matrix<T> {
  /** Every milligram strength any row holds, ascending. */
  columns: readonly number[];
  rows: readonly MatrixRow<T>[];
}

/**
 * Strengths × products, for products sold as solids in at least
 * `minPresentations` strengths.
 *
 * A single-strength product contributes one cell to an eight-column row and
 * teaches nothing by comparison, so it is left to the catalogue. Columns are
 * the union of what the rows hold — never a strength nobody sells.
 */
export function presentationMatrix<T extends MatrixInput>(
  items: readonly T[],
  minPresentations = 2,
): Matrix<T> {
  const eligible = items.filter((item) => item.cells.length >= minPresentations);
  const columns = [...new Set(eligible.flatMap((item) => item.cells.map((c) => c.mg)))].sort(
    (a, b) => a - b,
  );
  const rows = eligible.map((item) => {
    const cells = columns.map((mg) => {
      const cell = item.cells.find((c) => c.mg === mg);
      return cell ? { amount: cell.amount, vials: cell.vials } : null;
    });
    const priced = item.cells.map((c) => c.amount).filter((a): a is number => a !== null);
    return { item, cells, from: priced.length ? Math.min(...priced) : null };
  });
  return { columns, rows };
}

/* ---- the price spectrum -------------------------------------------------- */

/**
 * Position on a logarithmic price axis, 0–1.
 *
 * LOGARITHMIC because the catalogue spans MX$800 to MX$37,000 and most of it
 * sits between 3,000 and 20,000: on a linear axis the cheapest fifth of the
 * catalogue would collapse into one pixel column and the axis would be mostly
 * empty space to the right.
 */
export function logPosition(amount: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  const clamped = Math.min(max, Math.max(min, amount));
  return (Math.log(clamped) - Math.log(min)) / (Math.log(max) - Math.log(min));
}

export interface Placed<T> {
  item: T;
  /** 0–1 along the axis, at the centre of the item's bin. */
  x: number;
  bin: number;
  /** 0 is the baseline; each item in the same bin stacks one level up. */
  level: number;
}

/**
 * Items binned along the axis and stacked, cheapest first within a bin — a
 * dot plot, so every product keeps its own mark instead of disappearing into a
 * histogram bar. The input order is not trusted; the output is sorted by price.
 */
export function stackOnAxis<T extends { amount: number }>(
  items: readonly T[],
  bins: number,
  bounds?: { min: number; max: number },
): { placed: Placed<T>[]; min: number; max: number; height: number } {
  const sorted = [...items].sort((a, b) => a.amount - b.amount);
  if (sorted.length === 0) return { placed: [], min: 0, max: 0, height: 0 };
  const min = bounds?.min ?? sorted[0].amount;
  const max = bounds?.max ?? sorted[sorted.length - 1].amount;
  const levels = new Map<number, number>();
  const placed = sorted.map((item) => {
    const bin = Math.min(bins - 1, Math.floor(logPosition(item.amount, min, max) * bins));
    const level = levels.get(bin) ?? 0;
    levels.set(bin, level + 1);
    return { item, bin, level, x: (bin + 0.5) / bins };
  });
  return { placed, min, max, height: Math.max(...levels.values()) };
}

/**
 * Round tick values inside [min, max] on a 1–2–5 ladder: 1,000 · 2,000 ·
 * 5,000 · 10,000 … — the marks a printed log scale carries.
 */
export function logTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  for (let decade = 10 ** Math.floor(Math.log10(Math.max(1, min))); decade <= max; decade *= 10) {
    for (const step of [1, 2, 5]) {
      const value = step * decade;
      if (value >= min && value <= max) ticks.push(value);
    }
  }
  return ticks;
}

/**
 * Price bands for narrow screens, where a dot plot cannot be read by touch.
 * Edges are fixed round numbers — including the free-shipping threshold when
 * given, so the band boundary and the shipping rule coincide — and empty bands
 * are dropped.
 */
export function priceBands<T extends { amount: number }>(
  items: readonly T[],
  edges: readonly number[],
): { from: number; to: number | null; items: T[] }[] {
  const sortedEdges = [...new Set(edges)].sort((a, b) => a - b);
  const bounds = [0, ...sortedEdges];
  return bounds
    .map((from, i) => {
      const to = bounds[i + 1] ?? null;
      const inBand = items
        .filter((item) => item.amount >= from && (to === null || item.amount < to))
        .sort((a, b) => a.amount - b.amount);
      return { from, to, items: inBand };
    })
    .filter((band) => band.items.length > 0);
}
