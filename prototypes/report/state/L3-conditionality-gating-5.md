# L3 — Adversarial verification — conditionality-gating — claim C5

**Verdict: AMENDED.** Every factual assertion about A survives (with two arithmetic/precision
corrections). The comparative half — *"exactly what B's field-descriptor layer makes impossible by
construction"* — **does not survive contact with B's source.** B has the same defect, at two sites,
one of which is a **write** path, and it has it for a *structural* reason A does not share.

Paths relative to each side's root:
- **A** = `clone-live-animals/prototypes/standalone/live-animals/`
- **B** = `clone-flow-layer/prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

---

## 1. Step 1 — the cited lines are real and mean what the claim says

| Citation | Verified? | Actual source |
|---|---|---|
| A `features/additional-details/controller.js:61` — only scope-aware render path | **YES** | `scope.has('containsUnweanedAnimals')`. Grep for `scope.has` across `features/`, `flow/`, `shared/` returns **exactly two hits**: `additional-details/controller.js:61` (GET) and `:67` (POST). Nothing else in the app asks the engine. |
| A `consignment-details.controller.js:17-18` — reads the service list directly | **YES** | `packagesApply = (c) => commodities.packageCountCommodities().includes(c)`. Does not touch `numberOfPackages.activatedBy`. |
| A `additional-details/controller.js:13-18` — hand-rolled `anyItem` | **YES** | `unweanedApplies` = `[].concat(answers.commodityLines ?? []).some(line => commodities.unweanedCommodities().includes(line?.commoditySelection))` — a hand-written existential over the collection. Used at `check-answers/controller.js:136`. |
| A `check-answers/controller.js:111,150` — raw string literals | **YES** | `answers.regionOfOriginCodeRequirement === 'yes'` and `answers.reasonForImport === 'internalMarket'`. |
| A `features/origin/template.njk:42` — hard-coded GDS conditional | **YES** | `{ value: "yes", ..., conditional: { html: regionCodeHtml } }` inside `govukRadios`. Nothing model-derived. |
| A `flow/gates.js:21-37` — page/section gates derived, 1 authored gate | **YES** | Confirmed against `gates.js` + `flow/flow.js:72`. |
| B `build-field-descriptors.js:67` — render-side scope filter | **YES** | `if (!entryInScope(entry, state)) continue`, where `entryInScope` reads `state.obligations[id].inScope`. |
| B `contract.js:224-228` — POST iterates the same descriptor list | **YES** | `validatePagePayload` → `fieldsForPage(page, state, {}, options)` → `buildFieldDescriptors`, then `for (const descriptor of descriptors)`. `values` is built **only** from descriptors. |
| B `flow/flow.js` — 667 LOC, zero visibility rules | **YES** | `wc -l` = 667. Grep for `gate|visible|hidden|conditional|when` in `flow.js` returns **comments only** — no `gate:`, `when:` or `visible:` key exists. |

So: the claim is not fabricated. Everything it points at is on disk.

---

## 2. Step 2 — the counter-example hunt on B. **It found one. Two, actually.**

The claim's load-bearing sentence is that B's descriptor layer makes hand-rolled reveal *impossible by
construction*. I grepped B's whole tree for controllers that decide visibility **without** going through
`buildFieldDescriptors` / `fieldsForPage`. Two exist, and both hand-interpret the obligation's gate:

### (a) `features/commodity-lines/controller.js:104-124` — a RENDER path

```js
function lineHasWiredUnitObligation(state, lineId) {
  const lineCode = state.fulfilments?.[commodityCode.id]?.[lineId]
  ...
  const meta = obligation.applyTo?.metadata
  if (meta.type === 'allowListed' && meta.values?.includes(lineCode)) return true
  if (meta.type === 'allowListedByPredicate' && meta.predicate?.(lineCode)) return true
}
```

This decides whether the line's **"Manage animals"** affordance renders. It re-implements the
allow-list membership test **by hand** (`meta.values.includes(...)`), exactly as A's
`typeApplies` re-implements `activatedBy.includes` (`animal-identification.controller.js:42-43`). It
does not consult the evaluator. It is not in the descriptor list. It is a hand-rolled reveal.

### (b) `features/units/controller.js:186-222` — a **WRITE** path

`pickSeedObligationForLine` runs the *same* hand-interpretation and its return value selects which
obligation `addUnitRecord` seeds (`lib/state.js:196-200`, `seed[compositeKey] = ''`). So on B, a
**fulfilment key is written into the session on the basis of a hand-rolled predicate**, not on the
basis of the descriptor list. The claim's flat assertion — *"an out-of-scope field can be neither
shown nor written"* — is therefore false as stated: `validatePagePayload` is not B's only write path.

### And the reason is structural, which is the interesting part

B's own comments say why it had to hand-roll:

> `units/controller.js:180-183` — *"at add-time no unit exists yet, so `impl.inScope` is false for the
> very obligation we want to seed (chicken-and-egg: the evaluator's projection over
> `unitRecord.records` returns [], so the applyTo closure short-circuits before checking codes)"*

> `helpers.js:83-87` — *"Expose the predicate so callers can ask 'would this value be admitted?'
> **without executing the whole applyTo closure** (which requires evaluator state)"*

B's `applyTo` is a **closure over live state**. It can only answer *"is this in scope right now?"* It
**cannot** answer the counterfactual *"would code X open this obligation?"* — which is the question a
render surface actually needs. B's fix was to bolt a `.metadata` sidecar onto every helper and
**hand-interpret it in the controllers**. That is the closure-non-invertibility cost (claim C2) landing
in this dimension as *exactly the defect the claim credits B with eliminating*.

### The blind spot that follows

`helpers.js` builds five metadata types. Both of B's hand-rolled sites handle **only two**
(`allowListed`, `allowListedByPredicate`). `branchedGate`'s metadata is
`{ type: 'branchedGate', whenTrue, whenFalse }` (`helpers.js:135-139`) — **no obligation, no
predicate**, so it is not even introspectable. The moment a unit-scoped obligation uses
`branchedGate`, `anyAllowListed` or `matches`, both functions silently fall through
(`if (!meta) continue` / no matching branch) and the "Manage animals" link vanishes with no error.
That is a live drift vector in B, of the same species the claim attributes only to A.

### What B does NOT have at all: in-page progressive reveal

Grep for `conditional` across all of B's `.js` and `.njk`: **zero hits in code** (only prose in
`obligations.md`, `NEXT.md`, `RECOMMENDATION.md` and test comments). `lib/field-widgets.js` (343 LOC)
emits `{ type, args }` and `shared/partials/fields.njk` renders one flat govuk macro per descriptor —
there is **no `conditional:` slot anywhere**.

This matters because it explains B's cleanliness. B's answer to *"show the region code only when the
user says yes"* is **one question per page**:

```js
// flow/flow.js:110-128
{ page: 'region-code-requirement', presents: [{ obligation: regionCodeRequirement }] },
{ page: 'region-code',             presents: [{ obligation: regionCode, mandatoryToProceed: true, ... }] }
```

A puts `countryOfOrigin` + `regionOfOriginCodeRequirement` + `regionOfOriginCode` +
`internalReferenceNumber` on **one** page with the standard GDS radios reveal
(`origin/template.njk:37-45`). B's descriptor filter **structurally cannot do that**: `entryInScope`
reads `state.obligations[...].inScope`, derived from the **stored** fulfilments — and a same-page
gating answer is not in the store at GET time. B has never had to solve same-page reveal because it
routed around it. If B were asked to build A's origin page it would have to hand-roll the same thing A
hand-rolls, or grow a `conditional` slot in `field-widgets.js` — i.e. **new capability, not existing
capability**. The claim conflates "B does it cleanly" with "B's model makes the dirty version
impossible", and the second does not follow from the first.

---

## 3. Step 3 — not-built vs cannot-be-built, and two precision corrections on A

**Correction 1 — the arithmetic.** `L1-conditionality-gating-A.md` §4's census has **eight** hand-rolled
sites plus `additional-details:61`, i.e. **nine** paths, 1 engine-aware / 8 hand-rolled. The claim says
"ONE of eight … the other seven". Immaterial to the substance, but the number is wrong.

**Correction 2 — "five never reference the obligation" is literally true but the drift risk is
overstated for two of the five.** The obligations are *built from the same service calls* the
controllers use:

```js
// A features/commodities/obligations.js:11-18
export const numberOfPackages = {
  activatedBy: { obligation: commoditySelection, includes: commodities.packageCountCommodities() },
  ...
}
// A features/commodities/consignment-details.controller.js:17-18
export const packagesApply = (c) => commodities.packageCountCommodities().includes(c)
```

Same for `unweanedApplies` vs `containsUnweanedAnimals.activatedBy.includes`
(`additional-details/obligations.js:9-13` — `includes: commodities.unweanedCommodities()`). There is
**one source of truth for the list**; adding a commodity to `packageCountCommodities()` moves the
obligation *and* the controller together. What is duplicated at these two sites is the **operator /
quantifier**, not the data. They cannot drift on the list.

The sites with **genuine independent-literal drift** are **three**, not five:
- `check-answers/controller.js:111` `=== 'yes'` vs `origin/obligations.js:15` `equals: 'yes'`
- `check-answers/controller.js:150` `=== 'internalMarket'` vs `import-purpose/obligations.js:6` `equals: 'internalMarket'`
- `origin/template.njk:42` — the reveal *structure* is hard-coded and referenced nowhere in the model

Three duplicated-literal sites is still a real maintainability finding. It is not five.

**Not structural on A — the claim already concedes this, and is right to.** `scope.has(id)` is on the
facade (`engine/read.js:27-35`); nothing prevents any of the eight sites calling it. The engine would
happily accept it. This is unbuilt discipline, not an expressiveness ceiling.

---

## 4. Step 4 — is a doc being credited that the code does not honour?

No — the claim is code-cited on both sides, and I re-derived every citation from source. But the
claim's **conclusion** rests on a property B's code does not have. Both `obligations.md` and the L2
write-up present the descriptor layer as a total guarantee; `features/commodity-lines/controller.js`
and `features/units/controller.js` are the two places it is not.

---

## 5. The rhetorical inversion — "the model is the safety net for a best-effort UI, which is backwards"

This is the part of the claim I most want to push back on. Take A's origin page: the hidden reveal
input still posts, `commit` writes it, and `reconcile` destroys it on the same write
(`engine/write.js:11-18`). The claim frames that as *backwards*. Compare what B does with **its**
hand-rolled write:

- B's purge is a **read-time projection**. `lib/state.js:42-44` — `readState` returns
  `evaluateState(readFulfilments(request))` and **discards the amended map**; all five
  `writeFulfilments` call sites rebuild from the raw session map. Nothing writes the purge back.

So when B's `pickSeedObligationForLine` hand-roll disagrees with the evaluator, the orphan key it
seeded **rots in the `@hapi/yar` session forever** and is resurrected pre-filled on a gate flip. A's
equivalent page-level drift **is caught and destroyed on the next commit, by a write surface that
exports no delete primitive** (`engine/index.js` — no `setScope`, no per-key delete).

A defence-in-depth layer that destroys what a page wrongly wrote is not "backwards" — it is the only
reason A's five drifted sites are *harmless*. B has the drift **and no net**. The correct lesson is not
"A's net is backwards", it is "**A has the net and should also fix the UI; B needs the net *and* has
the same UI problem**".

---

## 6. Caveat on my own finding

I am **not** claiming A and B are equal here. B is genuinely better on this axis:

- B's descriptor list covers **all 31 pages** with **one** implementation
  (`page-controller.js:52,73`, `line-page-controller.js:80,108`, `unit-page-controller.js:93`) and
  binds GET and POST to the same list. A binds them on **one** page.
- B's CYA is **also** scope-derived — `features/check-your-answers/controller.js:207-209`
  (`if (!obligation || !impl.inScope) continue`), with **no** raw string literals anywhere. That is a
  clean win over A's `check-answers/controller.js:111,150`.

The finding is that B's guarantee is **strong but not total**, that its two leaks are on the axis its
closure model **structurally cannot serve** (counterfactual scope), and that B's cleanliness is
partly bought by never attempting the same-page GDS reveal at all.

---

## What I searched

- `grep -rn "scope.has|scope.answered|inScope"` over A's `features/`, `flow/`, `shared/` — 2 live hits, both in `additional-details/controller.js`.
- `grep -rn "unweanedApplies|packagesApply|typeApplies|fallbackApplies|permanentAddressApplies"` over A — full call-site census, all 8 sites read.
- Read A: `features/additional-details/{controller,obligations}.js`, `features/commodities/{consignment-details.controller,animal-identification.controller,obligations}.js`, `features/check-answers/controller.js`, `features/origin/{template.njk,obligations.js}`, `features/import-purpose/obligations.js`.
- `grep -rn "conditional"` over **all** of B — zero code hits, prose only.
- `grep -rn "inScope|buildFieldDescriptors|fieldsForPage|applyTo|=== '"` over B's `features/{commodity-lines,units,hub}/controller.js` and `lib/{page,line-page,unit-page}-controller.js` — surfaced the two hand-rolled sites.
- Read B: `lib/build-field-descriptors.js`, `contract.js:190-260`, `flow/flow.js:95-195`, `obligations/helpers.js`, `features/{check-your-answers,commodity-lines,units}/controller.js`, `shared/partials/fields.njk`.
- `wc -l` on `flow/flow.js` (667), `lib/field-widgets.js` (343), `lib/page-controller.js` (111).
