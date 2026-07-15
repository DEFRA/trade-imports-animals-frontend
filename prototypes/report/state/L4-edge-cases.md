# L4 — Edge-case lens

**Question:** what happens at the joints neither README documents — a re-gate at
check-your-answers, a collection emptied below its floor, a gate that flips while a
value already sits in storage, a deep link or Back button into a page that is no
longer reachable, JavaScript off, a duplicate. For each, read the code and tests,
work out what each side *actually does*, and where a side has no answer treat the
absence as the asymmetry. Every claim carries file:line on presence AND absence.

The other three L4 lenses (requirements, model-power, production) established the six
standing structural capabilities. This lens does NOT re-argue them; it either finds a
NEW edge-driven facet of one, or a genuinely new joint. Several "edges" turn out
symmetric — recorded deliberately, because a false asymmetry is as damaging to option
C as a missed real one.

Paths are relative to each clone's prototype root
(`clone-live-animals/…/standalone/live-animals`, `clone-flow-layer/…/EUDPA-249-flow-layer`).

---

## The load-bearing structural fact this lens turns on

**A reconciles the whole answer tree on every write; B computes a purge at read and
throws it away.**

- A: `commit` (engine/write.js:11-18) runs `reconcile(answers)` then
  `destroyWiped(answers, wiped)` and only then persists — on *every* page save,
  every change-link save, every amend save. `reconcile` (engine/evaluate/reconcile.js:6-48)
  is a fixpoint over the entire tree, so after any write the stored answers are
  globally scope-consistent, and any `wipeOnExit` obligation that just fell out of
  scope is physically gone (reconcile.js:32-45 → write.js:15).
- B: `evaluate` returns `{ fulfilments: amendedFulfilments, … }` where
  `amendedFulfilments` is the purged map (obligations/evaluator.js:94, :124), and
  `readState` hands it to the view (lib/state.js:42-44). But **every mutator re-reads
  RAW yar and writes RAW back**: `writeAnswer` (lib/state.js:50-77),
  `addCommodityLine` (:102-115), `deleteCommodityLine` (:121-161), `addUnitRecord`
  (:187-201). Nothing ever calls `writeFulfilments(request, amendedFulfilments)`.
  Worse, `applyTo` runs at step 3 on `recognisedFulfilments`, which is **pre-purge**
  (evaluator.js:60-84, :288) — so an out-of-scope answer still feeds other
  obligations' gates on every request.

Almost every A-vs-B edge below is a consequence of this one difference.

---

## A-only

### EC1 — Change-link at CYA round-trips back to CYA (change-and-return)
The GDS pattern: click Change on a CYA row, edit the one field, land back on CYA.
- **A does it.** CYA change links carry `?change=1` (features/check-answers/controller.js:28
  `withChange`); every page's post computes its next hop through `kit.nextTarget` →
  `exitTarget`, and `exitTarget` sees the change context and redirects to `CYA_SLUG`
  instead of the linear next page (shared/kit.js:47-54, :59-63). So the edit round-trips.
- **B cannot.** `hrefForChange` returns a bare `${BASE}/pages/${page}` with **no**
  change marker (features/check-your-answers/controller.js:115-129), and the generic
  page controller unconditionally walks to `nextAfter` in the linear flow
  (lib/page-controller.js:90-93). A Change click drops the user into the middle of the
  linear journey, not back on CYA.
- **aStatus** handled-imperatively (it is controller plumbing, not model data);
  **bStatus** absent. **structural=false** — B needs a change-context query param plus a
  return-to-CYA branch in its three generic controllers, ~30 LOC, no model change.

### EC2 — A logically-deleted answer keeps driving OTHER gates (resurrection, sharpened)
The known B defect (session-state L2; L4-production §7) is "out-of-scope answers rot in
session and resurrect pre-filled." The edge lens shows the sharper, quieter failure:
**a value the model believes it deleted still decides other obligations' scope on every
request, with no reload required.**

Concrete sequence in B:
1. User answers gate G (e.g. `reasonForImport = internalMarket`), fills dependent D
   (`purposeInInternalMarket`). Both land in raw yar via `writeAnswer` (lib/state.js:50-77).
2. User changes G to `slaughter`. `writeAnswer` writes G's new value into RAW yar and
   **leaves D untouched** (it only touches the keys the current page submitted).
3. Next `readState`: `evaluate` purges D from the *returned* view (evaluator.js:94), so
   the UI looks correct — but raw yar still holds D. And step 3's `applyTo` for every
   OTHER gate runs on the pre-purge map (evaluator.js:80-84), so any gate that reads
   D's obligation sees the stale value.
4. User changes G back to `internalMarket`: D's old answer resurfaces pre-filled,
   because it was never removed.

**A avoids all of it.** At step 2 A's `commit` reconciles the whole tree and
`destroyWiped` physically removes D (D carries `wipeOnExit`), so step 3/4 cannot happen;
and A's storage port exposes no per-key delete (engine/persistence/records.js), so no
controller can reintroduce the leak by hand.
- **aStatus** modelled-declaratively (`wipeOnExit` is data; the destroy is engine-wide);
  **bStatus** partial (purge exists but is read-only, and runs *after* the gates that
  consume the stale value). **structural=false** — persist `amendedFulfilments` on write
  (~5 LOC), but ALSO move `applyTo` to post-purge, which is not free: the pre-purge
  enumeration is what lets B's cross-level gates look up parent-instance paths
  (evaluator.js:67-84), so the reordering needs care. Small, but touches the evaluator's
  step ordering, not just a missing write.

### EC3 — Empty collection below its floor still reads submit-ready (facet of the min-instance floor)
A NEW mechanism-level facet of the confirmed A-only floor capability, plus proof B's
own group-invariant does **not** paper over it.
- **A blocks it.** `commodityLines` and per-species `animalIdentifiers` carry
  `requiredAtLeastOne: true` as data (features/commodities/obligations.js:108, :123);
  `collectionComplete` returns incomplete for an empty required collection
  (engine/evaluate/complete.js:65 `if (obligation.requiredAtLeastOne && entries.length === 0) return false`);
  `statusOf` then treats it as an unsatisfied required part → NOT_STARTED / IN_PROGRESS
  (engine/status.js:23-24, :63-78), and `readyForCheckYourAnswers` refuses CYA
  (flow/section-status.js:11-15). Zero lines ⇒ cannot submit.
- **B classifies it fulfilled.** `journeyState` collects in-scope *presented* entries
  across the flow (engine/index.js:583-599); `expandPresents` expands a `presentsForEach`
  page to **one entry per existing group-instance record** (engine/index.js:258-270), so
  zero commodity lines contribute **zero** entries, the page collapses to NA
  (classifyEntries, index.js:387), and with no mandatory concern left the journey returns
  FULFILLED (index.js:402-409). B's only cardinality-ish rule, `requires.anyOf`, fires
  **per existing instance** (engine/index.js:512-539) — zero instances ⇒ zero errors, so
  it cannot enforce a floor. No `requiredAtLeastOne` / `maxEntries` verb exists anywhere
  in B's evaluator or obligations.
- **aStatus** modelled-declaratively; **bStatus** absent. **direction A-only**,
  **structural=true** — B needs a minimum-cardinality verb in its obligation vocabulary
  plus a classifier branch that reads it (~8 LOC classifier, but the verb is new model
  shape). Facet of the confirmed A-only floor capability, not a new capability.

### EC4 — Cardinality-linked collection SHRINK (count lowered below existing child records)
A NEW facet of A's confirmed `maxEntriesFrom` capability: the model cap is **append-only
and one-directional**, so the *shrink* direction lives outside the model on BOTH sides —
but B cannot even express the link.
- **A, the cap:** `maxEntriesFrom = numberOfAnimalsQuantity` on `animalIdentifiers`
  (features/commodities/obligations.js:110); `collectionCapAt` resolves the sibling count
  per frame (engine/evaluate/cardinality.js:20-31) and `appendEntryAt` refuses an append
  at the cap (engine/write.js:23-24). **But nothing re-trims when the count drops.** The
  shrink case — lowering `numberOfAnimalsQuantity` below the number of identifier records
  already entered — is caught by **hand-written imperative controller code**:
  `countDropIssues` (features/commodities/consignment-details.controller.js:122-145)
  compares `entry.animalIdentifiers.length` to the entered count and BLOCKS the save with
  a named-species error linking to that species' card (never silently trims). So A models
  the append cap but hand-codes the shrink block — the closed 4-operator vocabulary has no
  arithmetic comparator, so the count-drop rule left the model.
- **B has nothing.** No `maxEntriesFrom`, no cross-collection count relation, no mutation
  primitive to enforce a cap against (all writes are imperative in lib/state.js and the
  evaluator has no mutation step). B cannot state "at most N, N = a sibling field" at all,
  let alone detect the shrink.
- **aStatus** partial (append cap modelled; shrink handled-imperatively); **bStatus**
  absent. **direction A-only**, **structural=true** — B needs a cardinality vocabulary AND
  a write-time enforcement site, neither of which its model has. Facet of the confirmed
  A-only cardinality capability; the new observation is that even A pushes the *shrink*
  out of the model.

### EC5 — Whole-journey deep-link entry guard
- **A has one.** `entryGuardTarget` (flow/entry-guard.js:44-50) redirects a fresh journey
  that deep-links to any post-filter page back to the import-type filter, unless the user
  already entered through it or has committed notification answers (:37-49). It is a real,
  journey-level "you cannot start in the middle" guard.
- **B has none.** No entry-guard module exists; `/start` and every `/pages/*` route render
  directly (routes.js:59-205).
- **aStatus** handled-imperatively; **bStatus** absent. **direction A-only**,
  **structural=false**. Honest caveat: A's guard is entangled with its stub/real import-type
  *service routing*, a concept B's model-only spike never had, so part of this asymmetry is
  scope, not capability — priced low and flagged.

### EC6 — Amend-after-submit that re-gates a whole section
- **B has no submit and no amend at all** — there is no POST on check-your-answers
  (routes.js:73-79 registers only GET), no finalise, no status lifecycle
  (engine/index.js STATUSES has SUBMITTED as a short-circuit but nothing writes it).
- **A has the lifecycle.** `amendJourney` transitions a SUBMITTED journey back to editable
  via `records.amend` (engine/journey.js:97-104); subsequent saves still run the full
  `commit` reconcile+wipe (write.js:11-18), so changing a gating answer during amend
  correctly wipes the now-out-of-scope section.
- The sting (cross-ref L4-production §9, surfaced again by this edge): A's amend rests on
  **array-position identity** — collection entries are array elements (lib/path.js splice /
  `wipeOrder`), so deleting or wiping a gated entry during amend shifts the indices of the
  survivors, and the persisted submitted record cannot be re-diffed against the draft by a
  stable id. B, which has no submit, nonetheless has the *better* identity model for it
  (monotonic never-recycled ids, lib/state.js:84-95).
- **aStatus** handled-imperatively; **bStatus** absent. **direction A-only**,
  **structural=false** for B (the lifecycle is a port/envelope, not a model change — a
  sprint, per L4-production §9). Recorded facet: A shipped amend on an identity foundation
  that the amend feature itself strains.

---

## B-only

### EC7 — Per-instance URL entry-guard for a forged / gated line or unit deep-link
- **B guards it.** Both generic instance controllers redirect a URL naming a non-existent
  or out-of-scope line/unit: `lineExists` + `obligationInScopeForLine` → redirect to
  `/lines` (lib/line-page-controller.js:48-66, :74-79, :97-100); `unitExists` +
  `obligationInScopeForUnit` → redirect (lib/unit-page-controller.js:53-77, :105-109,
  :128-132). A forged `/lines/{pigLine}/number-of-packages` (a page not in scope for that
  code) becomes a redirect, not an empty form that silently POSTs nothing.
- **A has no per-instance URL layer of this kind** — its collection editing is flow-major
  (one consolidated page over the whole collection), so there is no equivalent forged-URL
  surface; where A does have instance URLs it does not hard-guard them at GET (it relies on
  the POST-time wipe). Per L4-production §15, A *could* build the same guard for ~20 LOC via
  the existing `makeScope().has(pathKey(path))` — so it is absent-but-cheap, not obstructed.
- **aStatus** absent; **bStatus** handled-imperatively. **direction B-only**,
  **structural=false** (A ~20 LOC on `makeScope.has`).

---

## Symmetric / both-lack (recorded to prevent false asymmetries)

### EC8 — Deep-link / Back-button into a currently-gated STATIC page
Neither side hard-redirects at GET; both render the page, and the difference is the
recovery mechanism, not a guard.
- **A** renders the gated page (features/import-purpose/controller.js:58-63 — no gate
  check on GET); safety comes on POST, where `commit` reconciles and `destroyWiped` removes
  the off-gate value (write.js:14-16). Back-button onto a wiped field shows it blank.
- **B** renders the page but `fieldsForPage` yields no descriptors for an out-of-scope
  obligation (lib/page-controller.js:49-63), so the user sees an empty shell and the POST
  writes nothing (contract validation loops only in-scope descriptors). Note B's guard is
  **inconsistent**: it hard-guards per-instance line/unit pages (EC7) but leaves static
  gated pages unguarded.
- **direction neither**, **structural=false** — either side adds one scope check per generic
  GET. Recorded so option C does not credit B's EC7 guard as full deep-link coverage.

### EC9 — JavaScript OFF: conditional field correctness
Both journeys are correct with JS off; the mechanisms are opposite duals, and this is the
JS-off facet of the same-page-reveal asymmetry (L4-requirements R10), not a new capability.
- **A** renders the region-of-origin-code input as a govuk conditional reveal on the SAME
  origin page as its yes/no gate (features/origin/controller.js commits both
  `regionOfOriginCodeRequirement` and `regionOfOriginCode` from one POST). With JS off both
  controls show; if the user submits the code while the requirement is "no", A stays safe
  **because reconcile wipes the off-gate value server-side** (write.js:14-16). A's JS-off
  safety RIDES on the wipe — precisely the guarantee B's read-only purge (EC2) loses.
- **B** computes field scope at GET server-side and omits out-of-scope fields from the HTML
  entirely (lib/page-controller.js:52), so there is nothing to submit — safe by
  never-rendering, but structurally unable to reveal a field the same page's answer just
  brought into scope (no client evaluator, no self-POST).
- **direction neither** on JS-off *safety* (both safe); the same-page-*reveal* half is the
  A-only item already booked as R10. **structural=false**. Recorded to keep the two apart.

### EC10 — Optional section left untouched: its own tag, not "complete"/"incomplete"
Both models distinguish OPTIONAL from NOT-APPLICABLE for an untouched, no-mandatory,
opt-in-available section — this is NOT the "Cannot start yet vs Not applicable" gap
(that one IS A-only, R8).
- **A:** `statusOf` returns OPTIONAL when no required part is in scope and nothing is
  started (engine/status.js:63-66), NA when nothing is in scope at all (:61).
- **B:** `classifyEntries` returns OPTIONAL for "no mandatory in scope, ≥1 optional, no
  input" and NA for "no in-scope obligations" (engine/index.js:387-408).
- **aStatus / bStatus** both modelled-declaratively. **direction neither**,
  **structural=false**. Recorded to stop a false asymmetry: the tasklist optional/NA
  distinction is symmetric; only "Cannot start yet" is A-only.

### EC11 — Duplicate item in a collection
Both permit a duplicate commodity line (same commodity + species twice) as two distinct
instances; neither dedupes.
- **A** appends array elements and explicitly keeps same-commodity CYA cards distinct
  (features/check-answers/controller.js:163-164 comment; identity = array position).
- **B** mints a fresh monotonic `line{N}` per add (lib/state.js:97-118; identity = stable
  id). The distinct removal path in A keys by `commoditySelection`
  (consignment-details.controller.js:190-197) but that is a bulk remove-by-commodity
  affordance, not a uniqueness constraint.
- **aStatus / bStatus** both modelled-declaratively (both permit). **direction neither**,
  **structural=false**. The only real difference is the identity model (array vs stable id),
  already booked in L4-production §9 — recorded here so "duplicate handling" is not mistaken
  for a fresh asymmetry.

---

## What this lens adds to the shopping list for option C

The three genuinely new, actionable edge findings, all pointing the same way:

1. **Persist the purge AND move `applyTo` post-purge** (EC2). The 5-LOC write-back
   quoted elsewhere is necessary but not sufficient — the pre-purge `applyTo` ordering
   (evaluator.js:80-84) means a "deleted" answer keeps driving live gates until both are
   fixed. Take A's write-time reconcile discipline wholesale.
2. **Change-and-return CYA plumbing** (EC1) is missing from B entirely and is pure
   controller work — cheap, but it is table-stakes GDS and B has none of it.
3. **The floor and the cap are two different asks** (EC3, EC4): the min-instance floor is
   a model-vocabulary addition B needs for submit-readiness; the field-linked cap needs a
   cross-collection count relation AND a write-time enforcement site B lacks entirely — and
   even A pushes the *shrink* direction out into imperative controller code, so option C
   should model the cap bidirectionally rather than copy A's append-only form.

And the guard picture: take **B's per-instance URL guard** (EC7) and **A's journey-level
entry guard** (EC5) — they cover different surfaces and B's static-page gap (EC8) shows
neither side alone is complete.
