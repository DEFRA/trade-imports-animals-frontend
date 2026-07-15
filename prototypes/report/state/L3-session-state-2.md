# L3 adversarial verification — SS-2 (session-state)

**Claim:** A applies the derived wipe on only 3 of its 5 write verbs, and the two that skip it
include the verb the documents feature uses to persist an upload. (~4 lines to close.)

**Verdict: AMENDED.** Every literal fact checks out. The *significance* is inverted: the omission
the claim leads with is deliberate, documented and sound; the omission that is a genuine
structural hole is the one the claim treats as the makeweight and never analyses.

---

## 1. The cited facts — all verified true

| Assertion | Source | Holds? |
|---|---|---|
| `reconcile` returns `{inScope, wiped}` | `engine/evaluate/reconcile.js:47` | YES (signature is `reconcile(answers, forest)`; `write.js` calls it 1-arg) |
| `destroyWiped` mutates the map; mutated map is what is persisted | `engine/write.js:14-16` → `saveJourneyAnswers` → `records.saveAnswers` (`engine/journey.js:73-82`) | YES |
| reconcile+destroyWiped at exactly 3 sites | `write.js` commit :14-15, removeEntryAt :57-58, reconcileEntriesAt :74-75 | YES |
| `appendEntryAt` (:20-28), `updateEntryAt` (:30-46) have no wipe pass | `write.js` | YES |
| documents persists an upload via `state.appendEntry` | `features/documents/controller.js:269-274` | YES |
| 5 write verbs | commit, appendEntryAt, updateEntryAt, removeEntryAt, reconcileEntriesAt | YES (`submitJourney` writes no answers) |

So the claim is not fabricated. It is *misweighted*.

## 2. Refutation A — the append omission is deliberate, documented, and sound

`docs/scope-and-wipe.md:115-119`, under **Wipe mechanics**:

> **Appending never reconciles.** `appendEntryAt` in `engine/write.js` skips the
> reconcile-and-wipe step. An append only adds scope — it can activate new sub-obligation
> instances but can never deactivate anything — so there is nothing to wipe. The asymmetry with
> `removeEntryAt` (which does reconcile, because removing an entry can strand dependants) is
> deliberate.

I tried to break the monotonicity argument rather than take it on trust. Predicate forms are
`equals` / `includes` / `notInUnionOf` / `present` (`engine/evaluate/predicate.js:12-29`), over
frames default / `enclosing` / `anyItem` (:31-68). Under an append (`write.js:24`, `[...list, entry]`
— every other path untouched):

- **`anyItem`** reduces to `entries.some(...)` (`predicate.js:57-59`). `some` is monotone under
  adding an element: it can go false→true, never true→false. Sound.
- **`equals` / `includes` / `notInUnionOf`** read a scalar path the append does not touch, or read
  the collection array itself (objects never match string targets). Sound.
- **`present: false`** is the one form that *would* be non-monotone: `isAnswered([])` is `false`
  (`lib/answered.js:3`), so `{obligation: <collection>, present: false}` is true while the
  collection is empty and flips false on the first append — de-scoping on append and breaking the
  doc's rationale. **I grepped for it and it is used nowhere** — `grep -rn "present" features/
  spec/journey-spec.json` returns only prose hits. So the rationale holds against the model as
  it actually exists. It is a latent sharp edge (the vocabulary can express the case the doc
  assumes away), not a live bug.

This is exactly the failure mode the brief warns about in reverse: the claim reads an absence as an
oversight without reading the doc that justifies it. Adding reconcile+destroyWiped to `appendEntryAt`
would be a gratuitous O(n) full-tree walk per append with nothing to delete.

## 3. Refutation B — the documents example is a null

`features/documents/obligations.js` (32 lines, read in full): the `documents` collection and all four
item obligations (`accompanyingDocumentType`, `…AttachmentType`, `…Reference`, `…DateOfIssue`)
declare **no `activatedBy` and no `wipeOnExit`** — anywhere.

`reconcile` only ever names a path as wiped when `obligation.wipeOnExit && !inScope && isAnswered`
(`reconcile.js:32-39`). With zero `wipeOnExit` and zero conditionals in the entire documents subtree,
**no wipe pass over a document append could ever delete anything.** The claim's rhetorical
centrepiece — "the two that skip it include the verb the documents feature uses to persist an
upload" — sounds damning and is inert. It is the weakest available example, presented as the
strongest.

## 4. What the claim MISSED — the hole that is real: `updateEntryAt`

The doc's monotonicity argument covers `appendEntryAt` only. It says nothing about `updateEntryAt`,
and `updateEntryAt` is **not** monotone: replacing an entry can flip an `anyItem` `some` from
true→false, and can change an entry's discriminator so `frame: 'enclosing'` inner fields de-scope.

Both `anyItem` obligations in the model are `wipeOnExit` and keyed on `commodityLines[].commoditySelection`:

- `countyParishHoldingCph` — `features/cph-number/obligations.js:4-13` (`anyItem` + `wipeOnExit: true`)
- `containsUnweanedAnimals` — `features/additional-details/obligations.js:6-15` (same shape)

Plus the six `enclosing`-frame `wipeOnExit` identifier fields inside the commodity item
(`features/commodities/obligations.js:33,39,45,51,70,76,83`).

So: edit a commodity line so it is no longer a CPH commodity → `countyParishHoldingCph` leaves scope,
still holds an answer, is `wipeOnExit` → **must** be wiped → `updateEntryAt` does not wipe. That is a
real stranding, and no doc justifies it.

**Why it does not bite today — convention, not structure.** The sole `updateEntryAt` caller
(`features/commodities/consignment-details.controller.js:177-184`) spreads `...entry` and overwrites
only `numberOfAnimalsQuantity` and (conditionally) `numberOfPackages`; it never touches
`commoditySelection`. The discriminator is only ever *set* through `reconcileEntriesAt`
(`search.controller.js:134` batch-create, `consignment-details.controller.js:195` remove) — both of
which **do** wipe. So the hole is currently unreachable, guarded by nothing but caller discipline: the
first controller that edits a discriminator through `updateEntryAt` opens it silently.

## 5. Doc rot found in passing (cuts against the claim's own framing)

`scope-and-wipe.md:82-84` — "**Write applies.** `commit` and `removeEntryAt` … call `destroyWiped`
… **on every write**" — and :112-113 — "`destroyWiped` … shared by `commit` and `removeEntryAt`" —
both name only **two** sites. The code has **three** (`reconcileEntriesAt` also wipes, `write.js:74-75`).
The doc *undercounts its own coverage*. So the "doc credits what the code doesn't honour" check comes
back the other way: the code is better than the doc says, not worse.

## 6. Amended claim

> A applies the derived wipe on 3 of its 5 answer-writing verbs (`commit`, `removeEntryAt`,
> `reconcileEntriesAt`). The `appendEntryAt` omission is **deliberate and sound**, not a gap:
> `docs/scope-and-wipe.md:115-119` argues an append can only add scope, and that holds against the
> real predicate set (`anyItem` reduces to `some`, which is monotone under append) because no
> `present:` predicate exists anywhere in the model — though the vocabulary *can* express one
> (`{obligation: <collection>, present: false}`), which would silently invalidate the rationale.
> The documents example is **inert**: `features/documents/obligations.js` declares no `activatedBy`
> and no `wipeOnExit` on the collection or any of its four item fields, so no wipe pass there could
> ever delete anything. The genuine hole is **`updateEntryAt`** (`engine/write.js:30-46`), which no
> doc justifies and which *is* non-monotone: an entry edit can flip an `anyItem` `some` true→false and
> strand `wipeOnExit` answers (`countyParishHoldingCph` at `features/cph-number/obligations.js:4-13`;
> `containsUnweanedAnimals` at `features/additional-details/obligations.js:6-15`), or change an entry's
> discriminator and strand the six `enclosing`-frame identifier fields. It is unreachable today only by
> caller convention — the sole caller
> (`features/commodities/consignment-details.controller.js:177-184`) spreads `...entry` and rewrites only
> quantity/packages, never `commoditySelection`, which is set exclusively via the wiping
> `reconcileEntriesAt`. The 2-line fix belongs on `updateEntryAt`, not on `appendEntry`.

## 7. Searches run

- `cat` of `engine/write.js`, `engine/evaluate/reconcile.js`, `engine/evaluate/predicate.js`,
  `engine/read.js`, `engine/journey.js`, `lib/answered.js`, `docs/scope-and-wipe.md`,
  `features/documents/obligations.js`, `features/cph-number/obligations.js`,
  `features/additional-details/obligations.js`
- `grep -rn "destroyWiped|wipeOnExit|wiped"` over the prototype → 19 files; all obligation files with
  `wipeOnExit` opened
- `grep -rn "updateEntry|appendEntry|reconcileEntries|removeEntry"` → every caller enumerated
  (documents :269/:311, consignment-details :178/:195, search :134, animal-identification :511/:548)
- `grep -rn "anyItem|enclosing|present:"` over `features/` → 2 `anyItem`, 8 `enclosing`, **0 `present:`**
- `grep -rn "present"` over `features/` + `spec/journey-spec.json` → prose only, no predicate
