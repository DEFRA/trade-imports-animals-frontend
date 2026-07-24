# Flow, gates and dispatch

How the prototype decides what comes next, what is reachable, and which page owns each answer. The code lives in `flow/` — read [architecture.md](architecture.md) first for where `flow/` sits between `features/` and `engine/`.

## The flow is the spine

`flow/flow.js` exports `sections`: an ordered array of sections, each holding an ordered list of pages. It owns two things — sequence and gating — and nothing else. No copy, no headings, no validation, no template choice. Those all live per page in `features/` (see [features.md](features.md)).

Sections are the navigation spine. The user runs through a section's pages in order, then returns to the hub. `nextInSection`, the opening-run sequence and the gate derivations all walk them. The hub itself renders page-level task rows (`flow/task-rows.js`, below), a finer grouping than sections; both grammars sit side by side.

Each page entry is the feature's `page.js` identity leaf (`{ id, slug }`), imported by reference. Page identity is a shared JS object, not a string that happens to match.

The sections, in order:

| Section                | Pages                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `start`                | dashboard, import-type filter                                                                   |
| `origin`               | origin                                                                                          |
| `commodities`          | commodity search, consignment details                                                           |
| `animalIdentification` | animal identification                                                                           |
| `consignment`          | import reason, import purpose, additional details                                               |
| `documents`            | documents                                                                                       |
| `addresses`            | addresses, CPH number                                                                           |
| `transport`            | port of entry, transit countries, transporters, transporter select, private transporter details |
| `contact`              | consignment contact select                                                                      |
| `review`               | check-your-answers, declaration, confirmation                                                   |

`flow.js` also derives three views:

- `allFlowPages` — every page across all sections, flattened, each tagged with its `sectionId`
- `sectionOfPage(pageId)` — the first section containing the page
- `answerSections` — every section **except** `review`. Review is excluded because it owns the `declaration` obligation, confirmed inside the review section itself — folding it into the readiness roll-up that _gates_ review would deadlock.

## Gates are derived by default

A gate is a pure `(scope) => boolean` that decides whether a page or section is reachable. `flow/gates.js` exports the two evaluators, `pageGatePasses` and `sectionGatePasses`.

By default no gate is authored. A step with no `gate` is reachable when **both** clauses hold: its prerequisites are answered, and some obligation it collects is in scope. The derivation reads the same boot-built dispatch index the status roll-up reads (a page's `collects`, a section's pages' `collects` combined), so the flow never restates the model's activation rules as hand-typed `inScope.has('<key>')` strings.

Deriving both the gate and the status from one source makes an invariant hold by construction:

> Absent prerequisites, a derived gate passes exactly when the section's status is not Not applicable.

If a gate hard-coded `inScope.has('<key>')` and that string diverged from the model, you would get a ghost Not applicable row on the hub, or a section that could never unlock. `flow/gates.test.js` pins the equivalence exhaustively — it checks it for a derived section's gate across every enumerable scope state (`analysis/flow-reachability.js`), holding prerequisites satisfied so the clause under test is isolated.

### The prerequisites clause — mandate-derived sequencing

The prerequisites clause is what stops every row from being a live link on a blank journey. It is derived, not a hand-authored graph. `flow/prerequisites.js` computes, for any page or section, the `ENFORCED_AT_CONTINUE` obligation ids owned by a **strictly-earlier** flow step, from flow order + the dispatch index + each obligation's own membership of that set. A step is available only once every such prerequisite is answered (`scope.answered`, which is instance-aware — an item-level obligation like `commodityLines[i].commoditySelection` counts as answered once **any** line fills it).

`ENFORCED_AT_CONTINUE` (`flow/obligation-source.js`) is the set `{ countryOfOrigin, commoditySelection }`. So: origin is always open; commodities opens once `countryOfOrigin` is answered; every section after commodities opens once `commoditySelection` is answered. A step never blocks on its **own** continue obligation, only strictly-earlier ones — commodities is not gated by its own `commoditySelection`. An obligation outside `ENFORCED_AT_CONTINUE` is never a prerequisite.

Two edges:

- **Authored gates are the override.** Write a `gate` only for a flow-level fact the model cannot express. An authored gate wins outright — the derivation is never consulted. Exactly one exists: the `review` section's `gate: (scope) => scope.readyForCheckYourAnswers` (below).
- **Empty `collects` derives to reachable.** A step that collects nothing passes the in-scope clause of its derived gate (its prerequisites still apply). `inScopeReachable` returns `true` for an empty obligation list. Restricting such a step further is exactly what an authored gate is for.

### The review section gates on submit-readiness

"Check and submit" (the `review` section) must not open until the whole notification is submit-ready. It cannot derive this from collects: its own `declaration` obligation is always in scope, so a derived gate would open it from the start. So it carries the flow's one authored gate, `(scope) => scope.readyForCheckYourAnswers`.

The subtlety is a circularity: `declaration` is confirmed _inside_ the review section, so if the readiness roll-up counted the review section, gating review on it would deadlock — you could never confirm the declaration to make review reachable. That is why `readyForCheckYourAnswers` iterates the answer task rows, which never include the review section's pages. Submit safety is unaffected: the declaration page's own validator enforces `declaration === 'confirmed'` before `submitJourney` runs, so excluding review from the readiness roll-up does not let an unconfirmed journey submit.

## Fail loud before boot

The derived gate refuses to answer until `buildDispatch()` has run. `flow/gates.js`'s `assertDispatchBuilt` throws if consulted first.

The reason is an ambiguity: `collectsOf(pageId)` legitimately returns `[]` for a known page that collects nothing, and its `?? []` fallback would return the same for every page if the index were simply not built yet. Unbuilt and collects-nothing are indistinguishable from the caller's side. Without the guard, a derived gate consulted before boot would silently gate every page and section out — no error, just an empty journey. So `flow/dispatch.js` tracks `isDispatchBuilt()` and `flow/gates.js` checks it before every derived answer.

Readiness has no corresponding boot requirement:
`engine/readiness-config.js` statically defaults to the real
`flow/section-status.js` roll-up. `configureReadyForCheckYourAnswers` is a test
override.

## The dispatch seam

`flow/dispatch.js` answers the reverse question: which page owns obligation X? The obligation model never names a page, yet the hub and check-your-answers need this lookup to build hrefs and Change links.

`buildDispatch(pages)` runs once at boot (`routes.js`, with `dispatchPages` from `features/index.js`). It inverts each page's `collects` declaration — an explicit array of obligation names on the controller's `meta`, the authored source of truth — into an obligation → page map, and enforces three things:

1. **Ids are path-safe.** An obligation id becomes both a store key and a segment of a dotted template address, so it must not contain `.`, `[` or `]` (`ID_UNSAFE`). A metacharacter would make addresses ambiguous — `commodityLines.commoditySelection` could not be told from a single stray-dotted id. Boot throws on the first unsafe id.
2. **No obligation has two owners.** Two pages declaring the same obligation throw at boot. See [one obligation, one page](#one-obligation-one-page) for why.
3. **Every obligation has one owner.** Coverage walks `walkObligations()` — every non-system obligation at every depth of the tree — and asserts each resolves to an owning page. Only `poApprovedReferenceNumber` and `responsiblePersonForLoad` are exempt through `SYSTEM_POPULATED`. `commodityType` is covered through its `commodityLines` ancestor and stored by the commodity search with the rest of each selected line. A forgotten `collects` is a startup crash, not a silent runtime hole.

After a successful build, three lookups are live: `pageOfObligation(id)`, `collectsOf(pageId)` and `slugOfPage(pageId)`.

### Ownership at depth is derived

A collection's `collects` names only the root (`commodityLines`), not its item fields. A sub-obligation is owned by the page that owns its nearest collection ancestor — `commodityLines.commoditySelection` resolves up the address chain (`ownerOfObligation` walks `ancestorTemplate`) to `commodityLines`, and so to the commodities page. This keeps coverage total without collections enumerating item ids. The accepted trade-off: you cannot redirect ownership of one field at depth to a different page.

### Two address vocabularies

`pageOfObligation` accepts both forms of an address:

- the **template** form — index-free dotted paths like `commodityLines.commoditySelection`, as `walkObligations()` yields them
- the **bracketed instance** form — `commodityLines[0].commoditySelection`, the pathKey vocabulary the engine's scope and wipe layer speaks (see [scope-and-wipe.md](scope-and-wipe.md))

`ownerOfObligation` normalises instance indices away (`[0]` → nothing) before walking the ancestor chain. This bridge is what lets a per-instance Change link on check-your-answers resolve its owning page. `flow/dispatch.test.js` pins both vocabularies.

## One obligation, one page

Dispatch is deliberately one-to-one. The engine would not care if two pages both wrote the same answer — a value is a value — but the check-your-answers Change link needs a single unambiguous target (`features/check-answers/controller.js` builds hrefs with `pageOfObligation` + `slugOfPage`). So `buildDispatch` throws the moment two pages claim one obligation.

When two parts of the journey both have a reason to capture the same answer, the pattern is: **many routes in, one page, one owner, one Change target.** Keep a single page that owns the obligation, and let the other routes link or redirect into it. Nothing in the coverage assertion changes.

One wrinkle if the shared page must sit structurally inside two sections: `sectionOfPage` returns the first section containing the page, and `nextInSection` walks only that section. Redirect targets are just URLs, so routes-in work; true dual membership would need a navigation rethink.

## Navigation

`flow/navigation.js` is pure functions over the flow and the gates:

- `sectionEntry(sectionId, scope)` — the first gate-passing page of a section, else the hub.
- `nextInSection(pageId, scope)` — the next gate-passing page after this one in the same section, else the hub.
- `rowEntry(row, scope)` / `rowGatePasses(row, scope)` — the task-row twins: a row enters at its first gate-passing page and is gated exactly as its FIRST page is, so the prerequisites clause drives row locking with no new derivation.

Together they produce the journey's shape: a linear run through a section, skipping pages whose gates fail (no commercial transporter chosen means no transporter-select page), then back to the hub. `shared/kit.js`'s `nextTarget` wraps `nextInSection` in `kit.exitTarget`, which resolves any exiting POST the same way: an explicit `exit=hub` submit wins, else a `?change=1` request returns to check-your-answers, else the fallback (`nextInSection` for a task page, the loop's own target for a collection list). Collection loops thread the `?change=1` context through their internal links and PRG redirects — only the loop's exit (the list page's Continue) repoints to check-your-answers; mid-loop add/remove/save actions never do.

Every task page renders three exits (`shared/save-actions.njk`): the primary save, a secondary named submit "Save and return to hub" (`name="exit" value="hub"`), and a "Cancel and return to hub" link. The named submit runs the page's POST handler unchanged — identical validation, the same commit path, only the success redirect differs — so a failing save-to-hub shows exactly the errors a failing save-and-continue would, and commits nothing. Cancel is a plain GET to the hub: it never posts, so the form input is discarded. The declaration page keeps a single submit — it is the submit action, not a task save.

Nothing here derives scope or mutates data. Navigation only reads the scope facts the state layer already computed.

## The opening run

A first pass through the journey is linear: entry filter → origin → commodity search → consignment details → import reason → conditional purpose → identification (a zero-record pass does not block) → additional details → hub. The hub is the resting state thereafter. Three flow modules carry it:

- **`flow/run.js` — the sequence, as config.** `RUN_STEPS` is an ordered page-id list; each step resolves its own target from scope via `flowPageTarget` (which returns `pagePath` when `pageGatePasses` holds, else `null` to skip the step). The conditional purpose page skips itself, and the consignment-details and identification pages skip themselves until a line exists via their prerequisites clause. `nextRunTarget(stepId, scope)` walks forward from the posting page's position to the first resolvable step, else the hub. Swapping a step touches only this config.
- **`flow/run-state.js` — session-side presentation state.** Run position is stateless (derived from the page being posted); completion is stored in a session map `{ [journeyId]: active|complete }` behind the SESSION port (`beginOpeningRun`/`completeOpeningRun`/`inOpeningRun`; cookie in stub mode, yar in real mode). It cannot be derived from canonical fulfilment: the map says that this session entered through the filter, not that a model obligation was answered. The journey-keyed phase persists that presentation fact (`hasEnteredThroughFilter`).
- **`flow/entry-guard.js` — the deep-link guard.** A plugin-level `onPreHandler` sends a fresh journey — no committed user fulfilment and never through the filter — from any post-filter journey page to the filter. The legacy-named `hasCommittedNotificationAnswers` counts only model answers the user entered: `userEntered(key)` requires a page-collected obligation (`obligationByName`, not in `SYSTEM_POPULATED`) and ignores flow-only `importType`. Real mode rebuilds those answers from `/fulfilments`, then overlays the session's flow-only values; neither backend notification projection participates. Exempt: the create POST and the entry filter (including its `not-available` holding sub-page); non-journey paths (dashboard, `/`) never match the journey prefix. After the first canonical commit (or with a recorded filter pass) deep links behave normally. `importType` carries no obligation mandate because entry routing and the controller's `requiredOneOf` enforce it.

Precedence: **hub exit > change context > run sequence > `nextInSection`**. `kit.nextTarget` consults the run target (null unless the run is active for the current journey) before `nextInSection`. With no session record every redirect is byte-for-byte the non-run behaviour.

## Roll-ups live flow-side

`flow/section-status.js` and `flow/task-rows.js` are the flow-aware roll-ups, and they sit in `flow/` on purpose. They need two things the engine must not know: the dispatch index (`collectsOf`) and the flow's page groupings.

- `taskRows` (`flow/task-rows.js`) — the hub's page-level task rows: each row names its flow pages, and its status parts default to the union of those pages' collects (`rowParts`). Two rows instead carry **collection facets** — `{ collection: 'commodityLines', except/only: ['animalIdentifiers'] }` — splitting the one stored `commodityLines` collection between the commodities row and the animal-identification row (see [engine.md](engine.md) for facet semantics). The `transitCountries` row is marked `conditional` and the hub hides it while its status is Not applicable.
- `rowStatus(row, answers, inScope, evaluation)` — the engine's pure `statusOf`
  applied to the row's parts.
- `sectionObligationIds(section)` / `sectionStatus(section, answers, inScope)` — the section-shaped equivalents, consumed by the review row, `analysis/simulate.js` and `dump.js`.
- `readyForCheckYourAnswers(answers, inScope)` (`flow/section-status.js`) — the submit-readiness gate: true once every task row is Fulfilled, Not applicable or Optional. Consulted both by the review section's authored gate and by `submitJourney` in `engine/write.js`.

Flow applies the bridge's `statusOf` to its page groupings. The bounded
reverse dependency is readiness: `engine/readiness-config.js` imports
`flow/section-status.js`'s `readyForCheckYourAnswers` as its static default,
and `bridge/scope.js` calls that adapter while building scope. The model keeps
zero `flow/` imports. See [architecture.md](architecture.md) for the dependency
layout and [engine.md](engine.md) for the status values themselves.

## Repeated-name dedupe footgun

On `transit-countries`, every select row posts under the same `transitedCountries` name, so a submission can carry the same country code twice (two rows set to the same country). The POST handler must dedupe with `[...new Set(...)]` before committing — without it, duplicate country codes persist into the store.
