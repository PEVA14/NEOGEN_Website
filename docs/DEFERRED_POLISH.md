# Deferred polish — Homepage

> **Scope note (2026-09-08).** The Living Laboratory interaction layer is
> deferred to V2 — see `V2_LIVING_LABORATORY.md`. Items below that describe
> cinematic 3D choreography are no longer V1 completion criteria; they are
> polish on effects that already work, to be judged against the rest of the MVP.

**Status: Homepage Design V1 approved** at the structural and art-direction
level. Work is stopped here deliberately, not abandoned.

The remaining visual ceiling on the homepage is now **asset-driven rather than
structural**. The compositions, grid, typography, motion architecture and
placeholder discipline are settled; what limits the result is the absence of
real product media and final 3D assets. Further CSS work would produce
diminishing returns against that ceiling.

These items return during the **final site-wide polish phase**, after the
remaining pages exist — several of them can only be judged in the context of the
whole site.

---

## Final polish pass — outcome (2026-09-08)

The pass ran with every page built, which is the condition several items were
waiting on. Result below; the table that follows is the original list.

| #   | Item                       | Outcome                                                  |
| --- | -------------------------- | -------------------------------------------------------- |
| 1   | Hero art direction         | **Done.** See below.                                     |
| 2   | RETA material / lighting   | **Closed for V1** — decision recorded below.             |
| 3   | GLOW atmospheric treatment | **No change.** Judged in full-site context and it holds. |
| 4   | Real product media         | **Still blocked.** No photography exists. Seam built.    |
| 5   | GHK-Cu material and media  | **Still blocked.** No assets exist.                      |
| 6   | Transition / motion tuning | **Declined for V1** — reasoning below.                   |

**1 — Hero.** The lede was set at 19px, the same size as a product card's name,
carrying the one sentence the site opens with against a 26rem graphic wordmark
and a lit object. Legibility was never the problem: it measured 11.4:1. The
problem was that the message was losing to the object on its own page. Raised to
`--text-2xl` at a 32ch measure so it sets in two or three lines, and the ghosted
wordmark went 10% → 13% (it measured 1.28:1 against the ground and read as a
smudge rather than as an intentionally ghosted poster). The object still leads.

**3 — GLOW.** Reviewed against the finished site and left alone. It is the
strongest Experience beat as built; changing it now would be motion for its own
sake.

**4 and 5 — media.** Unchanged and unchangeable without assets, but no longer
blocked on _engineering_: `src/content/media.ts` is the registry, and a single
entry there swaps the diagrammatic silhouette for a photograph in the card, the
catalogue and the 3D fallback at once. Verified end-to-end against a throwaway
file.

**6 — transitions. Declined, with cause.** A cross-page transition is the one
polish item that would actively regress the site. Any animation running on
arrival at the product page shares its frame budget with the WebGL mount — a
measured ~240ms of main-thread work that no amount of compositing hides. That
failure mode cost three rounds of debugging and is written up in
`V2_LIVING_LABORATORY.md` §4.8. Page-to-page motion should be revisited only
alongside the V2 work that solves the canvas-boot problem.

## Open technical decision — RESOLVED for V1

**Keep the rect-area lights.** Three reasons:

1. The 107 KB sits in a **deferred** chunk. It is fetched only when a 3D stage
   mounts, so the catalogue, research hub, bag and checkout never pay it, and
   initial load is unaffected.
2. The glass was signed off after three explicit rounds — cobalt, then chrome,
   then clear. That fix depends on the specular streak a rect-area light draws
   down curved glass; swapping the light type changes exactly the behaviour
   those rounds were tuning.
3. The original note said this should be decided "with real assets in front of
   us, not before." There are still no real assets. Deciding now, to save bytes
   nobody downloads on the pages that matter, would be trading a settled visual
   for a number that does not appear in the metric it would supposedly improve.

Revisit with item 2, when real assets exist.

## Deferred items

| #   | Item                                                      | Blocked on                                                     |
| --- | --------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | Dedicated final Hero art-direction pass                   | Judgement in full-site context                                 |
| 2   | RETA material / lighting polish                           | Real assets + a dedicated pass                                 |
| 3   | Final GLOW atmospheric treatment                          | Art direction, once other pages set the tone                   |
| 4   | Real product media replacing the diagrammatic silhouettes | **Product photography / renders**                              |
| 5   | Final GHK-Cu material and media treatment                 | **Real GHK-Cu assets**                                         |
| 6   | Final transition and motion tuning                        | **All pages existing** — transitions are a whole-site property |

### Notes on the asset dependencies

- **Product media (4)** is the single highest-leverage missing asset. Three
  product cards whose imagery is a line drawing is the weakest moment on an
  otherwise resolved page. `ProductCard` and `VialFallback` both render
  `VialSilhouette`, so one component swap covers both places.
- **GLOW** has no object at all, by design — the section's subject is light. It
  needs no GLB, but it does carry its full weight on light and typography.
- **GHK-Cu's core sample** is invented _material_, never invented _product_. A
  real macro texture would replace it without layout changes.
- **RETA glass** was explicitly parked: the current asset is acceptable for this
  phase.

---

## Open technical decision carried forward — superseded by the resolution above

**Rect-area lights cost 107.3 KB gz.** `RectAreaLightTexturesLib` (the LTC
lookup tables) is the entire difference between the 241 KB and 344 KB deferred
3D chunk. It is _deferred_, so initial load is unaffected — initial JS is
~180 KB gz and the 3D chunk is fetched only when a stage mounts.

They were chosen because a rect-area light draws a long specular streak down
curved glass, which is what makes thickness and edges readable. But
`worldEnvironment.ts` already builds tall emissive panels that produce
streak-like reflections through the PMREM cubemap, so the direct lights are
**partly redundant with the environment**. Swapping them for directional or spot
lights would reclaim the 107 KB at some visual cost.

This decision belongs with item 2 (RETA material/lighting polish) and should be
made with real assets in front of us, not before.

---

## Not deferred — settled and not to be revisited without cause

For clarity, these are done and should not be reopened as "polish":

- The Quiet spine and its numbering (only Quiet sections are numbered).
- The four distinct Quiet compositions: editorial spread, catalogue index,
  publication register, document ledger. They exist specifically so no two Quiet
  sections share a shape.
- The three distinct Experience mechanisms: object choreography (RETA),
  luminance (GLOW), material strata (GHK-Cu).
- The seam: a 1px world-accent rule opening every Experience section.
- Commerce stays neutral/charcoal; world colour appears only as product
  identity.
- Zero-radius geometry.
- Placeholder discipline — fields reproduced, values never invented.
