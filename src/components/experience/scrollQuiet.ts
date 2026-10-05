/**
 * WHEN THE PAGE IS STILL (owner, 2026-10-01: the homepage "feels kinda
 * stuttery"). Booting the 3D layer and preparing a stage ahead are the
 * heaviest things the homepage does — three's start, a model's parse, a
 * lighting map, programs, uploads — and each was measured as a 50–170 ms
 * stall when it landed while the reader was scrolling. Now that every stage
 * stands in with its own photograph (`StageStandIn`), none of it has to happen
 * mid-scroll: it waits for a pause.
 */

/** No scroll for this long is a pause. */
const QUIET_MS = 200;

let lastScroll = -Infinity;
/** The reader's last pointer movement, press or key. */
let lastInput = -Infinity;
let listening = false;

function listen(): void {
  if (listening) return;
  listening = true;
  window.addEventListener(
    "scroll",
    () => {
      lastScroll = performance.now();
    },
    { passive: true, capture: true },
  );
  const input = () => {
    lastInput = performance.now();
  };
  for (const type of ["pointermove", "pointerdown", "keydown", "wheel", "touchmove"] as const) {
    window.addEventListener(type, input, { passive: true, capture: true });
  }
}

/**
 * Calls `callback` once the page has not scrolled for `QUIET_MS` — at once if
 * it already has not. Returns a cancel function.
 */
export function whenScrollQuiet(callback: () => void): () => void {
  listen();
  let handle = 0;
  const check = () => {
    const since = performance.now() - lastScroll;
    if (since >= QUIET_MS) {
      handle = 0;
      callback();
      return;
    }
    handle = window.setTimeout(check, QUIET_MS - since + 16);
  };
  handle = window.setTimeout(check, 0);
  return () => {
    if (handle) window.clearTimeout(handle);
  };
}

/**
 * WHEN THE READER IS STILL (owner, 2026-10-04: Tres mundos "take a second to
 * load and then make scrolling lag"). Preparing a stage ahead is 50–350 ms of
 * main-thread work in pieces — a model's parse, its lighting, its programs —
 * and a 200 ms gap in scrolling is not a pause: it is someone looking at a
 * card before they point at it. So work that can wait, waits for stillness:
 * no scroll AND no pointer, touch or key for `ms`. It is the reader who
 * decides when there is time, not the scroll alone.
 */
export function whenStill(callback: () => void, ms = 1000): () => void {
  listen();
  let handle = 0;
  const check = () => {
    const since = performance.now() - Math.max(lastScroll, lastInput);
    if (since >= ms) {
      handle = 0;
      callback();
      return;
    }
    handle = window.setTimeout(check, ms - since + 16);
  };
  handle = window.setTimeout(check, 0);
  return () => {
    if (handle) window.clearTimeout(handle);
  };
}
