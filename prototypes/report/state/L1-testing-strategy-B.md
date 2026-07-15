# Layer 1 — Testing strategy and what the tests actually pin

**Side B — "flow-layer"** (Paul Hodgson), clone `workareas/model-comparison/clone-flow-layer` @ d59b432
Roots: `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` (live) and `prototypes/model-spikes/obligations-v4-model/` (frozen ancestor)

---

## Headline

Side B's testing is **model-first and unusually deliberate**. Roughly three-quarters of its
test declarations never touch HTML at all: they exercise the evaluator, the domain layer and
the 15 engine primitives as pure functions. There are **zero snapshot tests anywhere in the
spike** (verified: `grep -rn "toMatchSnapshot|toMatchInlineSnapshot|__snapshots__"` over
`prototypes/` returns nothing). What HTML assertions exist are substring probes on
`res.payload` used to prove that a *model* decision reached the DOM — not UI pinning.

The distinctive artefacts are three **drift gates** — `obligations/coverage.test.js`,
`obligations/whitelists.test.js`, `i18n-coverage.test.js` — plus a 644-line
**mutation register** (`docs/testing.md`) that records 16 deliberate model mutations across
three rounds, names exactly which tests fired, and treats "0 tests failed" as a **bug in the
suite** to be closed. Four gaps were found that way; three were closed in-session with real
code; one was consciously deferred. That register is the strongest single piece of
test-engineering evidence on either side.

The weaknesses are equally real and equally specific:
- **Nothing gates the obligations ↔ flow seam** at notification level or depth-2 (only depth-1).
- **The prototype tree is excluded from coverage instrumentation entirely** (`vitest.config.js:21`).
- **~2,136 test LOC (18% of all test LOC) tests a frozen ancestor**, one file byte-identical to its fork.
- Two documented claims are **false in code** (see §7).

---

## 1. Inventory — counts, verified

| Metric | Value | Evidence |
|---|---|---|
| Test files (live spike, vitest) | **23** | `find … -name "*.test.js"` under `EUDPA-249-flow-layer/` |
| Test files (browser, Playwright) | **1** | `e2e/walk.spec.js` |
| Test files (frozen ancestor, vitest) | **3** | `model-spikes/obligations-v4-model/{evaluator,evaluator.units,helpers}.test.js` |
| **Total test files** | **27** | |
| `it(` / `test(` declaration sites — live spike | **495** (+2 Playwright) | `grep -rc "^\s*\(it\|test\)\(\.each\)\?("` |
| declaration sites — ancestor | **160** | same |
| Runtime test count claimed | **566** across 23 files | `NEXT.md:17` — gap vs 495 sites is `for`-loop + `it.each` expansion |
| Test LOC — live spike (excl. e2e harness) | **9,622** | wc -l over the 24 files |
| Test LOC — ancestor | **2,136** | 1,143 + 760 + 233 |
| Source LOC (live, non-test) | 7,897 | Layer-0 inventory, spot-checked |
| **Test : source LOC ratio (live)** | **1.22 : 1** | |
| Snapshot tests | **0** | grep — no hits |
| HTML substring assertions in `routes.test.js` | **73** `toContain` + 124 `payload` refs | `routes.test.js` |
| Browser (real Playwright) tests | **2** | `walk.spec.js` × `JOURNEYS` (1 entry, `e2e/journey.js:23-29`) |

---

## 2. The four levels — what runs where

`docs/testing.md` claims four levels. The code confirms them, and adds one the docs don't
name (the browser level). Note the **misleading filenames**: `e2e-walk.test.js`,
`e2e-commodity-lines.test.js`, `e2e-units.test.js` are **vitest `server.inject` tests, not
browser E2E**. Real browser coverage is two Playwright tests.

### Level 1 — pure unit on SYNTHETIC fixtures (no V4 coupling)
The engine primitives are tested against a hand-rolled 7-obligation fixture, not the real
manifest. This is the load-bearing consequence of design decision D3 (engine = standalone
pure functions, not an orchestrator object):

> `engine/index.test.js:20-24` — *"Synthetic obligations + domain — the whole point is that the
> runtime primitives can be exercised in isolation, without the parent obligations manifest or
> evaluator."*
> `engine/index.test.js:26-32` — `const reasonOb = { id: 'reason', name: 'reason' }` … `const numOb = { id: 'num', name: 'num', within: lineGroup }`

- `engine/index.test.js` — 63 sites, 1,166 LOC. All 15 primitives.
- `obligations/helpers.test.js` — 24 sites. The 4 gate factories.
- `lib/*.test.js` — 6 files, 46 sites (`is-blank-value`, `field-widgets`, `format-domain-errors`, `build-field-descriptors`, `i18n`, `state`).

**Pins: model semantics only.** These would survive a total rewrite of the V4 manifest.

### Level 2 — model integration through the REAL V4 manifest
- `obligations/evaluator.test.js` — 76 sites, 1,159 LOC. Largest model test. Scope/status per obligation over scripted fulfilments.
- `obligations/evaluator.units.test.js` — 61 sites, 760 LOC. Evaluator internals.
- `domain/index.test.js` — 56 sites, 804 LOC. Option lists, predicates, address `isComplete`, error codes asserted **symbolically** against the `reasons` registry (`domain/index.test.js:390,403,413,486,561,655,723`) rather than as string literals — good.
- `integration.test.js` — 25 sites. Fulfilments → evaluator → engine → domain, one test per AC bullet.
- `contract.test.js` — 16 sites. The 20-function seam.
- `sketches.test.js` — 11 sites. The Joi-shape sketch + the data-dictionary metadata payoff.
- `dump.test.js` — 3 sites.

**Pins: model semantics.** Zero HTML.

### Level 3 — HTTP in-process (`server.inject`, real Hapi + real Nunjucks)
- `routes.test.js` — 40 sites, 1,011 LOC.
- `e2e-walk.test.js` — 2 sites, 594 LOC (two full journey walks: internal-market, transit).
- `e2e-commodity-lines.test.js` — 22 sites, 836 LOC.
- `e2e-units.test.js` — 12 sites, 565 LOC.

**Pins: model semantics OBSERVED THROUGH the DOM.** The assertions are raw substring probes,
but every one of them is a proxy for a model decision:

| Assertion | Model fact it pins |
|---|---|
| `routes.test.js:377` `expect(res.payload).not.toContain('Private transporter details')` | `applyTo` scope → hide-question |
| `routes.test.js:339-340` `toContain('Breeding')` / `toContain('Fattening')` | `computedEnum` option filtering |
| `routes.test.js:987` `not.toContain('Horse')` | commodity-gated option list |
| `routes.test.js:399-402` `toContain('name="commercialTransporter__addressLine1"')` | `addressBlock` widget derivation |
| `routes.test.js:560-566` `toContain('value="ACME"')` | POST-error value preservation |
| `routes.test.js:459` `toContain('govuk-form-group--error')` | domain error → GOV.UK error anchor |

The `beforeAll` boilerplate (`makeServer` + cookie jar) is **triplicated** verbatim across
`routes.test.js`, `e2e-walk.test.js` and `e2e-commodity-lines.test.js` — acknowledged in-file
(`e2e-walk.test.js:20-22`: *"the `makeServer` + cookie-jar helpers duplicate the ones in
`routes.test.js`. If we keep this pattern, extract both to `test-helpers.js` in a follow-up."*).

### Level 4 — real browser (Playwright)
`e2e/walk.spec.js` — **2 tests**, 210 LOC, driven by a 331-LOC data-driven page-object module
(`e2e/journey.js`). `JOURNEYS` has exactly one entry (`e2e/journey.js:23-29`), so the
`for (const journey of JOURNEYS)` loop yields 2 runtime tests. They are a **deliberate mirror**
of the two vitest `e2e-walk.test.js` walks — same fills, same terminal assertions (14 Completed
+ 1 Optional / 13 + 2). The only thing the browser layer pins that the inject layer does not is
`walk.spec.js:206-207` — `await expect(firstOptional).toHaveClass(/govuk-tag--turquoise/)`.

No axe/a11y test, no visual regression, no no-JS test (there is no client JS), no performance test.

---

## 3. The drift gates — the crown jewels

### 3a. `obligations/coverage.test.js` (190 LOC, 8 sites) — the anti-add-and-forget gate
Four independent invariants over the manifest:

1. **Every obligation is wired to a domain entry OR is on `KNOWN_UNWIRED` with a written reason** (`:80-86`):
   ```js
   const missing = obligations
     .filter((o) => !domain.has(o.id) && !KNOWN_UNWIRED.has(o.name))
     .map((o) => o.name)
   expect(missing).toEqual([])
   ```
2. **The allow-list cannot rot the other way** (`:88-97`) — an obligation later wired to domain must be removed from `KNOWN_UNWIRED`, else `overWired` fires.
3. **`KNOWN_UNWIRED` entries must correspond to real obligations** (`:99-105`) — a rename that misses the allow-list fires.
4. **`within`-chain cycle detection** (`:108-137`) — a self-loop `commodityLine.within = commodityLine` **hangs the whole suite** (`buildAncestorGroups` walks `while (cur) cur = cur.within`). Closed with a seen-set + depth-100 bound; fires in ~3 ms.
5. **id and name uniqueness** (`:139-170`).

`KNOWN_UNWIRED` currently holds exactly 4 names (`:27-41`): `commodityLine`, `unitRecord`
(structural groups), `poApprovedReferenceNumber`, `responsiblePersonForLoad` (system-populated).
40 of 44 obligations are wired end-to-end.

`sketches.test.js:147-154` **independently re-asserts the same 4-name exemption set** through the
data-dictionary's `coverageReport()`, so the invariant is pinned twice from two directions.

### 3b. `obligations/whitelists.test.js` (238 LOC, 7 sites → ~51 runtime tests) — the anti-drift gate
This is the most methodologically interesting test on Side B. It uses a **two-key** structure and
the file explains exactly why (`:162-174`):

> *"Positive-case tests above iterate the **imported** list; if only that were tested, widening the
> list would just add passing cases. The equality check below is what makes the whole exercise
> trustworthy. … Any single-file edit fails the drift check. That's the invariant."*

- Key 1: for each of the 7 commodity-code whitelists, loop the *imported* constant and assert the gated obligation goes in scope for every code (`:61-69`, `:89-96`, `:138-160`), plus a `CONTROL_CODE = '99999999'` negative (`:44`, `:71-77`, `:98-103`, `:151-158`).
- Key 2: a hard-coded `EXPECTED` map (`:177-216`) with an order-insensitive set-equality per whitelist (`:231-238`).

Result: you cannot widen a whitelist in `obligations.js` alone. Both files must change together.

### 3c. `i18n-coverage.test.js` (221 LOC, 11 sites) — the copy gate
Walks `flow.js` (`titleKey`, `errors.required`), `presentation.js` (`OBLIGATION_KEYS`, `PAGE_KEYS`),
domain enum `labels`, address sub-field keys, and `FORMAT_ERROR_KEYS`, asserting each resolves in
`locales/en.json` (362 keys). Each block carries a "collects at least one key" canary
(`:129-131`) so a silent walker regression cannot make the test vacuously green — a nice touch.

**But:** the hub / CYA / commodity-lines controller keys are **hand-maintained static arrays**
(`:37-76`) with a comment admitting it (`:33-35`): *"Keep in sync with the `t()` calls in those
files."* A new `t('hub.something')` in the hub controller with no en.json entry is **not** caught
at build time — it renders the raw dotted path at runtime. There is also **no orphan-key test**:
`en.json` can accumulate dead keys indefinitely.

### 3d. `features/commodity-lines/controller.test.js:66-80` — the ONLY obligations ↔ flow gate
```js
it('every depth-1 leaf in the manifest is presented on a per-line page', () => {
  const depth1Leaves = v4Obligations.filter(
    (o) => o.within === commodityLine && o.status !== undefined
  )
  const presentedNames = new Set(LINE_PAGES.map((p) => p.obligation.name))
  ...
})
```
This gate exists **only for depth-1**. See §5 for why that matters.

---

## 4. The mutation register (`docs/testing.md`, 644 LOC) — the strongest artefact

16 mutations, 3 rounds, each recording: the diff, the number and identity of failing tests, a
sample error, and the invariant caught. **"0 tests failed" is treated as a defect in the suite.**

| # | Mutation | Tests fired | Outcome |
|:-:|---|:-:|---|
| 1 | Rename an obligation | 9 of 13 files fail at module load | caught |
| 2 | Narrow a computed-enum option list | 4 across 4 files | caught (incl. through the DOM) |
| 3 | Widen a commodity whitelist | **0** | **gap → closed** by `whitelists.test.js` |
| 4 | Flip a scope-gate predicate | 15 across 6 files | caught |
| 5 | Add an obligation, leave it unwired | **0** | **gap → closed** by `coverage.test.js:80-97` |
| 6-10 | (round 2 — group semantics, navigation, etc.) | 6-164 | caught |
| 11 | Duplicate obligation **name** | **0** | **gap → closed** by `coverage.test.js:155-169` |
| 12 | Duplicate page name in `flow.js` | 13 (+14 skipped — Hapi rejects the route) | caught structurally |
| 13 | Reorder the manifest array | **0** | **confirmed safe no-op** (manifest order is not load-bearing) |
| 14 | Circular `within` self-loop | **suite HANGS** | **gap → closed** by cycle detection |
| 15 | Invert `allowListed`'s matcher | 48 across 3 files | caught |
| 16 | Subtle presentation-copy change | **0** | **gap DEFERRED** (testing.md:593-618) |

I verified the three claimed closures exist as real code: `whitelists.test.js` (whole file),
`coverage.test.js:108-137` (cycles), `coverage.test.js:155-169` (name uniqueness). They are not
paper closures.

Mutation 16 is the honest admission: `routes.test.js`'s assertions are case-sensitive substring
probes, so `'Country of origin'` → `'Country of origin (subtly changed)'` passes. The register
enumerates the three ways to close it and argues none is worth the cost for a spike (`:608-615`).
That is a legitimate, reasoned deferral — not an oversight.

---

## 5. What is NOT tested — the concrete holes

### 5a. Obligations ↔ flow, at notification level and depth-2 (**the big one**)
`journeyState`, `containerStatus` and every navigation primitive walk the **flow tree**, not the
manifest:

> `engine/index.js:583-590`
> ```js
> export function journeyState(flow, state, submitted = false) {
>   ...
>   for (const section of flow.sections ?? []) {
>     inScope.push(...collectInScopePresentedEntries(section, state))
> ```

So an obligation that is **in the manifest, wired to a domain entry, mandatory and in scope, but
never `presents`-ed in `flow.js`** is invisible to every status computation, every navigation
primitive and every page — and **no test fires**. `coverage.test.js` gates only the
obligations ↔ *domain* seam. The obligations ↔ *flow* seam is gated only for `within: commodityLine`
leaves (`features/commodity-lines/controller.test.js:66-80`). There is no equivalent for
notification-level obligations or for `within: unitRecord` (depth-2) leaves. There is **no
`flow.test.js` at all** — `flow/flow.js` (667 LOC, the entire Layer 2) has no dedicated test file.

This is mutation 5 (add-and-forget) *at the other seam*, and the mutation register never probed it.
**structural = false** — a ~20-line test closes it — but the consequence (a silently unreachable
mandatory field) is exactly the failure the spike's whole coverage philosophy exists to prevent.

### 5b. Coverage instrumentation excludes the entire prototype
> `vitest.config.js:21` — `include: ['src/**/*.js']`

`npm test` runs `vitest run --coverage`, but the coverage `include` is **`src/**` only**. The
7,897 source LOC of the spike produce **no coverage number** and there is **no threshold gate**
configured anywhere in `vitest.config.js`. Side B's test rigour is entirely a matter of
hand-designed invariants; there is no mechanical floor.

### 5c. `reasons` registry completeness
`domain/index.js` predicate entries carry `metadata.reasons` (an enumeration of every failure code
they can emit); `data-dictionary-sketch.js` surfaces them to stakeholders. **Nothing asserts a
predicate cannot emit a code absent from its declared `reasons`.** `domain/index.test.js:799-803`
only tests the factory's pass-through on a synthetic entry:
```js
it('predicate carries reason codes on metadata', () => {
  const e = predicate('integer', () => [], [r])
  expect(e.metadata.reasons).toEqual(['x.y'])
})
```
A predicate that emits an undeclared code silently ships a data dictionary that lies.

### 5d. Uncovered source files
Of 28 live source files, these have **no dedicated test file** (covered only indirectly, if at all,
through `routes.test.js` / `e2e-*.test.js`):
`flow/flow.js`, `lib/page-controller.js`, `lib/line-page-controller.js`,
`lib/unit-page-controller.js`, `lib/presentation.js`, `lib/chrome.js`,
`features/check-your-answers/controller.js` (351 LOC — the largest feature),
`features/units/controller.js` (308 LOC), `features/hub/controller.js`,
`features/start/controller.js`, `features/reset/controller.js`.

### 5e. Absent by construction
No persistence test beyond the `@hapi/yar` session (there is no persistence). No auth test (routes
are `auth: false`). No file-upload test. No amend/resubmit test. No Welsh test (no `cy.json`). No
client-JS / progressive-enhancement test (no client JS). These are honest absences, not gaps —
the features don't exist.

---

## 6. Dead / duplicated test weight

`prototypes/model-spikes/obligations-v4-model/` is the **frozen EUDPA-277 ancestor**, and its
tests **run on every `npm test`** (`vitest.config.js:13-16` excludes only the Playwright `e2e/`
directory).

- `model-spikes/…/evaluator.units.test.js` is **byte-identical** to `EUDPA-249-flow-layer/obligations/evaluator.units.test.js` — verified: `diff` produces empty output. 760 LOC, 61 declarations, executed twice per run.
- `model-spikes/…/evaluator.test.js` differs from its fork by **59 diff lines** — the only substantive divergence is the accompanying-document gate (`becauseAnyFieldPresent` → `becauseTypeSelected`, audit #15) and `containsUnweanedAnimals` becoming commodity-gated (audit #11).
- `model-spikes/…/helpers.test.js` — 233 vs the fork's 244 LOC.

**2,136 test LOC (18% of Side B's 11,758 total test LOC) and 160 declarations test superseded
code.** Any retrofit should delete the ancestor tree wholesale, not port it.

---

## 7. Doc / code disagreements found (each is itself a finding)

1. **"Snapshot-pinned by `dump.test.js`" is FALSE.**
   `dump.test.js:1-5` calls itself *"dump.js snapshot tests"* and the Layer-0 inventory repeats
   the claim. **There is no snapshot anywhere in `prototypes/`** — `grep -rn
   "toMatchSnapshot\|toMatchInlineSnapshot\|__snapshots__"` returns zero hits. `dump.test.js` is
   3 hand-written assertion tests checking ~15 named fields of `report(fixture)`. Consequence:
   a change to `dump`'s **output shape** (added or dropped keys) is not pinned; only the
   explicitly-named fields are.

2. **"`contract.js` is the only path from browser → model" is FALSE, and nothing tests it.**
   `RECOMMENDATION.md:75-78` — *"Correctness is enforced three ways — contract seam (`contract.js`
   is the only path from browser → model), tests …"*. In fact **7 browser-layer source files
   import the model directly**, bypassing the seam:
   `features/hub/controller.js:15-16` imports from `../../engine/index.js` **and**
   `../../obligations/obligations.js`; same pattern in `features/check-your-answers/controller.js`,
   `features/commodity-lines/controller.js`, `features/units/controller.js`,
   `lib/line-page-controller.js`, `lib/unit-page-controller.js`, `lib/presentation.js`. There is
   **no import-boundary test and no `no-restricted-imports` lint rule** in the suite. The seam is
   a convention, not an enforced invariant.

3. **Test-count claims are mutually inconsistent and stale.**
   `docs/testing.md:3` — *"The spike ships 385 vitest tests across 15 files."*
   `NEXT.md:17` — *"566 spike tests across 23 files, all green."*
   Actual live vitest files: **23**. The mutation register was executed against a **15-file /
   385-test baseline**; ~8 files and ~180 tests have landed since, so **the mutation results have
   not been re-run against the current suite**. The conclusions are probably still valid (more
   tests can only make more mutations fire), but the receipts are un-refreshed.

---

## 8. The one thing to steal regardless of who wins

`obligations/whitelists.test.js`'s **two-key drift pattern** — loop the imported constant for
positive cases, *and* assert set-equality against a hard-coded `EXPECTED` in the test file — plus
`obligations/coverage.test.js`'s **allow-list-with-a-written-reason** gate. Together they cost
~430 LOC and make it structurally impossible to (a) widen a scope whitelist in one file, or
(b) add an obligation and forget to wire it. Neither depends on Side B's three-layer architecture;
both port to any obligations-shaped model in an afternoon.

The second thing to steal is the **mutation register discipline itself** (`docs/testing.md`) —
not the document, the practice: mutate the model, count what fires, and treat zero as a bug.
It found 4 real gaps including one that **hung CI indefinitely**.

---

## 9. Retrofit cost, stated plainly

| To adopt | Cost |
|---|---|
| `coverage.test.js` (add-and-forget gate) | ~190 LOC. Needs an id-keyed obligation manifest and an id-keyed value-legality map. If a side has no separate value-legality layer, the gate has nothing to gate — it must be re-pointed at whatever the second seam is. |
| `whitelists.test.js` (two-key anti-drift) | ~240 LOC. Needs named, exported scope constants. If scope rules are inline literals rather than exported arrays, they must be extracted first. |
| `i18n-coverage.test.js` | ~220 LOC, but only pays if copy lives in message keys. On a side where copy is inline in templates it is not portable at all. |
| Mutation register practice | ~0 LOC, ~1 day per round. Fully portable. |
| Synthetic-fixture engine tests (D3) | **Not portable without D3.** They only work because the engine is 15 standalone pure functions taking `(obligation, state, domain)` explicitly. An engine that reaches into a module-level manifest cannot be exercised on a 7-obligation synthetic fixture. |
