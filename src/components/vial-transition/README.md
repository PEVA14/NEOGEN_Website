# The vial transition — one object, many magnifications

Catalogue card → product page. The vial the customer taps in the catalogue is
the vial that arrives on the product page — the same physical specimen, now
examined more closely. Built as a spike (2026-09-28), made permanent on
2026-09-30 (owner). CONVENTIONS §11 records why it is the one exception to the
static product page.

## See it

The morph only happens when the destination route is already **prefetched**,
and Next does not prefetch in development — so `npm run dev` navigates without
it. Judge it on a production build:

```bash
npm run build && npx next start -p 3110
```

Open `/es/productos` and tap RETA, GLOW, GHK-Cu or Semaglutide — in the grid
or, for the three flagships, in the masthead strip. Products with no studio
still travel as their drawn plate.

## What it does

| Layer                 | Card → page                                                                                                  | Mechanism                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| The object            | travels whole and crisp, upright off the card; on a flagship it tilts to the 3D presenter's lean in flight   | React `<ViewTransition name share>` pair, native view-transition CSS                     |
| The set it stood on   | stays behind and dissolves with the catalogue                                                                | the studio still split into a ground + a cut-out specimen                                |
| The world (flagships) | opens out of the card's stage as a feathered circle and drifts to where the object lands                     | an empty proxy paired with the stage field; `mask-image` driven by registered properties |
| The rest of each page | the catalogue gives way, the product page settles in — its name included; the name does not fly              | `PageTransition` boundaries, only for navigations typed `vt-specimen`                    |
| Magnification         | the product page frames the same still 1.16× closer than the card                                            | CSS `scale` on the plate's still                                                         |
| The 3D (flagships)    | NOT mounted during the flight; mounts on landing behind the still, which dissolves when the canvas has drawn | `useStageHandoff` + `RetaCanvas onFirstFrame`                                            |

No Motion library, and no JavaScript animation: view transitions do the flight
on the compositor. The browser's back button returns to the catalogue without
one (see 3 below) — there is deliberately no way-back flight.

## Files

- This folder — the flight's CSS, the two-layer still, the arming, the
  hand-off to the 3D, and the manifest `specimens.json`.
- `components/ui/ProductCard.tsx` — `transition` prop; two-layer still; names; warm-up
- `components/catalog/CatalogBrowser.tsx` — the grid passes `transition`
- `components/catalog/Storefront.tsx` — the masthead strip travels too (`SpecimenLink`)
- `components/product/ProductPlate.tsx` — the page shows the card's still, split
- `components/product/ProductStage.tsx` — stand-in, 3D hold, world pairing
- `components/experience/RetaCanvas.tsx` — `onFirstFrame`
- `components/experience/studio/StudioScene.tsx` — `captureGround` / `captureMask` passes
- `app/[locale]/productos/page.tsx`, `app/[locale]/productos/[slug]/page.tsx` — `PageTransition`
- `types/react-canary.d.ts` — the types for React's `ViewTransition`

## The pictures

Each split still lives beside the still it was cut from, named after it:
`public/images/products/reta/studio-v10.jpg` →
`studio-v10-ground.jpg` (the set without the upright object: sweep, floor,
reflection, shadow) and `studio-v10-specimen.png` (the object alone, alpha-cut
to its own silhouette).

**Re-cut them whenever a studio still is re-rendered** — `check:media` fails
until you do:

```bash
npm run dev   # in another terminal
npm run capture:specimen -- reta glow ghk-cu
npm run capture:specimen -- semaglutide --query "model=/models/semaglutide-v1.glb&label=printed&yaw=0"
```

The script photographs the studio scene three times from the same camera in
one page load — plain, without the object, and the object alone as a white
silhouette — and checks that the two layers recombine into both that frame
and the registered still on disk (JPEG noise measures 0.4–0.6 / 255).

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
   A stand-in once flew back into the card with WAAPI; removed on 2026-09-30
   (owner: people usually scroll before it finishes).
4. **React holds the flight up to 500 ms for the new page's images**
   (`SUSPENSEY_FONT_AND_IMAGE_TIMEOUT`). Unwarmed, click-to-first-movement was
   0.5–0.8 s; warmed on hover/viewport it is 70–220 ms.
5. **The morph needs the destination prefetched.** Otherwise `loading.tsx`
   paints first, no pair forms, and it degrades to a normal navigation.
6. **A duplicated name anywhere on the page cancels the whole transition** — so
   only the catalogue (grid and strip, armed on tap: see 9) is an origin, never
   the homepage or a related row.

7. **Only one thing should travel.** The product name also flew, a beat behind
   the vial, into the page title; reviewing it in a real browser, two
   travellers read as a busy effect rather than one object moving (2026-09-29).
   The name now arrives with the rest of the page.

8. **Safari captured the new page mid-scroll.** The site smooth-scrolls while
   anything has focus, so Next's scroll-to-top became an animation and the
   product page was captured ~1,800 px down: the vial flew off the top of the
   screen. Fixed for the whole site with `data-scroll-behavior="smooth"` on
   `<html>` (Next 16's opt-in to turn smoothing off during navigation).
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

## Not done yet

In `docs/DEFERRED_POLISH.md`: render the flagship stand-in from the
presenter's own rig (the studio lens differs, so the still and the live vial
are ~8% different in width and the wake-up changes shape slightly), and split
`SpecimenPlate` so drawn products travel as objects rather than as a whole
plate.
