# Testing and verification

How to run the live-animals prototype's tests, what each layer of the regression net guards, and the rules and gotchas for writing new specs.

All commands run from the frontend repo root (`trade-imports-animals-frontend`).

## Running the tests

### Unit suite

```
npm run test:live-animals
```

Vitest runs every `*.test.js` under the prototype in well under a second (`TZ=UTC vitest run prototypes/standalone/live-animals --no-coverage`). The suite loads the whole module graph, and two specs run the boot guards directly: `obligation-purity.test.js` runs the model-purity check and `contract.test.js` runs `buildDispatch`, which coverage-asserts every obligation against each page's `collects` declaration. A mis-wired model fails the unit run — you do not need to start the server to find out.

### E2E suite

```
npm run test:prototype
```

Playwright, Chromium only, one config (`playwright.config.js` at the repo root) with **two projects** — this one command runs both:

- `prototype` — every prototype journey's demo walk, against a stub-mode server on port 3000. The live-animals net (`prototypes/e2e/live-animals.spec.js`) runs here, alongside the sibling prototype specs in the same folder.
- `parity` — `skeleton-vs-prototype-mongo.spec.js` only, against a **real**-mode server on port 3001.

The parity project drives the production skeleton journey (`src/server`) and this prototype against the same real backend and compares the two persisted notifications field by field — the browser-level proof of [the mapper](persistence.md). It sits in the normal suite on purpose: a persistence break must not hide behind a green demo run.

**The workspace stack must be up.** The real-mode server persists through the backend, Mongo and Redis. Start it with `scripts/stack/run-stack.sh` from the workspace. The `test:prototype*` scripts probe the backend first (`npm run check:workspace-stack`), so a stack-down run fails in a second with an actionable message rather than a web-server timeout.

Each script builds the frontend assets once, then starts both servers. The stub server on 3000 refuses to reuse an existing one — if a dev server is already holding the port, the run fails at startup. Kill the stale server first:

```
lsof -ti:3000 | xargs kill
```

The real-mode server on 3001 **is** reused if one is already answering, so a `npm run prototype:real` you keep running on `PORT=3001` is picked up.

To run one project, or filter by title:

```
npm run test:prototype:journeys              # demo project only
npm run test:prototype:parity                # parity project only
npm run test:prototype -- -g "live-animals"  # filter by title
```

The title filter matches this journey's own describe blocks — `live-animals (page-owned spine)` and `live-animals — country of origin without JavaScript`.

## The regression net

The net is layered: the model tiers prove the engine headlessly, the bridge and frontend tiers prove the seam and the controllers, and the E2E specs prove the rendered journey and the persisted result. Each tier is fast enough to run on every change.

### Model unit tiers (`model/**`)

The obligation model is pure and synchronous, so it is proven entirely in unit tests with no server:

- **Obligations** — `model/obligations/evaluator.test.js`, `evaluator.units.test.js`, `helpers.test.js`, `whitelists.test.js` and `coverage.test.js` pin the evaluator's scope, purge-to-fixpoint and implication output, the gate-helper factories, the exported whitelist arrays, and full obligation coverage.
- **Domain** — `model/domain/index.test.js` pins value-legality: enum option sourcing, predicate error codes and the address-block rules.
- **State queries** — `model/obligations/state-queries.test.js` and `is-blank-value.test.js` pin the group-invariant rules and the shared blank-check over evaluator output.
- **Analysis** — `model/analysis/reachability.test.js` and `coverage.test.js` pin the obligation-dependency reachability prover and its witness synthesis.
- **No display copy** — `model/no-display-keys.test.js` pins the rule that no obligation or domain entry carries a display key (`label`, `title`, `titleKey`, `hint`, `legend`, `widget`). `obligation-purity.test.js` runs the same assertion the server runs at boot.

### Bridge tier (`bridge/**`)

The bridge is the only door between the model and the hapi frontend. Its four specs pin the projections the controllers and templates depend on:

- `fulfilments.test.js` — nested answers ⇄ flat fulfilments, composite-key ↔ positional-path conversion, value pass-through and animal-count coercion.
- `scope.test.js` — the in-scope path-key set the controllers read.
- `status.test.js` — the five status constants (`NA`, `NOT_STARTED`, `IN_PROGRESS`, `FULFILLED`, `OPTIONAL`) and the completeness projection.
- `collection-complete.test.js` — per-instance completeness for the collection views.

### Engine tier (`engine/**`)

The hapi/session/records engine wraps the model behind the store the controllers call. Its specs pin the runtime seam: the store contract and commit/purge authority (`store-contract.test.js`, `commit-purge-authority.test.js`, `write-through-per-commit.test.js`), read and scope (`read.test.js`), submit finalisation (`submit-is-finalise.test.js`), the journey lifecycle (`journey.test.js`, `journey-user-assoc.test.js`), resume self-heal, one-load-per-request memoisation and the collection view (`evaluate/collection-view.test.js`).

### Flow tier (`flow/**`)

`dispatch.test.js` and `gates.test.js` pin the obligation→page index and the page/section gates; `task-rows.test.js`, `run.test.js` and `opening-run.test.js` pin the hub rows, section status and the opening linear run.

### Reachability provers (`analysis/**`)

`analysis/flow-reachability.test.js` and `simulate.test.js` pin the page-level reachability check: every in-scope obligation must have an owning page, and that page must be reachable across the enumerated scope states. This is distinct from the obligation-dependency prover under `model/analysis/`.

### Feature controller tier (`features/**`)

Each page's controller has a spec that drives its real GET/POST handler headlessly and asserts on the rendered context or the committed answers — origin, CPH number, import reason and purpose, additional details, declaration, dashboard, confirmation, the commodities pages (`search`, `consignment-details`, `animal-identification`), the addresses pages (`controller`, `create-address`, `party-picker`), documents (`controller`, `upload-config`), transport (`port-of-entry`, `transit-countries`) and check-answers.

### Services tier (`services/**`)

The persistence and reference-data services are proven against their ports:

- **Records** — `services/persistence/records/notification-mapper.test.js` pins both mappers; `skeleton-equivalence.test.js` pins, at unit level, that the mapper produces a notification equivalent to the production skeleton's; `records-port.test.js` and the `real.*` specs pin the backend REST client (null stripping, amend, resume scoping).
- **Session** — `services/persistence/session/*` pins the stub and the Redis/yar real port.
- **Reference data and uploads** — `address-book`, `document-uploads` (stub and real) and `run-mode` pin the MDM and upload services and the `stub`/`real` mode switch.

### The live-animals E2E spec

`prototypes/e2e/live-animals.spec.js` is this journey's browser-level net: a happy-path walk fed from `prototypes/standalone/live-animals/flow/fixtures/happy-path.json` that grows one leg per increment, plus per-section specs pinning gates, loops and validation in the rendered DOM — import type, the opening linear run, the hub, origin (including the no-JS plain select and the accessible-autocomplete enhancement), the commodities batch search and per-species counts, animal identifiers, the N-of-M identifier cap, import reason and purpose, accompanying documents and upload rejection, addresses and the party picker, the transport rows, CPH number, check-your-answers, change-from-CYA threading, declaration and confirmation, and the dashboard amend flow.

### The persistence-parity oracle

`prototypes/e2e/skeleton-vs-prototype-mongo.spec.js` is the top of the net. It drives BOTH journeys this frontend serves — the production skeleton (`src/server`) and this prototype — against the same real backend, strips the volatile fields, and asserts the two persisted notifications are equal. `skeleton-equivalence.test.js` pins the same claim at unit level against the mapper; this pins it through the real HTTP adapter, the real backend and Mongo. It runs in the `parity` project, so every change is parity-checked with nothing to opt into.

### Sibling prototype specs

The `prototype` project runs every spec in `prototypes/e2e/` except the parity spec, so `npm run test:prototype` also walks the sibling car-insurance prototypes (`journey.js` `JOURNEYS`) and the obligations-model specs under `prototypes/e2e/obligations/`. These exercise the shared engine and page-kit primitives on other journeys; they do not touch the live-animals model. Filter them out with `-g "live-animals"` when you only want this journey.

### Why the specs pin exact DOM

The E2E specs assert the rendered page — headings, roles, `govuk-*` classes, row text — not internal state. That is what makes refactors provably safe: a pure rename or restructure that changes no behaviour and no markup passes unchanged. If a "pure" refactor turns a spec red, it was not pure.

### Why the hub hint is also pinned in a unit test

The E2E specs navigate hub rows by **title** and never read the hint text, so hint copy has no E2E coverage. `features/hub/copy.test.js` renders the hub handler headlessly and pins the Check and submit row's hint, href and starting status. If a row's hint copy matters, pin it there.

## The boot-replication rule

The server boots the journey in `routes.js` by running, in order:

```
assertObligationPurity()
buildDispatch(dispatchPages)
configureRecords(records)
configureSession(session)
registerJourneyCookie(server)
```

Any spec that commits answers, builds scope, reads section status or drives a controller handler must replicate the configure steps in a `beforeAll`:

```js
beforeAll(() => {
  configureRecords(recordsStub)
  configureSession(sessionStub)
  buildDispatch(dispatchPages)
})
```

Readiness needs no boot setup:
`engine/readiness-config.js` statically uses
`flow/section-status.js`'s `readyForCheckYourAnswers`. Tests can call
`configureReadyForCheckYourAnswers` when they need to override that result.

The remaining setup is load-bearing:

- derived gates and section status read the dispatch index, and
  `flow/gates.js` refuses to answer before `buildDispatch()` has run because an
  empty index would silently gate every page out.
- the store reads and writes through the records and session ports, so a
  handler-driving spec must configure both to the stubs.

See `contract.test.js` for the pattern in use, and [architecture.md](architecture.md) for why these seams exist.

## Shared test helpers: engine/test-support.js

One module holds every shared fake. Import from it — do not hand-copy a stub into a spec.

| Helper                                             | What it gives you                                                                                                                                             |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stubH()`                                          | A Hapi response-toolkit stub. `view` records the last render into `captured.view`, so a spec can assert on the rendered context; `redirect` echoes its target |
| `journeyRequest(journeyId, overrides)`             | A request pinned to an existing journey via its cookie; pass `payload` or `params` in `overrides`                                                             |
| `recordingH()`                                     | A cookie-recording toolkit for session-seam specs: `calls` is the ordered log of writes, `cookies` the resulting jar                                          |
| `driveHandler(handler, { payload, seed, params })` | Mint a journey, save `seed`, invoke a real controller handler against the real store, and return before/after answers plus the response and captured view     |
| `postHandlerOf(featureModule)`                     | The single POST handler a feature declares                                                                                                                    |
| `postHandlerEndingWith(featureModule, suffix)`     | The POST handler whose path ends with `suffix`, for features with more than one POST route                                                                    |

The file is named `test-support.js`, not `*.test.js`, so Vitest never collects it as a spec.

### The seeding gotcha

When you seed a gated answer, keep its activating answer in place. Seeding `commercialTransporter` without `transporterType: 'Commercial'` puts it out of scope, so the first reconcile **correctly wipes it** — and your spec then fails for a reason that has nothing to do with what it tests. The same applies to any item-conditional field (seed a `commoditySelection` on the package-count whitelist before seeding that line's `numberOfPackages`) or any gated collection.

## The contract test

`contract.test.js` pins the binding the boot assertion cannot see. Boot checks that every obligation is **declared** by exactly one page's `collects`; the contract test checks each handler **honours** its declaration:

> The set of obligation ids a controller actually commits must equal its declared `collects`, minus system-populated obligations.

It drives every collecting page's real POST handler headlessly with a valid payload, then diffs the obligation ids newly written against `meta.collects` as sets.

Collections are measured against the **entry-append handler**. The documents list page declares `collects: ['documents']` and the commodities list page declares `collects: ['commodityLines']`, but the write that mints an entry's identity happens in the add sub-page's append handler — so that is the handler the contract drives.

When you mis-wire a field, the failing set diff names it:

- the handler commits a field outside its `collects` — the committed set has an extra id.
- a declared id is never written — the committed set is missing an id.

Either way the assertion output shows exactly which obligation drifted, on which page. If you add a field to a page, add it to that page's payload in the contract case — a valid payload must fill every committable collected id, or the "declared but never written" direction stops being exercised. The worked examples in [add-a-field.md](add-a-field.md) show this pin naming itself.

## Conventions and contributor gotchas

### Naming

Engine and controller specs use `describe('#functionName ...')` for the unit under test and `it('Should ...')` titles. Follow the pattern in `features/hub/copy.test.js` or `indexed.test.js`.

### Prove changes by running them

When you change model or engine behaviour, prove it against the running code: extend a spec so the change is demonstrated, run the suites, and for a doc or plan, apply-run-revert rather than reason from the code alone. The add-a-page and add-a-field guides were validated this way.

### The pre-commit hook

The repo's pre-commit hook runs a whole-tree `format:check`, lint and the full unit suite. Stray unformatted files elsewhere in the tree fail it even when your own change is clean. If you commit with `--no-verify`, you take on the hook's job by hand first:

```
npx eslint "prototypes/standalone/live-animals/**/*.js"
npx prettier --check "prototypes/standalone/live-animals/**/*.js"
npm run test:live-animals
npm run test:prototype
```

### Re-lint after formatting

Run eslint again after any `prettier --write`. Prettier re-wrapping a long line can trip an eslint rule (this has happened with `curly`), so a format-only pass is not automatically lint-clean.
