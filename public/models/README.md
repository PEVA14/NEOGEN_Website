# Models

Lightweight `.glb` product assets, one per product, named by its **slug**:

```
public/models/<product-slug>.glb
```

Today: `reta-v2.glb`, `ghk-cu.glb` and `glow.glb` — the three flagships. All
three are the same NEOGEN container, the canonical physical vial, each carrying
its own printed label.

## Where they come from

Blender exports land in `3d assets/`, which is **gitignored working storage**.
Nothing there is served. The served file is derived from one by:

```bash
node scripts/prepare-model.mjs "3d assets/NEOGEN_RETA_VIAL_V2.glb" \
  public/models/reta-v2.glb --drop "0.75 Dram Autosampler Lid" \
  --scale-node "NEOGEN_VIAL_CAP" 0.92 --jpeg 92
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

| Served file   | Source export             | Extra                                                             |
| ------------- | ------------------------- | ----------------------------------------------------------------- |
| `reta-v2.glb` | `NEOGEN_RETA_VIAL_V2.glb` | `--drop "0.75 Dram Autosampler Lid"` (1), `--scale-node` cap (2)  |
| `ghk-cu.glb`  | `NEOGEN_GHK-Cu_VIAL.glb`  | `--scale-node` cap (2)                                            |
| `glow.glb`    | `NEOGEN_GLOW_VIAL.glb`    | `--scale-node` cap (2)                                            |

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

Keep exports under ~500 KB; all three current files are ~460 KB. The raw exports are
0.8–1.0 MB, so the preparation step is what keeps them in budget.

Files are served with a one-year immutable cache header (`next.config.ts`), so
**version the filename whenever the geometry or the label changes** — as
`reta.glb` → `reta-v2.glb` did. Overwriting in place means returning visitors
keep the old asset.
