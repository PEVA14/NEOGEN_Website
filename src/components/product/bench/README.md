# The bench — every product's opening, in the bright field

Prototype of 2026-10-02 (overnight session). The Living Laboratory baseline for
the products that are not flagships: **every product is alive; flagships are
simply allowed to become cinematic.** Shown only for the slugs in
`prototypes.ts`; every other product still opens on `ProductPlate`. Removing a
slug returns its page to exactly what it was.

## See it

```bash
npm run build && npx next start -p 3110
```

Open `/es/productos` and tap Semaglutide (the baseline), or open any of the
stress tests directly: `tirzepatide`, `bac-water`, `lipo-c-with-b12`, `hcg`,
`cjc-1295-without-dac-ipamorelin`, `dermorphin`,
`healthy-hair-skin-nails-blend`. Development mode does not prefetch, so the
flight from the card only plays in a production build (vial-transition
README).

## The idea

A flagship is a specimen in a **dark field**: a world of its own that forms
around it (`ProductStage`, RETA #3) and an instrument that reads it (#4). Every
other product stands on the **bench**, in the **bright field**: the studio its
picture was made in, extended across the whole stage. The cliff this closes
was not a lack of animation. The plate was a picture in a box beside a form,
and the flagship was an object standing in a space.

|         | Plate (before)                         | Bench                                                                                    | Flagship world                                             |
| ------- | -------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Ground  | paper; the media in a filled stone box | the studio stone, full-bleed, in the area's material                                     | the world's void                                           |
| Light   | none                                   | one lamp over the specimen                                                               | the world's light, travelling with it                      |
| Arrival | page fades in                          | set down: the floor, shadow and reflection form from its contact point                   | the world forms; the instrument is projected from its axes |
| At rest | still                                  | leans on its base under a cursor; a liquid keeps level                                   | turns (live 3D); the frame reads it                        |
| State   | price only                             | the rail reads the selected presentation; the vial is set down again; the price comes up | price                                                      |
| Cost    | an image                               | images/SVG + CSS, one tiny loop while moving                                             | WebGL                                                      |

## The grammar

What every product gets. A grammar, not an animation: each part is a
relationship, and a product's data and assets decide how it plays.

1. **Continuity.** The object tapped is the object that arrives
   (`vial-transition`). A render travels as its cut-out; a drawn product
   sends its drawn vial alone (`SpecimenPlate travel`) and its set stays with
   the card.
2. **Environment.** The studio stone across the stage, in the discovery
   area's material (6% of the area's hue: the Design Bible's colour stage
   between the neutral store and a world). A render's set is composited by
   **luminosity**, so it keeps its own light, shadow and reflection and takes
   the area's tone; the specimen itself is never tinted.
3. **Light.** One lamp over the specimen, slightly toned by the area. The
   stone falls a little darker towards the edges.
4. **Formation (causal, short).** The specimen comes down the last few
   millimetres and touches the bench; its set forms outward from the contact
   point; the registration marks register; the caption rail draws. About
   1.1 s after a card tap, 0.8 s after a direct entry, from the first paint
   (`data-arrival`, `../arrival.ts`). Nothing waits on it.
5. **Physical response.** Under a fine pointer the vial leans up to 2° on its
   own base, damped. A liquid (a product sold by volume) keeps its surface
   level as the vial leans, and settles when the vial is set down. On a touch
   screen there is no lean; the set-down settles a liquid all the same.
6. **Information.** The rail is the instrument's caption: the selected
   presentation (`5 mg × 10 viales`) and its index (`P-01 / 04`, the ladder's
   own numbering from the ribbon). Verified registry data only, `aria-hidden`
   (the price line says the same).
7. **State.** Choosing a presentation sets the vial down again, updates the
   rail, and brings the price up into place (`AddToBag`, every product page).
8. **Quiet Mode.** Then nothing moves. No idle animation, no ghosted name
   (tried: on a light ground it read as clutter behind the price).

## What varies, and what drives it

Only what the data or the assets actually support. No visual family implies a
scientific relationship.

| Driver           | Source                                      | What changes                                                                                                       |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Discovery area   | `data/discovery` (`areas.css`)              | the bench's material, the lamp's tone, the rail and marks' line                                                    |
| Physical form    | `Strength.kind` / the range ("ml" → liquid) | liquid: a visible level that keeps flat and settles; powder: nothing moves inside                                  |
| Presentations    | `variants`                                  | the rail's index (hidden for one presentation); the set-down on a change                                           |
| Composition      | `composition` / blend strengths             | the rail reads the full composition (wraps)                                                                        |
| Asset capability | `specimens.json` (split render)             | **render**: the photographic specimen, its real set, 1.16× magnification. **drawn**: the drawn vial on a drawn set |

Tried and found NOT to vary meaningfully: name length (the drawn label already
fits two lines), IU vs mg (both powder), no area (falls back to the neutral
studio stone, which is correct).

## Tiers

- **Standard** — every product (81 today): the bench with the drawn vial.
- **Enhanced** — a product with a split studio render (`specimens.json`;
  Semaglutide today): the photographic specimen and its real set. An
  objective asset capability, never a promotion: running
  `capture-specimen` on a registered studio still is what puts a product here.
- **Flagship** — a world (`config/worlds.ts`): RETA, GLOW, GHK-Cu. Dark field,
  live 3D, bespoke formation and interaction.

The bench never mounts a canvas. Live 3D stays the flagships': it costs a
WebGL boot per page, and it is the one thing that makes a flagship read as a
different order of object.

## Files

- `ProductBench.tsx` / `.module.css` — the opening
- `prototypes.ts` — which products open on it
- `../arrival.ts` — `useArrival`, shared with RETA's formation
- `components/ui/SpecimenPlate.tsx` — `travel` (the drawn vial alone),
  `data-part` on the contact shadow, reflection and liquid
- `components/ui/ProductCard.tsx` — a bench product's card sends its vial alone
- `components/commerce/AddToBag.tsx` — the price comes up on a change
- `styles/motion.css` — `--ease-settle`
- `app/[locale]/productos/[slug]/page.tsx` — chooses the opening

## Traps found

1. **A render's set includes the vial's footprint.** Set down from a few pixels
   up, the footprint shows as a ghost base under it: the set forms only after
   contact (`--bench-at-set` after `--bench-at-touch`), and the drop is 0.8%.
2. **A feathered still shows its own box.** The feather has to fade out inside
   the image's box, or its straight edges appear; a round feather also crossed
   the set's horizon band and drew a ring.
3. **The drawn plate's liquid sits behind the label.** A level that keeps flat
   could never be seen; on the bench it fills to the shoulder (CSS only — the
   plate everywhere else is unchanged).
4. **A back/forward within 2.5 s replayed a card arrival** with no flight (and
   held RETA's canvas): a history navigation now clears the arrival mark
   (`incoming.ts`).
5. **`var()` in a keyframe's `animation-timing-function` is ignored** (found on
   RETA #3); curves inside keyframes are written out.
