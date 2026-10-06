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

**The record rhythm.** On a product page, everything below the buy box is one
document. Each of its sections is built as
`<Section mode="quiet" rhythm="record">` with `<SectionHeader scale="record">`:
`--section-pad-record` padding, a 3xl title and a closer header gap. Their
grounds alternate stone and paper by rendered position (`ground()` in the
PDP). Homepage and hub sections keep the default spine scale. A component
that renders its own table or panel sets its own paper ground, so it reads on
either ground (`SpecTable`).

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
- Imperative code reads the preference with `prefersReducedMotion()`
  (`lib/reducedMotion.ts`) at the moment it would move; nobody spells the
  media query again.

### The everyday motion system (permanent since 2026-10-05)

Under the flagships, the whole site runs on one small vocabulary; its pieces
live in `src/components/motion/` (with the brand's in `components/brand/`),
and `motion/README.md` keeps the reasoning, the history and every rejected
concept. The rules:

1. **Operated, not watched.** Every movement is caused by a pointer, a key, a
   choice or the reader's own scroll position. Nothing plays on load, on a
   timer or on scroll-in; nothing loops or breathes. The page at rest is
   complete; nothing waits at `opacity: 0`.
2. **A figure in transition never shows a value it does not hold**
   (`ValueRoll`: old → new, in the direction it moved).
3. **The choice travels** (`useIndicator`): one mark moves to what was chosen.
4. **Motion exposes structure that exists, never invents it.** In Research
   every connection drawn is one the content states (a citation, a glossary
   match, a sourced line membership) — no distances, clusters or "similar".
5. **One record, many magnifications; reorganise, never replace.** A compound
   keeps its name and frame from index to inline record to full page; a
   filtered list moves what stays and keeps its order.
6. **One effect per target; one traveller per gesture.** Transforms, clips
   and opacity only — content never reflows to animate.
7. **Tiers.** Micro everywhere (`ValueRoll`, `useIndicator`, the lifting
   vial); meso where a reader inspects (`SourceTether`, `TermLens`,
   `DirectoryLens`, the reading needle, the compendium, the glossary); macro
   stays rare (the archive map, the flight, the worlds).
8. **3D has a budget**: a stage draws off screen only until revealed, at most
   72 fps on desktop and 30 on phones, with a half-resolution glass pass.

## 4b. Colour is navigation (permanent since 2026-10-05)

The eight area colours (`styles/areas.css`, applied with `[data-area]`) mean
one thing: **membership of a catalogue area**. Never an effect, mechanism,
evidence strength, similarity, safety or biological relationship. A compound
in two areas carries two marks in the catalogue's area order (never a blend);
its first area is its context colour. A research line, a journal, a source or
a document level is never given an area colour.

| Level | What                                 | Where                                                       |
| ----- | ------------------------------------ | ----------------------------------------------------------- |
| 0     | paper, stone, ink, hairlines         | most of every page; all body text                           |
| 1     | marks, rules, numerals, small labels | `AreaMarks`, section numbers, a tether, a definition's rule |
| 2     | a local field on the area's wash     | a record's head, an open inline record, an open area tile   |
| 3     | a strong section composition         | the storefront's area tiles, the homepage area explorer     |
| 4     | a world atmosphere                   | RETA, GLOW, GHK-Cu only                                     |

- **Roles.** `--area-mark` for marks (3:1 on paper or stone), `--area-text`
  for text (AA on paper, stone and the area's own wash), `--area-wash` for
  grounds. Never the raw hue for text.
- **The Level-2 recipe.** `background: var(--area-wash)` and
  `--ink-muted: var(--ink-secondary)` on the field, so muted labels keep AA on
  the tint. Full width when it is a page's head:
  `box-shadow: 0 0 0 100vmax var(--area-wash)` with a matching `clip-path`.
- **Colour focuses, then returns.** At rest structure is ink; what is being
  inspected takes its area's colour and gives it back when inspection ends.
- **Colour is never the only carrier.** An area's name is in text beside its
  mark, everywhere.

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
- Use `Intl` for currency and dates — never hand-rolled. Money goes through
  `formatPrice()` in `src/data/commerce`, which takes a **full BCP-47 tag**
  (`localeTags[locale]`), not a bare language: `Intl` renders MXN as
  `6500 MXN` for `"es"` and `$6,500` for `"es-MX"`.

## 8. Unverified data and the claims boundary

`Verifiable<T>` was a proposal, never code. What the project actually does is
simpler and has held up better: **a fact we do not have is absent, not
rendered as a pending value.**

- A field with no verified value is **not rendered at all**. Purity, storage,
  molecular mass and lot have no row on the product page — an empty labelled
  row makes a finished page look unfinished, and a labelled `PLACEHOLDER`
  puts an internal marker in front of a customer.
- **No "pending" state on a trust surface.** Phase 11 retired the old
  exception that let a document ledger say "pending verification". A quality
  surface now shows a document the resolver accepted, or one deliberate
  no-evidence statement — never a hollow badge, a "coming soon", or a row of
  unavailable placeholders. `check:output` forbids the pending phrase
  everywhere.
- **Never** substitute an invented value for a missing one.
- Never fabricate scientific claims, certifications, COAs, lab results, lot
  numbers, provenance, shipping promises, prices, specs or payment capabilities.
- Do not create therapeutic, performance, weight-loss, anti-aging, dosing,
  administration, efficacy or safety claims.
- "Research use only" is not a loophole and not proof a transaction is lawful.
- Unresolved business facts live in `siteConfig.tbd` as explicit `null`s.
- Do not activate a live payment provider until product/regulatory and
  processor requirements are reviewed.

Status vocabulary lives in `dict.status` so wording can change without
touching components. It is deliberately small — `pending` and `placeholder` —
and neither may ever be paired with a positive assertion.

### The data layer

Product identity and commerce state are **separate modules with separate
lifecycles**, and nothing may collapse them:

- `src/data/catalog` — what a product IS. Changes rarely, lives in git, is
  reviewed. Publishability is **derived** (`isPublishable`: at least one
  variant with a stated presentation), never a hand-set flag, so the sitemap,
  `generateStaticParams`, the catalogue and the register cannot disagree.
- `src/data/commerce` — what it COSTS and whether it is in stock. Changes
  without a deploy. Every read goes through the async accessors so the source
  can become a database without any page changing.
- `src/config/worlds.ts` carries **no product identity**. A world is a 3D
  environment that three products happen to have; it is not where products
  live. Read names, slugs and categories from the registry.
- `scripts/import-supplier-catalog.mjs` is a one-way drafting tool, never a
  build step. It reads a gitignored private document and emits
  `generated.ts` — supplier codes and supplier cost never reach the output.

### Product media

Media is a **content layer keyed by product slug**, separate from the catalogue
registry. The catalogue says what a product is; `src/content/media` says what it
looks like. They have different lifecycles, and merging them would mean
regenerating supplier-derived data every time a photograph arrives.

- **One lookup drives every surface.** The catalogue card, the product page
  plate, the flagship 3D stage and the social card all resolve through
  `productMedia(slug)` / `stillMedia(slug)`. There is no second convention and
  no per-page path.
- **A GLB is media, not a world.** Models live under the product's slug, not in
  `config/worlds.ts` — which is why GLOW and GHK-Cu can have full Experience
  environments and no 3D object.
- **`alt` is required and `width`/`height` are the file's real pixels.**
  `npm run check:media` reads the dimensions back off the file, so a mistyped
  size is caught rather than shipped as a layout shift.
- **The diagram never becomes a social card.** `VialSilhouette` is a deliberate,
  visibly non-photographic fallback. In a link preview it would arrive with no
  frame and read as a product shot.
- Files go in `public/images/products/<slug>/`, models in
  `public/models/<slug>.glb`. See `public/images/README.md`.

### The fallback hierarchy (Phase 12)

When a product has no photograph — which is all 85 today — what renders is
decided in this order, and never by inventing an asset:

```
real photography  →  real product model (GLB)  →  product-world material
                  →  specimen plate  →  typographic / technical composition
```

- **The specimen plate is the workhorse**, and it is a COMPOSITION, not a
  placeholder: an area-toned ground, the compound's own name set oversized and
  cropped behind the silhouette, one datum line per presentation, the
  presentation range as its annotation. Every variation is read from the
  registry, so two products differ exactly when they ARE different.
- **The name is sized from its own length** (`245 / length`, clamped 10–34cqi),
  so "GLOW" and "Retatrutide Research" crop by the same amount instead of one
  floating and the other showing four letters.
- **The ghosted name is `aria-hidden` everywhere it appears.** Every surface
  that renders a plate also renders the name as real text beside it.
- **Never**: a broken placeholder, a grey rectangle, or an invented photograph.
  The plate is visibly non-photographic on purpose, which is also why it still
  never becomes a social card.
- The same device runs at three scales — the Hero's wordmark, the flagship
  stage's field wordmark, the plate's name. That repetition is what makes a
  card, a product page and the front door read as one system.

### The checks

Three scripts guard the invariants that have actually broken before. All run
in `npm run check`:

- `npm run check:catalog` — imports the real registry and asserts slug and
  variant-id uniqueness, price validity and ordering, derived publishability,
  and that the catalogue, the sitemap and the prerendered routes agree.
- `npm run check:media` — asserts every declared asset resolves to a real file
  of a supported type, that its slug is a real product, that alt text is
  present, that declared dimensions match the file, and that no file is
  declared in two roles.
- `npm run check:output` — reads the build and asserts that no supplier term
  or catalogue code appears in anything the browser can fetch, that no
  prototype language is visible to a reader, that no non-public env var is
  referenced in a client bundle, and that canonicals do not point at
  localhost.

## 9. Dependencies

- Explain any major dependency addition **before** adding it.
- Do not install overlapping animation / state / UI libraries.
- Do not install a package because it might be useful later.

Runtime dependencies, in full:

| Package                       | Why                                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `next`, `react`, `react-dom`  | The framework.                                                                                                                    |
| `three`, `@react-three/fiber` | The 3D layer (§10).                                                                                                               |
| `pg`                          | The Postgres order and draft stores (§12).                                                                                        |
| `zod`, `@anthropic-ai/sdk`    | Atlas only — its schema layer and advisor engine. Frozen with Atlas (§17); checkout and payments validate by hand, not with zod.  |
| `motion` (13)                 | Interruptible layout animation where a list reorganises: the compendium and the glossary only (§4). Everything else is CSS/WAAPI. |

Build and asset tooling (devDependencies), none of which ships to the browser:

| Package                | Used by                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `@gltf-transform/*`    | `prepare-model.mjs` — the Blender export pipeline.              |
| `sharp`                | `prepare-brand.mjs` — trims the brand artwork, writes the icon. |
| `playwright-core`      | `capture-studio.mjs` — headless Chrome for the studio still.    |
| `@electric-sql/pglite` | `check-payments.mjs` — a real Postgres to test the adapters.    |

`sharp` was already in the tree twice before it was declared (Next's image
optimizer, and `@gltf-transform/functions`), so declaring it downloaded
nothing. It is native code, which is why it is a devDependency and never
imported from application code.

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

| Package       | Why deferred                                                  |
| ------------- | ------------------------------------------------------------- |
| `server-only` | Would turn a server/client import mistake into a build error. |

Not planned: GSAP, Lenis/smooth-scroll, a state library (React Context +
`useReducer` is the default when commerce needs one), a component library, a
CMS, an ORM, an i18n framework.

### Import three's addons from `three/examples/jsm/…`, not `three/addons/…`

`@types/three` only ships declarations under `examples/jsm`. The `addons` alias
resolves at runtime but has no types, so it silently degrades to `any`.

## 10. The 3D layer (Phase 2)

Established by the RETA scene. GLOW and GHK-Cu reuse it by passing their own
`WorldEnvironment`; what they needed on top of that was a HOST, not a scene —
`MomentStage` drops the same canvas into a homepage section's existing object
box, with that section's drawn plate as its first paint and fallback.

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
- **Quality tiers are a 3D concern, not layout.** Below 48rem the renderer
  halves `transmissionResolutionScale`. The glass keeps real transmission on
  phones: the old swap to plain 40% alpha was exactly frosted plastic (owner,
  2026-09-29). This is the §5 exception, not a breach of it.
- **The live viewer wears the stills' optics.** `studio/optics.ts` is shared by
  `StudioScene` and `RetaCanvas`/`VialModel`: the rig's reflection map
  (`studioEnvironment`), the materials' response (`finishMaterial`: glass
  depth scaled to the model's own height, IOR, tint, reflection; the cap; the
  paper) and the grade (Neutral tone mapping at `rig.exposure`). The live stage
  picks its rig from `WORLD_RIGS[world]`. Tuning them separately let the live
  glass keep a thickness written for a model ten times smaller, so it bent
  nothing and read as milky beside its photograph. Tune a rig, and both move.
  The refraction-only backlight card is shared too: fixed to the set in the
  studio, following the object (never its rotation) on the live stage. What
  stays per path: the studio's sweep, floor and flags, and the live stage's
  lights, backdrop and choreography.
- **Never mutate objects returned from R3F hooks.** Attach declaratively
  (`<primitive attach="environment">`) or set the property on the material.
- **A canvas compiles before it draws, and the vial outlives the canvas.**
  `RetaCanvas` keeps its loop off until `Prewarm` has compiled every program
  with `compileAsync` (screen and glass-pass variants), and `VialModel` takes
  its finished object from `preparedVial`, kept per model, rig and tier for
  the page. A handover between stages then pays for GPU uploads only, not for
  a blocking shader link or a rebuilt model. Every stage's loop is
  `FrameBudget`: nothing drawn off screen (it starts a fifth of a screen
  early), every frame on a wide screen, 30 fps on a phone. Phones: pixel
  ratio ≤ 1.5. The label is 1024 everywhere but the product page on a wide
  screen (`labelSize`): the 2048² upload was 85 ms in one call. The product
  page's presenter keeps its canvas once granted (`useVialStage`'s `keep`).
- **The homepage has ONE canvas, and it travels.** `StageHost` renders a
  single `<Canvas>` into a container it owns and moves that container into
  the active stage's slot; React never sees the move, so the context, the
  compiled programs, the uploaded textures and the reflection maps survive
  every handover. Stages ask through `stageHostStore` (`useHostedScene`).
  EACH STAGE STANDS IN WITH ITS OWN FIRST FRAME (owner, 2026-10-01; it was
  an empty spot, 2026-09-30): `StageStandIn`, a photograph of the frame the
  canvas draws first (`npm run capture:home`), server-rendered and placed in
  the canvas's own geometry (container units), until the canvas has drawn
  there and faded in over it. So the first draw must BE that frame: the hero
  rests at progress 0 and places its first frame instead of easing into it,
  and turntables start at zero. Re-take the shots when a model, rig, lens or
  track changes (`check:media` catches the model). The photograph is for a
  stage's FIRST arrival; a stage handed the canvas back draws at once (the
  shared canvas does not pause off screen: a stage holds it only within its
  hand-over margin), so a return is usually drawn before it is in view.
  `FrameBudget` must step from the canvas's own clock, never from 0: R3F
  times a stepped frame as `timestamp − clock.elapsedTime`, and a loop
  remounted under a living canvas would send every damped value to NaN. The drawing
  (`VialFallback`, a moment's plate) shows only when the device cannot run
  WebGL (`useVialStage().noWebGL`, known only after hydration). The canvas
  starts, and prepares the other announced scenes (`WarmUp`), only while the
  page is not scrolling (`whenScrollQuiet`) and at idle. A page without a
  host (none today) falls back to each stage's own `RetaCanvas`. The scene
  itself is `StageScene`, shared with the product page's `RetaCanvas`.
- **One WebGL context per page, and the stages arbitrate for it.**
  `useVialStage` holds a module-level registry: every stage publishes how much
  of itself is on screen and the most visible one is granted the canvas.
  Intersection alone is not enough — with a generous root margin two stages
  overlap for a whole scroll stretch, and the page runs two renderers and two
  transmission passes for a composition where one is ever visible. Three
  stages share the homepage this way.
- **Select a material by what it IS, not by its name.** `VialModel` and
  `StudioScene` match metal on `metalness > 0.5`. Names are content the export
  pipeline may legitimately rewrite, and a rename once repainted RETA's
  aluminium band as black plastic.
- **The label is kept out of the glass's refraction image.** Transmissive
  glass samples an off-screen render of every OPAQUE object; an opaque label is
  in it, so where the glass is bare the refraction shows a mirrored ghost of
  the printing inside the wall (RETA V4, whose label wraps only the front).
  `labelMaterial.ts` identifies the label by what it is — opaque, not metal,
  carrying artwork — and marks it transparent at full opacity, which excludes
  it. Both renderers apply it; the studio floor carries a `renderOrder` so it
  still draws over the label's reflection.
- **A see-through canvas still needs an opaque ground for the glass.** On a
  transparent canvas three.js clears the transmission image to half-white, so
  glass with nothing opaque behind it refracts white and reads as frosted
  plastic. The `local` backdrop is transparent by design (the page shows
  through), so `RefractionGround` adds a `--world-void` plane that draws ONLY
  while the transmission target is bound — invisible in the main pass.
- **The cap's finish is web code, not the export's.** No export has shipped a
  cap roughness anyone chose (1.0 made grey paint, V4's 0.095 a mirror), and
  none ships cap UVs. `capFinish.ts` gives every metal part UVs from its own
  shape — measured in the model's upright frame, because V4's vertices are
  stored Z-up — plus a spun-aluminium roughness and normal map: rings on the
  skirt, concentric rings on the crown, a faint grain. Both renderers apply
  it through `finishMaterial`, at the rig's roughness (the neutral studio
  pairs 0.34 with a lower reflection, or a satin cap on a white set goes
  white).
- **World data drives light; a product name never does.** A world whose
  `atmosphere` is `luminous` emits from behind the object, which the glass
  transmits. Any future luminous world inherits it and the other two are
  untouched.

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

## 11. 3D is product media, not navigation architecture

**V1 scope decision.** 3D presents the product; it does not carry the interface.
The cinematic layer — shared-element route transitions, pinned WebGL
storytelling, worlds physically transforming the UI — is deferred to V2 and
written up in `docs/V2_LIVING_LABORATORY.md`, including the measurements and
the traps. Do not rebuild it inside V1.

**One exception, by owner decision (2026-09-30): the vial transition.** From
the catalogue (grid and masthead strip) to a product page, the tapped card's
vial flies into the page's media frame and a flagship's world opens around
it — `components/vial-transition/` (its README has the mechanism, the
pictures and the traps). It is the only route transition on the site, and it
is held to the rules below:

- it is native view transitions on the compositor, no JS animation, and it
  plays only for a navigation the card typed (`vt-specimen`); every other
  navigation, and the back button, is untouched;
- a view-transition name may appear once per page, so a card names its vial
  only once tapped (`armed.ts`) and only catalogue cards are origins;
- **rule 2 below still holds**: the product page's canvas is not mounted
  during the flight (`useStageHandoff`); a photograph of its first frame
  stands in and dissolves once the canvas has drawn;
- reduced motion, or a browser without view transitions, gets the new page
  at once — never a slower version of the same travel;
- its pictures are cut from the studio still the card shows and must be
  re-cut whenever that still is re-rendered, and a flagship's stand-in
  re-taken whenever its model or live box changes (`check:media` enforces
  both) — or its lighting, materials or pose (nothing can check those).

**A second exception, by owner decision (2026-10-01): the specifications
ribbon.** On every product page, section 02 opens on a bench: a still of the
bare vial at the page's edge, and a label-styled band wound round it that
unwinds once into the panel holding the specifications —
`components/spec-ribbon/` (its README has the mechanism and the cost). It is
held to these rules:

- it is not pinned and does not follow the scroll: it plays once, by the
  clock (1.7 s), the first time the band is well into view, and never winds
  back; nothing waits on it but the panel's own fade;
- the specifications are real DOM in the reading order throughout — the
  canvas draws only paper and print, never content;
- under 64rem it runs upright — the same scene a quarter turn, the band
  unrolling down the page; reduced motion or no WebGL 2 get section 02 as
  it is; a failure after mount shows the panel at once;
- its canvas draws only while the band moves (none while the page scrolls),
  and is made only when the bench is near;
- the bench's vial is a still of the container, bare — one for every
  product, since every product ships in the V4 (labels aside) — and
  `check:media` fails when any product's model is another container than
  the still's;
- it is the same for every product: nothing per product but what the
  catalogue says (name, range, presentations, classification), laid out by
  rule to fit any of them — the panel as long as what it holds, never
  per-product sizes.

**Every other product opens on the bench (owner decision, 2026-10-02).** "Every
product is alive; flagships are simply allowed to become cinematic." A product
without a world stands in its studio, in the bright field —
`components/product/bench/` (its README has the grammar, the tiers and the
traps). It is held to these rules:

- images, SVG and CSS only — the bench never mounts a canvas; live 3D, a
  world and bespoke choreography stay the flagships';
- what varies comes from data or assets only: the discovery area (the
  bench's material, 6% of the area's hue), the physical form (a liquid keeps
  level), the presentations, the composition, and whether a split studio
  render exists (`specimens.json`: the enhanced tier). Never a visual family
  that implies a scientific relationship;
- the formation keys off `useArrival` (`components/product/arrival.ts`, shared
  with RETA's): after a card tap it plays with the flight; on a direct entry
  it is CSS from the first paint; under reduced motion it does not exist;
- after it, nothing moves but what a pointer or a choice of presentation moves,
  and the rail shows only verified registry data;
- the openings (`ProductStage`, `ProductBench`) are the product page's
  Experience moments and live in `components/product`, beside the record they
  open — the one place outside `components/experience` with client motion.

What a V1 product viewer does:

- holds a stable composition, anchored to a measured DOM box;
- turns slowly and passively — the `presenter` variant in `choreography.ts`;
- answers the cursor on fine pointers only, damped, and never required. The
  live stages are TURNTABLES, and they share one drive: horizontal travel is
  ACCUMULATED at one revolution per stage width and damped in (`TURN_SETTLE`),
  so the object keeps the angle it was left at. Mapping cursor position to an
  angle instead is the trap — it spins the object backwards the moment the
  cursor leaves. The stages differ only in what surrounds the turn:
  - **`sequence` (the homepage RETA section)** holds one centred pose at ~39%
    of canvas height. It no longer travels or crops across four camera states,
    because an object that travels cannot also be one you turn — scroll and
    cursor end up fighting for the same axis.
  - **`presenter` (the PDP)** draws in its own LIVE BOX — the media frame
    grown by `LIVE_FRAME_MARGIN` on every side (`product/liveFrame.ts`) — with
    the vial at its centre, and adds pitch and parallax on top, at vitrine
    amplitude and still falling back to zero on exit: depth cues on other
    axes, never rotation. Its canvas used to cover the whole stage, which put
    the vial off the camera's axis: seen from the side on a laptop and from
    below on a phone, where the stage runs on under the purchase panel. Sized
    from the frame, every screen sees the vial straight on through the same
    lens, so one photograph of it can stand in for it (2026-09-30);
  - **`moment` (the GLOW and GHK-Cu homepage sections)** is centred in the
    section's own object box and arrives with a slight rise as the section is
    scrolled through, then holds and turns — neither full-bleed like the
    sequence nor anchored like the presenter;
- resolves to a held pose under `prefers-reduced-motion`, with
  `frameloop="demand"`;
- degrades to a static silhouette with no WebGL, and takes the cheap glass path
  on the compact tier.

Two rules that outlive the V1/V2 split:

1. **Anchor the object to its box, never to a viewport fraction.** Media
   frames are capped in both axes, so a fixed fraction drifts out of them on
   wide screens. `VialModel` converts a box — expressed as fractions of the
   **canvas**, so it survives scrolling — into world position and scale. Best
   of all, give the canvas the box itself (the product page's live box, the
   homepage moments), so the object is at the canvas's centre: on the
   camera's axis, seen the same way on every screen. The canvas layer and the
   visible composition are separate stacking layers, so they share their
   geometry through custom properties on a common ancestor.
2. **Never let an animation share a frame budget with a canvas mount.** Booting
   the WebGL layer is ~240ms of main-thread work — model parse, three init,
   PMREM prefilter — and no amount of compositing hides a stopped main thread.
   Either the canvas mounts outside the animation window, or there is no
   animation. This is why the product page's opening is static.

Commerce inside a world keeps its own neutral action colour: `[data-world]` maps
`--surface-inverse` to the world's light tone, so a purchase panel must pin that
pair back to paper/charcoal or it renders a product-coloured button — the exact
failure §3 exists to prevent.

**The mirror of that trap, found in Phase 12: inside a world the "inverse"
tokens point INTO the dark.** `--ink-inverse` is `--world-void` — the ground
itself. A component that re-pins its text to `--ink-inverse` to "make it
readable on a dark card" renders black on black. It is never necessary: a world
has already re-pointed `--ink-primary`, `--ink-secondary` and `--ink-muted` at
mixes of its light tone that were measured to clear AA in all three worlds. So

- inside `[data-world]`, override **no text colour** — the ordinary rules
  resolve correctly on their own;
- pin only the **action**, and pin it to the raw `--neogen-paper` /
  `--neogen-charcoal` pair, which no world redefines.

## 12. Checkout and orders (Phase 10)

**The browser proposes; the server decides.** The bag is `localStorage` — this
browser's opinion, editable from a console. Entering checkout hands the server
a list of `{variantId, quantity, claimedUnitPrice}` and nothing else. Every
name, presentation, unit price and total on every screen after the bag is
looked up from the registry by `domain/checkout/pricing.ts`. `claimedUnitPrice`
is advisory only: its sole effect is to raise a `repriced` disclosure. **No
number that arrives from a client is ever multiplied, added or stored as
money.** A tampered bag produced the right price and a visible notice, which is
the behaviour to preserve.

**One route per step, forms over client state.** `/checkout/{contacto,envio,
entrega,pago,revision}` are server components rendering plain `<form
action={serverAction}>`. The whole flow works with no client JavaScript: back
and forward behave, a step can be reloaded, and the validation a customer meets
is the same code that decides whether an order may be created. Client islands
in the flow exist only where the browser must act: `ClearBagOnOrder` (the bag
lives in the browser), `MercadoPagoCardForm` (the processor's card fields) and
`PaymentWatcher` (asks the server to re-render an in-flight payment).

**Completeness is derived, never stored.** `stepComplete` re-validates the
draft's stored values; `canEnter` refuses a step whose predecessors are
incomplete, **on the server at render time**. Hiding a link is not access
control. There is no stored error list either — errors are re-derived every
render, so a fixed field cannot keep showing a stale message.

**A total is refused rather than guessed.** Free shipping above MX$10,000 is
confirmed, so `provisionalShipping` answers from the subtotal alone. Below it
there is no rate model: `quote` returns null, `placementBlock` returns
`delivery_unquotable`, and the delivery step explains it. Never print a
plausible shipping figure.

**Payment: Mercado Pago behind the adapter boundary.** Full reference:
`docs/PAYMENTS.md`. `bagEnabled()` is the business flag; `paymentAvailable()`
additionally needs a configured adapter (Mercado Pago: four environment
variables, with an explicit `MERCADOPAGO_MODE`) and, in live mode, a
`DATABASE_URL` — `paymentBlockers()` names what is missing. `none` remains the
fallback. Review comes BEFORE payment: `placeOrder` freezes the order (only
when payment is available), and `/checkout/pago/[id]` charges that order's
total with a token from the Card Payment Brick. **Only a provider answer can
make an order paid**: `reconcileSnapshot` (external reference and amount must
match) → `applyPaymentEvent`; `transition()` refuses `paid` outright. A
payment attempt is claimed under the order's version lock before the provider
is called (`beginAttempt`), with a stable idempotency key per attempt. **The
Mercado Pago SDK may appear only in the payment island's chunk** —
`check:output` asserts it, and bans every other processor's SDK.

**Provider events are idempotent by construction.** A webhook is authenticated
by the adapter (HMAC), and its BODY is never trusted for state: the verified
reference is re-fetched from the provider. Every snapshot's `eventId` is the
provider FACT (order + status + detail), so a synchronous answer and all its
webhook deliveries apply once; it is checked globally. Ordering is not handled by
comparing timestamps — a late event is simply an illegal transition, and the
`TRANSITIONS` table refuses it. That is why `paid` cannot regress: no code path
special-cases it.

**Persistence is a boundary, not an implementation.** `OrderRepository` and
`DraftStore` are what the domain knows. The adapters are in-memory and are a
**development answer only** — see the production blocker on
`domain/order/adapters/memory.ts`. Writes carry a version, because a webhook
and a customer action genuinely collide.

**Nothing unapproved renders.** `content/policies.ts` gates on `approved` **and**
present text **and** an approval date; the policy route declares
`dynamicParams = false` so an unlisted slug is a hard 404 at the routing layer.
Without it the route rendered on demand, hit `notFound()`, and Next cached that
as a **200 OK** — a soft 404 on a legal URL. An acknowledgement is publishable
only when its own copy **and** its linked policy are approved, so a consent to
an unreadable document is structurally impossible. Today: zero policies, zero
declarations, and that is the correct output.

**Checkout is `force-dynamic`.** Declared explicitly, not inferred from
`cookies()` having been read — the flag-off branch returns before touching a
cookie, which was enough for the build to prerender the whole checkout as
static HTML.

## 12b. Operations after checkout

Full reference: `docs/OPERATIONS.md`.

**Three axes, never one enum.** Payment (`order.state`), fulfilment
(`order.fulfilment.state`) and shipment (`order.shipments`) are separate and
combine freely. Only a provider answer moves payment. Only dispatching a
shipment reaches `fulfilled`. Nothing on the fulfilment or shipment axis
moves for an unpaid order.

**Operations are pure, and `operate` persists them.** Every operation in
`domain/order/operations.ts` takes an order and returns an order or a coded
refusal. `server/orders.ts#operate` runs it under the version lock and then
calls `afterOrderChange`. That re-derives stock holds (`desiredHold`) and
owed messages (`messagesOwed`) from the order's state. Both are
level-triggered and idempotent, so a lost step is repaired by the next
change. Add new behaviour by adding a pure operation, not by writing to the
repository from a route.

**Money is never claimed by NEOGEN.** A refund is requested, then submitted,
and becomes confirmed only from the provider's payment state. A message is
`sent` only when a channel reports the provider accepted it.

**External ids are attached, never adopted.** Payment, shipment, ERP and
invoice ids live on their own records or in `externalRefs`. The `NG-` id is
the order.

**Stored orders are upgraded on read** (`upgradeOrder`), in both
repositories, and migrations backfill list columns the same way. Adding a
field to `Order` means adding its default there.

**Boundaries with honest defaults:** `ShippingProvider` (none),
`NotificationChannel` (none), `AnalyticsSink` (none), `InvoiceProvider`
(none), and signal sinks (a console JSON line). None of them returns a
made-up value.

**The console** (`/ops`) is its own root layout, Spanish, off until
configured. Every action is a server action that re-checks the session.
Customer order status is `/{locale}/pedido/{id}`: owner cookie or signed
link, token stripped by redirect.

## 13. Trust and content (Phase 11)

**One resolver decides every quality state.** `domain/quality/resolveEvidence`
is the only code that can produce `documentation-available`, `coa-available`,
`lot-coa`, `third-party-tested` or `janoshik-verified`. No component sets a
badge, no product carries a verified flag, and every rendered state carries
`data-evidence-state` — `check:output` asserts the rendered count equals the
resolver's count.

**Evidence resolves at the narrowest level and never widens.** PRODUCT →
PRESENTATION → LOT → DOCUMENT. Analyses (COA, lot COA, third-party, analytical
report) may attach only to a presentation or a lot; an analysis attached to a
whole product is refused, because it could only be read as verifying every
strength. A lot COA covers that lot only. `ALLOWED_LEVELS` is where that rule
lives.

**Type and issuer are separate.** A third-party analysis is a type; Janoshik is
an issuer. "Janoshik verified" requires issuer exactly `janoshik`, type
`third-party-analysis`, a real report id, variant or lot scope, public and
approved — all five. A Janoshik record without a report id is refused, not
downgraded.

**Supplier data stays internal twice over.** `supplier-documentation` is an
internal-only type, the supplier issuer has `publicName: false`, and
`publicLot()` copies named fields so `supplierBatchReference` cannot reach a
page. `check:output` fails if private lot fields or the issuer registry appear
in a browser bundle.

**Content has a class and a status.** A (business decision), B (product fact),
C (scientific source), D (derived copy), E (blocked); `draft`,
`source-needed`, `owner-review`, `approved`. Only approved renders. D must name
the A/B/C it derives from; E never becomes D. `content/lifecycle.ts`.

**A scientific sentence cannot render without a public reference.**
`ProductOverview` statements are `SourcedStatement`s; `publicOverview` drops
any without an approved, valid reference, and returns null — omitting the
section — when nothing is publishable. There is no dose, administration,
protocol, cycle, frequency or reconstitution field in the model, and
`FORBIDDEN_PUBLIC_TERMS` blocks the same ideas in free text and in every
dictionary string.

**One reference registry, read from both ends.** Product ↔ reference links are
derived from overview citations (`content/research.ts`); the PDP, area pages
and the Research Hub all read that derivation. There is no second list of
"papers about this compound".

**Gated routes 404 honestly.** The documentation explorer
(`/investigacion/calidad`) renders in development as a labelled architectural
view and does not exist in production until a public document resolves. The
reference index (`/investigacion/referencias`) exists only while a public
reference is cited. Both are slugs of `investigacion/[slug]` with
`dynamicParams = false`, because a static route calling `notFound()` beneath
`[locale]` bakes a 200 — the soft-404 this codebase has already been bitten by
twice. Links to either are rendered under the same condition, and
`check:output` asserts the route and its links appear together or not at all.

**Notifications are provider-independent and cannot fail an order.** The order
domain does not import them. `server/notifications.ts` builds structured
messages (facts, not prose), writes them to an outbox, then attempts a channel.
The order-placed messages are queued when the provider first confirms payment
(not at order creation). Today the channel is `none` and every message is left
pending — nothing is emailed.

## 14. Discovery area pages (Phase 12.1)

**A section renders because a function returned something.** The derivations
live in `domain/discovery` (`featuredCount`, `entryOrder`, `featuredInArea`,
`relatedAreas`, `continuePlan`), `content/areas` (`publicAreaOverview`),
`content/research` (`areaResearch`) and `domain/quality`
(`evidenceCoverage`). The page never decides visibility inline, has no empty
states for context, research or evidence, and numbers its Quiet spine from
what rendered. `check:output` reads each built area page back and fails if a
section's presence disagrees with its derivation.

**Variation comes from data only:** how many entry compounds (area size),
the lead's surface (a flagship's world, else the area wash), related-area
layout (count of relations), which continuation rows exist, and browser
controls (≥ 8 compounds). There is no per-area configuration.

**Evidence is counted, never generalised.** An area may show how many public
records exist among its compounds, how many compounds and presentations they
cover, and the records themselves, each with its own scope and its own
states. It may not show an area-level state, a purity figure, or any sentence
that turns one presentation's document into a property of the area.
`EvidenceCoverage` has exactly three numeric fields and `check:quality`
asserts it. Area-ledger states carry `data-area-evidence-state`, counted
separately from the product page's `data-evidence-state`.

**No ranking language.** Entry order is "flagship first, then catalogue
order", labelled as entry compounds. Popularity, recommendation and sales
vocabulary is banned from the dictionaries by `check:content`.

## 15. Catalogue filtering and the design preview

**One filter engine** (`components/catalog/filters.ts`) serves the catalogue and
every area page. Filters OR within a facet and AND across facets; each option's
count is computed with every other facet applied but not its own. Every facet
reads a field the registry holds — area, classification, product type, format,
pack size, price, flagship — and availability, public
documentation and photography are wired but **render only when at least two
options exist in scope** (`facetVisible` / `flagVisible`). An unpriced product
never passes a price bound. Filter state is the URL query string (read through
`useSyncExternalStore`, written with `replaceState`); the server renders the
unfiltered list. Entries are built once, server-side, in `server/catalog.ts`.
There is deliberately **no presentation-count facet** (owner decision,
2026-09-15); "most presentations" remains a sort. On a wide screen the facet
sidebar can be hidden from the results toolbar — the results take its column
and the active filters stay applied and visible as chips. That choice is view
state for the visit, not part of the URL.

**The catalogue entrance** is a compact area index (`components/ui/AreaBoard`):
one slim hairline compartment per public area — a small swatch in the area's
ink, the name at reading size, the compound count in mono, and a 2px gauge of
`count / largest area` (a fact, never popularity). Hover washes the compartment
in its area tone and brings in an arrow. **The search** is a single hairline
field: icon, query at reading size, a clear control, a `/` keycap hint, and a
visual echo of the result count (the toolbar count stays the announced one);
focus turns the hairline into a 2px ink rule. `/` focuses it from anywhere,
Escape clears it. The owner's direction (2026-09-15): elegant first —
attraction through material detail and precision, not scale or display type.
`check:catalog` asserts all of it.

**The area design preview** (`/<locale>/productos/area/<slug>/vista-previa`)
renders the real area renderer with sample context, research and evidence from
`content/preview/areaPreview.ts`, passed through the same injectable
registries the live page uses. It is **development only**: the `[vista]`
segment generates no params in production and `dynamicParams = false` makes it
a real 404. Every sample string carries `[MUESTRA FICTICIA]` /
`[FICTIONAL SAMPLE]` and every URL is on `example.org`; `check:content` scans
the module source and `check:output` fails if the route or either phrase
reaches production output. Never promote a fixture from this module into a
real registry.

## 16. Card reveal and the presentation register

**The card reveal** (`components/ui/ProductCard`, data from
`server/catalog#cardDetails`) is the second layer of a product card. Rules:

- Every line is a registry fact, formatted on the server. Priority: approved
  overview summary → verbatim composition (only without a summary) →
  presentation ladder with pack prices → pack and price per vial → type and
  areas. Never write product description copy into the card; approve an
  overview summary instead and it appears on every card that product has.
- Opens on fine-pointer hover (120 ms intent delay), on keyboard focus of the
  card link, and on coarse pointers through a toggle button that is a
  **sibling** of the link. The panel is `pointer-events: none`, so it never
  steals the card's click. It is toned by the plate's `data-area` /
  `data-world`; a `[data-world]` frame must reset its painted background.
- The `feature` format has no reveal (its plate changes shape at 64rem).

**The presentation register** (`components/catalog/RegisterMatrix`) is the
catalogue's and every area page's table view (`?vista=registro`). Its layout
is derived from the current results by `domain/storefront#registerLayout`:

- **aligned** when the results' solid products hold at most
  `REGISTER_MAX_COLUMNS` (10) distinct strengths — strengths across, pack
  prices in the cells; non-solid products (solutions, volumes, IU, blends)
  follow in a second, sequential table;
- **sequential** otherwise (the unfiltered catalogue has 19 strengths) —
  each row lists its presentations in order, strength and price per cell.

Per pack / per vial is a toggle over the same prices. The crosshair is CSS
`:has()`. Row order is the browser's sort. `check:catalog` asserts the layout
rules and that every aligned cell is that variant's registry price.

**The homepage hub** (`components/home/NeogenHub`, data from `server/hub`) is
the gateway under the hero: on a wide screen the five destinations run ACROSS
as a strip of switches, and the preview panel sits BENEATH them at full width,
answering whichever one the reader is on (owner, 2026-09-15). Rules it must
keep:

- **It stays on the hero's ground.** The same charcoal and the same token
  remap the hero uses, so the page opens as one dark composition and resolves
  into paper at 02. Remap the semantic tokens; never hard-code a colour.
- **Exactly one preview copy is ever in the accessibility tree.** The panel is
  the wide screen's real, clickable preview; the per-row inline previews are
  the phone's. Each is `display: none` at the other width — never `aria-hidden`
  over focusable links (axe `aria-hidden-focus`).
- **A destination that cannot render is absent, not linked.** The builder
  returns `explorer: null` until `publicEvidenceIndex` is non-empty, and
  `check:output` fails the build if any page links the explorer while it 404s.
- **Every figure is counted from a registry** — products, presentations,
  areas, worlds, per-area counts, entry prices. No curated ordering.
- Plates inside it switch to `--area-deep`: an area's wash is a light mix over
  paper and reads as pasted-on against the hero's dark.
- **Its `min-width: 64rem` blocks live at the END of the stylesheet.** They
  restyle `.rowLink`, `.rowName`, `.areas`, `.list` and `.rulePoints`, which are
  declared at the same specificity — a media query does not raise specificity,
  so placed earlier they lose the cascade. That regression rendered the option
  names one letter per line; keep new wide-screen rules below the base ones.

**The flagship shop** (`components/storefront/FlagshipShop`) renders on the
three flagship product pages and offers the OTHER two worlds — never the
product the page is about, whose commerce panel is already above it. World
colour stays in the plate and the tab dots; the counter itself is Quiet, and
the action is gated by `bagEnabled()` on the server.

**Parked.** The catalogue ticker (`components/storefront/CatalogTicker`, data
in `server/storefront`) is built and tested but rendered nowhere — the owner
removed it from the homepage on 2026-09-15. If it is placed again: islands
receive numbers and labels, never a registry, and motion must stop (pause
control, static under reduced motion).

## 17. Atlas: the questionnaire is content, the advisor is code

**The questionnaire is data.** Every question, its wording in both languages,
its options and their order live in `src/content/atlas/questionnaire.ts`; the
schema, the engine and one renderer per kind live in
`src/domain/atlas/questionnaire/` and `components/atlas/QuestionField.tsx`.
Adding, reordering or rewriting a question touches content only. The full guide
is `docs/ATLAS_QUESTIONNAIRE.md`.

**Ids are the machine's, labels are the reader's.** Answers are
`{ questionId: value }` carrying option ids. A label may be rewritten freely; an
id is a data change, and `version` keys the session draft so a bump discards
stale drafts instead of restoring them wrong.

**One validator, two sides.** The engine works on the RESOLVED view — one
locale, registries already read — so the browser renders and validates against
the same object the API route rebuilds and re-validates. An answer to a hidden
or non-existent question is dropped, not coerced.

**Seven concerns, kept apart.** Collection is the questionnaire content.
Representation is `domain/atlas/fields.ts` (kind, category, sensitivity per
field; the only map from question ids) and `profile.ts`: `AtlasProfile`
represents the COMPLETE answered questionnaire, typed, and grants nothing.
Transmission is `privacy.ts`: per field, device-only or sent with a written
basis. Candidate selection, retrieval, AI context and recap (plus
presentation) are permissions an ADVISOR POLICY grants per field
(`policy.ts`, `policies/`). A policy receives one projection per permission,
never the profile; `applyAtlasPolicy` refuses an AI context carrying an
ungranted field. Withholding by a policy never removes data from the profile.

**Policies and engines are swappable.** `ACTIVE_ATLAS_POLICY` is one line; the
restricted catalogue policy is the current one and carries no medical rule. An
`AtlasAdvisorEngine` (composer, or a model over `@/advisor`) receives only the
AI-context projection, the policy's signals and specific candidate ids with
approved facts and evidence ids. A new policy or engine touches neither the
questionnaire, the profile, retrieval nor the result UI. Device-only answers
never reach the server; the ledger and recap are built in the browser from
the result's recorded policy.

**Facts are never copied into questionnaire content.** Areas, products and
research functions are `{ kind: "registry" }` option sources resolved at render
time in `server/atlas/questionnaire.ts`. A long list may arrive grouped — the
research-function vocabulary declares its own groups and the renderer sections
the cards on them, in arrival order, without re-sorting or filtering.

**The result UI reads structured data.** Each result product carries its
`source` (visitor / policy / retrieval / supply), structured `reasons`, approved
`evidence` resolved by statement id, and a deterministic `relevance`. The model
may cite a product's own statement ids and nothing else; it never writes a
finding, a price, a presentation or a reference. `recap` and `ledger` entries
carry their own label, answer, permitted uses and withholding, so the result
page has no knowledge of today's questions.

**A research function is never asserted.** A compound is tagged with a function
only from inside its overview, pointing at a sourced statement; the tag is
public exactly while that statement is (`publicFunctions`). Atlas offers a
function only when a compound carries an approved tag. The questionnaire may
ASK what the owner decides; what it may not do is USE a personal outcome, a
health, body or dosing answer to select a compound — `check:content` fails if a
question so worded is bound to a decision field, unless it is consumed only as
an option id translated to a catalogue area.

## 17b. Product media: the studio pipeline

Commerce surfaces never run WebGL. A product's catalogue image is a **studio
still**: its 3D container rendered once as a product photograph and captured
to a file.

- **The container is RETA's vial, whichever one RETA currently ships.**
  `StudioView` reads it from the registry (`MEDIA.reta.model`); `reta-v2.glb`
  is only the fallback. Every non-flagship product is photographed on it, and
  always wears its own drawn label, never RETA's printed one. Do not remodel
  it; web code owns camera, lighting and materials.
- **One label design, many products.** `relabel-sheet.mjs` keeps the owner's
  artwork and replaces only the compound name and the presentation, on rows
  measured off the sheet; `prepare-model.mjs --label` bakes the result into a
  per-product copy of the container. Everything else on that sheet is still
  whatever it was drawn for, so the result stays in `DEMO_ARTWORK`.
- **Drawn labels follow the mesh's own UVs.** `layoutFromUvs` reads the label
  primitive: a narrow strip (the jar) uses `drawLabel`, the whole sheet wrapped
  upright (V4) uses `drawSheetLabel`. No path-keyed configuration to go stale
  when a model is re-exported under a new name.
- **Glass depth is scaled to the model.** `thickness` is local-space and the
  root is normalised to height 1, so the studio multiplies the rig's value by
  the model's height over the jar's (`TUNED_HEIGHT`). Without it V4, authored
  ~10× larger, refracted nothing. The live viewer applies the same function
  (`studio/optics.ts`, §10); it once kept a fixed value and read as milky.
- **Bright-field needs refraction-only flags.** On the neutral set clear glass
  is defined by dark contours it REFRACTS from cards beside it. The rig's
  reflection panels cannot do that, so `refractionFlags` are real planes drawn
  only into the transmission image, and `negativeFill` puts black cards in the
  reflection map for the metal cap.
- **The rig is data.** `components/experience/studio/rig.ts` describes the
  shot: lens, turn, softboxes (diffuse `intensity` and a separate `reflection`
  brightness), sweep, floor and material response.
  - Each flagship gets its own world rig: `RETA_RIG`, `GLOW_RIG`, `GHK_RIG`.
    The last two are spread from `RETA_RIG`, so only what differs is stated.
  - Every other product uses `NEUTRAL_RIG`: a cream set with no world colour,
    so flagships stay exceptional.
  - Add a rig object, not a new scene.
- **Photograph the product as itself.** `StudioView` takes the product's OWN
  model where the registry declares one, and falls back to the canonical
  container otherwise. Rendering every product on the container put RETA's
  printed label on GLOW.
- **Labels.** A flagship's GLB carries its printed label; `label.ts` never
  touches one at render time. Every other product wears a label DRAWN from
  registry data — the brand lockup (§19), the product name and its presentation
  range — in the real label's measured layout. Never print placeholders, lots
  or claims.
- **A printed label is content, and it is held to the same rule.** What an
  export prints is read by a customer: no route of administration, no purity
  figure, no quantity the catalogue does not sell. RETA V3 arrived reading
  "INJECTABLE PEPTIDE · 99% PURITY · SUBCUTANEOUS USE" and ships that way while
  the owner designs the packaging — **declared in `DEMO_ARTWORK`**, which
  `check:media` prints on every run and which `PROJECT_STATE.md` §6 carries as
  a launch blocker. Draft artwork may ship on a site nobody can reach; it may
  not go public, and the way it stays visible is a declaration rather than
  somebody's memory.
- **When a label has to be corrected in code, it is baked into the file**
  (`export-label.mjs`, then `prepare-model.mjs --label`), never overridden per
  render path: four surfaces read that texture and only the studio has a
  material pass. See `public/models/README.md`.
- **Capture.** `node scripts/capture-studio.mjs <slug>... [--name studio-v4]`,
  with the dev server running. It opens `/[locale]/estudio/[slug]`, waits for
  `window.__studio.ready`, takes the frame the page exposes and writes the JPEG
  at 1600 × 2000. That route is development only: a real 404 in production, and
  noindex. Its "Capture still" button does the same by hand.
- **Version the filename whenever the render changes.** Images carry a one-year
  immutable cache and the optimizer keys on the URL, so re-rendering into the
  old name leaves every visitor on the previous picture. `check:media` accepts
  `studio.jpg` and `studio-v<N>.jpg`, in the product's own folder, and nothing
  else.
- **Registration.** The still goes in `MEDIA[slug].studio`.
  - It is a render: never `primary`, never counted as photography.
  - `check:media` requires the file to sit in the product's own folder.
  - `commerceStill()` (photograph, else studio still) feeds only the store
    card and the storefront masthead.
- **Radius.** `--radius-object` (6px) softens product surfaces only: store
  cards, area and signature tiles. Chrome stays square.
- **glTF materials without extensions load as `MeshStandardMaterial`.**
  Material tuning must not filter on `MeshPhysicalMaterial` alone.

## 17c. Education, editorial and the FAQ

Three content layers were added in §8y of `PROJECT_STATE.md`. They share one
rule with everything else here: **a surface may only state what something in
this repository can be checked against.**

- **`content/editorial`** — the notes (`/investigacion/notas/<slug>`).
  Structured blocks, not MDX: a block declares what it rests on
  (`definition` — vocabulary true independently of NEOGEN; `practice` — how
  NEOGEN itself works; `sourced` — a claim about what a compound does), and a
  `sourced` block without approved public references does not render. Notes
  live under `/investigacion` because a note is reading material of the same
  kind as the reference index, not a marketing silo. Slugs are checked against
  `RESERVED_ARTICLE_SLUGS`.
- **`content/faq`** — the questions (`/preguntas`). An entry carries a status;
  an unapproved one does not render AND must name what it waits on in
  `blockedOn`, which is internal and never shown. Answers interpolate
  `{tokens}` resolved from `config/site` and `domain/fulfilment`, so the FAQ
  cannot promise what the checkout would not do.
- **`content/certifications`** — the empty registry for any future
  certification, in the shape of `content/policies`: six required facts, a
  `verifyUrl` a reader can follow, and `publicCertifications()` returning
  nothing today. Nothing may render a certification from anywhere else.

### Fulfilment claims are data, not copy

`domain/fulfilment` answers whether a delivery claim MAY be made, derived from
`config/site`. `supports("same-day")` and `supports("nationwide-24h")` are
false and stay false until the facts change; `ShippingNote` renders only the
lines whose claims are supported. `check:content` fails the build if a
dictionary, note or FAQ string states a 24-hour or same-day delivery outside a
sentence that negates it.

### Acknowledgements: two kinds

`domain/acknowledgements` now distinguishes:

- an **agreement** — consent to a NEOGEN document. Publishable only when the
  policy behind it is approved. None is.
- a **condition of sale** — the customer stating something about their own
  purchase. Publishable on approved wording alone, because there is no second
  document to read. `research-use@1` is one, it is required, and
  `placeOrder` refuses to create an order without it.

Acceptances are stored as `id@version` on the draft and the order. **Changing
the wording means bumping the version** — that deliberately stops new consent
inheriting the old text, and `check:checkout` asserts the wording exists in
both dictionaries so a published declaration can never render as an unlabelled
checkbox.

## 17d. The knowledge system (NEOGEN Research)

**Derived, never parallel.** `content/compendium.ts` reads the catalogue,
`content/overview`, `content/references` and `content/functions`; it writes no
sentence. A compound record is `compoundRecord(slug, locale)` — the sourced
profile, with references numbered in first-citation order. A research line is
`researchLine(id)` — a function's compounds, each with the statements that
back its tag. If a profile changes, the record, its lines, the compendium row,
the glossary backlinks and the counts all change with it.

**Existence follows sources.** `recordSlugs()` (profile public in BOTH
locales) and `lineIds()` drive `generateStaticParams` with
`dynamicParams = false`, the sitemap and every link. A compound without a
record is linked to its product page instead. `check:output` fails on a
record or line page that should not exist, one that is missing, or any link
into the archive that would 404.

**The product page stays the only evidence surface.** Records summarise
documentation as a count and link to `#calidad`; they never render
`data-evidence-state`.

**The glossary** (`content/glossary`) holds definitions only — the editorial
`definition` class. `isPublicTerm` = approved + no forbidden vocabulary.
Records list the terms their own text uses via `termsInText` (folded,
whole-word `matches`); terms list the records that use them. Nothing rewrites
a sourced sentence to insert links.

**Identity** (`content/identity.ts`) — formula, mass, sequence, CAS — is empty
and renders only with an approved source. No "pending" row, ever.

**Components** (`components/research`): `KnowledgeHead` (breadcrumb, eyebrow,
h1, lede, counts, aside), `SectionIndex` (sticky scroll-spy index; a strip
under the header below 64rem), `KnowledgeDocument.module.css` (the shared
document skeleton), `CompoundLibrary` (URL-state filters via `lib/useUrlSearch`,
native-`<dialog>` quick view), `GlossaryExplorer`, `DepthMarks`,
`CitationMarks`, `RouteList`, `PeptideDiagram`. A grid that holds a
horizontally scrolling child needs an explicit `minmax(0, 1fr)` track, or
the column sizes to the child's unscrolled width and the page overflows —
found three times in this pass.

**The Quick Record** (the compendium drawer) is built server-side by
`server/quickRecord.ts` and served as static JSON at
`/api/compendio/<locale>/<slug>` (`force-static`, `dynamicParams = false`, one
file per published compound); the drawer fetches it on open, caches it, and
prefetches the two neighbours. It writes no sentence: statements are the
record's own, with the record's citation numbers; sources are the reference
records; prices come from the commerce layer; documentation counts from
`resolveEvidence`. Views are Overview / Evidence / Safety & limits / Sources,
deep-linked as `?ficha=<slug>&vista=resumen|evidencia|seguridad|fuentes`
(`replaceState`, no history entries). A compound without a record gets one
panel and no tabs. The NEOGEN product zone is drawn on raised ground,
visibly apart from the science.

**`aspect` on a sourced statement** (`"safety" | "limits"`) is how a finding
reaches Safety & limits. It is set by hand, on an existing statement, and adds
no words; untagged statements are findings. Nothing infers safety from the
text. `check:content` fails if a tag is lost on the way to either locale's
record.

**`--header-height` is per breakpoint** (4rem wide, 8.625rem below 40rem,
where the header is two rows). Anything sticky or anchored under the header
must read it.

## 18. Commands

```bash
npm run dev          # development server
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run build        # production build
npm run check        # every gate, in order
npm run check:catalog   # registry integrity
npm run check:commerce  # bag arithmetic + payment state machine
npm run check:checkout  # server-side pricing, gates, idempotency, policies
npm run check:quality   # evidence resolver, lots, Janoshik rules, media readiness
npm run check:content   # references, sourced statements, forbidden vocabulary, notifications
npm run check:media     # media declarations vs real files
npm run check:payments  # Mercado Pago vocabulary, webhook HMAC, charge integrity, reconciliation
npm run check:operations  # fulfilment, shipments, refunds, inventory race, outbox, access links, ops auth
npm run check:atlas     # questionnaire, profile, privacy, projections, no-leak sweep, policies, engines
npm run check:output    # what the build actually emitted
npm run format       # Prettier
npm run db:migrate   # apply db/migrations to DATABASE_URL
npm run ops:account -- <name>  # print an OPS_ACCOUNTS entry (password typed at a prompt)
```

Asset pipelines — run by hand, and their output is committed:

```bash
npm run brand                                    # public/branding/ + the favicon
node scripts/prepare-model.mjs <src> <dest> ...  # 3d assets/ -> public/models/
node scripts/inspect-model.mjs <file.glb>        # parts in mm, triangles, transmission
node scripts/export-label.mjs <slug> --out x.png # the drawn label sheet (dev server up)
node scripts/capture-studio.mjs <slug>...        # the studio still (dev server must be up)
```

## 19. The brand mark

The owner's artwork lives in `public/branding/`. Two files are theirs
(`NEOGEN Branding.png`, the mark — the molecule; `NEOGEN Full Logo.png`, the
lockup — mark + NEOGEN / PEPTIDES) and the rest is derived. Regenerate the
derived files with `npm run brand`; never edit them by hand.

**There is no vector source, so the mark's geometry is MEASURED from the
artwork.** `scripts/trace-mark.mjs` (run by `npm run brand`) traces the trimmed
PNG's alpha channel, smooths the outline by about a pixel (the export's pixel
grid showed as a ripple at 800px), finds the five round parts from its distance
transform and fits their circles — to know where each connection leaves and
meets them, not to draw them — then cuts the one outline into pieces (hub,
nodes, each connection's two halves) that share their ends and tangents, as
smooth curves. It rasterises the pieces together and compares them with the
artwork: 99.1% pixel overlap (the rest is antialiasing); below 98.5% it
refuses to write. It holds at a metre tall with no step at any join. Output:
`src/components/brand/markGeometry.ts`. Nothing about the mark is drawn by
hand, and the geometry is never edited — only regenerated.

**One component draws it: `components/brand/NeogenMark`** (inline SVG,
`fill: currentColor`, so it inks itself graphite on paper, paper on the footer
and on whatever surface `HeaderSurfaceSync` flips the header to — what the alpha
mask used to do). Drawings that are themselves SVG use `brand/MarkShape` (the
same geometry, static, no wrapper). The caller sets the height; the width
follows the artwork's box (389 × 485).

Its motion vocabulary is one idea — **points → connection → structure** — and
every use is caused by the reader (CONVENTIONS' motion rules: nothing loops,
breathes or plays on load):

| use               | what happens                                                                  | where                            |
| ----------------- | ----------------------------------------------------------------------------- | -------------------------------- |
| `form="points"`   | the nodes alone, unconnected — nothing here yet. Static.                      | empty bag, 404                   |
| `assemble="hero"` | forms on the scroll range the poster NEOGEN lands on (desktop, homepage only) | header                           |
| `assemble="view"` | forms as it is scrolled into view; reversible                                 | footer (the signature)           |
| `assemble="now"`  | forms once, on mount — a completed action                                     | add-to-bag confirmation          |
| `respond`         | on pointer/focus of its host, the connections let go and reach again          | header link, footer, record card |

The assembly: the hub registers, the four nodes register, each connection
reaches from BOTH ends and meets, clockwise from the top node, and each node
is drawn ~2% toward the hub as its connection closes, then relaxes. On scroll
it runs on CSS scroll/view timelines (`NeogenMark.module.css`); on a gesture,
on native Web Animations (`markMotion.ts`). Inside `[data-area]`, `respond`
answers in `--area-mark` and returns to ink; nowhere else is the mark coloured.

### The mark at architectural scale (`brand/MarkField`)

Micro (the header, the footer signature over the wordmark, a confirmation)
is not presence. The mark also works at the scale of a section: a field
behind a section's content, placed by its HUB (`--hub-x`, `--hub-y`), sized by
height (`--mark-h`), cropped by the section's own edges, in one opaque low-
contrast tone (`--mark-tone`; a mix, never an alpha — the parts overlap). A
fragment is a choice of arms (`arms`, clockwise from the top) and the hub.

| where                        | composition                                                          | tone                    |
| ---------------------------- | -------------------------------------------------------------------- | ----------------------- |
| every footer (the signature) | the whole mark, 64rem+, right of the wordmark; gathers on scroll     | paper 9% into charcoal  |
| `/productos` masthead        | the hub behind the middle flagship; nodes around the three cards     | paper 14% into charcoal |
| homepage "Explora por área"  | hub + top and left nodes behind the heading, products in front       | area mark 26% into wash |
| a product's profile head     | hub + left node, cropped by the field's lower edge                   | area mark 18% into wash |
| Research hub masthead        | the whole mark behind "NEOGEN RESEARCH", away from the archive plate | ink 5% into paper       |
| a scientific record's head   | the whole mark to the right of the title, cropped top and bottom     | area mark 16% into wash |

- **Legible, or not at all.** A composition keeps the hub and at least two
  nodes recognisable; a crop that leaves only blobs was rejected.
- **Brand layer, never data layer.** Only in mastheads, heads, fields and the
  footer — never in or beside a figure, the archive plate, the map, lines,
  citations or references. Far larger and fainter than any figure, never
  clickable (`pointer-events: none`), `aria-hidden`.
- **It moves only at the footer and in "Explora por área"** (the footer:
  `assemble="gather"`, the nodes travel in from beyond the footer along their
  own arms, whole exactly when the page ends, then Living Ink; the explorer:
  Living Ink). Every other field is static: the identity must survive a
  screenshot. Reduced motion: every field is whole and still.

### Living Ink (`brand/livingInk.ts`, `LivingLayer`; MarkField's `ink`)

The mark at macro scale as a slow, viscous material: the traced outline
(`markOutline.ts`, written by `trace-mark.mjs`), each point moved along its
normal by AUTHORED signals from the mark's own structure, redrawn as the same
smooth curves. One path; never a filter, never noise. Brand material only: it
depicts nothing and is never described as anything scientific.

| layer       | what                                                                                         | where                       |
| ----------- | -------------------------------------------------------------------------------------------- | --------------------------- |
| drift       | node volume redistributing (the hub answers), neck tension, a rare migrating swell; 17s–2min | footer, explorer (`rest`)   |
| episodes    | one region at a time swells / tenses / carries a bulge, then settles; 2 at most, out of step | explorer only (`episodes`)  |
| pointer     | the nearest surface leans toward the pointer, follows with a lag, lets go slowly             | both (`disturb`), mouse/pen |
| disturbance | a ripple round the surface from a tap, an area change or a connection closing; then settles  | both (`disturb`)            |

- **Readable, not restless.** A living rest that nobody can see is not a
  living rest: the explorer's episodes move an edge 2–6px a second at desktop
  size. But never breathing (the whole mark at once), pulsing, rhythm, waves,
  jelly or a fast move.
- **The pointer is a presence, not a trigger.** No cooldowns, no ripple per
  move; it eases in and out.
- **Clean edges.** The material draws outside the artwork's box (the section
  crops); a fragment's omitted arms close as points round the hub in the same
  curve chain; displacements are softened along the outline. No corner
  sharper than the artwork's own.
- **Cost:** computed 10Hz (20Hz with episodes) and written only when the edge
  moved ⅓px on screen; every frame only while disturbed or the pointer is
  near. Nothing off screen, in a hidden tab or under reduced motion (the
  canonical outline).
- **Micro marks never take it** — the header, confirmations and every small
  mark stay stable geometry. `/estudio/marca` is its dev-only lab (a 404 in
  production).

- **The mark is decorative wherever the wordmark is beside it.** `aria-hidden`
  by default; `label` only where it stands alone for the brand.
- **Brand connections are never data.** The mark's nodes and connections mean
  nothing. It is never placed where they could be read as compounds, sources,
  research lines, mechanisms or relationships — so not in Research figures,
  the archive, the lines, the glossary or references (whose own dots ARE
  data), and never as a quality seal (it would read as a certification).
- **Use the MARK at small sizes and the LOCKUP only where "PEPTIDES" survives.**
  The second word is the first thing to go. It holds on a rendered label at
  84px of a 2048² sheet; it does not hold in a 200-unit SVG plate or in the
  header, which take the mark alone.
- **The PNGs remain where a raster is the right tool:** the favicon
  (`src/app/icon.png`), and the drawn canvas label of every product without
  its own artwork (`studio/label.ts`, the lockup and mark as images on a
  2048² canvas). The spec ribbon prints the lockup PNG.
- **Replacing the artwork:** drop the new export over the source file keeping
  its name, run `npm run brand`, commit what it writes. If a future export is
  not black-on-alpha the trace fails loudly — say so rather than working
  around it.
