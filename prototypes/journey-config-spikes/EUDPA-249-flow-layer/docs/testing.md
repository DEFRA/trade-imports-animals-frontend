# Testing — what proves what

The spike ships 382 vitest tests across 15 files. Their job is to
catch drift when the obligations / domain / flow model changes. This
document is the receipt: five realistic mutations of the model, each
applied to a real commit, showing exactly which tests fire.

Two of the five mutations originally exposed coverage gaps. Both were
closed by new tests — see the "Closing the gaps" appendix at the end.

Baseline before every mutation: **15 test files, 382 tests, all pass.**
Run:

```bash
npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/
```

Each mutation section below records the change, the count and identity
of failing tests, a sample error message, and what invariant the tests
catch. All five mutations were applied to `spike/EUDPA-249-flow-layer`
at HEAD `71bb020`, run through vitest, and then reverted.

---

## Mutation 1 — rename an obligation

**Change:** rename `reasonForImport` in `obligations/obligations.js`
(a search-and-replace typo, or an accidental refactor).

```diff
-export const reasonForImport = {
+export const reasonForImportRENAMED = {
   id: 'd34e5f6a-7b8c-4d9e-8f01-2a3b4c5d6e7f',
   name: 'reasonForImport',
   ...
 }
```

**Result:** `9 of 13` test files fail before a single assertion runs —
every file that imports `reasonForImport` throws `ReferenceError` at
module load.

Failing files: `contract.test.js`, `dump.test.js`, `integration.test.js`,
`sketches.test.js`, `domain/index.test.js`,
`obligations/evaluator.test.js`, `obligations/evaluator.units.test.js`,
`routes.test.js`, `lib/build-field-descriptors.test.js`.

Sample output:

```
ReferenceError: reasonForImport is not defined
❯ prototypes/journey-config-spikes/EUDPA-249-flow-layer/obligations/obligations.js:654:3
❯ prototypes/journey-config-spikes/EUDPA-249-flow-layer/contract.test.js:3:1
```

**Invariant caught:** the obligation identity graph is compiled at
module-load time. A rename you forget to propagate cannot silently
survive — the next `vitest run` shows nine red files immediately.

---

## Mutation 2 — change enum option list

**Change:** narrow `PURPOSE_BY_REASON['internal-market']` in
`domain/index.js` from four options to two.

```diff
 const PURPOSE_BY_REASON = {
-  'internal-market': ['breeding', 'slaughter', 'fattening', 'other']
+  'internal-market': ['breeding', 'ranching']
 }
```

**Result:** `4 tests` fail, across four files. Two files hit the
computed-enum output directly, two hit it through label rendering:

| Test file              | Failing test                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `domain/index.test.js` | `computedEnum — purposeInInternalMarket › returns internal-market sub-values when reason is internal-market`        |
| `integration.test.js`  | `option filtering › optionsFor(purposeInInternalMarket) depends on reasonForImport`                                 |
| `sketches.test.js`     | `optionListsForPage › surfaces the enum options a controller would render`                                          |
| `routes.test.js`       | `page-controller — option filtering › purpose-details shows options only after reason-for-import = internal-market` |

The routes test failure is the most telling: it catches the mutation
through the rendered HTML — `expect(res.payload).toContain('Fattening')`
fails because "Fattening" is no longer in the DOM.

**Invariant caught:** the domain layer is the single source of truth
for enum options. Change the source, and behaviour changes everywhere
(model tests, controller tests, HTTP tests) coherently. That's the
"one place to change" claim, tested.

---

## Mutation 3 — widen an obligation whitelist (~~coverage gap~~ **closed — see appendix**)

**Change:** widen `PACKAGE_COUNT_COMMODITIES` in
`obligations/obligations.js` from four commodity codes to six.

```diff
 export const PACKAGE_COUNT_COMMODITIES = [
   '01064100', // Bees
   '01063100', // Birds of Prey
   '01061900', // Cats / Dogs / Ferrets
-  '0102' // Cattle
+  '0102',    // Cattle
+  '0103',    // Pig (WIDENED)
+  '010410'   // Sheep (WIDENED)
 ]
```

**Result:** **all 345 tests still pass.**

The whitelist gates `numberOfPackages` scope only on commodity lines
whose code is in the list. No test walks a scripted fulfilment through
a `commodityCode = '0103'` line and asserts that `numberOfPackages` is
now in scope — so the change slips through unnoticed.

**Invariant NOT caught** — this is a genuine coverage gap the mutation
walkthrough exposes. Step 4 (the "how to add X" + coverage test) will
close it: a `numberOfPackages` scope-membership test that iterates
every whitelisted commodity code and asserts scope in a scripted state.
Step 6 (V4 buildout) will probably tighten it further when whitelist
membership becomes user-visible.

**Invariant we thought we had:** whitelist changes on
commodity-code-gated obligations propagate to downstream scope
decisions. That's true — but proven only by inspection, not by a test.

---

## Mutation 4 — flip a scope-gate predicate

**Change:** in `purposeInInternalMarket`'s `applyTo`, swap the
in-scope branch of the gate from `internal-market` to
`transit-through-eu`.

```diff
 export const purposeInInternalMarket = {
   ...
   applyTo: branchedGate(
-    (fulfilments) => fulfilments[reasonForImport.id] === 'internal-market',
+    (fulfilments) => fulfilments[reasonForImport.id] === 'transit-through-eu',
     ...
   )
 }
```

**Result:** `15 tests` fail, across six files. This is the widest
impact of the five mutations because scope is the load-bearing
mechanism the whole three-layer thesis rests on.

Representative failures:

- `integration.test.js › page visibility › purpose-details is NA when reasonForImport is not internal-market`
- `integration.test.js › task list rollup › origin-and-reason is F on the transit path (purpose auto-NA)`
- `integration.test.js › navigation › firstUnfulfilledPage returns null when section is F (transit path)`
- `contract.test.js › status › statusOfPage is NA when nothing presented is in scope`
- `contract.test.js › navigation › nextAfter walks within the subsection first`
- `dump.test.js › dump.report(internal-market-partial) › reflects reason set, purpose still pending`
- `routes.test.js › page-controller — option filtering › purpose-details shows options only after reason-for-import = internal-market`
- `obligations/evaluator.test.js › V4 — purposeInInternalMarket conditional gate › is mandatory in-scope when reasonForImport is internal-market`
- `lib/build-field-descriptors.test.js › buildFieldDescriptors › filters out obligations that are out of scope`

**Invariant caught:** the entire three-layer chain — scope decision,
container status rollup, navigation, field-descriptor filtering,
rendered HTML, dump-snapshot output — all pivot on the obligation's
`applyTo`. Change the gate, and every layer notices, at every test
level (evaluator unit, contract, integration, HTTP `server.inject`,
dump snapshot). This is the strongest evidence of "provable via tests"
in the whole walkthrough.

---

## Mutation 5 — add a new obligation, leave it unwired (~~coverage gap~~ **closed — see appendix**)

**Change:** add a new mandatory singleton obligation
`insurancePolicyNumber` to the manifest, but **do not** wire it into
`domain/index.js`, `flow/flow.js`, or `lib/presentation.js`.

```diff
 export const obligations = [
+  insurancePolicyNumber,
   countryOfOrigin,
   ...
```

**Result:** **all 345 tests still pass.**

But — the signal IS there:

- `data-dictionary-sketch.js coverageReport()` reports
  `withoutDomainEntry: 15` (up from 14), and `missing` includes
  `'insurancePolicyNumber'`.
- The obligation would show in the `dump.js` output as an in-scope
  mandatory entry with no fulfilment, i.e. it would surface in
  `missingRequired` — but the `dump.test.js` snapshots don't currently
  assert against every entry, so the addition passes through.

Verified in a scratch `_scratch-mutation5.test.js` — asserting on
`coverageReport().missing` catches the mutation immediately. Removing
the scratch file leaves the coverage still uncalled by the main suite.

**Invariant NOT caught** — the coverage-report signal exists but isn't
asserted. This is exactly what step 4 turns into a proper failing
test (`coverageReport()` → `expect(report.missing).toEqual([])`, or an
allow-list of "text-fallback OK" obligations).

**Invariant we DO want:** every obligation in the manifest either
has a domain entry, is on an explicit allow-list, or fails the build.

---

## Summary — what the five mutations prove

|  #  | Mutation               | Failing files | Failing tests | Invariant                                                   |
| :-: | ---------------------- | :-----------: | :-----------: | ----------------------------------------------------------- |
|  1  | Rename obligation      |       9       | catastrophic  | Identity graph checked at module load                       |
|  2  | Change enum options    |       4       |       4       | Domain is single source of truth for options                |
|  3  | Widen whitelist        |       1       |       1       | ~~Coverage gap~~ — closed by `whitelists.test.js`           |
|  4  | Flip scope-gate        |       6       |      15       | Scope changes ripple through every layer                    |
|  5  | Add unwired obligation |       1       |       1       | ~~Coverage gap~~ — closed by `obligations/coverage.test.js` |

Two coverage gaps were discovered in the original run — mutations 3
and 5 fell through. Both are now closed by new tests, added in the
same session as this walkthrough. See "Closing the gaps" below for
what the closure covers and how to prove it fires.

## How to reproduce

Every mutation above uses a one-line `sed` or `diff`. To replay any of
them:

```bash
cd repos/trade-imports-animals-frontend

# Apply mutation (example: mutation 1)
sed -i '' 's/^export const reasonForImport =/export const reasonForImportRENAMED =/' \
  prototypes/journey-config-spikes/EUDPA-249-flow-layer/obligations/obligations.js

# Run the tests
npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/

# Revert
sed -i '' 's/^export const reasonForImportRENAMED =/export const reasonForImport =/' \
  prototypes/journey-config-spikes/EUDPA-249-flow-layer/obligations/obligations.js
```

Same pattern for the other four; the diff blocks above are pasteable.

## What this walkthrough is not

- Not full mutation testing (Stryker, etc.). Five hand-picked
  mutations against the specific invariants we claim to prove.
- Not a claim that the test suite is complete — mutations 3 and 5
  originally demonstrated real gaps. The closure appendix records how
  each was fixed.
- Not a one-off. Re-run this walkthrough after major model changes
  to confirm the invariants still hold and the coverage story hasn't
  slipped.

---

## Closing the gaps

The two coverage gaps mutations 3 and 5 originally exposed are now
closed by new tests. Both tests were added in the same session as
this walkthrough, and both were verified by re-applying the exact
mutations they cover.

### Gap 3 — whitelist widening

**Closed by:** [`obligations/whitelists.test.js`](../obligations/whitelists.test.js) (34 tests).

The test covers all seven commodity-code-scoped obligations:

- `PACKAGE_COUNT_COMMODITIES → numberOfPackages` (line-scoped)
- `CPH_REQUIRED_COMMODITIES → cph` (top-level `anyAllowListed`)
- `PASSPORT_COMMODITIES → passport` (unit-record-scoped)
- `TATTOO_COMMODITIES → tattoo` (unit-record-scoped)
- `EAR_TAG_COMMODITIES → earTag` (unit-record-scoped)
- `HORSE_NAME_COMMODITIES → horseName` (unit-record-scoped)
- `PERMANENT_ADDRESS_COMMODITIES → permanentAddress` (unit-record-scoped)

For each pair, the test scripts a state with the given commodity
code, evaluates, and asserts the gated obligation is in scope. Plus
a control code assertion (a synthetic code not in any V4 whitelist)
verifies the negative path.

**The key anti-drift move:** the test also compares each imported
whitelist against a hard-coded `EXPECTED` map. Iterating the imported
list alone would just add passing cases when the list widens — the
equality check against the `EXPECTED` map is what catches drift.

**Proof it works:** re-apply mutation 3 (widen `PACKAGE_COUNT_COMMODITIES`
to add `'0103'` and `'010410'`). The test
`PACKAGE_COUNT_COMMODITIES contains exactly the expected codes` fails;
the two new positive cases pass but the equality check fires.

To intentionally change a whitelist:

1. edit the constant in `obligations.js`
2. update the matching `EXPECTED` entry in `whitelists.test.js`
3. re-run tests — new positive cases pass, drift check passes

Any single-file edit fails the drift check. That's the invariant.

### Gap 5 — unwired obligation

**Closed by:** [`obligations/coverage.test.js`](../obligations/coverage.test.js) (3 tests).

Every obligation in the manifest must be either:

- wired to a `domain/index.js` entry (has legal-value semantics), OR
- explicitly present on the `KNOWN_UNWIRED` allow-list.

The allow-list has ~26 current entries (standard address blocks,
group containers, per-unit identifiers, accompanying-document block)
— each represents V4 work parked for step 5 (V4 buildout). As step 5
wires each, the entry gets removed from `KNOWN_UNWIRED`.

Two anti-drift guards:

- **The allow-list can't contain obligations that were later wired.**
  Wire something, remove it from the allow-list, or the check fires.
- **The allow-list can't contain orphans.** Rename an obligation, and
  the corresponding `KNOWN_UNWIRED` entry must be updated too.

**Proof it works:** re-apply mutation 5 (add
`insurancePolicyNumber` to the manifest, don't wire it). The test
`has no obligation that lacks both a domain entry and an allow-list entry`
fails, listing `insurancePolicyNumber` in the received-missing array.

### Baseline after gap-closing

**15 test files, 382 tests, all pass.** Up from 13/345 before the two
new test files landed.

The updated mutation summary table at the top of this document reflects
the closure — mutations 3 and 5 now show 1 failing test each rather
than 0.
