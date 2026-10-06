/*
 * THE COMPOUND BEING INVESTIGATED (Research architecture pass, 2026-10-05).
 *
 * "Once a reader enters a compound, the compound becomes their anchor." A
 * record writes itself here; a line, a term, the references or a guide read
 * it to offer "← Volver a Semaglutide". Per tab (`sessionStorage`), so two
 * tabs investigate two compounds. The Research overview clears it: starting
 * again from the top is leaving the compound.
 *
 * PROGRESSIVE ENHANCEMENT ONLY. Nothing depends on it: a copied URL, a
 * refresh, an external entry or a blocked storage all fall back to the page's
 * own breadcrumb and local navigation, which never need it.
 */

export interface ResearchAnchorValue {
  slug: string;
  name: string;
  href: string;
}

const KEY = "neogen:research-anchor";
const EVENT = "neogen:research-anchor";

export function writeAnchor(value: ResearchAnchorValue | null): void {
  try {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* Storage unavailable: the anchor is an enhancement; nothing breaks. */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeAnchor(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The raw stored string — a stable snapshot for `useSyncExternalStore`. */
export function anchorSnapshot(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function parseAnchor(raw: string | null): ResearchAnchorValue | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as ResearchAnchorValue;
    return value && typeof value.href === "string" && typeof value.name === "string" ? value : null;
  } catch {
    return null;
  }
}
