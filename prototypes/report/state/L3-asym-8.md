# L3-asym-8 — Cross-field compound / arithmetic / quantified (∀) gate conditions (B-only claim)

**VERDICT: AMENDED.** The capability is genuinely *absent* in A and A's V4 spec never
needs it — but the "structural / cannot without changing its model" framing is
**overstated** for the stated decidable class. A reaches arithmetic and ∀ by the
*same additive grammar growth* it has already used three times, touching only the
condition-interpreter dispatch — not reconcile's return type, the obligation record
shape, or storage (which is what the genuinely-structural asymmetries §2.2/§3.1 do).

---

## What the claim gets right (the real, kept half)

- A's condition interpreter is a **closed 4-operator if-chain that THROWS on
  unknown** (`engine/evaluate/predicate.js:12-29`, throw at :26-28). Confirmed.
- `evalPredicate` resolves **exactly one** antecedent, `activatedBy.obligation`
  (predicate.js:36). There is no `and`/`or` key, no array-of-predicates, no
  numeric operator, and `anyItem` is `entries.some(...)` with **no `every`**
  (predicate.js:57). Confirmed by full read.
- The V4 spec is genuinely single-predicate: all 20+ `activatedBy` blocks in
  `spec/journey-spec.json` are one operator over one obligation — **zero compound
  conditions** (grepped; every block is `equals`/`includes`/`present`/`notInUnionOf`).
- A's one numeric rule (count-drop) *did* live in the `consignment-details`
  controller, outside the model. Confirmed by the L2 read.

So B-modelled-declaratively / A-absent is TRUE. The dispute is only over "structural."

## Why it is NOT structural — the mechanism A already has

A grows its condition grammar **additively, by design**, and has done so three
times. `DESIGN-DELTA.md` records the exact recipe the claim would follow:

1. **`includes`-list** (delta #1, DESIGN-DELTA.md:6-16) — generalised one operator;
   "Backwards compatible … all pre-existing tests untouched … `reachability.js#gateValue`
   updated to pick a representative activating value."
2. **`frame` (enclosing / anyItem)** (delta #3, :18-70) — added the ∃-over-collection
   quantifier as a new frame mode; "every existing obligation and all 133 tests are
   untouched"; prover extended so `scaffoldFor` seeds one triggering entry (:60-70).
3. **`notInUnionOf`** (delta #7, :236-265) — "a fourth activation operator, sitting
   beside `equals`/`includes`/`present`… operator keys are mutually exclusive; every
   existing gate takes the same branch as before… `gateValue` synthesises a witness
   value guaranteed outside the derived union, so the recomputed pin stays green."

Every one of these is the *precise* two-part cost the claim's own honesty flag
names: a new mutually-exclusive branch in `predicate.js` + its paired inverse in
`reachability.js#gateValue`. Map the stated capability onto that recipe:

- **Arithmetic (`animalCount > 50`)** — a `greaterThan` operator is a single-
  antecedent leaf, identical in shape to `equals`. New branch in `applyPredicate`
  (~2 LOC) + `gateValue` returns `activatedBy.greaterThan + 1` (~1 LOC). Reads the
  same single antecedent value; no change to `evalPredicate`'s resolution, the
  obligation record, or `reconcile`. **Additive, not structural** — the claim's
  honesty flag concedes exactly this.
- **∀ over a collection (`every commodity line is a horse`)** — mirror of the
  existing `anyItem` frame. `anyItem` is `entries.some(...)` (predicate.js:57); an
  `allItem` frame is `entries.every(...)`. New frame branch parallel to one that
  already exists. The prover's single-entry seed (DESIGN-DELTA:62-63) already
  satisfies `every` trivially. **Additive, not structural.**
- **Cross-field compound boolean (`A = x AND B = y`)** — the one genuinely bigger
  step. Needs an `{ all: [...] }` / `{ any: [...] }` combinator that *recurses over
  the existing* `evalPredicate(subPredicate, answers, frames)`. Crucially:
  - `reconcile.js:22-24` calls `evalPredicate` **opaquely** — the scope fixpoint is
    untouched (verified by read).
  - The obligation record shape is untouched — `activatedBy` stays one nested
    object; the combinator nests, it does not widen the record.
  - Two real touches: `complete.js:24` reads `subObligation.activatedBy?.obligation`
    and assumes a single antecedent (would need to recurse — exactly the kind of
    opt-in threading delta #3/#5 already did for frames), and
    `reachability.js#scaffoldFor` must recurse to seed all conjuncts (AND) / one
    disjunct (OR). Real work, an order of magnitude more than a leaf operator, **but
    the same kind of additive change, in the same files, changing no return type
    or storage shape.**

## The contrast that decides "structural"

In this very comparison the genuinely-structural asymmetries change the **return
type or storage shape**:
- §2.2 status-swap-with-retention: widen `reconcile`'s return from `{inScope,wiped}`
  (reconcile.js:47) to carry `status`, plus `complete.js`, plus all 14 feature
  obligations — a return-shape change.
- §3.1 empty-but-existent instance: a storage-shape change touching every mutator.

Compound/arith/∀ touches **only the condition-grammar dispatch** — data in a closed
vocabulary — which DESIGN-DELTA shows growing additively 3×. That is the definition
of *unbuilt*, not *structurally impossible*.

## The true structural residue (kept, but narrower than claimed)

1. **Genuinely UNBOUNDED / Turing-complete conditions.** A's closed vocabulary
   cannot enumerate arbitrary JS (B's `applyTo`, evaluator.js:288). Closing *that*
   = re-becoming B and forfeiting the reachability prover. But the capability **as
   stated** — compound boolean, numeric compare, ∀/∃ over a collection — is a
   *decidable finite class*, each member per-operator-invertible, so this residue
   does not cover the stated examples.
2. **The meta-tax.** Every operator added must also be inverted in
   `reachability.js#gateValue` (predicate.js:36-47 today returns `undefined` for the
   unknown) or the static-reachability crown jewel silently loses a witness. This is
   real and load-bearing — but it is an **additive per-operator cost** (paid 3× in
   DESIGN-DELTA), not a model-shape change, and it is the price A pays to *keep* a
   capability B structurally lacks (L4 §4.1). That is a feature, not the asymmetry.

## Amended claim

A structurally lacks compound/arithmetic/∀ gate conditions **as built**, and its V4
spec never needs them (0 compound conditions across 20+ `activatedBy` blocks) — but
this is an *unbuilt, additive* gap, not a structural one, for the stated decidable
class. Arithmetic and ∀ each go in as a new mutually-exclusive branch in
`predicate.js` + its paired witness synthesiser in `reachability.js#gateValue` — the
identical backwards-compatible recipe by which `includes`-list, `frame`, and
`notInUnionOf` were already added (DESIGN-DELTA #1/#3/#7). Cross-field compound
boolean needs one step more — an `{all}`/`{any}` combinator recursing over the
existing single-antecedent `evalPredicate`, plus a touch to `complete.js:24` and a
recursing witness synthesiser — but it changes only the condition-grammar dispatch,
leaving `reconcile`'s return type, the obligation record shape, and storage
untouched, unlike the genuinely-structural status-axis (§2.2) and empty-instance
(§3.1) asymmetries. The only *structural* residue is (a) truly Turing-complete
conditions A's closed vocabulary cannot enumerate (not the stated class), and (b) the
standing per-operator tax that each new operator must be re-inverted in the witness
synthesiser or A forfeits its static-reachability prover.
