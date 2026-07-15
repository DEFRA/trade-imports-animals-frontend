# L3 edge-asymmetry verification — min-instance floor (empty collection classifies fulfilled/submit-ready)

**Claim under test (A-only, claimed structural):** an empty collection below its
minimum floor still classifies fulfilled / submit-ready in B, and B CANNOT close
this without changing its model (new min-cardinality verb = "new model shape" +
classifier branch).

**Verdict: AMENDED.** The *gap* is real and correctly observed (B today lies:
zero commodity lines ⇒ FULFILLED / submit-ready), and A *does* express the floor
declaratively. But the "structural / new model shape / cannot without changing
its model" framing is **overstated**. The floor has a natural home in an
**existing** extension slot and rides plumbing that **already exists end-to-end
and already reaches empty collections** — closing it is a config key + a ~3-line
reader branch in an existing dispatch function, i.e. an additive extension in an
existing hook, not a model-shape change. This matches the standing finding, which
already files this as one of the **two live defects**, NOT among the three A-only
*structural* capabilities. The claim tries to re-elevate a filed defect to
structural; that elevation fails.

---

## 1. The defect is real (both halves verified)

**A does it declaratively — verified.** `collectionComplete`
(engine/evaluate/complete.js:65): `if (obligation.requiredAtLeastOne &&
entries.length === 0) return false`. The floor is a **data literal** —
`requiredAtLeastOne: true` on `commodityLines` (features/commodities/
obligations.js:108) and per-species `animalIdentifiers` (:123). Note A's floor is
itself a **completeness/status check** (complete.js), not a write-path block —
important for the parity argument in §3.

**B lies today — verified, mechanically.**
- `expandPresents` (engine/index.js:258-270) expands a `presentsForEach` page to
  one entry per **existing** record (`impl?.records ?? []`, loop at :262). Zero
  commodity lines ⇒ zero entries.
- `groupInvariantErrors` (index.js:512-539) — B's *only* cardinality-adjacent
  primitive — iterates `groupImpl.records` (:517). Zero records ⇒ loop body never
  runs ⇒ returns `[]`. It is a **per-existing-instance** "≥1 identifier per
  unit-record" invariant (`requires.anyOf`, obligations.js:581-593); it reads leaf
  fulfilments *keyed by an instance id* (:526), so it structurally **cannot count
  instances** and cannot reference a child group's existence.
- `classifyEntries` (index.js:386-409) with `inScope.length === 0 &&
  groupErrorCount === 0` ⇒ NA; folded into a journey with other satisfied
  mandatories the empty collection contributes nothing and cannot block
  FULFILLED. Confirmed: no `minInstances` / `min` / `minEntries` / floor verb
  exists anywhere in B (grep of engine/index.js, obligations/evaluator.js,
  lib/line-page-controller.js returns only unrelated `.length` comparisons).

So: no *existing* mechanism already does an instance-floor. The mechanism hunt
comes up empty — the claim is right about that.

## 2. Why "structural / new model shape" is wrong — the cheap workaround exists

The task's downgrade test: *"could it be done with a new predicate in an existing
dispatch table / an existing hook? If yes, NOT structural."* It can:

**(a) The concept HAS a home — the existing `requires` invariant bag.** A group's
`requires` object (obligations.js:581) is already a bag of invariants-about-this-
collection; `groupInvariantErrors` already dispatches on it (`if
(!group?.requires?.anyOf)`, index.js:513) and `groupInvariantErrorsForContainer`
already iterates *every* group carrying `requires` (index.js:566). Adding
`requires: { minInstances: 1, errorCode: ... }` reuses that slot — no new record
shape, no new storage, no new layer.

**(b) The error plumbing already exists and already blocks FULFILLED.**
`groupErrorCount` flows into `classifyEntries` and is summed into
`totalMandatoryConcerns` / `totalMandatoryUnsatisfied` (index.js:398-405); any
non-zero count forces NOT FULFILLED at page, container and journey level. No new
signal path is needed.

**(c) The plumbing already reaches an EMPTY collection.**
`collectGroupsPresentedIn` (index.js:545-556) discovers the group from the flow's
`presentsForEach.forEachOf` node — a **structural** reference, independent of how
many records exist. So even with zero records the commodityLine group is still
collected and `groupInvariantErrors` is still called on it. The only reason it
returns `[]` today is that its loop iterates records; a count-check runs *before*
that loop.

**The whole fix:** one data key + ~3 lines in the existing dispatch function:
```js
// inside groupInvariantErrors, before the per-record loop:
const min = group.requires.minInstances ?? 0
if ((groupImpl.records?.length ?? 0) < min) {
  errors.push({ code: group.requires.errorCode, groupId: group.id,
                groupName: group.name, instanceId: null })
}
```
That is precisely "a new predicate in an existing dispatch table," reading a
literal `records.length < min`, surfaced through plumbing that already blocks
FULFILLED and already reaches empty collections. No new storage shape, no new
evaluator mutation step, no new layer, no reversed decision.

## 3. The accurate, narrower claim

- **A** expresses a collection **floor** declaratively (requiredAtLeastOne literal
  + complete.js:65 status check).
- **B** today does **not**, and it is a **live defect** (empty required collection
  ⇒ FULFILLED / submit-ready — verified above), NOT an A-only *structural*
  capability. Closing it is an **additive config-shaped extension in an existing
  hook**: a `minInstances`/`requiredAtLeastOne` key inside the existing `requires`
  invariant bag + a ~3-line branch in the existing `groupInvariantErrors`,
  reusing the existing `groupErrorCount → classifyEntries` plumbing that already
  blocks FULFILLED and already reaches empty collections via presentsForEach group
  discovery. **True cost ≈ the standing finding's own ~8 LOC estimate** — but the
  correct *label* is "unbuilt + cheap," filed with B's other two live defects, not
  "A-only structural."

**Honest boundary — do not over-refute.** Two things nearby ARE structural and
must not be swept in:
1. The **field-linked MAX cap** ("≤ numberOfAnimals records", §3.2 of
   L4-model-power) — genuinely structural in B, because a cap needs a write-time
   enforcement primitive and B's evaluator has **no mutation step**. The *floor*
   is not a cap; it is a read-only count-against-a-literal surfaced through an
   existing status classifier, so it does not inherit the cap's structural cost.
2. A's floor being enforced at completeness time (complete.js) means A itself
   treats the floor as a **status check**, not a write-time block — so the B fix
   reaches exact parity with A on the floor, reinforcing that this is a defect-
   close, not a model-power gap.

**Net:** the mechanism hunt confirms B has nothing today (claim's factual half
stands); the workaround hunt refutes the "structural / cannot without changing the
model" half. Downgrade from "A-only structural capability" to "B live defect,
cheap additive fix" — consistent with where the standing finding already files it.
