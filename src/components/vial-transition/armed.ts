import { useState, useSyncExternalStore } from "react";

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

/**
 * A key for a named `<ViewTransition>` that changes when the boundary LOSES
 * its name, so letting go is an unmount, never a rename.
 *
 * React registers a boundary's name when it mounts and unregisters it when it
 * unmounts, by the name it has then. A boundary renamed from
 * `vt-specimen-reta` to `auto` therefore stays registered under the old name
 * for the rest of the visit, and the next card to take that name was reported
 * as a duplicate (2026-10-08: grid RETA → back → strip RETA logged "two
 * <ViewTransition name="vt-specimen-reta">" and its `vt-world-` twin). Keyed
 * by this, the card that gives the names up remounts its boundary — React
 * drops the old name — while the card that takes them keeps its boundary,
 * and its picture, exactly as they are at the moment of the tap.
 */
export function useReleaseKey(named: boolean): number {
  const [state, setState] = useState({ named, generation: 0 });
  if (state.named !== named) {
    const next = { named, generation: named ? state.generation : state.generation + 1 };
    setState(next);
    return next.generation;
  }
  return state.generation;
}
