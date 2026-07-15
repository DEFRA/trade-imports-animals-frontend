# L3 — adversarial verification — docs-extensibility — DE-4

**CLAIM:** A's gate vocabulary is closed and total — `activatedBy` literals over exactly 4
operators (equals / includes / notInUnionOf / present), interpreted in one place — and even A's
two gate "helper functions" are data-literal factories, not closures, so **every gate in A** is
enumerable and analysable **without executing it**. The one axis on which A structurally beats B.

**VERDICT: AMENDED.** The load-bearing half — *A's obligation-scope gates are closed-vocabulary
data where B's are closures, and that buys static introspection B structurally cannot have* — is
true, and the claim actually **under-sells** it (A has shipped a gate-**inverting** reachability
prover that is unwritable against B's `applyTo`). But four sub-assertions do not survive contact
with the source: **"every gate"**, **"total"**, **"in one place"**, and **"without executing it"**.

---

## 1. What the cited evidence shows — VERIFIED

`engine/evaluate/predicate.js:12-29` — the 4-operator table is real and total **by construction**,
not convention: `equals` / `includes` / `notInUnionOf` / `present`, then
`throw new Error('Unknown activation predicate: …')` at `:26-28`. No `typeof === 'function'`
branch, no `predicate:` key. Nothing in the **obligation model** escapes.

`features/commodities/obligations.js:25-29` and `:62-66` — verified as cited: both factories return
plain object literals (`{ obligation, frame, includes }` / `{ obligation, frame, notInUnionOf }`).
Not closures.

I hunted a function-valued gate across A's whole obligation tree and found none: every `activatedBy`
site (`origin:15`, `import-purpose:6`, `cph-number:7`, `additional-details:9`, `transport:20,32,42`,
`commodities:13,33,39,45,51,70,76,83`) is an object literal or a call to one of the two factories.

**And it is cashed in, in ways B structurally cannot copy — this is the strongest part of DE-4 and
the claim does not make it:**

- `analysis/reachability.js:36-47` — `gateValue(activatedBy)` **inverts** each operator to synthesise
  a value that opens the gate, including minting a token guaranteed outside a `notInUnionOf` union
  (`:41-43`). `scaffoldFor` (`:49-91`) then walks `frame:'enclosing'` / `'anyItem'` to build the
  enclosing frames, and `proveReachability` (`:184-215`) proves every declared obligation has a
  witness answer-set that puts it in scope on a reachable page.
- `features/commodities/animal-identification.controller.js:67-68` — a controller reads the gate's
  **payload as data** (`includesUnion(obligation.activatedBy.notInUnionOf)`) to choose widgets.

You cannot write `gateValue` against B: inverting an arbitrary `(fulfilments, idsByObligation) =>
Decision` closure is not a thing, and B's own `data-dictionary-sketch.js:33-34` degrades to
`{ kind: 'custom-applyTo' }` for any closure without a metadata sidecar — which is 18 bare
`applyTo: () => ({inScope:true,status:'mandatory'})` plus 5 `branchedGate` in
`obligations/obligations.js` (verified by grep). **The asymmetric capability is genuine and it is A's.**

---

## 2. REFUTED sub-assertion: "every gate in A" / "total" — A has a live arbitrary-closure gate hatch

`flow/gates.js:21-22` and `:30-31`:

```js
export const pageGatePasses = (page, scope) => {
  if (page.gate) return page.gate(scope)        // arbitrary closure — wins outright
export const sectionGatePasses = (section, scope) => {
  if (section.gate) return section.gate(scope)
```

Live at `flow/flow.js:72` — `gate: (scope) => scope.readyForCheckYourAnswers` on the `review`
section: the gate on the single most consequential transition in the journey (can the user reach
check-and-submit) **is a closure**, opaque to every analyser the claim credits A with.

A's docs are more honest than the claim. `docs/flow-and-gates.md:39`: *"An authored gate wins
outright — the derivation is never consulted."* And `docs/limits.md:64` names it as the **declared
growth path**: *"A future section mixing conditional and unconditional obligations… The author must
then write an authored `gate` override… The override slot exists for this reason."*

This is the reverse of "not built / could be built": the closure hatch **is** built, **is** used, and
A's own limits page says it will be reached for again. A and B differ here in **degree and
discipline (1 closure vs 39), not in kind**.

## 3. REFUTED sub-assertion: "without executing it"

- **A's own whole-journey analyser executes the closure.** `analysis/simulate.js:3,9,11` imports
  `pageGatePasses` / `sectionGatePasses` and calls them against a live scope — the only way a closure
  can be handled.
- **The gates are an object graph, not JSON.** `predicate.js:36,40,65` holds `activatedBy.obligation`
  by **object identity**, not an id string; and `includes:` payloads are function calls resolved at
  import (`commodities.packageCountCommodities()` etc.). Benign (services/commodities/index.js is
  synchronous constants re-exported from `stub.js`, no I/O) — but the honest phrasing is "enumerable
  by **importing the module graph**", not "from source text".
- **Even the reachability prover is only semi-derived**: `analysis/reachability.js:8-20`
  `enumerateScopeStates()` is a **hand-maintained** cartesian product over four hardcoded obligation
  ids. Add a fifth top-level gated obligation and the "exhaustive" enumeration silently stops being
  exhaustive.

## 4. REFUTED sub-assertion: "interpreted in one place" — there are three

| Site | On an unknown 5th operator |
|---|---|
| `engine/evaluate/predicate.js:12-28` (`applyPredicate`) — evaluate | **throws** |
| `analysis/reachability.js:36-47` (`gateValue`) — invert | returns `undefined` — **silent** |
| `features/commodities/animal-identification.controller.js:67-68` — render | hand-inlines `notInUnionOf` semantics rather than calling `applyPredicate` |

Adding an operator means editing at least three places, and only one fails loud.

## 5. NEW finding — **shadow gates**: enumerating `activatedBy` does not tell you what the user sees

A's presentation layer contains **imperative restatements of gates the model already holds**, which
no enumeration of `activatedBy` would ever surface:

- `features/check-answers/controller.js:111` — `answers.regionOfOriginCodeRequirement === 'yes'`
  restates `features/origin/obligations.js:15` (`equals: 'yes'`) in JS.
- `features/additional-details/controller.js:13-18` — `unweanedApplies(answers)` hand-rolls
  `[].concat(answers.commodityLines).some(line => unweanedCommodities().includes(line?.commoditySelection))`,
  a manual re-implementation of the **declarative `anyItem` gate** at
  `features/additional-details/obligations.js:9-12`. Imported and used for CYA row visibility at
  `features/check-answers/controller.js:136`.

Note the same feature's *page* render path **does** read scope (`additional-details/controller.js:61,67`
`scope.has('containsUnweanedAnimals')`) — so this one is "not wired", not "cannot" — but the effect
stands: **totality is a property of A's scope engine, not of A's application.** A tool that reads
every `activatedBy` still cannot tell you whether CYA shows the row, and the two can drift.

## 6. The caveat for the third option: closedness is bought with inexpressiveness

A gate references **exactly one** obligation; there is no AND/OR/NOT composition (`notInUnionOf` is a
bespoke complement-by-reference, not general negation). All 18 live gates are single-referent because
A's journey has not yet needed a compound condition. When it does, the vocabulary has nowhere to put
it **except the flow-layer closure hatch** — exactly the scenario `limits.md:64` predicts. B's
`applyTo` / `allowListedByPredicate` express compound conditions today, at the cost of opacity.

So the real trade is not "A closed vs B open" but **"A closed-but-inexpressive with an unbounded
closure hatch bolted on the side, vs B fully expressive and 79% opaque"**. The third option wants A's
closed vocabulary **plus declared composition** (`allOf`/`anyOf`/`not`) so the hatch is never reached
for a merely-compound condition, plus B's `allowListedByPredicate` shape as an **explicitly declared**
escape so the places where totality is broken are enumerable rather than indistinguishable from
ordinary gates — and no shadow gates in controllers (§5).

---

## What I searched

- `grep -rn activatedBy` across all of A (features/, engine/, flow/, analysis/, docs/, spec/) — 18
  code sites, all data literals; read every one. No function-valued gate anywhere.
- `grep -rn "gate:"` across A — `flow/flow.js:72` (live closure gate) + 2 in `flow/gates.test.js`.
  Read `flow/gates.js`, `analysis/simulate.js`, `analysis/reachability.js` in full.
- `grep` for the four operator keys — found the three interpretation sites in §4; no hidden 5th operator.
- Checked the other gate-adjacent keys (`required`, `enforcedAt`, `requiredAtLeastOne`,
  `requiredOneOf`, `maxEntriesFrom`, `wipeOnExit`) — all data keys, no closures leak in.
- Grepped A's controllers/templates for hand-written answer conditions → found the §5 shadow gates.
- B side, to test the asymmetry rather than assume it: `data-dictionary-sketch.js:33-34`
  (`custom-applyTo`) and the 39 `applyTo:` sites in `obligations/obligations.js` — B has no
  gate-inversion story. The asymmetry holds.
- Doc-vs-code: `docs/flow-and-gates.md:39`, `docs/limits.md:64` — here the **docs are more honest than
  the claim**; they name the hatch the claim denies exists.
