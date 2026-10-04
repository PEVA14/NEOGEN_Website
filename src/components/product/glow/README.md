# GLOW — the blend as light (flagship idea #5)

Prototype of 2026-10-02, GLOW only, awaiting the owner's review.

RETA behaves like an instrument: calibrate → measure → inspect. GLOW's
physical language is light: its specimen is the source of its world.

The brief asked for illuminate → separate → reveal → recombine. The
separation was built (paths of light from the vial onto the constituents'
names, as wide as each part's share of the mass) and **removed at the owner's
first review**: "cute but it doesn't look good". What stayed is the
illumination; the constituents are read, linked and set in the vial's light.

## What happens

1. **Catalogue → GLOW.** The store's light goes down warm, as if the only light
   left in it were the amber specimen's (`vial-transition.css`, `vt-glow-dim`).
   The vial travels through the dark carrying its own light (`.carried`).
2. **Illuminate.** The page is revealed only where that light reaches: the
   name across the field and the page's own type come up outward from the
   vial (a light's falloff as a mask, moved and grown with `mask-position` /
   `mask-size`). When the vial lands the light opens into the room, and the
   room's resting light is centred on the vial (`.lamp`, `.floor`) — not a
   wash from above, as RETA's is.
3. **Rest.** The vial stands in a halo of its own light (`.halo`), close
   behind it and behind the canvas, so the glass is untouched: it refracts
   its own pool (`RefractionGround`), and the halo is about as bright at its
   centre, so what is seen through the glass continues what is round it. The
   composition line under the title is the parts as links to their products,
   with a faint shine of the same light round the type. The name above it
   is set in gold leaf (owner, 2026-10-03): a static gradient from the
   world's own light and accent, lit from above, per line (`1lh`); flat light
   where text cannot be clipped or colours are forced. `CommercePanel` marks
   the name `data-product-name` so a world can style it.
4. **Quiet.** Commerce, the specification ribbon, the record.
5. **The composition moment (second impact).** In the flagship interlude's
   place: the vial, in its own light, beside its parts — name, stated mass,
   its product and its scientific record. When the section is reached the
   light comes up, once, and the readings take a faint shine from it.
6. **Direct entry.** No catalogue origin is faked: the light comes up where
   the vial stands and the page is revealed outward from it.

## What the information is

Only the catalogue's composition string, verbatim ("GHK-CU 50mg + TB-500 10mg +
BPC-157 10mg"), read by `composition.ts`:

- the parts' **stated masses**, printed as stated;
- each part's **catalogue product**, matched by name or slug, exactly one, and
  its **scientific record** when one is published.

Nothing about what the parts do, how they interact or why they are combined.

## Files

- `GlowLight.tsx` — `useGlowArrival`, `GlowLamp` (lamp, halo, carried light, floor)
- `GlowConstituents.tsx` — the composition line as links
- `GlowComposition.tsx` / `.module.css` — the composition moment
- `composition.ts` — the composition, as data
- `glow.module.css` — the lamp and halo, the reveal, the gold name, the composition line's shine
- `../ProductStage.tsx` — GLOW's layers in the stage (`illumination`)
- `../CommercePanel.tsx` — `descriptor` slot
- `../../vial-transition/vial-transition.css` — GLOW's flight
- `config/worlds.ts` — `formation: "illumination"`

## Traps found

1. **Animating a registered `<length>` read from a variable** (the reveal's
   centre) resolved to the property's initial value in Chrome: the page was
   revealed from its top-left corner. `mask-position` / `mask-size` are
   interpolated by the browser itself and read variables correctly.
2. **A dark world inside a travelling light, over a light store, reads as a
   dark hole**, not as light. Light only reads as light once the room is dark:
   the store dims first (warm), then the light shows.
3. **The page's dark grounds covered the store from the first frame** once the
   page's fade was turned off: the section's surface and the stage's own
   `[data-world]` void. Both stand down while the light arrives.
4. **The composition moment's lamp widened the page on a phone**, the browser
   zoomed out, and the vial transition aborted ("viewport size changed"): the
   section clips horizontally.
5. **The reveal mask outlived reduced motion** (its end is an animation's end):
   it exists only where motion is allowed.
6. **Paths of light onto type read as streaks**, not as light, at the sizes
   the type is set (owner: "cute but it doesn't look good"). Removed; the
   type takes the light as a shine instead.

## The name in solid gold (owner, 2026-10-04)

GLOW's name across the field is solid, polished gold rather than a ghost: a
deep gold body lit from above with the hard lower reflection of polished
gold, a broad reflection, a soft shadow for weight, and the title's sweep of
light on the same 7 s clock (`glow.module.css`, "in solid gold"). The title's
gold is leaf: a fine crease grain under the sweep.

Tried as GLOW's own texture and declined by the owner: reeded glass, then a
gilded wall of gold leaf. Also tried and set aside on the way: back-lit paper
(read as water or wood) and caustics thrown by the vial (thin, they read as
veins — a vascular picture next to a blend whose parts' records mention
angiogenesis is exactly the implication to avoid).
