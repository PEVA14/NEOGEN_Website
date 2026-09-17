# Atlas questionnaire — developer guide

Atlas has two halves that are edited separately.

- **Content** — the questions themselves. One file:
  [`src/content/atlas/questionnaire.ts`](../src/content/atlas/questionnaire.ts).
- **System** — the schema, the engine, one renderer per question kind, the
  advisor policy and the result page. Touched only when a genuinely new _kind_
  of interaction or a new _role_ is needed.

Rewriting, reordering, adding or removing a question is a change to the content
file alone. No component, no policy and no check moves with it.

---

## 1. Where I edit questions

`src/content/atlas/questionnaire.ts`, top to bottom:

```
ATLAS_QUESTIONNAIRE
├── version          bump when a change would make a saved draft wrong
└── groups[]         one group = one step, in this order
    ├── id           machine id, e.g. "goals"
    ├── label        the progress rail's short name
    ├── title        the step's heading
    ├── lede         the line under the heading
    ├── visibleWhen? show the whole step only under a condition
    └── questions[]  the questions, in order
```

Every label, hint, placeholder and option is written `{ es: "…", en: "…" }`.
Both languages are required — there is no silent fallback.

Nothing else in the repo carries question wording. The dictionaries
(`src/i18n/dictionaries/*.ts`) keep only the chrome around the questions:
`atlas.progress`, `atlas.controls`, `atlas.generating`, `atlas.error`,
`atlas.result` and `atlas.field` (the renderer's own strings — "Optional", the
"{n} of {max} chosen" counter, the rank labels, the search field's placeholder).

**The homepage reads the groups too.** The Atlas band on the homepage lists its
steps from `groups[].label`, so renaming or reordering a step updates the
homepage with no further edit.

---

## 2. Question types

| `kind`          | Answer stored | Notes                                                         |
| --------------- | ------------- | ------------------------------------------------------------- |
| `single-select` | option id     | `default`, `render: "cards" \| "pills"`, `columns: 2\|3\|4`   |
| `multi-select`  | option ids    | `min`, `max`, `ranked`, `render`, `columns`                   |
| `toggle`        | boolean       | `default`                                                     |
| `number`        | number        | `min`, `max`, `step`, `unit`, `default`                       |
| `range`         | number        | slider; `min`, `max`, `step`, `default` (required), `ends`    |
| `short-text`    | string        | `maxLength`, `placeholder`, `autoComplete`                    |
| `long-text`     | string        | textarea with counter; `maxLength`, `placeholder`, `footnote` |

`render` for a select is presentation only:

- `cards` — option cards in a grid (the default)
- `pills` — compact inline pills, for short vocabularies
- `tiles` — large tiles with a registry option's swatch and facts (areas)
- `search` — a search field with result pills, for long registry lists

`ranked: true` on a multi-select means selection ORDER matters; the tiles show
rank labels from `atlas.field.ranks`, and the `topics` role weighs the first
three ranks.

### Options: written or read from a registry

```ts
// Written here — ids are permanent, labels are free to rewrite.
options: {
  kind: "static",
  items: [
    { id: "compare", label: { es: "Comparar opciones", en: "Compare options" },
      hint: { es: "…", en: "…" } },
  ],
}

// Read from NEOGEN's registries at render time.
options: { kind: "registry", registry: "discovery-areas" }
```

Registries available: `discovery-areas`, `published-products`,
`research-functions`. Each brings its own facts (an area's framing, compound
count and entry price; a product's name and areas; a function's label and how
many compounds carry an approved sourced tag).

**Never copy a product, slug, price or count into the questionnaire.** Name the
registry instead — resolution happens in
[`src/server/atlas/questionnaire.ts`](../src/server/atlas/questionnaire.ts).

A registry may also hand its options a **group**: the research-function list
arrives ordered by group, each option carrying a heading, and the renderer
partitions a card list on those headings in arrival order. Nothing in
questionnaire content sets this — `src/content/functions.ts` declares the
groups and `server/atlas/questionnaire.ts` passes them through.

`hideWithoutOptions: true` drops a registry question whose list is currently
empty (this is how the research-function question stays hidden until the first
sourced overview is approved). A group left with no questions disappears from
the rail.

### Required vs optional

`required: true` blocks its step until answered; a multi-select's `min`
defaults to 1 when required. Everything else is optional and the renderer marks
it "Optional". `topics` is the one question the advisor cannot work without —
`check:atlas` fails if no question fills that role.

---

## 3. Conditional questions

```ts
visibleWhen: { question: "experience", equals: "new" }
```

| Form                                | Holds when                        |
| ----------------------------------- | --------------------------------- |
| `{ question, equals: value }`       | the answer equals that value      |
| `{ question, includes: "id" }`      | a multi-select answer contains it |
| `{ question, answered: true }`      | anything was answered             |
| `{ all: [...] }` / `{ any: [...] }` | every / at least one              |
| `{ not: {...} }`                    | the inverse                       |

Rules the checks enforce:

- A condition may only reference a question declared **earlier** (a
  forward or self reference fails `check:atlas`).
- A hidden question never blocks its step.
- An answer to a hidden question is **dropped** on submit — a stale draft
  cannot smuggle one in.
- `visibleWhen` on a group hides the whole step, rail entry included.

---

## 4. How answers are represented

One object, keyed by question id:

```json
{
  "topics": ["metabolic", "skin"],
  "intent": "compare",
  "include-supplies": false,
  "budget": "20k",
  "note": ""
}
```

String, string array, number or boolean — nothing else. Ids are what is stored,
sent to the server, persisted in the session draft and spoken by the policy;
labels exist only for reading. That is why rewriting a label is free and
changing an `id` is a data change (bump `version` when you do).

`AtlasAnswers` and its validation live in
[`src/domain/atlas/questionnaire/`](../src/domain/atlas/questionnaire/):

| File       | What it is                                                          |
| ---------- | ------------------------------------------------------------------- |
| `types.ts` | the schema — what a question can BE                                 |
| `view.ts`  | the resolved questionnaire: one locale, registries already read     |
| `index.ts` | the engine: build the view, visibility, validation, answers → roles |

The engine validates the **resolved view**, so the browser and the server apply
the identical rule; `POST /api/atlas` rebuilds the same view and re-validates
before anything is generated.

---

## 5. Adding a question

1. Open `src/content/atlas/questionnaire.ts`.
2. Add an entry to a group's `questions`, with a new `id`, a `kind`, both
   languages, and whatever that kind needs.
3. Optionally give it `role` (see §7), `recap: true` to echo it above the
   result, or `visibleWhen`.
4. Run `npm run check:atlas`.

That's all. It renders, validates, blocks its step when required, appears in
the ledger with its own wording, and is refused by the API if answered with
anything unexpected.

Example — an optional follow-up shown only to newcomers:

```ts
{
  id: "starting-point",
  kind: "single-select",
  render: "pills",
  visibleWhen: { question: "experience", equals: "new" },
  label: { es: "¿Por dónde prefieres empezar?", en: "Where would you rather start?" },
  options: {
    kind: "static",
    items: [
      { id: "one-compound", label: { es: "Un solo compuesto", en: "A single compound" } },
      { id: "a-set", label: { es: "Un conjunto", en: "A set" } },
    ],
  },
}
```

With no `role` it is collected, shown back to the visitor, told to the model as
context, and changes no selection. To make it select or rank, it needs a role,
and a role is a policy change (§7).

---

## 6. Adding a question TYPE

Only when no existing kind fits. Four edits, all in the system half:

1. `questionnaire/types.ts` — add the kind to `AtlasQuestionKind` and a
   `…Question` interface for its own fields.
2. `questionnaire/view.ts` — add any resolved fields to `AtlasQuestionView`.
3. `questionnaire/index.ts` — a case in `questionView` (resolve it), a case in
   `answerIssues` (validate it), and a case in `answerSummary` (show it back).
4. `components/atlas/QuestionField.tsx` — a branch that draws it, using the
   existing classes in `AtlasExperience.module.css`.

Then add a fixture to the "number and range kinds" block in
`scripts/check-atlas.mjs` so the kind is proved before it is used.

---

## 7. How answers reach the advisor policy

```
questionnaire config
  → answers (by question id)
  → profileFromAnswers()      by ROLE, not by question
  → AdvisorPolicy             domain/atlas/policy.ts
  → selection signals + constraints + narrative + presentation
  → retrieval (registry facts only)
  → AI adapter (or the local composer)
  → validation
  → AdvisorResult (AtlasResultView)
  → result UI
```

A question declares a `role`; the policy decides what that role may do:

```ts
export const ATLAS_POLICY: Record<AtlasRole, readonly AtlasUse[]> = {
  topics: ["selection", "ranking", "explanation", "presentation"],
  "first-name": ["presentation"],
  // …
};
```

Uses are `selection` (which products can appear), `ranking` (their order),
`explanation` (what the model is told) and `presentation` (how the page is
shaped). The visitor is shown this mapping per question on the result page.

Roles, and what fills them today:

| Role                 | Question             | Expects                        |
| -------------------- | -------------------- | ------------------------------ |
| `topics`             | `topics`             | area ids, ranked, required     |
| `research-functions` | `research-functions` | function ids                   |
| `intent`             | `intent`             | one of the known intents       |
| `products-in-mind`   | `products-in-mind`   | product slugs                  |
| `first-name`         | `first-name`         | text, never sent to the AI     |
| `experience`         | `experience`         | `new`/`some`/`experienced`     |
| `history`            | `history`            | `first-time`/`returning`       |
| `priorities`         | `priorities`         | known priority ids             |
| `explanation-style`  | `explanation-style`  | `direct`/`detailed`            |
| `forms`              | `forms`              | presentation form ids          |
| `presentation-size`  | `presentation-size`  | `smallest`/`largest`/…         |
| `include-supplies`   | `include-supplies`   | boolean                        |
| `budget-cap`         | `budget`             | an option `value`, or a number |
| `purchase-horizon`   | `purchase-horizon`   | `one-order`/`over-time`        |
| `timing`             | `timing`             | `soon`/`no-rush`               |
| `free-note`          | `note`               | long text (screened)           |

Three rules worth knowing:

- **A role may be filled once.** Two questions on one role fails `check:atlas`.
- **Drop a question and its role defaults.** `ROLE_DEFAULTS` in
  `questionnaire/index.ts` records what the advisor assumes with a shorter
  questionnaire — the feature keeps working.
- **Enum roles have a recognised set.** An option id the policy does not know
  is still shown back to the visitor, but the policy reads the default. So
  rewriting wording is free; inventing a new id changes behaviour only once the
  policy learns it.
- **`budget-cap` reads an option's `value`** (MXN, `null` = no cap) or a number
  answer directly — so the budget question can be tiers today and a slider
  tomorrow with no code change.

The free note is screened before the policy uses it: anything touching health,
body, medication or dosing is discarded whole (`domain/atlas/screen.ts`), and
the ledger tells the visitor it was.

---

## 8. How the result reaches the UI

`AtlasResultView` (`domain/atlas/result.ts`) is assembled on the server
(`server/atlas/assemble.ts`) and is the only thing the result UI reads. The
parts driven by the questionnaire rather than by hardcoded questions:

- `recap` — `{ question, label, answer }` for every question marked
  `recap: true`. The chips above the result render this list as it comes.
- `ledger` — `{ question, label, answer, answered, uses, withheld }` for every
  visible question, with the label being the question's own wording and `uses`
  coming from `ATLAS_POLICY`. The "what we did with your answers" table renders
  whatever is in it.

Everything else in the result (names, prices, presentations, documentation
states, references, links) is read from the registries at assembly time, never
from the questionnaire and never from the model.

So: add a question with `recap: true` and it appears in both places, with no
change to `AtlasResult.tsx`.

---

## 9. Checks

`npm run check:atlas` covers, each with a negative control:

- the live questionnaire validates (unique ids, one question per role, no
  forward-referencing condition, defaults that exist, sane bounds)
- the view resolves registries and both locales, and drops a registry question
  with nothing to offer
- the parser rejects unknown questions, unknown options, wrong shapes,
  out-of-range numbers, over-long text and missing required answers
- conditional questions and groups appear, disappear, block and unblock, and
  answers to hidden questions are dropped
- answers reach the profile by role, unknown ids fall back, and a dropped
  question defaults
- the ledger and recap are built from the questionnaire and the policy

`npm run check:content` additionally scans the questionnaire for dosing
vocabulary and for personal-outcome options (weight, muscle, appetite, sleep,
libido), which Atlas does not ask and does not match compounds to.
