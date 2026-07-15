# L3 — Adversarial verification — collections-cardinality — CLAIM C5

**Verdict: AMENDED.** The claim's *conclusion* (B ships no cardinality; adding it is
additive, not structural) survives every attack I could mount. Its *mechanism* is wrong
in three specifics, and it **identifies the wrong slot** — B has a second, cheaper,
better-placed slot the claim never mentions, which lands the error exactly where A's
`countDropIssues` puts it.

Clones read-only. B = `clone-flow-layer` @ d59b432, root
`prototypes/journey-config-spikes/EUDPA-249-flow-layer/`. A = `clone-live-animals` @ b6ac2ed,
root `prototypes/standalone/live-animals/`.

---

## 1. What I searched

| Search | Result |
|---|---|
| `grep -rn --include="*.js" "minEntries\|maxEntries\|minItems\|maxItems"` over **all** of B's `prototypes/` (both the flow-layer fork AND the frozen `obligations-v4-model` ancestor) | **zero hits** |
| `grep -rn --include="*.js" "cardinality\|indexedBy"` over the same | hits only in (a) prose comments `obligations.js:36`, `domain/index.js:5`; (b) the classifier `evaluator.js:156-172`; (c) synthetic unit tests `evaluator.units.test.js:104,112,117-118,383,399,428,443,524`. **No obligation in the V4 manifest carries `indexedBy`.** |
| `grep -rn "groupInvariantErrors\|identifiersRequired\|requires\."` across `*.js`/`*.njk`/`*.json` | full consumer list — see §3 |
| `grep -rn "fulfilmentIdsByObligationId\|enumerateGroupFulfilmentIds"` in `evaluator.js` + `helpers.js` | the pre-pass and its four consumers — see §5 |
| `grep -rn "maxEntriesFrom\|countDropIssues\|collectionCapAt\|requiredAtLeastOne"` across A | A's side, verified |

---

## 2. What the claim gets RIGHT (verified verbatim, quotes are real)

1. **B's absence is total.** Confirmed by the greps above. `indexedBy` is honoured by the
   classifier (`evaluator.js:169-172`) and covered by synthetic tests but is **dead in the
   V4 manifest** — exactly as claimed.
2. **`numberOfAnimals` is a bare per-line integer with a `>= 1` floor only** —
   `domain/index.js:798-815`, verified. And `:786-797` does record a deliberately-deleted
   cross-field cap.
   *Caveat the claim doesn't note:* the deleted thing was `SPECIES_ANIMAL_CAP`, a per-species
   cap on the **value** of `numberOfAnimals`, **not** a count↔records link. It was removed for
   being *spec-wrong* ("it caused the spike to reject spec-valid values"), and the same comment
   explicitly says **"The cross-field predicate machinery is still exercised"**. That is a point
   *for* the port's cheapness, and it points at the slot the claim missed (§4).
3. **The `requires` declaration and its plumbing are real.** `obligations.js:581-593`
   (`requires.anyOf` getter + `errorCode`); `engine/index.js:512-539` (`groupInvariantErrors`,
   one error per violating instance, vacuous satisfaction at `:524`); counted into the
   classifier at `engine/index.js:398-400` **and** at journey level `:589`. All verified.
4. **The evaluator asymmetry is real.** Group branch `evaluator.js:457-467` takes records
   *exclusively* from `fulfilmentIdsByObligationId` and uses `own` only for `reasons`;
   `derived-leaf` `:482-493` *does* honour `own?.records`; `expandPresents`
   `engine/index.js:262` fans the UI over whatever `impl.records` says. All verified.

---

## 3. AMENDMENT 1 — `groupInvariantErrors` cannot evaluate a count

The claim says the port is "`requires` evaluated by `groupInvariantErrors`". It is not.

```js
// engine/index.js:519-528
const inScopeLeaves = group.requires.anyOf.filter((leaf) => { ... })
if (inScopeLeaves.length === 0) continue
const anyFilled = inScopeLeaves.some((leaf) => {
  const stored = state.fulfilments?.[leaf.id]?.[instanceId]
  return !isBlankValue(stored)
})
```

The primitive only ever indexes **leaf storage at exactly `instanceId`**, for leaves named in
`requires.anyOf`. It has no access to a child group's record count and no comparison operator.
A count constraint needs a **new sibling primitive** — which is what the L2 body actually says
("a sibling of `groupInvariantErrors`", ~30-40 LOC), and which C5's compression drops.
"The slot is right" survives. "Evaluated by `groupInvariantErrors`" does not.

### 3a. And a min-entries floor has no home in that shape at all

`groupInvariantErrors` iterates `groupImpl.records` (`:517`). "This collection must have ≥ 1
entry" is violated **exactly when `records` is empty** → the loop body never runs → zero errors
→ `classifyEntries([], state, 0)` returns `NOT_APPLICABLE` (`:387-388`). The record-iterating
shape structurally cannot express a floor on the group's own instance count. A *per-parent-
instance* count (≥1 / ≤N units **per line**) does fit the shape; a root-level floor does not.
A has this and B's `requires` slot cannot take it as-is: `requiredAtLeastOne` →
`engine/evaluate/complete.js:65` (`if (obligation.requiredAtLeastOne && entries.length === 0) return false`).

---

## 4. AMENDMENT 2 — the claim missed the better slot (this is the finding)

B already hands **every domain predicate** the group-instance-id map and the current
instance's path:

```js
// engine/index.js:74
const predicateCtx = { fulfilments, path, siblingValue, ids: ctx.ids }
```
```js
// engine/index.js:51-55 (contract, verbatim)
//  - path: null for singletons; group-instance path (e.g. 'line1') ...
//  - ids: the same `Map<obligationId, string[]>` the ObligationEvaluator builds
```

So the count↔records link is expressible as a **cross-field domain predicate on
`numberOfAnimals`** — `ctx.ids.get(unitRecord.id)` filtered to keys whose prefix is `ctx.path`,
counted, compared to `value`. ~6 lines. This is strictly **better placed** than `requires` for
the direction A's `countDropIssues` covers, because:

- it produces an **inline field error on `numberOfAnimals`** — precisely where A puts it
  (`consignment-details.controller.js:126-145`);
- it flows through B's **code-driven** error pipeline — `formatDomainErrors` (`contract.js:293`)
  → `COPY[error.code]` (`lib/format-domain-errors.js:99`) — which is *message-per-error-code*,
  unlike the invariant renderer (§5);
- the machinery was **already exercised on this very obligation** (the deleted
  `SPECIES_ANIMAL_CAP`, `domain/index.js:786-797`).

**Honest cost:** `ids` is declared in the ctx contract but **not threaded by the only production
caller** — `contract.js:284-290` passes `{ path: descriptor.path }` only, so `ctx.ids` is
`undefined` at runtime today. So it is ~1 line of threading + ~6 lines of predicate, not zero.
(Same reason `speciesDomain`'s `_ids` parameter, `domain/index.js:493`, is unused in production.)

**Limit of this slot:** `validate` runs only for the obligation being submitted, so the domain
predicate catches "count edited **down** below existing units" — the `countDropIssues` direction
— but **not** "user adds a 6th unit while count = 5" (no `numberOfAnimals` POST happens then).
The two slots are complementary; neither alone is "both directions".

---

## 5. AMENDMENT 3 — "both directions from a single declaration" is not free on the half that matters

The *detection* being direction-agnostic is the claim's real insight and it is **true**: a
re-derived comparison fires whichever side of the inequality moves, where A's write-time cap
(`engine/write.js:23-24`) is event-shaped and needs a second mechanism for the other direction.
Keep that.

But the user-facing half — which is what `countDropIssues`' 20 LOC actually *is* — does not come
free:

**`requires.errorCode` is dead in presentation.** It is written onto the error
(`engine/index.js:531`) and asserted in tests, but **no consumer anywhere reads `err.code`**
(verified by grep). The only renderer hard-codes one message *and* hard-codes depth 2:

```js
// features/check-your-answers/controller.js:318-327
for (const err of groupInvariantErrorsForState(state)) {
  const [lineId, unitId] = err.instanceId.split('/')
  if (!lineId || !unitId) continue                      // <-- silently drops
  ...
  text: t('cya.promptGroupInvariant', { lineN: lineIx, unitN: unitIx })   // <-- err.code ignored
```

A cardinality invariant declared on `commodityLine` yields `instanceId = 'line1'` (no slash) →
`unitId` is `undefined` → **the error is silently discarded from CYA**. So the ported invariant
would be invisible to the user except as a status downgrade, until CYA is made code-driven
(i18n key per `errorCode`) and depth-generic. A second invariant type also collides on the one
hard-coded message (`locales/en.json:488`).

And A's 20 LOC is not just detection: it names the species, quotes both numbers, deep-links to
the offending card, and **blocks the save** (`consignment-details.controller.js:126-145`,
`:161-172` — "BLOCKS the save — never silently trim", the c-031 ruling). B's port is
**detective, not preventive**. That is a defensible GDS choice, but it is not the equivalence
the claim asserts.

---

## 6. AMENDMENT 4 — the "~2 lines" derived-cardinality contract is materially wrong

This is the sub-claim that most deserved the skepticism, and it does not survive.

Honouring `own.records` in the group branch changes **only what `expandPresents` iterates**. It
does **not** put the derived ids into any *leaf's* record set:

- **`field` leaves** take records from `fulfilmentIdsByObligationId.get(obligation.within.id)`
  (`evaluator.js:470-472`) — the parent's **storage** enumeration, *not* the parent's computed
  `impl.records`.
- **`derived-leaf` leaves** (which is what the unit identifiers actually are) take records from
  their gate, whose projection reads `fulfilmentIdsByObligationId.get(projectionGroup.id)`
  (`helpers.js:205`) — the **same storage map**.
- `entryInScope` (`engine/index.js:303-308`) then filters each fanned entry against the **leaf's**
  records: `records.some((r) => r.fulfilmentId === entry.path)`.

So after the "2-line" edit the page would fan over N derived instances and then filter **every
one of them out**, because no leaf has a record at those ids — and the page classifies NA. The
edit produces an incoherent state, not derived cardinality.

The real contract is `enumerateGroupFulfilmentIds` / `fulfilmentIdsByObligationId` — a **pre-pass**
(`evaluator.js:103-112`, step 6, run *after* purge at `:94-99`) whose output is an **input** to
`applyTo` (`:288`), to the `field` branch, and to every gate's projection. Making a group's
instance set depend on an answer that is itself read *through that map* is an ordering/fixpoint
change at the centre of the pipeline, plus the instance-level purge cascade and the id-minting
changes L1-B listed.

L1-B's "structurally foreclosed" overstates (it is not impossible). C5's "~2 lines" understates
by considerably more. The honest figure is "a pre-pass redesign", and it is the one part of this
dimension where **A's model genuinely does something B's cannot cheaply do**: A's instance set is
a projection of the answers document with a single materialisation point, so a derived count has
one place to bite.

---

## 7. Net

Conclusion stands: **B ships zero cardinality; adding a validating (not shaping) cardinality is
additive, not structural.** Mechanism restated in `amendedClaim`.
