# L3 adversarial verification — ST-5 (status-tasklist)

**Verdict: AMENDED.** The claim is right that B has no lock/prerequisite axis and A does.
It is wrong about *why* B's CPH row reads "Not applicable", and it credits A with a
distinction A does not actually make. The two things the claim treats as one axis-pair are
two different axis-pairs, and A only has one of them.

---

## 1. Quotes verified — every cited line is real

**B**
- `obligations/helpers.js:198` — `if (passingKeys.length === 0) return { inScope: false }`. ✅
- `helpers.js:47`, `:78` — `return decision.inScope && reasons ? { ...decision, reasons } : decision`.
  `reasons` genuinely only attach on the in-scope branch. ✅
- `obligations/obligations.js:510-519` — `cph.applyTo = anyAllowListed(commodityCode,
  CPH_REQUIRED_COMMODITIES, { inScope: true, status: 'mandatory', reasons: [cphReason] },
  { inScope: false })`. ✅
- `engine/index.js:386-388` — `classifyEntries` NA test is `inScope.length === 0 &&
  groupErrorCount === 0`. ✅
- `flow/flow.js:581-589` — `cph` **is** its own subsection with one page. `features/hub/controller.js:97-116`
  renders a row for every subsection; NA gets `govuk-tag--grey` (`:26`) and **no href** (`:113`).
  So on a blank journey B does render **"County Parish Holding — Not applicable"**. ✅
- `obligations.md:2806-2810` — "§Q. Signposting Not Applicable Sections in the Task List
  (deferred) … Presentation concern; not implemented in the spike." ✅

**And the claim UNDERSELLS one B fact.** The bare-`{ inScope: false }` normalisation is not
just a helpers convention an author could route around: `obligations/evaluator.js:448` is
`if (!isInScope(obligation)) return { inScope: false }` — `buildImplication` **discards** any
payload the author put on an applyTo false branch. `anyAllowListed`/`branchedGate` pass
`whenFalse` through verbatim (`helpers.js:110`, `:134`), so an author *can* write
`{ inScope: false, reasons: [...] }` — and the evaluator throws it away. `isInScope`
(`evaluator.js:305-321`) reduces scope to a memoised boolean. That is the load-bearing line
for "an out-of-scope decision carries no payload", not `helpers.js:198`.

**A**
- `engine/evaluate/reconcile.js:6-47` — the fixpoint. ✅
- `flow/prerequisites.js:8-26` — derived from `enforcedAt: 'continue'` + flow order +
  `pageOfObligation`. No hand-authored graph. ✅
- Exactly two obligations carry `enforcedAt: 'continue'` — `features/origin/obligations.js:4`
  (`countryOfOrigin`), `features/commodities/obligations.js:6` (`commoditySelection`).
  grep over the whole tree returns no others. ✅
- `flow/gates.js:21-28`, `features/hub/controller.js:132-135, :158-160` — `CANNOT_START_STATUS`,
  no `href`. ✅
- `engine/read.js:18-25, :32` — `answered(id)` is instance-aware via `anyInstanceAnswered`. ✅

---

## 2. Counter-example hunt — four findings, all against the claim

### 2.1 A's CPH is scope-gated exactly like B's. A's prerequisite axis does nothing for it.

`features/cph-number/obligations.js:4-13`:

```js
export const countyParishHoldingCph = {
  id: 'countyParishHoldingCph',
  required: true,
  activatedBy: {
    obligation: commoditySelection,
    frame: 'anyItem',
    includes: commodities.cphCommodities()
  },
  wipeOnExit: true
}
```

That is the same rule as B's `anyAllowListed(commodityCode, CPH_REQUIRED_COMMODITIES, …)`.
No `enforcedAt`. On a blank journey A's CPH is out of scope, identically.

A avoids the "CPH — Not applicable" row **by flow authoring, not by model**:
`flow/task-rows.js:48` — `{ id: 'addresses', pages: [addressesPage, cphNumberPage] }`. CPH
shares a row with the always-in-scope address obligations, so the row reads Not yet started
and CPH silently drops out of `rowParts`. Give CPH its own row and
`engine/status.js:59-61` — `if (inScopeParts.length === 0) return NA` — fires. That is
**bit-for-bit B's classifier rule.** The user-visible half of the claim is a task-row-grouping
artefact, not an asymmetry of model.

### 2.2 A exhibits the identical pathology on `transitCountries` — and patches it with a hand-authored hide flag

`flow/task-rows.test.js:107-116`:

```js
it('Should be Not applicable (absent) while the means of transport is not overland', () => {
  expect(statusIn('transitCountries', unlocked)).toBe(NA)
```

`unlocked` (`:29-32`) has **no `meansOfTransport` at all**. So A calls the transit-countries
row NA when the determining question has *not been asked yet*. This is precisely "not yet
determined rendered as never-applies" — the exact defect the claim pins on B. A's engine does
not distinguish it either: `reconcile` (`reconcile.js:9, :26`) is a `Set` — membership or
nothing, no third value.

A's rescue is `conditional: true` on the row (`task-rows.js:39`) plus
`features/hub/controller.js:156` — `if (row.conditional && status === NA) return null`. The
row is **deleted from the task list**. That is a hand-authored per-row presentation choice —
L2 §2.4 of this very dimension already calls it *"an authored per-row choice masquerading as a
derived one"* and tells B **not** to port it. Hiding a row whose applicability is undetermined
is arguably worse for the user than B's grey "Not applicable": the user cannot even see that a
step may appear later.

### 2.3 A fuses scope and prerequisite back into ONE boolean at the point of render

`flow/gates.js:21-28`:

```js
export const pageGatePasses = (page, scope) => {
  if (page.gate) return page.gate(scope)
  assertDispatchBuilt()
  return (
    prerequisitesMet(pagePrerequisites(page.id), scope) &&
    inScopeReachable(collectsOf(page.id), scope)
  )
}
```

`rowGatePasses = pageGatePasses(row.pages[0], scope)` (`flow/navigation.js:18`), consumed at
`features/hub/controller.js:158-160`: gate false ⇒ **"Cannot start yet"**, whatever the cause.
So A's *rendered* state cannot tell "prerequisite unmet" from "every obligation on this page is
out of scope". Proof it fires on the scope leg: `task-rows.test.js:217-222` has to exclude
`transitCountries` from "unlock every row" — its gate fails purely because its obligations are
out of scope. It only escapes the "Cannot start yet" label because the NA-hide check on line
156 runs *first*.

The two axes are separate **computations** in A's engine. They are **one boolean** by the time
the hub reads them.

### 2.4 A's hub has no Not-applicable state at all

`features/hub/controller.js:120-130` — `STATUS_TAG` has keys for FULFILLED, OPTIONAL,
IN_PROGRESS, NOT_STARTED. **No NA.** `statusTag = (status) => STATUS_TAG[status] ?? STATUS_TAG[NOT_STARTED]`.
A non-`conditional` row that goes NA and whose first page happens to gate through renders
**"Not yet started"** — an out-of-scope row presented as a live to-do. A's five user-visible
states are 4 tags + "Cannot start yet"; the claim's "sixth presentation-only state" counts an
NA tag that does not exist.

### 2.5 "Exactly TWO obligations generate the hub's entire locking behaviour" — overstated

Three mechanisms lock/hide rows in A:
1. the two `enforcedAt: 'continue'` obligations (derived — genuinely elegant);
2. an **authored** section gate — `flow/flow.js:71-72`, `{ id: 'review', gate: (scope) => scope.readyForCheckYourAnswers }`,
   which is what locks the "Check and submit" row (`hub/controller.js:139-150`).
   `docs/architecture.md:65` admits "Exactly one authored" gate;
3. the authored `conditional: true` row flag (§2.2).

### 2.6 "Not built" vs "cannot be built" — B fails this test cleanly, and has the ingredient already

B's own doc calls NA signposting a **"Presentation concern; not implemented"**
(`obligations.md:2806-2810`), and it is right. To derive "not yet determined" a view needs to
know *which obligation gates this one and whether it has been answered*. B ships that as a
first-class, already-consumed introspection surface: every helper hangs a declarative
`.metadata` sidecar on the applyTo closure (`helpers.js:49-55, :80-91, :112-118, :135-139`) —
`{ type, obligation, values, projection }` — and two live call sites already read it
(`features/commodity-lines/controller.js:110`, `features/units/controller.js:204`, the latter
documented as "read the `.metadata` sidecar rather than executing the applyTo closure").
So `cph.applyTo.metadata.obligation === commodityCode` → "is `commodityCode` answered anywhere?"
→ no → *undetermined, not inapplicable*, is available today with no model change. A's
`activatedBy` is equally declarative data, so A could do the same — and has not.

**Neither side has built "not yet determined". Both could. It is not a structural limit on
either.**

---

## 3. What actually survives

The scope axis is a boolean on both sides (`reconcile` Set vs `isInScope` memo). Neither
distinguishes never-applies from not-yet-determined. That whole half of the claim is symmetric.

What is genuinely asymmetric — and is worth the shopping-list slot — is narrower:

> **A can express "in scope, mandatory, but not reachable yet". B has no such state.**
> A derives it from two data facts (`enforcedAt: 'continue'`) + flow order + the dispatch
> index (`flow/prerequisites.js:8-26`), with no hand-authored prerequisite graph, and renders
> it as a link-less "Cannot start yet". B's `STATUSES` (`engine/index.js:274-281`) has no
> locked state; `mandatoryToProceed` (`flow/flow.js`, read at `engine/index.js:254` and
> `contract.js:267`) is a page-save validation gate, not a hub lock. B's entire task list is
> therefore navigable from a blank journey.

That is real, and it is the thing to port. But it is the **prerequisite** axis, not the
**scope-determinacy** axis, and it would not have changed the CPH row by one pixel.
