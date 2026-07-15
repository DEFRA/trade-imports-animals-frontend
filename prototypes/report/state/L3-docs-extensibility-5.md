# L3 — docs-extensibility, claim DE-5 (adversarial verification)

**CLAIM:** A enforces "declared obligation is wired to a page" BY CONSTRUCTION (server refuses
to boot); B has no equivalent at the flow layer — an obligation can be declared, domain-wired,
pass all tests, and be presented on no page (invisible + green). B's own docs claim otherwise.
Not structural — a ~15-line test.

**VERDICT: AMENDED.** The *hole in B is real* (and its consequences are worse than stated), but
the claim's three supporting assertions each fail on contact with the source:
1. A's guard is **not** "by construction" for the routine add-a-field path — it is vacuous there.
2. B **does** have a manifest→flow presentation-coverage test — for one of its three slices.
3. B's docs **do not** claim otherwise; they name the invisible-field outcome explicitly.

---

## 1. What the cited lines actually say (all verified)

### A — `flow/dispatch.js`
`:55-63` is real and quoted correctly:
```js
const uncovered = [...walkObligations()]
  .filter(({ templatePath, obligation }) =>
    !obligation.system && !ownerOfObligation(templatePath))
  .map(({ templatePath }) => templatePath)
if (uncovered.length) {
  throw new Error(`Obligations collected by no page: ${uncovered.join(', ')}`)
}
```
`:45-50` double-collection throw is real. `buildDispatch` is called at boot (`routes.js:21`) and
in the `beforeAll` of ~25 spec files, so a throw does redden the suite. **That much is CONFIRMED.**

### B — `obligations/coverage.test.js`
`:81-86` checks only `domain.has(o.id) || KNOWN_UNWIRED.has(o.name)`. No mention of `presents`
or `pages()` anywhere in the file. **CONFIRMED.**

---

## 2. COUNTER-EXAMPLE 1 (kills "by construction"): A's coverage assertion is
## tautological for the dominant add-a-field path

`shared/kit.js:27-30`:
```js
export const collectsFrom = (obligations) =>
  obligations.filter((o) => !o.system).map((o) => o.id)
```
Eleven feature controllers declare `export const meta = { ...page, collects: kit.collectsFrom(obligations) }`
(`features/{origin,contact,cph-number,declaration,documents,addresses,import-reason,import-purpose,
import-type-filter,additional-details,commodities/search}/controller.js`).

`registry.js:15-28` builds the manifest by spreading **the same arrays**
(`...origin.obligations, ...commodities.obligations, …`).

So for a single-page feature, "obligation is in the manifest" and "obligation is in some page's
`collects`" are **the same fact, read from the same array**. Adding a field to
`features/origin/obligations.js` cannot make `uncovered` non-empty. A's own doc says so —
`docs/add-a-field.md:42-45`:

> You do not edit the page's `collects` either: the controller declares
> `collects: kit.collectsFrom(obligations)`, which derives the list from the same array.

**And nested obligations are worse.** `dispatch.js:15-24` `ownerOfObligation` resolves coverage by
walking **ancestor** template paths. The commodities search page declares `collects: ['commodityLines']`
(pinned at `contract.test.js:184`). Every leaf inside that collection has templatePath
`commodityLines.<leaf>` → ancestor match → **auto-covered**. A new field inside `commodityLines`
is coverage-green at boot no matter what any page renders.

The boot assertion therefore only fires for (a) split-feature pages that hand-list ids
(`features/transport/*` — `collects: [transporterType.id]`), or (b) a page/feature never added to
`dispatchPages`. It is a **wiring check on the page manifest**, not the claimed
"declared obligation is presented to a user" guarantee.

What actually catches add-and-forget in A is `contract.test.js:173-181` —
`expect(new Set(committedIds(result))).toEqual(new Set(committableCollects(collects)))`, which
goes red if the obligation is declared but the controller's POST value-map does not commit it.
That is **a test, not a boot crash**, and it is the same class of guard as B's `coverage.test.js`.
A's advantage over B here is one of *coverage breadth*, not of *kind*.

Note also A's guard carries its own exemption list (`!obligation.system`) — structurally identical
to B's `KNOWN_UNWIRED`.

Residual hole in A, symmetric to B's: an obligation added to the feature array + the controller
value-map + the contract-test payload, but with **no njk macro and no CYA row** (both hand-written
in A) is committable, invisible in the UI, and green. A guards the *collects* layer; B guards the
*domain* layer; **neither guards the render layer.**

## 3. COUNTER-EXAMPLE 2 (kills "no equivalent at the flow layer"): B has one, for the line slice

`features/commodity-lines/controller.test.js:66-80`:
```js
it('every depth-1 leaf in the manifest is presented on a per-line page', () => {
  const depth1Leaves = v4Obligations.filter(
    (o) => o.within === commodityLine && o.status !== undefined)
  const presentedNames = new Set(LINE_PAGES.map((p) => p.obligation.name))
  for (const leaf of depth1Leaves) {
    expect(presentedNames.has(leaf.name),
      `${leaf.name} is a depth-1 leaf but has no per-line page`).toBe(true)
  }
})
```
and `LINE_PAGES = deriveLinePages(flow)` (`features/commodity-lines/controller.js:43`) — derived
from the **flow**, not hand-listed (the comment at `:34-42` records that it *used* to be
hand-listed and iteration 6 forgot `commodityType`, which is why it was made derived).

So: declare a `within: commodityLine` leaf, wire the domain, forget the flow page → **RED**.
This is precisely the presentation-coverage check the claim says B does not have. It exists; it is
just not generalised. B's hole is scoped to **top-level singletons (~30 obligations) and depth-2
`within: unitRecord` leaves** — there is no `features/units/controller.test.js` at all
(`ls features/units` → `controller.js`, `list.njk` only), and nothing checks singletons.

## 4. Where the claim is RIGHT — and understated

For the singleton/unit slice the failure mode is confirmed, and nastier than the claim says:

- **Status cannot see it.** `engine/index.js:480-494` `collectInScopePresentedEntries` walks
  *pages* and calls `expandPresents(node, state)`; `journeyState` (`:583-598`) classifies only
  those entries. An obligation presented on no page contributes zero entries → cannot hold the
  journey out of `fulfilled` → cannot block submit. (`contract.js:91-93` just delegates.)
- **CYA actively swallows it.** `features/check-your-answers/controller.js:270-277`:
  ```js
  const href = hrefForChange(oblId, null, null)   // → changeLinkFor → firstPagePresentingObligation
  if (isBlankValue(stored)) {
    if (mandatory && href) pushPrompt(...)        // ← no page ⇒ href null ⇒ NO prompt, NO row
    continue
  }
  ```
  The `&& href` guard means an unfulfilled, unpresented, **mandatory** obligation produces neither
  a row nor a "you still need to…" prompt. Invisible, and the journey still reads complete.
- **No soft catch elsewhere.** `lib/presentation.js:419-427` `forObligation` falls back to
  `humaniseId` rather than throwing, so a missing copy entry does not surface it either.
  `i18n-coverage.test.js` walks flow→keys (the wrong direction). No other test iterates the
  manifest against the flow (`grep --include="*.test.js"` for `v4Obligations|of obligations`
  returns only coverage.test.js, whitelists.test.js, sketches.test.js and the line test above).

## 5. Where the claim is WRONG about B's docs

`docs/add-an-obligation.md:3-6` reads:

> Adding a new V4 field … is a fixed sequence of ~6 file edits. This doc is the checklist.
> **Skip a step and either tests fail *or the field never appears in the UI*** — both loud enough
> to catch the omission.

The doc does **not** claim a test gate. It explicitly names the invisible-field outcome as one of
the two possible results. It is not contradicted by the finding — it *predicts* it. The only
overreach is the editorial "both loud enough to catch the omission" (an unpresented *optional*
singleton is not loud at all). "B's own docs claim otherwise" is a misreading of the sentence.

Separately `:25-32` tells the author step 4 (flow) "can be a no-op … if the obligation is already
presented on an existing page … do the check, don't invent work" — i.e. the doc relies on a
**human check**, which is exactly the thing a test should be doing. That is the fair criticism.

## 6. Remediation (claim's last sentence — stands, and applies to BOTH sides)

"Not structural, ~15 lines" is right for B: walk `pages()` → collect `presents[].obligation.id` +
`presentsForEach.obligation.id`, diff against the manifest, minus a `PRESENTATION_EXEMPT` list
(the two `system` obligations + structural groups). The line-slice test at
`commodity-lines/controller.test.js:66-80` is the template — generalise it.

But A needs the same fix and the claim does not say so: A's boot assertion must compare against
what a page **renders**, not against a `collects` list derived from the declaration it is checking,
and must not treat an ancestor's `collects` as covering its children. The shopping-list item is
therefore **"one manifest→presentation coverage assertion, which neither side actually has"**, not
"steal A's boot crash".

---

## Searches run

- Read `flow/dispatch.js` (whole), `registry.js` (whole), `shared/kit.js:1-45`, `contract.test.js:43-250`
- `grep -rn "buildDispatch"` A tree → boot at `routes.js:21` + ~25 spec `beforeAll` (guard is live)
- `grep -rn "collects"` A `flow/` + `grep -rn -A6 "collects:"` A `features/commodities/` → `kit.collectsFrom`
- `grep -rn "collectsFrom"` A tree → 11 controllers + `docs/add-a-field.md:44`
- Read B `obligations/coverage.test.js` (whole), `contract.js` (whole), `engine/index.js:200-300, 470-602`
- Read B `features/check-your-answers/controller.js` (whole), `lib/presentation.js` (whole),
  `i18n-coverage.test.js` (whole), `docs/add-an-obligation.md:1-80`
- `grep -rln "presents\|presentation"` B tree; `grep -rn --include="*.test.js" "of obligations|obligations.filter|v4Obligations"` B tree
  → found `features/commodity-lines/controller.test.js:66-80` (the counter-example)
- `ls features/units` → no controller.test.js (confirms the depth-2 gap)
