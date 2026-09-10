"use client";

import { useEffect } from "react";

import { clear } from "@/domain/bag/store";

/**
 * EMPTY THE BAG ONCE, AFTER AN ORDER EXISTS.
 *
 * The bag lives in this browser's `localStorage`; the order lives on the
 * server. So placing an order cannot empty the bag from the server side, and
 * without this the customer lands on their confirmation with the header still
 * reading BAG: 2 — as though nothing had happened, and inviting them to order
 * the same thing twice.
 *
 * WHY IT IS KEYED ON THE ORDER ID. A confirmation page can be reloaded,
 * bookmarked, or opened tomorrow, and by then the customer may have added
 * something new. Clearing unconditionally on mount would silently throw that
 * away. The id of the last order this browser cleared for is recorded, so the
 * clear happens exactly once per order and never touches a bag rebuilt
 * afterwards.
 *
 * It renders nothing. It is an effect, and the only one in the checkout — the
 * rest of the flow is server-rendered forms.
 */
const KEY = "neogen.bag.cleared-for";

export function ClearBagOnOrder({ orderId }: { orderId: string }) {
  useEffect(() => {
    try {
      if (window.localStorage.getItem(KEY) === orderId) return;
      window.localStorage.setItem(KEY, orderId);
      /* A store mutation, not a `setState` — no cascading render, which is
         what the React compiler rejects and what this pattern avoids. */
      clear();
    } catch {
      /* Blocked or full storage. The bag simply stays as it was, which is a
         far smaller failure than a thrown effect on a confirmation page. */
    }
  }, [orderId]);

  return null;
}
