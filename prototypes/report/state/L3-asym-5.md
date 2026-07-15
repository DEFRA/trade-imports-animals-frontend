# L3 asym-5 — Static export / introspection of every gate condition + machine-checked reachability

**Claimed capability:** Static export / introspection of every gate condition — a stakeholder
data-dictionary of conditions AND a machine-checked reachability proof over the model.
**Direction:** A-only (A modelled-declaratively / B partial), asserted **structural** — B cannot do
this without changing its model.

**VERDICT: AMENDED.** The claim bundles two capabilities. One (reachability proof) is **not** A-only
and is **not** structural — B can build it by execution, exactly as A's own prover does. The other
(a fully-serialisable data dictionary of *every* condition) is a real gap, but narrower and far cheaper
to close than "become A's model / replace `applyTo`."

---

## Attack 1 — the reachability half is refuted by A's own code

The evidence says A's reachability works because *"the gate graph is enumerable **without executing it**
and gates invert to prove reachability."* Read `analysis/reachability.js` and that description is wrong
about A's own mechanism:

- **It executes the model.** `buildWitnesses` (reachability.js:159-182) loops over a **hand-written**
  24-state enumeration (`enumerateScopeStates`, :8-20 — literally `2×2×2×3` combinations of four named
  fields) crossed with a **60-line hand-authored fixture** (`submitReadySeed`, :95-157), and for each
  candidate calls `reconcile(candidate).inScope.has(targetKey)` (:174). `proveReachability` then calls
  `pagesFor(answers)` = `simulateJourney` (:184-204), which runs `makeScope` (simulate.js:6). This is a
  **bounded exhaustive search that runs the evaluator on candidate inputs and checks the output** — not
  a static proof over the gate graph.
- **Gate-inversion is a bit-part.** `gateValue` (:36-47) is used only inside `scaffoldFor` to synthesise
  values for **collection-nested** gates when building the scaffold. The top-level state space is
  hand-enumerated, not derived from the gates. So even A does not "invert the gate graph to prove
  reachability"; it hand-lists the relevant states and executes.

The technique A actually uses — *enumerate/generate candidate fulfilment states → run the evaluator →
check in-scope + owning-page reachable* — needs only an **executable evaluator**, which B has:

- `createObligationEvaluator` → `makeInScopeCheck` (evaluator.js:301-323) is a per-obligation, effective
  in-scope predicate over **arbitrary** fulfilments (own `applyTo` AND every ancestor group). That is the
  precise primitive A's prover leans on (`reconcile(...).inScope.has(...)`).
- B's whole evaluator is a pure pipeline over a raw fulfilments map — you can feed it generated states and
  read the decisions. Closures being non-invertible is **irrelevant** to an execution-based prover: you
  *run* the closure on a candidate, you don't invert it. A runs its predicates too.

**B's own documentation specifies exactly this, as a planned test, over its unchanged model:**

- `obligations.md:2464-2473` — *"Dynamic reachability … **State-aware reachability** — for
  property-generated fulfilment combinations, the ObligationEvaluator produces a state and the navigation
  primitives yield a page-path the user can navigate to satisfy every in-scope unfulfilled obligation"*
  and *"**`mandatoryToProceed`-on-never-applicable** — for every page entry with `mandatoryToProceed:
  true`, is the obligation in scope in any plausible state when this page is reached? Otherwise the
  constraint is dead code."* These are A's two `proveReachability` failure modes
  (`no-witness-puts-in-scope`, `owning-page-unreachable-in-scope`), described as **execution over
  generated states**, no model change.
- `NEXT.md:765-766` explicitly triages A-style *"`analysis/reachability` / `analysis/simulate`"* as
  *"defer to a future ticket; not needed for the current spike shape"* — B treats the reachability module
  as an **adoptable build item that sits on top of the model**, not a model change and not an
  impossibility.

So the reachability half is **REFUTED as structural**: B has the executable in-scope primitive, has
scoped the identical property-based prover in its own doc, and A's prover is itself execution-based, not
a static gate-graph inversion.

## Attack 2 — the data-dictionary half is real but overstated

Here the claim has genuine substance. A emits **every** gate condition as data: `activatedBy` is a plain
object over a closed 4-operator vocabulary — `equals` / `includes` / `notInUnionOf` / `present`
(predicate.js:12-29) — and `spec/journey-spec.json` is a portable JSON asset carrying those conditions
verbatim. A stakeholder dictionary of conditions falls straight out.

B is partial, and its own dictionary proves it. `data-dictionary-sketch.js:31-36` (`scopeShape`) reads
`obligation.applyTo.metadata`; when absent it returns `{ kind: 'custom-applyTo' }`. Counting the manifest
(L1-obligation-vocabulary-B §3.1):

- **8/44** (`allowListed` ×6 + `anyAllowListed` ×2) — fully JSON-serialisable condition already
  (`{type, obligation, values, projection, reasons}`), emitted with **no change**.
- **9/44** `branchedGate` — metadata carries `{type, whenTrue, whenFalse}` but **omits the predicate**
  (helpers.js:135-139); the *outcomes* are data, the *condition* is invisible.
- **2/44** `allowListedByPredicate` — metadata embeds a **live function**.
- **19/44** bare `() => ({inScope:true,status})` closures — **no metadata at all**.

So 30/44 conditions are opaque as authored, and B **cannot emit a complete condition dictionary without
re-authoring those 30 gates.** That much of the claim stands.

**But the cost is not "replace `applyTo` / become A's model."** The recovery mechanism already exists and
is partly unused:

- The `.metadata` sidecar is B's own idiom (helpers.js), and three data-carrying factories already ship:
  `allowListed` (serialisable), plus **`matches(gateObligation, value)`** (helpers.js:147-153 — metadata
  `{type:'matches', obligation, value}`) and **`present(obligation)`** (:165) — both **shipped and unused
  (0 manifest uses)**. The equality/presence gates currently hand-written as `branchedGate`/bare closures
  (L1-B §2.2: equality at obligations.js:194; presence at :751-752) can be re-expressed through `matches`
  / `present` — factories that already attach serialisable metadata — with **no engine change**.
- The residue is the genuinely compound predicates (e.g. the 4-field accompanying-document all-or-nothing
  block sharing one `branchedGate`, obligations.js:754-786; the inverse set-difference at :674-678). Those
  need **one or two new metadata-carrying factory variants** (e.g. an `allOrNothing`/`notInUnionOf`
  factory), not a new engine and not a serialisable-DSL rewrite. `evaluator.js` is untouched throughout.

The accurate cost is therefore: **route every gate through a metadata-carrying factory + ban bare
closures + add ~1–2 factories for the compound cases** — authoring discipline plus a small helper
extension. That is materially cheaper than the claimed "replace `applyTo` with a data vocabulary." Note
the caveat the claim already made ("the metadata sidecar is a partial recovery only") is the right shape;
what's wrong is scoping the fix at engine-replacement rather than factory-authoring level.

One honest counter-point kept in view: B **deliberately** chose closures and killed a `gatedBy` DSL
(GAPS.md:62-86, :176-198), so making the dictionary complete cuts against a decided architecture and, for
truly arbitrary predicates, hits the same wall A never has (A's vocabulary is closed at four operators).
That is why this half is *real* — but it is a bounded authoring gap, not a structural void with nowhere
to live: the metadata channel, and most of the factories, are already there.

---

## Net

- **Reachability proof:** NOT A-only, NOT structural. B has `makeInScopeCheck`; B's doc scopes the
  identical property-based prover (obligations.md:2464-2473); A's own `reachability.js` is
  execution-based (reconcile + simulateJourney over 24 hand-enumerated states + a 60-line seed), not the
  static gate-inversion the evidence claims. Remove reachability from the asymmetry.
- **Complete data-dictionary of conditions:** real A advantage — A's conditions are 44/44 portable data
  (journey-spec.json); B's are 8/44 portable, 30/44 opaque as authored. But closing it is factory-level
  re-authoring (two needed factories already exist and are unused), with the evaluator unchanged — not
  "become A's model."

This is **not** the clean dual of the novel-operator finding. The novel-operator asymmetry is about what
the model can *express*; this one is about whether an *already-executable* model can be *introspected as
data* — and half of it (reachability) needs only execution, which both sides have.
