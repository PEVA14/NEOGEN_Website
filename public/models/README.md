# Models

Lightweight `.glb` product assets, one per product, named by its **slug**:

```
public/models/<product-slug>.glb
```

`reta.glb` is the only one today. It is intentionally MVP-quality — the web
layer recentres and rescales whatever it is given (`VialModel`), so an improved
export can replace it without re-tuning the camera.

## How to add one

Drop the file here, then declare it in `src/content/media/registry.ts` under
the product's slug:

```ts
glow: {
  model: "/models/glow.glb",
},
```

A model is **media, keyed by product**, not a property of an Experience world.
That is why GLOW and GHK-Cu have worlds — full amber and copper environments —
without a GLB, and why their product pages open in those environments with the
static plate rather than an empty canvas.

Declaring a model turns on the live viewer, the cursor-responsive hint and the
card's hover preload for that product. Nothing else has to change.

Pair it with a `poster` entry once a still has been captured from the settled
scene: the poster is what paints while the GLB is in flight and what stands in
for anyone without WebGL or with reduced motion.

## Budget

Keep exports under ~500 KB. `reta.glb` is ~385 KB. They are served with a
one-year immutable cache header (`next.config.ts`), so version the filename
when the geometry changes.
