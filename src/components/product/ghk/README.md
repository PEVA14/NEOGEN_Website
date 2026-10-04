# GHK-Cu — matter that responds to its specimen (flagship idea #6)

Prototype of 2026-10-03, GHK-Cu only, awaiting the owner's review.

RETA's world is an instrument that calibrates round its specimen; GLOW's is
lit by it. GHK-Cu's world is a **material**, and the material responds:
**tarnished → combed → burnished → settled → etched depth revealed.**

## The physical story

The ground is a copper plate. It starts **tarnished**: matte, its grain
disordered, so it scatters light and reads dull. The specimen **burnishes**
it:

1. **Catalogue → GHK-Cu.** The store goes and the tarnished plate is simply
   there under it (a quick, even fade — `vial-transition.css`). As the vial
   travels, the plate's grain is combed along its path and turns lustrous
   behind it: a burnished stroke from the card to the landing, drawn while the
   vial is still in the air.
2. **Landing.** Where it lands the grain settles into a turned finish (a
   small, damped overshoot as it settles) and the lustre spreads outward
   through the plate. The stroke fades into it.
3. **Depth.** The compound's name is **etched** into the plate. An etched
   floor is never burnished, so the name is not drawn on: it is what stays
   matte when everything round it has been polished, and the walls of the cut
   catch the light as a hairline.
4. **Quiet.** The plate is still. Commerce sits on plain plate: the relief and
   most of the sheen stand down under the commerce column.
5. **Afterwards (the settled interaction).** The plate behaves as metal does.
   Moving over the stage (a fine pointer) moves the key light a little, and
   the turned finish's reflection and the etching's lit walls follow; on any
   screen, scrolling the plate past the light does the same. Nothing moves
   when nothing is moved.
6. **Direct entry.** Nothing travelled, so there is no stroke: the plate
   starts tarnished where the vial already stands, and the turned, lustrous
   finish spreads from it (~1.3 s).
7. **Phone.** The compact layout sets no name across the field; the plate
   is still etched with it, across the plate behind the vial, starting just
   past the left edge as the wide layout crops it.
8. **Reduced motion.** The settled plate, once, from the first frame. No
   pointer or scroll response.
9. **No WebGL** (or a lost context). The ordinary ground and the ghosted
   name, as before (`data-burnish-unsupported`).

## Heavier (owner, 2026-10-03: "more of a heavy steel/copper/industrial vibe")

The plate is copper over heavy steel rather than flat brown: a darker, cooler
gunmetal base (`STEEL` in the shader) with copper living in the reflection —
a hard, narrow steel-white core with copper shoulders either side of it. The
turned finish is finer and reads machined, a few long tool marks run with the
grain (catching the light only where burnished), and the etching is cut
deeper: a darker floor, a crisp lit wall toward the light and a shadowed wall
away from it. The commerce column keeps its grain and marks quiet.

## The type, in the plate's metal (owner: "I meant mostly for the text")

The name and the price are cut from the same metal: copper over steel, lit
from above per line, a fine brushed grain inside the letters, and a hard,
heavy edge under them (`ghk.module.css`, "The type"). Their narrow glint is
driven by the plate (`--ghk-sheen`, written by `BurnishField` only when it
changes): it is burnished across once as the plate settles, then sits where
the plate's light falls and follows the pointer with it. No WebGL or reduced
motion: it rests. `AddToBag` marks its price `data-price-value` so a world can
style it; buttons and labels stay plain ink.

## Integrity

A metaphor for the interface, not a picture of anything the compound does:
a finished copper surface and its light. No particles, field lines,
molecules, binding, tissue or "attraction" toward the specimen; nothing that
could read as an assay hallmark or a purity mark (only the product's name is
etched, never a strength, lot or grade). The record's own sourced sentences
(that GHK "attracts immune and endothelial cells") are why nothing here is
drawn being pulled toward the vial.

## Files

- `material.ts` — the fragment shader and the clock (`plateAt`), plain data
- `BurnishField.tsx` — `useBurnishArrival` (holds the 3D until the plate has
  settled) and the field: one WebGL2 quad, drawn only while something changes
- `ghk.module.css` — the plate, no instrument frame, the ghost standing down
- `../ProductStage.tsx` — `data-burnish`, `data-burnish-forming`, the field,
  `data-stage-wordmark` / `data-stage-commerce`
- `../../vial-transition/vial-transition.css` — GHK-Cu's world fades, no circle
- `config/worlds.ts` — `formation: "burnish"`

## Traps found

1. **A child's layout effect runs before a later sibling's ref is attached.**
   The field sits before the media frame; through the stage's refs the frame
   was null after a card tap. The field finds the stage and frame in the DOM.
2. **React holds a view transition's passive effects until it has finished.**
   As a passive effect, the plate did not start until the vial had landed.
   It is a layout effect: the first frame is drawn — and the printed name
   stands down — before the new page is captured.
3. **The page's own dark grounds covered the plate in flight** (GLOW's trap
   3): the section's surface and the stage's `[data-world]` void belong to the
   page's layer, above the world's. They stand down while the plate forms.
4. **An IntersectionObserver can report the page under a running view
   transition as not intersecting.** Gating the arrival on it froze the plate
   mid-flight. Visibility gates only the light's later redraws.
5. **The printed name, then the etching, read as a flash** on a direct load.
   It is hidden from the first paint wherever scripts run.
6. **The etching read "COPPE".** The name was centred on the whole stage, so
   half of it lay under the plain commerce column, and the canvas's condensed
   face draws a little wider than the page's box for it, so the sheet clipped
   its last letter. The name is now the compound's label name, anchored to
   the media column, and the sheet is the drawn text's width.
7. **A swirl that reaches the commerce column reads as a flare** beside the
   buttons. The settle's overshoot is small and the commerce column stays plain.
8. **Rejected on the way** (judged in the browser): stacked plates settling
   with weight (read as cards and frames — RETA's language); a fully turned
   field (a vinyl record); a turned recess round the vial (a coin); a bevelled,
   embossed name (Photoshop "bevel and emboss", and it ran through the
   commerce column).
