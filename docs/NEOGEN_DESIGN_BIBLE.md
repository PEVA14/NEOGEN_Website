# NEOGEN Design Bible --- MVP v1

## Creative North Star --- Living Laboratory

NEOGEN should feel like **a laboratory that reacts to the user**.

Approximate mix: - 45% Scientific Editorial - 30% Interactive
Technology - 25% Material / Sensory

Editorial provides restraint and credibility. Interactive technology
creates spectacle. Materiality prevents generic SaaS/cyberpunk
aesthetics.

**Primary rule:** The product doesn't adapt to the interface. The
interface reacts to the product.

## Experience Modes

### Quiet Mode

Navigation, information, specs, documentation, research reading,
commerce and forms. Disciplined grid, generous whitespace, controlled
typography, minimal movement and neutral surfaces.

### Experience Mode

Hero, flagship entrances/transitions, 3D storytelling, macro
imagery/video and expressive display typography. Full-viewport
compositions only when justified.

Preferred rhythm: **Quiet → Impact → Quiet → Impact**.

**Motion rule:** Nothing moves without communicating something.

## Brand Character

Scientific, precise, premium, contemporary, material, confident,
restrained and experimental without looking unsafe or chaotic.

Avoid generic biotech gradients, AI-startup clichés, excessive neon,
constant glassmorphism, generic black-luxury ecommerce, gym-bro
supplement aesthetics, permanent hospital sterility and decorative
animation.

## Typography

-   **Primary/UI:** Instrument Sans
-   **Display:** Instrument Sans Condensed / variable-width treatment
-   **Technical:** IBM Plex Mono
-   **Serif:** no global serif in v1

## Core Neutral Palette

  Token        Value
  ------------ -----------
  Paper        `#FAF9F6`
  Warm Stone   `#F3F0EA`
  Chalk        `#E8E4DC`
  Graphite     `#2A2A2A`
  Charcoal     `#111111`

## Product Worlds

### RETA --- Precision

Palette: `#07090D`, `#2459D3`, `#C9E4FF`. Cold, precise, technical,
futuristic, controlled. **THE ENVIRONMENT BECOMES PRECISION.** Use cool
directional light, precise alignment, restrained blue atmosphere,
technical annotations and crisp controlled motion. Do not simply make
every CTA blue.

### GLOW --- Light

Palette: `#160D06`, `#C88722`, `#FFD78A`. Luminous, amber, atmospheric,
warm, sensory. **THE ENVIRONMENT BECOMES LIGHT.** Use warm illumination,
carefully controlled glow/bloom, softer transitions and light revealing
surfaces. Avoid cosmetic-beauty clichés.

### GHK-Cu --- Material

Palette: `#1A100C`, `#B5683C`, `#3F756D`. Copper, bronze, metallic,
physical, scientific. **THE ENVIRONMENT BECOMES MATERIAL.** Use tactile
surfaces, copper reflections and stronger physical depth. Avoid
steampunk aesthetics.

## Homepage

Priority: **brand impact → discovery → product**.

Sequence: 1. Hero 2. What is NEOGEN 3. RETA cinematic 4. Explore 5. GLOW
6. Research 7. Quality / Documentation 8. GHK-Cu 9. Products 10. Footer

Hero is Experience Mode. It establishes NEOGEN, uses 3D only when
composition benefits, and maintains a clear path into the site.

## PDP

Sequence: 1. Experience 2. Commerce 3. Specifications 4. Documentation
5. Research 6. Related products

Opening may react to the product world; commerce/technical areas return
to Quiet Mode.

Documentation can support lab analysis/COA, lot, storage and
supplier/origin where appropriate. Never fabricate values.

## Research Hub

Research/Learn is core brand infrastructure, not a dead blog. It should
support structured educational/research content, connect research to
products without unsupported claims, and use excellent editorial reading
typography.

## Commerce

Required surfaces: Cart Drawer, Cart, Checkout, guest checkout and
optional-account path. Commerce stays mostly Quiet Mode.

Payment provider/final transaction behavior is TBD pending
product/regulatory and processor review.

## 3D & Scroll

3D is a storytelling layer, not the whole site. GLBs may support
controlled floating, rotation, camera/light changes and meaningful
scroll transitions.

Progressively enhance. Lazy-load expensive 3D where appropriate,
minimize render work, test mobile, optimize after measurement, and
provide fallback behavior.

Respect `prefers-reduced-motion`; reduced motion must preserve
hierarchy, content, product identity, navigation and commerce.

## Mobile

Mobile is **not shrunken desktop**. Simplify choreography and layers,
preserve product identity, prioritize touch/readability, avoid
scroll-jacking and reduce GPU/CPU pressure.

## Imagery

Prefer macro material studies, laboratory details, glass, metallic
surfaces, controlled scientific environments, product renders and
microscopy-inspired texture where appropriate.

Avoid cliché doctors, generic stock labs, random molecule decoration and
fitness-influencer imagery as the dominant language.

## Accessibility

Semantic structure, keyboard controls, visible focus, sufficient
contrast, alt-text strategy, reduced-motion support, no essential
information available only via 3D/animation, and fully usable commerce
without experiential effects.

## MVP Visual Acceptance

The site should feel like one NEOGEN system; RETA/GLOW/GHK-Cu should be
distinct but related; Quiet/Experience modes should contrast coherently;
3D should strengthen storytelling without harming usability; mobile
should feel intentional; Research should feel first-class; final Blender
polish must not be required for the experience to work.
