# L3 — flow-navigation — CLAIM FN-4 — adversarial verification

**Claim under test:** "B derives routes, hub rows, CYA change links and the i18n coverage test from ONE container tree; A maintains FOUR hand-authored orderings that nothing asserts agree, plus routes hand-declared in 24 feature controllers. This is the quantified maintenance cost of A's page-as-spine — but it is maintainability, not expressiveness."

**Verdict: AMENDED.** The direction survives. Three of its four limbs do not, and its closing sentence is refuted.

A = `clone-live-animals` `prototypes/standalone/live-animals/`
B = `clone-flow-layer` `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

---

## 1. What the cited lines actually say (all re-read at source)

| Cited | Real? | Note |
|---|---|---|
| B `flow/flow.js` 667 LOC, 6 sections / 16 subsections / 31 pages | YES | `wc -l` = 667; 6 section `titleKey`s + 16 subsection `titleKey`s (:94–:604) |
| B `routes.js:150-205` generates routes from `pages()` | YES | `for (const page of pages())` → GET+POST per page; `contract.pages()` walks the tree |
| A `flow/flow.js:27-75` — 10 sections / 20 pages | YES | verbatim |
| A `flow/run.js:23-41` — RUN_STEPS, 8 | YES | verbatim |
| A `flow/task-rows.js:24-51` — 11 rows | YES | verbatim |
| A hub `GROUPS` in `features/hub/controller.js` | YES | :21–118, 6 groups / 12 rows |
| A `docs/add-a-page.md` — 10 steps | YES | §1–§10 |
| A routes in 24 feature controllers | Count YES, characterisation NO | see §3 |

So the skeleton is real. The claims built on it are not.

---

## 2. Limb 1 — "CYA change links" is NOT a B-only derivation. A does the same thing, better guarded.

B: `contract.js:164-166` — `changeLinkFor(id) = firstPagePresentingObligation(flow, id)`.

A: `features/check-answers/controller.js:30-31` —
```js
const changeHref = (obligationId) =>
  withChange(pagePath(slugOfPage(pageOfObligation(obligationId))))
```
`pageOfObligation` reads the boot-built dispatch index (`flow/dispatch.js:69-70`). The target page of a Change link is **never written down in A either**.

And A's index carries a totality guarantee B has none of: `flow/dispatch.js:44-52` throws if two pages collect one obligation ("Obligation X is collected by two pages"), and :55-63 throws if any non-system obligation at any depth is collected by no page. A missing or ambiguous Change target is a **startup crash**. B's `firstPagePresentingObligation` has no equivalent — `obligations/coverage.test.js` checks obligation→**domain** wiring, not obligation→page — so a B obligation presented by no page silently yields `changeLinkFor → null` and CYA drops the Change action (`cya/controller.js:117` `if (!changePage) return null`).

Listing CYA change links as one of the things B's single tree buys, implying A hand-maintains them, is **false**, and on this one item the asymmetry runs the other way.

## 3. Limb 2 — "routes hand-declared in 24 feature controllers" is misleading

24 files export `routes` — true. But **15 of the 24 are a single line**:
```js
export const routes = kit.pageRoutes(page, { get, post })
```
and `shared/kit.js:74-77` derives both paths from the page's own identity:
```js
export const pageRoutes = (page, { get, post }) => [
  { method: 'GET',  path: pagePath(page.slug), options: open, handler: get },
  { method: 'POST', path: pagePath(page.slug), options: open, handler: post }
]
```
That is the same derivation B's generator performs (`routes.js:190-204`), just co-located with the controller instead of centralised. `docs/add-a-page.md:20` says routing is free, and the code honours it (this is not a doc-vs-code lie).

The other 9 hand-author paths — and they are **precisely the class of route B also hand-declares**. B's `routes.js:59-132` hand-writes **10** routes: `/start`, `/task-list`, `/check-your-answers`, `/reset`, `/lines`, `/lines/add`, `/lines/{id}/delete`, `/lines/{lineId}/units`, `/lines/{lineId}/units/add`, `/lines/{lineId}/units/{unitId}/delete`.

A's genuine non-derived overhead is **one aggregation list**: `features/index.js:48-73` (`allRoutes`), plus `dispatchPages` at :27-46. Not "24 hand-declared route tables". Forgetting `allRoutes` gives a 404 (caught only by E2E); forgetting `dispatchPages` **boot-crashes** (dispatch.js:61-63).

## 4. Limb 3 — the i18n coverage test is NOT derived from one tree

`i18n-coverage.test.js` pulls from **six** sources: `flow.js` (walked — real, :78-87, :126-140), `presentation.js`, `domain/index.js`, address sub-fields, `FORMAT_ERROR_KEYS`, `CHROME_KEYS` — **plus three hand-maintained key arrays**: `HUB_KEYS` (:37-51), `CYA_KEYS` (:53-60), `COMMODITY_LINES_KEYS` (:62-76), under this comment (:31-36):

> "Static lists of keys used by the hub / CYA / commodity-lines controllers + their templates. **Keep in sync with the `t()` calls in those files.**"

Nothing asserts those three lists match the actual `t()` call sites. That is *the same defect class* the claim charges A with, inside the very artefact cited as B's proof of single-source derivation. Citing the i18n coverage test as "derived from ONE container tree" credits the file's docstring over its body.

## 5. Limb 4 — "FOUR orderings that nothing asserts agree" is false twice over

### (a) Two of the four pairings ARE asserted.

- **flow.js sections ↔ taskRows.** `flow/task-rows.test.js:236-296` — "submit-readiness equivalence — the row roll-up admits exactly the journeys the section roll-up did". It asserts `readyForCheckYourAnswers(answers, inScope)` (rolls up over **taskRows**, `flow/section-status.js:11-15`) `=== sectionRollUp(answers, inScope)` (rolls up over **answerSections** from flow.js, :238-241) across **14 fixtures**, 8 of which are "happy path minus one obligation" negatives. A task row that dropped an obligation the flow sections cover fails this test. Plus :209-222 runs `rowGatePasses` over **every** row against the flow-derived gate.
- **taskRows ↔ hub GROUPS.** `t2-hub-copy.test.js` drives the real hub handler; :69-85 pins the exact rendered row titles per group. A `GROUPS` id not in `taskRows` makes `taskRowById` return `undefined` and `rowStatus` throw (`hub/controller.js:154-155`).
- **registry ↔ dispatchPages** is a boot crash (`flow/dispatch.js:44-63`).

Only **RUN_STEPS** is genuinely unguarded against membership drift — and see (b).

### (b) The orderings are not four copies of one truth. They deliberately disagree, and that is the point.

- `flow/flow.js:27-75` order: … `animalIdentification` (§4) **before** `importReason`/`importPurpose`/`additionalDetails` (§5); `documents` (§6) **before** `addresses` (§7) and `transport` (§8).
- `flow/run.js:23-41` RUN_STEPS order: filter → origin → commodities → consignment-details → **importReason → importPurpose → animalIdentification** → additionalDetails. The reading order of the opening run is deliberately *not* the section order.
- `features/hub/controller.js:21-118` GROUPS order: group 3 = Movement (arrival, transit, transporter), group 4 = Addresses, **group 5 = Documents**. The task-list presentation order is deliberately *not* the navigation order.

In B, **section = hub group, subsection = hub row, tree order = row order, by construction** (`features/hub/controller.js:96-119` maps `sections()` → `section.children` straight to groups → items). There is no `hubGroup`/`hubOrder`/reading-order key anywhere in the 667-line flow declaration. So B cannot today present a task list grouped or ordered differently from its navigation walk, and has no notion of a linear reading order distinct from the tree at all. That is **not "not built"** in the cheap sense — it is a conflation baked into the one artefact the claim praises; adding a divergent hub order means adding a second ordering to B, i.e. becoming A on this axis.

Therefore the claim's closing sentence — "*it is maintainability, not expressiveness*" — **does not survive**. Some of A's redundancy is redundancy; some of it is the price of decoupling presentation order from navigation order, which A exercises in two places and B cannot express.

## 6. B's "ONE tree" already leaks hand-written escapes

Counter-examples inside B, all in the artefacts the claim cites:

- `features/hub/controller.js:60-69` — `linesManageStatus`, a **bespoke hand-written status function**, because the generic container roll-up returned NA for the read-only intro page in that subsection.
- `features/hub/controller.js:80-86` — a hard-coded three-way `subsection.id` switch (`commodity-lines-manage` / `commodity-lines-details` / `per-unit-records`) overriding the derived href.
- `routes.js:189` — `if (!hasPresents) continue`: a page that exists in the tree and gets **no route**. The tree is not a complete route source; it is a route source for pages that collect something.
- `routes.js:154` — `page.presentsForEach.forEachOf === unitRecord`: the route generator branches on **object identity**, so depth is hard-coded in the router.
- `features/check-your-answers/controller.js:207` — CYA rows iterate `Object.entries(state.obligations)`, i.e. **obligation-registry order, not tree order**. B's CYA reading order is a second de-facto ordering that the tree does not control. (A's CYA rows are hand-authored per row — worse — but B's are not tree-derived either, so this is not the clean asymmetry claimed.)

## 7. What is left standing

- B's flow tree really is the single source for **page routes** and **hub row membership/status roll-up**, and A has no route generator.
- A's `docs/add-a-page.md` really is 10 steps; B has **no add-a-page doc at all** (`grep -i "add a page|adding a page|new page" obligations.md` → 0 hits), so the "10 vs N" comparison has no B-side denominator and should not be quoted as if it did.
- A's real duplication surface, honestly counted, is: **flow.js sections + RUN_STEPS + taskRows + hub GROUPS + CYA row list + dispatchPages + allRoutes**, of which three pairings are guarded (roll-up equivalence test, hub render test, boot dispatch assert) and two orderings (RUN_STEPS, GROUPS) are *intentionally* divergent. That is more lists than the claim says, but less unguarded drift, and part of it is load-bearing.

## 8. What I searched

- `wc -l` on both flow.js / routes.js / contract.js.
- Read in full: B `routes.js`, B `features/hub/controller.js`, B `features/check-your-answers/controller.js`, B `i18n-coverage.test.js`, B `contract.js:90-166`, B `flow/flow.js:20-95`.
- Read in full: A `flow/flow.js`, `flow/run.js`, `flow/task-rows.js`, `flow/section-status.js`, `flow/prerequisites.js`, `flow/dispatch.js`, `shared/kit.js`, `features/hub/controller.js`, `features/index.js`, `t2-hub-copy.test.js`, `flow/task-rows.test.js` (head, :195-234, :236-320).
- `grep -rn "export const routes"` across A's features (24 hits, 15 of them `kit.pageRoutes`).
- `grep -rn "taskRows|RUN_STEPS|GROUPS|allFlowPages|sections"` across A's `flow/` + `analysis/` + tests — to hunt for a cross-ordering assertion. Found one (`task-rows.test.js:236-296`), which the claim missed.
- `grep -rni "add a page|adding a page|new page"` in B's `obligations.md` — 0 hits.
