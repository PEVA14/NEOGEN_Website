# NEOGEN — Project state and handoff

Last updated **2026-09-20**: **all three flagships ship a real vial, live on
their own homepage sections** (§8u, §8v), **the brand mark is applied across
the site and the rendered labels** (§8x) and
**the checkout pays through Mercado Pago in test mode** (§8t, `docs/PAYMENTS.md`). Production payment is blocked on merchant
eligibility, credentials and the launch blockers in §6 — not on code.
**Atlas is frozen and deferred to V2** (§8m).
The priority is a complete, commercially effective V1 built from what already
exists. The commerce pass (§8n) and the PDP record pass (§8o) are done, and
the V1 audit ledger is in §8p.

This file is the memory of the project for a new session. It records what is
not derivable from the code: where the phases stand, how the owner runs the
work, rules that were only ever given in conversation, confirmed business
facts, and what is still undecided. Architecture lives in
`docs/CONVENTIONS.md`; this file does not repeat it.

Read order for a fresh session: `CLAUDE.md` → this file →
`docs/NEOGEN_DESIGN_BIBLE.md` → `docs/NEOGEN_MVP_SCOPE.md` →
`docs/CONVENTIONS.md`.

### Start here: handoff of 2026-09-20

- **Latest (2026-09-21, later): RETA V4 is live, served as `reta-v7.glb`.**
  A different container — a crimp-top vial, not the wide jar — brought through
  the owner's Blender from a third-party shape, with glass, metal and a UV'd
  2048² label already set up. It ships with its draft label (declared in
  `DEMO_ARTWORK`, blocker §6.6a). GLOW and GHK-Cu are still on the jar until
  the owner re-exports them. `reta-v2.glb` stays the canonical container for
  generic products. `public/models/vial-trial.glb` (the raw Sketchfab shape,
  retagged for comparison) is untracked and can be deleted.
- **RETA V3 (§8z), now superseded by V4.** The new export is live on the product
  page, the homepage and the catalogue card, WITH ITS DRAFT LABEL — the owner
  is designing the packaging and asked to see it in place. That strip reads
  "10 ML · INJECTABLE PEPTIDE ● 99% PURITY · SUBCUTANEOUS USE" and is NOT
  publishable: it is declared in `DEMO_ARTWORK`, printed by `check:media` on
  every run, and listed as launch blocker §6.6a. The replacement path is built
  and tested — two commands in `public/models/README.md`.
- **Education, editorial, FAQ and the research-use gate (§8y).** `/peptidos`, `/investigacion/notas`, `/preguntas`, the RUO notice
  across the journey, and a REQUIRED research-use declaration that blocks order
  creation. Two requested claims were refused for want of evidence —
  certification and 24-hour nationwide delivery; §8y lists what the owner must
  supply for either.
- **The brand mark (§8x) and the studio rigs for GLOW
  and GHK-Cu with the cap at 92% (§8w), committed together as `1fd202d`.** The
  owner's logo files are in `public/branding/`; the mark is now on the header,
  the footer, the favicon, the drawn `SpecimenPlate` and the rendered label of
  every product without artwork of its own. The three flagships' labels are
  printed in Blender and are an export away, not a code change. All four studio
  stills were re-captured under versioned names; what shipped is
  `reta/studio-v3.jpg`, `semaglutide/studio-v5.jpg`, `glow/studio-v2.jpg` and
  `ghk-cu/studio-v2.jpg`. The cap was judged only in headless software
  rendering — see §8w before changing the factor.
- **Flagship vials in their homepage moments (§8v).** GLOW
  and GHK-Cu now show their own vial where the drawn plate was, and both
  catalogue cards were re-captured from the new model. Committed.
- **Second-generation 3D vials (§8u).** RETA V2, GHK-Cu and GLOW are live on
  their product pages and the homepage; the caps read as metal. Committed. One
  thing waits on the owner: the RETA export carries TWO lids and the build
  keeps the narrow one — see §8u.
- **Mercado Pago checkout (§8t).** Committed; STOPPED for
  the owner. Next step is the owner's: create the Mercado Pago application and
  put its TEST credentials in `.env.local` (`docs/PAYMENTS.md` §9–§11), then
  run one test purchase. Homepage review round 2 (§8s) is committed separately
  just before it.
- **Tree.** `main`, clean, at `1fd202d`. Everything through §8x is committed,
  and the owner has PUSHED: `origin/main` is at the same commit. Check
  `git status -sb` rather than trusting this line. Every gate passed; axe and
  overflow were clean on the catalogue, the area pages and the homepage at 375
  and 1440.
- **Where the owner left it (2026-09-18).**
  - The `/productos` storefront (§8q) is **approved and frozen**. Do not
    redesign its layout, hierarchy, filters, area strip, cards or composition.
  - The RETA studio still (§8r) is **approved**. The canonical physical
    container is now `reta-v2.glb` (§8u), which superseded and replaced
    `reta.glb`.
  - The neutral studio prototype (Semaglutide only, §8r) is **"good for now"**.
    It is still not propagated across the catalogue — but GLOW and GHK-Cu now
    have their own studio rigs (§8w), so every flagship can be photographed.
  - The owner moved on to other work. Ask before resuming product media.
- **Homepage pass (§8s) is awaiting the owner's visual review.** Do not
  propagate its direction to other pages until approved.
- **Nothing else is approved to start.** The V1 audit ledger (§8p) lists open
  items. Ask before picking one up.
- **Figma** (claude.ai connector, the owner's account): file
  `QRvGMkkoFPfhEsjQAyPBq4` ("NEOGEN — Web Design"):
  - page `0:1` "01 — Design Exploration": directions A–E, comps, world studies;
  - page `2022:2` "02 — NEOGEN Design System V1": foundations, type, colour,
    tokens, components, world boards.

  The site is now ahead of Figma: the product-object vial and the commerce
  pass are not in the file. Nothing has been written to Figma. Load the
  `figma:figma-use` skill before any `use_figma` call.

- **Design references** live in `references/*.png` (home, catalogue, PDP,
  RETA flagship PDP, cart, checkout, research hub, system status). The owner
  points at them by filename.
- **Dev server.** The owner runs `next dev` on :3000 themselves. Never start a
  second one or kill theirs.
- **Visual QA without the browser pane.** When the pane is hidden its
  screenshots break. Use headless Playwright with system Chrome instead
  (`playwright-core`, `chromium.launch({ channel: "chrome" })`). Full-page
  shots need a scroll walk first so reveal-on-scroll content settles. Axe
  loads from cdnjs. The scripts were session scratch and are gone (§10); they
  are a few lines each to recreate.

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
| `4ab9b9a`   | Phase 12.1 — discovery area depth: data-derived sections after the masthead                                                     |
| `541c61b`   | Catalogue filtering, area index, search field, area design preview (§8c)                                                        |
| `b080cf3`   | Card reveal and homepage commerce layer, first version (§8d)                                                                    |
| `2b80dc7`   | Owner review of §8d: register becomes the presentation matrix; homepage trimmed                                                 |
| `3fe1f7e`   | Flagship shop moved onto the flagship product pages                                                                             |
| _this_      | Homepage hub: the gateway section under the hero (§8e)                                                                          |
| `d1300b1`   | NEOGEN Atlas: questionnaire → retrieval → AI adapter → validated map (§8h)                                                      |
| `d3a9e46`   | Atlas part 1 + homepage index                                                                                                   |
| _this_      | Sourced compound profiles, the research-function axis, and the data-driven questionnaire system (§8i)                           |
| `f6b3249`   | Atlas understands the owner's questionnaire v4: field map, transmission boundary, pins, evidence, relevance (§8k)               |
| `d4b7028`   | Atlas layers: complete typed profile → privacy → advisor policy over projections → engine (§8l)                                 |
| `df4e64f`   | V1 commerce and art-direction pass: product objects, visible commerce, commercial homepage rhythm (§8n)                         |
| `87b0b5d`   | Atlas hidden for V1 by one feature flag: nav, footer and sitemap entries removed (§8m)                                          |
| `5e76e06`   | PDP record pass: record rhythm, alternating grounds, research folded into the profile, swiped related shelves (§8o)             |
| `81ff312`   | The /productos storefront: masthead, area shelf, store card, paging (§8q)                                                       |
| `1ebbc21`   | Storefront follow-ups (§8q) and the product-media studio: RETA still, neutral prototype (§8r)                                   |
| `53ced06` … | Homepage pass and owner review rounds: gateway, RETA, GLOW, GHK-Cu, catalogue directory, area caps, performance (§8s)           |
| `eef099d`   | Mercado Pago checkout: Orders API + Card Payment Brick, webhook HMAC, Postgres adapters, review-before-payment (§8t)            |
| `0bcbaf7`   | Second-generation vials: RETA V2, GHK-Cu, GLOW; model prep and inspection tooling; satin cap metal (§8u)                        |
| `d29af23`   | Flagship vials in their homepage moments; the capture script; the dedup regression (§8v)                                        |
| `1ca7620`   | Product page copy: purchasing waits on the regulatory review, not on a payment processor (§8t, §6)                              |
| `1fd202d`   | Studio rigs for GLOW and GHK-Cu, the cap at 92%, and the brand mark applied across the site and the drawn labels (§8w, §8x)     |
| `2d650d1`   | Documentation caught up with the 3D and product-media work                                                                      |
| `ae3c8af`   | Peptide guide, editorial notes, FAQ, shipping facts, and the blocking research-use declaration (§8y)                            |
| _this_      | RETA V3, with its mock-up label replaced at build time (§8z)                                                                    |

**Current priority (owner, 2026-09-17): V1 completion.** Make NEOGEN V1 as
complete, polished and commercially effective as possible with the
functionality that already exists. Atlas and further Living Laboratory work
are **V2 — frozen, not deleted** (§8m). The V1 audit and completion sequence
were reported in conversation on 2026-09-17. They are recorded in §8p with
the status of each item. The commerce pass (§8n) and the PDP pass (§8o)
closed several P1 items. Everything still open waits for the owner's go.

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
- **RUO label (owner, Q32; SUPERSEDED IN PART, 2026-09-20):** Q32 said the
  research line should be small and not prominent. The later brief asks for the
  condition to be emphasised and for an explicit acknowledgement before
  purchase. Both are satisfied the same way: PRESENCE AND REPETITION AT
  DECISION POINTS, not volume — one wording (`dict.researchUse`), the mono
  register, on the catalogue, the product page, the bag, the footer and every
  editorial page, and a required checkbox at review (§8y). It is never a
  banner, a modal, an error colour or a wall of disclaimer text.
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
2. **Payment processor — merchant eligibility.** The Mercado Pago integration
   is built and works in test mode (§8t), but that says nothing about whether
   Mercado Pago will ACCEPT this catalogue in production. Research done after the Phase 7 questionnaire found
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
   6a. **Draft label artwork on a served model.** `reta-v7.glb` (the V4
   crimp-top) carries a mock-up strip reading "70 MG · INJECTABLE PEPTIDE •
   99% PURITY · SUBCUTANEOUS USE", with a lot number, an expiry, a storage
   instruction and a US flag — routes of administration, evidence nothing
   supports, a strength the catalogue does not sell, an origin nobody stated. Shipped deliberately
   while the owner designs the packaging (§8z) and declared in `DEMO_ARTWORK`,
   which `check:media` prints on every run. Replace before the site is public.
7. **Persistence:** the Postgres adapters are built (§8t); approve and
   provision Neon (see `docs/PERSISTENCE_RECOMMENDATION.md`), and
   get counsel's answer on the privacy notice and international transfer under
   the 2025 LFPDPPP — no vendor offers a Mexico region. Without a
   `DATABASE_URL`, orders and drafts are in memory (test mode only — live
   Mercado Pago refuses to run on it); the notification outbox is in memory
   regardless.
8. **Email provider** and the internal operations destination (inbox or chat).
   8a. **Atlas questionnaire v4 asks for sensitive data** (§8k). None of it leaves
   the browser and none of it is used, but asking still needs counsel on the
   privacy notice and consent for datos sensibles (health, sexual health), and
   the classification review should see the public administration wording
   ("vía de administración", "subcutánea", "tolerancia a inyecciones",
   "duración del protocolo").

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
15. ~~Design Bible vs Phase 11 PDP order.~~ Resolved in §8n. The Bible and
    the build agree: Experience → Commerce → Specifications → Research
    (profile) → Documentation → Related → Materials.

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

## 8c. After Phase 12.1 — filters, catalogue entrance and area preview

Owner request (2026-09-15), not a numbered phase:

- **Faceted filtering on the catalogue and every area page** — search (incl.
  Spanish INNs), area / "also in", classification, product type, format,
  pack size, price range, flagship; sort by index, name A–Z / Z–A, price ↑ / ↓,
  most presentations; grid or register view. State lives in the URL. The
  sidebar can be hidden on desktop ("Ocultar filtros"). The presentation-count
  facet was removed at the owner's request. Availability, documentation and
  photography filters appear automatically once that data exists. All eight
  areas now use the browser.
- **Catalogue entrance** — the one-line area strip became a compact area index
  (swatch, name, count, size gauge; hover wash), and search became a refined
  hairline field with result count, clear and a `/` shortcut. A first, louder
  version (display-size tiles, charcoal search slab with suggestions) was
  rejected by the owner as too big; direction is "elegant first, simplicity
  that shines".
- **Area design preview** at `…/area/<slug>/vista-previa`, development only, so
  the owner can see context, research and evidence before real sources
  exist. Sample data is visibly marked and cannot ship (CONVENTIONS §15).
- Area section surfaces now alternate by rendered position.
- Gates: `check:content` 201 assertions; new filter-engine block in
  `check:catalog`; new preview block in `check:output`; all negative-controlled.
  QA 0 axe / 0 overflow / 0 sub-44px at 375, 768, 1440 on catalogue and area
  pages; preview is a real 404 in production. Initial JS: catalogue 189.8 KB
  gzip (was 186.8), area 193.5 KB (was 190.4).

## 8d. Card reveal and the homepage commerce layer

Owner request (2026-09-15, overnight, autonomous): make catalogue browsing
reveal more per product, and give the homepage "more ecommerce show" without
removing any section. Not a numbered phase.

**Product cards — the reveal.**

- Every standard and flagship card (catalogue, area pages, homepage rail and
  flagships, PDP related/materials) carries a panel that rises over the plate:
  on hover with a fine pointer (120 ms intent delay), on keyboard focus, and on
  touch through a 44 px "+" toggle on the plate's top-right corner (coarse
  pointers only; it is a sibling of the card link, never inside it). Clicks on
  the panel still open the product.
- Content, in priority order, all registry facts built on the server
  (`server/catalog#cardDetails`): an approved overview **summary** (none exist —
  the slot is live, and `publicCopy` refuses scientific or unapproved copy); the
  verbatim **composition** where the source printed one; the full
  **presentation ladder** with each pack's price (capped 5/4/3 rows depending
  on what sits above it); **pack size** and **price per vial** of the cheapest
  pack; **product type** and every public **area**.
- The panel is toned like its plate (`data-area` / `data-world`). The design
  preview (`…/area/metabolica/vista-previa`) now includes a marked sample
  summary so the description variant can be reviewed.

**Homepage commerce layer — trialled, then trimmed by the owner the same day.**
Four moments were added overnight (catalogue ticker, presentation matrix,
price spectrum, flagship shop). Owner review:

- **Ticker** — disliked; hidden. Component parked in `components/storefront`.
- **Presentation matrix** — liked, but belongs in the catalogue: it **replaced
  the register view** (`?vista=registro`) on the catalogue and every area page.
  Aligned by strength when the results hold ≤ 10 solid strengths (every single
  area does), sequential P-01…P-07 otherwise; non-solids in a second table.
  The old `CompoundRow` register list was deleted.
- **Price spectrum** — "cool but not that useful"; removed entirely (component,
  builder, copy, log-axis derivations and their checks).
- **Flagship shop** — not for the homepage; it now renders on the three
  flagship product pages, showing the OTHER two worlds (the page's own
  commerce panel already sells the product it is about). Copy moved to
  `pdp.shop`; the section is numbered with the rest of the PDP spine.
- The homepage is back to its original sections, numbered 01–05. The owner
  called out the research rail (03) and flagship cards (05), both now carrying
  the card reveal, as working well, and liked the dev-only area preview.

Figures go through `domain/storefront` (pure; `check:catalog` drives it with
fixtures and the real registries — negative-controlled). Nothing ranks by
popularity, discounts, estimates stock or states a use.

**Also:** the PDP presentation ladder now wraps on phones instead of scrolling
(axe `scrollable-region-focusable` at 375 px — pre-existing).

**Open:** phone behaviour of the card reveal (the "+" toggle) has not been
tested by the owner yet.

**Gates (after the owner review):** all `npm run check` gates pass; the new
register assertions were negative-controlled. Production QA: 0 axe WCAG 2.2
A/AA violations and no horizontal overflow on `/es` at 375/1440 and on the
register view unfiltered (375/1440), filtered to Metabolismo (1440) and on the
Neurología and Metabolismo area pages (375/1440), with the tables rendered.
Initial JS gzip: home 198.4 KB, catalogue 192.4, area 196.1, PDP 194.2;
three.js absent from every initial payload.

**Flagship shop on the PDPs:** 0 axe violations and no overflow on `/es/productos/reta`
at 375 and 1440 and on the GLOW and GHK-Cu pages at 1440; each page's tabs offer only
the other two worlds; a non-flagship page (Semaglutide) is unchanged. Flagship PDP
initial JS 196.1 KB gzip (was 194.2), three.js still absent.

**Not built, flagged:** the owner's "for research purposes only" line (§4) is
still not rendered anywhere a product is sold, including the parked shop counter.

## 8e. The homepage hub

Owner request (2026-09-15): one new major homepage section under the hero — a
gateway that makes a first visitor understand NEOGEN is more than a catalogue,
without being a grid of nav cards or a mega-menu. Nothing else removed.

- **`components/home/NeogenHub`** — five destinations (Catálogo, Áreas, Mundos,
  Investigación, Calidad) as a switchboard on the hero's own charcoal, with the
  hero's hairline register continued behind it. On a wide screen the five run
  across as a strip of switches with the preview panel beneath them at full
  width (owner feedback, same day — it was first built as a left column with
  the panel beside it); the active switch carries a 2px ink rule and its
  descriptor reads in the panel head. Each switch is the link; hovering or
  focusing one swaps the panel. Header carries the section
  numeral, the title and four counted figures (85 / 147 / 08 / 03).
- **Previews are real data**: four specimen plates (cheapest compound per area,
  in the dark register), the eight areas with counts in their own tones, the
  three world plates with entry prices, the Research Hub's live anchors
  (`#indice`, `#calidad`), and the evidence rule as three numbered columns.
- **A preview fills its frame by composition, not by inflation** (owner
  feedback, same day — the research and quality columns "look like a lot of
  empty space"). A short label cannot fill a 17rem-tall cell by growing: a
  53-character sentence would need display size to wrap five lines. So each
  column is anchored at both edges instead — the research doors are numbered at
  the head, named in the body and signed with an arrow at the foot, and the
  evidence rule hangs its sentence at the floor under an index-scale numeral,
  which is the only honest material available there (its three sentences are
  the whole of its content). Type rose with it over two passes, the owner
  asking for bigger each time: a door's name is ~38px and a rule's sentence
  ~27px at 1440. That is near the ceiling — the panel's body is a fixed 17rem
  and type large enough to overflow it brings back the height jump between
  destinations that §8e exists to prevent, so both sizes are clamped and were
  measured at 1024 (the breakpoint's first pixel) as well as at 1440. Presence
  past that ceiling comes from weight instead: doors and area names at 600 (a
  heading), rule sentences at 500 (the house's supporting weight), area counts
  at 500. Instrument Sans is loaded variable with only `wdth` pinned, so its
  weights are real rather than synthesised; Plex Mono is loaded at 400 and 500
  only, which is the ceiling for anything in the technical register. Area names
  keep `white-space: nowrap` with an ellipsis from the base rule, so the
  heavier setting was checked for truncation at 1440 and 1024, not eyeballed.
  A door's
  hover is a wash rising out of its floor with the arrow stepping forward; the
  underline would fight the wash, so it is dropped at this width.
- **Columns are padded symmetrically and their list pulled back out by that
  padding** (`margin-inline: calc(-1 * var(--space-md))`), so the first
  column's text lands on the panel's content edge and every column is indented
  identically inside its own cell. Padding only `li + li` — the obvious way to
  keep later columns off their separators — leaves the first flush and the rest
  indented, the same text at two different indents. The owner caught it in the
  research doors; the evidence rule had it too.
- **Phone is its own layout**, not the desktop collapsed: no hover exists, so
  each destination is a block with its preview already open, read top to
  bottom; counters become a 2×2 block; areas run full width.
- **Gated destinations**: `server/hub` returns `explorer: null` until a public
  document exists, and a new `check:output` assertion (negative-controlled)
  fails the build if any page links the documentation explorer while it 404s.
- **Each switch carries a drawn mark** (owner, 2026-09-16: "let's make the
  webpage not so minimalistic, add some icons/symbols that react to the hover
  as well"). `components/home/HubMark` — five inline SVGs in the geometric
  language the specimen plate and area board already use, since there is no
  icon system here and the Design Bible never mentions one. They rest at
  opacity 0.16 and go to FULL opacity with a 1.12 scale when the row is
  hovered, focused or active (owner, same day: "make them bigger, and react to
  the hover in a more dramatic way" — they were 2.25rem and 0.14→0.6 before):
  the same recessive-to-present behaviour the section's planned background
  imagery will use, so the two read as one system. Each mark draws the STRUCTURE of its
  destination — the presentation ladder, the eight area dots, three world
  rings, an index spine, and a document tied to one presentation — and each
  animates a part of itself on hover (rungs extend, dots come up in sequence,
  rings draw apart, entries extend, the document-to-presentation link draws).
- **The quality mark is deliberately not a seal, badge, shield or checkmark.**
  That section's own copy is "donde no existe un documento, no aparece un
  sello", and a tick there would manufacture exactly the certification signal
  the site refuses to imply. It draws the RELATIONSHIP instead: one document,
  one presentation, joined.
- **The mark is absolutely positioned, never a grid child.** `.rowLink` is a
  grid whose children are placed by column; a sixth child pushes the index out
  of its cell in every row. It sits in the empty bottom-right corner on the
  desktop strip and moves to the row's head on a phone, where the descriptor
  wraps across that corner and the action line is permanently visible.
  Verified by measuring TEXT ink (a Range), not element boxes: a `.rowName`
  box spans its whole column and reports a false overlap at every width.
- **Two bugs the owner caught in the enlarged marks, both fixed.**
  - _Áreas clipped._ The dots swell to 1.55 on hover and the STROKE scales with
    them, so a dot centred at 29 reached 32.95 against a 32-unit viewBox and
    was cut against the edge. The grid is now inset to cx 7/13.5/20/26.5,
    peaking at 30.45. The other four marks were checked the same way and clear
    it: catalog 29.35, worlds 31.75, research 30.55, quality 29.11.
  - _The research action collided with its mark._ "Ir a NEOGEN Research →" was
    182px of ink where every other label is 95–127px; with the row's padding it
    ended 198px in, and at 1280 the row is 240px wide. No mark above ~26px fits
    beside it, and no corner escapes it either — a 56px mark occupies half of a
    120px row whatever its anchor. The owner chose to shorten the label over
    wrapping it or shrinking the mark, so the action is now "NEOGEN Research"
    in both dictionaries (143px). **Measured clearance, rows lit: +33px at 1440,
    +2px at 1280.** That is clearance, not comfort — a longer action label on
    ANY row reopens this, so check the gap before lengthening one.
- **Two phone constraints that are easy to re-break.** The mark does NOT scale
  there: the scale is a pointer affordance, there is no pointer on touch, and
  the first row is active by default — so the growth applied anyway and pushed
  a full-opacity mark into the descriptor's first line. And `.rowDescriptor`
  is padded clear of the mark's COLUMN (6rem), not merely of its current
  height; padding sized to the mark's width alone still leaves a band where a
  wrapped line runs underneath it. Measured clearance after the fix: 10–32px
  between the descriptor's ink and the mark's left edge, active row included.
- Homepage sections renumbered 01–06; the hub is 01.

**Gates:** all `npm run check` gates pass. Production QA: 0 axe WCAG 2.2 A/AA
violations, no horizontal overflow, no sub-44 px targets on `/es` at 375, 768
and 1440 and `/en` at 1440; the preview panel follows keyboard focus through
all five rows. Homepage initial JS 192.2 KB gzip (198.4 before this pass — the
price spectrum's removal outweighs the hub), catalogue 193.8; three.js still
absent from every initial payload.

**A cascade trap worth remembering:** the wide-screen rules were first written
above the base rules they modify. A media query does not raise specificity, so
the base `.rowLink` won and every option name broke one letter per line. The
`min-width: 64rem` blocks now sit at the end of the stylesheet (CONVENTIONS
§16).

**One bug found and fixed in QA:** the preview panel was `aria-hidden` with
focusable links inside it (axe `aria-hidden-focus`). The panel is the wide
screen's real preview, so the fix was to remove the attribute — the phone's
inline copies are `display: none` at that width, so nothing is announced twice.

## 8f. The RETA vial became a turntable

Owner request (2026-09-16), about the homepage RETA section: "my idea has
always been for the vial to be small and rotating in the middle, with it being
FULLY responsive to the mouse — if the mouse hovers on the left and goes to the
right, the bottle spins a full circle." Reference: the framed, contained vial
in `references/neogen-home-v1.png`.

- **The four-state camera move is gone.** `choreography.ts`'s `FULL` and
  `COMPACT` tracks used to travel: a reveal, a hard crop into the shoulder and
  neck, a reframe, a resolve. Both are now a single held pose repeated across
  every stop — centred, `scale 0.66` (desktop) / `0.52` (compact), the ~-15°
  diagonal preserved. **The two are mutually exclusive:** an object that
  travels and crops cannot also be one the cursor turns, because scroll and
  pointer end up fighting for the same axis.
- **The cursor drives an accumulated turn**, not an angle. `PointerState` gained
  `turn`, summed from horizontal travel in `RetaStage` at 2π per stage width;
  `VialModel`'s new `sequence` branch damps it in (`TURN_SETTLE 6`) on top of
  the passive spin. Accumulating rather than mapping position is what lets the
  vial KEEP the angle it reached — an absolute mapping unwinds the object
  backwards the moment the cursor leaves, which is not what was asked for.
- **Listeners sit on the pinned viewport, not the track** (the track is three
  viewports tall, so most of it is nowhere near the object), and are gated on
  `useFinePointer` and `!reducedMotion`. Touch keeps the passive turn only.
- **The backdrop's light pool was re-centred** (`GLOW_CENTRE`), since it existed
  to sit behind a subject that used to travel. Only the `full` scope reads it,
  and only this sequence uses that scope, so the hero and PDP are untouched.
- Scroll still drives the copy beats and the rim's breathing. Nothing was
  removed from the copy.

**Measured, not assumed** (1440×900, dev): one traverse of the stage = **0.998
turns**; passive spin **0.0852 rad/s** against the 0.085 constant; **0.009 rad**
residual two seconds after the cursor leaves, i.e. the angle is kept and does
not unwind; vial occupies **38.6% of canvas height / 21.5% of width**, centred
at **50.2% × 49.6%**. Regression: the hero holds its own track (68.9% height,
centred 68.2%) and the PDP presenter still answers a full-stage sweep with
**0.138 rad** — its ~8° cap — versus the sequence's 6.27.

**Then the PDP was brought to parity** (owner, same day): "I really like the
responsiveness of the reta showcase in the home page now, make it so the
/productos/reta one behaves the same way." `ProductStage` now accumulates
`turn` exactly as `RetaStage` does, and the presenter branch damps it in where
the ±8° absolute yaw used to be — `POINTER_YAW` is deleted. Pitch and parallax
stay at vitrine amplitude and still release on exit: they are depth cues on
other axes and never compete with the turn. **The 0.138 rad figure above is
therefore historical**, kept because it is the measurement that proved the
stages were independent before they were deliberately joined.

**Verification note.** R3F keeps its store in React context, so the scene
cannot be read from outside the Canvas. These numbers came from a temporary
dev-only handle that published the R3F state on `window`; **it was removed
before committing.** Re-add it the same way if this ever needs measuring again
— screenshots cannot show rotation over time.

## 8g. Area information — built, rejected, removed

Owner request (2026-09-16): "add some info about each category… make the
investigation yourself", with a competitor page as the example of the info
(purity %, published-COA counts, mechanism lines incl. weight loss).

- **What cannot be written, and was not:** purity figures and COA counts are
  fabricated evidence, not a sourcing gap. Mechanism/pathway claims about
  regulated products are exactly what `content/areas` gates — `AreaOverview`
  themes and pathways are `SourcedStatement`s needing approved reference ids.
  `AREA_OVERVIEWS` stays `{}` and the `context` section stays absent until real
  sources exist. The owner agreed ("skip the pharmacology").
- **What was built instead** (`c22cea3`): a "What this area holds" section
  above the entry compounds — six registry-counted figures (compounds,
  presentations, dosing forms, flagships, shared, sellable) with fixtures and
  a negative control in `check:catalog`.
- **The owner disliked it on sight and it was reverted** ("I don't like this,
  remove it"). The revert is a separate commit, so the implementation is
  recoverable from `c22cea3` if a different presentation is ever wanted.

**Takeaway for next time:** a register of counted figures is not what the owner
means by "info about each category" — the reference shows editorial,
explanatory content. That content needs approved sources first; propose the
sourcing route rather than a figures substitute.

## 8h. NEOGEN Atlas — the personal advisor

Owner request (2026-09-16): NEOGEN's version of EXOMA's "Asesor-IA". First
version committed at `d1300b1`. Second pass the same day, on owner feedback:
a personal, consumer-facing questionnaire and result, with the recommendation
policy isolated from the rest of the system (uncommitted at time of writing).

**Routes.** `/[locale]/atlas`, `POST /api/atlas`. Linked from the primary nav,
the footer, the sitemap and a band in the homepage hub.

**Architecture.**

    questionnaire config → answers → profileFromAnswers (by ROLE) →
    applyAtlasPolicy → selection signals, constraints, narrative signals,
    presentation signals → retrieval → (model | deterministic plan) →
    validation against the constraints → AtlasResultView → UI

- The questionnaire itself is CONTENT, not code — see §8i.
- `domain/atlas/policy.ts` — THE ONLY PLACE that decides what an answer may
  influence (`ATLAS_POLICY`: selection / ranking / explanation / presentation),
  keyed by ROLE rather than by question, and turns answers into weights, sizes
  and rules. `check:atlas` fails if
  retrieval, plan, composer, validator, prompt, assembly or the result UI read
  the profile, or if the UI imports a recommendation module.
- `retrieval.ts` reads selection signals; `plan.ts` is the no-model plan and
  the budget-feasibility rule; `validate.ts` enforces the constraints (start
  count, start set inside the cap when feasible, named products present, topics
  covered, supplies only in "more") plus the content screens; `compose.ts`
  writes the fallback from narrative signals.
- Result: personal header (name, returning customer), "what we understood
  about you", Start here / Also for you / Supplies with the suggested
  presentation and add-to-bag (behind `bagEnabled()`), budget meters, map and
  topics (open by default for "detailed"), next steps, tips, documentation, and
  a ledger showing every answer and what Atlas did with it.

**The boundary (policy.ts).** Health, body, medication and dosing are not
asked. The free note invites goals in the visitor's words; if it carries
health detail it is discarded whole before retrieval or any model call, the
ledger says so, and every other answer keeps its full influence (asserted in
`check:atlas`). The name is presentation-only and never sent to the model. No
answer selects a product by what it does to a body; selection uses registry
facts only (areas, overlap, signature line, documentation, presentations,
prices, availability). The model cannot state effects, suitability to a
person, figures or dosing; the validator refuses them.

**Environment.** `ANTHROPIC_API_KEY` enables generation; optional
`NEOGEN_ADVISOR_MODEL` (default `claude-opus-5`) and `NEOGEN_ADVISOR_EFFORT`
(default `medium`). No key: labelled development composition in development,
labelled catalogue selection in production.

**Cost.** ≈2–2.5k input tokens (≈1.1k cacheable system) and ≈1.5–3.5k output
including thinking — roughly US$0.06–0.10 per selection at Opus 5 list price; a
correction retry can double it. Rate limit 8 / 10 min per IP, in memory.

**Not verified:** a live generation — no key exists locally. The adapter is
proven offline only. Availability data is empty (`AVAILABILITY = {}`), so the
timing answer has no effect on ranking until the owner records stock.

## 8i. Sourced compound profiles, research functions, and the questionnaire system

Three connected pieces, 2026-09-16/17, all uncommitted-then-committed together.

### Sourced compound profiles — awaiting owner review

The owner asked for specific, researcher-facing descriptions of what each
compound does. Written for RETA (retatrutide), GHK-Cu, BPC-157, TB-500 and the
GLOW blend, with **10 references** whose metadata and every quoted figure were
read from the source's abstract via Europe PMC (NEJM, Lancet, Cell Metabolism,
a 2025 systematic review, a 2026 rat tendon study, and reviews for GHK and
thymosin β4).

- Content: `src/content/overview/registry.ts`, `src/content/references/registry.ts`.
- **Nothing renders yet.** Both registries are gated by one switch:
  `BATCH_1_FLAGSHIP_PROFILES` in `src/content/review.ts`, set to
  `"owner-review"`. Flipping it to `"approved"` publishes the batch — the PDP
  overview section, the citation rails, the Research Hub index, the Atlas
  result cards and the research-function question all light up together.
  **That approval is the owner's, not Claude's** (a permission prompt blocked
  even a temporary local flip, correctly).
- Statements report mechanism, model (cell / animal / human trial), published
  figures, reported adverse events AND the evidence limits the sources state
  (e.g. a 2026 review finding musculoskeletal claims unsubstantiated in
  humans). No dosing; `check:content` enforces the vocabulary.

### The research-function axis

`src/content/functions.ts` is a vocabulary of nine research functions
(receptors, pathways, tissue processes). A product is tagged with one only from
inside its own overview, pointing at a sourced statement: `publicFunctions()`
returns a tag **only while that statement is public**, so a function can never
appear before its source. Atlas offers the function question only when at
least one compound carries an approved tag, and a chosen function retrieves its
compounds regardless of the visitor's chosen areas.

**Boundary, raised three times and held:** the owner asked for goal-shaped
options ("losing weight", "gaining muscle", "less appetite", "better sleep") on
the grounds that visitors do not know what to research. Declined each time —
matching a person's desired outcome to an unapproved compound is individual
drug selection. What was built instead names what the literature studied.
`check:content` fails on personal-outcome wording anywhere in the questionnaire
content. See also the `atlas-no-health-intake` memory.

### The questionnaire is data now (owner request)

Owner brief (2026-09-17): build the questionnaire SYSTEM, keep the questionnaire
CONTENT separate and editable by the owner, without touching Atlas components.

- **Edit questions here:** `src/content/atlas/questionnaire.ts`. Full guide:
  **`docs/ATLAS_QUESTIONNAIRE.md`**.
- **System:** `src/domain/atlas/questionnaire/` — `types.ts` (schema),
  `view.ts` (resolved, localised, registries read), `index.ts` (engine: view
  building, conditional visibility, validation, answers → roles by
  `ROLE_DEFAULTS`). `src/components/atlas/QuestionField.tsx` renders one
  question per kind; `AtlasExperience.tsx` renders groups as steps and knows no
  question.
- **Kinds:** single-select, multi-select (cards / pills / ranked tiles /
  registry search), toggle, number, range, short text, long text, with
  conditional questions and conditional groups, required/optional, and
  per-question `role`, `recap` and `shortLabel`.
- **Ids vs labels:** answers are `{ questionId: value }` with option ids;
  labels are bilingual content. Rewriting a label is free; changing an id is a
  data change and `version` should be bumped (it keys the session draft).
- **Policy is now keyed by ROLE, not by question** (`ATLAS_POLICY`), so the
  questionnaire can change shape without touching the advisor. `profileFromAnswers`
  maps answers by role; a role no question fills falls back to a documented
  default. The budget role reads an option's numeric `value` OR a number
  answer, so tiers can become a slider with no code change.
- **Result UI is structured-data-driven:** `recap` and `ledger` entries carry
  their own label, answer, uses and withholding, so a new question appears in
  both with no component change.
- **The dictionaries no longer hold questions** — only chrome (`atlas.field`,
  controls, progress, generating, error, result). The homepage Atlas band reads
  its step names from the questionnaire's groups.
- **Verified:** all gates pass; both locales; 375px and 1280px with 0 axe A/AA
  violations, no overflow and no undersized targets on all four steps and the
  result; the API rejects unknown questions, unknown options, over-limit text,
  too many selections and answers to hidden questions (400); a health note is
  still discarded whole with the ledger saying so. Negative control: a
  duplicate role plus a forward-referencing condition fails `check:atlas`.
- **Not verified:** a live model generation (no key locally), and the `number`
  and `range` kinds are proven by fixtures rather than by a shipped question.

## 8j. Sourced profiles across the catalogue (batches 1-5)

The owner asked for compound profiles area by area. Five batches, each drafted
the same way — every reference's metadata and every quoted figure read from the
source's own abstract via Europe PMC — and each gated by one switch in
`src/content/review.ts`:

| Batch | Scope                                                            | Status           |
| ----- | ---------------------------------------------------------------- | ---------------- |
| 1     | RETA, GHK-Cu, BPC-157, TB-500, GLOW                              | approved         |
| 2     | tirzepatide, semaglutide                                         | approved         |
| 3     | the rest of the metabolic line (10 compounds)                    | approved         |
| 4     | the recovery area (9 compounds)                                  | **owner-review** |
| 5     | growth, hormonal, longevity, neuro, skin, unfiled (36 compounds) | **owner-review** |

**62 of 85 products** have a profile written; **74 references** in the
registry; **35 research functions**, each one grouped.

**What has no profile, and why** — the list is deliberate, not unfinished:

- **No source that names the product and reports a finding for it**: HMG,
  Follistatin 344, Gonadorelin, DSIP, SNAP-8, Adamax (both), PE 22-28 (its
  literature is about spadin, a longer peptide, and the relationship needs its
  own source).
- **Single-group review literature only**, nothing establishing a finding for
  the individual tripeptide: Vesugen, Cartalax, Cardiogen, Cortagen, Crystagen,
  Pinealon. Epithalon is the one exception, and its profile says in as many
  words that its only source is a narrative review.
- **Blends with no published study**, and mostly no declared composition:
  Relaxation PM, SUPER Human Blend, Healthy Hair Skin Nails Blend, Lipo-C
  (both), Lemon Bottle.
- **Supplies, not compounds**: the three waters.

**House style for a profile.** Mechanism, then what the source found, then the
model it came from, then the limits the source itself states. Four of the
metabolic compounds and most of the neuro line are preclinical only and each
says so in a technical note. Unflattering findings stay in: ETASS's confidence
interval crosses 1; adipotide's monkey study reports reversible kidney tubule
changes; AHK-Cu's apoptosis result missed significance; Melanotan II's only
source is a case report of an adverse finding.

**The vocabulary guard gained a second mode** while writing batch 4: stems that
match inside a word (so "inyec" catches inyectar and inyección) and words that
match only whole (so sarcoidosis, ciclosporina and "al día siguiente" pass).
`check:content` proves both directions. It still refuses real dosing language,
and three batch-5 sentences were reworded rather than the guard loosened —
"frecuencia de pulsos" became "número de pulsos por hora", "ciclo día-noche"
became "ritmo día-noche".

**The reference index has its own route.** Approving batches 4 and 5 put all
74 records on the Research Hub and made it 24,000px tall on desktop, 43,500px
on a phone. The hub now shows the six most recent and links
`/investigacion/referencias`, which lists every source grouped by year with the
compounds that cite it — the derivation read from the other end. The route is
gated the same way the documentation explorer is: `generateStaticParams` emits
it only while a public reference is cited, so with an empty registry it is a
real 404 and nothing links it. `check:output` asserts both directions.

**The Atlas function question is grouped** (metabolism, tissue and repair,
nervous and endocrine, immunity, cell biology) because 35 flat checkboxes had
stopped being readable. Content declares the groups; the renderer partitions on
them in arrival order.

## 8k. Atlas understands the owner's questionnaire (v4)

**Architecture superseded by §8l** (complete profile + policy projections).
The classification and transmission outcomes below still hold.

**The owner rewrote the questionnaire** (`src/content/atlas/questionnaire.ts`,
version 4, from their Questionnaire.docx) and asked that it be treated as
owner-authored: **do not rewrite, sanitize, rename or remove its questions or
answers.** It now asks a goal and a goal-specific follow-up, body data, peptide
experience, route/duration/injection tolerance, health conditions and
medications, lifestyle, and free-text frustrations, 90-day goal and injuries.
The owner asked for the policy boundary to be kept for inputs Atlas will not
use, with those inputs represented and marked, not removed.

**What was built.**

- `src/domain/atlas/fields.ts` — the one file that names question ids. Binds
  each question to a profile field, gives each field its permitted uses
  (discovery / research-context / personalization / filtering / recap /
  presentation) or its withholding reason, and translates option ids
  (`GOAL_AREAS`, `EXPERIENCE_LEVELS`). Per-question `role` is gone from the
  schema; the owner's file never needs one.
- `src/domain/atlas/profile.ts` — answers → `AtlasProfile` in the pipeline's
  own terms. Withheld fields appear by name and reason with **no value slot**.
  Defaults are marked `default`, and neither the prompt nor the composer
  describes a default as the visitor's choice.
- **Withheld means never sent.** The browser posts only transmittable answers,
  the route strips again and validates `transmittedView`; the ledger and recap
  are built in the browser, which is the only place the withheld answers are.
- Result products carry `source`, structured `reasons`, `evidence` (approved
  statement ids resolved to text and references from `content/overview`) and
  a deterministic `relevance`. `policyPins()` is the seam for a future policy
  that names specific products; pins travel through retrieval, the prompt, the
  validator (`missing_pinned`) and the card. The model may cite a product's own
  statement ids (`unknown_evidence` otherwise) and writes no fact.

**The classification, and why.**

| Used                 | As                                                                                                                                                      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `goal`               | its catalogue area (the menu's own section); the model gets the area id, never the goal's words. `daily-wellbeing` has no single area → whole catalogue |
| `peptide-experience` | catalogue complexity: how many to start with, single compounds first                                                                                    |
| `additional-notes`   | model context, after the health screen                                                                                                                  |

Everything else is withheld: the goal follow-ups (personal outcome — recap
only), body data, route/duration/injection tolerance (administration), health
conditions/medications/injuries (health), lifestyle, frustrations/90-day
goal/main priority (personal outcome), previous compounds (use history). The
line is the one `atlas-no-health-intake` recorded: Atlas does not select a
compound from a person's health, body or a specific personal outcome. Mapping
the goal to its catalogue section is the same granularity the old topic
question had.

**The two questionnaire checks changed meaning, not strength.** `check:content`
used to fail if the questionnaire ASKED about outcomes or used dosing words;
the owner now asks, so it fails if such a question is BOUND to a decision field
(the goal is allowed only as a translated option id). `check:atlas` sweeps
every withheld question through every option and canary text and proves the
policy, retrieval, plan and the model's exact prompt do not change. Three
deliberate mutations (a health field made a discovery input, a follow-up leaked
into the profile, the browser sending everything) each failed the gates.

**Left for the owner.**

- The owner's file has a TODO for a derived BMI display; not built (it is a
  body-data computation, and the schema has no derived kind).
- `goal` has no `shortLabel`, so its recap chip reads the full question.
- The owner's file is not Prettier-formatted; left exactly as authored.
  `format:check` is not part of `npm run check`.
- Privacy/regulatory item 8a in §6.

## 8l. Atlas layers: complete profile, privacy, policy, engine

**Owner correction to §8k.** The USE/HOLD reading was not the intended final
architecture. Atlas is a configurable questionnaire and advisor platform:
`AtlasProfile` must represent the COMPLETE answered questionnaire, typed,
including fields the current advisor does not use; policy decides what a
particular advisor receives. The current restricted behaviour stays, as one
policy implementation. No new medical rule, no production AI provider.

**The layers.**

1. Collection — `content/atlas/questionnaire.ts` (owner; untouched).
2. Representation — `domain/atlas/fields.ts` declares every field's kind,
   category and **sensitivity** (standard / personal / sensitive), with no
   permission in it; `profile.ts` builds `AtlasProfile` with an entry per field
   (`answer` / `unanswered` / `not-asked` / `not-received`) and keeps answers to
   unbound questions in `unbound`.
3. Transmission — `domain/atlas/privacy.ts`, per field: device-only, or sent
   with a written basis. Unchanged in effect: only `goal`, `experience` and the
   note leave the browser. The server builds the same profile type with
   device-only fields marked `not-received`.
   4–7. Permissions — `policy.ts` defines `AtlasAdvisorPolicy` and five
   independent permissions (candidate-selection, retrieval, ai-context, recap,
   presentation). `applyAtlasPolicy` hands a policy one projection per
   permission, never the profile, and refuses an AI context with an ungranted
   field. `policies/restricted.ts` is today's advisor; `ACTIVE_ATLAS_POLICY`
   in `policies/index.ts` selects it.
4. Engine — `engine.ts` defines `AtlasAdvisorEngine`; the composer and the
   model (`server/atlas/engines/model.ts`) implement it. Input: the AI-context
   projection (with category and sensitivity per field), the policy's signals,
   constraints, and specific candidate product ids with approved facts and
   evidence ids.

**Behaviour change, deliberate:** under the restricted policy the goal now
selects candidates but is no longer in the model's context (previously the
model got the derived area id labelled as the visitor's answer); the model is
told the selection's catalogue areas as a fact about the candidates. Retrieval
results are identical to §8k in every test profile. The result records the
policy (with its permission table) and the engine; the browser's ledger
describes that recorded policy. The discarded-note notice no longer claims
"all your other answers were used".

**To add a policy later:** a new object in `policies/`, one line in
`ACTIVE_ATLAS_POLICY`. If it needs a device-only (sensitive) field on the
server, `privacy.ts` changes too, with a basis — `check:atlas` flags the gap
(`unreachableGrants`) until it does, and §6 item 8a applies. The
questionnaire, profile, retrieval, engines and result UI do not change.

**Checks:** `check:atlas` proves the complete profile (every answer typed,
sensitive included), projection purity, the leak sweep from the COMPLETE device
profile (so it tests the policy alone), separate selection/AI-context grants,
and two fixture policies (a wider context grant; a policy that smuggles a
field, refused). Three mutations (granting conditions to the model, a
projection that ignores permissions, transmitting conditions) each fail it.

## 8m. V1 scope: what is frozen and deferred to V2

**Owner decision, 2026-09-17.** Atlas is deferred to V2. Freeze it in its
current state (`d4b7028`) and take it off the V1 critical path. Do not delete
or redesign it.

**Frozen for V2 — keep the code, do not extend it:**

- **NEOGEN Atlas**, whole: questionnaire v4 (owner content), profile / privacy /
  policy / engine layers, `/atlas`, `/api/atlas`, `check:atlas`, and the
  advisor adapter (no production AI provider connected). Open items that travel
  with it: §6 item 8a (sensitive-data consent, public administration wording),
  the sexual-health → Hormonal mapping, the owner's BMI TODO.
- **Advanced Living Laboratory work beyond what ships today**: 3D models for
  GLOW and GHK-Cu, macro visuals, new scroll-driven storytelling, new
  Experience-mode moments. The existing RETA 3D vial, the world moments and the
  flagship pages ship as they are.

**Done (2026-09-18):** `src/config/features.ts` holds `atlas: false`. With it
off, Atlas has no header link, no footer link and no sitemap entry, and its
page is `noindex`; the homepage hub card was already removed in §8n. `/atlas`
still renders for anyone who types the URL, so the frozen work can be
reviewed, and `check:atlas` keeps proving it. Re-enabling it is that one
line.

## 8n. V1 commerce and art-direction pass

**Owner direction (2026-09-18):** "The UI stays quiet. The products get loud."
Keep the Design Bible identity (black/cream, zero radius, Instrument Sans /
IBM Plex Mono, Quiet/Experience, the three worlds), but make NEOGEN
unmistakably a premium store: products as physical objects, visible price and
presentation, abundant catalogue, flagship colour as interruptions,
Experience moments resolving into commerce, science supporting rather than
dominating, and mobile designed for shopping. EXOMA is a functional benchmark
only. The Bible now has a **Commerce Principles** section; follow it.

**What changed**

- **The product object** (`components/ui/SpecimenPlate`) replaces the
  specimen diagram everywhere: cards, product pages, bag lines, area entries
  and the 3D fallbacks.
  - It is the NEOGEN vial drawn from `reta.glb`'s proportions on a studio
    sweep, with the packaging identity on the label (mark, registry name,
    presentation range).
  - Contents come from the data: powder for mg/IU, liquid for ml.
  - The area colour appears as the label stripe.
  - Flagships get dark world stages: RETA blue, a GLOW amber bloom, a GHK-Cu
    copper cap and collar.
  - It is vector art direction, not photography. A registered photo still
    replaces it.
  - `VialSilhouette` was deleted.
- **Cards** are full-bleed with a larger name and price. On phones they
  compact themselves by container query.
- **Homepage** order:
  1. Hero
  2. Flagships (a swipe row on phones)
  3. Catalogue shelf (count, shop by area, entry product per area)
  4. RETA → commerce
  5. Areas
  6. GLOW → commerce
  7. Evidence band (counted)
  8. GHK-Cu → commerce

  Removed from the homepage: the hub (including its Atlas card), "Evolución
  creativa", and the four-row documentation wall. The components remain.

- **Experience moments** end in `MomentCommerce`: name, range, price and one
  paper-on-dark action. GLOW and GHK-Cu show their own vials where "Medio /
  Muestra pendiente" used to be.
- **RETA scene fix:** the overlay rows are now `minmax(0,1fr)`. With plain
  `1fr` rows the overlay grew to 974px in a 900px pin.
- **Product page**
  - Order: product → specs → profile → research → documentation → related.
  - Documentation with no public document is one statement, not the chain.
  - The buy box shows the pack ("5 mg × 10 viales"), and the bag line
    carries it.
  - The "Medio de producto" captions are gone.
  - Flagship pages pass their own world and name to the fallback. GLOW had
    been showing a RETA label.
  - On mobile: a square plate, and a sticky buy dock once the buy box
    scrolls away (only while the bag is enabled).
- **Catalogue on mobile:** a two-up grid, and a one-line toolbar (the
  register view toggle is desktop only).

**Measured.** axe WCAG A/AA: 0 violations, and horizontal overflow: 0, on 10
routes × 375/1440, ES and EN. Heights: mobile catalogue 55,900 → 20,900px;
homepage 12,600 → 10,900px on desktop and 16,000 → 11,400px on mobile; RETA
product page 15,800 → 9,800px on desktop.

**Deliberately not done here:** Atlas nav/footer links (V2 flag, §8m) and all
P0 backend (payments, persistence, shipping, policies). The research-use line
is still unrendered pending approval. Real photography remains the owner's
item; drop files per `public/images/README.md` and they win automatically.

## 8o. PDP record pass (from `references/neogen-pdp-v1-desktop.png`)

The owner pointed at the reference's lower half: everything below the buy
box. What was taken, and what was deliberately not:

- **Record rhythm.** Below the buy box, the page reads as one document.
  `Section rhythm="record"` uses the new `--section-pad-record` token, and
  `SectionHeader scale="record"` gives a 3xl title and a closer gap. The spine
  stays: rule, index, condensed caps.
- **Alternating grounds.** The page alternates stone and paper by rendered
  position (`ground()` in the PDP), so every section boundary is visible with
  no rule or box. `SpecTable` gets its own paper ground so the stripe reads on
  stone.
- **Research folded into the profile.** With a sourced profile (most
  products), the citation rail and the "continue by area" routes sit inside
  it, and the hub link becomes its header action. The standalone research
  section now renders only for products without a profile. It had been one
  area link under a display heading.
- **Documentation at full measure.** The empty quality plate spans the
  section, with the statement beside its explanation.
- **Related before materials; no stagger.** The cards sit in one even row. On
  a phone both shelves are swiped rows, the homepage flagship pattern with
  `scroll-px` so snapping keeps the gutter; the homepage row got the same fix.

**Not taken.** The reference's placeholder document cards (a COA, lot report
and storage protocol with dummy filenames), and its stock research imagery.
Both would present documents and imagery that do not exist.

**Measured.** Mobile BPC-157: about 10,300 → 7,300px.

## 8p. V1 audit ledger (audit of 2026-09-17, status as of 2026-09-18)

This is the audit reported in conversation after Atlas was deferred. It walks
the full customer path on desktop and phone in the production build, in ES
and EN. Headline: **V1 cannot take a paid order yet.** Every blocker is a
missing business decision or an unbuilt backend piece, not the storefront.
File paths are where each fix lands.

### P0: required for a working V1 (mostly owner decisions)

| #   | Finding                                                                                                                                                                                                                     | Smallest fix                                                                                                                                                                                       | Status                                                                                                                         |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 1   | No way to get paid. The only provider is `none`, so checkout ends with "no se realizó ningún cargo" (`src/payments/index.ts`, `checkout/pago`).                                                                             | Manual SPEI transfer, using the payment-instructions display that already exists. The order waits in "awaiting payment" until the owner confirms. Needs the owner's OK plus CLABE and beneficiary. | Open, needs a decision                                                                                                         |
| 2   | Orders are in memory and lost on restart. Emails are queued and never sent, although the customer is promised a receipt (`server/persistence.ts`, `server/notifications.ts`).                                               | Approve Neon (`PERSISTENCE_RECOMMENDATION.md`) and an email provider, then plug them into the existing slots. The owner's inbox is the V1 back office.                                             | Open, needs a decision                                                                                                         |
| 3   | Orders under MX$10,000 outside Guadalajara and Durango stop at delivery with "no hay tarifa de envío definida", after the customer has typed their address (`siteConfig.tbd.shippingRates`, `domain/checkout/delivery.ts`). | The owner sets a national rate and a priority-city rate: a config value plus a small change to the delivery step.                                                                                  | Open, needs a decision                                                                                                         |
| 4   | No terms, privacy notice or returns policy. All 7 policies are drafts that 404, and checkout collects personal data with no notice (`content/policies.ts`).                                                                 | Counsel's text, then set each policy to approved. The routes and the acceptance step switch on automatically.                                                                                      | Open, needs counsel                                                                                                            |
| 5   | The research-use line appears nowhere (owner rule Q32). It is tied to the unapproved `research-use` policy.                                                                                                                 | Approve the wording, then render it in the buy box, bag and footer.                                                                                                                                | Open, needs a decision                                                                                                         |
| 6   | Tax copy contradicts itself: the bag says "IVA incluido", checkout says it will be included once confirmed. Prices are still provisional.                                                                                   | Final prices including IVA, then one line everywhere.                                                                                                                                              | Open, needs a decision                                                                                                         |
| 7   | Cold chain undecided, and the delivery step says so publicly.                                                                                                                                                               | The owner decides; remove the line either way.                                                                                                                                                     | Open, needs a decision                                                                                                         |
| 8   | Classification review still open. PDPs show human trial results next to Add to bag: sourced, but on a shop it reads as efficacy marketing.                                                                                  | No code change. The reviewer must see it.                                                                                                                                                          | Open, regulatory                                                                                                               |
| 9   | Atlas was public.                                                                                                                                                                                                           | V1 flag, `src/config/features.ts`.                                                                                                                                                                 | **Done** `87b0b5d`. `/atlas` still renders (noindex) for review. The audit had proposed a real 404; the owner chose hide-only. |
| 10  | Production config: the commerce switch, site URL and domain are build-time.                                                                                                                                                 | A deploy checklist.                                                                                                                                                                                | Open                                                                                                                           |

### P1: code-only improvements

| #   | Finding                                                                                                                                                                              | Status                                                                                                                                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Placeholder or internal wording on public pages.                                                                                                                                     | **Mostly done** (§8n): the moment media labels and product-image captions are gone. Remaining: the checkout lede "Cada importe se calcula en el servidor…" (`es.ts` ~l.1218) and the colonia explanation. The `home.evolution` ("Evolución creativa") dictionary entry is no longer rendered and could be deleted. |
| 2   | The price did not say it was for 10 vials.                                                                                                                                           | **Done** (§8n): the pack shows in the buy box and on bag lines.                                                                                                                                                                                                                                                    |
| 3   | The quality block was a wall of absence.                                                                                                                                             | **Done** (§8n, §8o): one full-width statement, after the specification and profile.                                                                                                                                                                                                                                |
| 4   | Add to bag leads nowhere: the button flashes "Añadido" and resets.                                                                                                                   | Open. Needs an inline confirmation with a "Ver bag" link.                                                                                                                                                                                                                                                          |
| 5   | Mobile PDP: the empty image filled the first screen, and there was no sticky buy bar.                                                                                                | **Done** (§8n): a 1:1 plate and the mobile buy dock (only while the bag is enabled).                                                                                                                                                                                                                               |
| 6   | Mobile catalogue was 55,900px tall.                                                                                                                                                  | **Done** (§8n): a two-up grid and a one-line toolbar, now 20,900px.                                                                                                                                                                                                                                                |
| 7   | The bag has no cross-sell at the "Faltan $X para envío gratis" moment.                                                                                                               | Open. Reuse the materials/related row.                                                                                                                                                                                                                                                                             |
| 8   | Unknown product URLs show Next's unstyled 404. Still true: seen on `/es/productos/bpc-157` on 2026-09-18. `[locale]/not-found.tsx` exists, but there is no root `app/not-found.tsx`. | Open                                                                                                                                                                                                                                                                                                               |
| 9   | Opening checkout directly says the bag is empty while it has items.                                                                                                                  | Open                                                                                                                                                                                                                                                                                                               |
| 10  | The homepage was 12,600px and previewed the catalogue four times.                                                                                                                    | **Done** (§8n): hub, editorial and chain removed, now about 10,900px.                                                                                                                                                                                                                                              |
| 11  | Trust basics are thin: phone only, no About page, no legal links.                                                                                                                    | Open. Needs owner content (the Nosotros/Contacto route is reserved).                                                                                                                                                                                                                                               |

### P2: polish (all open)

- "Bag" in the Spanish UI. This is the owner's call; the reference nav uses it.
- The card label slot mixes world names with product classes: GHK-Cu shows
  "MATERIAL" beside the "MATERIALES" area.
- Catalogue filters overlap: Clasificación, Tipo and Formato. "Viales por
  empaque" splits the catalogue 84 to 1.
- The chosen presentation is not in the URL.
- A `metadataBase` warning in the server log, and a 404 on `favicon.ico`.
- No product structured data.
- The Research hub is about 12,700px long.
- The mobile header takes about 140px.
- Three unlabelled blends (§6 item 13).

### Recommended sequence (owner has not approved)

1. **Owner decisions, in parallel:** payment method and bank details,
   shipping rates under MX$10,000, final prices and IVA, cold chain, counsel's
   policies and the research-use line, Neon and an email provider, the
   domain, and starting the classification review.
2. **Truth pass** (code only): the remaining P1-1 copy and P1-8's branded
   root 404.
3. **Commercial UX** (code only): P1-4, P1-7, P1-9.
4. **Order infrastructure, as decisions land:** durable orders, email, rates,
   SPEI, and policies with the research-use line.
5. **Launch:** production env and domain, commerce on, then a full
   walk-through in both languages on desktop and mobile, and all gates.

## 8q. The /productos storefront (V1 creative reference)

**Owner direction (2026-09-18):** redesign `/productos` first, as the visual
and commercial reference for the rest of V1, from an owner-supplied catalogue
concept used as art direction (not reproduced). Homepage, Atlas, payments and
backend were explicitly out of scope. **Awaiting the owner's visual review;
nothing here is to be propagated to other pages until approved.**

**Composition**

1. **Masthead** (charcoal, the hero/hub token remap): the store's counted
   facts (products, presentations, areas), the one search field, and the three
   signature products on their world grounds with range and entry price.
2. **Compra por área**: eight tiles, each shown by the area's entry product
   (its cheapest priced one) on the area's studio tone, with count and "from"
   price. One row at ≥80rem, four at ≥48rem, a swipe shelf on phones.
3. **Todo el catálogo**: the existing `CatalogBrowser` (facets, sort, register
   view, URL state) with `variant="store"`: 4 across beside the facets and
   5 with them hidden; the store card; and paging in 24s. Every product stays in
   the server HTML, so paged cards are `hidden` rather than absent.

**Behaviour**

- The masthead search is the page's only search field. It writes `?q=` through
  the shared `useUrlFilters` hook and is also a GET form. While a query is
  typed, the area shelf is hidden so results sit under the field; facets never
  move the layout.
- **Softness:** `--radius-object` (6px) is new and applies only to product
  surfaces: signature and area tiles, and store cards. Chrome stays square.
  The Design Bible still says zero radius; update it only if the owner approves.
- **Store card** (`ProductCard variant="store"`): paper body, price at xl, and
  a compact charcoal square action in place of the full-width bar. The action
  text stays in the link. No catalogue index on the plate. On phones: a square
  stage and no category line.

**Follow-up (owner, same day):** the store card now also runs on the area
pages, in the area's lead compounds and its browser. Area tiles are
colour-coded: a tinted band under a rule in the new `--area-hue`, plus one
abstract symbol per area (`components/ui/AreaIcon`). The symbols are
catalogue signs (cycle, link, cell, steps, layers, network, ring, flask),
never bodies or effects.
Desarrollo (was graphite) is now teal `#2e7f86`, and Materiales (was
neutral) is olive `#7c7f3a`, across their whole area palette, owner request.

**Polish pass (owner, same day; structure unchanged):**

- **Handoff.** The area heading sits on a charcoal band that continues from
  the masthead. The tiles rise out of it onto the paper (`--shelf-rise`).
- **Grid rhythm and worlds.** In the store grid RETA, GLOW and GHK-Cu are
  double-width cards (`format="flagship"`, `data-feature`):
  - the world stage sits beside the record;
  - the world's atmosphere shows in the record's ground;
  - an accent seam runs along the top, the same device as the Experience
    sections.

  `grid-auto-flow: dense` prevents holes; checked at 2 to 5 columns, filtered
  and unfiltered.

- **Audit.**
  - One-line toolbar: its captions are screen-reader only, and the controls
    wrap as a group.
  - The count reads "shown / matched" while paged.
  - Compact cards keep an xl name at three across.
  - World-card names are sized by container.
  - Hover borders take the card's area hue.
  - No touch reveal toggle on world cards.

**Also fixed:** the header's dark state mixed `--ink-muted` at 52% paper, and
the inactive locale measured 3.5:1 over dark sections. It is now 70%. This
header change affects every page.

**Measured.** Page height: desktop 21,300 → 5,660px; phone 21,260 → about
6,800px. axe WCAG A/AA: 0 violations at 375 and 1440 on `/es/productos`,
`/en/productos`, search mode, an area page and the homepage. Horizontal
overflow: 0 on all of them. Area pages and the homepage keep the default card.

## 8r. Product media: the RETA studio (approved; container now `reta-v2.glb`)

**Status.** The owner approved this direction on 2026-09-18. The `reta.glb`
named below was replaced by `reta-v2.glb` in §8u, and the rig set grew to one
per flagship in §8w; the pipeline itself is written up in `CONVENTIONS.md`
§17b.

**Owner direction (2026-09-18).** The catalogue is frozen. Next is product
media, starting with RETA only:

- a premium, studio-quality presentation of the existing `reta.glb` and its
  real label;
- no remodelling and no new packaging;
- no propagation until approved.

GLOW, GHK-Cu, generic product media, the homepage and backend are untouched.

**What exists**

- `components/experience/studio/rig.ts`: the shot described as data
  (`StudioRig`, `RETA_RIG`):
  - lens, camera height and turn;
  - six softboxes, each with a diffuse `intensity` and a separate `reflection`
    brightness;
  - the sweep, the floor, and material overrides.
- `components/experience/studio/StudioScene.tsx`: an R3F scene that executes a
  rig on the unmodified GLB:
  - a PMREM reflection map built from the rig's softboxes;
  - rect-area lights;
  - a screen-space sweep (no horizon line), a mirrored floor reflection, and a
    radial contact shadow;
  - Khronos Neutral tone mapping (label white stays true);
  - 2× supersampling, `frameloop="demand"`, and a capture hook.
- `/[locale]/estudio/[slug]`: development only (404 and no static params in
  production, noindex). It is the viewfinder, with `?yaw= ?exp= ?fov= ?cy=
?cz=` overrides and a "Capture still" button (1600×2000 PNG).
- `public/images/products/reta/studio.jpg`: the captured still, registered as
  the new `studio` media role. It is a render of the model:
  - never `primary`;
  - never counted as photography (the media check still reports 0);
  - rejected by `check:media` without a `model`.
- `commerceStill(slug)` (photograph, else studio still) feeds only the
  catalogue's store card and the storefront masthead's RETA tile. The homepage
  and PDP keep their current media.

**Rig decisions that made the difference**

- An 18° tele lens and a camera just above label height give a near-front
  photographic perspective.
- Dark-field edges: tall strips behind the object, close to the axis. A
  cylinder's silhouette reflects what is directly behind it. Left is white,
  right is RETA blue.
- A reflection-only streak panel draws the long highlight down the glass.
- The glass takes a raised reflection level (front-facing glass reflects about
  4%). Attenuation is neutral: a blue attenuation had turned the clear glass
  cobalt, which misrepresents the packaging.
- The white key keeps the label accurate. The blue lives in an off-centre pool
  behind the right shoulder and the right kicker, never in the key.

**Approved (owner, 2026-09-18).** RETA's studio direction is approved, and the
RETA GLB is NEOGEN's real physical container, canonical for every product in
the same packaging. The file named here was `reta.glb`; the canonical file is
now `reta-v2.glb` (§8u), and GHK-Cu and GLOW ship the same container with their
own printed labels.

**Neutral prototype (awaiting review; not propagated).** Semaglutide, one
generic product, is rendered on the canonical container by `NEUTRAL_RIG`:

- a cream sweep and soft white softboxes;
- bright-field glass: black flags behind the sides draw its edges;
- a light contact shadow and a faint floor reflection;
- no world colour.

Its label is drawn from registry data (name and presentation range) in the
real RETA label's measured layout (`studio/label.ts`), with a graphite rule
where RETA's is blue and no LOT/ID placeholders. The still sits at
`public/images/products/semaglutide/studio.jpg` as its `studio` media. The
media check now requires a studio still to live in its own product's folder,
and no longer requires the product's own model. The other generic products
keep the drawn object until approval.

Also fixed: glTF materials without extensions (the label and the black top)
load as MeshStandardMaterial, and the studio's physical-only filter had
skipped them. The approved RETA still was captured before this fix and is
unchanged.

**Open for the owner**

- **Shape mismatch** (resolved: the GLB is canonical). The catalogue's vector
  product object is drawn as a narrow vial, but the GLB is a wide jar. The
  studio shows the real asset. Decide which shape NEOGEN's packaging is before
  propagating.
- **Label placeholders.** The label texture's side panels carry the asset's own
  "[LOT] [PRODUCT ID] [FORMAT]" placeholders. They are invisible at the front
  view; any turned view would show them.

## 8s. Homepage pass: the store opening up (awaiting owner review)

**Owner direction (2026-09-18).** Redesign the homepage in the /productos
commerce language, and keep the giant black NEOGEN opening. The visitor
should understand early how much there is to explore: the EXOMA idea
functionally, not visually. Stronger ecommerce presence throughout;
predominantly black and cream; colour in stages (neutral UI → area
atmosphere → flagship world). Out of scope: /productos (except safe shared
fixes), Atlas, 3D and modelling, backend. **Stop for visual review; do not
propagate.**

**Composition** (`src/app/[locale]/page.tsx`, data in `src/server/home.ts`):

1. **Hero**, unchanged except for the condense. On scroll, from 48rem and
   with motion allowed, the poster mark shrinks toward the header's corner
   and fades (`Hero.module.css`), while the header's wordmark lands
   (`motion.css`, `body:has([data-hero-condense]) [data-brand-mark]`). Both
   use CSS scroll timelines only; without support, the static poster and the
   normal header stay.
2. **01 Explora NEOGEN** (`HomeGateway`):
   - The catalogue door is shown by `catalogFace`, the first non-flagship
     product with a real still (today Semaglutide's studio still), with counts
     and the lowest price.
   - The research door is charcoal, with the profile and reference counts and
     the three latest citations.
   - The areas door shows the eight `AreaIcon` signs in their hues.
   - Search is a plain GET form to `/productos?q=`.
   - The worlds door has three world chips with prices.
   - A documentation door renders only once `publicEvidenceIndex` is
     non-empty. A separate references door was tried and removed: it repeated
     the research door's count.
3. **02 Tres mundos** (`WorldBand`), on charcoal. Each flagship sits on its
   world palette with its brand name at poster scale, the world tagline, the
   object, and name, range, price and action. RETA uses its approved studio
   still; GLOW and GHK-Cu use the drawn object (no still exists). On phones,
   a swiped row.
4. **03 Colección:** the storefront's `AreaShelf`, reused. It gained optional
   `allHref` and `id` props; /productos keeps its defaults. The tiles rise out
   of the charcoal band.
5. **RETA**, unchanged.
6. **04 Explora por área** (`AreaExplorer`, client tabs). The section takes
   the selected area's `--area-wash` with its hue pooled in one corner. Each
   area shows its title, body, count, entry price and "Ver el área", plus the
   next four products by entry price as store cards and a count door on
   `--area-deep`. Every panel is in the server HTML, and inactive panels are
   `hidden`.
7. **GLOW**, unchanged.
8. **05 Evidencia**, the existing `ScienceBand`, now fed from `homeData`.
9. **GHK-Cu**, unchanged.
10. **06 Más del catálogo** (`ClosingShelf`): ten store cards, one area per
    round by entry price, skipping everything shown above; then a charcoal
    "Todo el catálogo" block. Phones show six (2-up), tablets nine.

**Selection rules** (all in `server/home.ts`):

- The flagships are excluded from the shelves.
- An area's entry is its cheapest priced product.
- An area's shelf is its next four, excluding worlds.
- The closing shelf is round-robin across areas, never repeating anything
  shown above.

**Removed from the homepage:** the flagship `ProductCard` row (replaced by
the world band), `ShelfAreas` (deleted), `CompoundRail`, `DiscoveryGrid` and
the `CatalogIndex` fallback. The last three still exist in `components/ui`,
unused. `NeogenHub` and `server/hub.ts` are still unused too, as before.

**Assets.** No molecular mark exists anywhere in the repo, so none is used
and none was invented. The only real product images are the RETA and
Semaglutide studio stills; everything else is the drawn product object.

**Verified.** Every gate passes. axe WCAG A/AA shows 0 violations, and
horizontal overflow is 0, on `/es`, `/en`, `/es/productos` and an area page,
at 375 and 1440. The explorer tabs were tested by click, arrow keys and End:
focus follows, and the ground changes per area. Heights: desktop 10,900 →
11,500px, phone about 11,400 → 11,500px, with far more product on the page.

**Owner review round 1 (2026-09-18)**

- **Gateway doors reworked.** At wider viewports the four small doors had
  looked cramped and empty. Each door now composes by its own width
  (`container-type: inline-size`):
  - Research is a charcoal reading room: bold condensed counts (profiles,
    references, areas) and the three latest citations, split into two
    columns when the door is wide.
  - By area is a directory: eight hue-coded tiles (sign, name, count), each
    linking to its area page.
  - Search has a single-line rail of real compounds to try (each area's
    entry product) and a joined scale of the catalogue's most common strengths
    (`homeData().strengths`, counted from the variants), each linking to its
    `?q=` results, closed by an index line.
  - Signature is three small stages with each flagship standing in its world.

  On tablets the order is Search before Areas and Signature, so the grid has
  no holes.

- **RETA scene, unpinned.** The 300vh sticky track with swapping beats is
  gone. `RetaExperience` is now an ordinary section: the head (RETA,
  Retatrutide Research, one line), four labelled facts either side of the
  vial, and the commerce at its foot.
  - The facts are what it is (area and pack from the registry), the
    packaging, the seven presentations with their real prices, and the
    documentation rule.
  - The vial's pose follows "through" progress (`choreography.ts`: it
    arrives low, far and turned away, is presented at mid-scene, then eases
    back). The light blooms and the columns slide in on CSS view timelines.
  - Reduced motion holds the presented pose (`restingProgress("sequence")`).
  - On phones it stacks, with the canvas as a feathered full-bleed band.
  - The old beats copy was replaced by `home.reta.facts`. The product page's
    world line now reads `home.reta.statement`.
- **GLOW, clarified (2026-09-19).** The section led with prose about light.
  It now says what GLOW is: a blend. `homeData` parses the flagship's
  printed composition into parts (`HomeComponent`), matching each to the
  product that sells it alone (by slug or name, never a blend). It also
  reads the pack's price per vial from `perVial`.
  - `GlowMoment` (`GlowMomentCopy`) shows "3 peptides in a single 70 mg
    vial", then a spectrum bar with each part proportional to its
    milligrams.
  - Each part lists its share (largest-remainder rounding, so the shares
    total 100) and its amount, with an "also sold alone · from $X" link.
  - Then the presentation (70 mg × 10 vials, $1,790 per vial) and the
    price.
  - The light bloom and its view-timeline ignition stay, and the bands
    fill with it. On phones the vial comes first.
  - `MaterialMoment` keeps `WorldMomentCopy`, and the product page reads
    `home.glow.statement`.
- **GHK-Cu, clarified (2026-09-19).** The section led with prose about
  verdigris and texture. It now sets out the record as strata
  (`MaterialMoment`, `MaterialMomentCopy`), each slab one fact:
  - the presentations drawn as weights to scale (each block's height is its
    mg against the heaviest), with pack, price and price per vial;
  - its areas as hue-coded links;
  - "also in" GLOW: `homeData` reverse-parses blend compositions into
    `usedIn`, here 50 mg in each 70 mg vial;
  - its sourced profile and reference count, linking to `#overview-title` on
    its page.

  The parallax strata and the copper plinth stay. The slabs settle and the
  weights load on view timelines, and on phones the plinth comes first. The
  shared `WorldMomentCopy` type is gone, and the product page reads
  `home.ghkcu.statement`.

- **Closing section → catalogue directory (2026-09-19).** The ten
  round-robin cards read as a random handful and repeated the card grid
  shown above.
  - The close is now `ClosingShelf` as a directory: every publishable product
    per area (`homeData().directory`), A to Z with its entry price on a
    dotted leader, and each area opened by its hue rule, sign and count.
    Flagships carry their world dot.
  - On phones each area shows its first five, then "all {n} in {area}".
  - It ends in a slim charcoal bar with the counts, a GET search and "View
    the full catalogue".
  - The closing selection (`closing`, `CLOSING_SIZE`) is removed from
    `server/home.ts`.
- **Area tiles made compact (2026-09-19).** This change is to the shared
  `AreaShelf`, so it affects both /productos and the homepage's collection.
  Following an owner reference, each tile is now its number, sign, name and
  count over a paper-to-area-tint ground, with the top of a NEOGEN vial rising
  from its foot. The new `ui/AreaCap` draws the cap in the area's
  `--area-hue`.
  - The full drawn vial and the "From" price are gone. `StoreArea` no longer
    carries `entry` or `price`, and the unused `from` keys are removed.
  - Phones show two across (no swipe), tablets four, wide screens eight.
- **Homepage performance audit (2026-09-19).** Measured on the production
  build (`neogen-prod`, :3100) with Playwright: desktop unthrottled, and a
  phone profile (390 px, 4× CPU).

  The dev server is ~18× slower to load `/es` (1.8 s against 0.1 s), so judge
  speed on a production build.

  Found and fixed:
  - **Explorer:** it rendered all eight panels (56 % of the DOM, 180 of 246
    SVG gradients, ~180 KB of HTML). Now only opened panels render.
  - **Prefetch:** every one of 217 links prefetched its route, 695 KB across
    150 requests. `prefetch={false}` now covers the dense lists (directory,
    area tiles, gateway directory, suggestions and world chips, GLOW parts,
    GHK-Cu chips and links). Primary CTAs keep it.
  - **Canvas density:** it was capped at 2×. Now 1.5× for the full-bleed hero
    and RETA scene; the product page presenter keeps 2×.
  - **3D start:** it began during hydration. `useVialStage` now waits for
    `requestIdleCallback` (1.5 s at most); the poster paints first.
  - **CSS repaints:** GLOW's scaling bloom used `filter: blur()` and GHK-Cu's
    slabs used `backdrop-filter` over moving strata; both removed.
  - **Header:** `HeaderSurfaceSync` wrote its attribute every scroll frame; it
    now writes only on change.

  |                  | Before           | After           |
  | ---------------- | ---------------- | --------------- |
  | DOM nodes        | 4,046            | 2,142           |
  | SVG gradients    | 246              | 90              |
  | HTML (decoded)   | 527 KB           | 380 KB          |
  | Prefetch traffic | 695 KB / 150 req | 153 KB / 66 req |
  | Phone TBT        | 362 ms           | 231 ms          |
  | Phone LCP        | 1.15 s           | 0.95 s          |

  CLS stays 0.

  Not changed:
  - three.js is 238 KB; it now loads after idle.
  - The inline RSC payload is ~190 KB decoded (38 KB gzipped for the whole
    document), normal for a server-rendered tree.
  - Fonts are 113 KB.
  - Whether phones should get the static poster instead of the hero's live 3D
    is a design decision, left to the owner.

- **Accessibility fix (pre-existing).** `PresentationLadder` scrolls
  sideways at tablet width and was not keyboard-reachable (axe
  `scrollable-region-focusable`). It now scrolls inside a focusable,
  labelled wrapper.

**Open for the owner**

- Whether the header wordmark should be absent at the very top of the
  homepage on desktop (the condense), or present from the start.
- Whether the area tiles (03) and the explorer (04) are both wanted, or one
  should absorb the other.
- The molecular mark, if one exists outside the repo.

## 8t. Mercado Pago checkout (test mode)

Owner brief of 2026-09-19 (given while away): make the V1 checkout genuinely
functional with Mercado Pago's Checkout API / Orders API, behind the existing
adapter boundary, test credentials first; no homepage, catalogue, Atlas or 3D
work. Full technical reference: **`docs/PAYMENTS.md`**.

**What exists now**

- `src/payments/adapters/mercadopago/`: config (4 env vars, explicit
  `MERCADOPAGO_MODE`), the Orders API vocabulary (every documented
  status → NEOGEN state / decline reason), webhook HMAC, and the adapter
  (`charge` → `POST /v1/orders` with `X-Idempotency-Key`, `fetchStatus`,
  `verifyWebhook`, `refund`). Registered ahead of `none`.
- The `PaymentProvider` contract was rewritten around what an embedded card
  flow needs: `prepare`, `charge`, `fetchStatus`, `verifyWebhook`, `refund`.
- `src/payments/reconcile.ts`: the one path to every payment state. Checks the
  external reference and, for `paid`, the exact amount.
- `src/server/payments.ts`: `submitPayment` (claim under the version lock →
  charge → reconcile), `refreshPayment` (revisits re-fetch in-flight orders,
  release stalled attempts after 15 min), `settleFromProvider` (webhooks).
- Order domain: new `disputed` state; widened transitions (`created → paid`,
  `payment_failed → payment_processing/paid`, `payment_processing →
pending_payment`); attempts carry an outcome lifecycle and a stable
  idempotency key; `transition()` can never set `paid`; orders carry `locale`.
- Checkout: **review now comes before payment.** `placeOrder` creates the
  order only when payment is available and sends the customer to
  `/checkout/pago/[id]` (the old `/checkout/pago` redirects to review). The
  payment page renders the Card Payment Brick themed with NEOGEN tokens, a
  test-mode banner, the decline reason and a fresh form on retry. The
  confirmation refreshes in-flight payments, offers "pay" / "retry", and
  clears the bag only once money is moving.
- Webhook route: verify signature (401), fetch the order from Mercado Pago,
  dedupe on the provider fact, apply. Body is never trusted for state.
- Durable persistence: Postgres adapters for orders and drafts, migration,
  `npm run db:migrate`; selected by `DATABASE_URL`. Live mode requires it.
- Notifications: order-placed messages are now queued when payment is first
  confirmed, not at order creation. Still queued as `pending`; nothing is sent.
- Copy (ES/EN): payment step, 13 decline reasons, confirmation states
  including `disputed`; every "no processor exists" sentence removed; the
  regulatory-review wording kept.
- Tests: `npm run check:payments` (in `npm run check`) — 189 assertions,
  scripted Orders API + PGlite. Negative controls run: removing the amount
  check or the signature check fails it on the right assertions.
- Dependencies added: `pg` (runtime, Postgres driver); `@types/pg` and
  `@electric-sql/pglite` (dev, tests only).

**Gates changed**

- The `none`-only registry and "no environment variable can enable payment"
  invariants are replaced by: payment requires the commerce flag + a fully
  configured provider + (live) a database, asserted case by case in
  `check:commerce`.
- The unpaid-order path is gone: without a processor, review blocks with
  `payment_unavailable` instead of registering an order nobody can pay.
- `check:output` rule 6: the Mercado Pago SDK may appear only in the payment
  island's chunk; every other processor's SDK stays banned.
- Kept: `NEXT_PUBLIC_COMMERCE_ENABLED` (a business decision, not a technical
  one), the MX$10,000 shipping stop, repricing, ownership cookies, noindex.

**Browser QA (production build, placeholder test keys, 375 and 1440, ES/EN)**

Full walk bag → contact → shipping → delivery → review → payment →
confirmation: a tampered bag price was repriced and disclosed; axe clean on
review, payment and confirmation; no overflow; reload stays on the payment
page; another browser gets "not found"; the bag is kept for an unpaid order.
With a placeholder public key the Brick cannot initialise, and after 20 s the
page shows the load error with a reload action (it previously would have
spun forever). A real Brick has **not** been seen rendering: that needs the
owner's test public key.

**Owner decisions opened by this work**

- Whether to send line items (product names) to Mercado Pago.
- Meses sin intereses; SPEI/OXXO; 3-D Secure challenge UI (all architected,
  none enabled).
- An operations view (paid orders, disputes, refunds) — none exists.

## 8u. Second-generation 3D vials (2026-09-20)

The owner exported new vials and asked for them to be implemented, plus "a much
better understanding of the 3d assets". The how-to lives in
`public/models/README.md`; this records the decisions and what is still open.

**What shipped**

- `reta-v2.glb`, `ghk-cu.glb`, `glow.glb` — all three flagships now have a
  model, where only RETA did before. GHK-Cu and GLOW product pages open on the
  real object inside their worlds instead of the world alone.
- **`reta-v2.glb` supersedes `reta.glb`** as NEOGEN's canonical container: it is
  what `StudioView` mounts for the neutral rig, and what the §8r statement about
  the canonical container now refers to. The old file is deleted. The filename is
  versioned because models carry a one-year immutable cache — overwriting in
  place would never reach a returning visitor.
- Two scripts, because a GLB is opaque until something says otherwise:
  `scripts/inspect-model.mjs` (parts in millimetres, triangles per material,
  whether the glass still carries transmission, texture weight, parts sharing
  space) and `scripts/prepare-model.mjs` (`3d assets/` → `public/models/`: drop
  nodes, re-encode textures, prune; refuses to write a vial whose glass lost its
  transmission). Dev dependencies: `@gltf-transform/core`, `/functions`,
  `/extensions`.
- Cap metal corrected at load time in `VialModel` — see below.

**What the exports turned out to contain**

- All three are the same container: 287.9 mm tall, Ø129 mm, ~15.4k triangles,
  glass with real transmission, and a 2048² label sheet whose printed strip is
  identical across all three (455 px at x = 18). That last fact is load-bearing:
  `studio/label.ts` draws generated labels against exactly that strip, so the
  neutral rig still lines up on the new container.
- **RETA V2 carries two lids**, interpenetrating by 33.9 mm: the narrow
  `NEOGEN_VIAL_CAP` (Ø123) and the wider `0.75 Dram Autosampler Lid` (Ø147).
  Together they render as a double-brimmed cap with a seam. The build drops the
  autosampler lid, matching the approved first-generation silhouette.
  **OPEN: the owner may prefer the wider lid** — that is one flag in the prepare
  command, or a re-export carrying a single lid.
- GLOW's first export (2026-09-19) was an **empty scene**; the owner re-exported
  it the same night and that one is what ships.
- Raw exports were 0.8–1.0 MB, 40–53% of which was a PNG label. Re-encoded to
  JPEG q92 at the same 2048², all three land at ~460 KB, inside the budget.

**Cap metal (`VialModel`)**

The caps are authored `metalness: 1` with `roughness: 1` and
`KHR_materials_specular` 0.4. A fully rough metal forms no reflection and renders
as flat grey paint — the same class of export artefact as the glass arriving at
roughness 0. The material pass now corrects a metal left at FULL roughness to
0.32 with full specular. Because metal shows its surroundings, each cap picks up
its own world: blue on RETA, copper on GHK-Cu, gold on GLOW. Environment
intensity was deliberately NOT raised — that is the next lever if more brightness
is ever wanted, not a lower roughness (0.12 went murky in the near-black worlds).

**Open for the owner**

- Which RETA lid (above).
- The labels carry visible placeholders — `[COMPOUND NAME]`, `LOT`, `MFG/EXP` and
  a `RECONSTITUTION: [SOLVENT / INSTRUCTIONS]` field. Legible at product-page
  size. Honest as placeholders, but filling that last one in would collide with
  the no-dosing / no-reconstitution rule (§4).
- ~~`/images/products/reta/studio.jpg` was rendered from the v1 label.~~ Done in
  §8v, along with Semaglutide's.
- ~~The homepage GHK-Cu and GLOW sections still use the drawn `SpecimenPlate`.~~
  Done in §8v; the plate remains their fallback.
- Optional: set the cap material to roughness 0.35 / specular 0.5 in Blender so
  the source matches the site, after which the `VialModel` correction can go.

## 8v. Flagship vials in their homepage moments (2026-09-20)

Owner request: re-capture the RETA catalogue card, fix the Semaglutide render
with the new vial, and put the GLOW and GHK-Cu models into their homepage
sections "in a cool way".

**The studio stills**

- `scripts/capture-studio.mjs <slug>...` is new: it opens `/estudio/<slug>` on
  the dev server, waits for the scene to settle, takes the frame the page
  already exposes (`window.__studio.capture()`) and writes
  `public/images/products/<slug>/studio.jpg`. The page's own comment had
  referenced such a script since §8r; it was session scratch and had been lost.
  Dev dependency: `playwright-core` (system Chrome, no bundled browser).
- Both cards re-captured at 1600 × 2000, matching what the registry declares.

**A regression the first capture caught**

The first RETA capture came back with a BLACK cap. `StudioScene` chose
materials BY NAME (`name.includes("aluminum")`), and `prepare-model.mjs` ran
`dedup()`, which merged the RETA export's two identically-valued materials and
kept the name "Lid - Ridged Black Plastic" for the aluminium band — so the
studio painted the cap as plastic. Fixed at both ends:

- `prepare-model.mjs` no longer deduplicates MATERIALS (geometry and textures
  still are). Material names are content in this codebase, not noise.
- `StudioScene` matches metal on `metalness > 0.5`, so no future rename can
  repaint a part. `VialModel` already matched this way.

Only `reta-v2.glb` changed when the models were rebuilt; GHK-Cu and GLOW had no
duplicate materials and came out byte-identical, which is the proof that the
dedup was the whole cause.

**The homepage moments**

- `components/experience/MomentStage.tsx` hosts a live vial inside a section's
  existing object box, with that section's drawn `SpecimenPlate` passed as
  children — first paint, loading state and the no-WebGL fallback, unchanged.
- **One canvas, still.** `useVialStage`'s registry already arbitrated a single
  WebGL context by visibility; it now spans three stages, so scrolling hands
  the canvas from the RETA scene to GLOW to GHK-Cu. Verified: exactly one
  canvas exists at any scroll position.
- A `moment` variant in `choreography.ts`: centred, arriving with a slight
  rise and growth as the section is scrolled through, then held and turning
  slowly. Not the full-bleed sequence, not the anchored presenter.
- **A luminous world now emits.** `RetaCanvas` adds a point light behind the
  object when `environment.atmosphere === "luminous"` — the glass transmits it,
  so GLOW lights from within and its label is rimmed from behind. It breathes
  slowly, and holds at its floor under reduced motion. Driven by world data,
  not by a product name: RETA and GHK-Cu are untouched, and any future luminous
  world gets it.
- The canvas uses `RetaCanvas`'s existing `fill` mode. Laying it out by
  percentages instead made the renderer's container resolve against a canvas's
  intrinsic 300 × 150 and come out squashed and cropped.

**Cost.** A reader who scrolls the whole homepage now fetches three GLBs,
~1.4 MB, spread across the scroll and never above the fold. A reader who does
not scroll that far fetches none of them.

**Open**

- GLOW and GHK-Cu have no `poster` still, so their sections show the drawn
  plate while the GLB is in flight. §8w closed the prerequisites this entry
  listed — both worlds have a rig and both slugs are in the studio page's
  `PROTOTYPES` — so what is left is capturing a still of the settled HOMEPAGE
  pose and registering it as `poster`. The `studio` stills they now have are
  the catalogue shot, a different framing.
- The homepage sections' composition was not otherwise touched: the object box,
  its size and its place in the grid are exactly where §8s left them.

## 8w. Studio rigs for GLOW and GHK-Cu, and a smaller cap (2026-09-20)

Owner request, in Spanish: make the RETA render in the WorldBand match the
current model, adapt GHK-Cu and GLOW the same way, and Semaglutide too —
"me gustan los renders actuales, solo que sean con los nuevos modelos". Then:
"a ver intenta lo de la tapa que este un poco mas chica, tampoco tanto".

**Every flagship can now be photographed as itself**

- `studio/rig.ts` gains `GLOW_RIG` (amber pool, warm strips, exposure 1.06) and
  `GHK_RIG` (copper right strip, exposure 1.02, more floor reflection), both
  spread from `RETA_RIG` so only what differs is stated.
- `StudioView` takes the product's OWN model. It used to render every product
  on the canonical container, which put RETA's printed label on GLOW.
- `estudio/[slug]` lists all four prototypes.
- All four stills re-captured under versioned names: `reta/studio-v3.jpg`,
  `glow/studio-v2.jpg`, `ghk-cu/studio-v2.jpg`, and Semaglutide, which was
  re-captured again in the same session for the brand lockup and shipped as
  `semaglutide/studio-v5.jpg` (§8x).
  `check:media` was rewritten to accept `studio-v<N>`; three negative controls
  proved the relaxed rule still rejects the shapes it is there to reject.

**The cap at 92%**

Measured first, from raw vertex data: the glass neck is Ø97.2 mm and the cap
Ø123.0 mm, so there is 12.9 mm of skirt per side and the floor is about 79%
before the neck shows. Rendered at 100/96/92/88% and shipped 92% — cap now
Ø113 × 40 mm.

It shrinks around its TOP, not its base. The glass ends at 286.7 mm and the cap
at 287.9; shrinking from below would lift the closure off the lip. The base
rises 244.3 → 247.8 mm and what is gained is visible neck. Verified: the top
held at exactly 287.9 and the cap still covers 38.9 mm of neck.

It lives in the preparation step (`prepare-model.mjs --scale-node "NEOGEN_VIAL_CAP" 0.92`),
not in web code, so the live 3D, the studio and the stills agree and the Blender
export stays untouched. Changing the number and re-running is the whole edit.

That script's own rule said it "never moves, rotates or rescales". The rule now
reads: it never re-poses the object — the page does that — but it may change one
part's proportion to the rest, because that is something the model carries with
it. If the owner would rather this lived in Blender, it comes out in one line.

**Open**

- The cap was judged only in software-rendered headless Chrome. 96% and 88% are
  one number away if 92% reads wrong on real hardware.
- Which RETA lid is still an owner decision (§8u): the narrow `NEOGEN_VIAL_CAP`
  ships; the wider autosampler lid is one flag away.

## 8x. The brand mark, applied (2026-09-20)

Owner dropped `NEOGEN Branding.png` (the mark — the molecule) and
`NEOGEN Full Logo.png` (the lockup — mark + NEOGEN / PEPTIDES) into
`public/branding/`, and asked for the logo on the Semaglutide render's label
and "where it should" on the site.

**Both sources are black-on-alpha, which is the whole design**

An all-black image with a real alpha channel is a MASK, not a picture. So the
site never places it as an `<img>`: it masks a block of `currentColor`, and the
mark comes out graphite on the light header, paper on the inverted footer and
on whatever surface `HeaderSurfaceSync` flips the header to — from one file,
with no second inverted export to keep in sync.

`scripts/prepare-brand.mjs` (`npm run brand`) trims each source to its ink
(the mark's artwork is 389×485 inside a 447×531 sheet) and writes
`neogen-mark.png`, `neogen-logo.png` and the favicon. Trimming once makes the
file's box the artwork's box, so a caller only says how tall the mark should be
— the alternative is a margin correction at every call site that goes quietly
wrong the next time the owner re-exports. Dev dependency: `sharp`, which was
already in the tree twice (Next's image optimizer, gltf-transform) and is now
declared; nothing new was downloaded.

**Where it went**

- **Header** — the mark before the wordmark, replacing a solid dot that had
  stood in for it since there was no mark to use.
- **Footer** — the mark over the oversized wordmark, in paper.
- **Favicon** — `src/app/icon.png`, the mark in paper on charcoal. It replaces
  `icon.svg`, a hand-drawn dot with a comment explaining that the dot WAS the
  identity. It is not, any more.
- **The drawn label** — `studio/label.ts` prints the real lockup where it used
  to set the word "NEOGEN" in the site's face. Semaglutide re-captured; the
  render that shipped is `studio-v5.jpg` — the intermediate numbers were
  superseded within the session and never committed.

**Two things the label needed**

The lockup took the divider hairline's room and is drawn at 84px on the 2048²
sheet, with the name block dropped 24px to clear it. Two sizes were rejected
first: at 34px "PEPTIDES" came back as mush, and at 48px the owner still could
not see it — the label prints at roughly 1.5× on the 1600×2000 still, and that
still is then shown 6× smaller again on a catalogue card. The ceiling is the
paper, not taste: the printed strip's hairline is at x 18, and 40 leaves the
brand the same top margin the old wordmark had. A rule exists to separate the
brand from the product name, and at this size the lockup already does that.

The drop is one constant (`NAME_DROP`) rather than four edited numbers, because
the two-line branch — the layout nobody looks at while tuning a render of a
one-word product — is the one that overflows the panel when it is forgotten.
Checked against the catalogue's worst cases ("CJC-1295 without DAC +
Ipamorelin", "Healthy Hair Skin Nails Blend") by adding them to the studio's
prototype list, rendering, and taking them back out.

`drawLabel` runs inside the scene's `useMemo` and cannot await an image, so
`StudioView` resolves the artwork BEFORE it mounts the canvas, alongside
`document.fonts.ready`. Redrawing the texture when the image lands would make
`window.__studio.ready` mean two things and could photograph a label mid-swap.
If the artwork cannot be fetched at all, the label falls back to the wordmark
rather than leaving the studio permanently un-ready.

**Not done, and why**

The three flagships' labels are printed into their `.glb` in Blender. RETA's
already carries the lockup (§8u); putting it on GLOW and GHK-Cu is an export,
not a code change. `label.ts` does not touch a flagship.

## 8y. Education, editorial, FAQ and the research-use gate (2026-09-20)

Stakeholder brief: explain what peptides are, communicate quality/certification
status, communicate shipping ("envíos a México en 24 horas", same-day where
supported), emphasise RUO, require an explicit RUO acknowledgement before
purchase, add a real blog for SEO, and add an FAQ.

**What shipped**

- **`/peptidos`** — the guide. Six sections: what a peptide is, why they are
  studied, the research-use condition (on charcoal), how documentation works
  (the existing `EvidenceChain`), handling and shipping, and the way into the
  catalogue by area. It is in the header nav, because "what is this" is the
  first question a first-time visitor has.
- **`/investigacion/notas`** and **`/investigacion/notas/<slug>`** — the
  editorial system. Structured blocks, not MDX (`content/editorial`): each
  block carries provenance (`definition` / `practice` / `sourced`) and a
  `sourced` block without approved references does not render. Four seeded
  notes, both locales. Article JSON-LD, OG `type: article` with real dates,
  canonicals, hreflang, sitemap entries, `dynamicParams = false`.
- **`/preguntas`** — the FAQ. Fourteen questions render; four do NOT, each with
  a `blockedOn` note naming the decision it waits on. Answers interpolate the
  facts (`{priorityZone}`, `{nationalDays}`, `{freeShipping}`, …) from
  `config/site` and `domain/fulfilment`, so they cannot drift from what the
  checkout quotes. FAQPage JSON-LD is built from the SAME resolved list.
- **The research-use acknowledgement is live and blocking.** The framework
  built in Phase 10 was waiting for an approved declaration; it now has one.
  `AcknowledgementKind` distinguishes an `agreement` (consent to a document —
  still unpublishable, no policy is approved) from a `condition-of-sale` (a
  statement about the buyer's own purchase, publishable on owner approval).
  `research-use@1` is required, so `placeOrder` refuses to create an order
  without it, the acceptance is stored on the draft AND the order, and the
  confirmation prints the sentence accepted with its version and timestamp.
- **RUO and shipping across the journey.** `ResearchUseNotice` (one wording,
  two registers) on the catalogue masthead, the product page, the bag, the
  guide, the FAQ, every note and the footer's legal bar — and as the checkout
  checkbox. `ShippingNote` on the catalogue, the product page, the bag and the
  guide.

**The two claims that were refused**

- **"Certified in Mexico" is not published.** Nothing supports it: no COA, no
  lot, no laboratory analysis, no registration, and the classification review
  has not happened. `content/certifications.ts` is the empty registry with the
  six facts a record must carry, `publicCertifications()` returns nothing, and
  `check:content` fails the build if any string asserts a certification. The
  FAQ answers the question honestly instead, by explaining what the word
  requires.
- **"24 horas a todo México" and same-day are not published.** The confirmed
  facts are one business day to Guadalajara and Durango and up to seven
  elsewhere; same-day was explicitly ruled out by the owner.
  `domain/fulfilment` answers `supports("nationwide-24h")` and
  `supports("same-day")` with `false` — derived from `config/site`, so a
  confirmed fact turns the claim on everywhere at once — and the gate rejects
  an unqualified delivery claim in any dictionary, note or FAQ string.

**Verified end to end** (local `next start` with the commerce flag on):
the review step renders the declaration unticked with the submit ENABLED (it
is fixable on that screen); posting with the checkbox removed from the DOM
entirely returns to review with the notice and creates NO order; ticking it
places order `NG-…` and the confirmation shows `research-use · v1` with the
accepted wording and the moment it was accepted.

**Owner decisions this work is waiting on** — see also §6:

1. Evidence for any certification claim: issuer, standard, identifier, scope,
   validity, and a document or public registry URL. Six fields or nothing.
2. Real COA / lot / laboratory data, so the documentation surfaces fill.
3. Exact shipping coverage: is the 1-day estimate a courier commitment, and
   is there a dispatch SLA that could honestly be stated as "24 hours"?
4. Same-day: if it is ever offered, it needs its own confirmed cities and a
   cut-off time before it can be modelled.
5. Returns and cancellation policy (PROFECO distance-selling rules apply).
6. The 18+ rule: final wording and where it lives.
7. Counsel review of the research-use declaration's wording. It ships as
   version 1; changing a word means bumping the version, which deliberately
   stops inheriting consent given to the old text.
8. Shipping rate below MX$10,000, and the cold-chain determination.

## 8z. RETA V3, and a label that could not ship (2026-09-21)

Owner dropped `NEOGEN_RETA_VIAL_V3.glb` into `3d assets/`: "apply the same
settings as the current one I like it a lot".

**The model is better, and settles two open decisions in Blender**

- ONE closure. The interpenetrating `0.75 Dram Autosampler Lid` is gone, so the
  `--drop` is gone and the open question from §8u is answered: the narrow
  NEOGEN cap is the silhouette.
- The cap is already Ø112.0 mm, against the Ø113.2 mm `--scale-node … 0.92`
  was producing. The approved proportion is now in the export, so that flag is
  gone too.
- Its label band is taller and lower on the body (31.5–180.8 mm against
  48.7–163.5), which is why the printing reads much larger.
- Prepared: 482 KB, inside the budget.

**The printed label could not be published**

The export's strip is a mock-up reading:

    RETATRUTIDE · 10 ML · INJECTABLE PEPTIDE ● 99% PURITY · SUBCUTANEOUS USE

Four problems, and the first two are the serious ones:

1. "INJECTABLE PEPTIDE" and "SUBCUTANEOUS USE" are administration instructions
   for human use — the vocabulary `check:content` refuses in copy, on a
   product image, one screen above a checkout box where the customer declares
   they will NOT direct the material to human use (§8y).
2. "99% PURITY" is analytical evidence. No COA, lot or laboratory analysis
   exists for any product (§6, items 9–10).
3. "10 ML" matches no presentation: RETA sells 5–60 MG in packs of ten.
4. The name overran the visible band.

**It ships as drawn, on the owner's instruction** (2026-09-21): "do not change
the label in the new reta vial, put it as is, it is a demo we'll adapt it later
but I want to visualize it." The packaging is being designed and is easier to
judge in place. The site is not public — no domain, no processor, the
classification review outstanding — so the only reader is the owner.

It is declared in `DEMO_ARTWORK` (`content/media/registry.ts`) so it cannot
become permanent by inattention: `check:media` prints the strip's text on every
run, and it is a launch blocker in §6. **It must not be the label the site
launches with.**

**The replacement path exists and is one command**

Built and verified on this model before the owner chose the draft, so it is
ready when the artwork is:

- `scripts/export-label.mjs` (new) renders the sheet `studio/label.ts` draws
  from registry data — brand lockup, product name, presentation range — and
  writes the 2048² PNG. It has to run in a browser: that is where the canvas,
  the webfont and the brand artwork are.
- `prepare-model.mjs --label <png>` (new) swaps it onto the texture the LABEL
  material points at. UVs, meshes and every other material are untouched.
- Baked rather than swapped at render time because FOUR paths read that
  texture — catalogue still, product page viewer, homepage moment, studio —
  and only one has a material pass.
- `studio/label.ts` gained a per-model calibration (`SHEETS`): V3's taller band
  stretches the sheet, so the drawn strip is scaled 2.25× and its panel
  re-centred. Without it the label filled the top of the band and left the
  rest blank paper. The canonical container is unchanged at 1:1.
- `StudioView` gained two development overrides — `?model=` and `?label=drawn`
  — for photographing an export before the registry points at it.

**What the owner should decide**

- **Corrected artwork, before the site is public.** The label may carry: the
  NEOGEN lockup, the compound name as the registry states it, and the
  presentation. It may not carry a route of administration, a purity figure, or
  a volume the catalogue does not sell. "For research use only" is the one
  extra line that is both true and consistent with the rest of the site.
  Either re-export it from Blender, or run the two commands in
  `public/models/README.md` to put the drawn sheet on this same geometry.
- Whether V3 becomes the CANONICAL CONTAINER for non-flagship products.
  `reta-v2.glb` still holds that job, and `studio/label.ts`'s 1:1 geometry is
  measured against it; promoting V3 means re-capturing every neutral still.

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
- **Session scratch** (the Playwright screenshot, axe and overflow scripts,
  and before/after screenshots) lived in a per-session temp directory and is
  gone. The method is described in "Start here", above.
