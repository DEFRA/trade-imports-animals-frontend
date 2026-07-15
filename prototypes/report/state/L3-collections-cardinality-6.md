# L3 — Adversarial verification — C6 (collections-cardinality)

**Claim under test:** B has a declarative page-fan (`presentsForEach`, 25 LOC, 12 of 35 pages)
and A has **no fan primitive at all** (1,278 LOC across 4 bespoke loop controllers, 2.2:1
against ~576 LOC of collection-aware engine). Biggest maintainability delta in the dimension;
unbuilt-and-expensive for A, not impossible; NOT asymmetric capability.

**Verdict: AMENDED.** The disposition (not asymmetric) survives. The central factual
assertion — "A has no fan primitive at all" — does **not**. And the 25-vs-1,278 headline is
not like-for-like: B's fan machinery is ~450 LOC, and B's shipped UI does not actually render
a page fanned over instances at all.

---

## 1. What I verified as TRUE

| Cited | Check | Result |
|---|---|---|
| B `engine/index.js:248-272` `expandPresents` | Read | **True.** 25 LOC (248–272 inclusive). Expands `presents` + `presentsForEach` into one virtual entry per record from `state.obligations[groupId].records`. |
| B `flow/flow.js:438-445` a `presentsForEach` declaration | Read | **True.** `commodity-details` page, `presentsForEach: { obligation: commodityCode, forEachOf: commodityLine, mandatoryToProceed, errors }` at 439–444. |
| B "12 of 35 pages, 5 line-scoped / 7 unit-scoped" | `grep -n "presentsForEach\|page: '"` on flow.js | **True.** 35 `page:` declarations. 12 carry `presentsForEach`: lines 439/448/457/466/477 (`forEachOf: commodityLine` — commodity-details, commodity-type, species-details, number-of-animals, number-of-packages) and 499/517/524/531/538/551/558 (`forEachOf: unitRecord` — permanent-address, passport, tattoo, ear-tag, horse-name, identification-details, description). |
| B NA collapse from the ordinary classifier `engine/index.js:386-388` | Read | **True.** `classifyEntries` returns `NOT_APPLICABLE` when `inScope.length === 0 && groupErrorCount === 0`; a `presentsForEach` page with zero records expands to zero entries and falls out NA with no special case. |
| A's 4 controllers = 1,278 LOC | `wc -l` | **True, exactly.** documents 358 + search 147 + consignment-details 207 + animal-identification 566 = 1,278. |
| A `docs/decisions.md:93`, `docs/add-a-collection.md:130-134` | Read | **True and honoured by the code.** add-a-collection.md:131-133 verbatim: *"A collection needs a bespoke loop controller, deliberately hand-written — a repeating collection has no uniform-widget projection, so each loop owns its own rows and copy."* decisions.md:91-99: *"Shared code **returns facts and never renders**. A helper may be called by a controller; it may never own what renders."* This is **not** a doc the code fails to honour — the code does exactly this. |
| B's add/delete still bespoke, 535 LOC | `wc -l` | **True.** features/commodity-lines/controller.js 227 + features/units/controller.js 308 = 535. |

---

## 2. Counter-example hunt #1 — A **does** have a fan primitive

Searched A's whole tree (`grep -rn "collectionView"`, then read).

`engine/evaluate/collection-view.js` (17 LOC, whole file):

```js
export const collectionView = (answers, collectionPath) => {
  const templatePath = collectionPath.filter((s) => typeof s === 'string').join('.')
  const obligation = registry.byPath(templatePath)
  const entries = valueAt(answers, collectionPath) ?? []
  return entries.map((entry, index) => ({
    index, path: [...collectionPath, index], entry,
    complete: obligation ? entryComplete(obligation, entry) : true
  }))
}
```

- Exported from the engine barrel: `engine/index.js:13`.
- **`docs/engine.md:65` names it, in the barrel's public-surface table, literally: `| Loop primitive | collectionView |`.**
- 6 live call-sites across 5 features: check-answers/controller.js:215,217,402 (incl. a **depth-2** nested call
  `['commodityLines', index, 'animalIdentifiers']`), animal-identification.controller.js:386,417,
  consignment-details.controller.js:118, documents/controller.js:111,303, hub/controller.js:182.
- It is depth-generic (path-parameterised) and returns per-entry `{ index, path, entry, complete }`.

So "**no fan primitive at all**" is false as written. A has a *facts-level* loop primitive that is
engine-owned, depth-generic and per-entry-completeness-aware. What A lacks is a **render/route
fan** — and it lacks it by decree, not by omission (see §5).

## 3. Counter-example hunt #2 — B's shipped UI never renders a fanned page

This is the finding that most damages the headline. Read B's `routes.js`, `contract.js`,
`lib/line-page-controller.js`, `lib/unit-page-controller.js`.

`routes.js:144-146` (comment, in the shipped code):

> *"The flow-major **'all instances on one page' URL is no longer registered** for either level."*

`lib/line-page-controller.js:6-7`: *"Renders **ONE input per page** (the line's field)."*
Same in `unit-page-controller.js:7`.

`contract.js:209-212` — the expansion is filtered straight back down to one instance:

```js
if (options.lineId == null) return all
// Line-scoped rendering: filter presentsForEach-expanded descriptors
// to just the target line so /lines/{id}/... only shows one field.
return all.filter((d) => d.path === options.lineId)
```

So in B today `expandPresents`' multi-instance output is load-bearing for **status**
(`pageStatus` / `containerStatus` / NA collapse, engine/index.js:442-474) and for **route
generation** — not for rendering. The fan-to-N-fields-on-one-page capability exists in the
engine and is deliberately unrouted.

Meanwhile **A ships exactly that layout, hand-rolled**: `features/commodities/consignment-details.controller.js`
renders every commodity line's `numberOfAnimals` + `numberOfPackages` on one page, grouped by
commodity (`buildGroups`, :44-74), with **per-line conditional field inclusion**
(`packagesApply(entry.commoditySelection)` at :30-37 — the packages field appears only for
whitelisted codes), and per-line validators composed at :23-39. That is the semantic
`presentsForEach` + `entryInScope` gives declaratively — and it is the one place the fan is
actually *visible*. On the shipped surfaces, "B fans, A doesn't" inverts.

## 4. Counter-example hunt #3 — the 25 LOC is not what drives the 12 pages

The machinery that actually turns 12 flow declarations into 12 working per-instance pages:

| B file / span | LOC | Role |
|---|---|---|
| `engine/index.js:248-272` `expandPresents` | 25 | the cited expansion |
| `routes.js:150-205` | ~56 | **the real route fan** — walks `pages()`, registers `/lines/{lineId}/{page}` or `/lines/{lineId}/units/{unitId}/{page}` |
| `lib/line-page-controller.js` | 141 | generic line-scoped GET/POST factory |
| `lib/unit-page-controller.js` | 179 | **near-copy** of the above for depth 2 |
| `contract.js:209-212` | 4 | filter the fan back to one instance |
| `engine/index.js:149-201` | 53 | `firstUnfulfilledPageForLine` + `firstUnfulfilledPageForUnit` — two near-copies |
| `contract.js:135-161` | 27 | `nextAfterForLine` + `nextAfterForUnit` — two near-copies |
| **total** | **~485** | |

And `routes.js:154` identity-branches `page.presentsForEach.forEachOf === unitRecord` — the
route fan is **hard-coded to depth 2**. A depth-3 collection costs a third near-copy controller
factory, a third `firstUnfulfilledPageFor*`, a third `nextAfterFor*` and a third route branch,
even though `expandPresents` itself is depth-generic.

The 2.2:1 ratio is also not like-for-like. Measured (`wc -l`), A's collection-aware engine is
**507** LOC not ~576 (path 63 + registry 81 + write 95 + reconcile 48 + complete 93 +
cardinality 31 + collection-view 17 + status 79) → the ratio is 2.5:1, but the denominator is
A's engine while the comparator offered is B's 25-LOC function. **Hand-written collection UI,
compared honestly: A 1,278 vs B 855** (535 bespoke add/delete + 320 generic controller
factories) ≈ **1.5:1**.

## 5. Does the claim conflate "not built" with "cannot be built"?

No — and this is the part the claim gets right, though for a weaker reason than it thinks.

- Nothing in A's **model** forbids a render fan. `collectionView` already yields
  `{ index, path, entry, complete }`; `flow/dispatch.js:69-74` already answers
  `pageOfObligation` / `collectsOf`; `registry.walk` already materialises per-instance scope.
  A generic loop renderer would sit on top of all of it. The claim's disposition —
  **not asymmetric capability** — stands.
- But the barrier is not merely "nobody wired it up". It is an **explicit, load-bearing
  architectural decision that the code honours**: decisions.md §1 rejects "a config engine that
  calls the pages back — the exact design v2 exists to avoid", and §2 forbids any shared helper
  from owning what renders. So the retrofit is a **design reversal**, not a missing feature —
  materially more expensive than "unbuilt", and it is the one A-side cost the claim
  under-prices.

## 6. Does the claim credit a doc the code doesn't honour?

Checked both cited docs. **No** — unusually for this comparison, both A docs are accurate.
`add-a-collection.md:130-134` and `decisions.md:81-99` describe exactly what the four
controllers do. (The doc that *is* out of step is on B's side — `routes.js:145-146` records
that the flow-major fanned page was withdrawn, which the "declarative page-fan" framing does
not reflect.)

---

## 7. What survives — the true core

The **marginal** cost, not the absolute LOC, is the real and large delta, and it is in B's
favour:

- **B:** a new per-line or per-unit form page = **one `presentsForEach` block in flow.js and
  zero controller LOC**. `routes.js` auto-registers the URL, the generic controller renders and
  validates it, `nextAfterFor*` walks to it, and the page collapses to NA for free when the
  group has no records. 12 pages ride this for 0 marginal LOC each.
- **A:** a new per-collection page = **a bespoke controller + template, by decree**. 4
  collections → 4 controllers → 1,278 LOC, and the count grows linearly with pages.

That is the shopping-list item, and it is worth having. It is just not "25 LOC vs 1,278", and
it is not "A has no loop primitive".
