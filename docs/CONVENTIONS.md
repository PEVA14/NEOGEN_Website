# NEOGEN — Engineering Conventions

Companion to `docs/NEOGEN_DESIGN_BIBLE.md` and `docs/NEOGEN_MVP_SCOPE.md`.
Established in Phase 1 (Foundation).

---

## 1. Styling: two idioms, one system

CSS custom properties in `src/styles/tokens.css` are the **canonical design
token layer**. Tailwind does not own the tokens; it consumes them through
`@theme inline` in `globals.css`, which emits utilities that _reference_ the
variables rather than copying their values.

| Use                                                                                       | Idiom                        |
| ----------------------------------------------------------------------------------------- | ---------------------------- |
| Quiet Mode, layout, commerce, forms, specs, research reading                              | Tailwind utilities           |
| Experience Mode: scroll choreography, 3D overlays, complex keyframes, bespoke composition | CSS Modules (`*.module.css`) |

Rules:

- **Never hard-code a raw hex, duration, easing curve or spacing value.** If a
  token is missing, add it to `tokens.css`.
- Do not force bespoke experiential styling into utility soup. A CSS Module is
  the right answer when the CSS is genuinely custom.
- CSS Modules read the same `var(--…)` tokens, so both idioms respond to a
  `data-world` override identically.

## 2. Quiet Mode vs Experience Mode

Preferred page rhythm: **Quiet → Impact → Quiet → Impact**.

`<Section mode="quiet" | "impact">` is the structural carrier. Experience Mode
lives in `src/components/experience/` and is the only place client-side motion
and 3D are permitted. `src/components/ui`, `primitives` and `typography` stay
server-rendered and dependency-free.

## 3. Product worlds

> The product doesn't adapt to the interface. The interface reacts to the product.

- A world is applied with `data-world` on a **section**: `<Section world="reta">`.
- **Never** put `data-world` on `<html>` or `<body>`. Worlds transform
  experiential environments; they are not global UI accents.
- `--accent` resolves to ink in Quiet Mode and only becomes a product colour
  inside a world. This is the mechanism that prevents "every CTA is blue".
- Colour half: `src/styles/worlds.css`. Non-colour half (lighting intent, model
  paths): `src/config/worlds.ts`. Keyed by the same id.
- **No UI copy in world config.** Worlds are locale-independent.

## 4. Motion — two tiers

| Tier         | Tokens                | Purpose                                           | Under `prefers-reduced-motion` |
| ------------ | --------------------- | ------------------------------------------------- | ------------------------------ |
| 1. Interface | `--motion-duration-*` | Focus, hover, pressed, open/close, validation     | **Kept**, shortened            |
| 2. Cinematic | `--cinematic-*`       | Scroll choreography, parallax, 3D camera, reveals | Collapsed to end state         |

- Anything in tier 2 **must** carry `data-motion="cinematic"` so
  `motion.css` can neutralise it without a blanket `*` reset.
- Purely decorative motion carries `data-motion="decorative"` and is removed
  outright — it communicates nothing.
- Reduced motion must **never** remove content, hierarchy, product identity,
  navigation or commerce. Commerce must be fully usable with zero effects.
- Prefer CSS. `useReducedMotion()` exists only for motion CSS cannot express
  (3D camera behaviour, JS-driven scroll choreography). Its SSR snapshot returns
  `true` — the calm default — so cinematic motion never flashes at users who
  asked not to see it.
- Nothing moves unless it communicates hierarchy, product character, state,
  progression or spatial relationship.

## 5. Responsive — CSS-first

**Layout is handled in CSS. There is no JavaScript breakpoint logic.**

There is deliberately no `useBreakpoint` / `useMediaQuery` abstraction. Add one
only when a future interactive or 3D behaviour genuinely requires JavaScript
awareness of the viewport — and when that day comes, it serves _that behaviour_,
not layout.

Mobile is **not a shrunken desktop**:

- Cinematic amplitude is reduced at the token source in `motion.css`
  (`--cinematic-travel`, `--cinematic-parallax`) under `max-width: 48rem`, so
  every scroll effect inherits a calmer choreography on touch without any
  component branching.
- Fluid `clamp()` type and a fluid `--gutter` mean mobile spacing is designed,
  not inherited.
- Prioritise touch targets and readability; avoid scroll-jacking; reduce GPU/CPU
  pressure.

Breakpoint reference: `sm 40rem · md 48rem · lg 64rem · xl 80rem · 2xl 96rem`.

## 6. Accessibility

- Semantic landmarks in every layout: `header` / `nav` / `main` / `footer`.
- A skip link is the first focusable element on every page; `<main>` carries
  `tabIndex={-1}` so it can receive focus.
- Use `Heading level={n} size={…}` — semantic level and visual scale are
  separate props so heading order stays correct regardless of design.
- One consistent `:focus-visible` treatment, defined once in `globals.css`.
  Never remove a focus indicator.
- Alt text is required by the type system (`ProductImage.alt`). Decorative
  images use an explicit `alt=""`.
- Icon-only controls need an accessible name via `VisuallyHidden`.
- No essential information may be available only through 3D or animation.
- Language is declared per-locale on `<html lang>` using BCP 47 tags.

## 7. Localization

Spanish (`es-MX`) is the default experience; English (`en-US`) is the second
supported locale. **No i18n dependency** — a `[locale]` segment plus typed
dictionaries.

- All locales are URL-prefixed: `/es/...`, `/en/...`. `src/proxy.ts` negotiates
  `Accept-Language` for unprefixed requests and defaults to Spanish.
- `src/i18n/dictionaries/es.ts` is the **source**. Its shape derives the
  `Dictionary` type, so a missing key in `en.ts` is a compile error.
- `getDictionary()` is **server-only**. Import it from Server Components;
  client components receive strings as props.
- **Shared components are locale-independent.** They take localized text as
  props and contain no copy. `LanguageSwitcher` takes its label as a prop.
- Never put UI copy in `config/worlds.ts`, `config/site.ts` or type modules.
- Product names (RETA, GLOW, GHK-Cu) are proper nouns, not translated copy.
- Use `Intl` via `src/lib/format.ts` for currency and dates — never hand-rolled.

## 8. Unverified data and the claims boundary

Every real-world business or scientific fact is modelled as `Verifiable<T>`:

```ts
type Verifiable<T> =
  { status: "verified"; value: T } | { status: "pending" } | { status: "unavailable" };
```

- When a value is not `verified`, render `<StatusNote>` — a deliberately
  **neutral** state carrying no colour of approval, warning or error.
- **Never** substitute an invented value for a missing one.
- Never fabricate scientific claims, certifications, COAs, lab results, lot
  numbers, provenance, shipping promises, prices, specs or payment capabilities.
- Do not create therapeutic, performance, weight-loss, anti-aging, dosing,
  administration, efficacy or safety claims.
- "Research use only" is not a loophole and not proof a transaction is lawful.
- Unresolved business facts live in `siteConfig.tbd` as explicit `null`s.
- Do not activate a live payment provider until product/regulatory and
  processor requirements are reviewed.

Final placeholder _copy_ is not decided yet — `StatusNote` always takes its
label from the dictionary so wording can change without touching components.

## 9. Dependencies

Current runtime dependencies: `next`, `react`, `react-dom`, `three`,
`@react-three/fiber`. That is the whole list.

- Explain any major dependency addition **before** adding it.
- Do not install overlapping animation / state / UI libraries.
- Do not install a package because it might be useful later.

Added in Phase 2:

| Package              | Why                                                            |
| -------------------- | -------------------------------------------------------------- |
| `three`              | The 3D engine. Pinned to a minor: 0.x does not promise SemVer. |
| `@react-three/fiber` | React renderer for three. v9 peers `react >=19 <19.3`.         |
| `@types/three` (dev) | three ships no types of its own.                               |

**`@react-three/drei` was NOT installed**, despite being listed here in Phase 1.
Only two things were needed from it — GLTF loading and an environment map —
and `useLoader` plus three's own `RoomEnvironment` + `PMREMGenerator` cover
both. drei's `<Environment preset>` would also fetch an HDRI from a CDN at
runtime, which this project does not want.

Still deliberately **not** installed:

| Package       | Why deferred                                                       |
| ------------- | ------------------------------------------------------------------ |
| `motion`      | The Hero and RETA choreography are pure CSS. Nothing needs JS yet. |
| `server-only` | Would turn a server/client import mistake into a build error.      |

Not planned: GSAP, Lenis/smooth-scroll, a state library (React Context +
`useReducer` is the default when commerce needs one), a component library, a
CMS, an ORM, an i18n framework.

### Import three's addons from `three/examples/jsm/…`, not `three/addons/…`

`@types/three` only ships declarations under `examples/jsm`. The `addons` alias
resolves at runtime but has no types, so it silently degrades to `any`.

## 10. The 3D layer (Phase 2)

Established by the RETA scene. GLOW and GHK-Cu reuse this rig by passing their
own `WorldEnvironment` — no new scene code should be needed.

- **All 3D lives in `src/components/experience/`.** Nothing else imports three.
- **`three` is never in the initial payload.** `RetaCanvas` is loaded through
  `next/dynamic` with `ssr: false`. Measured: initial JS 178.6 KB gz, with
  three isolated in a separate 241 KB gz chunk fetched only when a stage mounts
  and WebGL is confirmed.
- **The fallback is server-rendered and paints first.** `useWebGLSupport`
  returns `false` on the server, so the static state is always the first paint
  and the canvas replaces it. Loading, reduced-motion and no-WebGL all resolve
  to that same one component.
- **Web code owns the asset.** `VialModel` recentres and rescales whatever GLB
  it is handed, so an improved model drops in without re-tuning the camera.
- **Colour crosses from CSS to 3D, never the reverse.** `worldPalette.ts` reads
  `--world-accent` / `--world-light` / `--world-void` off the live element, so
  `worlds.css` stays the single source of truth (§3). Never hard-code a world
  colour in TypeScript.
- **Quality tiers are a 3D concern, not layout.** Below 48rem the glass drops
  `transmission` and the renderer halves `transmissionResolutionScale`. This is
  the §5 exception, not a breach of it.
- **Never mutate objects returned from R3F hooks.** Attach declaratively
  (`<primitive attach="environment">`) or set the property on the material.

### Consequence: `as` props take `DOMTag`, not `ElementType`

`@react-three/fiber` augments the global JSX namespace:

```ts
declare module "react" {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
```

That is project-wide and cannot be scoped. It widens `ElementType` to include
every three.js object, which collapses a polymorphic `as?: ElementType` prop's
prop intersection to `never`. The DOM primitives therefore take
`as?: DOMTag` (`src/types/polymorphic.ts`). This is a tightening: `Container`,
`Section`, `Stack`, `Text` and `VisuallyHidden` must never render a `<mesh>`.

## 11. Commands

```bash
npm run dev          # development server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run build        # production build
npm run check        # all three, in order
npm run format       # Prettier
```
