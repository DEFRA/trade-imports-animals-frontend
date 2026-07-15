# L3 — Adversarial verification — VE-4 (validation-errors)

**Verdict: REFUTED.** The quoted evidence is real, but the claim's three
load-bearing consequences all fail on contact with the source:

1. the "cannot be expressed in A's model at all" assertion is **false** —
   the author read `activatedBy` and stopped, and never opened the other
   half of A's engine (`engine/evaluate/cardinality.js`, `maxEntriesFrom`),
   which is precisely a declarative, engine-interpreted **length-of +
   comparison** between a collection and another obligation's numeric value;
2. the "hub tag and the submit gate cannot agree with the page" harm is
   **false at the live instance** — the count-drop rule is a *save-block*,
   so the state that would cause the disagreement is never committed;
3. the B comparator — "the same rule is one line" — is **false for the very
   example the claim chose**: B has *no* cardinality vocabulary at all, and
   B's evaluator **structurally forecloses** a derived/linked collection
   count (`evaluator.js:457-467`).

---

## 1. What IS true (verified at source)

`engine/evaluate/predicate.js` is 69 LOC and `applyPredicate` (`:12-29`) has
exactly four operators — `equals`, `includes`, `notInUnionOf`, `present` —
and throws on anything else (`:26-28`). No arithmetic, no comparison, no
length-of. **Confirmed.**

`docs/obligation-model.md:139-143` says verbatim:

> "The vocabulary is deliberately small… Anything that needs real branching —
> arithmetic, multi-condition logic, external state — belongs in a page
> controller. That is the pressure valve."

**Confirmed**, and the code honours it.

The count-drop rule really is hand-coded in a controller —
`features/commodities/consignment-details.controller.js:122-145` (note: the
path in the claim, `features/consignment-details/controller.js`, does not
exist; the file is under `features/commodities/`).

So the *premise* is sound. The *inferences* are not.

## 2. Counter-example #1 — A's model DOES carry a count comparison

The claim treats `activatedBy` as if it were A's whole model. It is one of
**eleven** obligation keys (`docs/obligation-model.md:16-28`). One of the
other ten is `maxEntriesFrom`:

```js
// features/commodities/obligations.js:106-110
export const animalIdentifiers = {
  id: 'animalIdentifiers',
  collection: true,
  requiredAtLeastOne: true,
  requiredOneOf: ANIMAL_IDENTIFIER_GROUP,
  maxEntriesFrom: numberOfAnimalsQuantity   // <-- a cross-obligation numeric link, in DATA
}
```

Engine-interpreted, in data, per collection instance:

```js
// engine/evaluate/cardinality.js:20-31
export const collectionCapAt = (answers, collectionPath) => {
  const countObligation = obligation?.maxEntriesFrom
  if (!countObligation) return null
  const value = valueAt(answers, [...collectionPath.slice(0, -1), countObligation.id])
  ...
}
// engine/write.js:20-28
const cap = collectionCapAt(journey.answers, collectionPath)
if (cap !== null && list.length >= cap) return null   // length-of + comparison
```

That is *exactly* "unit count vs animal count", declared as a model fact,
resolved per line frame, enforced by the engine — the rule the claim asserts
"cannot be expressed in A's model at all". Documented at
`docs/obligation-model.md:181-218` and `DESIGN-DELTA.md:685-710` (inc-063).
A ships the `≤` direction; only the `≥`/`=` (completion-mandate) direction is
absent.

The claim is also imprecise about "one referenced obligation's **scalar**
value": `notInUnionOf` takes a *list* of obligations and derives their union
at runtime (`predicate.js:4-10, 20-24`), and `frame: 'anyItem'`
(`predicate.js:50-62`) is a genuine **existential quantifier over a
collection** (`entries.some(...)`). So the vocabulary is 4 operators × 3 frame
modes, one of which quantifies over a collection.

## 3. Counter-example #2 — the escape hatch does not desynchronise anything

The claim's harm ("the engine cannot see them, so the hub tag and the submit
gate cannot agree with the page") assumes the controller rule permits a state
the engine then misjudges. It cannot. The count-drop rule **blocks the
write**:

```js
// features/commodities/consignment-details.controller.js:161-175
const issues = countDropIssues(request, lines, values)
if (issues.length > 0) {
  return render(request, h, journey, lines, values, …)   // returns BEFORE the loop
}
for (const { index, entry } of lines) {
  await state.updateEntryAt(request, h, ['commodityLines'], index, { … })
}
```

`records > count` is therefore **unreachable in the store**: the append path is
capped by the engine (`write.js:24`), and the count-lowering path is refused by
the controller. Both mutation paths preserve the same invariant, so the engine's
completeness view, the hub tag and the submit gate agree with the page *by
construction*.

The general principle the claim missed: a rule pushed into a controller as a
**validity/save-block** cannot cause engine/page divergence — it removes the
divergent state from the state space. Divergence would only arise if a
**completeness** rule were pushed into a controller, and A has no such
instance. (A's real completeness-vs-validation defect — `requiredOneOf`
expressed twice, in the model *and* by hand in
`animal-identification.controller.js:481-486` — is a duplication problem, not
a disagreement problem, and is already captured by VE-1/L2 §1.3.)

## 4. Counter-example #3 — B cannot express the claim's second rule either

"B's `applyTo` is an arbitrary JS closure … and the same rule is one line."
Verified for a **leaf's scope/status** (`evaluator.js:453-455` — a `single`
obligation's implication is `own` returned verbatim). So *"required when the
animal count exceeds N"* genuinely is one closure in B and is not expressible
in A's `activatedBy` today. That single sub-case survives.

*"Incomplete while unit count < animal count"* does **not**:

- B has **no cardinality vocabulary anywhere** — no `minEntries`, `maxEntries`
  or derived cap in any `.js` source (L1-B §5, re-verified: `numberOfAnimals`
  is a bare `>= 1` predicate, `domain/index.js:798-815`, and is *completely
  unrelated* to the number of `unitRecord`s on the line).
- A group's `applyTo` **cannot dictate its instances**. Verified firsthand:

```js
// obligations/evaluator.js:457-467  (group branch of buildImplication)
if (category === 'group') {
  const fulfilmentIds = [...(fulfilmentIdsByObligationId.get(obligation.id) ?? [])]
  const impl = { inScope: true }
  if (own?.reasons) impl.reasons = own.reasons      // `own.records` is IGNORED
  impl.records = fulfilmentIds.map((fulfilmentId) => ({ fulfilmentId }))
  return impl
}
```
  Instances come *exclusively* from storage-key enumeration. (Contrast
  `derived-leaf`, `:482-493`, which *does* honour `own.records`.)
- Group completeness comes from `classifyEntries` + the fixed `requires.anyOf`
  primitive (`engine/index.js:512-539`), whose vocabulary is "≥1 of these
  *fields* in an item" — it has no notion of item **counts**. B's own docs list
  cross-record predicates as an open non-goal needing "a new engine primitive
  parallel to `groupInvariantErrors`" (`obligations.md:2834-2837`).

So for that rule **both sides need an engine change**, and A is the one that
already ships half of it in data.

Worse for the claim's rhetorical force: B's live manifest contains **zero**
arithmetic or threshold gates. Every conditional `applyTo` is one of four
allow-list helper shapes (`allowListed`, `allowListedByPredicate`,
`branchedGate`, `anyAllowListed`) — i.e. membership tests, the same expressive
class as A's `equals`/`includes`. And B's *only* cross-field numeric predicate
was **deliberately deleted**:

> `domain/index.js:786-797` — "A prior version of this spike carried a
> fabricated `SPECIES_ANIMAL_CAP` map … that map has been removed because it
> caused the spike to reject spec-valid values."

The unbounded closure is a *capability*, not an *exercised* one. Calling it
"one line" is a projection, not an observation.

Finally, "drives status, required-ness, rendering **and validation** together"
overstates. `applyTo` drives scope, status and (through `effectiveStatus` in
`contract.js:315-322`) whether the flow's `mandatoryToProceed` gate bites. It
does **not** carry the value rule (a separate 40-entry Map in `domain/index.js`
keyed by obligation id) and it does **not** carry the error copy (i18n key on
the flow entry). Three of four, not four.

## 5. "Not built" vs "cannot be built"

The claim's word is *"cannot"*. A's DSL is closed, but it is **not frozen** —
it was extended twice mid-build, and the extensions are documented as such:
`notInUnionOf` (inc-040, DESIGN-DELTA #7, `obligation-model.md:128-137`) and
`maxEntriesFrom` (inc-063, DESIGN-DELTA #15). Adding `greaterThan` to
`applyPredicate` is ~2 lines in a 69-LOC file; adding `minEntriesFrom` is a
sibling of `collectionCapAt` plus a clause in `collectionComplete`
(`complete.js:65`). Neither is a rewrite.

The honest difference is therefore **cost per new rule *shape***, not
expressibility:

| | A | B |
|---|---|---|
| New rule of an **existing shape** | data edit, no engine change | data-ish helper call, no engine change |
| New rule of a **new shape** (threshold, count-link) | **engine change** — new vocabulary key + interpreter (a "model-extension" increment) | **no engine change** for a leaf-level gate; **engine change** for anything collection-count-shaped |
| Rule is serialisable / spec-generatable | **YES** (it is JSON) | **NO** (it is a closure) |

That is the trade the third option has to price. The claim collapses it into
"A cannot", which is not what the code says.

## 6. What I searched

- `grep -rn maxEntriesFrom` over all of A → `cardinality.js`, `write.js:23`,
  `obligations.js:110`, `obligation-model.md:28,181-218`, `DESIGN-DELTA.md:685`.
- `grep -rn "collectionCapAt|appendEntryAt"` over all of A → 2 engine sites,
  3 controller sites, `store-ops.test.js:407` (cap-rejection pinned).
- Read `predicate.js` (whole file), `complete.js` (whole file),
  `cardinality.js` (whole file), `write.js:1-45`,
  `consignment-details.controller.js:100-189`, `obligation-model.md:1-230`.
- `grep -rn "applyTo: ("` over B's manifest → 19 hits, all constant closures.
- `grep -rn "Number(|parseInt|>=|<=|.length >"` over B's manifest → **1** hit,
  and it is an array-non-empty check, not arithmetic.
- Read B's `evaluator.js:430-505` (buildImplication, all five category
  branches), `domain/index.js:780-815`, `obligations/obligations.js:1-60`,
  `helpers.js` (grep for `fulfilments[`).
