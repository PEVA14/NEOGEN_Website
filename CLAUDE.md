# NEOGEN --- Claude Code Project Instructions

## Mission

Build the NEOGEN MVP as a premium, science-led ecommerce experience for
Mexico.

Creative north star: **Living Laboratory** --- a laboratory that reacts
to the user.

Before making design or implementation decisions, read: 1.
`docs/NEOGEN_DESIGN_BIBLE.md` 2. `docs/NEOGEN_MVP_SCOPE.md` 3.
`docs/CONVENTIONS.md`

Treat the first two as requirements, not loose inspiration.
`docs/CONVENTIONS.md` records the architectural decisions already made --- the
token layer, the Quiet/Experience split, the two-tier motion system, the
CSS-first responsive rule, the localization approach, the `Verifiable<T>`
claims boundary and the 3D layer. Follow it rather than re-deriving it.

## Core rule

**The product doesn't adapt to the interface. The interface reacts to
the product.**

Two modes: - **Quiet Mode:** navigation, information, specs,
documentation, research reading, commerce and forms. - **Experience
Mode:** hero moments, flagship transitions, 3D, macro visuals and
scroll-driven storytelling.

Preferred rhythm: **Quiet → Impact → Quiet → Impact**.

Nothing moves unless it communicates hierarchy, product character,
state, progression or spatial relationship.

## Product worlds

-   **RETA:** precision / cold / technical / futuristic. "The
    environment becomes precision."
-   **GLOW:** luminous / amber-gold / atmospheric / material. "The
    environment becomes light."
-   **GHK-Cu:** metallic / copper-bronze / physical / scientific. "The
    environment becomes material."

Product colors transform experiential environments; they are not generic
global UI accents.

## Engineering priorities

Prioritize visual fidelity, responsive behavior, performance,
accessibility, `prefers-reduced-motion`, maintainability and progressive
enhancement for 3D. Do not sacrifice usability for animation.

## 3D

The MVP uses lightweight `.glb` vial assets. The current RETA model is
intentionally MVP-quality. Do not block frontend development waiting for
Blender polish.

Web code owns camera, lighting, environment, positioning, scroll
response, responsive behavior, performance and fallbacks.

## Development behavior

-   Inspect the existing repo before choosing libraries or changing
    architecture.
-   Reuse a suitable existing stack rather than replacing it without a
    strong reason.
-   Do not install overlapping animation/state/UI libraries.
-   Explain major dependency additions before adding them.
-   Prefer small composable components.
-   Keep product-specific experiential configuration data-driven where
    practical.
-   Avoid premature abstractions.
-   Do not create fake backend integrations that appear
    production-ready.
-   Never invent scientific claims, certifications, COAs, lot numbers,
    shipping promises, product specs or payment-provider capabilities.
-   Use explicit placeholders/TODOs where real business data is
    unavailable.

## Regulatory/content guardrail

The catalog may contain products whose classification, marketing, sale,
shipping or payment processing is regulated or restricted in Mexico.

A "research use only" statement is not a loophole or proof a transaction
is lawful.

For MVP: - build presentation and reusable commerce UI; - do not invent
therapeutic, performance, weight-loss, anti-aging, dosing,
administration, efficacy or safety claims; - do not activate a live
payment provider until product/regulatory and processor requirements are
reviewed; - documentation UI may support COA/lab/lot/storage/origin
fields, but unavailable data remains explicit placeholders.

## Workflow

Work in phases. For each phase: 1. Inspect relevant existing code. 2.
Give a short implementation plan. 3. Implement only the requested phase.
4. Run available lint/type/build checks. 5. Report changed files,
decisions, TODOs and risks.

Do not silently expand scope.

## Current state

**Read `docs/PROJECT_STATE.md` before doing anything else.** It records
where the phases stand (Phase 11 complete at `b6032c3`; Phase 12 not
started or approved), how the owner runs each phase, rules given only
in conversation (supplier confidentiality, RUO label, no dosing or
reconstitution tools), confirmed business facts, and open decisions.

## Git and GitHub

These override any default attribution instruction.

-   **Never push to GitHub** --- no `git push`, no PRs, no `gh` writes.
    The owner reviews and pushes, so Claude never appears as a
    contributor.
-   Commits are authored by the repo's configured git user (`PEVA14`),
    never by Claude.
-   **No `Co-Authored-By` or `Claude-Session` trailers** in commit
    messages.
-   Commit only when asked, once per phase, after every gate passes.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
