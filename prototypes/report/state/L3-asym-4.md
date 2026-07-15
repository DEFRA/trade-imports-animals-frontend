# L3 asym-4 — "Express a NOVEL / negated condition shape without an engine change" (B-only)

**CAPABILITY:** the fallback-identifier `'enclosing commodity has NO typed identifier'` gate
(M3-0A, MODEL_EXTENDER). Claimed direction: B-only (A partial, B modelled-declaratively).

**VERDICT: AMENDED.** The structural *core* is true — A's condition vocabulary is a closed
dispatch table, so adding a genuinely new condition **shape** to the model costs a lockstep
engine edit, where B adds any shape as a closure with zero engine edit. But the claim is
**mis-illustrated and over-framed**: the specific example it picks is one A already expresses
declaratively — and more robustly than B — so the "A: partial" label is wrong for this gate,
and "A could not express it" is false. The real asymmetry is narrower ("one engine edit per
*novel* shape, once") and reciprocal (the closedness that costs A here is exactly what buys A
the reachability prover B structurally cannot build).

---

## What I verified in source (not just the L1/L2 write-ups)

### A's interpreter is a closed dispatch — TRUE (structural)
`engine/evaluate/predicate.js:12-29` — `applyPredicate` is four `if ('X' in activatedBy)`
branches, first-match-wins, **`throw` on unknown** (`predicate.js:26-28`). There is no plug-in
table, no registry, no operator map. A genuinely new condition **shape** (not reducible to
`equals`/`includes`/`notInUnionOf`/`present` × 3 frame modes) *cannot* be added except by
editing this file. Confirmed by reading the file.

### The lockstep is real, and it is ≥3 sites — TRUE
`analysis/reachability.js` is a witness-synthesiser that runs as a test on every run. Its
`gateValue` (`reachability.js:36-47`) has a **per-operator branch** and returns `undefined`
for anything it doesn't recognise (`:46`). An unrecognised operator → `undefined` witness →
the obligation is never seeded into scope → `proveReachability` fails with
`'no-witness-puts-in-scope'` (`:191`). So a new operator **must** be taught to `gateValue` in
lockstep or A's prover goes red. That is site #2.
Site #3: `enumerateScopeStates` (`reachability.js:8-20`) is a **hand-written cartesian over 4
named top-level axes** — a new top-level gate needs a hand-edit here too.
Site #4 (conditional): A has no field-widget derivation, so a collection-rendered gate is
re-implemented by hand in the controller — e.g. this very fallback gate is hand-negated at
`features/commodities/animal-identification.controller.js:67-68`. So a novel operator used in
an in-page reveal also needs a controller edit.
The claim's ">=3 interpreters in lockstep" is accurate (predicate.js + reachability gateValue
+ reachability enumerateScopeStates + optional controller render gate).

### B pays zero — TRUE (structural)
`obligations/helpers.js`: `allowListedByPredicate` (`:83-88` metadata, gate body above it) and
`branchedGate` (`:53-62`) are ordinary JS closures over the whole `fulfilments` map. Any new
condition shape is a new closure body — no engine file changes. The negated fallback gate is
`obligations.js:685/:698` (`allowListedByPredicate(commodityCode, noSpecificIdentifier, …)`),
`noSpecificIdentifier` being `!A && !B && !C && !D` (`obligations.js:674-678`). Confirmed.

---

## Why the claim is OVERSTATED — three concrete defects

**1. The chosen example is one A already ships — and ships better than B.**
`notInUnionOf` is a *live, first-class* A operator (`predicate.js:20-24`), carried by
`animalIdentifierIdentificationDetails` and `animalIdentifierDescription` (L1-A §1 census). A
expresses the exact "enclosing commodity has NO typed identifier" gate **as a declarative data
literal today**, and derives the negated set *by reference* to the positive gates
(`includesUnion`, `predicate.js:4-10`) — add a 5th typed identifier and A's complement updates
itself. B's `noSpecificIdentifier` **hand-restates the four whitelist constants**
(`obligations.js:674-678`); L2-conditionality §"Where B is better, A's docs oversell" and
L1-B §5 both flag this as a **live drift bug, one requirement away**. So on the capability
*as literally worded* ("express the fallback-identifier gate"), the direction is not "A:
partial / B: modelled" — **both model the condition declaratively, and A's is the more robust
of the two.** The example refutes itself as evidence of an A weakness.

**2. "A: partial" conflates the CONDITION with the RENDER.** A's gate *condition* is fully
modelled (the `notInUnionOf` data literal). The "partial" is A's *render* side re-implementing
the negation in a controller (`animal-identification.controller.js:67-68`) because A has no
field-widget derivation. That is a real A weakness — but it is the *reveal* gap (asym covered
elsewhere), not "A cannot express the condition."

**3. "A could not express it" is false; the true statement is "A pays a one-time engine edit
per *novel* shape."** A *did* express it — it shipped the operator and now expresses it at
least as well as B. And A has a documented escape hatch — the controller "pressure valve"
(`docs/obligation-model.md:139-143`) — that can express *any* arbitrary novel condition with
**zero engine edit**, behaviourally. The structural gap is therefore specifically "…as a
declarative **model** condition," not "…make the app behave that way." That narrowing is
load-bearing: A's real cost is that a condition expressed via the pressure valve *falls out of
the model* (invisible to reconcile/wipe/status/prereqs/reachability — L2 §3 "the pressure
valve is corrosive"), not that A is incapable.

---

## The reciprocal cost the claim omits (why this is a TRADE, not a B-win)

The very closedness that costs A a per-operator edit is **exactly what makes A's reachability
prover possible**, and that is a **CONFIRMED A-only structural win** (L2-evaluation-engine §3):
`branchedGate` deliberately omits its predicate from `.metadata` (`helpers.js:56-60`), so
**9 of B's 19 conditional obligations are opaque** to any tool, port, or data dictionary
(L1-B §6: 8/44 machine-readable). B's zero-edit openness is *paid for* in un-analysability.
Every novel B closure widens that opaque set; every novel A operator stays enumerable and
invertible. So "B adds a shape for free" and "A must edit the engine" are the two faces of one
trade, not a free lunch for B.

The cost magnitude also favours downgrade: adding one operator to A is **additive** — a 5th
`if` branch in a 4-branch chain, a 5th `gateValue` branch, one cartesian axis. The claim itself
concedes this ("Additive for a single operator"). It is not a rewrite.

---

## AMENDED CLAIM

A cannot add a genuinely **new condition *shape*** (one not reducible to its existing 4
operators × 3 frame modes) as a **declarative model condition** without a one-time, lockstep
engine edit: `predicate.js` (the throw-loud dispatch) + `reachability.js` `gateValue`
(fail-red witness synth) + `reachability.js` `enumerateScopeStates` (hand cartesian, for a
top-level gate) + a controller render gate if the field needs in-page reveal. B expresses any
new shape as a closure with **zero** engine edit. **This is a real structural difference in
model shape (closed dispatch vs open closure) — but it is NOT illustrated by the
`notInUnionOf`/fallback gate, which A already ships and expresses more robustly than B (derived
complement vs B's drift-prone hand-restated whitelist).** The true cost to A is additive and
modest per operator, and A retains a zero-edit behavioural escape hatch (the controller
pressure valve) at the price of the rule leaving the model. The asymmetry is reciprocal: B's
zero-edit openness is precisely why B cannot build A's reachability prover (9/19 gates already
opaque). Shopping-list read: a third option wants **an open closure body with a mandatory,
complete `.metadata` sidecar declaring inputs and admitting set**, so new shapes cost no engine
edit *and* stay analysable — resolving both horns at once.
