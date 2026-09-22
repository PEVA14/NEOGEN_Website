# Models

Lightweight `.glb` product assets, one per product, named by its **slug**:

```
public/models/<product-slug>.glb
```

Today: `reta-v7.glb`, `ghk-cu.glb` and `glow.glb` are what the site serves,
with `reta-v2.glb` kept as the CANONICAL CONTAINER — the shape every
non-flagship product is rendered on, and the one `studio/label.ts` is measured
against. RETA's is now a different shape — the V4 crimp-top — so until GLOW
and GHK-Cu are re-exported to match, the flagships do not share one vial.

## Where they come from

Blender exports land in `3d assets/`, which is **gitignored working storage**.
Nothing there is served. The served file is derived from one by:

```bash
node scripts/prepare-model.mjs "3d assets/RETA_VIAL_V4.glb" \
  public/models/reta-v7.glb --jpeg 92
```

That script drops nodes the web build should not carry, re-encodes label
textures (PNG → JPEG, roughly a quarter of the bytes at the same 2048²), prunes
what is then unreferenced, and **refuses to write a vial whose glass has lost
its transmission** — the one mistake that would turn the glass into a white
cylinder.

**What it will and will not transform.** It never moves or rotates the object
and never rescales the whole of it: `VialModel` normalises position and overall
size at load time, and an asset silently re-posed here would make that
normalisation lie. `--scale-node` is the exception, and it is not one: it
resizes ONE PART relative to the rest, which is a proportion the model carries
with it, not a pose the page owns.

Current recipes:

| Served file   | Source export             | Extra                                                            |
| ------------- | ------------------------- | ---------------------------------------------------------------- |
| `reta-v7.glb` | `RETA_VIAL_V4.glb`        | `--jpeg 92` only — a crimp-top with its own UVs; see (3)         |
| `reta-v2.glb` | `NEOGEN_RETA_VIAL_V2.glb` | `--drop "0.75 Dram Autosampler Lid"` (1), `--scale-node` cap (2) |
| `ghk-cu.glb`  | `NEOGEN_GHK-Cu_VIAL.glb`  | `--scale-node` cap (2)                                           |
| `glow.glb`    | `NEOGEN_GLOW_VIAL.glb`    | `--scale-node` cap (2)                                           |

**V3 and V4 need neither of the first two flags.** It carries ONE closure, so there
is no interpenetrating lid to drop, and its cap is already Ø112.0 mm against
the Ø113.2 mm that `--scale-node … 0.92` produced on V2 — the proportion the
owner approved is now in the export. Both decisions moved to Blender, which is
where they belong.

(1) That export carries **two** lids, stacked and interpenetrating: the narrow
`NEOGEN_VIAL_CAP` and the wider `0.75 Dram Autosampler Lid`. Only one can be
right. The build keeps the narrow cap, which matches the approved first-
generation silhouette; to ship the wider one instead, drop `NEOGEN_VIAL_CAP`
rather than the autosampler lid.

(2) `--scale-node "NEOGEN_VIAL_CAP" 0.92` — the cap at 92% (owner, 2026-09-20),
Ø123 × 44 mm as exported, Ø113 × 40 mm as served.

It shrinks **around the cap's top**, not its base. The glass ends at 286.7 mm
and the cap at 287.9; shrinking from below would lift the closure off the lip.
What the smaller cap buys is visible neck under it — the base rises from 244.3
to 247.8 mm and the top holds at 287.9.

The floor is about **0.79**: the glass neck is Ø97.2 mm against a Ø123.0 mm cap,
so there is 12.9 mm of skirt per side, and below that the neck starts showing
through. Changing the factor and re-running the recipe is the whole edit — and
it has to be re-run for all three files, because the cap is the same part in
each and they must agree.

If the owner would rather the proportion lived in Blender, drop the flag and
ask for it in the export; nothing in the web layer depends on it.

(3) **The printed strip, and how to replace it** (`--label`).

V3 carries a mock-up label: "RETATRUTIDE · 10 ML · INJECTABLE PEPTIDE ● 99%
PURITY · SUBCUTANEOUS USE". Two of those lines are administration claims this
site does not make, the purity figure is analytical evidence that does not
exist for any product, and the volume matches no presentation in the catalogue
— RETA sells 5–60 MG in packs of ten.

**It ships as exported, deliberately** (owner, 2026-09-21): the packaging is
being designed and is easier to judge in place, and the site is not public. It
is declared in `DEMO_ARTWORK` (`content/media/registry.ts`) so `check:media`
names it on every run, and it is launch blocker §6.6a. **Replace it before the
site goes public** — either re-export from Blender, or put the drawn sheet on
this same geometry:

```bash
npm run dev
node scripts/export-label.mjs reta --model /models/reta-v4.glb \
  --out "3d assets/reta-v3-label.png"
node scripts/prepare-model.mjs "3d assets/NEOGEN_RETA_VIAL_V3.glb" \
  public/models/reta-v5.glb --label "3d assets/reta-v3-label.png" --jpeg 92
```

`export-label.mjs` renders the label `studio/label.ts` draws — the brand
lockup, the product's name, its presentation range — and writes the 2048²
sheet; `--label` swaps it onto whatever texture the LABEL material points at,
leaving UVs, meshes and every other material alone.

**WHY IT IS BAKED AND NOT OVERRIDDEN AT RENDER TIME.** Four paths read that
texture — the catalogue still, the product page's live viewer, the homepage
moment and the studio — and only one of them has a material pass. Replacing it
in the file makes the served model correct in all four by construction, and
means the repository does not carry artwork it will not show.

**THE DRAWN SHEET IS A STOPGAP, NOT A DESIGN.** It is what the site can print
honestly while real artwork is being drawn. When corrected artwork is exported,
drop `--label` and re-run; the label geometry calibration in `studio/label.ts`
(`SHEETS`) is only consulted while a drawn label is in use.

## Assets from somewhere else

A file that did not come out of the owner's Blender scene arrives speaking a
different language. The render layer finds parts by what their material IS —
glass is anything carrying `KHR_materials_transmission`, the cap is anything
with `metalness > 0.5`, the label is matched by name — and a Sketchfab or Maya
export satisfies none of that. Its body has no transmission at all, so it
renders as an opaque cylinder.

`--retag "<material>=<role>"` brings such a file far enough into this project's
vocabulary to be LOOKED AT. Roles: `glass` (names it, clears the tint, adds
transmission and an IOR of 1.45), `metal`, `label`, `plastic`.

```bash
node scripts/prepare-model.mjs "3d assets/vial.glb" public/models/vial-trial.glb \
  --retag "aiStandardSurface1SG=glass" \
  --retag "aiStandardSurface2SG=metal" \
  --retag "aiStandardSurface3SG=label" --jpeg 92
```

**It is a comparison tool, not a pipeline.** Nothing NEOGEN serves should need
it: a served model comes from the owner's Blender file with its materials
already named. If a foreign shape is ever adopted, the tagging belongs back in
the source, not in a flag.

**What retagging cannot fix: missing UVs.** A mesh with no `TEXCOORD_0` cannot
carry a label at all — no printed sheet, no drawn one, nothing. Check before
spending time on a shape:

```bash
node scripts/inspect-model.mjs <file.glb>   # reports UVs per part
```

## One design, many products

A product in the same packaging needs the same label with its OWN name and
presentation. Rather than re-drawing the sheet from registry data (which loses
the design) or exporting one per product in Blender (work per product),
`relabel-sheet.mjs` keeps the artwork and replaces exactly two lines:

```bash
npm run dev
node scripts/relabel-sheet.mjs --sheet "3d assets/reta-v4-label.png" \
  --name SEMAGLUTIDE --line "5 – 30 MG" --out "3d assets/semaglutide-label.png"
node scripts/prepare-model.mjs "3d assets/RETA_VIAL_V4.glb" \
  public/models/semaglutide-v1.glb --retag "aiStandardSurface3SG=label" \
  --label "3d assets/semaglutide-label.png" --jpeg 92
```

The rows it clears are MEASURED off the sheet, not guessed (`LAYOUT` in that
script), so the replacements land on the same baselines, at the same cap
height, in the same colour, and the hairline between them survives. It sets
them in NEOGEN's own display face, which is close to — not identical with —
the artwork's own.

**Everything else on the sheet stays as drawn.** If the artwork carries a lot,
an expiry, a purity figure or a route of administration, the re-lettered sheet
carries them too, so whatever is produced this way stays declared in
`DEMO_ARTWORK` (`content/media/registry.ts`) until the design is corrected.

## Declaring one

A file here does nothing until it is named in `src/content/media/registry.ts`
under the product's slug:

```ts
"ghk-cu": {
  model: "/models/ghk-cu.glb",
},
```

A model is **media, keyed by product**, not a property of an Experience world.
A product with no entry is not a gap in the data — it is a product nobody has
modelled, and its page opens in its world or on the silhouette instead.

Declaring a model turns on the live viewer, the cursor-responsive hint and the
card's hover preload for that product. Nothing else has to change.

Pair it with a `poster` entry once a still has been captured from the settled
scene: the poster is what paints while the GLB is in flight and what stands in
for anyone without WebGL or with reduced motion.

## Budget and versioning

Keep exports under ~500 KB. `reta-v7.glb` is 652 KB — over, because its label
is a 2048² PNG that does not get smaller as JPEG (flat artwork compresses well
as PNG); packing the art tighter on the sheet in Blender is the lever. The other
three are ~460 KB. The raw exports are 0.8–1.0 MB, so
the preparation step is what keeps them anywhere near budget. (Dropping the
texture to q88 saves 3 KB, so the quality setting is not the lever.)

Files are served with a one-year immutable cache header (`next.config.ts`), so
**version the filename whenever the geometry or the label changes** — as
`reta.glb` → `reta-v2.glb` did. Overwriting in place means returning visitors
keep the old asset.

**THE NUMBER COUNTS SERVED FILES, NOT EXPORTS.** `reta-v3.glb` shipped with
two different labels, `reta-v4.glb` was the V3 export, `reta-v5.glb` was an
earlier cut of V4 opened in a preview, `reta-v6.glb` the cut after that — all
spent. `reta-v7.glb` is the current V4 export. A browser that fetched any of them holds those bytes for a year.

`prepare-model.mjs` and `capture-studio.mjs` now REFUSE to overwrite an
existing destination, because the rule above was documented and still broken —
on 2026-09-21, twice in one session, and the symptom was a page that would not
change in the owner's browser with nothing in any log to explain it. `--force`
is for re-running the same recipe to the same bytes.
