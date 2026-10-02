import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type RefObject } from "react";

import type { RetaCanvasProps } from "./RetaCanvas";

/**
 * The shared homepage canvas's bookkeeping — which stage is asking for it,
 * and whether it has drawn that stage yet. See `StageHost` for why one canvas
 * travels between stages. Deliberately free of three.js: every stage imports
 * this, and three must never reach a page's initial payload (CONVENTIONS §10).
 */

/** What a stage asks the shared canvas to show. */
export type HostedScene = Omit<RetaCanvasProps, "fill" | "onFirstFrame" | "anchor">;

export interface HostRequest {
  id: string;
  slot: HTMLElement;
  scene: HostedScene;
  /** Order of arrival: during a handover the newest request wins. */
  order: number;
}

const requests = new Map<string, HostRequest>();
/* Every stage's scene as soon as the stage knows it — shown or not — so the
   canvas can prepare a stage before it is reached. Page order. */
const known = new Map<string, HostedScene>();
let knownList: readonly { id: string; scene: HostedScene }[] = [];
let arrivals = 0;
let hostMounted = false;
let failed = false;
let drawn: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

function newest(): HostRequest | null {
  let best: HostRequest | null = null;
  for (const request of requests.values()) if (!best || request.order > best.order) best = request;
  return best;
}

export function setHostMounted(mounted: boolean): void {
  hostMounted = mounted;
  emit();
}

/** The canvas failed: every stage keeps its poster from now on. */
export function markHostFailed(): void {
  failed = true;
  emit();
}

/** The canvas has presented its first frame of this stage's scene. */
export function markDrawn(id: string): void {
  if (!requests.has(id)) return;
  drawn = id;
  shown.add(id);
  emit();
}

/** Whether the page has a working shared canvas to ask. */
export function useStageHost(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => hostMounted && !failed,
    () => false,
  );
}

/**
 * Announces this stage's `scene` to the shared canvas (so it can be prepared
 * ahead of time) and, while `show` is true, asks the canvas to show it in
 * `slot`. Returns true once the canvas has drawn this stage's scene — the
 * moment the stage can take its poster away. `scene` must be memoised.
 */
export function useHostedScene(
  id: string,
  slot: RefObject<HTMLElement | null>,
  scene: HostedScene | null,
  show: boolean,
): boolean {
  /*
   * ANNOUNCED ONLY WHEN NEAR (owner, 2026-09-30: "it seems it hurt loading in
   * general"). Announcing every stage at once made the canvas prepare GLOW and
   * GHK-Cu — two more models, their lighting, their textures — right after the
   * hero appeared, while the page was still loading. A stage now announces
   * itself once it is within a screen and a half of the viewport: early enough
   * to be prepared before it arrives at a reading pace, late enough to leave
   * the page's own load alone.
   */
  const near = useNear(slot, scene !== null);
  useLayoutEffect(() => {
    if (!scene || !near) return;
    known.set(id, scene);
    knownList = [...known].map(([key, value]) => ({ id: key, scene: value }));
    emit();
    return () => {
      known.delete(id);
      knownList = [...known].map(([key, value]) => ({ id: key, scene: value }));
      emit();
    };
  }, [id, scene, near]);

  useLayoutEffect(() => {
    const element = slot.current;
    if (!show || !scene || !element) return;
    requests.set(id, { id, slot: element, scene, order: (arrivals += 1) });
    emit();
    return () => {
      requests.delete(id);
      if (drawn === id) drawn = null;
      emit();
    };
  }, [id, slot, scene, show]);

  return useSyncExternalStore(
    subscribe,
    () => drawn === id && requests.has(id),
    () => false,
  );
}

/** Whether `target` has come within a screen and a half of the viewport. Stays true. */
function useNear(target: RefObject<HTMLElement | null>, ready: boolean): boolean {
  const [near, setNear] = useState(false);
  useEffect(() => {
    // `ready`: the slot exists only once the page's shared canvas does.
    const element = target.current;
    if (!ready || !element || near) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
      },
      { rootMargin: "150% 0px 150% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, ready, near]);
  return near;
}

/** The ask the canvas is serving, if any. */
export function useActiveRequest(): HostRequest | null {
  return useSyncExternalStore(subscribe, newest, () => null);
}

/** Every stage's scene the page has announced, in page order. */
export function useKnownScenes(): readonly { id: string; scene: HostedScene }[] {
  return useSyncExternalStore(
    subscribe,
    () => knownList,
    () => EMPTY,
  );
}

const EMPTY: readonly { id: string; scene: HostedScene }[] = [];

/** Stages the canvas has drawn on this page, once revealed. */
const shown = new Set<string>();

/** Whether the canvas has shown `id`'s stage before, on this page. */
export function hasShown(id: string): boolean {
  return shown.has(id);
}

/** Which stage the canvas has drawn, if any. */
export function useDrawnStage(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => drawn,
    () => null,
  );
}

/**
 * The stage's empty box the shared canvas is carried into: it covers the
 * container the stage's own canvas used to fill, and takes no layout.
 */
export const HOST_SLOT_STYLE = { position: "absolute", inset: 0 } as const;
