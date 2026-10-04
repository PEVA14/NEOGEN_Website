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

| Tier                     | What                                            | Where                                       |
| ------------------------ | ----------------------------------------------- | ------------------------------------------- |
| Micro (always there)     | `ValueRoll` — figures swap in their direction   | PDP price, pack line, dock; archive readout |
|                          | `useIndicator` — the mark that travels          | presentations, area tabs                    |
|                          | the object lifts, the card does not             | every `ProductCard`                         |
| Meso (the "that's cool") | `SourceTether` — claim ↔ source                 | PDP profile, compound record                |
|                          | `TermLens` — the word, defined where it is read | compound record                             |
|                          | the reading needle                              | record index (`SectionIndex`)               |
|                          | the directory lens (`home/DirectoryLens`)       | homepage catalogue                          |
|                          | the shelf moves the way the choice did          | homepage "Explora por área"                 |
| Macro (rare)             | the archive map (`research/ArchiveMap`)         | Research hub                                |
|                          | the flight, the worlds (unchanged)              | catalogue → flagships                       |

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
