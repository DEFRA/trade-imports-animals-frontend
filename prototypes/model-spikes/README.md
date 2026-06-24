# Journey-model spikes

A design exploration: find the right way to represent a **journey** as a
rendering-agnostic model in this repo. Throwaway, non-functional — same rules as
the rest of [`prototypes/`](../README.md).

## The idea we're proving

A journey model describes **questions, their type, and the constraints on their
answers** — and **nothing** about rendering. Combined with **pure functions**,
the model can answer:

- _Is part X complete? Is part Y partially complete?_
- _Part X.3 now needs completing **because** of the answer given in X.1._
- _All required information is present_ / _these things are still required_.
- _Given this page and this state, the next page is Z._

The hand-written `njk` pages and controllers **stay hand-written**. The model
**informs / navigates / constrains** them — it does not generate them.

**Decoupling proof:** one model + one set of pure functions must power all three
existing prototype journeys ([`linear`](../linear), [`task-list`](../task-list),
[`task-list-with-linear-tasks`](../task-list-with-linear-tasks)), which today
differ only in navigation and task-status presentation.

We don't yet know the best paradigm, so we spike **four** genuinely different
ones behind **one common contract** so they can be compared head-to-head and run
side by side.

| Option | Paradigm                                                     | Backlog                                                                  |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------------------------ |
| A      | Declarative config + selectors (evolve `sections.js`)        | [option-a-declarative-selectors.md](./option-a-declarative-selectors.md) |
| B      | Statechart / FSM (states + guarded transitions)              | [option-b-statechart.md](./option-b-statechart.md)                       |
| C      | Requirement-graph rules engine (data + derived requirements) | [option-c-rules-engine.md](./option-c-rules-engine.md)                   |
| D      | Schema-first (Zod / JSON-Schema as source of truth)          | [option-d-schema-first.md](./option-d-schema-first.md)                   |

Scope for this round: **car-insurance journey only**. The
[`Backlog.canvas`](../../Backlog.canvas) cross-domain bar ("works for Live
Animals **and** Car Insurance") is deferred to a later round, once a paradigm is
chosen.

## What exists today (start here before you spike)

`prototypes/shared/sections.js` is already a **proto-model**: an array of
sections, each with `collect` / `isComplete` / `rows` / optional `appliesWhen` +
`loop` / `subtasks` flags, plus pure selectors `applicableSections`,
`allSectionsComplete`, `applies`, `hasOwnRoutes`, `answerRows`, `sectionBySlug`.
It already drives all three variants.

What is **not** yet modelled or decoupled — the gap each spike closes:

- **Navigation** — next/prev is hand-written as callbacks (`onSaved` /
  `backLinkFor`) in each variant's `index.js`.
- **Task status** — `hubItems` / `groupStatus` compute Completed / In progress /
  Not started / Cannot start yet inline, per variant.
- **Field types & answer constraints** — scattered across `collect()` and the
  `partials/*.njk`. `shared/fields.js` knows 13 render `kind`s but there is **no
  constraint/validation layer**.
- **Conditional invalidation** — `driving-history.collect` manually clears
  `claims`/`claimsDone` when `hadClaims !== 'yes'`. There is no generic "when a
  part stops applying, drop it and clear its answers" hook.
- **Provenance** — nothing records _why_ a part is required.

(The real app under `src/server/**` uses per-page Joi schemas + hardcoded
`h.redirect()` + `@hapi/yar`, with no central flow model. Out of scope here, but
it's why the model must stay render-agnostic and framework-light: eventually it
informs hand-written controllers, it does not replace them.)

## Shared acceptance bar — every spike must meet all of these

Each spike is **self-contained** under `prototypes/model-spikes/<slug>/` and
registers its routes under a distinct base path (e.g.
`/prototype/spike-<slug>/...`) so **all spikes run at once** for side-by-side
comparison. Spikes **reuse the existing rendering** (the `njk` templates and
`shared/fields.js` macro args — rendering is allowed to be shared). What a spike
**owns** is: the model + the pure functions + the thin glue that drives
navigation / status / constraints from the model.

1. **One model powers all three variants.** The three journeys differ **only**
   in a small **journey-shape descriptor** passed into the pure functions:

   ```js
   { kind: 'linear' }
   { kind: 'hub' }
   { kind: 'grouped', groups: [{ title, stepIds: [...] }, ...] }
   ```

   All flow, status, completeness, applicability and constraint logic comes from
   the shared model.

2. **Zero rendering in the model.** No `njk` paths, macro args, CSS classes, or
   GDS tag colours in the model or the pure functions. Rendering hints (if any)
   live in a **separate adapter/annotation layer** keyed by field/step.

3. **Common contract.** Every spike implements the same function surface, so the
   four are swappable and comparable. `answers` is the plain quote-state object;
   `shape` is the descriptor above.

   ```js
   applicableSteps(answers)                 -> [stepId]
   status(answers, stepId|groupId, shape)   -> 'complete' | 'partial' | 'not-started'
                                               | 'cannot-start' | 'not-applicable'
   next(answers, currentStepId, shape)      -> stepId | { terminal: 'summary' | ... }
   prev(answers, currentStepId, shape)      -> stepId | { terminal: 'start' | 'hub' }
   missingRequired(answers)                 -> [{ stepId, fieldId, because: [provenance] }]
   applyAnswer(answers, stepId, payload)    -> answers'   // cascade-clears newly-inapplicable steps
   fieldsFor(stepId)                        -> [{ id, type, constraints }]
   validate(stepId, payload)                -> { ok, errors: [{ fieldId, message }] }
   ```

   - `type` is render-agnostic and covers at least: date, radio, multi-select,
     free text, boolean, number/currency, formatted-string (e.g. registration).
   - `constraints` are declarative (required, min/max, length, pattern, options)
     and `validate` is **derived** from them — no per-page validators by hand.

4. **Conditional + provenance proof.** Express the existing conditional
   (`claims` applies iff `hadClaims === 'yes'`) in the model. `missingRequired`
   must report the **reason** a part is required. Flipping `hadClaims` yes→no
   must drop `claims` and clear its data via `applyAnswer`, with **no**
   section-specific cleanup code.

5. **Surface the model without its UI.** A headless `node` script —
   `prototypes/model-spikes/<slug>/dump.js` — that, given an answers fixture,
   prints the journey state as JSON for each shape: applicable steps, per-step
   status, `next` / `prev`, and `missingRequired` with reasons. Proves the model
   is usable with no rendering at all. (The `Backlog.canvas` "surface the model
   without the associated UI" node.)

6. **Unit tests** on the pure functions — behaviour in/out, no server. Examples:
   - `next({ hadClaims: 'yes' }, 'driving-history', linear)` → `'claims'`
   - `next({ hadClaims: 'no' }, 'driving-history', linear)` → `'cover-type'`
   - status transitions not-started → partial → complete
   - `applyAnswer` cascade: set `hadClaims:'no'` ⇒ `claims` gone + data cleared
   - `missingRequired` includes a `because` provenance entry for a conditional.

7. **Integration proof.** The existing **Playwright demo suite** must pass when
   pointed at the spike's three rewired variants — proving the model drives the
   live journeys, not just the tests.

> **Stretch (optional)** — the canvas "horrible UI driven purely by config"
> node: a bare page auto-rendered entirely off `fieldsFor` / `status`, as extra
> evidence the model _can_ power rendering. Not required; the headless JSON dump
> in (5) is the canonical "surface without UI" proof.

## Folder convention

```
prototypes/model-spikes/<slug>/
  model/               the model definition + pure functions (the spike's IP)
  variants/            three thin wirings: linear, hub, grouped
  routes.js            registers /prototype/spike-<slug>/... (reuses shared njk)
  dump.js              headless "surface without UI" proof
  *.test.js            pure-function unit tests
  README.md            what this spike is, how to run it, self-scoring notes
```

Reuse, do not fork: the existing `njk` templates, `shared/fields.js`,
`shared/store.js`, and the GDS partials. Only the model + pure functions + glue
are new.

## How to run side by side

`npm run prototype`, then open `/prototype`. Each spike appears as its own
entry; pick a spike, then a variant. All four spikes coexist because each owns a
distinct base path.

## Comparison rubric (scored after the spikes land)

Score each spike **1–5** per dimension, with a one-line note:

| Dimension                 | What we're judging                           |
| ------------------------- | -------------------------------------------- |
| Decoupling purity         | Any rendering leak into the model?           |
| Conditional + provenance  | How cleanly does "X.3 because X.1" fall out? |
| Navigation rigour         | next/prev correctness; no dead-ends          |
| Constraint/type modelling | The canvas "field config comparison"         |
| Add a new question        | Effort + blast radius                        |
| Add a new conditional     | Effort + blast radius                        |
| Add a new journey shape   | Effort to add a 4th shape                    |
| Testability               | Ergonomics of the pure-function tests        |
| Glue size per variant     | Lines of variant-specific code               |
| Headless usability        | The JSON-dump ergonomics                     |
| Readability / onboarding  | Could a new dev follow it?                   |

## Mapping to `Backlog.canvas`

These spikes implement the canvas nodes: **Multiple model options** (the four
spikes), **First pass of a rule/state engine** (Options B and C), **First pass
of a model** (Option A), **Field config comparison** (the constraint/type
dimension + rubric), **First pass of unit tests** (acceptance bar item 6),
**Horrible UI driven purely by config** (the optional stretch), **Confirm all 3
journeys consistent** (acceptance bar item 1 + the Playwright proof). Deferred:
**works for Live Animals and Car Insurance** (cross-domain, next round).
