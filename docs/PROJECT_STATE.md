# NEOGEN — Project state and handoff

Last updated **2026-09-17**, after the Atlas questionnaire system (§8i).

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
| `4ab9b9a`   | Phase 12.1 — discovery area depth: data-derived sections after the masthead                                                     |
| `541c61b`   | Catalogue filtering, area index, search field, area design preview (§8c)                                                        |
| `b080cf3`   | Card reveal and homepage commerce layer, first version (§8d)                                                                    |
| `2b80dc7`   | Owner review of §8d: register becomes the presentation matrix; homepage trimmed                                                 |
| `3fe1f7e`   | Flagship shop moved onto the flagship product pages                                                                             |
| _this_      | Homepage hub: the gateway section under the hero (§8e)                                                                          |
| `d1300b1`   | NEOGEN Atlas: questionnaire → retrieval → AI adapter → validated map (§8h)                                                      |
| `d3a9e46`   | Atlas part 1 + homepage index                                                                                                   |
| _this_      | Sourced compound profiles, the research-function axis, and the data-driven questionnaire system (§8i)                           |

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
