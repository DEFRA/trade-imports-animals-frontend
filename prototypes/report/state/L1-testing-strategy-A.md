# L1 — Side A ("live-animals"): Testing strategy and what the tests actually pin

Clone: `workareas/model-comparison/clone-live-animals` (HEAD b6ac2ed)
Root: `prototypes/standalone/live-animals/` + `prototypes/e2e/{live-animals,skeleton-vs-prototype-mongo}.spec.js`

---

## Headline

Side A's test suite is **behaviour-first and semantics-first, not UI-snapshot**. There is not a
single `toMatchSnapshot` and not a single Nunjucks render in the entire 64-file / 10,320-LOC unit
suite (verified: `grep -rln "toMatchSnapshot\|toMatchInlineSnapshot"` and `grep -rln "nunjucks"`
over `--include="*.test.js"` both return **empty**). Rendered HTML is asserted **only** in the 33
Playwright E2E tests, and even there via role/heading locators, not markup snapshots.

There are **three real drift guards** — a boot-time coverage assert, a commit contract test, and a
source-text purity guard — plus a genuine **whole-model property prover** (`analysis/reachability.js`)
that enumerates the model's scope space and proves no obligation is unreachable, with explicit
"has teeth" mutation self-tests. That prover runs against the **real registry**, not a fixture.

The honest counterweight: the guards cover the **model ↔ page ↔ handler** triangle and *nothing
downstream of it*. **The model → template and model → Check-your-answers seams have zero drift
guard**, and — for the template case — a guard is *structurally impossible* to write, because
A's obligations carry no `type`, no label, no widget. There is nothing in the model to conform
the UI to. Add a field, forget the `.njk`, forget the CYA row: the suite stays green.

And: **coverage is not measured at all**. `vitest.config.js:19` sets `include: ['src/**/*.js']` —
the entire `prototypes/` tree is outside the coverage instrument, and `test:live-animals` runs
`--no-coverage` anyway (`package.json:45`).

---

## 1. Inventory and level

| Level | Where | Count | What it actually exercises |
|---|---|---|---|
| Pure unit on the **engine**, synthetic model | `engine/evaluate/*.test.js`, `nested.test.js`, `item-conditional.test.js`, `indexed.test.js` | ~50 cases | Hand-built obligation forests injected through reconcile's test-only `forest` seam |
| Pure unit on the **live model** | `engine/evaluate/enclosing-complete.test.js`, `analysis/reachability.test.js`, `flow/*.test.js` | ~60 cases | The real 44-obligation registry |
| **Handler integration** (no HTTP, no render) | `contract.test.js`, `t2-hub-copy.test.js`, `features/**/*.test.js` | ~180 cases | Real controller handler + real engine + real store; the view is *captured as a context object* |
| **Cross-system equivalence** | `services/persistence/records/skeleton-equivalence.test.js` | 2 cases | Drives the REAL production `notification-client.js` and diffs its POST body against the prototype mapper |
| **Integration (opt-in, dark by default)** | `records/real.integration.test.js`, `session/real.redis.integration.test.js` | 11 cases | Live backend / testcontainers Redis — **skipped unless `LIVE_ANIMALS_IT` is set, and nothing sets it** |
| **Browser E2E** | `prototypes/e2e/live-animals.spec.js` | 33 tests | The rendered journey, role-based locators |
| **Browser E2E parity** | `prototypes/e2e/skeleton-vs-prototype-mongo.spec.js` | 1 test | Drives BOTH the legacy skeleton and the prototype into real Mongo, `expect(prototypeDoc).toEqual(skeletonDoc)` |

**The critical structural fact about the unit level:** `engine/test-support.js:42-60` — `driveHandler`
invokes the real handler with a **stub Hapi toolkit** whose `view()` merely records `{view, context}`:

```js
export const stubH = () => {
  const captured = {}
  return {
    view: (view, context) => { captured.view = { view, context }; return captured.view },
    ...
```

So every "controller test" on side A pins the **view model**, never the HTML. That is why
`t2-hub-copy.test.js` can assert `{ tag: { text: 'Completed', classes: 'govuk-tag--green' } }`
(t2-hub-copy.test.js:106-108) without a browser — and why the 32 `.njk` templates (1,499 LOC) have
**no unit coverage whatsoever**.

---

## 2. The drift guards — what genuinely fails when the model and the wiring diverge

### 2a. Boot coverage assert — MODELLED DECLARATIVELY

`flow/dispatch.js#buildDispatch` inverts the pages' `collects` declarations into an
obligation→page index at boot and asserts **totality and uniqueness** over every non-system
obligation at every depth. It is exercised three ways in `flow/dispatch.test.js`:

- `dispatch.test.js:72-81` — remove the `commodities` page from `dispatchPages` and boot throws
  `/collected by no page/` naming `commodityLines`.
- `dispatch.test.js:50-61` — two pages collecting one obligation throws `/collected by two pages/`
  naming `"a" and "b"`.
- `dispatch.test.js:28-48` — an obligation id carrying a path metacharacter throws.

This is the strongest guard in the suite and it is **derived from data**, not hand-listed: add an
obligation to any `features/*/obligations.js` and forget to collect it, and **the server will not
boot** and the unit suite goes red. Nothing is hand-maintained.

### 2b. The commit contract — DECLARATIVE ASSERTION, HAND-MAINTAINED CASE LIST

`contract.test.js` is the counterpart guard: boot checks the obligation is *declared* by a page;
the contract test checks the page's real POST handler *honours* the declaration.

```js
const committedIds = ({ before, after }) =>
  registry.all.map((o) => o.id).filter((id) => isAnswered(after[id]) && !isAnswered(before[id]))
// ...
expect(new Set(committedIds(result))).toEqual(new Set(committableCollects(collects)))
```
(contract.test.js:43-52, 177-179)

The *assertion* is fully derived (registry ∩ meta.collects, minus `renderOnly`/`system`). But the
**`cases` array is a hand-authored literal** (contract.test.js:54-162, 13 entries) plus 5 bespoke
tests for the collection/party pages. **Add a whole new page and omit its contract case and nothing
fails** — the boot assert still fires for an uncollected *obligation*, but the new page's
commit contract is simply unguarded. That is a real (and cheaply-fixable) hole: there is no
assertion that `cases.length === dispatchPages.length`.

Runtime case count: 5 `it(` + 1 `it.each` over 13 = **18 cases**.

### 2c. Source-text purity guard — MODELLED DECLARATIVELY

`obligation-purity.js` reads every `features/*/obligations.js` **as source text** and rejects any
import that is not another `obligations.js` or a reference-data service. Text-scan, not module-graph,
so it catches a forbidden import even in a feature the barrel forgot to assemble. Pinned in
`obligation-purity.test.js:10-12` (`expect(() => assertObligationPurity()).not.toThrow()`) plus 4
positive/negative predicate cases.

### 2d. The whole-model prover — MODELLED DECLARATIVELY, and self-tested for teeth

`analysis/reachability.js:1-6` imports **the real registry** (`import { registry, walkObligations }
from '../registry.js'`). `analysis/reachability.test.js` then:

- enumerates the model's finite scope space — `expect(enumerateScopeStates()).toHaveLength(24)` (:22)
- proves no owed obligation is unreachable — `expect(proveReachability()).toEqual([])` (:26)
- proves no orphaned roots — `expect([...orphanedRootIds]).toEqual([])` (:42)
- **and proves the prover bites**: inject a `pagesFor` that drops the commodities page and assert
  the prover reports `owning-page-unreachable-in-scope` for `commodityLines[0].numberOfPackages`
  (:61-75)

This is the single most distinctive thing in A's suite. It is a **model-property test**, not an
example test — it is recomputed from the model on every run, so a new obligation that no reachable
page owns fails it automatically. Nothing on the config side of the argument is a prerequisite for
this: it works precisely *because* the model is inert data the engine can enumerate.

---

## 3. What the tests pin — model semantics vs rendered HTML

### Model semantics, at unit level

`engine/evaluate/cross-frame.test.js` (18 cases, 348 LOC) is the purest model test. It builds
**synthetic obligation forests as plain JS literals** and injects them through reconcile's
test-only `forest` seam:

```js
const permanentAddress = {
  id: 'permanentAddress', required: true, wipeOnExit: true,
  activatedBy: { obligation: commoditySelection, frame: 'enclosing', includes: ['cat','dog','ferret'] }
}
```
(cross-frame.test.js:9-18)

and then pins *exact-path* scope and wipe:

```js
expect(inScope.has('commodityLines[0].animalIdentifiers[0].permanentAddress')).toBe(true)
expect(inScope.has('commodityLines[1].animalIdentifiers[0].permanentAddress')).toBe(false)
```
(cross-frame.test.js:56-61)

It covers per-instance no-sibling-leak, field-level wipe at exact path, depth-2 two-frames-out
resolution, `notInUnionOf` union derivation by reference, and the wipeOnExit-guards-requiredOneOf
interaction (:279-287). These are **semantics tests**. They would catch an engine regression
instantly.

The live-carrier counterpart is `engine/evaluate/enclosing-complete.test.js:2-7`, which imports the
**real** `commodityLines` / `animalIdentifiers` obligations and pins the resolver-unity invariant
(completeness must resolve enclosing gates exactly as scope does) against the running model.

### Model semantics, through the browser

A's E2E is **not** UI snapshotting. The test titles are model statements and the assertions observe
model behaviour through the DOM:

- `live-animals.spec.js:1879` — *"commercial transporter — owed only for the commercial type;
  changing the type wipes a saved transporter"*, whose closing assertion is
  `await expect(page.getByRole('radio', { checked: true })).toHaveCount(0)` (:1945) — i.e. the
  wipe is observed as *the absence of a pre-selected answer*.
- `:1008` — the N-of-M cap (`maxEntriesFrom`) enforced in the browser, plus the count-drop block.
- `:2047` — `transitedCountries` routed only for rail/road; changing the means wipes saved countries.
- `:2333` — `anyItem`-gated CPH page appears only when a CPH-triggering commodity line exists.
- `:1107`, `:2161` — `enforcedAt: 'submit'` observed as "a blank save leaves the task open".

Locators are role/heading-based throughout (`getByRole('radio', …)`, `getByRole('heading', …)`), so
this is accessibility-tree behaviour testing, not markup pinning. `docs/testing.md:98-100` claims the
specs "pin exact DOM … byte-for-byte" — that overstates it slightly; they pin the *accessible* DOM.

### The one place copy is pinned

`t2-hub-copy.test.js` (13 cases) pins the hub's **presentation vocabulary** through the view model:
group captions (`'1. About the consignment'` … :59-66), row titles, and the GDS tag mapping
(`{ text: 'Cannot start yet', classes: 'govuk-task-list__status--cannot-start-yet' }` :117-120).
`docs/testing.md:102-104` is candid about why this exists: *"The E2E specs navigate hub rows by
title and never read the hint text, so hint copy has no E2E coverage."* That is an honest patch over
a known gap, not a strategy.

### The persistence pin — the strongest cross-system assertion on either side

`skeleton-equivalence.test.js` imports the **production** `src/server/common/clients/notification-client.js`,
feeds it the skeleton's own per-key session shape, stubs `fetch` to capture the exact JSON body it
would POST, and asserts:

```js
expect(mapperAPayload).toEqual(skeletonPayload)
```
(skeleton-equivalence.test.js:227, and again at :236 for the two-species summing case)

`prototypes/e2e/skeleton-vs-prototype-mongo.spec.js:397` does the same claim end-to-end through two
real browser journeys into real Mongo: `expect(prototypeDoc).toEqual(skeletonDoc)`. It runs as its
own Playwright project inside the normal suite (`playwright.config.js:64-73`) precisely so it cannot
be forgotten — `docs/testing.md:28`: *"when it had a config and a command of its own it was easy to
forget, and a persistence bug hid behind two green suites."*

---

## 4. What A's tests would NOT catch

These are the load-bearing negatives, verified in code.

| Change | Caught? | Why |
|---|---|---|
| Add obligation, no page collects it | **YES** — boot crash + `dispatch.test.js:72` | Derived coverage assert |
| Page declares `collects` but handler never commits it | **YES** — `contract.test.js` set diff | Derived assertion |
| Handler commits an id it doesn't declare | **YES** — same set diff | Derived assertion |
| `obligations.js` imports the engine / a validator / a template | **YES** — `obligation-purity.js` text scan | Derived |
| Add a **whole page** and forget its contract case | **NO** | `cases` is a hand-written literal (contract.test.js:54) |
| Add a field, forget the **`.njk` input** | **NO** | Unit suite never renders a template; contract test posts a synthetic payload straight to the handler |
| Add a field, forget the **CYA row** | **NO** | CYA rows are hand-composed (`row('Exporter reference', answers.exporterReference, 'exporterReference')`, add-a-field.md:108) and hand-asserted; there is no "every in-scope obligation has a CYA row" totality test — all 29 CYA cases are hand-authored per-row expectations |
| Add a field, forget the **notification mapper** | **NO** | The skeleton parity pin only covers the *skeleton's* field set; a new field simply doesn't appear |
| A rendered widget contradicts the model's intent | **STRUCTURALLY UNTESTABLE** | An obligation carries no `type`, no label, no widget (docs/obligation-model.md). There is nothing to conform the UI *to* |

`docs/add-a-field.md:11-12` states the position plainly and without spin:

> "You author the rendering, the validation, the persistence wiring and the Check your answers row
> by hand. That is the paradigm's deliberate inversion."

And `docs/add-a-field.md:138-141` claims *"declare-but-don't-wire drift is caught by the suite, not
by review"* — which is **true only for the commit seam**. Steps 3 (render) and 4 (CYA row) of the
five-place recipe have no guard at all. The doc's own step ordering makes this visible: only step 5
is "named for you by a failing test".

---

## 5. Coverage, and what is dark

- **Coverage is not measured on the prototype at all.** `vitest.config.js:15-19`:
  `coverage: { provider: 'v8', … include: ['src/**/*.js'] }` — `prototypes/**` is outside the
  instrument. And `package.json:45` runs `test:live-animals` with `--no-coverage`. There is no
  threshold, no gate, no number. 526 tests, zero measured coverage.
- **11 of the 526 cases never run.** `services/persistence/it-mode.js` is two lines:
  ```js
  const mode = process.env.LIVE_ANIMALS_IT ?? 'stubs'
  export const runsIt = (kind) => mode === kind || mode === 'all'
  ```
  `records/real.integration.test.js` (6 cases) is `describe.skipIf(!runsIt('real'))` and
  `session/real.redis.integration.test.js` (5 cases) is `describe.skipIf(!runsIt('testcontainer'))`.
  A repo-wide grep for `LIVE_ANIMALS_IT` finds it **only** in those two files and it-mode.js —
  **no npm script, no CI job, no Playwright config sets it.** Both integration suites are dark.
- Only **5 of 64** test files use `vi.mock` / `vi.fn` at all. The suite is overwhelmingly
  real-object, and where it does mock (skeleton-equivalence) it mocks at the *network boundary*
  (`vi.stubGlobal('fetch', …)`, skeleton-equivalence.test.js:208-214), not the module boundary.
  That is a genuinely good property and it should survive into any third option.
- The **E2E is stack-dependent**: the `parity` project needs the whole workspace stack (backend,
  Mongo, Redis) up. `check:workspace-stack` probes it first and fails fast rather than timing out
  (playwright.config.js:20-24). Real, but it means the top of the net cannot run in a bare checkout.

---

## 6. Docs-vs-code disagreement (a finding in its own right)

`docs/limits.md` is **stale against the code it describes**:

- limits.md:16 — *"`complete.js#entryComplete` does not yet resolve enclosing gates (a required
  enclosing-gated field would be treated as owed even off-gate)"*. **False now.**
  `engine/evaluate/enclosing-complete.test.js` (9 cases) pins exactly that resolution against the
  live carrier, and case (a) at :20-26 asserts `permanentAddress` is *not* owed on an off-gate
  (Horse) unit.
- limits.md:16 — *"proven … but with SYNTHETIC obligations — no live carrier is registered until
  inc-033..035"*. **Stale.** enclosing-complete.test.js:2-7 imports the live `animalIdentifiers`.
- limits.md:26 — *"Depth-2 nesting … The surviving `commodityLines` is depth-1."* **Stale.**
  `animalIdentifiers` is a live depth-2 carrier and contract.test.js:248-280 drives an append at
  depth 2.

The direction of the error matters: the docs **under-claim**. The code is better than limits.md
says. But it means limits.md cannot be trusted as the honest-limits register any more, which is
awkward given that is its whole job.

---

## 7. Verdict for the comparison

**What A's testing strategy has that is genuinely asymmetric:**

1. A **whole-model property prover** over the real registry with mutation self-tests
   (`analysis/reachability.js` + 7 cases). This proves *absence* — no dead ends, no orphaned roots
   — across an enumerated 24-state scope space. It is the only thing in either candidate that
   proves a universal, and it is cheap to keep because the model is inert enumerable data.
2. A **cross-system equivalence pin** (skeleton-equivalence at unit level, skeleton-vs-prototype-mongo
   through two browsers into Mongo). Nothing about the model makes this possible — it's a
   consequence of A having built the real persistence — but it is the only test on either side that
   proves the prototype and the incumbent service agree byte-for-byte.
3. **Zero snapshots.** Not one. The suite cannot rot into "accept the new golden file".

**What A's testing strategy structurally cannot do:**

- It **cannot test model→UI conformance**, because the model holds no copy, type or widget. There
  is no i18n-coverage test and there cannot be one; there is no field-widget derivation test and
  there cannot be one. If B has a coverage/whitelist test that fails when a config field gains no
  label or no widget, **A has no equivalent and cannot grow one without first putting `type`/`label`
  on the obligation** — which is precisely the design decision A made in the opposite direction.
  This is the single clearest asymmetric capability gap on this dimension, and it is *structural*.

**Cost of adopting A's testing assets into a third option:**

- The reachability prover (215 LOC + 77 LOC test) is **portable to any model that is enumerable
  data**. It needs: a walkable obligation catalogue, a `reconcile(answers) → inScope` function, and
  an obligation→page resolver. B's model (data-shaped obligations + evaluator) plausibly satisfies
  all three. **Low cost, high value — put it on the shopping list.**
- The buildDispatch coverage assert is **only meaningful under the page-owned-spine inversion** —
  it exists because pages declare `collects` and the model does *not* name pages. In a config-driven
  model the page↔field binding is already in the config, so the assert is trivially true by
  construction and buys nothing. **Do not port it; port the *idea* (a boot-time totality assert)
  and re-aim it at whatever seam the third option leaves hand-wired.**
- The contract test is portable and cheap, but its hand-maintained `cases` array is a defect —
  in a third option, derive the case list from the page registry and assert coverage of it.
- The `driveHandler` / `stubH` harness (69 LOC) is the reason A's 526 tests run "in well under a
  second" (docs/testing.md:15). Worth keeping in any option.

**What A must take from B on this dimension:** a coverage/whitelist test class that fails when the
model grows a field the *presentation layer* has not accounted for. A cannot build one today. That
is the price of the inversion, and the tests make it visible.
