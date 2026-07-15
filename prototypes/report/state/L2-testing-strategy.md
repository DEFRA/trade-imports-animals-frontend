# L2 — Testing strategy and what the tests actually pin

**A** = live-animals (Sam), clone-live-animals @ b6ac2ed, `prototypes/standalone/live-animals/`
**B** = flow-layer (Paul), clone-flow-layer @ d59b432, `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

**VERDICT: MIXED** — and the mix is structural, not cosmetic.

B's *model* is more testable. A's *suite* currently guards the one seam both models share, and
guards it better. Neither dominates, and the split falls exactly along the paradigm line.

---

## 0. The headline, stated so it can be attacked

The standing prior — "B's obligations model is better, possibly in every respect" — **survives on
this dimension, but not intact**.

**Confirmed:** B can express a whole *class* of test that A structurally cannot (model → rendered
widget conformance), because B's UI is a pure function of the model and A's is hand-authored. A
cannot grow that test without first putting `type`/`label` on the obligation — i.e. without undoing
the inversion that defines it. That is a real, permanent asymmetry, and it is the price of A's
design.

**Refuted:** on the seam *both* models have — "every obligation the model owes is actually asked
for somewhere" — **A's guard is strictly stronger, and B's architecture creates the nastier failure
mode.** A asserts totality over every obligation at every depth and **crashes the server at boot**
(`flow/dispatch.js:32,47,62`). B gates that seam **only for depth-1 commodity-line leaves**
(`features/commodity-lines/controller.test.js:66-80`). On B, an obligation that is in the manifest,
wired to domain, mandatory and in scope, but never `presents`-ed in `flow.js`, is invisible to
`journeyState` (which walks the *flow* tree, `engine/index.js:583-590`), contributes to no status,
is asked on no page — and **not one of B's 566 tests fires**. The hub still reads all-Completed.
That is a silently-unaskable mandatory field, and it is caused by B's decision to make the flow tree
the spine for status.

So: **B is more testable; A is better tested where it counts most.** Neither side has earned the
right to be copied wholesale.

---

## 1. What is genuinely symmetric (and should be said before the differences)

Two facts kill the lazy narratives before they start.

**Neither side snapshots the UI.** `grep -rln "toMatchSnapshot\|toMatchInlineSnapshot\|__snapshots__"`
over `prototypes/` returns **empty on both clones** — verified independently in this pass. Neither
suite can rot into "accept the new golden file". B's `dump.test.js:1-5` calls itself "snapshot
tests" and is lying — it is 3 hand-written field assertions. A's `docs/testing.md:98-100` claims the
E2E pins "exact DOM ... byte-for-byte" and is also overstating — the specs are `getByRole`-based, so
they pin the *accessible* DOM. Both docs oversell in the same direction; both codebases are cleaner
than their docs.

**Neither side measures coverage.** Byte-identical failure:

| | A | B |
|---|---|---|
| `vitest.config.js` coverage `include` | `['src/**/*.js']` (:19) | `['src/**/*.js']` (:21) |
| thresholds | none | none |

**1,021 test cases across both prototypes and zero instrumented lines on either.** Both trees sit
outside their own coverage config. A additionally runs `test:live-animals` with `--no-coverage`
(`package.json:45`). This is a one-line fix on both sides and neither took it. Do not let either
side claim rigour it has not measured.

---

## 2. Counts, verified in this pass (not taken from L1)

| | A | B |
|---|---:|---:|
| Unit/integration test files | **64** | **23** (+3 frozen-ancestor, +1 Playwright) |
| `it(`/`test(` declaration sites | **526** | **495** (566 runtime, `NEXT.md:17`) |
| Test LOC | 10,320 | 9,622 live (+2,136 ancestor) |
| Test : source LOC | 1.24 : 1 | 1.22 : 1 |
| Snapshot assertions | **0** | **0** |
| Sites that never touch HTML | ~493 (all unit) | ~377 of 495 (76%) |
| Real-browser tests | **33** (+1 Mongo parity) | **2** |
| Dedicated flow-layer tests | **79** (`flow/*.test.js` × 5 files) | **0** (`flow/flow.js`, 667 LOC, no test file) |

Two counting traps that matter:

- **B's `e2e-*.test.js` files are not browser tests.** They are vitest `server.inject`. B's real
  browser coverage is **2 Playwright tests over 1 journey variant** (`e2e/journey.js:23-29`).
- **18% of B's test LOC tests a frozen ancestor** (`model-spikes/obligations-v4-model/`), and
  `evaluator.units.test.js` is **byte-identical** to its fork — 760 LOC / 61 declarations executed
  twice on every `npm test`. Any retrofit deletes that tree; it does not port it.

---

## 3. What each side's tests actually pin

### A — the view model, never the template

Every "controller test" on A runs the **real handler against the real engine and store** with a stub
Hapi toolkit that captures `{view, context}` (`engine/test-support.js:4-15`, `:42-60`). So ~180
controller/CYA/hub cases pin the **view model**. The suite never boots Hapi and never renders
Nunjucks — which is why it runs "in well under a second" (`docs/testing.md:15`) and why **32 `.njk`
templates / 1,499 LOC have zero unit coverage**. Rendered HTML is asserted only in the 33 Playwright
tests, via role/heading locators — so even A's E2E pins model semantics *observed through the
accessibility tree* (a wipe seen as "no radio pre-selected", `live-animals.spec.js:1945`).

### B — the model, and the model's shadow on the DOM

~76% of B's declarations never touch HTML. The 73 raw `toContain` probes in `routes.test.js` are not
layout pinning — every one is a proxy for a model decision reaching the DOM (`:377` scope-driven
hide, `:339-340` computedEnum filtering, `:399-402` widget derivation, `:560-566` POST-error value
preservation). And B's engine tests run on a **7-obligation synthetic fixture with no manifest
coupling at all** (`engine/index.test.js:20-57`) — possible only because the engine is 15 pure
functions taking `(obligation, state, domain)` explicitly.

**On "what do they pin", these two are closer than the framing suggests.** Both are semantics-first.
Neither is UI-snapshotting. The interesting difference is not *what* they pin but **what they are
able to pin at all** — §4.

---

## 4. The structural asymmetry (the deliverable)

### 4a. B can test model → UI conformance. A cannot. This is permanent.

B's rendered field is a **pure function of the model**:

```
buildFieldDescriptors(page, state)   build-field-descriptors.js:58-110
  → domain.get(obligation.id)        → entry.type
  → pickWidget({obligation, entry, options, ...})   field-widgets.js:337
  → rules dispatch on entry.type     :82 enum→checkboxes  :115 enum→radios  :150 enum→select
                                     :199 address  :273 date  :298 integer  :318 text
  → one generic template             partials/fields.njk
```

So B can unit-test "an `enum` with >5 options must render a select, not radios"
(`lib/field-widgets.test.js`, 8 sites) and `routes.test.js:399-402` can assert the derived
`name="commercialTransporter__addressLine1"` reaches the DOM. **That test exists because the fact
exists in the model.**

A's obligation carries **no type, no label, no widget** (at most 11 keys — `docs/obligation-model.md`).
`docs/add-a-field.md:8-14` says it without spin:

> "The model never renders. Declaring an obligation buys you the state-layer behaviour only... You
> author the rendering, the validation, the persistence wiring and the Check your answers row by
> hand. That is the paradigm's deliberate inversion."

**There is nothing in A's model for a rendered input to conform to.** The i18n-coverage /
field-widget-derivation class of test is not merely unbuilt on A — it is *inexpressible*. To make it
expressible you must add `type` to the obligation, which is the inversion A exists to make. This is
the single clearest structural finding on this dimension and it goes to B.

**The consequence is worse than a missing test.** On A, "add a field, wire the handler, forget the
`.njk` input" produces a field the user can never answer — and **the whole suite stays green**
(unit suite never renders — `grep -rln 'nunjucks' --include='*.test.js'` → empty; `contract.test.js`
posts a synthetic payload straight to the handler, `:65-70`). The only net is E2E, and only if the
field is *required* and an E2E spec tries to complete that task. An **optional** forgotten field is
caught by nothing. On B, that failure mode **cannot occur** — there is no per-field template to
forget.

### 4b. A guards obligation → page totality at every depth, at boot. B guards depth-1 only.

A's `buildDispatch` inverts every page's `collects` declaration into an obligation→page index and
asserts totality + uniqueness over `walkObligations()` — **every obligation at every depth**:

```
flow/dispatch.js:32   for (const { templatePath, obligation } of walkObligations())
flow/dispatch.js:47   `Obligation "${id}" is collected by two pages: ...`
flow/dispatch.js:62   `Obligations collected by no page: ${uncovered.join(', ')}`
```

Miss one and **the server does not boot**. Pinned three ways in `flow/dispatch.test.js`
(:72-81 no owner, :50-61 two owners, :28-48 path metacharacter). Fully derived from data.

B's equivalent is `features/commodity-lines/controller.test.js:66-80` — and it is scoped to
`o.within === commodityLine` leaves. **No gate at notification level. No gate at depth-2
(`within: unitRecord`). No `flow.test.js` at all** for `flow/flow.js` (667 LOC — B's entire Layer 2).
Because `journeyState` walks `flow.sections` and not the manifest (`engine/index.js:583-590`), an
unpresented obligation is not "broken" — it is *absent*. Nothing fires. B's own 16-mutation register
found add-and-forget at the obligations↔domain seam (mutation 5) and closed it; **it never probed the
same mutation at the obligations↔flow seam.**

This is the strongest refutation of the prior available on this dimension, and it is architectural,
not accidental: A's inversion *forces* the totality assert to exist (the page-owned spine cannot
route without it), while B's config lets the flow tree quietly define reality.

### 4c. Neither side's structural advantage is where the docs claim

Two claims to strike from the record:

- **B's `i18n-coverage.test.js` does NOT catch "add an obligation, forget the copy."**
  `forObligation()` falls back to `humaniseId()` when no key entry exists
  (`lib/presentation.js:419-427`), and the coverage test only walks keys that *already exist*
  (`i18n-coverage.test.js:89-101`). `OBLIGATION_KEYS` is a **38-entry hand-maintained map**. A new
  obligation renders with a humanised label and **no test fires**. The gate catches a *declared key
  missing from en.json* — narrower than advertised. (Failure is cosmetic, not functional — but the
  gate is not the totality gate people think it is.) The hub/CYA/lines keys are hand-maintained
  arrays with the admission in-file at `:33-35`.
- **B's "contract.js is the only path from browser → model" is false** (`RECOMMENDATION.md:75-78`).
  7 browser-layer files import `engine/index.js` and `obligations/obligations.js` directly. No test,
  no lint rule. One `no-restricted-imports` rule closes it.

---

## 5. The gaps each side has that the OTHER has closed

This is the shopping list, and it runs in both directions.

### A is missing B's whitelist drift gate — and A's hole is real

A's three commodity scope-gates read exported constants from a reference-data service:

```
features/cph-number/obligations.js:10        includes: commodities.cphCommodities()
features/commodities/obligations.js:15       includes: commodities.packageCountCommodities()
features/additional-details/obligations.js:12 includes: commodities.unweanedCommodities()
services/commodities/index.js:53,65,67        export const … = () => PACKAGE_COUNT_COMMODITIES | …
```

**A full grep for those three symbols across the entire live-animals tree returns source files
only — not one test file references them.** So: widen `CPH_COMMODITIES` in
`services/commodities/index.js` and **nothing in A's 526 tests fails**. Existing behavioural tests
keep passing (they assert specific values like "Horse is off-gate"); the new value simply becomes
silently gated. That is **exactly B's mutation 3** — which B *found by mutating*, treated as a bug in
the suite, and closed with `obligations/whitelists.test.js`'s two-key pattern: loop the imported list
for positives **and** set-equality against a hard-coded `EXPECTED` (`:177-238`), so no single-file
edit can widen a whitelist. 7 of 7 whitelists covered.

B's file explains the whole idea in one sentence A should read (`whitelists.test.js:162-174`):
*"Positive-case tests above iterate the imported list; if only that were tested, widening the list
would just add passing cases."*

### B is missing A's totality assert and A's universal prover

- **The boot totality assert** (§4b) — B's biggest gap, ~20-40 LOC to close.
- **`analysis/reachability.js`** — the only test on either side that proves a *universal*. 215 LOC
  prover + 77 LOC test: imports the real registry, enumerates a 24-state scope space, asserts
  `proveReachability() === []` and `orphanedRootIds === []`, and — uniquely — **proves its own
  teeth** by injecting a mutated page set and asserting it bites (`reachability.test.js:22,26,29-39,
  42,61-75`). B has no property test of any kind.
- **Cross-system equivalence** (`skeleton-equivalence.test.js:227` + the two-browser Mongo parity
  spec at `skeleton-vs-prototype-mongo.spec.js:397`) — the strongest single assertion on either side.
  Not model-caused; a consequence of A having built the persistence. N/A to B until it has one.

### Each side's best *practice*, as opposed to best test

- **B: the 644-line mutation register** (`docs/testing.md`) — 16 mutations, 3 rounds, recording
  which tests fired and treating **"0 failures" as a defect in the suite**. Found 4 gaps (one
  *hung CI indefinitely* — mutation 14); closed 3 with code I verified exists. This is the best
  test-engineering artefact on either side, it costs ~0 LOC, and it is 100% portable. **A has never
  run one, and §5's whitelist hole is precisely what A's first round would find.**
- **A: network-boundary-only mocking.** 5 of 64 files mock at all, and the one that matters stubs
  `fetch` (`vi.stubGlobal`), not a module. Zero `toHaveBeenCalledWith` in any drift guard.

---

## 6. Verdict, scored on the MODEL

| Sub-axis | Winner | Why |
|---|---|---|
| Model → UI conformance testable? | **B, structurally** | Widget derived from `entry.type`; A's model has no type to conform to |
| Model → page/flow totality guarded? | **A, decisively** | Boot-fatal, all depths, derived; B gates depth-1 only, silent invisibility otherwise |
| Scope-rule drift (widen a whitelist) | **B** | Two-key set-equality; A has *no* test on its 3 whitelists |
| Whole-model property proving | **A** | Reachability prover w/ mutation self-tests; B has none |
| Suite self-measurement | **B** | 16-mutation register; A has none |
| Engine testable without the manifest | **B** | Synthetic 7-obligation fixture (D3); A needs a test-only `forest` seam |
| Flow layer tested | **A** | 79 cases across 5 files; B's `flow.js` (667 LOC) has none |
| Coverage instrumentation | **tie (both zero)** | Identical `include: ['src/**/*.js']`, no thresholds |
| Browser E2E | **A** (33 vs 2) | Build-state, not model — do not score it as a model win |

**A is further along and it does not matter.** Strip the build-loop artefacts (33 E2E, persistence
parity, upload) and the model-level scoreboard is still mixed: B owns the *conformance* axis
permanently, A owns the *totality* axis and the *universal-proving* axis, and both own exactly half
the drift-guard shopping list.

---

## 7. The third option — what to take from each

1. **B's derived rendering** (`build-field-descriptors.js` + `field-widgets.js`) — deletes A's whole
   model→template drift class rather than testing it. Requires `type` on the obligation.
2. **A's boot-time totality assert, re-aimed at B's flow seam** — the cheapest, highest-value item on
   the list. Reuse B's own `KNOWN_UNWIRED`-with-a-written-reason idiom for the legitimately
   unpresented (`poApprovedReferenceNumber`, `responsiblePersonForLoad`).
3. **B's two-key whitelist gate** — ~240 LOC, closes a live hole in A.
4. **A's reachability prover** — the only universal on either side.
5. **B's mutation register practice** — ~0 LOC, 1 day per round, and it is how you find out whether
   any of the above actually has teeth.
6. **A's `driveHandler`/`stubH` harness** (69 LOC) — 526 tests in under a second without booting a
   server. B triplicates a Hapi + cookie-jar `beforeAll` across three files instead.
7. **Turn coverage on.** Both sides forgot. One line each.

---

## 8. Retrofit

### B's testing into A

- **`coverage.test.js` (obligation ↔ domain): does not port.** A has **no domain layer** — no
  value-legality map keyed by obligation id. Validation is per-page `compose(maxText(...))` in
  controllers (`docs/add-a-field.md:60-68`). The gate has nothing to gate. Porting it means building
  a domain layer first — a **model change, not a test change**. *But* the gate's shape re-aims
  cheaply at the seams A actually leaves hand-wired: **obligation → CYA row** (~30 LOC — the row
  already carries the id, `add-a-field.md:108`, and all 29 CYA cases are hand-authored per-row
  expectations today) and **obligation → notification mapper** (~30 LOC — `skeleton-equivalence`
  only pins the *legacy skeleton's* field set, so a prototype-only field is invisible to it). Those
  two are A's cheapest real wins.
- **`whitelists.test.js` (two-key):** ports in ~1 day. A's lists are already exported constants
  (`services/commodities/index.js:53,65,67`), so no extraction is needed — just write the `EXPECTED`
  map and the set-equality. **Closes a hole that is open today.**
- **`i18n-coverage.test.js`: does not port.** A has no message keys — copy is inline English across
  32 `.njk` files (1,499 LOC). Porting means extracting all copy into a keyed layer first
  (~1,500 LOC touched). It buys nothing until Welsh is required — which, being DEFRA, it will be.
- **Field-widget conformance test: cannot port.** Requires `type`/`label` on the obligation, i.e.
  undoing A's inversion. This is the one true wall.
- **Mutation register: ports for free.** Do it first; it will tell A which of the above to buy.
- **What A has that B has no answer for:** the sub-second no-render harness. Bringing B's
  HTTP-level `server.inject` style into A wholesale would boot a Hapi server per file and cost A its
  "well under a second" suite (`docs/testing.md:15`). Keep `stubH`/`driveHandler`; take B's
  *invariants*, not B's *levels*.

### A's testing into B

- **Boot-time totality assert (obligation → `presents`, all depths): ~20-40 LOC, do it now.** It
  closes B's silent-invisibility failure mode (`engine/index.js:583-590`). B's `KNOWN_UNWIRED`
  pattern (`coverage.test.js:27-41`, and the system-populated exemptions already documented at
  `:172-190`) absorbs the exemptions cleanly. Nothing breaks; nothing is rewritten.
- **Reachability prover: ports, but at 2-3× the cost it had on A.** A's gates are **inert data**
  (`activatedBy: { obligation, frame, includes: [...] }`) so `enumerateScopeStates()` reads the
  trigger values straight off the model. **B's `applyTo` is a closure** (`coverage.test.js:187`
  calls `po.applyTo()`), so a prover cannot read a gate's input domain by inspection. It must
  enumerate candidate states from `domain`'s enum option lists (which *are* data) and from the
  exported whitelists, then call `applyTo`. Feasible — B's gates are built from a small set of
  exported factories over exported constants — but ~300 LOC and a design decision, not a copy-paste.
  **Not structurally blocked; materially more expensive.**
- **Contract test (declared `collects` == committed ids): DO NOT PORT — B does not need it.** B's
  generic page-controller commits exactly what the flow presents. The seam A must test is **closed by
  construction** on B. This is B's model paying off, and it is worth saying plainly: several of A's
  best guards exist to police hand-wiring that B's config eliminates.
- **Cross-system equivalence pin:** N/A until B grows persistence; then take it wholesale.
- **What B has that A has no answer for on retrofit:** the synthetic-fixture engine tests
  (`engine/index.test.js:20-57`, 63 sites on a 7-obligation fixture) exist only because D3 made the
  engine 15 standalone pure functions taking `(obligation, state, domain)`. A's engine imports the
  registry at module scope and needs a **test-only `forest` seam** injected into `reconcile`
  (`cross-frame.test.js:43`) to get the same effect. Retrofitting A's engine-test style into B would
  be a regression — B should keep D3 and A should copy it.

### Fix on both sides, today, for one line each

`coverage.include` → add the prototype path; set a threshold. Both configs are identical and both are
wrong (`clone-live-animals/vitest.config.js:19`, `clone-flow-layer/vitest.config.js:21`).
A should additionally either run its 11 dark integration cases or delete them — `LIVE_ANIMALS_IT` is
set by **no npm script, no CI job, no config** (`services/persistence/it-mode.js:1`).
