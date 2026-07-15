# L4 — Model-expressiveness lens

**Question:** treat each side's obligation vocabulary as a formal language. Is B's
evaluator strictly *more expressive* than A's, or are they *incomparable*? Prove
it with concrete requirements each can state that the other cannot.

**Verdict: the two models are INCOMPARABLE, and the incomparability is not an
accident of unfinished work — it is the expressiveness/decidability duality made
concrete.** Split the question into two languages, because the models are two
languages layered on one substrate:

- **Object-level language** (what *journeys / requirements* the model can
  denote and enforce). Here B is *nearly* a superset of A — B dominates on the
  condition axis and the top-level consequence axis — but **not a superset**:
  there are three object-level statements A can make that B structurally cannot
  (empty-but-existent collection instance; minimum & field-linked-maximum
  cardinality; retain-a-value-while-hidden). So even restricted to runtime
  behaviour, **neither denotes a superset of the other.**
- **Meta-level language** (what statements can be made *about* the model without
  running it — reachability, serialisation, inversion, cross-language port).
  Here **A is a strict superset of B, structurally**, because A's condition
  language is a closed decidable fragment and B's is Turing-complete. This is the
  crown jewel a naive "just adopt B's model" silently discards.

The classic result applies (Felleisen's sense): the more expressive object
language buys strictly fewer decidable meta-properties. A and B sit at the two
ends of exactly that trade, and the source shows each paying the other's price on
a real V4 requirement.

Below, every claim carries file:line on **both** the presence and the absence.

---

## 1. The two condition languages, formally

**A — `activatedBy`: a closed, decidable, single-value-antecedent DSL.**
`applyPredicate` (engine/evaluate/predicate.js:12-29) is a mutually-exclusive
if-chain over exactly four operators — `equals`, `includes`, `notInUnionOf`,
`present` — and **throws** on anything else (predicate.js:26-28). `evalPredicate`
resolves exactly one antecedent, `activatedBy.obligation` (predicate.js:36),
against one of three frame modes (self/`enclosing`/`anyItem`, predicate.js:38-68).

Precise reach of A's condition language, going beyond the L2 "single antecedent"
shorthand:
- **Disjunction over ONE field's values is expressible**: `includes: ['cat',
  'dog','ferret']` (predicate.js:14-19) is "commodityCode ∈ {…}". So A *does*
  have bounded OR — but only over the value-set of a single obligation.
- **`notInUnionOf` reads SEVERAL obligations** (predicate.js:20-24,
  includesUnion predicate.js:4-10) — it unions *their declared allowlists* and
  tests them against the one antecedent value. So A is not strictly
  single-obligation-reading; it is strictly **single-antecedent-VALUE**.
- **Cross-field boolean combination is NOT expressible**: there is no `and`/`or`
  key, no array-of-predicates, no nesting. "regionCode required when countryX =
  A **and** purpose = B" cannot be written; predicate.js:12-25 is the entire
  grammar.

**B — `applyTo`: an open, Turing-complete closure.**
`applyTo(fulfilments, fulfilmentIdsByObligationId)` (evaluator.js:288) is
arbitrary JS over the whole fulfilments map plus the pre-purge group-path map.
Every operator of JavaScript is in the vocabulary; `branchedGate`
(helpers.js:132-141) takes an arbitrary predicate closure; the accompanying-
document block binds four obligations to one shared closure (obligations.js
region ~754-786). B's condition language is therefore a **strict superset of A's
on the object level**: it can compute anything A's four operators compute, plus
compound boolean, arithmetic, `∀`/`∃` over collections, and cross-obligation
reads.

**On the object level, condition axis: B ⊋ A. Proven strict** by the compound-
condition witness (below).

---

## 2. Object-level: what B can state that A cannot (B-only)

### 2.1 Cross-field compound / arithmetic / quantified conditions
Requirement: "purposeInInternalMarket is mandatory when reasonForImport =
internal-market **and** animalCount > 50", or "in scope only if **every**
commodity line is a horse".
- **B:** one closure — `&&`, a numeric compare, `Object.values(...).every(...)`.
- **A cannot, structurally.** The operator set is closed and throws on unknown
  (predicate.js:26-28); `anyItem` is `entries.some(...)` with no `every`
  (predicate.js:57); there is no numeric operator and no cross-field combinator.
  A's own documented escape is to eject the rule into a page controller
  (docs/obligation-model.md — "belongs in a page controller"), and its one live
  numeric rule did exactly that (count-drop, consignment-details controller,
  outside the model). **Adding it = extending the engine's grammar + a witness
  synthesiser in reachability.js — a model+engine change.**

**Honesty check that survives the skeptic:** all 19 of B's live conditional
gates fit inside A's four operators, and A's digested spec contains zero compound
conditions. So this expressiveness is *unpaid-for* on the current V4 set. It is
still a true object-level asymmetry (A cannot *say* it), but the third option
should treat it as headroom, not a daily need.

### 2.2 State-dependent mandate that RETAINS the value (status ⟂ scope)
Requirement (B cites it as a V4 spec line): "regionCode is always shown and its
answer always kept, but it is mandatory when regionCodeRequirement = yes,
optional otherwise."
- **B:** `branchedGate` returns `{inScope:true, status:'mandatory'}` /
  `{inScope:true, status:'optional'}` (obligations.js:190-198). The Decision
  carries `inScope` and `status` as independent axes (evaluator.js:453-508
  consumes both).
- **A cannot, structurally.** A's derived output is `{inScope, wiped}`
  (reconcile.js:47); `required` is a **static boolean** read with no answers in
  scope (complete.js:54). A has no derived `status` axis at all. Its only lever
  is `activatedBy` + `wipeOnExit`, which removes the field from scope **and
  destroys the value** (reconcile.js:32-45). So A's nearest expression is a
  *different* requirement (hidden+wiped, not shown+optional). **Adding it =
  widening reconcile's return type to carry status + branch in complete.js +
  touch all 14 feature obligations — a model-shape change.**

### 2.3 A value domain inside the model
Requirement: "field F ranges over the code set {…} with these labels", so that
widget, validation, CYA and *the gate predicate itself* derive from one place.
- **B:** `staticEnum(options,{labels})` / `computedEnum` / `addressBlock`
  (domain/index.js) — the model *knows* each field's legal value set; gates
  compare locale-invariant codes (obligations.js:194 `=== 'yes'`, and the
  code-comparing gates cited in i18n-copy L2).
- **A cannot, structurally.** The obligation vocabulary has no type/options/copy
  key by explicit decision (docs/decisions.md #6; docs/obligation-model.md:36-42
  — "no type, no copy, no widget choice and no validation"). Note the honest
  correction the presentation-widgets/i18n L2 made to their own L1: the
  obligation-purity guard does **not** block this (obligation-purity.js:13-17
  permits `services/*/index.js` imports), so options *could* be sourced — but the
  obligation record still has no slot to hold a value domain, and there is no
  descriptor/derivation layer (0 LOC). **Adding it = new vocabulary + a new layer
  + reversing a written decision — structural.**

### 2.4 n-ary antecedent (a gate reading ≥2 obligations' VALUES)
Requirement: "these 4 accompanying-document fields are optional until any one is
answered, then all four are mandatory."
- **B:** one shared `branchedGate` over the four siblings (obligations.js
  ~754-786).
- **A partially, then a wall.** A *can* state "at least one of X,Y,Z answered"
  as a **completeness** rule — `requiredOneOf` (complete.js:15-21, used at
  features/commodities/obligations.js:109). That is a genuine cross-field
  disjunction A owns, which the L2 mandate read under-credits. What A cannot
  state is the *consequence* half — "…and then the OTHERS flip to mandatory" —
  because that is conditional mandate over sibling values, and `required` is
  static (§2.2). **So the block is half-expressible in A (the floor) and half-
  impossible (the conditional flip) — structural.**

---

## 3. Object-level: what A can state that B cannot (A-only) — the precious half

These are the statements a "just take B's model" migration throws on the floor.
Each is a *runtime behaviour / representable world-state*, not a meta-property.

### 3.1 A collection instance that exists with zero answered leaves
Requirement: "the trader added commodity line 2 but has not filled anything in
yet — the empty line still exists, is addressable, and can be returned to."
- **A:** `appendEntryAt(path, {})` pushes an empty object (engine/write.js:20-28);
  `walk` yields it (registry.js); a controller has to *guard against* empty
  records (animal-identification controller ~478-486) — proof the model permits
  the state.
- **B cannot, structurally.** In B an instance IS the prefix-set of its
  descendants' composite storage keys (evaluator.js:390-421); groups have **no
  storage of their own** (nothing writes `fulfilments[groupId]`). Zero filled
  descendants ⇒ the instance does not exist, *by construction of the enumerator*.
  B works around it by seeding a placeholder `''` leaf (lib/state.js ~196-200) —
  the workaround is the concession. **Closing it = an instance registry / group-
  own storage = a storage-shape change touching evaluator steps 2/5/6 and every
  state mutator.** B's own doc even sketches an explicit group-instance entry
  (obligations.md:1164) that contradicts its "groups have no storage" invariant
  (:1173-1176) — so this is structural to B's *current* shape, acknowledged.

### 3.2 Cardinality as a vocabulary: a floor and a field-linked cap
Requirement: "at least one commodity line" and "at most N animal-identifier
records, where N = the numberOfAnimals field on the enclosing line."
- **A:** `requiredAtLeastOne` (complete.js:65; carriers at commodities
  obligations.js:108,123) and `maxEntriesFrom` resolved per-frame
  (cardinality.js:20-31), enforced on the write path so an over-cap append
  returns `null` (write.js, per L2).
- **B cannot, structurally.** B has **no cardinality concept in its vocabulary
  at all** — no floor verb, no count relation, and no write primitive to enforce
  a cap against (all writes are imperative in lib/state.js; the evaluator has no
  mutation step). The floor's absence is a **live defect**: zero commodity lines
  ⇒ `journeyState` returns `fulfilled` and CYA prints ready-to-submit (status-
  tasklist L2). **Closing it = a new vocabulary verb + a classifier branch (floor
  ~8 LOC, additive-structural) and, for the field-linked cap, a cardinality
  relation the evaluator can read (structural — new model concept).** Be honest:
  the *cap* is A-only but arguably A shouldn't want the write-time form — it is
  exactly why A's link is one-directional and needs 20 LOC of hand-built
  `countDropIssues` for the inverse. The *floor* is the unambiguous A-only win.

### 3.3 Retain a value while the field is HIDDEN (scope ⟂ retention, A's direction)
Requirement: "hide this field while its gate is closed, but keep whatever the
trader previously typed, so it re-appears pre-filled if the gate re-opens."
- **A:** an `activatedBy` gate **without** `wipeOnExit` yields exactly this —
  out-of-scope means not-rendered/not-required (reconcile.js:9-30), and the value
  survives in `answers` because only `wipeOnExit` obligations are wiped
  (reconcile.js:32-45). The model *permits* it by omitting one flag.
- **B cannot, structurally.** `purgeStorage` drops **every** out-of-scope
  obligation's entry unconditionally (evaluator.js:346-347 `if (!isInScope)
  continue`) — there is no `retainOnExit` opt-out. B's only route to retention is
  to keep the field IN scope and flip status (§2.2). So B can retain-while-
  *optional* but never retain-while-*hidden*. **Closing it = a purge opt-out key
  consulted in purgeStorage — a new model key + a branch (small-structural).**

This is the exact **dual** of §2.2 and it is the sharpest proof of
incomparability on the consequence axis: A retains-by-hiding, B retains-by-
optional, and **neither can do the other's move without a model change.** Honest
caveat: A never *exercises* 3.3 — all 15 `activatedBy` carriers also carry
`wipeOnExit` (census: import-purpose, transport ×3, additional-details,
commodities ×8, origin, cph-number). But the lens asks what the model *can
express*, and A can express it by dropping one flag; B cannot express it at all.

---

## 4. Meta-level: A ⊋ B, strictly and structurally

Everything in §1-3 is object-level (runtime behaviour). The meta-language — what
can be *proven / exported / rendered* about the model without executing it — is
where A is a strict superset, and it is structural because it follows directly
from A's conditions being **data in a closed vocabulary** and B's being
**closures in an open one**.

### 4.1 Static reachability proof by gate inversion
- **A:** `analysis/reachability.js` (215 LOC, run as a test) inverts each gate to
  synthesise a witness value that opens it (per-operator inversion), scaffolds a
  witness journey, runs it through the *real* reconcile, and proves every
  obligation instance is reachable. Possible **only because** a gate is data you
  can read the admitting set off (predicate.js:12-25).
- **B structurally cannot.** Inverting `branchedGate(somePredicate,…)` is
  inverting an arbitrary JS function — symbolic execution over JS, undecidable in
  general — and B withholds the predicate from its own metadata anyway
  (helpers.js:135-139: `{type, whenTrue, whenFalse}`, no predicate), while ~19
  gates are bare closures with no metadata. **Closing it = replace `applyTo` with
  a closed data vocabulary = re-become A on this axis (the killed `gatedBy` DSL,
  GAPS.md:62-86).**

### 4.2 Serialise the whole conditionality to data (JSON / other language / diff)
- **A:** `activatedBy` is a plain object; the only non-data element is the JS
  pointer `activatedBy.obligation`. Pointer→id substitution is a bounded
  semantics-preserving rewrite (~160 LOC) and every rule round-trips, precisely
  because the operator set is closed. (Bitter irony: A's serialised form,
  spec/journey-spec.json, exists and is *unloaded* — dead. A gets the *capability*
  credit, not a running-feature credit.)
- **B structurally cannot** — a closure cannot round-trip through JSON at any
  cost; `.metadata` recovers only 8 of ~40 gates.

**Correction to L1-A carried forward:** L1-A called A's non-serialisability "the
sharpest asymmetric limitation on side A." That is wrong as an *asymmetry* — both
models are non-serialisable at the pointer level, and B is the worse of the two
(closures vs one pointer). The meta-level asymmetry runs the **other** way: A
serialisable-in-principle, B not.

### 4.3 Recover the obligation dependency graph / render a stakeholder data dictionary
Same root: A's antecedent is always named as data (`activatedBy.obligation`), so
the `(obligation → depends-on → operator → value-space)` edge set is extractable
without executing anything. B's `branchedGate` metadata omits *both* the
predicate and the gate obligation, so for ~80% of B's gates you cannot even
statically discover *which* obligation they depend on. **B-structural.**

**Why this is a real trade, not a defect:** B prototyped A's declarative DSL,
shipped it through steps 4-5, and deliberately killed it (GAPS.md:62-86) for
idiomatic-JS/debuggability/obligation-level-testability reasons. So B's meta-loss
is a considered price for its object-level condition superset — which is exactly
the duality. The third option reclaims most of it for ~30 LOC: **mandatory
complete `dependsOn` metadata on every gate (fail the build if a gate lacks it)**,
which restores 4.1-4.3 without giving up closures for the easy cases.

---

## 5. Summary of the expressiveness lattice

```
OBJECT LEVEL (runtime behaviour):          NEITHER is a superset — INCOMPARABLE
  B-only (A structurally cannot):          A-only (B structurally cannot):
    - cross-field compound/arith/∀ gate       - empty-but-existent collection instance
    - status-swap-with-retention (top)        - minimum & field-linked-max cardinality
    - value domain in the model               - retain-a-value-while-hidden
    - n-ary conditional-mandate flip
  (shared floor both express: requiredOneOf disjunction; single-field OR via `includes`)

META LEVEL (statements about the model):   A ⊋ B, STRICTLY & STRUCTURALLY
    - gate inversion / reachability proof
    - serialise conditions to data / port to another language
    - recover dependency graph / render data dictionary
```

The two halves are duals: B's object-level power is *precisely what destroys* its
meta-level analysability; A's meta-level analysability is *precisely what caps*
its object-level power. There is no "just take B's model" that keeps the meta
half, and no "just take A's model" that keeps the object half. **The third option
is data-first conditions (A's closed vocabulary) with a metadata-mandatory
closure escape hatch for the genuinely-Turing-complete minority (B's power where
V4 needs it) — plus A's cardinality vocabulary, A's retain-while-hidden opt-out,
B's orthogonal status axis, and B's value domain.** That combination is a
superset of both, and no smaller combination is.
