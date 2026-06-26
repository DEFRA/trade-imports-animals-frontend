# Spike B — Statechart / FSM

> Read [`../README.md`](../README.md) + [`../validation.md`](../validation.md),
> then [`../option-b-statechart.md`](../option-b-statechart.md).

The journey is a **statechart** ([`model/machine.json`](./model/machine.json),
portable data): states + **guarded transitions** over a shared answer context,
plus a `context.fields` schema. A ~70-line hand-rolled interpreter
([`runtime/interpreter.js`](./runtime/interpreter.js)) is the only thing that
executes — navigation _falls out of the machine_ rather than being hand-coded.

## Layout

```
model/machine.json     the machine — DATA (states, guarded transitions, context.fields)
runtime/interpreter.js transition / realizedPath / reverseIndex / prevState (pure)
runtime/contract.js    the common contract built on the interpreter
routes.js, dump.js, fixtures/, *.test.js, README.md
```

Validation reuses the shared derive-Joi core ([`../shared/joi.js`](../shared/joi.js))
and the shared assemble/transform core ([`../shared/domain.js`](../shared/domain.js)),
fed from `context.fields`; the variant reuses the shared harness. Only the
contract differs from the other spikes.

## Run it

```bash
node prototypes/model-spikes/spike-b/dump.js with-claims
npm test
SPIKE_BASE=/spike-b npm run test:prototype
```

## Findings

- **What fell out for free:** `next`/`prev` are pure machine reads —
  `transition` for next, a `reverseIndex` + guard re-check for `prev` (which is
  genuinely ambiguous: both `claims` and `driving-history` target `cover-type`,
  resolved against the answers). `applicableSteps` is the realised path.
- **What the FSM does _not_ give you** (the paradigm fighting back, as the
  backlog warns): partial status and provenance are not native. Completeness is
  layered on `context.fields` exactly like Option A, and `because` is
  reconstructed from the **guard on the incoming transition** (`incomingGuard`).
  So the machine buys rigorous flow but you still build the status/provenance
  layer yourself.
- **Validation hangs naturally on transitions:** page-slice validation is the
  gate on a `SUBMIT` (block the transition if the page is invalid) and
  `assembleQuote` is the guard into the `final` state — you cannot reach `summary`
  unless the assembled quote validates. Implemented as the CYA hard-submit gate.
- **Anything code-only?** No part of the _machine_ needs a closure (guards are
  condition objects, JSON-serialisable). Same two adapter caveats as A
  (loop/subtask completeness; answered-but-empty). Same business-rule boundary
  (premium / external lookups stay adapter code).
- **Two-shape vs one-shape:** identical conclusion to A — store form-shaped,
  transform at the `final` guard. The FSM makes the "validate on the way to done"
  story cleaner, but doesn't change where the transform sits.

## Self-scoring against the rubric (1–5)

| Dimension                 | Score | Note                                                                       |
| ------------------------- | :---: | -------------------------------------------------------------------------- |
| Decoupling purity         |   5   | Machine is pure data; no rendering in states or guards.                    |
| Portability               |   4   | JSON-serialisable machine; status/provenance still adapter-side.           |
| Conditional + provenance  |   3   | `because` is reconstructed from the incoming guard, not authored.          |
| Navigation rigour         |   5   | **Best here** — transitions + reverse-index `prev`; ambiguity resolved.    |
| Constraint/type modelling |   4   | `context.fields` is a clean single schema; date stays special-cased.       |
| Validation ergonomics     |   4   | Elegant "guard into final" framing; same derived Joi as A/C.               |
| Add a new question        |   4   | Add a field + list it on a state; flow unaffected.                         |
| Add a new conditional     |   4   | Add a guarded transition branch — readable, but you edit the graph.        |
| Add a new journey shape   |   3   | hub/grouped are projections in the harness; a 4th means new cases there.   |
| Testability               |   5   | Interpreter unit-tests in isolation; pure transition/reachability.         |
| Glue size per variant     |   5   | Wiring is inline in `routes.js` (~10 lines).                               |
| Headless usability        |   5   | `dump.js` prints the realised path + status + nav for all shapes.          |
| Readability / onboarding  |   3   | Statechart vocabulary (states/guards/reverse index) is a step up for a new |
|                           |       | dev vs A's "config + selectors".                                           |

**Headline:** the navigation champion — flow is first-class and `prev` is
principled. The cost is ceremony: status and provenance aren't native to FSMs,
so you build them on top, and the machine is more to learn than A's config.
