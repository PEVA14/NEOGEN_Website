# Atlas questionnaire — developer guide

Atlas has two halves that are edited separately.

- **Content** — the questions themselves. One file:
  [`src/content/atlas/questionnaire.ts`](../src/content/atlas/questionnaire.ts).
- **System** — the schema, the engine, one renderer per question kind, the
  field map, the advisor policy and the result page. Touched only when a
  genuinely new _kind_ of interaction is needed, or when a question should start
  _influencing_ something.

Rewriting, reordering or removing a question is a change to the content file
alone. A NEW question also renders, validates and appears in the ledger with no
other edit — but it influences nothing, and is never sent to the server, until
it is classified in
[`src/domain/atlas/fields.ts`](../src/domain/atlas/fields.ts) (§7).
`check:atlas` fails until it is, so an unclassified question cannot ship by
accident.

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
rank labels from `atlas.field.ranks`, and the policy weighs the first three
ranks of the profile's `areas`.

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
defaults to 1 when required. A required question must be one the server
receives (a transmitted field, §7) — `check:atlas` fails otherwise, because the
server could never see it answered.

A `number` question may omit `max` (open-ended above its floor). `range` keeps
both bounds, because its track needs two ends.

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
  "goal": "tissue-recovery",
  "goal-tissue-recovery": "tendons",
  "weight-kg": 82.5,
  "health-conditions": ["none"],
  "additional-notes": ""
}
```

String, string array, number or boolean — nothing else. Ids are what is stored,
persisted in the session draft and translated by `fields.ts`; labels exist only
for reading. Only the transmitted subset is sent to the server (§7). That is why rewriting a label is free and
changing an `id` is a data change (bump `version` when you do).

`AtlasAnswers` and its validation live in
[`src/domain/atlas/questionnaire/`](../src/domain/atlas/questionnaire/):

| File       | What it is                                                      |
| ---------- | --------------------------------------------------------------- |
| `types.ts` | the schema — what a question can BE                             |
| `view.ts`  | the resolved questionnaire: one locale, registries already read |
| `index.ts` | the engine: build the view, visibility, validation, show-back   |

The engine validates the **resolved view**, so the browser and the server apply
the identical rule; `POST /api/atlas` rebuilds the same view and re-validates
before anything is generated.

---

## 5. Adding a question

1. Open `src/content/atlas/questionnaire.ts`.
2. Add an entry to a group's `questions`, with a new `id`, a `kind`, both
   languages, and whatever that kind needs.
3. Optionally `recap: true` to echo it above the result, or `visibleWhen`.
4. Classify it in `src/domain/atlas/fields.ts` (§7): bind its id to a field in
   `ATLAS_BINDINGS`. To keep it collected-but-unused, bind it to a withheld
   field (or declare a new one with `withheld(...)`).
5. Run `npm run check:atlas`.

It renders, validates, blocks its step when required, appears in the ledger
with its own wording, and is refused by the API if answered with anything
unexpected.

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

Until it is bound, it is `unbound`: collected, shown back in the ledger, never
sent, and it changes nothing. Binding it to a permitted field is what lets it
influence the result — a system change, reviewed as one (§7).

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
questionnaire config             content/atlas/questionnaire.ts   (owner)
  → answers (by question id)     in the browser
  → transmittableAnswers()       only permitted fields leave the browser
  → POST /api/atlas              strips again, validates the transmitted view
  → profileFromAnswers()         domain/atlas/profile.ts — via fields.ts
  → AtlasProfile                 area ids, levels, amounts; never question ids
  → AdvisorPolicy                domain/atlas/policy.ts
  → selection signals + pins + constraints + narrative + presentation
  → retrieval                    registry facts, reasons, relevance, evidence ids
  → AI adapter (or composer)     sees only the narrative and the retrieval
  → validation                   slugs, evidence ids, claims, figures, pins
  → AtlasResultView              assembled on the server from the registries
  → result UI                    + ledger and recap, built in the browser
```

### The field map — `src/domain/atlas/fields.ts`

The one file that names question ids. Three tables:

- **`ATLAS_FIELDS`** — every field of the profile and its permitted **uses**,
  or the reason it is **withheld**.
- **`ATLAS_BINDINGS`** — which question fills which field. Several questions
  may fill one field when only one is visible at a time (the ten goal
  follow-ups all fill `goal-focus`).
- **Option translations** — `GOAL_AREAS` (goal option → catalogue area ids)
  and `EXPERIENCE_LEVELS` (experience option → `new`/`some`/`experienced`).

The uses:

| Use                | Means                                                      |
| ------------------ | ---------------------------------------------------------- |
| `discovery`        | which products become candidates, and in what order        |
| `research-context` | which approved statements and references are put forward   |
| `personalization`  | what the model (or the composer) is told about the visitor |
| `filtering`        | preferences that narrow or size the selection              |
| `recap`            | shown back to the visitor on the result page               |
| `presentation`     | shapes the page itself, and nothing else                   |

A **withheld** field may have at most `recap`. It never reaches discovery,
research context, the model or filtering, and — because nothing on the server
may use it — it is **never sent**: the browser drops it
(`transmittableAnswers`), the route drops it again, and the server validates
against `transmittedView`, which does not contain it. The profile lists a
withheld field by name and reason (`AtlasProfile.withheld`); its type has no
slot for a value.

Withholding reasons: `health`, `body`, `lifestyle`, `administration`,
`personal-outcome`, `use-history`, `unbound`, plus two decided per request —
`health-note` (a note that carried health detail, discarded whole) and
`name-private`.

### How every current question flows

| Question(s)                                                                                       | Field                                              | Uses / status                                   |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| `goal`                                                                                            | `goal-area`                                        | discovery, personalization, recap — as area ids |
| `goal-weight-loss` … `goal-immunity` (10)                                                         | `goal-focus`                                       | withheld (`personal-outcome`), recap only       |
| `peptide-experience`                                                                              | `experience`                                       | filtering, discovery, personalization           |
| `additional-notes`                                                                                | `context-note`                                     | personalization, after the health screen        |
| `previous-compounds`                                                                              | `compounds-used`                                   | withheld (`use-history`)                        |
| `age`, `biological-sex`, `weight-kg`, `height-cm`, `physical-activity`, `sleep-quality`, `stress` | `age` … `stress`                                   | withheld (`body`)                               |
| `administration-route`, `protocol-duration`, `injection-tolerance`                                | same names                                         | withheld (`administration`)                     |
| `health-conditions`, `medications`, `other-medications`, `injuries`                               | `conditions` … `injuries`                          | withheld (`health`)                             |
| `current-frustrations`, `ninety-day-goal`, `main-priority`                                        | `frustrations`, `outcome-goal`, `outcome-priority` | withheld (`personal-outcome`)                   |
| `training-type`, `daily-schedule`, `work-type`, `alcohol`, `caffeine`                             | same meaning                                       | withheld (`lifestyle`)                          |

The goal is used **as the catalogue area it corresponds to** — the same
section the menu opens — and the model is told the area id, never the goal's
wording. `daily-wellbeing` corresponds to no single area, so Atlas starts from
the whole catalogue and says so.

**Permitted fields no question asks for today** run on `FIELD_DEFAULTS`
(`profile.ts`) and are marked `default` in `AtlasProfile.sources`:
`research-functions`, `products`, `intent`, `history`, `priorities`, `style`,
`forms`, `size`, `supplies`, `budget`, `horizon`, `timing`, `name`. The policy
still honours every one of them (`check:atlas` proves it), so a future question
only needs a binding. Neither the model nor the composer may present a default
as the visitor's choice: the prompt labels it "not asked", and the composer
only describes answered fields.

### Pins, reasons, evidence, relevance

- **Pins.** `AtlasPolicyDecision.selection.pinned` lists products that must be
  in the result, each with a `source` (`visitor` or `policy`) and reason
  codes. `policyPins()` in `policy.ts` is the seam for a future rule; it
  returns none today. Pins are always retrieved, marked for the model, required
  by the validator (`missing_pinned`) and reach the card as `source`.
- **Reasons.** Retrieval gives every candidate structured `reasons`
  (`area-match`, `function-match`, `signature`, `documented`, `within-budget`…),
  computed from the same facts as its score. The result resolves labels per
  locale.
- **Evidence.** Each subject carries its approved statement ids
  (`publicStatementRefs` in `content/overview`). The model sees ids only and
  may cite them per pick (`evidence` in the schema); the validator refuses any
  id that is not that product's own (`unknown_evidence`); the page prints the
  statement and its references from the registry. A chosen research function
  moves the statements that back it to the front — research-context retrieval.
- **Relevance.** `{ rank, score, tier }` from the policy's scoring. Deterministic,
  not a model's self-reported confidence.

The free note is screened before the policy uses it: anything touching health,
body, medication or dosing is discarded whole (`domain/atlas/screen.ts`), and
the ledger tells the visitor it was.

---

## 8. How the result reaches the UI

`AtlasResultView` (`domain/atlas/result.ts`) is assembled on the server
(`server/atlas/assemble.ts`). Each product carries its own case: `source`,
`reasons`, `evidence` (approved statements with their references),
`relevance`, plus every registry fact (names, prices, presentations,
documentation, links) — never from the questionnaire, never from the model.

The **ledger** and the **recap** are built in the browser
(`domain/atlas/ledger.ts`), from the resolved questionnaire, the visitor's own
answers and `fields.ts` — they have to be, because withheld answers never leave
the device. The server contributes one per-request fact, `notices.noteDiscarded`.

- `recap` — every question marked `recap: true` **whose field permits
  `recap`**. A content flag cannot echo a withheld health answer.
- `ledger` — `{ question, field, label, answer, answered, uses, withheld }` for
  every visible question. Free text is never echoed, only acknowledged.

---

## 9. Checks

`npm run check:atlas` covers, each with a negative control:

- the live questionnaire validates (unique ids, no forward-referencing
  condition, defaults that exist, sane bounds) in both locales
- every live question is bound; a withheld field has no decision use; a
  transmitted question's visibility never depends on an untransmitted answer
- every conditional branch of the live questionnaire: each goal shows exactly
  its follow-up, `previous-compounds` and `other-medications` track their
  triggers, hidden answers are dropped, every step completes with optional
  answers skipped
- transmission: the browser sends exactly the permitted answers, the server's
  view refuses a withheld one, and a full request fits the body limit
- the profile: each goal becomes its area, each experience its level, skipped
  fields are marked defaults, and withheld fields appear by name only
- **no leaks**: every withheld question, set to every option (or to canary
  text), changes nothing in selection, constraints, narrative, retrieval, the
  plan or the model's exact input
- permitted answers do change what they may: different goals retrieve
  different products, experience changes the constraints, a clean note reaches
  the model and a health note does not
- pins, evidence ids and relevance travel end to end; the validator refuses a
  foreign or invented statement id and a dropped pin

`npm run check:content` holds the questionnaire's wording to its use: a
question worded in dosing or administration vocabulary must be withheld, and a
question touching health, the body or a personal outcome must be withheld or
consumed only as a translated option id (the goal → its area).
