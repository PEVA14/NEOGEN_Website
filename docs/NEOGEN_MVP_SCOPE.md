# NEOGEN MVP Scope

## Goal

Ship a convincing, usable NEOGEN ecommerce MVP quickly enough to
validate the Living Laboratory brand and frontend experience without
allowing Blender polish, speculative backend work or excessive animation
to become blockers.

The MVP should prove: - Living Laboratory works in-browser; - three
flagship product worlds can coexist; - 3D assets integrate
performantly; - desktop and mobile both work intentionally; - product
discovery, PDP, Research and commerce UI form one coherent system.

## Flagship Products

-   RETA
-   GLOW
-   GHK-Cu

### 3D MVP

Use the same functional vial master for all three. - RETA: current
vial + RETA label. - GLOW: same vial + GLOW label. - GHK-Cu: same vial +
GHK-Cu label.

Deferred: powder/lyophilized contents, liquids, advanced glass, cap
micro-detail, condensation, micro-imperfections, realistic paper fibers,
cinematic Blender rendering and unique geometry per product.

The current RETA GLB is acceptable for MVP.

## Market / Business Assumptions

Initial market: **Mexico**.

Same-day delivery is intended for Guadalajara and Durango. National
courier is TBD. Do not hard-code unverified shipping promises as
production facts.

Guest checkout is required; optional accounts are desired. Payment
provider is TBD.

## Required Surfaces

-   Global navigation
-   Homepage
-   Products/discovery
-   Reusable PDP template
-   RETA, GLOW and GHK-Cu PDPs
-   Research Hub
-   Representative research/article template
-   Cart Drawer
-   Cart
-   Checkout UI
-   Footer
-   Responsive/mobile layouts
-   Basic loading/error/fallback states for 3D

Can remain lightweight: account state, sophisticated filtering/search,
large research archive, personalization, inventory behavior and CMS
integration.

## Homepage

Sequence: 1. Hero 2. What is NEOGEN 3. RETA cinematic 4. Explore 5. GLOW
6. Research 7. Quality / Documentation 8. GHK-Cu 9. Products 10. Footer

First creative/technical proof: **Hero + RETA 3D**. Do not build every
cinematic section before validating this pattern.

## Product Data Model

Support fields for name, slug, descriptor, product-world/theme, imagery,
GLB path, verified price/placeholder, availability, specs, documentation
references, research references, storage, lot, origin/supplier where
appropriate and related products.

Never invent unavailable real-world values.

## Documentation

UI should accommodate lab analysis/COA, lot, storage and supplier/origin
where appropriate. MVP may use clearly labeled placeholders. Never
fabricate certificates, analysis results, labs, batch numbers or
provenance.

## Research

In scope: Research Hub, article/card system, article template,
product↔research relationships and excellent long-form treatment. A
large content library is not required.

Do not generate unsupported medical/efficacy claims merely to fill
content.

## Commerce

In scope: product CTA patterns, quantity UI where appropriate, Cart
Drawer, Cart, Checkout UI, guest flow, optional-account affordance,
shipping/contact form structure and order summary.

Not production-enabled yet: final payment processor, unreviewed
regulated-product transaction flow, fabricated shipping integrations,
fabricated tax/compliance logic or fake production inventory.

## Regulatory / Claims Boundary

Do not treat "research use only" as legal authorization. Do not create
dosing or administration instructions. Do not invent therapeutic
indications or weight-loss, performance, anti-aging, healing,
disease-treatment, efficacy or safety claims. Do not conceal product
nature from processors/providers. Keep uncertain legal/business behavior
explicitly TBD.

## Phase 1 --- Foundation

-   audit existing repo;
-   identify framework/build tooling;
-   establish global tokens/styles;
-   load typography;
-   establish responsive layout primitives;
-   routing/page skeletons;
-   organized assets;
-   product theme/config structure;
-   accessibility conventions;
-   motion/reduced-motion conventions;
-   choose 3D stack after dependency audit.

Do not rewrite a healthy project just to match a preferred stack.

## Phase 2 --- Hero + RETA 3D

Validate Living Laboratory in a real browser: - load RETA GLB; -
sensible camera/composition; - RETA lighting; - responsive
positioning; - controlled meaningful movement; - loading state; -
failure/static fallback; - reduced-motion behavior; - desktop/mobile
performance measurement.

Do not build GLOW/GHK-Cu choreography until RETA establishes a reusable
pattern.

## Later MVP Phases

Complete homepage → product discovery → reusable PDP → three product
instances → Research → cart → checkout UI → responsive QA →
accessibility QA → performance optimization → content/data cleanup →
final MVP polish.

## Explicitly Deferred

Advanced Blender polish, powder/liquid internals, unique high-detail
models, final payment activation, complex account dashboard,
personalization engine, elaborate CMS workflows, unnecessary admin
tooling and cinematic effects that materially hurt mobile performance.

## Definition of Done

Required routes are navigable; all three flagships are represented; 3D
has graceful fallbacks; mobile is intentional; reduced motion works;
cart/checkout UI is coherent without pretending unavailable integrations
are live; Research/documentation surfaces exist; placeholders are not
presented as verified data; configured lint/type/build checks pass; no
obvious critical console errors; performance is reasonable; improved
GLBs can later be swapped in without redesigning the frontend.
