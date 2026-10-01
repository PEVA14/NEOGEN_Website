# The specifications ribbon — the label, unwound into the data sheet

Product page, section 02. A label-styled band wound round a vial at the
bench's edge unwinds across the page and becomes the panel that holds the
section's specifications. Built as a spike (2026-09-30, from the owner's
sketches), made permanent on 2026-10-01 (owner). RETA only; CONVENTIONS §11
records why it is the second exception to the static product page.

## What it does

A full-width bench on the page's own paper, nearly a screen tall
(`RibbonBench`). A vial stands against its left edge, half off the page — a
still, not a 3D scene. Wound round its body is the band, its free end rolled
up just past the vial's edge. The first time the band is well into view (its
top 70 % up the window) it unwinds — once, by the clock, 1.7 s, never wound
back on scrolling up (owner, 2026-10-01; an earlier build held the bench for
75vh of scrolling): it comes off the back of the vial and out from behind its
edge, the roll travels right laying it down — both ends feeding the run
between them — until it reaches the bench's margin, still wound round the
vial, and is the panel that holds section 02 (name and range, the
presentations, the classification, the research-use notice).

The panel is real DOM in the reading order from the start; it is only
transparent until the band lands (and on paper it always shows).

**Without it** — a product with no bench (`benches.ts`), a screen under
64rem, reduced motion, no WebGL 2 — section 02 renders exactly as it always
has. If the band's code or WebGL fails after all, an error boundary shows the
panel at once.

## How

- **Per product** (`benches.ts`): the vial still with its body's proportions,
  the model it was rendered from, and the label's stripe and ink. Plain data;
  `check:media` reads it.
- **Geometry** (`ribbon.ts`, `layRibbon`): one strip, three parts — a spiral
  round the vial (outermost turn leaving at its back, heading right; upstream
  it passes the front, so on the visible half it is seen wrapped round the
  glass), a flat run in the plane behind the vial, and the free end rolled
  print-in (Archimedean, `ROLL` 0.2 of the band's height at rest). A
  depth-only cylinder the vial's size stands where the vial stands, so
  whatever passes behind the glass is hidden. Normals from the band's own
  direction.
- **Two prints**: the front (the side that ends up facing the viewer — the
  panel's own marks, measured off its elements) and the back (the side wound
  outward on the vial and round the roll — the same hairline and stripe, and
  the lockup where the vial shows it at rest, mirrored because that side runs
  right-to-left). Drawn per pixel by the paper shader from where the marks are
  (`ribbonPrint`), composed in sRGB as the page composes the panel; the only
  texture is the logo's alpha.
- **One canvas over the band's strip of the bench** (`RibbonOverlay`),
  orthographic, one unit to the CSS pixel, looking down 0.08 rad so the band
  is seen to curve round the vial and the roll shows its spiral. Print
  colours exact where square to the viewer (the panel resolves over the band
  without a seam), shaded by normal elsewhere.
- **Timing**: progress runs on the clock once an `IntersectionObserver` on
  the panel fires: unroll 0 – 0.86, the panel resolves 0.82 – 0.97.

## Cost

Measured 2026-10-01, 1440 × 900: frames only at mount, on a resize and during
the run — none while the page scrolls, before or after (R3F's own scroll
re-measure is off). About 0.1 ms a frame during the run. 0.9 MB of texture on
the GPU (the spike's painted prints were 74 MB). The canvas is made when the
bench is within a screen of the window; multisampling only below 2×.

## The vial still

`public/images/products/reta/bench-reta-v7.webp`: the bare V4 vial — the
product page's own live scene with the label hidden — upright and square,
lit as on a light set (`NEUTRAL_RIG`: black flags, no backlight) and
refracting the page's paper (`#f3f0ea`) rather than RETA's dark world; on
RETA's own rig the glass read as navy. 900 × 1640 canvas at 2×, then measured
for `bodyTop`, `bodyBottom` and `radius`.

The capture mode that rendered it lived in the spike and was not kept (it
needed label-hiding hooks in `VialModel`). `check:media` fails when the
page's model changes and the still has not been re-rendered; re-rendering
needs that mode rebuilt, or the studio page taught to drop the label
(DEFERRED_POLISH).

## Adding a product

Its bench needs a still of its own bare vial (as above), the body measured
off it, and its label's colours — then an entry in `benches.ts`. Nothing else
is per product.
