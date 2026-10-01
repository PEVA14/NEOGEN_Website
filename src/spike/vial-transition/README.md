# SPIKE — one object, many magnifications (catalogue card → product page)

A contained technical prototype of idea #1 from the Motion exploration
(2026-09-28): the vial the customer clicks in the catalogue is the vial that
arrives on the product page — the same physical specimen, now examined more
closely. **Not production. Off by default.**

## Run it

The morph only happens when the destination route is already prefetched, and
Next does not prefetch in development — so the spike is judged on a production
build:

```bash
NEXT_PUBLIC_SPIKE_VIAL_TRANSITION=1 NEXT_PUBLIC_SITE_URL=http://localhost:3110 npx next build
npx next start -p 3110          # or the "vial-spike" entry in .claude/launch.json
```

Open `/es/productos`, rest the pointer on Semaglutide, RETA, GLOW or GHK-Cu in the
grid for a moment, and click. Use the browser's back button to return.

Without the variable every touch point renders exactly what it rendered before.

## What it does

| Layer                 | Card → page                                                                                                  | Mechanism                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| The object            | travels whole and crisp, upright off the card; on a flagship it tilts to the 3D presenter's lean in flight   | React `<ViewTransition name share>` pair, native view-transition CSS                     |
| The set it stood on   | stays behind and dissolves with the catalogue                                                                | the studio still split into `ground.jpg` + `specimen.png`                                |
| The world (flagships) | opens out of the card's stage as a feathered circle and drifts to where the object lands                     | an empty proxy paired with the stage field; `mask-image` driven by registered properties |
| The rest of each page | the catalogue gives way, the product page settles in — its name included; the name does not fly              | `SpikePage` boundaries, only for navigations typed `vt-specimen`                         |
| Magnification         | the product page frames the same still 1.16× closer than the card                                            | CSS `scale` on the plate's still                                                         |
| The 3D (flagships)    | NOT mounted during the flight; mounts on landing behind the still, which dissolves when the canvas has drawn | `useStageHandoff` + `RetaCanvas onFirstFrame`                                            |

No Motion library, and no JavaScript animation: view transitions do the flight
on the compositor. The browser's back button returns to the catalogue without
one (see 3 below) — there is deliberately no way-back flight.

## Files

New, all removable: `src/spike/vial-transition/` (including the `?vtdebug` log), `scripts/spike/`,
`public/spike/vial-transition/` (2 MB of source PNG/JPEG; served resized).

Touched, every change behind the flag or inert without it:

- `components/ui/ProductCard.tsx` — `transition` prop; two-layer still; names; warm-up
- `components/catalog/CatalogBrowser.tsx` — the grid passes `transition`
- `components/catalog/Storefront.tsx` — the masthead strip travels too (`SpecimenLink`)
- `components/product/ProductPlate.tsx` — the page shows the card's still, split
- `components/product/ProductStage.tsx` — stand-in, 3D hold, world pairing
- `components/experience/RetaCanvas.tsx` — optional `onFirstFrame`
- `components/experience/studio/StudioScene.tsx` — `captureGround` / `captureMask` passes
- `app/[locale]/productos/page.tsx`, `app/[locale]/productos/[slug]/page.tsx` — `SpikePage`

## Remove it

The spike is OFF unless `NEXT_PUBLIC_SPIKE_VIAL_TRANSITION=1` is set at build
time; with it off, every touched file renders what it rendered before.

It was committed (2026-10-01) together with the live-glass, phone-performance
and shared-homepage-canvas work (PROJECT_STATE §8af), which is NOT part of the
spike — so do not revert that commit to remove it. Instead delete the spike's
own folders:

```bash
rm -rf src/spike scripts/spike public/spike
```

and remove the spike's hunks, each marked `SPIKE`, from the files it touches
(listed above), plus the `onFirstFrame`/`FirstFrame` hook in `RetaCanvas.tsx`
and the `captureGround`/`captureMask` passes in `StudioScene.tsx`. Keep
`data-scroll-behavior="smooth"` in `app/[locale]/layout.tsx`: it is a site
fix, not spike code.

## The assets

`node scripts/spike/capture-specimen.mjs reta glow ghk-cu` (and Semaglutide with
its registry `--query`) photographs each studio still three times from the same
camera in one page load — plain, without the object, and the object alone as a
white silhouette — and writes the set and the alpha-cut object. Recombined they
reproduce the registered stills to within JPEG noise (mean 0.4–0.6 / 255).

## What was learned the hard way

1. **React turns the whole-page cross-fade off** (`view-transition-name: none` on
   `<html>`, root group collapsed to 0×0). A page has to wrap its own content to
   animate it.
2. **Only the OUTERMOST entering boundary animates.** Nested `enter` boundaries
   are ignored; nested named _pairs_ still work. That is why the world is a pair
   with a proxy rather than an `enter`.
3. **The browser back button cannot use a view transition in React.** A
   transition started inside `popstate` is run synchronously
   (`shouldAttemptEagerTransition` in react-dom) so scroll restoration and
   native swipe-back work, and a synchronous commit never starts one. Next's
   guide ("navigating back reverses the morph") is true for in-page links only.
   The spike once flew a stand-in back into the card with WAAPI; removed on
   2026-09-30 (owner: people usually scroll before it finishes).
4. **React holds the flight up to 500 ms for the new page's images**
   (`SUSPENSEY_FONT_AND_IMAGE_TIMEOUT`). Unwarmed, click-to-first-movement was
   0.5–0.8 s; warmed on hover/viewport it is 70–220 ms.
5. **The morph needs the destination prefetched.** Otherwise `loading.tsx`
   paints first, no pair forms, and it degrades to a normal navigation.
6. **A duplicated name anywhere on the page cancels the whole transition** — so
   only the catalogue grid (each product once) is an origin.

7. **Only one thing should travel.** The product name also flew, a beat behind
   the vial, into the page title; reviewing it in a real browser, two
   travellers read as a busy effect rather than one object moving (2026-09-29).
   The name now arrives with the rest of the page.

8. **Safari captured the new page mid-scroll.** The site smooth-scrolls while
   anything has focus, so Next's scroll-to-top became an animation and the
   product page was captured ~1,800 px down: the vial flew off the top of the
   screen. Fixed for the whole site with `data-scroll-behavior="smooth"` on
   `<html>` (Next 16's opt-in to turn smoothing off during navigation) — keep
   it even if the spike is removed.
9. **On a phone the first RETA a visitor sees is the masthead strip**, well
   before the grid, and the strip shows the same products as the grid — a name
   may appear once. So cards are ARMED on tap (`armed.ts`): only the tapped
   copy names its specimen and world; every other copy keeps its boundaries
   with `name="auto"`, which pairs with nothing (a boundary that appeared on
   tap would remount the images). The strip is a source through
   `SpecimenLink.tsx`.
10. **React reveals server-streamed markup inside a view transition** (`$RV`)
    once the markup holds view-transition boundaries — the product page and,
    now, the catalogue strip. It runs once at load, untyped, and animates
    nothing (every boundary here is `default="none"`).

## Debugging on a phone

Add `?vtdebug` to any spike page once: a green log (fixed near the top) then
shows whether the browser supports view transitions, whether reduced motion
is on, and each transition's start, update, ready (or why it was skipped) and
finish, with the scroll position at each step. `VtDebug.tsx`; renders nothing
without the flag.

## Before productionizing

See the report of 2026-09-29 in the conversation; in short: render the flagship
stand-in from the presenter's own rig (the studio lens differs, so the wake-up
changes shape and material), split `SpecimenPlate` so drawn products travel as
objects too, and move three.js out of the product page's initial chunks.
