import { useSyncExternalStore } from "react";

/**
 * WHICH CARD THE SPECIMEN LEAVES FROM.
 *
 * A view-transition name must be unique on the page when a transition starts,
 * or the browser skips the whole transition. The catalogue shows RETA, GLOW and
 * GHK-Cu twice — in the masthead's strip and in the grid — so no card can carry
 * the names all the time. Instead a card is ARMED when it is tapped, and only
 * the armed card names its specimen and its world. Its boundaries are always
 * mounted; only their `name` changes, so arming re-renders nothing but a prop.
 *
 * The key is stable ("strip:reta", "grid:reta"), not a per-mount id, so a
 * card that remounts (a back navigation, a filter) is still the same card.
 */
let armed: string | null = null;
const listeners = new Set<() => void>();

export function arm(key: string): void {
  if (armed === key) return;
  armed = key;
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** Whether the card with this key is the one a specimen travels from. */
export function useArmed(key: string): boolean {
  return useSyncExternalStore(
    subscribe,
    () => armed === key,
    () => false,
  );
}
