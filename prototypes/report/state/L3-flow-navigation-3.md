# L3 adversarial verification — flow-navigation, claim FN-3

**Claim:** A derives a whole prerequisite-locking graph ("Cannot start yet") from exactly 2 obligation-level
`enforcedAt:'continue'` flags × flow position, with ZERO hand-authored prerequisite edges. B **cannot express the
concept**: its status alphabet has 6 values and none is "cannot start yet", and its flow declaration has no
visibility key in 667 LOC.

**Verdict: AMENDED.** The A half is real but the cited hub lines prove the opposite of "zero hand-authored edges".
The B half — "cannot express" — does not survive contact with B's source: B already carries a *richer* version of
A's carrier fact, already has the ordered walk, and its task list **already renders a locked, hrefless row**. B has
not *built* the lock; nothing in its model forbids it.

---

## 1. What the source actually shows on side A (mostly true)

- `flow/prerequisites.js:8-26` — verified verbatim. `continueObligationOwners()` walks every obligation
  (`walkObligations()`), keeps those with `obligation.enforcedAt === 'continue'`, maps each to the flat flow index of
  its owning page via `pageOfObligation(templatePath)`; `continuePrereqsBefore(flowIndex)` returns owners **strictly
  earlier** in flow order. No authored edge table anywhere. 31 LOC total.
- Carriers: `grep -rn enforcedAt` over the whole of A returns exactly **two** code sites —
  `features/origin/obligations.js:4` and `features/commodities/obligations.js:6` — matching
  `spec/journey-spec.json:543,1384`. The other ~40 hits are `enforcedAt: 'submit'` (never a prerequisite) or docs.
- Consumption: `flow/gates.js:21-28` `pageGatePasses` = `prerequisitesMet(pagePrerequisites(page.id), scope) &&
  inScopeReachable(collectsOf(page.id), scope)`; `flow/navigation.js:18` `rowGatePasses = pageGatePasses(row.pages[0])`.
- Behaviour is tested, not merely asserted: `flow/gates.test.js:92-134` — origin always open; commodities gated on
  `countryOfOrigin`; every post-commodities section gated until an **item-level** `commoditySelection` is answered;
  an obligation with no `enforcedAt` is never a prerequisite.
- Surface: `features/hub/controller.js:132-135` `CANNOT_START_STATUS`, rendered hrefless
  (`t2-hub-copy.test.js:111-118`).

### 1a. But "ZERO hand-authored prerequisite edges" is contradicted by the claim's own citation

The hub has **two** producers of "Cannot start yet", and the claim cites both as if they were one:

- `features/hub/controller.js:158-159` (`rowGatePasses`) — the derived RULE 1. This is the claim's mechanism. ✅
- `features/hub/controller.js:139-144` (`buildReviewItem` → `sectionGatePasses`) — which short-circuits on
  `section.gate` (`flow/gates.js:31`), and the review section's gate is **hand-authored**:
  `flow/flow.js:71-73` — `{ id: 'review', gate: (scope) => scope.readyForCheckYourAnswers, … }`.

A's own test file names them apart: "RULE 1 — mandate-derived sequencing" vs "RULE 2 — review gates on
submit-readiness" (`flow/gates.test.js:137`), and `docs/architecture.md:65` concedes "Exactly one authored [gate]".
So the lock the user sees most often (Check and submit) is an authored predicate, not a derived edge. "Zero
hand-authored edges" is true of RULE 1 only; the *locking surface* is derived + one authored gate.

### 1b. "Graph" oversells it, and the lock is advisory

The derived relation is a **2-tier prefix rule**, not a graph: prerequisites of page *i* = {continue-obligations owned
by pages < *i*}. It is monotone in flow position and obligation-granular, so it cannot express "X requires Y" where Y
follows X, nor a prerequisite that only *some* later pages carry. With 2 flags it yields exactly two tiers
(origin open → commodities needs `countryOfOrigin` → everything else needs both). And `pageGatePasses` is never
consulted in a route handler / `onPreHandler` — typing the URL of a "locked" page still serves it. So this is a
hub-affordance + link-target rule, not an enforced lock.

## 2. Counter-example hunt on side B — the claim breaks here

Searched B's whole tree for `cannot start | cannotStart | prerequisite | prereq | blocked | dependsOn | locked |
unlock`, and B's `flow/flow.js` for `visible | showIf | when: | gate | sectionEntryMode`.

**True facts in the claim:** `engine/index.js:274-281` is a 6-value `STATUSES` const with no cannot-start member.
`flow/flow.js` is 667 LOC (`wc -l`) and has no visibility/`when`/`showIf` key (only `sectionEntryMode:
'firstApplicablePage'` at :89, and `gate` appears solely inside comments).

**But every ingredient of A's lock already exists in B:**

1. **The carrier fact — and B's is richer than A's.** `mandatoryToProceed` appears **19×** in `flow/flow.js`, as a
   per-*presents-entry* flag (`engine/index.js:250-257,258-270` lifts it into the presented-entry descriptor). That
   is A's `enforcedAt:'continue'` — "mandatory at point of display" — except it is declared **per page-position**
   rather than per obligation, so B can say "obligation O is proceed-mandatory *on this page*" and A cannot. B also
   *enforces* it, which A does not: `contract.js:266-283` rejects the POST with `code: 'flow.required'` when a
   `mandatoryToProceed` descriptor is blank or structurally incomplete.
2. **The ordering.** B's Section→SubSection→Page tree is the single declared order, already walked depth-first by
   `contract.js:101-111` (`startPage`) and `firstUnfulfilledPage`. "All earlier proceed-mandatory entries fulfilled"
   is computable today from `presentedEntries` + `hasFulfilment` — the same two inputs `flow/prerequisites.js` uses.
3. **The locked row already renders.** `features/hub/controller.js:113` —
   `if (href && (isLinesManage || status !== STATUSES.NOT_APPLICABLE)) item.href = href` — a row whose status is
   NOT_APPLICABLE is emitted **with a status tag and no link**. B's task list already has the hrefless-locked-row
   affordance; only the label and the predicate differ.
4. **The status alphabet is not treated as closed.** B's own canonical doc proposes extending it:
   `obligations.md:2845-2858` — "extend the Journey state taxonomy with a **Cannot Submit** state mutually exclusive
   with Fulfilled". A 7th member of a 6-member const object is not a structural boundary; B's author already plans an
   addition to that exact enum.
5. **The scope language could already fake it (badly).** `applyTo` is an arbitrary closure over `fulfilments`
   (`obligations/evaluator.js:273-296`), so a later obligation *can* be scoped out until `countryOfOrigin` is
   answered — producing a genuinely hrefless row via (3). That path is semantically wrong (it means "does not apply",
   drives the purge, and reads "Not applicable"), which is a good argument for a distinct status — but it is an
   argument about *correct modelling*, not about *expressibility*.

The absence of a visibility key in B's flow is also weak evidence: **A's own lock does not use a visibility key
either** (RULE 1 is derived from obligation facts + position). The only place A uses one is the single authored
review gate. So "no visibility key" is not what stops B — nothing does; B simply never wrote the derivation.

L2 itself prices the retrofit at **~60 LOC** ("give B a 7th status, a page-order index — its tree already has one —
and A's `enforcedAt:'continue'` derivation"). A capability that a rival model would happily accept for 60 additive
lines is *not built*, not *cannot be built*. That is exactly the conflation this pass exists to catch.

## 3. Where the claim still stands

Nothing in B *does* prerequisite locking, and B's doc never even names the idea (zero hits for "cannot start" /
"prerequisite" across `obligations.md`; the closest, §Q at :2806-2810, defers *signposting NA sections* as a
"presentation concern"). So the delivered-capability gap is real and one-directional, and A's derivation-from-facts
is the better shape (2 declarations, no edge table, tested). The cost of the gap in B is small and additive; the cost
in A is that its prefix rule cannot express a non-monotone dependency.
