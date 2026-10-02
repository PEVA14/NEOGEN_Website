# The specifications ribbon — the label, unwound into the data sheet

Product page, section 02. A label-styled band wound round a vial at the
bench's edge unwinds across the page and becomes the panel that holds the
section's specifications. Built as a spike (2026-09-30, from the owner's
sketches), made permanent on 2026-10-01 (owner). On the three flagships — RETA, GLOW
and GHK-Cu; CONVENTIONS §11
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

The section's heading stands in the bench, beside the vial's shoulder and
cap — within the vial's height, aligned with the panel's text, just above the
band (owner, 2026-10-01: "too much empty space") — still first in the reading
order. The panel is real DOM in the reading order from the start; it is only
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
  panel's own hairline and stripe, measured off its elements) and the back
  (the side wound outward on the vial and round the roll — the same hairline
  and stripe, and the lockup twice: where the vial shows it at rest, and where
  it shows it once the band is laid down, so the vial keeps its label; owner,
  2026-10-01: "make the vial here not be so empty, maybe leave the logo
  there"). Mirrored, because that side runs right-to-left. The panel itself
  has no lockup — its element is kept, hidden, as the print's measure. Drawn
  per pixel by the paper shader from where the marks are (`ribbonPrint`),
  composed in sRGB as the page composes the panel; the only texture is the
  logo's alpha.
- **Into the panel without a step, still round** (owner, 2026-10-01: "the
  separation looks way too obvious", then, levelled flat, "a plain white
  rectangle"): the part wound round the vial is raised by the depth of the
  point where its outer turn crosses the vial's edge × tan of the camera's
  tilt — so exactly there it is level with the panel (measured: within half a
  pixel), while across the vial's front it still dips in the arc of a band
  seen round glass from a little above (~12 px at the front). One white paper,
  lit from the front a little right: white across the front, ~75% at the rim.
  The sheen multiplies the paper, so ink stays black. Where the flat band
  comes out from behind the vial it carries the vial's soft shadow (12%,
  over 0.18 of a radius) — drawn by the shader during the run and by the
  panel's `::after` once landed, the same in both. The roll keeps the tilt.
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

`public/images/containers/v4-bare.webp`: the bare V4 vial — the product
page's own live scene, RETA's model with the label hidden — upright and square,
lit as on a light set (`NEUTRAL_RIG`: black flags, no backlight) and
refracting the page's paper (`#f3f0ea`) rather than RETA's dark world; on
RETA's own rig the glass read as navy. 900 × 1640 canvas at 2×, then measured
for `bodyTop`, `bodyBottom` and `radius`.

**One still for the three flagships.** RETA, GLOW and GHK-Cu ship on the same
V4 container and differ only in the label's picture (`reta-v7.glb`,
`glow-v4.glb`, `ghk-cu-v4.glb` are byte-identical in geometry and materials),
and the still does not show the label — so a render from any of them is the
same picture. They also wear one label design, re-lettered, so the band's
stripe and ink are the same too (`benches.ts`). `check:media` fingerprints
each bench's page model — every byte of geometry and every material setting,
the label's picture aside — against the model the still was rendered from,
and fails on a mismatch.

The capture mode that rendered it lived in the spike and was not kept (it
needed label-hiding hooks in `VialModel`). Re-labelling a flagship needs
nothing here; re-shaping its container does, and re-rendering
needs that mode rebuilt, or the studio page taught to drop the label
(DEFERRED_POLISH).

## Adding a product

A product on the V4 container with the flagship label: an entry in
`benches.ts` reusing `V4_BARE` and `FLAGSHIP_LABEL`. On another container, or
another label design: a still of that bare vial (as above), its body measured
off it, and its label's colours. The panel lays out one to seven presentations
(a short ladder keeps a step's width, from the left). Nothing else is per
product.
