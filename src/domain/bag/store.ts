import { addLine, clearBag, removeLine, setQuantity } from ".";
import { EMPTY_BAG, readBag, writeBag } from "./storage";

import type { Bag, BagLine } from "./types";

/**
 * THE BAG STORE — a module-level external store, read via `useSyncExternalStore`.
 *
 * WHY NOT `useState` + AN EFFECT. The obvious shape is state initialised to
 * empty and hydrated in an effect, but that is a `setState` inside an effect —
 * a cascading render, which the React compiler correctly rejects. It is also
 * the wrong model: the bag genuinely IS an external store (this browser's
 * `localStorage`), shared by every tab, and React has an API for exactly that.
 *
 * `getServerSnapshot` returns the empty bag, because the server cannot know
 * what is in this browser. React renders that during hydration and swaps to
 * the real snapshot immediately after, which is why `snapshot.hydrated` exists:
 * a component that would otherwise announce "your bag is empty" can wait one
 * beat instead of saying something false.
 */
export interface BagSnapshot {
  bag: Bag;
  /** False only during server render and hydration. */
  hydrated: boolean;
}

const SERVER: BagSnapshot = { bag: EMPTY_BAG, hydrated: false };

/*
 * Read once at module load on the client, so the first client snapshot is
 * already correct and no effect is needed to fetch it.
 */
let snapshot: BagSnapshot =
  typeof window === "undefined" ? SERVER : { bag: readBag(), hydrated: true };

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

/** Replace the snapshot. A NEW object every time, so `===` detects the change. */
function commit(bag: Bag, persist: boolean): void {
  snapshot = { bag, hydrated: true };
  if (persist) writeBag(bag);
  emit();
}

/**
 * Another tab is the same bag: without this, adding in one tab and opening the
 * bag in another loses the addition. `key === null` is a `clear()` elsewhere.
 */
function onStorage(event: StorageEvent): void {
  if (event.key === null || event.key.startsWith("neogen.bag")) {
    commit(readBag(), false);
  }
}

export function subscribe(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getSnapshot(): BagSnapshot {
  return snapshot;
}

export function getServerSnapshot(): BagSnapshot {
  return SERVER;
}

/* --- mutations ----------------------------------------------------------- */

export function add(line: Omit<BagLine, "quantity">, quantity = 1): void {
  commit(addLine(snapshot.bag, line, quantity), true);
}

export function setLineQuantity(variantId: string, quantity: number): void {
  commit(setQuantity(snapshot.bag, variantId, quantity), true);
}

export function remove(variantId: string): void {
  commit(removeLine(snapshot.bag, variantId), true);
}

export function clear(): void {
  commit(clearBag(), true);
}
