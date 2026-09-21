# Images

| Directory    | Contents                                                          |
| ------------ | ----------------------------------------------------------------- |
| `products/`  | Product photography, one folder per product slug.                 |
| `editorial/` | Research Hub and long-form article imagery.                       |
| `textures/`  | Material/macro studies, glass and metallic surfaces, lab details. |

## Where a product image goes

One folder per product, named by its **slug** — the same string in its URL:

```
public/images/products/<product-slug>/
  primary.jpg          the lead image: card, product page, social card
  alternate-01.jpg     another angle of the same object
  alternate-02.jpg     …numbered, in display order
  detail-01.jpg        label or macro detail
  packaging.jpg        the product as it ships
  poster.jpg           rendered still of the 3D scene (only where a GLB exists)
  studio-v3.jpg        the studio still — a RENDER, not a photograph
```

The slug is the join between the product registry, the URL and the media
registry. `semaglutide` → `/images/products/semaglutide/primary.jpg` →
`/es/productos/semaglutide`. Nothing else has to be looked up.

3D models are the same idea one level up: `public/models/<product-slug>.glb`.

Only `primary.jpg` is needed for a product to stop showing the diagram. The
other roles are optional and can arrive later.

## The studio still is the one file nobody shoots

`studio-v<N>.jpg` is the product's own 3D container rendered as a product
photograph and captured to a file, so commerce surfaces never run WebGL. It is
what a catalogue card shows for a product that has no photography yet. Produce
it with the dev server running:

```bash
node scripts/capture-studio.mjs semaglutide --name studio-v4
```

That opens `/es/estudio/<slug>`, waits for the scene to settle, takes the frame
the page itself exposes and writes the JPEG at 1600 × 2000. The rig, lights and
grade all live in `components/experience/studio/rig.ts` — this only presses the
shutter. See CONVENTIONS §17b for the pipeline.

**Version the filename every time the render changes** (`--name studio-v4`).
Images are served with a one-year immutable cache and Next's optimizer caches
by URL, so re-rendering into the old name leaves every visitor — and the local
dev server, and the owner's browser — looking at the previous picture. Point
the registry at the new name and delete the old file in the same change.

A studio still is a render and is registered as `studio`, never as `primary`:
it does not count as photography, and no surface promotes it to a social card.

## How to add one

A file in this directory does **nothing** until it is declared. Add an entry to
`src/content/media/registry.ts`, keyed by slug:

```ts
semaglutide: {
  primary: {
    src: "/images/products/semaglutide/primary.jpg",
    alt: "Vial de Semaglutide sobre fondo neutro, etiqueta al frente.",
    width: 1600,
    height: 2000,
  },
},
```

That single entry updates the catalogue card, the product page plate and the
product's social/OG image. There is no second place to register it and no
per-page path to edit.

Then run `npm run check:media`, which confirms the file exists, that the
declared `width`/`height` match the real file, and that the slug is a real
product.

## Conventions

- **Alt text is required.** `ProductImage.alt` is a non-optional string. A
  decorative image must say so with `alt: ""` — explicitly, so the choice is
  visible in review.
- **`width`/`height` are the file's intrinsic pixels**, not a display size.
  They reserve the box before the bytes arrive; without them every image is a
  layout shift. `check:media` reads them back off the real file.
- **Shoot 4:5 or looser.** Every frame in the system is a 4:5 plate and images
  are `object-fit: cover`, so anything squarer crops on the sides and anything
  much taller crops top and bottom. Keep the subject clear of the outer 10%.
- **`primary` is the product**, not a scene. Packaging and lifestyle belong in
  `packaging` / `alternate-*`, which no surface promotes to a social card.
- Prefer macro material studies, laboratory details, glass and metallic
  surfaces, controlled scientific environments and microscopy-inspired texture.
- Avoid cliché doctors, generic stock labs, molecule decoration and
  fitness-influencer imagery.
- Serve source files at roughly 2× the largest rendered size — about
  1600 × 2000 for a product plate. Next generates the smaller variants and the
  modern formats; do not pre-compress into WebP or AVIF by hand.
