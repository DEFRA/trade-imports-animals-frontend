# L2 — Flow, navigation, change-context, save-and-return

A = `clone-live-animals` `prototypes/standalone/live-animals/` (HEAD b6ac2ed)
B = `clone-flow-layer` `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` (HEAD d59b432)
All paths relative to those roots. Every line reference below was re-read at source, not taken from L1.

## Verdict: MIXED — and the standing prior is REFUTED on the sharpest sub-question

The prior says B's model is better, possibly in every respect. On this dimension that is **not true**, and the reason is not that A is more finished. It is that **B's forward-navigation primitive is a strict specialisation of A's**:

| | A | B |
|---|---|---|
| walk over | declared order (`sections[].pages[]`) | declared order (Section→SubSection→Page tree) |
| skip predicate | page's derived **gate** fails (`flow/gates.js:21-28`) | page's **status** is NA \| Optional \| **Fulfilled** (`engine/index.js:128-133`) |
| next-page source | `flow/navigation.js:20-28` (+ run, + change, + hub exit) | `contract.js:115-127` — `firstUnfulfilledPage` is the **only** source |

B's skip clause is A's skip clause **plus** "and not already answered". So every page B's walk can reach, A's walk can reach; but any page that is complete, optional, or presents no obligation at all is **unaddressable by B's walk by construction**. That is not a missing feature — `nextAfter` has no other source of a page. Conversely, `firstUnfulfilledPage` is ~10 LOC over A's existing per-page `statusOf` roll-up, so A's model can express B's primitive and B's cannot express A's.

Both L1 reads over-credited B here. L1-B calls "page skipping rides obligation scope, so re-gating is free" *"the strongest single idea in this dimension on either side"*. **A has the identical idea, with the identical semantics** — verified:

- A: `flow/gates.js:17-19` — `inScopeReachable = (ids, scope) => ids.length === 0 || ids.some((id) => scope.inScope.has(id))`
- B: `engine/index.js:387-389` — `if (inScope.length === 0 && groupErrorCount === 0) return STATUSES.NOT_APPLICABLE`

"visible iff **any** presented obligation is in scope" ≡ "NA iff **none** is". Same predicate, independently arrived at. Re-gating after an edit is free on **both** sides (A re-derives scope inside the commit — `engine/write.js:11-18` — and passes the post-write scope to `kit.nextTarget`; B re-reads state after `writeAnswer` — `lib/page-controller.js:90-93`). The `any`-in-scope limitation L1-A honestly logged as a *structural limitation of A* is therefore a **shared** limitation, not a differentiator — except that A has an escape hatch (`page.gate` / `section.gate`, used exactly once at `flow/flow.js:72`) and B's flow declaration has **no visibility slot at all** in 667 LOC.

So the model-level scorecard, with the build-loop advantages (persistence, amend, resume-by-reference, the very existence of a change flow) discounted:

| Sub-question | Winner | Structural? |
|---|---|---|
| next-page primitive generality | **A** | yes — B's is a strict specialisation |
| page-visibility derivation | tie (identical predicate) | — |
| prerequisite locking ("Cannot start yet") | **A** | yes — B has no lock and no 7th status |
| sequencing a content/interstitial/complete page | **A** | yes — B cannot route or reach one |
| flow declaration shape (one tree vs four orderings) | **B** | maintainability, not expressiveness |
| instance-scoped pages + generated params | **B** | yes — A's page identity is a static slug |
| route table derived from the flow | **B** | retrofittable into A |
| durable scope-exit wipe | **A** | B's is a read-time projection (a bug) |
| change-context | A (thin + hacky) | neither has a model |
| back-link / previous-page | tie (both absent) | — |
| save-and-return across sessions | A | not a flow-model property — discount it |

Net: **mixed**. A takes the two sharpest structural wins on *navigation semantics*; B takes the two sharpest on *flow declaration*. Neither is adoptable whole. Option C is B's declaration under A's walk.

## Where A only "wins" because a build loop ran on it — say it plainly

- Change-context exists in A and not in B. That is **build state, not model**. A's `?change=1` is a boolean with ONE hard-coded destination (`shared/kit.js:25,52-54`), hand-threaded through 10 `withChangeContext` call sites in 5 controllers, and it already failed to generalise once — `features/cph-number/controller.js:27-28` invents a private `?return=addresses` param because change-context could not express a second destination. B's hook (`lib/page-controller.js:27-30`, `opts.query`, never passed) would reach parity in a day. **Neither side has a change-context *model*.** Do not score this for A.
- Save-and-return / resume-by-reference / amend-and-resubmit: A has them, B has `@hapi/yar` and one session key. Entirely a persistence-layer difference, orthogonal to the flow model. Do not score it.
- A's E2E/unit coverage on this dimension (88 cases) vs B's (~19). Build state.

Strip all of that and A **still** wins the next-page question — that is the finding.

## Where B is genuinely, structurally ahead

- **`presentsForEach` / `forEachOf`** (`routes.js:139-154`): a page in the flow tree can be *per commodity line* or *per unit record*, and the route generator emits `/lines/{lineId}/{name}` and `/lines/{lineId}/units/{unitId}/{name}` from the declaration, with matching forward primitives (`nextAfterForLine` `contract.js:135`, `nextAfterForUnit` :152). A has no representation for this at all (see aOnly). The cost B pays is honest and documented: depth is hard-coded in the browser layer — 3 `firstUnfulfilledPageFor*`, 3 `nextAfterFor*`, 3 controller factories (111/141/179 LOC), and `routes.js:154` branches on **object identity** (`page.presentsForEach.forEachOf === unitRecord`). A depth-3 group costs a fourth of each (`RECOMMENDATION.md:180-188` defers it).
- **One ordering, many derivations.** B's `flow/flow.js` (667 LOC, 6 sections / 16 subsections / 31 pages) is the single source for routes (`routes.js:150-205`), the hub rows, CYA change links and the i18n coverage test. A maintains **four** hand-authored orderings that nothing asserts agree — `flow/flow.js:27-75` (10 sections / 20 pages), `flow/run.js:23-41` (RUN_STEPS, 8), `flow/task-rows.js:24-51` (11 rows), and the hub's `GROUPS` — plus routes hand-declared in **24** feature controllers. `docs/add-a-page.md` lists 10 steps to add a page. This is the direct, quantified cost of A's page-as-spine.

## Where A is structurally ahead

- **A can sequence a page with nothing outstanding.** `flow/gates.js:18` — `obligationIds.length === 0 || …` — a collects-nothing page passes its gate, which is exactly how `notification-view` / `declaration` / `confirmation` sit in the flow as ordinary pages (`flow/flow.js:73`) and how `nextInSection` routes to them. B cannot: `routes.js:189` `if (!hasPresents) continue` denies such a page a route, and `firstUnfulfilledPage` never returns a Fulfilled/Optional/NA page. B's own read-only intro page is the witness — unroutable, and it forced a bespoke hub status function (`features/hub/controller.js:60-69`) because the generic classifier called it NA. Downstream consequences for B: **no interstitial, no "what you'll need", no in-flow declaration/confirmation, no re-showing a completed page, and no opening linear run** (`obligations.md:2198` — "No visited plumbing").
- **A can lock a page/section on a predicate that is not obligation scope.** `flow/flow.js:72` `gate: (scope) => scope.readyForCheckYourAnswers`, surfacing as `CANNOT_START_STATUS` on the hub (`features/hub/controller.js:132-143,158-159`), plus a whole prerequisite graph derived from **2** `enforcedAt:'continue'` flags × flow position (`flow/prerequisites.js:20-26`; carriers at `features/origin/obligations.js:4`, `features/commodities/obligations.js:6`) with **zero** hand-authored prerequisite edges. B's status alphabet has 6 values and none of them is "cannot start yet" (`engine/index.js:274-280`), its flow has no visibility key, and faking the lock through `applyTo` would mark the obligations NOT_APPLICABLE — semantically wrong (it means "does not apply", and it drives the purge).

## The defects each side is carrying into option C

- **B: the scope-exit purge is not durable.** Verified at source. `evaluateState` returns `amendedFulfilments` (`obligations/evaluator.js:93-99,123-126`), but `writeAnswer` merges into `{ ...readFulfilments(request) }` — the **raw** yar map (`lib/state.js:50-51`; `readFulfilments` = `request.yar?.get(SESSION_KEY)` :26-28), and every `writeFulfilments` call site passes a raw-derived map. A gate flip-flop therefore rehydrates the stale answer, which `obligations.md:1127-1130` says cannot happen. Under a real backend this is the difference between a stale answer being invisible and a stale answer being **submitted**. Worse, B is internally undecided: `flow/flow.js:116-118` says of `regionCode` that the "stored value is retained across gate flips" *as intended*. B must rule retain-vs-wipe before this is a one-line fix. A's answer is unambiguous and lives in the write path: `engine/write.js:11-18` re-derives scope and `destroyWiped` on **every** commit (15 obligations carry `wipeOnExit`).
- **B: two doc lies in the present tense** — `obligations.md:2338-2345` (a `?change=1` CYA round-trip) and :2347-2354 (a contextual back link). Zero occurrences of `change=1` in any `.js`/`.njk`; `backLinkFor` is a constant in all three controller families (`lib/page-controller.js:41-45`, `line-page-controller.js:44-46`, `unit-page-controller.js:49-51`). Neither appears in the doc's own honest "aspirational" register (:2967-2979), which *does* flag the inert `sectionEntryMode`.
- **A: the silent submit refusal.** An edit from CYA that brings a NEW required obligation into scope re-locks the journey correctly, but the user is bounced with no error: `features/declaration/controller.js:65-67` — `const result = await state.submitJourney(request, h); if (!result.ok) return h.redirect(pagePath(kit.CYA_SLUG))`. No error summary, no named missing answer; CYA's own POST does not re-check. Submission is *safe* (`engine/write.js:92` blocks it) but the re-gate is not *communicated*. This is the concrete failure mode of A's change flow and must not be copied into C.
- **Both: gates are advisory on GET.** A: `pageGatePasses` has zero call sites in a route handler or `onPreHandler` (the only one, `routes.js:26-29`, is the freshness entry guard); `docs/flow-and-gates.md:107` justifies it with "the E2E helpers rely on it". B: there are no gates at all, so every page is URL-reachable by construction. Same hole, ~15 LOC to close in A, a new concept in B.

## Claims (destroy these first)

See the `claims` array in the structured return. Each is a source-checkable assertion with file:line.

## Retrofit — B's flow into A

Dropping B's `nextAfter` into A **breaks A's journey**, not just A's code:

- The review section dies. `notification-view` / `declaration` / `confirmation` collect nothing (`flow/flow.js:73`), so `firstUnfulfilledPage` can never return them. A would have to hand-declare them as meta routes outside the walk, exactly as B does (`routes.js:59-86`) — i.e. adopt B's admission that the reading order lives outside the model.
- The opening run dies. `flow/run.js` walks 8 steps regardless of fulfilment; B has no notion of "next in reading order".
- Prerequisite locking dies. B has no lock and no `CANNOT_START` status; A's hub loses "Cannot start yet" on 11 rows.
- Change-context dies. `exitTarget` (`shared/kit.js:52-54`) needs an *authored* return, not a walk.

What A **should** take from B, and the price:

1. **`firstUnfulfilledPage` as a resume-to-position primitive** — ~10 LOC over A's existing per-page `statusOf`; closes A's real gap ("resume restores no position — only hub or CYA", `features/dashboard/controller.js:70-78`). Additive; takes nothing away.
2. **The container tree replacing the four orderings** — subsection = task row = navigation unit. Collapses `flow/flow.js` + `flow/task-rows.js` + hub `GROUPS` into one declaration. Cost: rewrite `flow/navigation.js` (section-scan → tree walk), `flow/prerequisites.js` (flat `flowIndex` → tree position), `flow/task-rows.js` (delete; but the two **collection facets** at `task-rows.js:29,36` — one stored collection split across two hub rows — must be re-expressed as two subsections, and that must be checked against the CYA grouping). ~250 LOC of flow layer + the hub controller.
3. **Route generation** — mechanical but wide: 24 controllers currently export their own `routes`; a generator needs a handler registry keyed by page id. ~1 day, no behaviour change.
4. **`presentsForEach` instance pages** — the expensive one. It requires A's page identity to stop being a static slug (`config.js:6` `pagePath = (slug) => ${BASE}/${slug}`), the dispatch index to stop collapsing instances (`flow/dispatch.js:15-24` deliberately strips `[n]`), and `prerequisites.js` to stop keying on flat array index. Then `features/commodities/animal-identification.controller.js` (566 LOC, one mega-page rendering every line and every animal, with bespoke `{line}/{unit}/remove` routes at :558-566 and 4 hand-threaded change-context sites) splits into per-instance pages. This is a flow-layer rewrite, not an increment — and it is only worth doing if the design actually wants per-instance pages rather than A's one-page-with-cards, which is itself a legitimate GDS pattern.

**Load-bearing in A that B has no answer for:** the write-path wipe (`engine/write.js:11-18`), the boot totality assert (`flow/dispatch.js:44-63` — duplicate owner *and* uncollected obligation are both startup crashes; B's `obligations/coverage.test.js` checks obligation→**domain** wiring, **not** obligation→page, so B has no equivalent guarantee at all), the opening run, the review gate, the freshness entry guard (`flow/entry-guard.js`), and the whole persistence/amend surface.

## Retrofit — A's flow into B

1. **The derived gate: nothing to move.** B already has it, with the same semantics (`engine/index.js:387-389` ≡ `flow/gates.js:17-19`). What B lacks is A's **escape hatch** — a `page.gate` / `section.gate` predicate. Adding one is ~5 LOC of engine plus a key in the flow, but it directly contradicts B's central negative claim ("the flow declares no visibility rules", `obligations.md` passim). B must decide whether that thesis is a principle or a slogan. A's own evidence says it is a slogan: A needed exactly **one** authored gate in 20 pages, and needed it for a case B literally cannot express (the review section).
2. **Prerequisite locking**: give B a 7th status (`CANNOT_START`), a page-order index (its tree already has one), and A's `enforcedAt:'continue'` derivation (`flow/prerequisites.js`, 31 LOC — and note it derives the *whole* prerequisite graph from **2** obligation flags, with zero authored edges). Then unlink the row in the hub. ~60 LOC. Same thesis cost as (1).
3. **A stable spine walk**: `nextInDeclaredOrder` = `firstUnfulfilledPage` minus the fulfilment clause, so a content page or a completed page can be sequenced. This is a change to *the one idea B is built around*: `nextAfter`, `nextAfterForLine`, `nextAfterForUnit` (`contract.js:115/135/152`), the three controller factories and the 8 redirect assertions in `routes.test.js` all assume "next = unfulfilled". Expect to keep both primitives (declared-order walk for the run, first-unfulfilled for resume) — which is exactly what A does.
4. **Change-context**: B's hook exists (`lib/page-controller.js:27-30`, `opts.query`). Thread `?change=1` through the 3 factories and the CYA link builder (`features/check-your-answers/controller.js:115-129`). **Do not copy A's shape** — a boolean with one hard-coded destination already failed to generalise in A (`cph-number/controller.js:27-28`). Build `returnTo=<path>` once. The hard ruling B has not made — and A got *wrong* — is what to do when the edit re-gates a new obligation into scope: A returns to CYA and then refuses the submit **silently** (`declaration/controller.js:66`). C must surface it.
5. **Write-time wipe**: `writeAnswer` should start from `readState(request).fulfilments`, not `readFulfilments(request)` (`lib/state.js:50-51`). One line — *after* B rules on the `regionCode` retain-across-gate-flips comment (`flow/flow.js:116-118`) that contradicts it.
6. **Save-and-return**: not a retrofit of this dimension. B has no journey identity, no draft record, no submit route (`routes.js:59-86`), and a modelled-but-unreachable `SUBMITTED` status (`engine/index.js:583-584`, no caller passes `true`). That is a persistence layer, and A's (two mappers, Mongo, amend/unfreeze) is the only one that exists.

## Shopping list for option C

**From B:** the container tree as the single ordering (routes + hub rows + navigation + change links + i18n all derived from it); `presentsForEach` instance pages with generated params — but **data-driven**, not the `=== unitRecord` identity branch (`routes.js:154`), so depth-3 is free; `firstUnfulfilledPage` as the resume primitive.

**From A:** the derived gate **with** an authored-predicate escape hatch; the `enforcedAt`-derived prerequisite graph + a `CANNOT_START` status; the declared-order walk as the *primary* next-page function with first-unfulfilled as a *second* primitive; the boot-time totality assert (obligation→page coverage and single-owner, both startup crashes); wipe-on-re-gate inside the write path.

**From neither:** the back-link (19 literals in A, 3 constants in B — build `backTarget(request, fallback)` mirroring `exitTarget` once, and make it change-aware); change-context as a boolean (build `returnTo`); the silent submit refusal.
