# The specifications ribbon — the label, unwound into the data sheet

Product page, section 02. A label-styled band wound round a vial at the
bench's edge unwinds across the page and becomes the panel that holds the
section's specifications. Built as a spike (2026-09-30, from the owner's
sketches), made permanent on 2026-10-01 (owner). On every product page —
first on the three flagships, then on all of them the same day (owner: "every
vial should have it in its product page, not only reta"); CONVENTIONS §11
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

**Upright, under 64rem** (phones and tablets; owner, 2026-10-01: "the exact
same thing but vertically"): the whole bench a quarter turn clockwise. The
vial lies across the bench's top, cap to the right — WHOLE, cut only by the
page's sides (its half, cut flat mid-page, "looks so weird"), and longer than
a phone is wide, so its body (and the band) can be most of the width; the band
unrolls DOWN the page into the panel. Since the whole vial shows, at rest its
band reads as its label (owner, 2026-10-01: "have the text start on the vial
and then disappear"): the logo, then the product's name and range, upright —
set from the panel's own name and range elements, in their fonts — which roll
off with the band and fade as it unwinds, while the logo that ends square on
the vial's front fades in. The hairline runs down the panel's
right, the stripe down its left (its notice set vertically); the
specifications inside stay upright and stacked, and set the panel's length;
the heading stands above the bench. Nothing is re-modelled: `RibbonOverlay`
turns every measured box back into the band's own frame (`frame`) and rolls
its camera a quarter, so it draws the wide picture, turned. Where the band
unwinds less than a quarter turn and a logo (a short panel), the vial carries
one logo that drifts, not two.

**Without it** — reduced motion, no WebGL 2 — section 02 renders exactly as it always has. If the band's code or
WebGL fails after all, an error boundary shows the panel at once.

## How

- **One bench** (`benches.ts`, `BENCH`): the vial still with its body's
  proportions, the model it was rendered from, and the label's stripe and
  ink. Plain data; `check:media` reads it. What is per product — the name, the
  range, the presentations, the classification — comes from the catalogue.
- **As long as what it holds** (owner, 2026-10-01: "too much blank space when
  there's not enough info"): across, the panel is sized by its content, from
  55 % of the run (vial's edge to the bench's margin) to all of it — a single
  presentation lands a band about two-thirds as long as RETA's seven. The
  canvas measures the panel, so the band unwinds to wherever it ends. To make
  that possible the panel is no longer a container: its type is sized from
  `--u` (a hundredth of the band's height, what `cqb` was), and each part has
  a most it takes of the run (name 22 %, ladder 55 %, facts 24 %).
- **The catalogue's tail**, every case laid out by rule rather than by hand:
  - the name is set smaller when its longest word (`--word-chars`) would not
    fit its column (SURVODUTIDE, (METHYLCOBALAMIN)); on the upright vial it is
    fitted to the label's height as well (`drawWords`; "CJC-1295 without DAC +
    Ipamorelin" is four lines);
  - a range is set in its ends (`rangeEnds`, one box each), so it breaks
    between them, after the dash, and inside one only after a sign when the
    end is longer than the line (Lipo-C's five components) — never between a
    number and its unit; the vial's print breaks the same way;
  - a step is 12 % of the run, or as wide as its figure at full size (Lipo-C's
    "15+50+50+5+1"), seven sharing 55 %; its figure is smaller when it would
    not fit (`--steps`, `--chars`, `--reserve` for the padding and the unit
    beside): L-carnitine's six "1200"s are set smaller than RETA's seven. A
    unit of more than a word ("mg / 10 ml") goes under its figure. Upright,
    the columns are as wide as the longest figure needs, as many to a line as
    fit.
  Audited 2026-10-01 on all 85 products at 375, 390, 768, 1024, 1440 and 1920
  wide (in iframes, the layout only): no overflow, no overlap, nothing into
  the hairline or the stripe.
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

Upright, 402 × 874 phone at 4× CPU throttle: the run at a steady 16.7 ms a
frame, no long task, none drawn while scrolling after; 1.4 MB of texture (the
logo and the vial's label words). Not yet judged on a real phone.

## The vial still

`public/images/containers/v4-bare.webp`: the bare V4 vial — the product
page's own live scene, RETA's model with the label hidden — upright and square,
lit as on a light set (`NEUTRAL_RIG`: black flags, no backlight) and
refracting the page's paper (`#f3f0ea`) rather than RETA's dark world; on
RETA's own rig the glass read as navy. 900 × 1640 canvas at 2×, then measured
for `bodyTop`, `bodyBottom` and `radius`.

**One still for every product.** Every product ships in the V4 container: the
flagships differ only in the label's picture (`reta-v7.glb`, `glow-v4.glb`,
`ghk-cu-v4.glb` are byte-identical in geometry and materials), and every
other product is shot on RETA's model (the studio reads `MEDIA.reta.model`).
The still does not show the label, so a render from any of them is the same
picture. They also wear one label design, re-lettered, so the band's stripe
and ink are the same too (`benches.ts`). `check:media` fingerprints every
product's model — every byte of geometry and every material setting, the
label's picture aside — against the model the still was rendered from, and
fails on a mismatch, or when that model is not RETA's.

The capture mode that rendered it lived in the spike and was not kept (it
needed label-hiding hooks in `VialModel`). Re-labelling a flagship needs
nothing here; re-shaping its container does, and re-rendering
needs that mode rebuilt, or the studio page taught to drop the label
(DEFERRED_POLISH).

## Adding a product

Nothing: a new product in the catalogue opens section 02 on the bench. The
panel lays out one to seven presentations and sets its own length; a figure,
name or range longer than any today is shrunk to fit, so re-run the audit
above if one is much longer. A product on another container, or under another label
design, would need its own bench — a still of that bare vial (as above), its
body measured off it, its label's colours — and `benchFor` back in
`benches.ts`; `check:media` fails until then if it ships a model.
