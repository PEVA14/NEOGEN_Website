# 3D models

Lightweight `.glb` vial assets for the Experience Mode layer.

## Present

- `NEOGEN_RETA.glb` — 385 KB. glTF 2.0 from Blender. Scene graph is
  `NEOGEN-VIAL GLASS` (root) with `NEOGEN_VIAL_CAP` as a child, and
  `NEOGEN_LABEL` alongside. Five materials; the glass carries
  `KHR_materials_transmission` (factor 1.0, IOR 1.45), which is what makes it
  read as real glass — and is the single biggest per-frame cost in the scene.
  No animations, cameras or lights: web code owns all of those.

  The model sits ~0.6 units off the X origin and is ~0.31 units tall. Nothing
  depends on that: `VialModel` recentres and rescales it at load.

For the MVP all three flagships share the same functional vial master with
different labels (see `docs/NEOGEN_MVP_SCOPE.md`):

| World  | Asset                   | Status                   |
| ------ | ----------------------- | ------------------------ |
| RETA   | `NEOGEN_RETA.glb`       | **in repository**        |
| GLOW   | same vial + GLOW label  | pending                  |
| GHK-Cu | same vial + GHK-Cu label| pending                  |

## Conventions

- Paths are declared in `src/config/worlds.ts` (`modelPath`), never hard-coded
  in components.
- Files here are served with a one-year immutable cache header
  (see `next.config.ts`). **Version the filename when an asset changes.**
- Web code owns camera, lighting, environment, positioning, scroll response,
  responsive behaviour, performance and fallbacks. The GLB supplies geometry
  and materials only.
- Every world must also have a `posterPath` still image for the loading state
  and the no-3D / reduced-motion fallback.
- Blender polish is explicitly **not** an MVP blocker. MVP-quality assets are
  expected and acceptable.
