# Images

| Directory    | Contents                                                          |
| ------------ | ----------------------------------------------------------------- |
| `products/`  | Product renders, packaging, label detail, 3D poster fallbacks.    |
| `editorial/` | Research Hub and long-form article imagery.                       |
| `textures/`  | Material/macro studies, glass and metallic surfaces, lab details. |

## Conventions

- Alt text is **required** — `ProductImage.alt` is a non-optional string.
  Decorative images must use `alt=""` explicitly, never a missing attribute.
- Prefer macro material studies, laboratory details, glass and metallic
  surfaces, controlled scientific environments and microscopy-inspired texture.
- Avoid cliché doctors, generic stock labs, molecule decoration and
  fitness-influencer imagery.
- Use `next/image` and always supply intrinsic `width`/`height` to prevent
  layout shift.
