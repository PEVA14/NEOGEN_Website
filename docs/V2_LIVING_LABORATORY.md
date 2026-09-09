# V2 — Living Laboratory

Deferred from V1 on 2026-09-08.

The Living Laboratory concept is **not discarded**. V1 is a beautiful, premium,
editorial ecommerce experience; the cinematic layer moves to V2, where it can be
built against a finished product rather than competing with one.

This document exists because the transition work was **never committed**.
Removing it from `src/` would otherwise have destroyed it, along with everything
that was learned building it. What follows is enough to rebuild it deliberately.

---

## 1. What moves to V2

- ProductCard → PDP shared-element transitions
- Advanced route-transition choreography
- Complex pinned WebGL storytelling
- Cinematic multi-state product movement
- Product worlds physically transforming the interface
- Advanced object/environment scroll choreography

## 2. What V1 keeps, and why it is the foundation

None of this was removed. It is all live, all used, and all reusable.

| Kept                  | Where                                              | Why it matters for V2                                                                                                                                                                                                                                                                 |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The pose-track system | `experience/choreography.ts`                       | Keyframe stops sampled by a 0→1 progress, with eased segments. The `hero` and `sequence` variants still drive the homepage; a V2 PDP sequence is a new track, not new machinery.                                                                                                      |
| The measured anchor   | `experience/VialModel.tsx`                         | The object's world position and scale are derived from a **measured DOM box** expressed as fractions of the canvas. This is the single most valuable piece: it is what lets a 3D object be locked to an HTML element at any viewport size, and any shared-element work depends on it. |
| Scroll progress       | `hooks/useSectionProgress.ts`                      | `pinned` mode, driving a ref rather than state. Still used by the homepage.                                                                                                                                                                                                           |
| The studio rig        | `experience/RetaCanvas.tsx`, `worldEnvironment.ts` | Rect-area lights, PMREM environment from the world palette, ACES tone mapping.                                                                                                                                                                                                        |
| One-context gating    | `experience/useVialStage.ts`                       | IntersectionObserver-gated mounting so only one WebGL context is ever live.                                                                                                                                                                                                           |
| Viewer preloading     | `experience/preloadVial.ts`                        | Warms the chunk and the GLB on pointer intent.                                                                                                                                                                                                                                        |
| The world seam        | `styles/worlds.css`                                | The accent rule marking a Quiet↔Impact boundary.                                                                                                                                                                                                                                      |

## 3. The transition that was built, and how it worked

Four mechanisms, in the order they were arrived at.

### 3.1 Origin handoff — a module singleton, not a router feature

A product card recorded its media box on click; the product page claimed it and
opened by expanding out of it. Nothing intercepted navigation.

```ts
// src/lib/worldHandoff.ts
export interface WorldHandoff {
  world: WorldId;
  rect: { top: number; left: number; width: number; height: number };
  fit: number; // fraction of the box the silhouette occupied (0.62)
  at: number; // performance.now()
}

const MAX_AGE_MS = 1200;
export const SILHOUETTE_FIT = 0.62;

let pending: WorldHandoff | null = null;

export function publishWorldHandoff(handoff: WorldHandoff): void {
  pending = handoff;
}

export function consumeWorldHandoff(world: WorldId): WorldHandoff | null {
  const handoff = pending;
  pending = null; // read once, then gone
  if (!handoff || handoff.world !== world) return null;
  if (performance.now() - handoff.at > MAX_AGE_MS) return null;
  if (handoff.rect.width <= 0 || handoff.rect.height <= 0) return null;
  return handoff;
}
```

The card published on its CTA's `onClick` and let the `<Link>` behave normally:

```tsx
const rect = mediaRef.current.getBoundingClientRect();
publishWorldHandoff({ world, rect: {...}, fit: SILHOUETTE_FIT, at: performance.now() });
```

**Why this shape.** Nothing is intercepted and no navigation is deferred, so
back/forward, cmd-click, middle-click and new tabs stay native — a new JS context
simply has no singleton and therefore no animation. A stale handoff is inert
data, never a half-torn-down overlay. No experimental flags.

### 3.2 The reveal — a drifting circle

The destination clipped itself to the card's box and grew to cover the stage.
The circle **drifted** from the card's centre to the media well's centre, so the
environment flowed toward where the product would end up rather than irising open
concentrically.

```ts
const startRadius = Math.hypot(from.width, from.height) / 2; // circumscribes the card
const endRadius = coverRadius(stageBox.width, stageBox.height, settleX, settleY);

node.animate(
  [
    { clipPath: `circle(${startRadius}px at ${originX}px ${originY}px)` },
    { clipPath: `circle(${endRadius}px at ${settleX}px ${settleY}px)` },
  ],
  { duration: 1100, easing: "cubic-bezier(0.35, 0.05, 0.28, 0.95)", fill: "both" },
);
```

`coverRadius` is the distance to the furthest corner **measured from where the
circle ends**, or the last corner never fills:

```ts
function coverRadius(width: number, height: number, x: number, y: number): number {
  return Math.max(
    Math.hypot(x, y),
    Math.hypot(width - x, y),
    Math.hypot(x, height - y),
    Math.hypot(width - x, height - y),
  );
}
```

A clip, not a scale: the layout underneath is already at final size, so the
environment grows around an object that is not being stretched.

### 3.3 The stand-in — the flat silhouette carries the object

The WebGL layer was **not mounted during the reveal**. The same `VialSilhouette`
the card was showing carried the object on a composited transform, and the canvas
mounted afterwards against a page standing still.

```ts
standIn.animate(
  [
    { transform: `translate(${carryX}px, ${carryY}px) scale(${carryScale}) rotate(0deg)` },
    { transform: `translate(0px, 0px) scale(1) rotate(${(PRESENTER_TILT * 180) / Math.PI}deg)` },
  ],
  { duration: 1100, easing: "cubic-bezier(0.5, 0.05, 0.25, 1)", fill: "both" },
);
```

Three phases: `opening` (stand-in only, no canvas) → `handoff` (canvas mounting
behind the stand-in) → `resolved` (stand-in dissolved over 260ms). The silhouette
landed on the 3D object's resting lean so nothing snapped at the swap.

### 3.4 The meniscus

A soft accent bloom riding the leading edge, fading as it spread — what kept a
hard geometric circle from reading as a stencil cut. Sized to its **final**
diameter and scaled _down_ to 1 (see trap 4).

---

## 4. The traps. Read this before rebuilding.

Each of these cost a full debugging cycle.

1. **Arm before paint.** A passive effect runs after paint, so the resolved page
   flashes for a frame and then collapses into the card — the animation played
   backwards, then forwards. Use a layout effect (guarded with
   `typeof window === "undefined"` for SSR).

2. **StrictMode consumes the handoff twice.** The claim is destructive; a second
   read comes back empty and the animation never plays in development. Cache the
   claim in a ref — refs are stable across StrictMode's double effect invocation.

3. **Gating the canvas on state means the stand-in does not exist yet.** Setting
   the phase and reading `standIn.current` in the same effect gets `null`. Split
   into two layout effects: one measures and switches phase, one animates. Both
   run before paint, so the split is invisible.

4. **Scale direction decides raster cost.** Chromium rasters a composited layer
   once, at the _largest_ scale the animation reaches. Growing a 200px bloom
   elevenfold forces a ~2200px raster up front. Size the element to its final
   dimensions and scale **down** to 1.

5. **Layer promotion mid-animation is the "smooth, break, smooth" symptom.**
   Delayed entrances were promoted only when their animation started, at 20% and
   36% of the reveal — and promotion means rasterising the subtree, which for a
   commerce column is a display heading plus body copy plus controls. Declare
   `will-change: transform, opacity` on everything animated, scoped to the
   in-flight attribute, so all promotions happen at arm time and all teardowns
   happen together at the end.

6. **`--ease-out` (`0.16, 1, 0.3, 1`) is 97% complete at its midpoint.** Sampled
   at a quarter / half / three quarters it is 83% / 97% / 100%. The whole reveal
   happens in the first third of a second and the rest is an imperceptible crawl;
   lengthening the duration only lengthens the dead tail, and it reads as a page
   that simply loaded. `cubic-bezier(0.35, 0.05, 0.28, 0.95)` samples 26% / 73% /
   94% and moves for 737ms of 1100 rather than 317ms of 760. **A `1` in the final
   control point's y always snaps to completion early.**

7. **Never write animation values per frame from JavaScript.** The first version
   recomputed `clip-path` from a custom property every frame, invalidating style
   for the whole subtree — commerce copy, media frame and all — on each one. Hand
   the interpolation to the browser.

8. **The canvas boot is ~240ms and cannot be hidden.** Measured on a production
   build: 237ms cold, 191ms warm. Shader compile and link were ~0ms and 2ms
   across 126 calls, so it is _not_ the GPU — it is the model parse, three's
   initialisation and the PMREM environment prefilter, all on the main thread.
   No amount of compositing hides a main thread that has stopped. Either mount
   the canvas outside the animation window, or do not animate.

9. **Match the gate to the layout breakpoint, not the 3D tier.** The opening was
   gated at `48rem` while the stylesheet collapses to one column at `64rem`, so
   every viewport between 768px and 1023px played the reveal against a
   full-width media well — a wipe with no shared geometry to sell it.

---

## 5. If V2 revisits this

Approaches evaluated and rejected, with reasons:

- **View Transitions API.** The installed React exports no `ViewTransition` and
  Next's support sits behind `experimental.viewTransition`. More fundamentally,
  View Transitions snapshot old and new DOM as images, and the destination is a
  WebGL canvas that is empty at first paint — the browser would cross-fade the
  card into a blank rectangle with no way to hand the animation clock to the 3D
  layer.
- **A persistent overlay across routes.** Needs the click intercepted, the push
  deferred, a fixed layer in the root layout and a teardown handshake, with a
  stranded-overlay failure mode if the destination throws.

The origin-handoff approach has no cross-route lifetime, which is why it was
chosen and why it is still the recommended starting point.

**The honest V2 precondition:** the transition is only worth rebuilding once the
canvas can be mounted _before_ it is needed — a persistent renderer, a warmed
context, or a pre-baked environment map. Until then the ~240ms boot will land
somewhere, and the only question is whether it lands where the user is watching.
