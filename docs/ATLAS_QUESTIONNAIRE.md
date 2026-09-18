# Atlas questionnaire — developer guide

Atlas is a configurable questionnaire and advisor platform. Its concerns are
kept apart, each in its own place:

| Concern                     | Where                                                | Decides                                          |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------ |
| 1. questionnaire collection | `src/content/atlas/questionnaire.ts` (owner content) | what is asked                                    |
| 2. profile representation   | `src/domain/atlas/fields.ts`, `profile.ts`           | what each answer IS: kind, category, sensitivity |
| 3. transmission / privacy   | `src/domain/atlas/privacy.ts`                        | what may leave the browser                       |
| 4. candidate-selection      | the advisor policy (`policy.ts` + `policies/*`)      | which products become candidates                 |
| 5. retrieval                | the advisor policy                                   | which approved evidence is put forward           |
| 6. AI context               | the advisor policy                                   | what the advisor engine is told                  |
| 7. result / recap           | the advisor policy                                   | what is shown back                               |

**`AtlasProfile` represents the complete questionnaire.** A policy decides what
one advisor implementation receives; withholding by the current policy never
removes anything from the profile.

Rewriting, reordering or removing a question is a change to the content file
alone. A NEW question also renders, validates, is kept in the profile (as
`unbound`) and appears in the ledger with no other edit — but it is treated as
unclassified and sensitive, never sent and never used, until it is bound in
[`src/domain/atlas/fields.ts`](../src/domain/atlas/fields.ts) (§7).
`check:atlas` fails until it is.

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
persisted in the session draft and typed by `fields.ts`; labels exist only
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
4. Represent it in `src/domain/atlas/fields.ts` (§7): bind its id to a field
   in `ATLAS_BINDINGS`, declaring a new field (kind, category, sensitivity) if
   none fits. Then give the field an explicit transmission rule in
   `privacy.ts` and an explicit entry in the active policy's permissions —
   `[]` if the advisor should not use it.
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

Until it is bound, it lives in `AtlasProfile.unbound`: kept, shown back in the
ledger, never sent, and it changes nothing. Granting a policy permission over
it is what lets it influence a result — a system change, reviewed as one (§7).

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

## 7. From answers to an advisor

```
questionnaire config            content/atlas/questionnaire.ts        (owner)
  → answers (by question id)
  → AtlasProfile, complete       buildAtlasProfile(view, answers, "device")
  → privacy / transmission       privacy.ts: transmittableAnswers()
  → POST /api/atlas              strips again; validates transmittedView()
  → AtlasProfile, server scope   same type; device-only fields "not-received"
  → advisor policy               applyAtlasPolicy(profile, policy)
       over projections           one per permission; never the profile
  → selection signals, constraints, AI context, narrative, presentation
  → candidate retrieval          product ids, approved facts, reasons,
                                  relevance, approved evidence ids
  → advisor engine               AtlasAdvisorEngine: model or composer
  → validation                   slugs, evidence ids, claims, figures, pins
  → AtlasResultView              assembled from the registries; records the
                                  policy (with its permissions) and the engine
  → result UI                    + ledger and recap, built in the browser
```

### Representation — `fields.ts` and `profile.ts`

Every field declares its **kind** (`enum`, `enum-list`, `number`, `boolean`,
`text`), its **category** (`goal`, `outcome`, `experience`, `use-history`,
`body`, `health`, `administration`, `lifestyle`, `context`, `commerce`,
`identity`) and its **sensitivity** (`standard`, `personal`, `sensitive`).
Sensitivity is explicit so handling is auditable: health, body, medication,
administration, use-history and goal fields are `sensitive`.

`AtlasProfile.fields` has an entry for every declared field — typed from its
kind — with `source`:

| `source`       | Means                                                       |
| -------------- | ----------------------------------------------------------- |
| `answer`       | answered; `value` holds it, normalised                      |
| `unanswered`   | a question asks for it; skipped or hidden                   |
| `not-asked`    | no question in this questionnaire asks for it               |
| `not-received` | server scope only: the privacy policy kept it on the device |

Answers to unbound questions go to `AtlasProfile.unbound`. The schema grants
nothing: no field in `fields.ts` carries a use, a withholding or a
transmission rule.

### Transmission — `privacy.ts`

A per-field rule: `device` (never leaves the browser) or `sent(basis)` with a
written basis. A sensitive field never crosses without one. Two consistency
checks tie it to the active policy: `unreachableGrants` (a server-side
permission on a field that never arrives — cannot work) and
`unusedTransmissions` (a field sent that nothing uses — data minimisation).
Both must be empty for the active policy.

### Permissions — `policy.ts` and `policies/`

An **advisor policy** implements `AtlasAdvisorPolicy`:

```ts
{
  id, version, description,
  permissions: Record<AtlasFieldId, AtlasPermission[]>,
  decide(input: { selection, retrieval, context, presentation }): AtlasPolicyOutput
}
```

Permissions are `candidate-selection`, `retrieval`, `ai-context`, `recap` and
`presentation`, granted independently per field. `applyAtlasPolicy` builds one
**projection** per permission — only the granted fields — and passes those to
`decide`; the policy never holds the profile. The AI context it returns is
checked against its `ai-context` grant (`AtlasPolicyViolation` otherwise). The
profile is never modified.

`ACTIVE_ATLAS_POLICY` (`policies/index.ts`) is one line. Today it is
`RESTRICTED_POLICY` (`policies/restricted.ts`), the current advisor:

| Field(s)                                                             | Permissions (restricted policy)                       | Transmitted |
| -------------------------------------------------------------------- | ----------------------------------------------------- | ----------- |
| `goal`                                                               | candidate-selection (as its catalogue area), recap    | yes         |
| `goal-focus` (the ten follow-ups)                                    | recap                                                 | no          |
| `experience`                                                         | candidate-selection, ai-context                       | yes         |
| `context-note`                                                       | ai-context, after the health screen                   | yes         |
| body, health, administration, lifestyle, outcome, use-history fields | none                                                  | no          |
| commerce fields (not asked by v4)                                    | as before: selection / retrieval / ai-context / recap | yes         |
| `name` (not asked)                                                   | presentation                                          | yes         |

Candidate selection and AI context are separate: the goal selects (as its
area) but the model never sees it — it is told the catalogue areas of the
selection; the note reaches the model and selects nothing. `research-functions`
is the only field with `retrieval`: it orders which approved statements a card
leads with (`evidenceFocus`), separately from selecting candidates.

**Adding another policy** is a new object in `policies/` and a change to
`ACTIVE_ATLAS_POLICY` (or passing it to `generateAtlas`). The questionnaire, the
profile, retrieval, the engines and the result UI do not change. If it needs a
device-only field on the server, `privacy.ts` changes too, deliberately, and
`check:atlas` flags the gap until it does. It must not add medical
recommendation rules to the restricted policy.

### Engines — `engine.ts`

`AtlasAdvisorEngine.advise(input)` receives `AtlasEngineInput`: locale, policy
id, the **AI-context projection** (each entry with category and sensitivity),
the narrative signals, the constraints, and the retrieval — specific product
ids with approved catalogue facts and approved evidence ids. It returns an
`AtlasGeneration` (ids and prose). Two engines: the composer
(`createComposerEngine`, deterministic, no provider) and the model
(`server/atlas/engines/model.ts`, over whichever `@/advisor` adapter is
configured). The prompt renders any granted field generically, so a new policy
needs no prompt change. No production provider is connected.

### Pins, reasons, evidence, relevance

- **Pins** — `selection.pinned`, each with a `source` (`visitor` or `policy`)
  and reason codes. `policyPins()` is the seam; the restricted policy returns
  none. Pins are always retrieved, marked for the model, required by the
  validator (`missing_pinned`) and reach the card as `source`.
- **Reasons** — structured codes computed by retrieval from the same facts as
  the score; labels resolved per locale.
- **Evidence** — approved statement ids from `publicStatementRefs`; the model
  may cite a product's own ids only (`unknown_evidence`), and the page prints
  statement and references from the registry.
- **Relevance** — `{ rank, score, tier }`, deterministic, not model confidence.

---

## 8. How the result reaches the UI

`AtlasResultView` (`domain/atlas/result.ts`) is assembled on the server. It
records `policy` (id, version, permissions) and `engine`. Each product carries
`source`, `reasons`, `evidence`, `relevance` and its registry facts.

The **ledger** and **recap** are built in the browser (`domain/atlas/ledger.ts`)
from the visitor's own answers and `result.policy` — the policy that actually
produced the result. Each ledger row states three independent facts: the
field's sensitivity and category, whether it was transmitted, and the policy's
permissions. The recap shows questions marked `recap: true` whose field the
policy permits to recap.

---

## 9. Checks

`npm run check:atlas` covers, each with a negative control:

- schema and both locales; every live question bound; every field declares
  kind, category and sensitivity, and grants nothing
- every field has an explicit transmission rule and an explicit entry in the
  active policy; transmitted sensitive fields state a basis; no unreachable
  grant and no unused transmission
- every conditional branch of the live questionnaire
- **the complete profile**: every answered question — sensitive ones included —
  is in the device profile with its typed value; unbound answers are kept;
  the server profile has every field, device-only ones `not-received`
- **projections**: applying a policy never modifies the profile; a projection
  carries only granted fields; `decide()` never sees an ungranted value
- **no leaks through the policy**: starting from the COMPLETE device profile,
  every sensitive question set to every option (or canary text) changes
  nothing in selection, constraints, narrative, AI context, retrieval, the plan
  or the model's exact prompt
- **permissions are separate**: the goal selects but never reaches the model;
  the note reaches the model and selects nothing; a fixture policy granted the
  goal follow-up as AI context receives a different projection of the same
  profile, selects identically, and is flagged by the privacy layer; a fixture
  policy that smuggles an ungranted field into the AI context is refused
- engines receive only the AI-context projection plus specific product ids and
  evidence ids; pins, evidence and relevance travel end to end

`npm run check:content` holds sensitively worded questions to honest
classification (declared personal or sensitive) and to the active policy
(no server use, except the goal as a translated area id — never AI context).
