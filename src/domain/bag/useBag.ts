"use client";

import { useSyncExternalStore } from "react";

import { totals as computeTotals } from ".";
import {
  add,
  clear,
  getServerSnapshot,
  getSnapshot,
  remove,
  setLineQuantity,
  subscribe,
} from "./store";

import type { Bag, BagLine, BagTotals } from "./types";

export interface UseBag {
  bag: Bag;
  totals: BagTotals;
  /** False during server render and hydration — see `store.ts`. */
  hydrated: boolean;
  add: (line: Omit<BagLine, "quantity">, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
}

/**
 * Read and mutate the bag.
 *
 * NO PROVIDER, deliberately. The store is a module, so any client component
 * can call this without the tree being wrapped — which keeps the root layout a
 * pure server component and means the header does not force a client boundary
 * around the whole page.
 */
export function useBag(): UseBag {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return {
    bag: snapshot.bag,
    /* Cheap enough to derive per render: a sum over at most a handful of
       lines. Memoising it would cost more in bookkeeping than it saves. */
    totals: computeTotals(snapshot.bag),
    hydrated: snapshot.hydrated,
    add,
    setQuantity: setLineQuantity,
    remove,
    clear,
  };
}
