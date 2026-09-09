# Images

| Directory    | Contents                                                          |
| ------------ | ----------------------------------------------------------------- |
| `products/`  | Product renders, packaging, label detail, 3D poster fallbacks.    |
| `editorial/` | Research Hub and long-form article imagery.                       |
| `textures/`  | Material/macro studies, glass and metallic surfaces, lab details. |

## How to add one

Dropping a file in this directory does nothing on its own. Declare it in
`src/content/media.ts` — that registry is what every component reads:

```ts
reta: {
  card: { src: "/images/products/reta-card.jpg", alt: "…", width: 1600, height: 2000 },
  poster: null,
},
```

`card` replaces the diagrammatic silhouette on the product card and in the
catalogue; `poster` replaces it in the 3D loading state and for anyone without
WebGL or with reduced motion. Both default to `null`, which is the current and
honest state — no product photography exists.

## Conventions

- Alt text is **required** — `ProductImage.alt` is a non-optional string.
  Decorative images must use `alt=""` explicitly, never a missing attribute.
- Prefer macro material studies, laboratory details, glass and metallic
  surfaces, controlled scientific environments and microscopy-inspired texture.
- Avoid cliché doctors, generic stock labs, molecule decoration and
  fitness-influencer imagery.
- Use `next/image` and always supply intrinsic `width`/`height` to prevent
  layout shift.
