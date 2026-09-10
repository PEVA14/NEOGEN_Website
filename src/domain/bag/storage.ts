import type { Bag, BagLine } from "./types";

/**
 * BAG PERSISTENCE — per browser, versioned.
 *
 * `localStorage` rather than a cookie or a server session: the bag is not
 * needed on the server (nothing renders from it that matters to SEO), a cookie
 * would ship it on every request including static asset requests, and there is
 * no account system to hang a server-side bag from. When accounts arrive this
 * module is the one that changes.
 *
 * EVERY READ IS DEFENSIVE. Storage throws outright in some contexts — private
 * windows, blocked site data, thumbnail capture — and returns other people's
 * shapes after a schema change. A bag that fails to restore must degrade to
 * empty, never to a crash on first paint.
 */
export const EMPTY_BAG: Bag = { lines: [], count: 0 };

const KEY = "neogen.bag.v1";

/**
 * Bumping this discards stored bags rather than migrating them.
 *
 * Correct for a bag specifically: it is short-lived, low-value state, and a
 * migration path for it would be more code than the data is worth. An ORDER
 * would be the opposite.
 */
const VERSION = 1;

interface Stored {
  version: number;
  lines: BagLine[];
}

function isLine(value: unknown): value is BagLine {
  if (!value || typeof value !== "object") return false;
  const l = value as Record<string, unknown>;
  const price = l.unitPrice as Record<string, unknown> | undefined;
  return (
    typeof l.variantId === "string" &&
    typeof l.slug === "string" &&
    typeof l.name === "string" &&
    typeof l.presentation === "string" &&
    typeof l.quantity === "number" &&
    l.quantity > 0 &&
    !!price &&
    typeof price.amount === "number" &&
    price.currency === "MXN"
  );
}

export function readBag(): Bag {
  if (typeof window === "undefined") return EMPTY_BAG;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_BAG;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed || parsed.version !== VERSION || !Array.isArray(parsed.lines)) return EMPTY_BAG;
    /* Field-by-field validation, not a cast: this is data from a previous
       release of our own code, which is untrusted for the same reasons any
       other stored input is. */
    const lines = parsed.lines.filter(isLine);
    return { lines, count: lines.reduce((n, l) => n + l.quantity, 0) };
  } catch {
    return EMPTY_BAG;
  }
}

export function writeBag(bag: Bag): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Stored = { version: VERSION, lines: [...bag.lines] };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* Full or blocked storage must not break the interaction. The bag stays
       correct in memory for this page load; it just will not survive a
       reload, which is a far smaller failure than a thrown click handler. */
  }
}
