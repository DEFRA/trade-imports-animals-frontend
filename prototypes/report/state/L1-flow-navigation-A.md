# L1 — Flow, navigation, change-context, save-and-return — SIDE A (live-animals)

Clone: `workareas/model-comparison/clone-live-animals` (HEAD b6ac2ed)
Root: `prototypes/standalone/live-animals/`
All line references are to that root unless stated.

## Headline

The next page is decided by **an authored ordered spine with derived reachability**. It is not a graph (no edges anywhere), not page-owned `next()` (no controller computes its own successor), and not a single linear run — it is *two* authored orderings (`flow/flow.js` sections→pages, `flow/run.js` RUN_STEPS) plus a hub, resolved by one 5-line precedence chain in `shared/kit.js`.

The split that matters:

- **SEQUENCE is hand-authored data.** `sections` (10 sections, 20 page entries, `flow/flow.js:27-75`) and `RUN_STEPS` (8 steps, `flow/run.js:23-41`) are literal arrays of page-identity objects. Nothing derives them from the obligation model.
- **REACHABILITY is derived from the model.** A page's gate is computed, not written: `flow/gates.js:21-28`. Exactly **one** authored gate exists in the entire flow (`review`, `flow/flow.js:72`).
- **The prerequisite graph is derived too.** `flow/prerequisites.js` computes it from flow order × the dispatch index × each obligation's own `enforcedAt: 'continue'` fact. There are **2** carriers in the whole domain (`features/origin/obligations.js:4` countryOfOrigin, `features/commodities/obligations.js:6` commoditySelection). No hand-authored prerequisite edges exist.
- **Change-context, back-links and save-and-return are IMPERATIVE**, and thin. `?change=1` is a boolean with one hard-coded destination; back-links are 14 hard-coded strings.

Flow layer size: `flow/` = 9 modules, **410 LOC** (flow 86, dispatch 74, task-rows 59, run 51, entry-guard 50, gates 37, prerequisites 31, run-state 29, navigation 28, section-status 15) plus `shared/kit.js` 100 LOC. Flow tests: `flow/run.test.js` 11 cases, `flow/opening-run.test.js` 27, `flow/task-rows.test.js` 15, `flow/gates.test.js` 12, `flow/dispatch.test.js` 9, `shared/change-context.test.js` 14 = **88 test cases** on this dimension.

---

## 1. How the next page is decided

### 1.1 The precedence chain — one function, four sources

`shared/kit.js:52-63` is the whole of it:

```js
export const exitTarget = (request, fallback) =>
  hubExitTarget(request) ??
  (changeContext(request) ? pagePath(CYA_SLUG) : fallback)

export const runTarget = async (request, stepId, scope) =>
  (await inOpeningRun(request)) ? nextRunTarget(stepId, scope) : null

export const nextTarget = async (request, page, scope) =>
  exitTarget(
    request,
    (await runTarget(request, page.id, scope)) ?? nextInSection(page.id, scope)
  )
```

Precedence: **explicit hub exit (`exit=hub` in the payload) > change context (`?change=1`) > opening-run sequence > `nextInSection`**. Confirmed by `shared/change-context.test.js:69-76` and `flow/opening-run.test.js:248-284`.

`kit.nextTarget` is called from **14 controllers** (grep: origin:92, import-reason:59, import-purpose:77, additional-details:85, commodities/consignment-details:187, commodities/animal-identification:540, documents:296, addresses:52, cph-number:70, contact:65, transport ×4 at port-of-entry:109, transit-countries:79, transporters:39, transporters-select:78, private-transporter-details:146). Two controllers bypass it partially: `import-type-filter/controller.js:67` calls `kit.exitTarget(request, nextRunTarget(...))` directly (the filter must open the run before it exists), and `cph-number/controller.js:67-71` inserts its own `hubEntryReturn` between hub-exit and nextTarget.

**MODELLED DECLARATIVELY:** the four-way precedence itself is one shared function, so it is uniform rather than per-page. **HANDLED IMPERATIVELY:** each controller must remember to call it — nothing enforces that a POST handler redirects through `nextTarget`. `contract.test.js` pins what a page *commits*, not where it *goes*.

### 1.2 `nextInSection` — linear within a section, gate-skipping

`flow/navigation.js:20-28`:

```js
export const nextInSection = (pageId, scope) => {
  const section = sectionOfPage(pageId)
  if (!section) return hubPath()
  const index = section.pages.findIndex((page) => page.id === pageId)
  const next = section.pages
    .slice(index + 1)
    .find((page) => pageGatePasses(page, scope))
  return next ? pagePath(next.slug) : hubPath()
}
```

No graph, no branch table. The journey shape is: run linearly through a section's page list, **skipping any page whose derived gate fails**, then fall back to the hub. Branching (e.g. commercial vs private transporter) is expressed as *gate failure on a page in the linear list*, not as an edge — `transportersSelectPage` and `privateTransporterDetailsPage` sit side by side in the transport section (`flow/flow.js:58-64`) and each one's `activatedBy` (equals-gated in `features/transport/obligations.js`) makes exactly one of them reachable.

This is the single most important structural fact of A's flow: **A has no successor edges at all.** Order is positional; conditionality is scope.

### 1.3 The derived gate

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

Two clauses: (a) all `enforcedAt:'continue'` obligations owned by a strictly-earlier flow step are answered; (b) *some* obligation this page collects is in scope. `collectsOf` reads the boot-built dispatch index (`flow/dispatch.js:72`), which is the *inversion of the page-side `collects` declaration* — so the flow never restates the model's activation rules as string literals. `flow/gates.test.js:53-73` pins the equivalence "absent prerequisites, a derived gate passes exactly when the section's status is not Not applicable" across every enumerable scope state from `analysis/reachability.js`.

`assertDispatchBuilt` (`flow/gates.js:5-12`) throws if a gate is consulted before boot, because `collectsOf` legitimately returns `[]` for a collect-nothing page and would return `[]` for *every* page on an unbuilt index — silently gating the whole journey out.

**MODELLED DECLARATIVELY.** This is A's strongest claim on this dimension: 19 of 20 flow pages have zero authored gating, and the one authored gate (`review`) exists only because its own obligation (`declaration`) is always in scope so the derivation would open it from the start (`docs/flow-and-gates.md:42-46`).

### 1.4 The prerequisite graph is derived, not authored

`flow/prerequisites.js:8-26` — for a page, walk every obligation in the registry, keep the ones with `enforcedAt: 'continue'`, find each one's owning page via the dispatch index, and keep those whose flow index is **strictly earlier**:

```js
const continuePrereqsBefore = (flowIndex) =>
  continueObligationOwners()
    .filter((owner) => owner.flowIndex !== -1 && owner.flowIndex < flowIndex)
    .map((owner) => owner.id)
```

So "commodities opens once countryOfOrigin is answered; everything after commodities opens once commoditySelection is answered" is a **consequence of two `enforcedAt` flags plus array order**, not of an authored dependency list. `scope.answered` is instance-aware — an item-level obligation counts as answered once *any* instance fills it (`engine/read.js`).

Cost of this cleverness: it is O(flow position). A page cannot depend on a *later* obligation, and a prerequisite cannot be per-page (every page after the carrier inherits it). That is fine for a 20-page linear-ish journey and would not survive a genuinely branchy one.

### 1.5 The opening run — a *second* ordering, as config

`flow/run.js:23-41` — 8 steps, each `{ id, target }` where `target` is uniformly `flowPageTarget(page)`:

```js
const flowPageTarget = (page) => (scope) =>
  pageGatePasses(page, scope) ? pagePath(page.slug) : null
```

`nextRunTarget(stepId, scope)` (`run.js:43-51`) finds the posting page's position and walks *forward* to the first step whose target resolves non-null, else the hub. A null target skips the step — that is how the conditional `import-purpose` page is skipped (`flow/run.test.js:59-69`) and how the whole tail collapses to the hub if no commodity line exists (`run.test.js:49-51`).

Note that the run steps are **not** derived from `flow.js` order: they are a separate, hand-maintained ordered list that happens to be a subset in a different order (identification comes *after* import purpose in the run, but sits in its own section earlier in `flow.js`). Two orderings, both authored, must be kept consistent by hand. Nothing asserts they agree.

**Position is stateless** (derived from which page is POSTing). **Completion is session state**: `flow/run-state.js:9-24` holds `{ journeyId, phase: active|complete }` behind the SESSION port, because completion genuinely cannot be derived from answers — a zero-record identification pass leaves no footprint, and `importType` does not survive a real-mode round-trip (`docs/flow-and-gates.md:106`). The hub GET flips active→complete (`features/hub/controller.js:191`), so reaching the hub by *any* route ends run mode.

**MODELLED DECLARATIVELY** (the sequence is data; swapping a step touches only `RUN_STEPS`), with an honest imperative escape (the session record).

---

## 2. Change-context navigation

### 2.1 The mechanism

Three functions, 6 lines, `shared/kit.js:47-54`:

```js
export const changeContext = (request) => Boolean(request.query.change)
export const withChangeContext = (request, href) =>
  changeContext(request) ? `${href}?change=1` : href
export const exitTarget = (request, fallback) =>
  hubExitTarget(request) ?? (changeContext(request) ? pagePath(CYA_SLUG) : fallback)
```

CYA builds every Change link by asking the dispatch index who owns the obligation (`features/check-answers/controller.js:28-31`):

```js
const changeHref = (obligationId) =>
  withChange(pagePath(slugOfPage(pageOfObligation(obligationId))))
```

This is the one genuinely derived piece of change-context: the *target page of a Change link is never written down*. `pageOfObligation` normalises instance indices away (`flow/dispatch.js:15-24`, `address.replace(/\[\d+\]/g, '')`) so a per-instance link (`commodityLines[0].commoditySelection`) resolves to the owning page. `buildDispatch` guarantees exactly one owner per obligation (`dispatch.js:45-52` throws on a duplicate), which is *why* the Change link is unambiguous.

### 2.2 What the mechanism cannot express

`?change=1` is **a boolean with one hard-coded destination** (`CYA_SLUG`, `kit.js:25`). There is no return stack, no `returnTo=<path>`, no notion of "the place I came from". Consequences visible in the code:

- `features/cph-number/controller.js:27-28` invents a **second, private return mechanism** because change-context could not express "return to the addresses page":
  ```js
  const hubEntryReturn = (request) =>
    request.query.return === 'addresses' ? pagePath('addresses') : null
  ```
  and threads it into both the back link (`:33`) and the exit (`:69`). That is the smell: one bespoke query param per return destination.
- Collection loops must **thread the flag by hand** through every internal link and PRG redirect: `withChangeContext` appears at 10 call sites across 5 controllers (animal-identification :261, :398, :537, :555; consignment-details :53, :105, :111, :139, :196; search :143; documents :137, :170, :275, :301; transit-countries :77). Forget one and the user silently falls out of change context mid-loop. `shared/change-context.test.js` (14 cases) exists precisely to pin this by driving the real handlers.
- The rule "only the loop's *exit* repoints to CYA; mid-loop add/remove/save never do" (`docs/flow-and-gates.md:97`) is enforced only by those tests — there is no structure that makes it true.

**PARTIAL / mostly IMPERATIVE.** The *target* of a change link is derived; the *return* is a hard-coded constant threaded by hand.

### 2.3 What happens if the edit re-gates downstream pages — the honest answer

Two cases, and they are asymmetric.

**(a) The edit takes answers OUT of scope — handled declaratively and well.** Every write goes through `engine/write.js:11-18`, which re-derives scope and destroys the wipe set on *every* commit:

```js
export const commit = async (request, h, patch) => {
  const journey = await currentJourney(request, h)
  const answers = { ...journey.answers, ...patch }
  const { wiped } = reconcile(answers)
  destroyWiped(answers, wiped)
  ...
}
```

So changing a commodity from CYA and thereby de-gating `numberOfPackages` physically deletes it (15 obligations carry `wipeOnExit`). Nothing derived is stored, so the hub, CYA and gates all self-heal on the next read. This is genuinely stronger than a flow layer that only tracks visited pages.

**(b) The edit brings NEW required answers INTO scope — handled poorly.** The user is returned to CYA (that is what `?change=1` means), where the newly-in-scope obligation renders as a "Not provided" row (`check-answers/controller.js:24,33`). `readyForCheckYourAnswers` goes false, so the hub's review row locks to "Cannot start yet" (`features/hub/controller.js:142-144`). But:

- **CYA itself is not gate-enforced** — `notification-view` is not in `dispatchPages` (`features/index.js:27-46`), so it collects nothing, and per `docs/flow-and-gates.md:40` an empty `collects` derives to reachable. A direct GET renders it regardless.
- CYA's POST does not re-check readiness: `check-answers/controller.js:490-493` just `h.redirect(nextInSection(page.id, scope))` → the declaration page.
- The declaration POST *does* block the submit, but **silently**: `features/declaration/controller.js:65-67`
  ```js
  const result = await state.submitJourney(request, h)
  if (!result.ok) return h.redirect(pagePath(kit.CYA_SLUG))
  ```
  The user is bounced back to CYA with **no error summary and no indication of which answer is now missing**. `engine/write.js:89-95` is the guard (`if (!scope.readyForCheckYourAnswers) return { ok: false, ... }`) — submission is *safe*, but the re-gate is not *communicated*.

There is no "you have unanswered questions" pattern, no incomplete-row highlighting on CYA, and no redirect to the newly-owed page. Not structural (a build loop could close it in a day) but it is the concrete failure mode of the whole change-context design.

---

## 3. Gates are advisory for navigation, not enforced

`pageGatePasses` / `sectionGatePasses` are consulted in exactly 4 production places: `flow/navigation.js` (3×), `flow/run.js:15`, `features/hub/controller.js:142,158` (via `rowGatePasses`), and `analysis/simulate.js` (analysis only). **No route handler, and no `onPreHandler`, checks a page's gate before rendering it.** The only request-level guard is `flow/entry-guard.js`, and it checks a different thing entirely — whether the journey is *fresh* (no committed notification answers and never through the filter), redirecting to the import-type filter if so (`entry-guard.js:44-50`, wired at `routes.js:26-29`).

So a user who has started a journey can type any page URL and get it — including `notification-view` on a half-empty journey. `docs/flow-and-gates.md:107` says this is deliberate: *"direct navigation on a started journey must keep working — the E2E helpers rely on it."* That is a test-convenience justification for a missing guard, and it should be read as such. The hub greys the row out; the URL still serves.

**Limitation, structural = false.** A gate-enforcing `onPreHandler` is ~15 LOC (resolve page from path via `slugOfPage`, `pageGatePasses`, redirect to hub) and everything it needs already exists.

---

## 4. Back-link semantics — hand-authored, and change-blind

There is **no derived back-link**. 14 controllers pass a literal:

| back link | controllers |
|---|---|
| `hubPath()` | origin:57, import-reason:33, import-purpose:45, additional-details:34, documents:192, addresses:44, transport/port-of-entry:66, transit-countries:43, transporters:18, contact:33, animal-identification:389, check-answers:481, commodities/search:80 |
| fixed page path | transporters-select:33 (`transporters`), private-transporter-details:85 (`transporters`), party-picker:93 (`addresses`), create-address:94 (party slug), declaration:34 (CYA), hub:201 (dashboard) |
| context-aware | **consignment-details:105 only** — `kit.withChangeContext(request, pagePath(commoditiesPage.slug))`; cph-number:33 — its own `hubEntryReturn(request) ?? hubPath()` |

The consequence is a real UX bug in the change flow: click **Change** on CYA next to "Country of origin" → land on `/origin?change=1` → the page's **Back link points at the hub**, not at CYA. Saving returns you to CYA (the precedence chain works); *backing out* does not. Nothing in the model or the flow layer knows where you came from.

**ABSENT** as a modelled capability; **structural = false** (a `kit.backTarget(request, fallback)` mirroring `exitTarget` would fix it in one file plus 14 one-line edits).

---

## 5. Save-and-return / resume

**Save-and-return is uniform and imperative, and it works.** Every page's action bar is one macro (`shared/save-actions.njk:3-14`): a primary "Save and continue", a secondary `name="exit" value="hub"` submit, and a "Cancel and return to hub" link. `kit.hubExitTarget` (`kit.js:44-45`) reads `payload.exit === 'hub'` and wins over everything. There is no separate "save draft" action — **every POST commits** (`engine/write.js:11`), so "save and return" is just "commit, then redirect to the hub".

**Resume is dashboard-only.** `features/dashboard/controller.js:70-83`:
- `GET home/{journeyId}/resume` → `selectJourney` → hub
- `GET home/{journeyId}/view` → `selectJourney` → CYA
- `POST home/{journeyId}/amend` → `amendJourney` (unfreezes a SUBMITTED record) → hub

`selectJourney`/`amendJourney` (`engine/journey.js:90-104`) refuse a reference the session does not know — `isKnownJourney` is the authorisation seam. The old recover-by-identity `GET /resume` was **retired, not repointed** (`DESIGN-DELTA.md:446-452`) because in real mode it silently minted a fresh draft.

**Resume does not restore a position.** It drops you at the hub (or CYA). There is no "you were on page X" memory — and because scope re-derives from answers on every read (`engine/evaluate/reconcile.js`), a days-later resume self-heals to current scope rather than replaying a stored path. That is a deliberate and good property, but it means "continue where I left off" is not expressible: the only resumption points are hub and CYA.

The opening-run session record is the *only* piece of navigational state ever persisted (`flow/run-state.js`), and it holds a phase, not a position.

---

## 6. Linear run vs hub-and-spoke — both, and the seam is clean

A runs **both presentations over one flow**: a linear first pass (filter → origin → search → consignment details → import reason → conditional purpose → identification → additional details → hub) and hub-and-spoke thereafter. The seam is a single `??` in `kit.nextTarget` — `runTarget` returns null when no run record is active, and then *every redirect is byte-for-byte the pre-run behaviour* (`DESIGN-DELTA.md:530-532`: "all 379 pre-existing unit tests pass unmodified"). `flow/opening-run.test.js:316-330` pins the fallback.

The hub is derived from the same index: 11 task rows (`flow/task-rows.js:24-51`), each naming its flow pages, status = `statusOf(rowParts(row))` where parts default to the union of those pages' `collects` — and two rows carry **collection facets** (`{ collection: 'commodityLines', except/only: ['animalIdentifiers'] }`) so one stored collection splits across two hub rows without moving data. Row gating is not a new derivation: `rowGatePasses(row, scope) = pageGatePasses(row.pages[0], scope)` (`flow/navigation.js:18`), and `rowEntry` enters at the row's first gate-passing page.

Cost: `taskRows` is a **third hand-authored ordering** alongside `sections` and `RUN_STEPS`, and `features/hub/controller.js` holds a **fourth** (the six `GROUPS` of row ids with their copy). Adding a page means touching `flow/flow.js`, `flow/task-rows.js`, the hub's GROUPS, `features/index.js`, CYA rows, and `flow/run.js` if it is in the run — `docs/add-a-page.md` lists 10 steps.

---

## 7. Things A can do that a config-engine flow layer may structurally not

1. **A dead-end prover over the real gates.** `analysis/reachability.js` (215 LOC) enumerates scope states, scaffolds witness journeys and proves every obligation is reachable and no root is orphaned; `flow/gates.test.js:53-73` runs the derived-gate equivalence across *every enumerable scope state* it produces. `analysis/simulate.js` threads the real `sectionGatePasses`/`pageGatePasses` to emit the whole journey shape headlessly. Flow correctness is a *property being proved*, not a set of examples.
2. **Boot-time totality of the page↔obligation mapping.** `buildDispatch` (`flow/dispatch.js:55-63`) crashes the server if any non-system obligation at any depth is collected by no page, or by two. A missing Change-link target is impossible by construction.
3. **A gate that is provably the model's own conditionality.** Because the gate reads the same index the status roll-up reads, "the row is greyed out" and "the section is Not applicable" cannot disagree.
4. **Wipe-on-re-gate integrated into navigation.** Editing from CYA physically destroys the answers the edit de-gated, on the same request.

## 8. Limitations, ranked

| # | Limitation | Structural? | Evidence |
|---|---|---|---|
| 1 | Gates are advisory — no route-level enforcement; any started journey can deep-link any page, incl. CYA | No | `pageGatePasses` has 4 prod call sites, none in a handler/`onPreHandler`; `routes.js:26-29` registers only the entry guard |
| 2 | Change-context is a boolean with one hard-coded destination; no return stack | No (but touches kit + 5 controllers) | `kit.js:52-54`; `cph-number/controller.js:27-28` invents `?return=addresses` |
| 3 | Re-gating an answer into scope from CYA produces a **silent** submit refusal | No | `declaration/controller.js:66` `if (!result.ok) return h.redirect(pagePath(kit.CYA_SLUG))` |
| 4 | Back-links hard-coded and change-blind — Change→page→Back lands on the hub, not CYA | No | 14 literal `backLink:` values; only consignment-details:105 is change-aware |
| 5 | Derived gate bakes in **any**-in-scope semantics: a page mixing conditional and unconditional obligations derives to always-true and forces an authored gate | Yes (of the derivation; escape hatch = hand-authored gate, i.e. the thing the derivation removed) | `flow/gates.js:17-19`; `docs/limits.md:60-64` |
| 6 | Four hand-maintained orderings must be kept consistent (sections, RUN_STEPS, taskRows, hub GROUPS); nothing asserts they agree | Yes-ish (consequence of page-as-spine) | `flow/flow.js:27`, `flow/run.js:23`, `flow/task-rows.js:24`, `features/hub/controller.js` GROUPS |
| 7 | A page cannot belong to two sections — `sectionOfPage` returns the first, `nextInSection` walks only that one | Yes | `flow/flow.js:81-82`; `docs/flow-and-gates.md:87` ("true dual membership would need a navigation rethink") |
| 8 | No successor edges at all — branching is only expressible as *gate failure on a positionally-later page*. A true "if X go to page 7 else page 12" needs an authored gate on both | Yes | `flow/navigation.js:20-28` |
| 9 | Prerequisites are position-based: every page after an `enforcedAt` carrier inherits it; a per-page prerequisite is not expressible | Yes | `flow/prerequisites.js:20-26` |
| 10 | Resume restores no position — only hub or CYA | Yes (by design; nothing derived is stored) | `features/dashboard/controller.js:70-78` |

## 9. Doc-vs-code disagreements found

- `docs/limits.md:56` claims *"no feature controller calls the update path — in the browser, collections change through add and remove only"*. `features/commodities/animal-identification.controller.js` and `consignment-details.controller.js` now drive `reconcileEntriesAt` and per-row remove; the doc is stale (harmless, but it means limits.md is not a current inventory).
- `docs/limits.md:74` says adding a field is "three edits"; `docs/add-a-field.md:16` says five places. Trust add-a-field.md.
- `DESIGN-DELTA.md:486-489` describes the identification run step as targeting `commodities/0/identifiers` with a marker step for consignment details; `flow/run.js:23-41` now has **every** step as a plain `flowPageTarget` and the identification page is `commodities/identification`. The DESIGN-DELTA entry documents the state at inc-060 and was superseded by inc-062/063 — the code is right; the narrative in §12 is superseded by its own later bullet at :105 of flow-and-gates.md.

## 10. Retrofit read (for the third option)

**Worth taking from A:**
- The **derived gate** (`gates.js` + `prerequisites.js` + `dispatch.js` = 142 LOC) — this is the highest-value, lowest-LOC idea in A's flow layer. It requires only: pages declaring `collects`, an obligation-level `enforcedAt` flag, and a boot-time inversion with a coverage assert. It is portable to *any* model that can enumerate its obligations and their scope.
- The **boot coverage assert** (a forgotten wiring is a startup crash).
- The **precedence chain** as a single function.
- The **reachability prover** driving the real gates.

**Do not take from A:**
- The four parallel hand-authored orderings.
- `?change=1` as the entire return mechanism.
- Hard-coded back-links.

**Cost of taking the derived gate:** it forces the "one obligation, one page" rule (dispatch must be 1:1 or the Change link is ambiguous) and it forces any-in-scope gate semantics unless you extend the derivation. Both are real constraints, not free.
