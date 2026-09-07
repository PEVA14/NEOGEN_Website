# 3D models

Lightweight `.glb` vial assets for the Experience Mode layer.

## Expected (Phase 2)

- `NEOGEN_RETA.glb` — **not yet in the repository.** To be provided before Phase 2.

For the MVP all three flagships share the same functional vial master with
different labels (see `docs/NEOGEN_MVP_SCOPE.md`):

| World  | Asset                   | Status                   |
| ------ | ----------------------- | ------------------------ |
| RETA   | `NEOGEN_RETA.glb`       | pending delivery         |
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
