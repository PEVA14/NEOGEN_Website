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
  public/models/reta-v2.glb --drop "0.75 Dram Autosampler Lid" --jpeg 92
```

That script drops nodes the web build should not carry, re-encodes label
textures (PNG → JPEG, roughly a quarter of the bytes at the same 2048²), prunes
what is then unreferenced, and **refuses to write a vial whose glass has lost
its transmission** — the one mistake that would turn the glass into a white
cylinder. It never moves, rotates or rescales: `VialModel` normalises position
and size at load time, and an asset re-posed here would make that a lie.

Current recipes:

| Served file      | Source export               | Extra                                    |
| ---------------- | --------------------------- | ---------------------------------------- |
| `reta-v2.glb`    | `NEOGEN_RETA_VIAL_V2.glb`   | `--drop "0.75 Dram Autosampler Lid"` (1) |
| `ghk-cu.glb`     | `NEOGEN_GHK-Cu_VIAL.glb`    | —                                        |
| `glow.glb`       | `NEOGEN_GLOW_VIAL.glb`      | —                                        |

(1) That export carries **two** lids, stacked and interpenetrating: the narrow
`NEOGEN_VIAL_CAP` and the wider `0.75 Dram Autosampler Lid`. Only one can be
right. The build keeps the narrow cap, which matches the approved first-
generation silhouette; to ship the wider one instead, drop `NEOGEN_VIAL_CAP`
rather than the autosampler lid.

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
