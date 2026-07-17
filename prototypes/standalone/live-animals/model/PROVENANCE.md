# Provenance — vendored obligation model (B)

Vendored copy of Paul's blended obligation model (**B**) from branch
`spike/EUDPA-288-blend-obligations-models` at sha `34550a3`, path
`prototypes/journey-config-spikes/EUDPA-249-flow-layer/`. Lifted
2026-07-17 by the `journey-builder` retrofit loop, `EUDPA-288` inc-005
(M1 — "lift the model in, dark").

**This subtree is dark.** Nothing in A imports it. A's own model
(`../engine/`, `../registry.js`, `../features/*/obligations.js`,
`../analysis/`) stays fully in place and wired; B sits beside it,
unreferenced, until the M3 cutover flips the barrel behind `MODEL=a|b`.
The only value it adds today is its own test suite, which runs green as
a set (the dependency tree is closed by execution — see
`../retrofit/SEMANTICS.md`).

## Files vendored

Source (relative structure preserved, so B's internal relative imports
resolve unchanged — `engine/index.js` → `../lib/is-blank-value.js` and
`../domain/index.js`, `domain/index.js` → `../obligations/obligations.js`,
`analysis/reachability.js` → `../obligations/helpers.js`):

- `obligations/evaluator.js`
- `obligations/helpers.js`
- `obligations/helper-internals.js`
- `obligations/obligations.js`
- `domain/index.js`
- `engine/index.js`
- `analysis/reachability.js`
- `engine/is-blank-value.js` (vendored under `lib/`; relocated to
  `engine/` at inc-006 — see DESIGN-DELTA §2)

Tests (portable, ran green once import paths resolved):

- `obligations/coverage.test.js`
- `obligations/evaluator.test.js`
- `obligations/evaluator.units.test.js`
- `obligations/helpers.test.js`
- `obligations/whitelists.test.js`
- `domain/index.test.js`
- `engine/index.test.js`
- `analysis/coverage.test.js`
- `analysis/reachability.test.js`
- `engine/is-blank-value.test.js` (relocated with its subject at inc-006)

i18n caveat (test-side only): `domain/index.test.js` imports
`../lib/i18n.js` for ~20 `t()` label assertions. Rather than drop those
assertions, `lib/i18n.js` + `locales/en.json` were vendored too, so the
test resolves as authored. i18n is a **test-only** dependency here — no
source file under `model/` imports it, so the model core stays
display-free. inc-007a strips the labels themselves later.

## Not lifted (presentation / wiring — discarded or replaced later)

`flow/`, `features/`, `routes.js`, `contract.js`, B's `.njk`,
`flow/boot-totality.js`, `lib/presentation.js`, `lib/field-widgets.js`,
`lib/build-field-descriptors.js`, and the rest of B's `lib/`. `locales/`
was lifted **only** for the i18n test caveat above.

## Note for later increments

`../retrofit/mapping.test.js`'s B side becomes **live-checkable** now
that B's `obligations/obligations.js` is vendored (it can import the real
manifest instead of a fixture). That is **not** wired here — a later
increment's job — recorded only so it is not forgotten.
