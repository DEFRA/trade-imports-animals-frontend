# Flow, gates and dispatch

How the spike decides what comes next, what is reachable, and which page owns each answer. The code lives in `flow/` — read [architecture.md](architecture.md) first for where `flow/` sits between `features/` and `engine/`.

## The flow is the spine

`flow/flow.js` exports `sections`: an ordered array of sections, each holding an ordered list of pages. It owns two things — sequence and gating — and nothing else. No copy, no headings, no validation, no template choice. Those all live per page in `features/` (see [features.md](features.md)).

Sections survive from v1 because the journey shape needs them: the user runs through a section's pages in order, then returns to the hub. Since inc-061 the hub no longer renders one task per section — it renders PAGE-LEVEL task rows (`flow/task-rows.js`, below) in the design's six numbered groups — but sections remain the navigation spine: `nextInSection`, the opening-run sequence and the gate derivations all still walk them.

Each page entry is the feature's `page.js` identity leaf (`{ id, slug }`), imported by reference. Page identity is a shared JS object, not a string that happens to match.

`flow.js` also derives three views:

- `allFlowPages` — every page across all sections, flattened, each tagged with its `sectionId`
- `sectionOfPage(pageId)` — the first section containing the page
- `answerSections` — every section **except** `review`. Review is excluded because it owns the `declaration` obligation, confirmed inside the review section itself — folding it into the readiness roll-up that _gates_ review would deadlock. Since inc-061 the `readyForCheckYourAnswers` roll-up iterates the task rows rather than these sections (same obligations, different grouping — see [Roll-ups live flow-side](#roll-ups-live-flow-side)); the review exclusion carries over as the rows never include the review section's pages.

## Gates are derived by default

A gate is a pure `(scope) => boolean` that decides whether a page or section is reachable. `flow/gates.js` exports the two evaluators, `pageGatePasses` and `sectionGatePasses`.

By default no gate is authored. A step with no `gate` is reachable when **both** clauses hold: its RULE 1 prerequisites are answered, and some obligation it collects is in scope. The derivation reads the same boot-built dispatch index the status roll-up reads (a page's `collects`, a section's pages' `collects` combined), so the flow never restates the model's activation rules as hand-typed `inScope.has('<key>')` strings.

The in-scope clause earned its place the hard way. Four of the five gates the flow used to author were bare `inScope.has('<key>')` restatements of the obligation model, coupled to it by a raw string. If the string and the model diverged, you got a ghost Not applicable row on the hub, or a section that could never unlock. Deriving both from one source makes the invariant hold by construction:

> Absent prerequisites, a derived gate passes exactly when the section's status is not Not applicable.

`flow/gates.test.js` pins this exhaustively — it checks the equivalence for a derived section's gate across every enumerable scope state (`analysis/reachability.js`), holding prerequisites satisfied so the clause under test is isolated.

### RULE 1 — mandate-derived flow sequencing

The prerequisites clause is what stops every row from being a live link on a blank journey. It is DERIVED, not a hand-authored graph: `flow/prerequisites.js` computes, for any page or section, the `enforcedAt: 'continue'` obligation ids owned by a **strictly-earlier** flow step, from flow order + the dispatch index + each obligation's own `enforcedAt` fact. A step is available only once every such prerequisite is answered (`scope.answered`, which is instance-aware — an item-level obligation like `commodityLines[i].commoditySelection` counts as answered once **any** line fills it).

So: origin is always open; commodities opens once `countryOfOrigin` is answered; every section after commodities opens once `commoditySelection` is answered. A step never blocks on its **own** continue obligation, only strictly-earlier ones — commodities is not gated by its own `commoditySelection`. An obligation with no `enforcedAt` is never a prerequisite, so this is backwards-compatible for every other field.

Three deliberate edges:

- **Authored gates are the override.** Write a `gate` only for a flow-level fact the model cannot express. An authored gate wins outright — the derivation is never consulted. Exactly one exists: the `review` section's `gate: (scope) => scope.readyForCheckYourAnswers` (RULE 2, below). The mechanism is otherwise dormant.
- **Empty `collects` derives to reachable.** A step that collects nothing (the `notification-view` check-your-answers page — it is not in `dispatchPages`, so `collectsOf` returns `[]`) passes the in-scope clause of its derived gate (its prerequisites still apply). Restricting such a step further is exactly what an authored gate would be for.

### RULE 2 — the review section gates on submit-readiness

"Check and submit" (the `review` section) must not open until the whole notification is submit-ready. It cannot derive this from collects: its own `declaration` obligation is always in scope, so a derived gate would open it from the start. So it carries the flow's one authored gate, `(scope) => scope.readyForCheckYourAnswers`.

The subtlety is a circularity: `declaration` is confirmed _inside_ the review section, so if the readiness roll-up counted the review section, gating review on it would deadlock — you could never confirm the declaration to make review reachable. That is why `readyForCheckYourAnswers` iterates the answer task rows, which never include the review section's pages (pre-inc-061 it iterated `answerSections` — same exclusion). Submit safety is unaffected: the declaration page's own validator enforces `declaration === 'confirmed'` before `submitJourney` runs, so excluding review from the readiness roll-up does not let an unconfirmed journey submit.

## Fail loud before boot

The derived gate refuses to answer until `buildDispatch()` has run. `flow/gates.js` throws if consulted first.

The reason is an ambiguity: `collectsOf(pageId)` legitimately returns `[]` for a known page that collects nothing, and its `?? []` fallback would return the same for every page if the index were simply not built yet. Unbuilt and collects-nothing are indistinguishable from the caller's side. Without the guard, a derived gate consulted before boot would silently gate every page and section out — no error, just an empty journey. So `flow/dispatch.js` tracks `isDispatchBuilt()` and `flow/gates.js` checks it before every derived answer.

This mirrors the engine's `configureReadyForCheckYourAnswers` default, which throws until boot configures it — the same fail-loud stance at both ends of the boot seam (see [architecture.md](architecture.md)).

## The dispatch seam

`flow/dispatch.js` answers the reverse question: which page owns obligation X? The obligation model never names a page, yet the hub and check-your-answers need this lookup to build hrefs and Change links.

`buildDispatch(pages)` runs once at boot (`routes.js`, with `dispatchPages` from `features/index.js`). It inverts each page's `collects` declaration — the authored source of truth — into an obligation → page map, and enforces three things:

1. **Ids are path-safe.** An obligation id becomes both a store key and a segment of a dotted template address, so it must not contain `.`, `[` or `]`. A metacharacter would make addresses ambiguous — `commodityLines.commoditySelection` could not be told from a single stray-dotted id. Boot throws on the first unsafe id.
2. **No obligation has two owners.** Two pages declaring the same obligation throw at boot. See [one obligation, one page](#one-obligation-one-page) for why.
3. **Every obligation has one owner.** Coverage walks `walkObligations()` — every non-system obligation at every depth of the tree — and asserts each resolves to an owning page. A forgotten `collects` is a startup crash, not a silent runtime hole.

After a successful build, three lookups are live: `pageOfObligation(id)`, `collectsOf(pageId)` and `slugOfPage(pageId)`.

### Ownership at depth is derived

A collection's `collects` names only the root (`commodityLines`), not its item fields. A sub-obligation is owned by the page that owns its nearest collection ancestor — `commodityLines.commoditySelection` resolves up the address chain to `commodityLines`, and so to the commodities page. This keeps coverage total without collections enumerating item ids. The accepted trade-off: you cannot redirect ownership of one field at depth to a different page.

### Two address vocabularies

`pageOfObligation` accepts both forms of an address:

- the **template** form — index-free dotted paths like `commodityLines.commoditySelection`, as `walkObligations()` yields them
- the **bracketed instance** form — `commodityLines[0].commoditySelection`, the pathKey vocabulary the engine's scope and wipe layer speaks (see [scope-and-wipe.md](scope-and-wipe.md))

It normalises instance indices away (`[0]` → nothing) before walking the ancestor chain. This bridge is what lets a per-instance Change link on check-your-answers resolve its owning page. `flow/dispatch.test.js` pins both vocabularies.

## One obligation, one page

Dispatch is deliberately one-to-one. The engine would not care if two pages both wrote the same answer — a value is a value — but the check-your-answers Change link needs a single unambiguous target (`features/check-answers/controller.js` builds hrefs with `pageOfObligation` + `slugOfPage`). So `buildDispatch` throws the moment two pages claim one obligation.

When two parts of the journey both have a reason to capture the same answer, the pattern is: **many routes in, one page, one owner, one Change target.** Keep a single page that owns the obligation, and let the other routes link or redirect into it. Nothing in `reconcile` or the coverage assertion changes.

One wrinkle if the shared page must sit structurally inside two sections: `sectionOfPage` returns the first section containing the page, and `nextInSection` walks only that section. Redirect targets are just URLs, so routes-in work today; true dual membership would need a navigation rethink.

## Navigation

`flow/navigation.js` is pure functions over the flow and the gates:

- `sectionEntry(sectionId, scope)` — the first gate-passing page of a section. The hub's review row uses it for its href.
- `nextInSection(pageId, scope)` — the next gate-passing page after this one in the same section, else the hub.
- `rowEntry(row, scope)` / `rowGatePasses(row, scope)` — the task-row twins (inc-061): a row enters at its first gate-passing page and is gated exactly as its FIRST page is, so RULE 1 prerequisites drive row locking with no new derivation.

Together they produce the journey's shape: a linear run through a section, skipping pages whose gates fail (no commercial transporter chosen means no transporter-select page), then back to the hub. `shared/kit.js`'s `nextTarget` wraps `nextInSection` in `kit.exitTarget`, which resolves any exiting POST the same way: an explicit `exit=hub` submit wins, else a `?change=1` request returns to check-your-answers, else the fallback (`nextInSection` for a task page, the loop's own target for a collection list). Collection loops thread the `?change=1` context through their internal links and PRG redirects with `kit.withChangeContext` — only the loop's exit (the list page's Continue) repoints to check-your-answers; mid-loop add/remove/save actions never do.

Nothing here derives scope or mutates data. Navigation only reads the scope facts the state layer already computed.

## The opening run

A first pass through the journey is LINEAR (behaviour `linear-opening-run-then-hub`, Sam's D8/D9/D10 rulings): entry filter → origin → commodity search → consignment details → import reason → conditional purpose → identification (a zero-record pass does not block) → additional details → hub. The hub is the resting state thereafter. Three flow modules carry it:

- **`flow/run.js` — the sequence, as config.** `RUN_STEPS` is an ordered page-id list; each step resolves its own target from scope (`pageGatePasses` for flow pages — the conditional purpose page skips itself, and the consignment-details page skips itself until a line exists via its RULE 1 prerequisite) and a `null` target skips the step. `nextRunTarget(stepId, scope)` walks forward from the posting page's position to the first resolvable step, else the hub. Swapping a step touches only this config — proven at inc-062, which swapped the retired select/details loop steps for the search and consignment-details pages, and again at inc-063, which swapped the bespoke first-line identification step for the single identification surface (`commodities/identification`); every step target is now a plain `flowPageTarget`.
- **`flow/run-state.js` — session-side presentation state.** Run POSITION is stateless (derived from the page being posted); COMPLETION is a session record `{ journeyId, phase: active|complete }` behind the SESSION port (`openingRun`/`setOpeningRun`; cookie in stub mode, yar in real mode). It cannot be derived from answers: a zero-record identification pass leaves no footprint, and importType never survives a real-mode round-trip (Mapper A drops service-routing answers). The filter POST opens the run only for a journey at its genuine start — no committed NOTIFICATION answers pre-commit; an earlier filter answer alone (a corrected poao pick) still counts as unstarted — or a run already underway; the hub GET flips `active` → `complete` — reaching the hub by ANY route ends run mode — and the completed record persists as the "entered through the filter" memory the entry guard needs in real mode.
- **`flow/entry-guard.js` — the deep-link guard (D10).** A plugin-level `onPreHandler` sends a FRESH journey — no committed notification answers and never through the filter — from any post-filter journey page to the filter. Both the guard and the genuine-start check use `hasCommittedNotificationAnswers`, which counts only answers the USER entered: a key must be a page-collected obligation (`registry.byId`, non-`system`) and must not be importType. Two kinds of key are therefore ignored. importType is the filter's own service-routing pick, not a start, and it never survives a real-mode round-trip. Keys that are not obligations belong to the BACKEND: real mode rebuilds `answers` from the stored notification on every load, so a freshly-created DRAFT arrives already carrying its server-minted `referenceNumber` (`notificationToAnswers` round-trips it). Counting either would make stub and real mode diverge — real mode would think every new journey had already started, never open the run and never guard a deep link. The origin page's strip uses the same check, for the same reason. "Been through the filter" is the session record's job, in both conditions. Exempt: the dashboard and its row actions, `start`, the filter and its holding page. After the first notification commit (or with a recorded filter pass) deep links behave normally; direct navigation on a started journey must keep working — the E2E helpers rely on it. This guard is also why importType's spec mandate is `{}`: the field is enforced by entry routing plus the controller's `requiredOneOf`, never by the obligation model.

Precedence extends the established chain by one link: **hub exit > change context > run sequence > `nextInSection`**. `kit.nextTarget` consults `kit.runTarget` (null unless the run is active for the current journey) before `nextInSection`; the identification surface's "Save and finish" exits through it like any other page save. With no session record every redirect is byte-for-byte the pre-run behaviour.

## Roll-ups live flow-side

`flow/section-status.js` and `flow/task-rows.js` are the flow-aware roll-ups, and they sit in `flow/` on purpose. They need two things the engine must not know: the dispatch index (`collectsOf`) and the flow's page groupings.

- `taskRows` (`flow/task-rows.js`) — the hub's PAGE-LEVEL task rows (inc-061, Sam's D11 ruling): each row names its flow pages, and its status parts default to the union of those pages' collects. Two rows instead carry **collection facets** — `{ collection: 'commodityLines', except/only: ['animalIdentifiers'] }` — splitting one stored collection between the "What are you importing?" and "Animal identification details" rows (see [engine.md](engine.md) for facet semantics). The conditional transit-countries row is marked `conditional` and the hub hides it while its status is Not applicable.
- `rowStatus(row, answers, inScope)` — the engine's pure `statusOf` applied to the row's parts
- `sectionObligationIds(section)` / `sectionStatus(section, answers, inScope)` — the section-shaped equivalents, still consumed by the review row, `analysis/simulate.js` and `dump.js`
- `readyForCheckYourAnswers(answers, inScope)` (`flow/section-status.js`) — the submit-readiness gate: true once every task row is Fulfilled, Not applicable or Optional. Re-expressed over rows at inc-061 with submit-readiness UNCHANGED in substance — the rows partition the old answer-section obligation union minus `importType` (optional, service-routing, could never block), and `flow/task-rows.test.js` proves the two roll-ups agree across submittable and gapped journey states. Consulted both by the review section's authored gate and by `submitJourney` in `engine/write.js`.

The dependency direction is one-way: flow calls the engine's `statusOf` downward, never the reverse. The engine still needs submit-readiness inside `makeScope`, so boot hands `readyForCheckYourAnswers` down into `engine/read.js` via `configureReadyForCheckYourAnswers` (`routes.js`). The engine keeps zero `flow/` imports. See [architecture.md](architecture.md) for the full boot sequence and [engine.md](engine.md) for the status values themselves.

## Repeated-name dedupe footgun

On `transit-countries`, every select row posts under the same `transitedCountries` name, so a submission can carry the same country code twice (two rows set to the same country). The POST handler must dedupe with `[...new Set(...)]` before committing — without it, duplicate country codes persist into the store.
