# NEOGEN's everyday motion — the baseline under the flagships (PROTOTYPE)

Creative prototype of 2026-10-04, awaiting the owner's review. Homepage, one
standard product page (Semaglutide) and Research. **Not** rolled out across
the catalogue and **not** consolidated: this folder holds the few pieces that
are already shared, and each surface keeps its own.

## Principles found on the way

1. **A figure in transition never shows a value it does not hold.** A price
   rolling from $4,000 to $10,900 through $16,300 is a lie for a frame. Digits
   swap old → new in the direction the value moved; nothing passes through.
2. **The choice travels; things do not switch on and off.** One mark moves to
   what was chosen (presentation, area tab, reading position, reticle).
3. **Motion exposes structure that exists — and only that.** Every Research
   interaction is drawn from data the server already publishes: citation
   numbers, glossary matches, line memberships with their sourced sentence.
   No distances, clusters, strengths or "related because similar".
4. **The object behaves the same everywhere.** The vial lifts off its set on
   a card, leans on the bench, sways on the directory's tray. Same physics,
   same pivot (its base), different magnification.
5. **Operated, not watched.** Nothing here plays on load or on scroll-in.
   Every movement is caused by a pointer, a key, a choice or the reader's own
   scroll position — so the twentieth visit is the same as the first.
6. **Content stays put.** Typography that changes width on scroll reflows the
   page (rejected, below). Transforms, clips and opacity only.
7. **Ink before light.** Hairlines, squares, inversions — the instrument's
   language. No glow, no blur, no gradient needed for any of it to read.

## Vocabulary

| Tier                     | What                                              | Where                                       |
| ------------------------ | ------------------------------------------------- | ------------------------------------------- |
| Micro (always there)     | `ValueRoll` — figures swap in their direction     | PDP price, pack line, dock; archive readout |
|                          | `useIndicator` — the mark that travels            | presentations, area tabs                    |
|                          | the object lifts, the card does not               | every `ProductCard`                         |
| Meso (the "that's cool") | `SourceTether` — claim ↔ source                   | PDP profile, compound record                |
|                          | `TermLens` — the word, defined where it is read   | compound record                             |
|                          | the reading needle                                | record index (`SectionIndex`)               |
|                          | the directory lens (`home/DirectoryLens`)         | homepage catalogue                          |
|                          | the shelf moves the way the choice did            | homepage "Explora por área"                 |
| Macro (rare)             | the archive map (`research/ArchiveMap`), scrubbed | Research hub, wide and phone                |
|                          | the flight, the worlds (unchanged)                | catalogue → flagships                       |

### Rules against fatigue

- No entrance animation without a cause. Nothing waits at `opacity: 0` for an
  observer; the page at rest is complete.
- One traveller per gesture: a choice moves one mark, not the whole block.
- Meso effects answer a pointer or focus and stop when it leaves; none loops.
- One effect per target: a citation marker has its tether, a defined word its
  definition; nothing answers a pointer twice.
- Macro stays where it is: flagships, the flight, the archive map.
- Durations from the tokens (`--motion-duration-*`, `--ease-settle`), so the
  site has one tempo and reduced motion shortens it in one place.

## The brand mark (2026-10-05)

`components/brand/NeogenMark` — the owner's mark as measured parts, and the
same principles applied to the brand: points → connection → structure, only
on the reader's scroll or gesture, never looping. Its vocabulary and rules are
in CONVENTIONS §19; its placements in PROJECT_STATE §8av.

## The pieces

- `ValueRoll.tsx` — digits as windows; the old figure leaves, the new one
  arrives, keyed from the right so units stay over units. Accessible text is
  one hidden copy; the strips are aria-hidden and unselectable. Reduced
  motion: the figure changes, nothing travels.
- `useIndicator.ts` — writes the selected element's box into `--x/--y/--w/--h`
  on a mark; first placement and resizes are instant, only a new selection
  travels. (Motion's `layoutId`, measured by hand.)
- `SourceTether.tsx` — `data-cite` (marker), `data-cites` (sentence),
  `data-ref` / `data-ref-index` / `data-ref-body` (list entry). A marker draws
  a leader to its source when both are on screen side by side; otherwise the
  source comes to the sentence as a card. A source marks the sentences that
  cite it. Touch follows the link; the entry it lands on flashes (`:target`).
- `TermLens.tsx` — the record marks each glossary word at its first use
  (`termSpans` in `content/glossary`, the sentence's own characters, never
  reworded); the definition (the glossary's own) folds open under the word,
  ending in "Abrir en el glosario" for the entry on its own. Pointing
  previews it (the pointer can move into the card); a click, a tap or Enter
  keeps it open — so on a phone a word opens in place instead of leaving the
  record; tapping elsewhere or Escape closes it. A non-modal dialog
  (`role`, `aria-expanded`, `aria-controls` set by script); a modified click
  still opens the glossary in a new tab, and without script the words are
  plain links.

## Concepts explored and rejected

- **Section titles that condense into their set width as they arrive** (the
  hero's own gesture, carried down the page). Width changes reflow: a title
  wrapped to two lines wide and one condensed, pushing the text under it;
  locked to its lines, the wide state overflowed its column and was clipped
  ("CADA PERFIL, CON SU FU"). Both read as bugs. Rejected in the browser.
- **An odometer roll through intermediate digits** (Motion+ AnimateNumber's
  look). Showed prices and strengths that do not exist ($16,300, "37 MG").
  Replaced by the old → new swap.
- **The directory lens beside the pointer.** It covered the price of the row
  being read. It now rides the column's outer edge.
- **Scramble / decode text** for mono labels: a hacker cliché, and it shows
  wrong characters on purpose.
- **Magnetic or cursor-following buttons**, **velocity-skewed type**,
  **scroll-scrubbed parallax**: motion with no information in it.
- **A force-directed graph of compounds** for Research: its distances would
  read as similarity, which no source states. The matrix shows only what a
  sourced sentence says.

## Motion+ — what was used, and what was not installed

Studied through the Motion+ tooling: split text and masked line reveals,
rolling labels, AnimateNumber (trend, digit columns), magnetic filings and
pointer fields, the cursor-velocity image hover, layout/`layoutId` shared
selection, scroll-linked clip reveals, AnimateView (React view transitions,
needs React 19.3 — we are on 19.2.8), Motion UI's theme tokens (spring →
`linear()` easing). The `motion-plus` package was not installable (no Motion+
token in this environment) and `motion` itself turned out not to be needed:
each interaction here is a measured box plus a CSS transition, a WAAPI swap,
or a small spring loop — and `--ease-settle` is already Motion's spring baked
into `linear()`. Adding `motion` stays an option when an interaction needs
interruptible springs with carried velocity (drag, a sheet), which none of
these did.

---

# Pass 2 — meso motion (2026-10-04, PROTOTYPE)

Pass 1 raised the micro floor. Pass 2 is about moments met during ordinary
browsing without hunting for them, and about the Research journey reading as
one instrument. `motion` (the free package) is now installed and used where
interruptible layout animation earns it: the compendium and the glossary
reorganising. Everything else is still CSS, WAAPI, native view transitions
or a small scroll loop.

## Principles added

8. **Continuity across a boundary beats an entrance.** The hero's NEOGEN is
   not replaced by the next section; it becomes a word in it.
9. **One record, many magnifications.** A compound is the same object as a
   line in the index, the same line opened in place, and its own page. Its
   name and frame are carried between them; nothing reopens as a new window.
10. **Reorganise, never replace.** Filtering moves what stays, lifts out what
    goes, and keeps the alphabet where it was. The order never changes
    meaning (A–Z, filtered A–Z).
11. **Each world foretells itself, briefly.** One behaviour per flagship
    panel, borrowed from its own page; the payoff stays on the page.
12. **Counts are sets.** A number on the homepage is drawn as the things it
    counts, and a connection appears only when the content states it.
13. **The way back is part of the instrument.** Back returns with the record
    still open; a glossary jump leaves a chip that returns to where you were.

## What was built

| Surface  | Moment                                                                      | Where                                        |
| -------- | --------------------------------------------------------------------------- | -------------------------------------------- |
| Homepage | the hero's NEOGEN travels down and lands as the word in "Explora NEOGEN"    | `home/HeroHandoff`                           |
| Homepage | Tres mundos: RETA locks on, GLOW is lit from behind, GHK-Cu takes weight    | `home/WorldResponse`, `WorldBand.module.css` |
| Homepage | the evidence counts as their sets, with the real citations between them     | `home/EvidenceStructure`                     |
| PDP      | the profile's glossary words open in place                                  | `motion/TermLens` in the profile             |
| PDP      | the profile opens out into the full record ("Registro científico completo") | `research/recordTransition`                  |
| Research | the compendium opens a record in place; the index reorganises when filtered | `research/CompoundLibrary`                   |
| Research | Quick Record → full record carries title and frame; back returns it open    | `research/recordTransition`, `KnowledgeHead` |
| Research | glossary: reorganising filters, "see also" in place, arrival rule, way back | `research/GlossaryExplorer`                  |

## Explored and rejected in pass 2

- **The compendium's Quick Record as a modal sheet over a dimmed page.** It
  interrupted; the record now opens inside the list.
- **Motion's height animation for the opened record.** It made the layout
  engine re-measure all 85 rows every frame (60–110 ms tasks at 4× CPU); the
  panel unfolds in CSS (`@starting-style`) and Motion only reorganises.
- **A full cross-fade of the title into the record.** Two titles of
  different set widths overlapped visibly mid-flight; one short cross-fade
  at the start, then the new title travels alone.
- **A white sheen for GHK-Cu's panel.** It read as glare on the glass; the
  copper light now crosses the set, behind the vial.
- **A four-step evidence chain under an empty quality record.** The owner's
  rule stands: an absence is stated once.
- **A force layout, or any ordering by likeness, for the evidence threads.**
  Positions are fixed orders; only the threads are information.

## Motion+ installed and removed (2026-10-04, after pass 2)

Installed (`@motionplus/core` 3, which needs `motion` 13, so `motion` moved
from 14 to 13), then matched against the site and removed:

- Carousel: the shelves and the compound rail are scroll regions by decision
  (`CompoundRail`), and native scrolling beats a dragged transform on phones.
- AnimateView: needs React 19.3, is not interruptible, and is slower than
  the native view transitions the record and the flight already use.
- AnimateActivity: nothing hidden on the site has state to keep. The first
  real candidate is a set of stateful tabs.
- AnimateNumber, ScrambleText, Typewriter, AnimateText, splitText, Ticker,
  Cursor, magnetic pull, Curtains: each breaks a rule above (a value it does
  not hold, an entrance, a loop, a decorative wipe).

To add it back: `.npmrc` with `@motionplus:registry=https://api.motion.dev/npm/`
and `//api.motion.dev/npm/:_authToken=${MOTION_TOKEN}`, then
`"motion-plus": "npm:@motionplus/core@^3"`. The token is never committed.

---

# Finishing pass (2026-10-04, PROTOTYPE)

No new language: each piece reuses one already approved.

| Surface  | What                                                                   | Reuses                                  |
| -------- | ---------------------------------------------------------------------- | --------------------------------------- |
| PDP      | the quality record inspects the presentation in hand, synced both ways | the travelling mark, `ValueRoll`        |
| PDP      | "En el catálogo": the area A–Z with this product marked, and materials | the directory lens, the specimen flight |
| Research | an area tile opens in place into its roster, into the compendium       | the inline record's unfold, depth marks |

`DirectoryLens` gained `[data-lens-column]` (which column it rides beside)
and an opt-in `travel` (the drawn vial in the window flies to the page it
names). The homepage directory does not opt in. `ValueRoll` now reads the
tempo tokens once from the root.

Rejected on the way: a per-presentation row of empty document slots (the
owner's rule: an absence is stated once); "related" as a ranked or
similarity list (only the catalogue area relates them); a second Archive
Map for the areas (the roster is alphabetical, nothing spatial).
