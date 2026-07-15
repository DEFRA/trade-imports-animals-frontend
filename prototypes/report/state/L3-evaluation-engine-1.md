# L3 adversarial verification — EE-1 (evaluation-engine)

**Verdict: AMENDED.**

The claim's *local* reading of A's `reconcile` is exactly right, and its
diagnosis of the false doc claim is right. Its *systemic* conclusion —
"A and B are broken identically on chained gates" — does not survive
contact with the source. The two sides fail chained gates in
**structurally different** ways, and the asymmetry runs the opposite way
to the claim's framing.

---

## 1. What I verified as TRUE (quotes are real and mean what the claim says)

### A — `evalPredicate` has no scope input
`engine/evaluate/predicate.js:31-35`:

```js
export function evalPredicate(
  activatedBy,
  answers,
  frames = [{ framePath: [], siblings: [] }]
) {
```

No `inScope` parameter. All three resolution branches read raw storage:
`valueAt(answers, [...framePath, referencedObligation.id])` (`:43`, `:56`,
`:66`) or `answers[referencedObligation.id]` (`:67`). CONFIRMED.

### A — the loop is monotone and its only mutation is `add`
`engine/evaluate/reconcile.js:9-30`. `inScope.add(key)` at `:26` is the
only mutation of the set. Nothing is ever removed. CONFIRMED.

### A — the loop is vestigial
`evalPredicate` is a pure function of `answers`, and the loop **never
mutates `answers`**. So an obligation's `activatedBy` verdict is
*invariant across passes*. The only scope-dependent condition in the loop
body is the collection-ancestor containment gate (`reconcile.js:16-21`).

`registry.js:51-68` — `walk` yields the collection node **before**
recursing into its entries:

```js
for (const obligation of forest) {
  const path = [...basePath, obligation.id]
  yield { path, obligation, collectionAncestorKey: ancestorKey, frames }
  if (obligation.item) { ... yield* walk(answers, obligation.item, itemFramePath, key, ...) }
}
```

Strict pre-order. So by the time an item node is visited, its
`collectionAncestorKey` node has already been processed **in the same
pass**. The containment closure is therefore reached in one pass; the
second pass exists only to set `changed = false`. CONFIRMED: the loop is
vestigial for anything the model can currently express.

### A — the doc makes a claim the code does not honour
`docs/scope-and-wipe.md:33-37`:

> **Compute `inScope` to a fixpoint.** The loop keeps passing over the
> nodes until nothing changes. ... Activation references can chain — an
> obligation activated by another obligation that is itself conditional —
> **which is why a single pass is not enough.**

Both halves of that justification are wrong. Chaining does *not* require
iteration (predicates are invariant across passes), and the loop does
*not* make chaining work. This is a doc crediting the code with a
capability the code does not have. CONFIRMED.

### A — live activation depth is 1
All 12 `activatedBy` sites read (`grep -rn "activatedBy" features/`).
Every gater referenced is itself **ungated**:

| gater | file | has `activatedBy`? |
|---|---|---|
| `reasonForImport` | `features/import-reason/obligations.js` | no |
| `regionOfOriginCodeRequirement` | `features/origin/obligations.js:7-10` | no |
| `commoditySelection` | `features/commodities/obligations.js:3-7` | no |
| `meansOfTransport` | `features/transport/obligations.js:5` | no |
| `transporterType` | `features/transport/obligations.js:27` | no |

CONFIRMED — the defect is latent, not live, on A.

---

## 2. What REFUTES the central assertion

### 2a. A's commit runs reconcile TWICE, with a destructive wipe in between

`engine/write.js:11-18`:

```js
export const commit = async (request, h, patch) => {
  const journey = await currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)                                  // MUTATES answers in place
  await saveJourneyAnswers(request, journey.journeyId, answers)
  return { answers, scope: makeScope(answers) }                 // reconcile AGAIN, post-wipe
}
```

`destroyWiped` (`lib/path.js:59-63`) mutates in place (`deleteAt(answers, path)`,
no return). `makeScope` (`engine/read.js:27-35`) calls `reconcile(answers)`
a second time — on the **post-wipe** map.

And the wipe of the *gater* is not deferred: a gater `G` that has itself
gone out of scope is judged out of scope **correctly** by reconcile #1
(its own gate `P` is read directly, no staleness), so `G` lands in
`wiped` and is **physically deleted in the very same commit**. Reconcile
#2 then sees `G` gone, so a depth-2 dependant `D` is correctly dropped.

This is guaranteed, not lucky: **every one of A's 12 `activatedBy`
obligations also carries `wipeOnExit: true`**, and it is a spec-level
default — `spec/journey-spec.json:64`: *"the spec defaults wipeOnExit=true
on every activatedBy obligation (retain cases must be argued at a gate)"*.
Any future chained gater `G` has an `activatedBy`, hence a `wipeOnExit`,
hence is destroyed on de-scope.

**So the claim's "A: destroyWiped on next commit" is factually wrong.**
The gater is destroyed on the *same* commit. The scope A hands back from
that commit is already correct at depth 2, and so is every subsequent
read (`read.js:43-44` → `makeScope` on stored answers).

A's residual defect at depth 2 is much narrower than the claim says: `D`'s
*own stored value* survives one extra commit (it was in scope during
reconcile #1, so it wasn't in the wiped set) and is destroyed at the next
commit of anything. Because `saveJourneyAnswers` write-throughs the whole
answers map to the record (`engine/journey.js:73-82`), that one-commit
window is a real data leak into the persisted notification — but it is
**bounded and self-healing**. Net: A's destructive-wipe + re-derive drains
exactly **one chain link per commit**. A converges.

### 2b. B never converges at all — its purge is never written back

This is the finding that breaks the claim. B's purge is a **read-time
projection**, not a mutation of storage.

`lib/state.js:42-44`:

```js
export function readState(request) {
  return evaluateState(readFulfilments(request))
}
```

`evaluate` returns `{ fulfilments: amendedFulfilments, obligations }`
(`obligations/evaluator.js:123-126`) — and **nothing ever persists
`amendedFulfilments`**. I grepped every write site in the spike:

```
grep -rn "writeFulfilments\|currentState\|evaluateState" <B tree>
```

`writeFulfilments` is called at `lib/state.js:76, 115, 161, 201, 221` —
every one of them writes the **raw merged** `fulfilments` map (the result
of splicing the page's coerced values into `readFulfilments(request)`).
There is no `writeFulfilments(request, state.fulfilments)` anywhere in
the tree.

Consequence: the stale gater value **stays in yar forever**. Every
subsequent `evaluate` restarts from raw storage
(`evaluator.js:80-84` → `runApplicabilityDecisions(obligations,
recognisedFulfilments, preEnumeratedGroupPaths)`) and re-reads the same
stale value. B's dependant `D` is therefore **permanently** in scope,
permanently reported `{ inScope: true }` by `buildImplication`
(step 7 reuses the step-4 `isInScope` closure), and permanently retained
by `purgeStorage` (`isInScope(D)` is true, so it is never dropped).

There is no number of requests that fixes B. The claim's parenthetical
"B: purge on next evaluate" assumes a write-back that does not exist.

Note also that B has **no iteration at all** — `evaluate` is a strict
7-step single pass. Its only scope closure is the ancestor-group AND
(`makeInScopeCheck`, `evaluator.js:301-325`), which is a recursion over
the static `within` chain, not over answer-derived gates.

### 2c. The honest counterweight (why B's design is still defensible)

B's non-destruction is a deliberate posture ("tolerate-and-amend",
`evaluator.js:24`): user data is never destroyed, and the *output* is
always the projection, so B's stale gater value cannot leak into a
submitted payload the way A's residual `D` value can. B's failure at
depth ≥2 is a **scope** failure, not a data-leak failure. A's is a
transient data-leak plus a transient scope error that heals.

---

## 3. Retrofit cost (asked for as a first-class question)

- **A**: make `reconcile` a real fixpoint by iterating *storage-and-scope*
  together, or simply topologically order `activatedBy` edges and evaluate
  once with a `resolved` map that returns `undefined` for out-of-scope
  gaters. Roughly: pass `inScope` into `evalPredicate` and have
  `valueAt` return `undefined` when the referenced obligation's instance
  is not in `inScope`. That single change makes the loop non-monotone-safe,
  so it must be paired with a greatest-fixpoint (start all-in-scope,
  shrink) rather than the current least-fixpoint (start empty, grow).
  ~20 lines in `predicate.js` + `reconcile.js`. The 12 existing gates are
  depth-1 so nothing regresses. Also: delete or rewrite
  `docs/scope-and-wipe.md:33-37`.
- **B**: two changes, not one. (i) The same greatest-fixpoint /
  topological-order fix inside `evaluate` (steps 3-4 currently run once
  over raw storage). (ii) **Independently**, decide whether the purge is a
  projection or a write-back — today it is a projection that no caller
  persists, so B's `amendedFulfilments` is a per-request illusion. Until
  (ii) is settled, (i) alone still leaves B reading stale gaters on the
  next request.

---

## 4. Amended claim

See `amendedClaim` in the returned object.
