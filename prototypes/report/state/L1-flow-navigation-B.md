# L1 — Flow, navigation, change-context, save-and-return — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer` (HEAD d59b432)
Root: `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
All paths below are relative to that root unless stated.

---

## Headline

Side B's flow layer is **a hand-authored container tree (Section → SubSection → Page) with
NO visibility rules of its own, plus a set of pure "where next" primitives that answer
`firstUnfulfilledPage` against live obligation scope.** It is genuinely declarative for
*page existence, page order and page skipping*. It is genuinely **absent** for
change-context (return-to-CYA), and **stubbed** for back-links.

The single most important structural fact: **there is no next-page graph and no per-page
`next()`.** Next = "re-ask the model where the first unfulfilled page is, in declared
depth-first order, inside the current subsection, then the current section, else the task
list" (`contract.js:115-127`). Gating an answer that opens or closes downstream pages
therefore needs **zero extra machinery** — the re-walk picks the change up on the next
redirect. That is the strongest idea in this dimension on either side.

The second most important fact: **the docs describe navigation features the code does not
have.** `obligations.md:2331-2357` describes a `?change=1` CYA round-trip and a contextual
back-link as though they exist. Neither is implemented — `change=1` appears **only** in
`obligations.md` and its EUDPA-277 ancestor, in zero `.js`/`.njk` files, and `backLinkFor`
is a constant in all three page controllers.

---

## 1. How is the next page decided?

**MODELLED DECLARATIVELY (the walk), with an imperative 3-way fan-out at the browser layer.**

There is no graph, no linear array, no page-owned `next()`. Three primitives + three
contract wrappers:

| Level | Engine primitive | Contract wrapper | Fallback |
|---|---|---|---|
| notification | `firstUnfulfilledPage(root, state)` `engine/index.js:128-139` | `nextAfter(page, state)` `contract.js:115-127` | task list |
| per commodity line | `firstUnfulfilledPageForLine` `engine/index.js:149-167` | `nextAfterForLine` `contract.js:135-144` | `/lines` |
| per unit record | `firstUnfulfilledPageForUnit` `engine/index.js:182-201` | `nextAfterForUnit` `contract.js:152-161` | `/lines/{id}/units` |

`nextAfter` in full (`contract.js:115-127`):

```js
export function nextAfter(page, state) {
  const subsection = subsectionOfPage(page.page)
  if (subsection) {
    const inSub = firstUnfulfilledPage(subsection, state)
    if (inSub && inSub.page !== page.page) return { kind: 'page', page: inSub }
  }
  const section = subsection ? sectionOfSubsection(subsection.id) : null
  if (section) {
    const inSec = firstUnfulfilledPage(section, state)
    if (inSec && inSec.page !== page.page) return { kind: 'page', page: inSec }
  }
  return { kind: 'task-list' }
}
```

`firstUnfulfilledPage` is a depth-first walk that skips any page whose `pageStatus` is
`not-applicable`, `optional` or `fulfilled` (`engine/index.js:130-133`). Page status is
derived entirely from the obligations the page `presents` and their live `inScope` /
`status` implications (`engine/index.js:442-447` → `classifyEntries` :386-410). **So page
skipping is a pure consequence of obligation scope. The flow declares no `when` / `if` /
`showIf` anywhere** — grep of `flow/flow.js` finds no conditional key; the only per-entry
flags are `mandatoryToProceed` and `errors.required`.

The POST cycle is: validate → `writeAnswer` → **re-read and re-evaluate state** →
`nextAfter(page, stateAfter)` (`lib/page-controller.js:90-93`):

```js
writeAnswer(request, result.values)
const stateAfter = readState(request)
const target = nextAfter(page, stateAfter)
return h.redirect(urlForNext(target))
```

That re-read is what makes re-gating free: if the answer just saved brought a downstream
page into scope, the walk finds it; if it pushed one out of scope, the walk skips it.

**Cost of the design:** "next" is not stable/authored — it is whatever is unfulfilled.
A page that is *fulfilled* is never navigated *to* by the forward walk, only reached by a
direct URL or a Change link. There is no notion of "next page in reading order" at all, so
you cannot express "always show the summary page after X even though X is complete".

**Imperative residue:** the three parallel primitives + three parallel contract wrappers +
three parallel controller factories (`lib/page-controller.js` 111 LOC, `lib/line-page-controller.js`
141 LOC, `lib/unit-page-controller.js` 179 LOC) exist purely because depth is hard-coded in
the browser layer. `routes.js:154` branches by object identity:

```js
if (page.presentsForEach.forEachOf === unitRecord) {
```

A depth-3 group costs a 4th primitive, a 4th wrapper, a 4th factory and another identity
branch. The *model* is depth-generic (composite `/`-delimited keys); the *navigation* is not.

---

## 2. Route generation — DERIVED

`routes.js:150-205` walks `contract.pages()` at plugin-register time and emits one GET +
one POST per page, choosing the URL shape from `presentsForEach.forEachOf`. Adding a page to
`flow/flow.js` gives you a working route with no route edit. 31 pages → 20 static
(`/pages/{name}`), 10 fan-out (`/lines/...`, `/lines/.../units/...`), 1 read-only intro
skipped (`routes.js:189` `if (!hasPresents) continue`), plus **10 hand-declared meta/CRUD
routes** (start, task-list, CYA, reset, lines index/add/delete, units index/add/delete).

---

## 3. Change-context (return-to-CYA after editing one answer) — **ABSENT**

This is the clearest gap in the dimension.

- CYA emits Change links via `changeLinkFor(oblId)` → `firstPagePresentingObligation`
  (`contract.js:164-166`, `engine/index.js:208-229`), producing a plain URL:
  `${BASE}/pages/${changePage.page}` or the line/unit variant
  (`features/check-your-answers/controller.js:115-129`). **No query string, no flag, no
  session breadcrumb.**
- Grep for `returnTo|changeContext|query.` across the whole spike root: **zero hits.**
  Grep for `change=1` across `prototypes/`: hits **only** in `obligations.md` and the
  ancestor's `obligations.md` — **no code, no template.**
- Therefore: click Change on CYA → land on the page → save → you are handed to
  `nextAfter`, which drops you into the **linear run of that subsection**, and eventually
  the **task list** — never back to CYA. To re-check answers the user must click
  "Check your answers" from the hub again.

The doc claims otherwise, in the present tense (`obligations.md:2338-2345`):

> "The Change flow uses the `?change=1` pattern from the existing prototype: User clicks
> Change → page is rendered in change mode. On submit, the runtime returns to CYA instead of
> advancing to the next Page in the SubSection. Runtime-level behaviour; the Flow doesn't
> declare it per page."

**DOC/CODE DISAGREEMENT — the code does not do this.** It is not listed in the doc's own
"Dropped or explicitly aspirational" register (`obligations.md:2967-2979`), which *does*
honestly flag `sectionEntryMode` and cross-flow tests. So this one reads as a capability
claim, not a plan.

**Silver lining, and it is a real one:** because change-context does not exist, B never had
to solve "what if the edit re-gates downstream pages" as a *special case*. The generic
`nextAfter` re-walk handles it: edit `region-code-requirement` from `no` → `yes` on CYA, and
the POST redirect lands you on `region-code` because the walk now sees it unfulfilled and
in scope. A `?change=1` implementation would have to *suppress* that walk and jump to CYA,
at which point B would face exactly the problem A's DESIGN-DELTA discusses. **Retrofit cost:
low-to-medium** — pass `?change=1` through `urlForNext` (the hook already exists:
`lib/page-controller.js:27-30` takes an `opts.query`, unused today) and branch in the three
controllers — **but the hard part is the ruling on re-gated downstream pages, which B has
not made.**

---

## 4. Back-link semantics — **HANDLED IMPERATIVELY, and barely**

Three hard-coded constants, one per controller family:

- `lib/page-controller.js:41-45` — always the task list, with a self-aware comment:
  ```js
  function backLinkFor(page) {
    // Best-effort: link back to the task list. Real breadcrumb / prev-page
    // navigation is a follow-on.
    return `${BASE}/task-list`
  }
  ```
- `lib/line-page-controller.js:44-46` — always `/lines`.
- `lib/unit-page-controller.js:49-51` — always `/lines/{lineId}/units`.

There is **no previous-page back link anywhere**: no `previousPage` primitive exists in
`engine/index.js` (15 primitives, none of them a reverse walk). Breadcrumbs exist but are
hand-written literal arrays in 3 controllers (`features/check-your-answers/controller.js:344-347`,
`features/commodity-lines/controller.js:199-202`, `features/units/controller.js:254-263`) —
not derived from the container tree.

Doc claim (`obligations.md:2347-2354`): "Back is **contextual**: If the user arrived at this
Page from the Task List or CYA, Back returns there. Otherwise … Back returns to the previous
Page in the SubSection." **Not implemented.** Second doc/code disagreement.

Retrofit cost: **low, structurally free.** A `previousPageInSubsection(page, state)` primitive
is a 10-line mirror of `firstUnfulfilledPage`; the tree is already ordered and walkable. The
"where did you come from" half needs the same referrer/`?change` plumbing as §3.

---

## 5. Save-and-return / resume — **PARTIAL (resume: yes; save-and-return: no)**

**Resume within a session: MODELLED, and clean.** `/start` (`features/start/controller.js`,
26 LOC) calls `startPage(state)` (`contract.js:101-111`) = first unfulfilled page across all
sections, falling back to first applicable page, falling back to the task list. The e2e walk
drives the entire 31-page journey by re-hitting `/start` before every POST
(`e2e-walk.test.js:119-136`) — i.e. resume is exercised ~25 times per happy-path test, which
is a good stress of the primitive.

**Persistence: session only.** `lib/state.js` (232 LOC) is the entire story — `request.yar`
get/set on one key (`SESSION_KEY = 'prototype:eudpa-249:fulfilments'`, :13). The host
frontend registers `@hapi/yar` server-side with a cookie session id and a TTL
(`src/server/common/helpers/session-cache/session-cache.js:10-27`). So "save and return"
works only for *the same browser, same cookie, before TTL*. There is **no draft record, no
user-scoped store, no backend, no notification id, no resume-by-reference, no submit**. CYA
has no submit button and no POST route — the template just prints a sentence when the journey
is fulfilled (`features/check-your-answers/template.njk:33-35`; `routes.js:59-86` declares
only GET start / GET task-list / GET CYA / POST reset). Journey status `submitted` exists in
the alphabet (`engine/index.js:280`, `journeyState(flow, state, submitted)` :583-584) but
**nothing ever passes `submitted = true`** — `contract.statusOfJourney` defaults it to false
and both call sites (`features/hub/controller.js:121`, `features/check-your-answers/controller.js:342`)
omit the arg. The F→S transition is modelled and unreachable.

**A real bug/divergence worth carrying into option C — the scope-exit purge is not durable.**
The evaluator purges out-of-scope obligations from storage and returns the amended map
(`obligations/evaluator.js:93-99, 123-126`). But `lib/state.js:50-51` writes back a copy of the
**raw** session map, never the amended one:

```js
export function writeAnswer(request, values) {
  const fulfilments = { ...readFulfilments(request) }   // ← RAW yar value, not the purged map
```

and `readFulfilments` is `request.yar?.get(SESSION_KEY)` (:26-28). `writeFulfilments` is called
from 5 places, all inside `state.js`, all with raw-derived maps. **Nothing ever persists the
purge.** Consequence: answer "reason = internal-market", fill `purpose-details`, switch reason
to "transit" (purpose goes out of scope, disappears from CYA/status), switch back → the old
purpose value **reappears**. The doc says the opposite (`obligations.md:1127-1130`: "that
fulfilment drops out of scope; its data is wiped … re-added after a previous remove → fresh
blank again (no rehydration)"). The purge is a **read-time projection**, not a wipe. Under a
real backend where the persisted document is what gets submitted, this is the difference
between "stale answer is invisible" and "stale answer is submitted". Cheap to fix
(`writeAnswer` should start from `readState(request).fulfilments`) but it is not fixed, and no
test covers it — grep for `purge|wipe|retain` in `routes.test.js` finds only unrelated
comments (:535, :851).

---

## 6. Linear run vs hub-and-spoke — **BOTH, hub-major**

- **Hub** (`features/hub/controller.js`, 141 LOC): 16 subsection rows, each with a status tag
  from `statusOfContainer` (re-derived over the subtree, `engine/index.js:469-474`) and a link
  from `firstUnfulfilledPage ?? firstApplicablePage` (:54-58). NA subsections render but are
  **not linked** (:113) — note the doc says NA subsections are "hidden by default"
  (`obligations.md:2277-2281`); the code greys them instead. Third, minor, doc/code drift.
- **Linear run inside a subsection**: the `nextAfter` chain above. It is a run *of unfulfilled
  pages*, not a run of all pages.
- **Spokes**: `/lines` and `/lines/{id}/units` are bespoke index pages with per-row Change
  links and add/delete (`features/commodity-lines/controller.js` 227 LOC,
  `features/units/controller.js` 308 LOC). Add-then-fill: POST `/lines/add` mints an id and
  redirects **straight into the new line's first per-line page** (:211-216); the unit variant
  picks a seed obligation from the commodity code's whitelist metadata and redirects into that
  obligation's page (:277-296).
- **Hard-coded hub exceptions**: three subsection ids are special-cased to route to `/lines`
  (`features/hub/controller.js:80-86`), and `commodity-lines-manage` gets a bespoke status
  function (`linesManageStatus` :60-69) because the generic classifier would call the
  read-only intro page NA. Two declarative leaks in an otherwise derived hub.

---

## 7. Is the flow DERIVED from obligations, or hand-authored alongside?

**Hand-authored alongside — deliberately, and this is the spike's central claim.**

`flow/flow.js` is a 667-LOC literal tree: 6 sections, 16 subsections, 31 pages, importing 44
obligations by name (:42-85) and placing them. Nothing generates it. What *is* derived from
it: routes (`routes.js:150`), the `/lines` summary rows (`features/commodity-lines/controller.js:43`
`deriveLinePages(flow)` — added after iteration 6 forgot to hand-add a row, per the comment
at :34-42), the units summary rows, and the i18n key coverage test.

The claim the flow makes is *negative*: it declares **no visibility rules**. Show/hide-page,
show/hide-question and show/hide-option all ride the one `applyTo` + `optionsFor` mechanism.
Verified: a page auto-becomes NA when every obligation it presents is out of scope
(`engine/index.js:442-447` + `classifyEntries` NA branch :387-389), and `firstUnfulfilledPage`
skips NA pages. `purpose-details` (`flow/flow.js:146-154`) has no condition on it at all — its
invisibility on the transit branch is entirely `purposeInInternalMarket.applyTo`. The
transit-branch e2e (`e2e-walk.test.js:395-396`, "skipping purpose-details") proves the page is
never offered.

**One dead declarative knob:** `flow.sectionEntryMode: 'firstApplicablePage'` (`flow/flow.js:89`)
is read by nothing — grep finds it in exactly two places, that declaration and
`obligations.md:2969-2977`, which honestly admits "the runtime primitives don't consume it today".

---

## 8. Test coverage of this dimension

- `engine/index.test.js` (1,166 LOC, 69 `it(`): dedicated describes for `firstApplicablePage`
  (:625), `firstUnfulfilledPage` (:639), `firstUnfulfilledPageForLine` (:680),
  `firstUnfulfilledPageForUnit` (:763), `firstPagePresentingObligation` (:889) — all over
  **synthetic** obligations, so the primitives are tested independent of V4.
- `contract.test.js`: a `navigation` describe with **4** cases (:79-113) — startPage,
  nextAfter-within-subsection, nextAfter-falls-back-to-task-list, changeLinkFor.
- `routes.test.js` (1,011 LOC, 42 `it(`): 8 redirect-location assertions.
- `e2e-walk.test.js`: 2 full-journey walks (internal-market, transit) driven through `/start`.
- **Not tested at all:** back-link targets, any CYA→page→CYA round trip (it does not exist),
  purge durability across a gate flip-flop.

---

## 9. Verdict table

| Capability | Status | Evidence |
|---|---|---|
| Next-page decision | **Declarative** (re-walk vs live scope) | `contract.js:115-127`, `engine/index.js:128-139` |
| Page skipping when re-gated | **Declarative**, free | POST re-reads state then walks: `lib/page-controller.js:90-93` |
| Route generation from flow | **Declarative** | `routes.js:150-205` |
| Depth fan-out in navigation | **Imperative** (3 parallel factories + identity branch) | `routes.js:154`, 3 `nextAfterFor*`, 3 `firstUnfulfilledPageFor*` |
| Change-context / return-to-CYA | **ABSENT** (doc claims it) | zero `change=1` in code; `obligations.md:2338-2345` |
| Back link | **Imperative stub** (constant per family) | `lib/page-controller.js:41-45` |
| Previous-page primitive | **ABSENT** | no reverse walk in `engine/index.js` |
| Breadcrumbs | **Imperative** (3 literal arrays) | `features/check-your-answers/controller.js:344` |
| Resume (in-session) | **Declarative** | `contract.js:101-111`, `features/start/controller.js` |
| Save-and-return (cross-session) | **ABSENT** | `lib/state.js` = yar only; no draft id, no backend |
| Submit / F→S | **Modelled, unreachable** | `engine/index.js:583`; no POST CYA route |
| Scope-exit wipe durability | **BROKEN** (read-time projection only) | `lib/state.js:50-51` vs `evaluator.js:123-126`; doc `obligations.md:1127-1130` |
| Hub | **Declarative + 2 hard-coded exceptions** | `features/hub/controller.js:60-90` |
