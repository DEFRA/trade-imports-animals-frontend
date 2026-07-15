# L3 — Adversarial verification — EE-2 (evaluation-engine)

**Claim:** A's activation vocabulary is a *closed data DSL* that **structurally cannot**
express multi-condition or arithmetic gates; the only escape is a page controller, and that
hatch is corrosive.

**Verdict: AMENDED.** The mechanical description of `applyPredicate` is exactly right, and
the corrosion consequence is correctly reasoned. But the load-bearing word — **"structurally
cannot"** — does not survive contact with the source. A's vocabulary is **small by policy,
not closed by construction**, and A's own build history extended it three times. This is the
"not built vs cannot be built" failure mode, and the claim cites a *design-restraint doc
sentence* as if it were a structural bound.

---

## 1. What I verified (the claim's mechanics are all real)

| Assertion | Source | Status |
|---|---|---|
| `applyPredicate` = four `if ('X' in activatedBy)` checks, first-match-wins, immediate return | `engine/evaluate/predicate.js:12-29` | **TRUE, verbatim** |
| `activatedBy` carries exactly one obligation reference | `predicate.js:36` `const referencedObligation = activatedBy.obligation` | **TRUE** — and all **16** live literals conform (grep `activatedBy:` across `features/`) |
| 4 operators × 3 frame modes, 0 combinators | `predicate.js:13,14,20,25` / `:38,50,64` | **TRUE** |
| An array of predicates is not accepted | `reconcile.js:24` → `evalPredicate` → `applyPredicate`; `'equals' in [...]` is `false` for all four, so an array falls through to the `throw` at `predicate.js:26` | **TRUE** |
| No other activation mechanism exists | Grepped every obligation-property read in `engine/`: only `id`, `item`, `collection`, `activatedBy`, `wipeOnExit`, `required`, `requiredAtLeastOne`, `requiredOneOf`, `maxEntriesFrom`. Nothing else gates. | **TRUE** |
| The doc quote | `docs/obligation-model.md` — *"Anything that needs real branching — arithmetic, multi-condition logic, external state — belongs in a page controller. That is the pressure valve"* | **TRUE, verbatim** |
| The corrosion consequence | Correct inference: a controller-held gate means the obligation has **no** `activatedBy`, so `reconcile.js:22-25` puts it **permanently in scope** → `inScope`, `wiped`, `statusOf`, `flow/prerequisites` and `analysis/reachability.js` all give the wrong answer. | **TRUE** |
| B's contrast | `obligations/evaluator.js:288` `o.applyTo(recognisedFulfilments, fulfilmentIdsByObligationId)` — arbitrary closure over the whole state | **TRUE** |

So the claim is **not** fabricated. It is *overstated*, in four specific ways.

---

## 2. THE COUNTER-EXAMPLE — the vocabulary is demonstrably OPEN, and A opened it three times

This is the finding that forces the amendment.

**The predicate shape is private to `predicate.js`.** `reconcile.js:23-24` passes the literal
through opaquely:

```js
if (!obligation.activatedBy || evalPredicate(obligation.activatedBy, answers, frames))
```

Storage, `registry.walk`, the frame chain and the fixpoint loop **never inspect the gate
literal**. Nothing outside `predicate.js` constrains its shape — the obligations are plain JS
object literals in `features/*/obligations.js`, not JSON, not schema-validated (`assertObligationPurity`
checks *imports*, not shape). There is no serialisation format, no schema, no metaprogramming
barrier that would resist a new operator.

**And A has in fact added operators, repeatedly, mid-build:**

| Extension | Increment | Cost |
|---|---|---|
| list-valued `includes` | DESIGN-DELTA #1 | 1 branch in `applyPredicate` |
| `frame: 'anyItem'` | inc-033 | 1 branch in `evalPredicate` + prover seed in `scaffoldFor` (`reachability.js:62-69`) |
| `frame: 'enclosing'` seed | inc-035 | prover seed (`reachability.js:70-75`) |
| `notInUnionOf` | inc-040, DESIGN-DELTA #7 | 1 branch in `applyPredicate` (`predicate.js:20-24`) + **1 inverter branch** in `gateValue` (`reachability.js:39-44`) |

`DESIGN-DELTA.md:62-64` records the pattern explicitly: *"inc-033 registered the first
[frame gate] — `containsUnweanedAnimals` (frame:"anyItem") — and **extended the prover
accordingly**."*

**Every time a requirement outgrew the vocabulary, A grew the vocabulary. It did not reach
for the controller hatch.** The claim asserts the hatch is the recourse; the project's own
history says the interpreter is.

### 2.1 And the extension preserves A's crown jewel

The claim's implicit argument is: *expressiveness is only available via the hatch, and the
hatch destroys reachability analysis.* Both halves fail.

`analysis/reachability.js:36-47` `gateValue(activatedBy)` is a **per-operator witness
synthesiser** — structurally parallel to `applyPredicate`, one branch per operator, returning
a value that opens the gate. Combinators and comparators over a **closed operator set remain
invertible**:

- witness for `{allOf: [p, q]}` = merge of `gateValue(p)` and `gateValue(q)`
- witness for `{anyOf: [p, q]}` = `gateValue(p)` (pick a branch)
- witness for `{obligation: n, gt: 50}` = `51`

So adding boolean combinators **and** arithmetic comparators to A costs roughly **30-40 LOC
across 3 files** — `predicate.js` (the operators), `complete.js:26-41` (which reads
`.frame`), `reachability.js:31` (which reads `.obligation`) — and **`analysis/reachability.js`
keeps proving**. A gets expressiveness *and* keeps static analysability. That is precisely
the property L2 §3 says only a hypothetical third option could have.

This materially changes the shopping list. L2 §5 recommends *"B's open `applyTo` vocabulary —
but with a mandatory, complete `.metadata` sidecar, so A's reachability prover survives"* —
i.e. bolt an analysable schema onto arbitrary closures, which is the hard direction (you are
retrofitting a description onto a black box, and `GAPS.md:83-86` shows B already lets it be
omitted). **Extending A's 69-line interpreter with combinators is the cheap direction and
lands in the same place.** Whichever way the third option goes, EE-2 should not be cited as
evidence that A's model must be abandoned to get expressiveness.

---

## 3. Three further imprecisions in the claim's wording

**3.1 "no ... not" — false.** `notInUnionOf` (`predicate.js:20-24`) *is* a negated
set-membership operator: answered **AND** in none of the referenced obligations' `includes`
unions. Negation is in the vocabulary today.

**3.2 "no all/any" — imprecise.** `frame: 'anyItem'` (`predicate.js:50-62`) is an
**existential quantifier over collection entries** (`entries.some(...)`). `includes`
(`predicate.js:14-19`) is a **disjunction over one obligation's value domain**. What is
missing is not quantification or disjunction *per se* — it is boolean composition **across
two or more distinct obligation references**.

**3.3 Conjunction is not absent — it is built into the containment rule.** `reconcile.js:16-25`
puts a node in scope iff *its collection ancestor is in scope* **AND** *its predicate passes*.
`frame: 'enclosing'` conjoins with the whole ancestor chain. So `permanentAddress` is in scope
iff (line in scope) ∧ (unit in scope) ∧ (enclosing `commoditySelection` ∈ `permanentAddressCommodities`)
— a live three-way conjunction. **B does exactly the same thing**: `makeInScopeCheck`
(`evaluator.js:296-310`) *"ANDs the obligation's own applyTo inScope with every ancestor group's
inScope"*. Multi-condition gating **is** expressible in A whenever the conditions align with
the containment tree.

**3.4 Single-obligation predicates can already be arbitrarily complex.** The admitting set is
**computed at module load**: `includes: commodities.cphCommodities()` (`cph-number/obligations.js:10`),
`enclosingCommodity(commodities.passportCommodities())` (`commodities/obligations.js:33`). Any
decidable predicate over **one** obligation's *finite enumerable* domain is expressible **right
now**, by precomputing the set. What is genuinely out of reach today is (a) a condition spanning
**two or more distinct obligation references**, and (b) a condition over an **unbounded** domain.

The claim's example splits cleanly on this: `reasonForImport == 'internalMarket' AND
countryOfOrigin present` is out on **(a)**; `numberOfAnimals > 50` is out on **(b)** (unbounded
integer — you cannot precompute `includes: ['51','52',…]`). **Both legs of the example are
genuinely inexpressible in today's vocabulary. The claim's example is sound; its diagnosis is
not.**

---

## 4. What survives, and what B still wins

**Survives:** as authored, A cannot express a gate spanning two or more obligation references,
nor a condition over an unbounded domain. That ceiling is real and a regulatory rule set will
hit it. And the corrosion analysis is right — *if* you take the hatch, the obligation loses its
`activatedBy`, `reconcile` pins it permanently in scope, and scope/wipe/status/prereqs/reachability
all lie about it.

**B still wins, but by degree, not by structure.** B's `applyTo` is unboundedly expressive at
**zero** extension cost — a new rule shape is just a new closure, no interpreter change, no
prover change. A needs ~40 LOC of interpreter work per new operator class. That is a real
advantage. It is **not** the structural asymmetry the claim describes, and it is bought at the
price L2 §3 already charges B for: those closures are not invertible, so B cannot build A's
reachability prover.

**The trade is narrower than EE-2 states.** Not *"A = inexpressive-with-a-corrosive-hatch vs
B = expressive"*. Rather: *"A = extend a 69-line interpreter per operator class, keep the prover;
B = write any closure for free, never get a prover."*

---

## 5. What I searched

- Read `engine/evaluate/predicate.js` (all 69 lines), `reconcile.js` (all 48), `cardinality.js`.
- `grep -rn "activatedBy:"` across `features/` → 16 literals, every one a single-obligation,
  single-operator object.
- `grep -rn "obligation\.\|obligation?\."` across `engine/` → enumerated every obligation
  property the engine reads; confirmed `activatedBy` is the **only** activation mechanism.
- `grep -rln "activatedBy\|when:\|visibleWhen\|condition"` across `flow/`, `spec/`, `shared/` →
  no second condition language anywhere.
- `grep -rn "activatedBy"` across `analysis/`, `features/`, `flow/`, `shared/` → found the
  prover's inverter (`reachability.js:36-47`) and the 3 controller hand-reads.
- Read `analysis/reachability.js:1-75` — established `gateValue` is a per-operator witness
  synthesiser, extended in lockstep with every DSL addition.
- Read `DESIGN-DELTA.md:40-75` — established the three historical DSL extensions.
- Read `docs/obligation-model.md` around the cited lines — the quote is real, **and its
  preceding sentence is "The vocabulary is deliberately small"**, i.e. it is a restraint
  statement, not an impossibility statement. The claim reads a policy as a bound.
- Checked B: `evaluator.js:282-310` (`applyTo` call + `makeInScopeCheck`), `obligations.js`
  `applyTo` carriers — contrast direction confirmed.
