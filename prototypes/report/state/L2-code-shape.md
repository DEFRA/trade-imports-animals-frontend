# L2 — Code shape, complexity and coupling

Sides: **A** = `live-animals` (clone-live-animals, b6ac2ed, `prototypes/standalone/live-animals/`)
       **B** = `flow-layer` (clone-flow-layer, d59b432, `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`)

**VERDICT: B-better** — on the axes this dimension actually names (coupling, purity, standalone-library-ness), B wins decisively and it is not close. But the win comes with one sharp, material carve-out that runs the other way and that neither L1 could see alone: **A's activation model is closed data; B's is open code.** A can statically recover its own obligation dependency graph and prove reachability. B structurally cannot. The L1-A read called A's non-serialisability "the sharpest asymmetric limitation on side A" — that is **wrong as an asymmetry**. Both models are non-serialisable, and B is the worse of the two.

---

## 1. The named axes: coupling and purity

| | A | B |
|---|---|---|
| Framework imports in model source | `(request, h)` threaded through **7 of 10** engine exports (`write.js:11,20,48,80,83,86,89`; `read.js:43`) | **Zero `@hapi` imports anywhere in source.** `grep -rln "@hapi"` over the spike returns only test files + one *comment* (`lib/state.js:2`) |
| Model instantiable against a second manifest? | **No.** `registry` is a module singleton imported at **9 production sites**; there is no `createEngine(model)` | **Yes.** `createObligationEvaluator({obligations})` — manifest injected (`evaluator.js:44-46`) |
| Module-level mutable globals | **5** (`dispatch.js:3-6`, `records.js:8`, `session.js:11`, `read.js:7`) — boot order load-bearing (they do all fail loud, to A's credit) | 1 (`contract.js:42-44` builds the evaluator at load) |
| Layering inversion | `engine/journey.js:1` imports `BASE` — **the engine imports the web mount path** | `engine/index.js:27` hard-imports the concrete `domain` singleton, shadowing its own `domain` parameter (`:318-324`) |
| Model runs headless? | Yes — `dump.js`, `analysis/reachability.js` | Yes — `dump.js` (138 LOC, snapshot-pinned) |

A's **evaluator** (`engine/evaluate/`, 258 LOC) is genuinely pure — zero hapi, zero flow, zero services. That is A's best asset and the seam is in the right place. But A's **engine** is not: you cannot read or write journey state without a hapi request object. `engine/test-support.js` (68 LOC of fabricated `journeyRequest()`/`recordingH()` fakes) and `engine/store.js` (12 LOC, **20 test importers, 0 production importers**) exist solely to pay this tax.

B's model layer has no framework dependency of any kind. On the literal question the dimension asks — *"is the model a standalone library or entangled with hapi/routing/session?"* — B is a standalone library and A is entangled.

**But B's own claimed seam does not hold.** `contract.js:1-11` asserts "Controllers and templates only call functions on this module." The enforcement grep cited in `RECOMMENDATION.md:347`, `obligations.md:1888` and `NEXT.md:121` tests for `from '../engine` — but feature controllers are *two* directories deep and import `from '../../domain/index.js'`, which does not match. The documented grep has a false negative for **exactly the directory that violates it**. Nine real violations sit in `features/` (`check-your-answers/controller.js:26-27`, `commodity-lines/controller.js:20-22`, `units/controller.js:21-23`, `hub/controller.js:15-16`), and **no test enforces the seam at all**. It is a convention with a broken enforcement mechanism, not an architecture. Cheap to fix (~1 day); must be fixed before anyone cites the seam as a reason to prefer B.

---

## 2. The carve-out that refutes the prior: closed data vs open code

This is the finding that only appears when both sides are read together.

**A's `activatedBy` is data.** A plain object interpreted by a **closed four-operator vocabulary** that *throws* on anything unknown:

```js
// engine/evaluate/predicate.js:12-28
export function applyPredicate(activatedBy, value) {
  if ('equals' in activatedBy) ...
  if ('includes' in activatedBy) ...
  if ('notInUnionOf' in activatedBy) ...
  if ('present' in activatedBy) ...
  throw new Error(`Unknown activation predicate: ...`)
}
```

Every rule names its antecedent as data (`activatedBy.obligation`). The dependency graph is statically recoverable. **A's model is one pointer→id substitution away from being JSON.**

**B's `applyTo` is a function.** `helpers.js:39-57` returns a closure. B knows this costs introspection and tries to buy it back with a `.metadata` sidecar (`helpers.js:17-19`: *"Enables optional static introspection / cross-language export"*). Census of the ~40 `applyTo` definitions in `obligations/obligations.js`:

| Gate | Count | Metadata | Statically analysable? |
|---|---|---|---|
| `allowListed` | 6 | `{type, obligation: id, values, projection, reasons}` | **Yes** |
| `anyAllowListed` | 2 | `{type, obligation: id, values, whenTrue, whenFalse}` | **Yes** |
| `allowListedByPredicate` | 3 | contains a **raw JS function** (`helpers.js:88`) | No |
| `branchedGate` | 6 | `{type, whenTrue, whenFalse}` (`helpers.js:135-139`) — **omits both the predicate AND the gate obligation** | **No — you cannot even discover *which* obligation it depends on** |
| bare inline arrow `() => ({inScope: true, status: 'mandatory'})` | ~19 | **none** | No |

**Roughly 8 of ~40 (20%) of B's manifest is statically exportable.** `GAPS.md` concedes it in one line: *"Custom one-off applyTos just omit metadata."*

So the serialisability ledger is the reverse of what L1-A assumed:
- **A → JSON:** a bounded, semantics-preserving pointer→id rewrite (~160 LOC across `predicate.js` + `complete.js`). Every rule survives, because the operator set is closed and finite.
- **B → JSON:** impossible for ~80% of the manifest at any cost short of rewriting every `applyTo` as data — which is precisely the `gatedBy` DSL that B **prototyped and deliberately rejected** (`GAPS.md:62-86`).

And B's rejection is *well-reasoned*, not lazy: idiomatic JS, no interpreter, standard debuggers work, obligation-level testability with no evaluator to construct, cross-sibling closures avoid attach-after-declaration mutation. **This is a real, considered trade, and both sides picked a defensible end of it:**

> **A's closed vocabulary buys static analysability and costs expressiveness-without-an-engine-change. B's open closures buy unbounded expressiveness and cost static analysability.**

That sentence is the whole dimension, and it is the third option's actual reason to exist (§6).

---

## 3. The other structural asymmetry, running B's way: scope is a Set vs a projection

A's evaluator returns a **flat set of obligation ids**:

```js
// engine/read.js:27-35
export const makeScope = (answers) => {
  const { inScope } = reconcile(answers)          // reconcile.js:9 — const inScope = new Set()
  return { inScope, has: (id) => inScope.has(id), ... }
}
```

`scope.has('passport')` means *"passport is in scope **somewhere**"*. It cannot say **which line**.

B's returns a **per-instance projection**:

```js
// obligations/helpers.js:198-209 (filterAndProject)
if (!projectionGroup) return { inScope: true, records: passingKeys }
...
return { inScope: records.length > 0, records }      // records = instance paths
```

This is a **return-type difference, not a missing feature** — and it is the direct cause of A's worst code-shape defect. A's render layer needs *"which fields apply to **this** commodity, **before** the entry exists"*; the Set cannot answer; so every controller hand-rolls it:

| Imperative restatement | file:line | Restates |
|---|---|---|
| `cphApplies` | `cph-number/controller.js:12` | `countyParishHoldingCph.activatedBy` |
| `unweanedApplies` | `additional-details/controller.js:13` | `containsUnweanedAnimals.activatedBy` |
| `packagesApply` | `consignment-details.controller.js:17` | `numberOfPackages.activatedBy` |
| `typeApplies` / `fallbackApplies` / `permanentAddressApplies` | `animal-identification.controller.js:42, 67, 131` | reach into `activatedBy.includes` / `.notInUnionOf` directly |

**Six rules, 11 call sites, zero tests pinning any of them to the engine.** Change a `frame` or an operator in the model and the controller silently keeps the old semantics. `animal-identification.controller.js:3` even bypasses the 10-export facade to import an engine internal (`includesUnion` from `engine/evaluate/predicate.js`).

B has one copy of each rule, and derives its field widgets from the model (`lib/build-field-descriptors.js`, `lib/field-widgets.js`) because `records` tells it which instances are live.

---

## 4. Complexity and duplication — same shape, different kind of damage

Both sides keep the model flat and push the branching into controllers. That part is a tie.

| | A | B |
|---|---|---|
| Model data | 44 obligations / 314 LOC | 44 obligations / 843 LOC, **6 branch tokens** |
| Flow | `flow/` 460 LOC | `flow/flow.js` 667 LOC, **9 branch tokens** — verified pure data, declares **no visibility rules whatsoever** |
| Evaluator | `engine/evaluate/` 258 LOC | `evaluator.js` 519 LOC + `engine/index.js` 601 LOC |
| Model's worst function | `entryComplete` (`complete.js:5-56`), 51 LOC, 4 params, mutual recursion | `classifyEntries` (`engine/index.js:386-410`), 25 LOC, 5 flat branches |
| Worst function overall | `animal-identification.controller.js` (566 LOC file) / `notification-mapper.js` (507 LOC, 97 branch tokens) | `cyaController.get.handler` (`check-your-answers/controller.js:201-350`) — **~150 lines, nesting depth 4, no unit test** |

**No function in B's `engine/`, `evaluator.js`, `domain/` factories, `flow.js` or `contract.js` exceeds ~50 lines.** B's model is not where the complexity is, and that is a verified property.

**The duplication differs in kind, and this matters more than the volume:**

- **A duplicates RULES.** Six conditional rules exist twice (declarative + imperative), with no equivalence test. Worse, `activatedBy` has **three interpreters**: `applyPredicate` (`predicate.js:12-28`, throws on unknown — good), `entryComplete` which re-implements `predicate.js:64-68`'s frame resolution inline (`complete.js:26-41` — the "resolver-unity invariant" is maintained *by duplication, not by sharing*; `DESIGN-DELTA #5` exists because they drifted), and `gateValue` in `analysis/reachability.js:36-45` (silently returns `undefined` on unknown — bad). **Adding a 5th operator means editing 3 places, only 1 of which fails loud.**
- **B duplicates PLUMBING.** Three near-identical page-controller factories (`lib/{page,line-page,unit-page}-controller.js`, 431 LOC; 98 of the unit controller's 179 lines are byte-identical to the line controller's). Depth is hardcoded at **5 places per level** (page factory, `nextAfterFor*`, engine walk primitive, `routes.js:154` identity branch, bespoke Add-another feature dir). A depth-3 group costs ~300–400 LOC of new-but-not-novel code.

**A's duplication can produce wrong answers. B's produces boilerplate.** Both are bad; only one is a correctness risk.

*(B's model is depth-generic — `within` chains arbitrarily, composite keys are `PATH_DELIMITER`-joined at any length. Its **browser layer** is not. The one depth assumption that reaches into B's model is `pathPrefix()` at `helpers.js:212-215`, which takes only the first path segment, so a gate can only project from a depth-1 ancestor. `model-spikes/GAPS.md` "Gap 1" acknowledges this and does not solve it.)*

---

## 5. Dead code

| | A | B |
|---|---|---|
| Dead vocabulary | `system` and `renderOnly` flags: **0 carriers**, 5 + 1 read sites. `system` is *the escape hatch* for the boot coverage assert — never exercised. **2 of 11 model keys (18%)** | 2 of 6 gate factories unused (`matches()` `helpers.js:147`, `present()` `:165`) |
| Dead exports | `updateEntry` (`write.js:83`) — exported through the 10-export facade, **zero callers** | 4 dead exports, **2 with lying JSDoc** (`pageRouteName()` "used by the plugin registrar" — it is not; `findUnitPage()` "used by the router" — `routes.js:154` inlines it instead) |
| Frozen ancestor | — | **7,087 LOC (21% of B)** in `model-spikes/obligations-v4-model/` — a **byte-identical** duplicate `evaluator.js` and a second 2,940-line `obligations.md`. Any future evaluator fix has two homes and one will silently not get it |

**B is worse on dead code**, chiefly because of the 7k-LOC frozen ancestor. Deleting it (keeping `GAPS.md`, the only file there with unique value) is free.

Both sides' docs rot. A's `limits.md` is materially wrong in four places — and wrong in *both directions*, understating A's own capability three times (depth-2, enclosing-frame completeness, and the update path all work, contra the doc). B's `obligations.md` (3,010 lines) held up on every central claim spot-checked. **Doc volume is not doc reliability; B's big doc is the more trustworthy one.**

---

## 6. Onboarding

**It depends entirely on what the new developer's first task is, and that is the honest answer.**

- **"Change a conditional rule."** → **B, decisively.** In B the rule lives in exactly one place (the `applyTo` closure) and the widgets derive from it. In A it lives in up to six (obligation, controller schema, controller commit, template, hand-composed CYA row, plus any `*Applies` restatement other features import) with no test binding them. If a new developer on A believes the declarative model is the source of truth, **A will lie to them at exactly the points that matter** (`cphApplies` vs `countyParishHoldingCph.activatedBy`).
- **"Read the model and understand the journey."** → **B.** Three files, ~2,100 LOC, no framework, no magic: `flow/flow.js` (pure data), `obligations.js` (6 branch tokens), `engine/index.js` (14 named pure fns, none over 50 lines). A's model layer is smaller and also readable in an hour — but it is only 6.9% of the source, and it is *not where the behaviour lives*.
- **"Add a page / a feature / a new depth."** → **A.** A's page-owned spine takes a new page with a controller. B needs a 4th page factory, a 4th `nextAfterFor*`, a 4th engine primitive, another `routes.js` identity branch and a 3rd bespoke Add-another directory.
- **"Prove we haven't forgotten to wire something."** → **A.** `flow/dispatch.js:55-63` crashes at *boot* if any obligation is collected by no page; `contract.test.js` (328 LOC) drives every real POST handler and asserts the committed obligation-id set equals the page's declared `collects`. B's nearest equivalent (`obligations/coverage.test.js`, 190 LOC — obligation↔domain wiring, `within`-cycle detection, id/name uniqueness) is excellent and cheaper to port, but covers the model half only.

A caveat that must be stated for honesty: **the headline LOC ratio is not apples-to-apples.** A's 8,323 source LOC carries ~3,133 LOC of services/persistence/mappers/uploads that B simply does not have. A's model being "6.9% of source" is partly an artefact of A having built more surface. **The conditionality-location finding (§3) survives that caveat and the raw percentage does not** — cite §3, not the percentage.

---

## 7. Retrofit

### B → A (move B's code-shape into A)

| Move | Breaks | Verdict |
|---|---|---|
| **Replace A's `Set`-shaped scope with B's `{inScope, records}` per-instance projection** | Every consumer of `scope` — `read.js:27-35`, `status.js`, `gates.js`, all 24 controllers' `scope.has()` calls, the `flow/dispatch` index | **DO IT.** It is a genuine engine return-type refactor, but it lets you **delete all 6 imperative restatements and their 11 call sites** — A's single biggest correctness risk |
| **Inject the manifest (`createEngine(registry)`)** | 9 production import sites (`status.js:1`, `complete.js:1`, `cardinality.js:3`, `collection-view.js:2`, `read.js:3`, `reconcile.js:1`, `dispatch.js:1`, `prerequisites.js:1`, `entry-guard.js:4`) + 5 module globals | **DO IT.** Mechanical, ~1 day, zero semantic change |
| **Drop `(request, h)` from the 7 engine exports; pass a store** | All 24 controllers' call sites | **DO IT.** Lets `engine/test-support.js` (68 LOC) and `engine/store.js` (12 LOC, 0 production importers) be **deleted** |
| **B's `applyTo` closures** | `analysis/reachability.js` (215 LOC) and the closed-vocabulary throw (`predicate.js:26-28`) | **DO NOT.** A would lose the only static totality proof either side has. If A needs n-ary predicates, add an operator — or add an escape hatch that *must* declare `dependsOn: [obligation…]` |

### A → B (move A's code-shape into B)

| Move | Breaks | Verdict |
|---|---|---|
| **A's closed operator vocabulary, wholesale** | ~40 `applyTo` closures rewritten as data + a new interpreter | **DO NOT.** This is exactly the `gatedBy` DSL B prototyped and rejected on good grounds (`GAPS.md:62-86`). Undoing B's central design decision is not a retrofit, it is a different spike |
| **★ Mandatory `.metadata` with a declared `dependsOn: [obligation…]` on every gate** — including `branchedGate` and the ~19 bare arrows | Nothing. ~30 LOC in `helpers.js` + one `coverage.test.js` assertion | **★ THE SINGLE HIGHEST-VALUE ITEM ON THE WHOLE LIST.** It restores the statically recoverable dependency graph — the thing B currently structurally cannot have — **without giving up closures.** It buys A's analysability at ~5% of A's cost, and it is the synthesis neither side has |
| A's boot-time page-coverage assert (`flow/dispatch.js:55-63`) | Nothing — `flow.js` already declares `presents: [{obligation}]` per page, so the inversion is free | **DO IT.** Low cost, catches "you forgot to wire the field" at boot |
| A's `contract.test.js` handler↔declaration equivalence net | Nothing — B has `routes.test.js` (1,011 LOC via `server.inject`) but no such equivalence assert | **DO IT.** Low-medium |
| A's `(request, h)` engine, 5 module globals, identity-pointer references | — | **DO NOT.** B is already better on all three |

### The third option's shopping list

- **From B:** the zero-framework model layer; the manifest-injected evaluator (`createObligationEvaluator`); the per-instance `{inScope, records}` scope projection; pure-data `flow.js`; `coverage.test.js`.
- **From A:** the closed-vocabulary *discipline* → a statically recoverable dependency graph → the reachability/totality proof; the boot-time page-coverage assert; the `contract.test.js` handler↔`collects` net.
- **The synthesis neither side has:** **closures for expressiveness + mandatory declared `dependsOn` metadata for analysability.** A has analysability without expressiveness. B has expressiveness without analysability. There is no reason a third option cannot have both, and the cost is ~30 LOC.
- **Fix before shipping either:** B's seam grep (broken, false-negative on the exact violating directory) and B's `engine/index.js:27` domain singleton (defeats its own injection parameter, ~20 LOC).
- **Delete on sight:** B's `model-spikes/` frozen ancestor (7,087 LOC, byte-identical duplicate evaluator — keep `GAPS.md`).
