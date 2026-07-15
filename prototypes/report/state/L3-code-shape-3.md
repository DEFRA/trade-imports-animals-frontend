# L3 — code-shape — Claim C3 — adversarial verification

**CLAIM:** *"A's scope is a flat Set of obligation ids; B's is a per-instance projection. This is a RETURN-TYPE difference, not a missing feature, and it is the direct mechanical cause of A duplicating 6 conditional rules by hand with zero tests binding them to the engine."*

**VERDICT: REFUTED.** Both central assertions fail at the source.

---

## 1. "A's scope is a flat Set of obligation ids … it cannot name a line" — FALSE

`engine/evaluate/reconcile.js` does not key `inScope` by obligation id. It keys it by **instance path**:

```js
// reconcile.js:13-27
for (const { path, obligation, collectionAncestorKey, frames } of nodes) {
  const key = pathKey(path)                       // ← path, not obligation.id
  ...
  inScope.add(key)
}
```

`pathKey` (`lib/path.js:1-10`) produces `commodityLines[0].numberOfPackages`, `lines[0].units[0].fallbackDetails`, `commodityLines[1].animalIdentifiers[0].permanentAddress`.

A's own tests prove per-instance resolution, including the exact discrimination the claim says is impossible:

- `item-conditional.test.js:31-32` — `inScope.has('commodityLines[0].numberOfPackages') === true`, `…[1]… === false`. **Line 0 in scope, line 1 not.** That IS naming a line.
- `engine/evaluate/cross-frame.test.js:252-255` — depth-2: `lines[0].units[0].fallbackDetails` true, `lines[1].units[0].fallbackDetails` false, and the inverse for `typedEarTag`.
- `dump.js:53` — production-adjacent: `inScope.has(packagesPath)` where `packagesPath` is a constructed instance path.

`scope.inScope` (the raw Set) is exposed on the facade (`engine/read.js:30`) and is already used path-wise. So A's evaluator **is** a per-instance projection. It is a *set of instance keys* rather than a *per-obligation decision object carrying its passing instances* — a query-ergonomics difference (you must construct the key; B hands you `records`), not a modelling-capability difference.

**What IS lossy on A is the consumer convention, not the return type.** Three layers query at obligation-id granularity, which only matches depth-0 path keys:

- `engine/read.js:31` — `has: (id) => inScope.has(id)`
- `flow/gates.js:17-19` — `obligationIds.some((id) => scope.inScope.has(id))`
- `engine/status.js:26,60` — `partKey(part)` collapses a facet to its top-level `part.collection`

Visible symptom: pages that collect indexed obligations are forced to declare `collects: []` (`consignment-details.controller.js:14`, `animal-identification.controller.js:20`) because the id-keyed gate/status layer could never match their path keys. That is a real defect and worth citing — but it is a **facade** defect, fixable without touching the evaluator, and the claim mis-locates it in the evaluator's return type.

## 2. "…the direct mechanical cause of A duplicating 6 conditional rules" — FALSE. B does the same thing, for the same reason, and has already been bitten by it.

The real cause of the `*Applies` functions is **prospective scope**: both `reconcile` and B's `filterAndProject` compute over *stored* state, so neither can answer *"which fields apply to an instance that does not exist yet"* — the blank add-a-unit form (`animal-identification.controller.js:321-360, buildCard` renders fields for a unit the user has not created) and the pre-selection commodity row (`consignment-details.controller.js:52 showPackages: packagesApply(name)`).

B says this **verbatim, in its own source**:

```js
// clone-flow-layer/.../features/units/controller.js:176-185
/** Pick a unit-scoped obligation whose applyTo lets this line's
 *  commodity code open at least one record … Uses the `allowListed` helper's
 *  `.metadata` sidecar rather than executing the applyTo closure,
 *  because at add-time no unit exists yet, so `impl.inScope` is
 *  false for the very obligation we want to seed (chicken-and-egg:
 *  the evaluator's projection over `unitRecord.records` returns [],
 *  so the applyTo closure short-circuits before checking codes). */
```

**B's `records` projection explicitly does not solve the problem the claim credits it with solving.** B's workaround is structurally the *same move A makes* — bypass the engine, reach into the gate's declarative payload, re-dispatch the operator in the controller:

| Side | Function | file:line | Re-dispatches on |
|---|---|---|---|
| B | `pickSeedObligationForLine` | `features/units/controller.js:186-222` | `meta.type === 'allowListed' && meta.values?.includes(lineCode)` / `meta.type === 'allowListedByPredicate' && meta.predicate?.(lineCode)` |
| B | `lineHasWiredUnitObligation` | `features/commodity-lines/controller.js:104-124` | identical two-branch hand-dispatch |
| A | `typeApplies` | `animal-identification.controller.js:42` | `obligation.activatedBy.includes.includes(commodity)` |
| A | `fallbackApplies` | `animal-identification.controller.js:67` | `!includesUnion(obligation.activatedBy.notInUnionOf).includes(commodity)` |

**Neither of B's two has a test.** `grep -rn "pickSeedObligationForLine\|lineHasWiredUnitObligation"` over the whole flow-layer spike returns only the two definitions, their two production call sites (`units/controller.js:277`, `commodity-lines/controller.js:158`), docs, and a *comment* at `helpers.test.js:116-117`. Same defect the claim charges A with, on the same axis, unmitigated.

**And B has already shipped the drift bug this pattern causes.** `docs/add-an-obligation.md:678-689`:

> "Iteration 9's browser-side helpers (`pickSeedObligationForLine`, `lineHasWiredUnitObligation`) had a stub `if (meta.type === 'allowListedByPredicate') return true` because there were no wired obligations using that gate. Now that there are two, the stub needed to actually evaluate the predicate…"

A hardcoded `return true` that silently over-approximated scope until a human noticed. Exactly the failure mode ("change an operator in the model and the controller silently keeps the old semantics") the claim presents as A-specific.

Worse, B's dispatch **silently under-approximates by construction**: `if (!meta) continue` (`units/controller.js:205`, `commodity-lines/controller.js:111`). ~19 of B's ~40 `applyTo`s are bare arrows with no metadata and `branchedGate` metadata omits the gate obligation entirely (`helpers.js:135-139`) — so any obligation gated that way is invisible to both helpers, forever, with no error.

## 3. "6 rules duplicated by hand with zero tests" — materially overstated

- **The value lists are single-sourced, not duplicated.** `countyParishHoldingCph.activatedBy.includes = commodities.cphCommodities()` (`cph-number/obligations.js:10`); `cphApplies` calls `commodities.cphCommodities()` (`cph-number/controller.js:16`). Same for `numberOfPackages` (`commodities/obligations.js:15` vs `consignment-details.controller.js:18`) and `containsUnweanedAnimals` / `unweanedApplies` (`additional-details/controller.js:17`). Change the allow-list and all restatements follow automatically. What is actually restated is (a) the operator and (b) the frame quantifier (`frame: 'anyItem'` → `.some(...)`).
- **3 of the 6 read the obligation object directly** (`typeApplies`, `fallbackApplies`, `permanentAddressApplies` — `animal-identification.controller.js:42, 67, 131`), so they cannot drift on values either.
- **"Zero tests" is wrong; "zero equivalence pins" is right.** The behaviour is covered on both branches: `features/addresses/controller.test.js:36-55` asserts no CPH row without a triggering line and a CPH row with one. There is also `cph-number/controller.test.js` and `check-answers/check-answers.test.js`. What is missing is an assertion binding `cphApplies(answers)` to `reconcile(answers).inScope.has('countyParishHoldingCph')`. That is the accurate charge, and B is equally guilty.

## 4. What survives

- 11 call sites: **verified exactly** (check-answers 136/253/376; animal-identification 119/123/334/435; consignment-details 30/52/181; addresses 36).
- Facade bypass: **verified.** `engine/index.js` exports 13 names and `includesUnion` is not among them; `animal-identification.controller.js:3` imports it from `engine/evaluate/predicate.js`.
- No equivalence test pins any restatement to the engine on **either** side.

## 5. What was searched

- `grep -rn "inScope"` over the whole of A (138 hits, read in full) — established the Set is path-keyed and that tests assert per-instance membership.
- Read `engine/read.js`, `engine/evaluate/reconcile.js`, `engine/status.js`, `engine/index.js`, `lib/path.js`.
- Read all six restatement definitions and their obligations (`cph-number/obligations.js`, `commodities/obligations.js`).
- `grep -rn "cphApplies\|unweanedApplies\|packagesApply\|typeApplies\|fallbackApplies\|permanentAddressApplies"` — 11 call sites, 0 test hits.
- `grep -rn "metadata"` over B's `lib/` + `features/` → found B's two controller-side gate re-dispatchers; read both.
- `grep -rn "pickSeedObligationForLine\|seedObligation"` and `"lineHasWiredUnitObligation"` over B → no tests.
- Read `obligations/helpers.js` (all of it), `obligations/helpers.test.js:100-133`, `docs/add-an-obligation.md:670-729`.

## 6. Consequence for the L2 write-up and the shopping list

`L2-code-shape.md` §3 and the §7 retrofit row **"Replace A's `Set`-shaped scope with B's `{inScope, records}` … lets you delete all 6 imperative restatements"** is **false and should be struck**. Adopting B's return type would delete **none** of the six — B kept every one of them (in its own two-function form) *after* adopting that return type, because the projection is computed over stored records and the restatements exist to answer a question about state that has not been stored yet.

The genuine, shared gap — and the real item for the third option — is a **model-side prospective-evaluation entry point**: `wouldApply(obligation, candidateValue, context) → boolean`, owned by the engine, tested against the engine, callable before an instance exists. A currently open-codes it four times against raw `activatedBy` shapes; B open-codes it twice against `.metadata` and has already shipped one drift bug doing so. Neither side has it. It is small (a few dozen LOC on either model) and it is the only thing on this dimension that would actually delete the restatements.

Secondary, genuinely A-side and worth keeping: A's **id-keyed query facade** (`read.js:31`, `flow/gates.js:19`, `status.js:60`) throws away the instance resolution the evaluator already computed, and forces indexed-collecting pages into `collects: []`. Fixing that is a facade change, not an evaluator change. B's `{inScope, records}` is the better-shaped API to copy — for that reason, not the one the claim gives.
