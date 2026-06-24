# Option B — Statechart / FSM

> Agent-ready backlog. Read [`README.md`](./README.md) first — it owns the
> **shared acceptance bar** and the **common contract** every spike implements.
> This file only adds what's specific to Option B. Slug: `spike-b`.

## Goal & paradigm

Model the journey as a **statechart**: states (one per step) + **guarded
transitions** over a shared **answer context**. Navigation becomes first-class
and rigorous — `next` / `prev` _fall out of the machine_ rather than being
hand-coded. Conditional steps are **guarded states**; completeness is
**reachability of the `done` final state**. This spike stresses whether a flow
formalism is worth the ceremony for GDS journeys.

Use a small **hand-rolled interpreter** by default (≈100 lines, no dependency,
fully testable). XState is acceptable if the agent judges it clearer, but the
machine **definition must stay pure data** and contain **no rendering**.

## Model shape (concrete)

```js
// model/machine.js — pure data, no rendering
export const machine = {
  initial: 'about-you',
  context: {                       // declared answer schema (types + constraints)
    fields: {
      hadClaims:  { type: 'boolean', required: true },
      claimType:  { type: 'radio',  required: true, options: [...] },
      // ...one entry per answer, carrying type + constraints for the contract...
    }
  },
  states: {
    'about-you':      { on: { SUBMIT: 'your-vehicle' }, fields: ['fullName', 'email', 'dateOfBirth', 'postcode'] },
    'your-vehicle':   { on: { SUBMIT: 'driving-history' }, fields: ['registration', 'make', 'model'] },
    'driving-history':{
      fields: ['yearsNoClaims', 'hadClaims', 'penaltyPoints'],
      on: { SUBMIT: [
        { target: 'claims',     guard: { field: 'hadClaims', eq: 'yes' } },  // guarded
        { target: 'cover-type' }                                             // default
      ]}
    },
    'claims':         { kind: 'loop',  on: { CONTINUE: 'cover-type' }, item: { fields: ['claimType', 'claimAmount'] } },
    'cover-type':     { on: { SUBMIT: 'optional-extras' }, fields: ['coverType', 'voluntaryExcess'] },
    'optional-extras':{ on: { SUBMIT: 'addons' }, fields: ['extras'] },
    'addons':         { kind: 'subtasks', on: { SUBMIT: 'summary' } },
    'summary':        { type: 'final' }
  }
}
```

- **Transitions** are an ordered list per event; the first whose **guard** holds
  wins (default = no guard). Guards are declarative condition objects (`{ field,
eq }`, `{ all }`, `{ any }`) so they double as **provenance**.
- **`context.fields`** carries the type + constraint metadata the contract's
  `fieldsFor` / `validate` need — the machine is the single source of both flow
  _and_ answer schema.
- The journey **shape** parameterises how states compose into a presentation
  (see wiring) but the underlying transitions are shared.

## Contract implementation notes

The interpreter exposes a pure `transition(machine, stateId, event, context)` →
`nextStateId`. Build the contract on top:

- `next(answers, currentStepId, shape)` — run the machine's `SUBMIT`/`CONTINUE`
  transition from `currentStepId` with `answers` as context. For `hub` shape,
  override to `{ terminal: 'hub' }`; for `grouped`, follow transitions but stop
  at a group boundary → `{ terminal: 'hub' }`.
- `prev` — the machine is directional, so maintain a **reverse index** computed
  once from the static transitions (target → possible sources), then pick the
  source consistent with `answers`/guards. Cache it; keep the function pure.
- `applicableSteps(answers)` — the set of states reachable from `initial` to
  `final` under the current guards (a guard-filtered graph walk).
- `status(answers, stepId, shape)` — a state is `complete` when all its declared
  required `fields` are satisfied; `partial` when some are; `not-started` when
  none; `not-applicable` when unreachable under current guards. `cannot-start`
  for the `summary`/terminal until `final` is reachable (all required satisfied).
- `applyAnswer` — merge patch, recompute reachable states; for any state that
  drops out of reachability, clear its `fields` (generic cleanup — replaces the
  hand-written claims clearing).
- `missingRequired` — walk reachable states; for each unsatisfied required field
  attach `because` = the chain of guards that made the state reachable.
- `fieldsFor` / `validate` — read `context.fields` for the state's `fields`.

## Three-variant wiring

The three variants are three **compositions / projections** of the same machine:

- **linear** — drive the machine directly; `next`/`prev` are raw transitions.
- **hub** — wrap the steps as parallel children of a hub state; every `SUBMIT`
  returns to the hub; the hub's task list is `status` per child state.
- **grouped** — group child states into compound states (one per task group);
  `SUBMIT` advances within the compound state, then returns to the hub at the
  group's final.

Each variant's controller renders via the existing `njk` + `shared/fields.js`;
the GDS tag mapping for hub/grouped status lives in the variant adapter, not the
machine.

## Validation & portability

See [`validation.md`](./validation.md) for the shared design.

- **Keep the machine portable data.** XState machine config is JSON-serialisable
  and guards are condition objects — so author `machine.yml`/`.json`, no closures.
  If you use the XState library, the _definition_ must still dump cleanly to JSON
  in `dump.js`; guard/action _functions_ belong to the interpreter (the adapter),
  not the model.
- **Where validation hangs naturally:** page-slice validation is an **entry/exit
  action** or a guard on the `SUBMIT` transition (block the transition if the
  page is invalid); the full-object `assembleQuote` is the **guard on the
  transition into the `final` state** — you literally cannot reach `done` unless
  the assembled quote validates. That's an elegant fit; show it off.
- **Validation adapter: derive Joi** from the state's declared `fields` +
  `context.fields` constraints (same compile-from-data rule as the others). The
  holistic business rules become the `final`-transition guard.
- **Try both shape strategies** (two-shape vs one-shape) and record the trade-off.

## TODO checklist (ordered)

1. Scaffold `prototypes/model-spikes/spike-b/`; register `/prototype/spike-b/...`
   and add to the chooser.
2. Write the hand-rolled interpreter `model/interpreter.js`
   (`transition`, reachability walk, reverse index) — pure, unit-tested in
   isolation first.
3. Write `model/machine.js` — the full car-insurance journey as machine data,
   incl. the guarded `driving-history → claims` transition and the
   `context.fields` schema.
4. Implement the common contract in `model/contract.js` on top of the
   interpreter.
5. Wire `variants/{linear,hub,grouped}.js` as the three projections; reuse
   existing `njk`, `shared/fields.js`, `shared/store.js`. Keep loop/subtask
   navigation in the spike's own route handlers.
6. Write `dump.js` (headless JSON proof) for all three shapes.
7. Unit tests for the interpreter **and** the contract — README examples plus:
   guard selection, reverse-index `prev`, reachability after `applyAnswer`.
8. Point the Playwright demo suite at the three `spike-b` variants; make it pass.
9. Fill in `spike-b/README.md` with self-scoring notes against the rubric.

## Risks / watch-outs

- **Partial status & provenance are not native to FSMs.** The machine gives you
  flow for free but you must layer status/missing-required on top via the field
  schema + guard chains. Budget for this; it's where the paradigm fights back.
- **`prev` in a guarded graph is ambiguous.** Two sources can target one state;
  resolve deterministically using current `answers`, and test it.
- **Don't let XState (if used) leak rendering or framework concerns** into the
  machine definition. The definition must dump cleanly to JSON in `dump.js`.
- **Hub/grouped as machines can over-engineer.** If the compound-state modelling
  balloons, note it honestly in the rubric (effort-to-add-a-shape dimension) —
  that _is_ a finding.
