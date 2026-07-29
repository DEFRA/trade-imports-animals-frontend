# Test approach

The whole picture on one page: what the tests are, how they split, and where a
new one goes. Deeper detail lives in [testing.md](testing.md) (how-to) and
[test-responsibility-matrix.md](test-responsibility-matrix.md) (who owns what) —
you shouldn't need them to get the idea.

## The layers

Fast and pure at the top, slow and real at the bottom. Everything above the
line is unit (no server); the E2E rows drive a real browser.

| Layer              | What it proves                                                                                                                                               | Command             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `model/**`         | The obligation engine — scope, purge-to-fixpoint, status roll-up. Pure, synchronous.                                                                         | `test:live-animals` |
| `bridge/**`        | Model ↔ frontend projection — fulfilment assembly, scope, status, notification mappers. Pure.                                                                | `test:live-animals` |
| `engine/**`        | The runtime seam — request store, session + records ports, commit/purge, journey lifecycle. Stubs the ports.                                                 | `test:live-animals` |
| `flow/**`          | Journey topology — the dispatch index, gates, sections, task-rows.                                                                                           | `test:live-animals` |
| `features/**`      | Each page's real GET/POST handler driven headlessly, asserting the rendered context or committed answers.                                                    | `test:live-animals` |
| `services/**`      | The MDM/persistence/upload ports against their stubs, plus network-boundary tests for the real clients.                                                      | `test:live-animals` |
| `contract.test.js` | Every page commits exactly the obligations its `collects` declares — the wiring guard.                                                                       | `test:live-animals` |
| E2E — journeys     | The promoted journey in Chromium against a stub-mode server on `:3000`, asserting real DOM.                                                                  | `test:e2e`          |
| E2E — a11y         | axe WCAG 2 A/AA scans of distinct page states.                                                                                                               | `test:a11y`         |
| `lint:arch`        | Static architecture gate (dependency-cruiser): imports point **down** `model < bridge < engine < flow < features`. Not a test runner, but fails CI like one. | `lint:arch`         |

`npm test` runs the whole unit suite with coverage; `npm run test:live-animals`
is the same specs scoped to the service, no coverage, faster for the inner loop.

## The two runtime modes

`LIVE_ANIMALS_MODE` (default `stub`) decides what backs the service seam:

- **stub** — canned data, no network. Stands the full UI up offline. Every unit
  test and the E2E run in stub mode.
- **real** — the live backend + reference-data (deploy config). `prime()` swaps
  the seeded data at boot.

How each layer gets its data:

- Unit and E2E import the service **interface** (`services/<name>/index.js`),
  which is backed by `stub.js`. One source — no test re-declares a dataset.
- The reference-data stubs (`countries`, `ports`) **seed from the committed
  `_capture/fixtures`**, the same canonical dataset the real system would
  return, so stub and real data can't drift.
- The **network-boundary tests** (`run-mode.test.js`, `services/*/real.test.js`)
  mock `fetch` and keep small **synthetic** payloads on purpose: they prove
  `prime()` _replaces_ the stub, which needs the fetched data to differ from it.
  Mock the network, never `vi.mock()` a first-party module.

## Where does my new test go?

- Field/page logic, validation, gating, redirects → a **feature controller**
  spec (headless GET/POST).
- Model or engine behaviour — scope, purge, status → the **model / bridge /
  engine** tier: pure, no server.
- Proving a new obligation is wired → it's already in **`contract.test.js`**;
  add its payload to that page's case.
- Rendered DOM, a full journey, a gate or loop in the browser → **E2E**.
- A real HTTP client — URL, headers, parsing, error handling → a
  **network-boundary** test (mock `fetch`).
- Behaviour that spans frontend / backend / tests-repo → check ownership in
  [test-responsibility-matrix.md](test-responsibility-matrix.md) before writing
  it twice.

Three rules the whole net leans on: test behaviour, not implementation; mock at
the network boundary, not the module boundary; a "pure" refactor that reddens an
E2E DOM assertion was not pure.
