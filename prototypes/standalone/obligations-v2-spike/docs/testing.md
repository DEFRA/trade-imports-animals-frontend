# Testing and verification

How to run the spike's tests, what each layer of the regression net covers, and the rules and gotchas for writing new specs.

All commands run from the frontend repo root (`trade-imports-animals-frontend`).

## Running the tests

### Unit suite

```
npm run test:obligations-v2-spike
```

Vitest runs every `*.test.js` under the spike in well under a second. The suite loads the whole module graph, and two of its specs run the boot guards directly: `obligation-purity.test.js` runs the model-purity check and `contract.test.js` runs `buildDispatch`, which coverage-asserts every obligation against the pages' `collects` declarations. A mis-wired model fails the unit run — you do not need to start the server to find out.

### E2E suite

```
npm run test:prototype
```

Playwright, Chromium only (one project in `playwright.config.js` at the repo root). The suite covers every prototype journey, not just this spike. It starts its own server on port 3000 and refuses to reuse an existing one — if a dev server is already holding the port, the run hangs at startup. Kill the stale server first:

```
lsof -ti:3000 | xargs kill
```

To run only this spike's E2E tests, filter by title:

```
npm run test:prototype -- -g "obligations v2"
```

This matches both the shared-spec entry for this journey (labelled `standalone obligations v2 (page-owned spine)`) and the spike-only specs (titled `obligations v2 — ...`).

### Headless model inspector

```
npm run dump:obligations-v2-spike
```

Runs `dump.js`, which prints derived scope, the wiped set, per-section status and quote readiness for a fixture answers map — no server, no rendering. Edit the fixture to explore the model.

The fixture is deliberately messy. Do not tidy it. Two of its oddities are the whole point:

- driver 2's second claim is a windscreen claim with the provider **missing** — that one unanswered field is what drives `readyForQuote: false`, and `whyNotReady` shows the incompleteness rolling up claim → driver → section
- driver 2's third claim is an accident carrying a **stale** provider answer — the provider is out of scope for that claim, so the output shows it in `wiped`: field-level destruction inside an item, at full depth (see [scope-and-wipe.md](scope-and-wipe.md))

## The regression net

### Shared journey specs

Three specs in `prototypes/e2e/` (outside the spike folder) run against **every** prototype journey. This spike is one `JOURNEYS` entry in `prototypes/e2e/journey.js`, so it gets the same walk as every other implementation:

| Spec                                  | What it pins for each journey                                                                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `task-list-with-linear-tasks.spec.js` | The full walk, start page to confirmation                                                                                                      |
| `mandatory-fields.spec.js`            | Full name blocks save with a GDS error summary; every other About-you field is optional                                                        |
| `invalidation.spec.js`                | Changing claims to No removes the claims data, and a yes → no → yes round trip does not rehydrate it — a direct assertion of the wipe paradigm |

### Spike-only specs

Three more specs in `prototypes/e2e/` drive behaviour only this spike models:

| Spec                       | What it pins                                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `nested-drivers.spec.js`   | A loop inside a loop: two drivers hold independent nested claims, removing a driver destroys only that driver's subtree, and yes → no → yes on the collection does not rehydrate at depth |
| `item-conditional.spec.js` | Choosing Windscreen inside one claim reveals the approved-repairer question for that claim only                                                                                           |
| `hub-copy.spec.js`         | The named-driver hub row shows its authored hint in the real DOM, never an internal page id                                                                                               |

### Why the specs pin exact DOM

The specs assert the rendered page — headings, roles, `govuk-*` classes, row text — not internal state. That is what makes refactors provably safe: a pure rename or restructure that changes no behaviour and no markup passes both suites byte-for-byte unchanged. If a "pure" refactor turns a spec red, it was not pure.

### Why the hub hint is also pinned in a unit test

The shared journey specs navigate hub rows by **title** and never read the hint text, so hint copy has no shared-spec coverage. `t2-hub-copy.test.js` renders the hub handler headlessly and pins all three add-on hints, plus the fail-loud `addonCopy` throw for a dynamic section with no authored copy. `hub-copy.spec.js` backs one of those rows at browser level. If you add an add-on section, extend both.

## The boot-replication rule

The server boots the journey in `routes.js` by running, in order: `assertObligationPurity()`, `buildDispatch(dispatchPages)`, `configureReadyForQuote(readyForQuote)`. Any spec that commits answers, builds scope or reads section status must replicate the middle two in a `beforeAll`:

```js
beforeAll(() => {
  buildDispatch(dispatchPages)
  configureReadyForQuote(readyForQuote)
})
```

If you skip this, the engine throws — deliberately:

- every scope build (`state.get`, `state.commit`, and so on) computes `readyForQuote`, and the unconfigured default in `engine/read.js` throws rather than return a silent wrong answer
- derived gates and section status read the dispatch index, and `flow/gates.js` refuses to answer before `buildDispatch()` has run, because an empty index would silently gate every page out

See `store-ops.test.js` for the pattern in use, and [architecture.md](architecture.md) for why these seams exist.

## Shared test helpers: engine/test-support.js

One module holds every shared fake. Import from it — do not hand-copy a stub into a spec.

| Helper                                             | What it gives you                                                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stubH()`                                          | A Hapi response-toolkit stub. `view` records the last render into `captured.view`, so a spec can assert on the rendered context; `redirect` echoes its target |
| `journeyRequest(journeyId, overrides)`             | A request pinned to an existing journey via its cookie; pass `payload` or `params` in `overrides`                                                             |
| `recordingH()`                                     | A cookie-recording toolkit for session-seam specs: `calls` is the ordered log of writes, `cookies` the resulting jar                                          |
| `seedNamedDriver(port, journeyId, answers)`        | Seed answers through a persistence port with the named-driver add-on kept selected                                                                            |
| `driveHandler(handler, { payload, seed, params })` | Mint a journey, save `seed`, invoke a real controller handler against the real store, and return before/after answers plus the response and captured view     |
| `postHandlerOf(featureModule)`                     | The single POST handler a feature declares                                                                                                                    |
| `postHandlerEndingWith(featureModule, suffix)`     | The POST handler whose path ends with `suffix`, for features with more than one POST route                                                                    |

The file is deliberately **not** named `.test.js`, so Vitest never collects it as a spec.

### The seeding gotcha

When you seed collection answers, keep the activating answer in place. Seeding `drivers` without `addons: ['named-driver']` puts the collection out of scope, so the first reconcile **correctly wipes it** — and your spec then fails for a reason that has nothing to do with what it tests. `seedNamedDriver` exists to make this impossible for the drivers collection; apply the same thinking to any gated obligation you seed (for example, `hadClaims: 'yes'` before seeding `claims`).

## The contract test

`contract.test.js` pins the binding the boot assertion cannot see. Boot checks that every obligation is **declared** by exactly one page's `collects`; the contract test checks each handler **honours** its declaration:

> The set of obligation ids a controller actually commits must equal its declared `collects`, minus `renderOnly` (vehiclePhoto) and `system` (premium) obligations.

It drives every collecting page's real POST handler headlessly with a valid payload, then diffs the obligation ids newly written against `meta.collects` as sets.

Collections are measured against the **entry append handler**. The claims list page declares `collects: ['claims']` and the drivers hub declares `collects: ['drivers']`, but the write that mints an entry's identity happens in the add sub-page's append handler — so that is the handler the contract drives.

When you mis-wire a field, the failing set diff names it:

- the handler commits a field outside its `collects` — the committed set has an extra id
- a declared id is never written — the committed set is missing an id

Either way the assertion output shows exactly which obligation drifted, on which page. If you add a field to a page, add it to that page's payload in the contract case — a valid payload must fill every committable collected id, or the "declared but never written" direction stops being exercised. The worked examples in [add-a-field.md](add-a-field.md) show this pin naming itself.

## Conventions and contributor gotchas

### Naming

Engine and controller specs use `describe('#functionName ...')` for the unit under test and `it('Should ...')` titles. Follow the pattern in `t2-hub-copy.test.js` or `store-ops.test.js`.

### Prove changes by running them

When you change model or engine behaviour, prove it against the running code: extend a spec (or the `dump.js` fixture) so the change is demonstrated, run the suites, and for a doc or plan, apply-run-revert rather than reason from the code alone. The add-a-page and add-a-field guides were validated this way.

### The pre-commit hook

The repo's pre-commit hook runs a whole-tree `format:check`, lint and the full unit suite. Stray unformatted files elsewhere in the tree fail it even when your own change is clean. If you commit with `--no-verify`, you take on the hook's job by hand first:

```
npx eslint "prototypes/standalone/obligations-v2-spike/**/*.js"
npx prettier --check "prototypes/standalone/obligations-v2-spike/**/*.js"
npm run test:obligations-v2-spike
npm run test:prototype
```

### Re-lint after formatting

Run eslint again after any `prettier --write`. Prettier re-wrapping a long line can trip an eslint rule (this has happened with `curly`), so a format-only pass is not automatically lint-clean.
