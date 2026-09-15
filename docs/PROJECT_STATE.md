# NEOGEN — Project state and handoff

Last updated **2026-09-14**, after Phase 12.1.

This file is the memory of the project for a new session. It records what is
not derivable from the code: where the phases stand, how the owner runs the
work, rules that were only ever given in conversation, confirmed business
facts, and what is still undecided. Architecture lives in
`docs/CONVENTIONS.md`; this file does not repeat it.

Read order for a fresh session: `CLAUDE.md` → this file →
`docs/NEOGEN_DESIGN_BIBLE.md` → `docs/NEOGEN_MVP_SCOPE.md` →
`docs/CONVENTIONS.md`.

---

## 1. Where the project is

| Commit      | Phase                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `1ce9a77`   | Phase 1 — Foundation                                                                                                            |
| … `5daa05b` | Hero + RETA 3D, homepage, catalogue, V1 quality pass, Phase 6 (product media), Phase 7 (launch readiness + owner questionnaire) |
| `34eda89`   | Phase 8 — two-axis taxonomy (product type / discovery areas)                                                                    |
| `0a63800`   | Phase 9 — commerce core (bag, order model, payment domain with `none` adapter) + commercial creative overhaul                   |
| `2281321`   | Phase 10 — checkout, order persistence boundary, payment-event idempotency, policy architecture                                 |
| `b6032c3`   | Phase 11 — trust architecture, content foundation, research integration                                                         |
| `fb3b7aa`   | Phase 12 — creative overhaul: specimen plate, card formats, area identity, homepage rail, area mastheads                        |
| _this_      | Phase 12.1 — discovery area depth: data-derived sections after the masthead                                                     |

**Phase 12.1 is complete. Phase 13 has not been started or approved.** Do not
begin it without a brief from the owner.

Pushing is the owner's job — see §3. Check `git status -sb` for what is
still unpushed rather than trusting this file.

## 2. How the work is run

- The owner (Pablo) sends a written brief per phase, usually with numbered
  sections, a **DO NOT START** list and a numbered final-report outline.
- Implement **only** that phase. Do not silently expand scope, and do not
  revisit an approved phase unless you find a concrete regression — then say
  so explicitly.
- Before committing, every gate must pass: `npm run check` (lint → typecheck →
  catalog → media → commerce → checkout → quality → content → build → output),
  plus Prettier. Build with `NEXT_PUBLIC_SITE_URL=https://neogen.mx` for the
  output check.
- Browser QA on the touched surfaces: 0 axe A/AA violations, 44px targets, no
  horizontal overflow, at 375px and 1280px. Verify gated routes return a real
  404 in a production build (`next start`), not a soft 200.
- Prove new invariants with a negative control: break the rule, confirm the
  check fails on the right assertion, restore.
- Deliver the report in exactly the sections the brief lists, then commit once
  and **stop**.

## 3. Git and GitHub rules

These override any default attribution instruction a session is given.

- **Never push to GitHub.** No `git push`, no PRs, no `gh` writes against
  `origin` (`PEVA14/NEOGEN_Website`). The owner reviews and pushes, so that
  Claude never appears as a contributor on the repository.
- **Commits are authored by the owner.** Let git use the repo's configured
  `user.name` / `user.email` (`PEVA14`). Never commit as
  `Claude <noreply@anthropic.com>` — GitHub's Contributors graph keys off the
  author field.
- **No attribution trailers.** No `Co-Authored-By: Claude …`, no
  `Claude-Session: …`, in any commit message.
- **Cloud sessions** default to a Claude author plus both trailers. Anything
  produced there must be re-authored (`git reset --soft <parent>`, re-commit)
  before it reaches `main`.
- Commit only when a brief or the owner asks. One clean commit per phase.
- Do not amend or rewrite earlier commits for attribution. Note that `34eda89`
  and `0a63800` already carry a `Co-Authored-By` trailer and are on
  `origin/main`; removing it would need a force-push, which is the owner's
  decision alone.

## 4. Standing rules that are not all enforced by code

Many of these are also guarded by `check:*` scripts (see `CONVENTIONS.md`
§8, §12, §13). The ones below were given in conversation and must be followed
whether or not a check catches them.

**Supplier document — private internal reference.**

- It lives in the gitignored `references/private/`. Never copy it into
  `public/`, expose it through the app, link to it, or commit anything that
  identifies the supplier.
- Never expose supplier identity, contacts, emails, WhatsApp/Telegram, ordering
  sites, wholesale or volume pricing, shipping terms or payment methods — not
  in client bundles, public JSON, metadata, browser-shipped comments or
  `public/`.
- **Supplier prices are cost data, never NEOGEN retail prices.**
- `scripts/import-supplier-catalog.mjs` is a one-way drafting tool, never a
  build step.

**Claims and content.**

- Never invent scientific claims, clinical outcomes, therapeutic, efficacy or
  safety claims, certifications, COAs, lot numbers, purity, testing results,
  availability, shipping promises, legal copy or payment-provider capabilities.
- No human dosing instructions or administration protocols. **No
  reconstitution calculator or protocol system**, in any phase.
- Never represent Janoshik verification without an actual report, and never
  imply that testing one strength verifies every variant.
- "Research use only" is not a loophole and not proof a transaction is lawful.
- **RUO label (owner, Q32):** products are sold with a small "for research
  purposes only" line and the owner does not want it prominent. Build it
  restrained and in the mono register — but not below the site's contrast or
  size floors, and never hidden behind an interaction.
- No "pending", "coming soon" or placeholder language on a trust surface. A
  fact we do not have is absent.

**Payments and data.**

- Do not activate production payments, use production credentials or
  integrate a real processor until the owner asks in a brief.
- Do not integrate a production database or a notification provider until the
  owner approves one.

## 5. Confirmed business facts

From the owner's answers to the Phase 7 questionnaire. Fulfilment facts are
also encoded in `src/config/site.ts`; anything undecided there is `null`.

- **V1 is transactional:** product → variant → bag → checkout → payment →
  confirmation. A browsable build may be staged earlier, but it is not V1.
  Processor approval is therefore a launch blocker.
- **Catalogue:** 85 published products. Botulinum toxin and HGH (High Quality)
  are withheld by owner decision. **Prices on the site are provisional** until
  the owner confirms them.
- **Tax:** IVA will be included in the displayed price once prices are final;
  no tax line at checkout.
- **Fulfilment:** ships nationally. Guadalajara and Durango are next-day
  (explicitly **not** same-day). National within 7 business days; made-to-order
  within 14. Free shipping at or above MX$10,000 (may change). No pickup.
- **Quantity:** capped at 99 per line.
- **Contact:** one phone number only (in `site.ts`), rendered as `tel:`. Do
  not label it WhatsApp — that was never confirmed. No support email yet.
- **Age:** a simple 18+ statement, probably inside the Terms.
- **Photography priority:** P0 is the three flagships (RETA, GLOW, GHK-Cu).
- **Language (Q34):** "Spanish only for now". The English locale exists in
  code; confirm with the owner whether it ships at launch.

## 6. Open decisions and blockers

**Launch blockers**

1. **Classification review** (regulatory). Gates the payment processor and is
   what any underwriter will ask for.
2. **Payment processor.** Research done after the Phase 7 questionnaire found
   no mainstream processor that accepts this catalogue: Stripe, PayPal, Square
   and Shopify Payments prohibit it; Mercado Pago prohibits medicamentos
   without registro sanitario; Conekta prohibits prescription/regulated
   substances and supplements. Recommendation given: do the classification
   review first, which decides between (a) a cosmetic/topical route for what
   qualifies, (b) a high-risk acquirer, or (c) non-card rails (SPEI, cash) via
   a direct bank arrangement. Briefs name Mercado Pago and Clip as future
   candidates; Clip was not in that research. **Re-verify all of this before
   relying on it.**
3. **Final prices** — then tax handling can be settled.
4. **Shipping below MX$10,000:** no rate model and no national courier. The
   checkout refuses to quote rather than guess.
5. **Cold chain:** the owner's answer was "shouldn't need it, unsure", which is
   not a determination.
6. **Legal policies:** Terms, Privacy, returns (with the 18+ line). None are
   approved, so none render.
7. **Persistence:** approve Neon (see `docs/PERSISTENCE_RECOMMENDATION.md`), and
   get counsel's answer on the privacy notice and international transfer under
   the 2025 LFPDPPP — no vendor offers a Mexico region. Orders, drafts and the
   notification outbox are in-memory today.
8. **Email provider** and the internal operations destination (inbox or chat).

**Evidence and content**

9. First real COA or Janoshik report (with its report id), and who checks each
   document against the physical report before approval.
10. Lot receiving process, which lots become public, and whether lot ids are
    printed on labels.
11. Who writes and sources product overviews **and area context**
    (`AREA_OVERVIEWS`, Phase 12.1), and who approves references.
12. P0 photography for RETA, GLOW and GHK-Cu, plus a rendered RETA still.
    0 of 85 products have photographs.
13. Three unlabelled blends (Relaxation PM, SUPER Human Blend, Healthy Hair)
    publish with only name, volume and price.
14. Optional short subtitles for twelve products.
15. **Design Bible vs Phase 11 PDP order.** The Bible orders PDP sections
    Experience → Commerce → Specifications → Documentation; the Phase 11 brief
    put Quality before Specifications, and that is what was built. Confirm, or
    align the Bible.

Visual polish deferred on purpose is tracked in `docs/DEFERRED_POLISH.md`.

## 7. Phase 11 in brief

- **Registries exist and are all empty:** `DOCUMENTS`, `LOTS`, `REFERENCES`,
  `OVERVIEWS`. That is the correct output until real evidence and sources
  arrive — the site shows one deliberate no-evidence statement per product.
- One resolver (`domain/quality`) produces every quality state; evidence never
  widens beyond its presentation or lot; Janoshik needs all five conditions.
- The documentation explorer (`/investigacion/calidad`) 404s in production
  until a public document exists; it renders in development with a notice.
- Content lifecycle classes A–E and statuses; scientific statements cannot
  render without an approved public reference; a forbidden-vocabulary guard
  scans dictionaries.
- Research Hub rebuilt (areas, compound finder, evidence model, reference
  index); area pages gained research and related areas; flagship PDPs gained
  world material studies and an interlude.
- Notifications write to an outbox with a `none` channel; they cannot fail an
  order.
- Gates at commit: `check:quality` 169 assertions, `check:content` 184; build
  214 pages; 0 axe violations on audited surfaces; PDP initial JS ≈193 KB gzip,
  three.js absent from every initial payload.

## 8. Phase 12 in brief

A creative overhaul. Nothing about the trust, commerce or content architecture
changed; what changed is what a customer sees.

- **The specimen plate became a composition.** It was an outlined vial on a
  near-white ground — a wireframe, 85 times. The compound's own name is now set
  oversized and cropped behind the silhouette (the Hero's move at product
  scale), sized from the name's own length so every plate crops alike. One
  component, so cards, the catalogue, area pages and the generic PDP all
  changed at once. A photograph still replaces it entirely.
- **Area tones were raised from 5–8% to 14–20%** and gained `--area-deep`, an
  inverted ground. The eight areas were, in practice, eight identical panels.
- **Three card formats:** `standard`, `feature` (wide, leads a composition) and
  `flagship` (the world's dark ground, neutral action).
- **The homepage's three-row register is gone**, replaced by a horizontal
  compound rail — one product per area, running off the right edge, with a tail
  card carrying the catalogue's real size. Quiet sections renumbered 01–05.
- **Areas are named commercially** (`short`: "Metabolismo") with the research
  framing beside them in mono, and got full mastheads on their own material.
- The catalogue gained an area strip; the generic PDP gained the real plate.
- **Gates at commit:** `check:quality` 169 assertions, `check:content` 184;
  build 214 pages; 0 axe A/AA violations on six audited surfaces at 375–1728;
  no horizontal overflow at 375/768/1280/1440/1728; PDP initial JS 193.1 KB
  gzip (unchanged from Phase 11), three.js absent from every initial payload.

**Two bugs found and fixed during QA, both worth remembering:**

1. `role="group"` on a `<ul>` replaces its implicit list role and orphans every
   `<li>` — a serious axe `listitem` violation. A scroll region and a list must
   be two elements.
2. Inside `[data-world]`, the "inverse" tokens point INTO the dark:
   `--ink-inverse` is `--world-void`. Re-pinning card text to it rendered the
   whole flagship card black on black. A world already re-points
   `--ink-primary`/`-secondary`/`-muted` at measured, AA-clearing mixes, so
   components inside a world should override no text colour at all. Only the
   ACTION needs pinning, to raw paper/charcoal — CONVENTIONS §11.

## 8b. Phase 12.1 in brief — discovery area depth

A targeted extension, not a redesign. The Phase 12 masthead is unchanged; the
depth is added after it. Every area page is now masthead → up to seven
sections, and **each conditional section is the output of a pure function;
a section whose function returns nothing is not rendered, numbered or
announced.**

| Section   | Renders when                                      | Today                             |
| --------- | ------------------------------------------------- | --------------------------------- |
| entry     | `featuredCount(n)` > 0 (≥ 5 compounds)            | 7 of 8 (not Materials)            |
| context   | `publicAreaOverview` resolves a sourced statement | never — `AREA_OVERVIEWS` is empty |
| compounds | always                                            | 8 of 8                            |
| research  | `areaResearch` returns a public reference         | never — `REFERENCES` is empty     |
| evidence  | `publicEvidenceIndex` accepts a record            | never — `DOCUMENTS` is empty      |
| related   | `relatedAreas` finds a shared compound            | 6 of 8 (not Hormonal, Materials)  |
| continue  | always                                            | 8 of 8                            |

- **Entry order is "flagship first, then catalogue order"** (`entryOrder`), and
  the masthead's "Punto de entrada" line now reads the same order — Metabolism
  lists Retatrutide Research · Semaglutide · Tirzepatide (same three names as
  before; RETA now first). No popularity, recommendation or sales language
  exists, and `check:content` bans it from both dictionaries.
- **Evidence may be counted, never aggregated into a verdict.**
  `evidenceCoverage` returns exactly `{records, compounds, presentations}`;
  every ledger row keeps its own presentation or lot and its own states.
  `check:quality` fails if the type gains any other field.
- **Areas may carry sourced context** (`content/areas`) under the product
  overview's own validators; a summary with no sourced statement is not a
  context section.
- Large areas (≥ 8) reuse the catalogue's browser scoped to the area; small
  areas get a plain grid.
- **Gates at commit:** `check:quality` 176 assertions (was 169),
  `check:content` 196 (was 184), new area-derivation block in
  `check:catalog`, new area-section block in `check:output`, each
  negative-controlled. Build 214 pages. 48 area audits (8 areas × 375 / 768 /
  1280 / 1440 / 1728, plus English at 1440): 0 axe A/AA, 0 horizontal
  overflow, 0 sub-44px targets. Area initial JS 190.4 KB gzip (Phase 12: 193.3);
  three.js absent from every initial payload.
- One accessibility bug found and fixed in QA: RETA's seven-step presentation
  ladder overflowed the five-column entry spread into a scroll region no
  keyboard could reach (`scrollable-region-focusable`). In that context the
  ladder now wraps.

## 9. Recommendation for Phase 13 (not approved)

Photography and first evidence together, for RETA, GLOW and GHK-Cu: shoot the
flagships (layouts already accept the media — it is a registry exercise, and
Phase 12 made the fallback good enough that this is no longer urgent), and
ingest the first real COA or Janoshik report for one exact presentation to
exercise the evidence chain end to end. Durable persistence follows once the
vendor and counsel questions are answered.

## 10. Things that do not travel with the repository

- **Conversation history** from earlier sessions (the briefs and reports).
  This file is the substitute.
- **Claude auto-memory** is a local file under `~/.claude` on the owner's Mac.
- **Artifacts** — e.g. the Phase 8 "Discovery Area Review" owner-review page —
  belong to the claude.ai account that published them.
- **claude.ai connectors** (ClickUp, Google Drive, Figma, Canva) are per
  account and must be reconnected.
