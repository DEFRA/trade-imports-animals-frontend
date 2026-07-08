# Flow, gates and dispatch

How the spike decides what comes next, what is reachable, and which page owns each answer. The code lives in `flow/` — read [architecture.md](architecture.md) first for where `flow/` sits between `features/` and `engine/`.

## The flow is the spine

`flow/flow.js` exports `sections`: an ordered array of sections, each holding an ordered list of pages. It owns two things — sequence and gating — and nothing else. No copy, no headings, no validation, no template choice. Those all live per page in `features/` (see [features.md](features.md)).

Sections survive from v1 because the journey shape needs them: the user runs through a section's pages in order, then returns to the hub, and the hub renders one task per section.

Each page entry is the feature's `page.js` identity leaf (`{ id, slug }`), imported by reference. Page identity is a shared JS object, not a string that happens to match.

`flow.js` also derives three views:

- `allFlowPages` — every page across all sections, flattened, each tagged with its `sectionId`
- `sectionOfPage(pageId)` — the first section containing the page
- `answerSections` — the answer-gathering sections the `readyForCheckYourAnswers` roll-up iterates: every section **except** `review`. Review is excluded because it owns the `declaration` obligation, confirmed inside the review section itself — folding it into the readiness roll-up that _gates_ review would deadlock. `readyForCheckYourAnswers` rolls up "is every answer section Fulfilled, Not applicable or Optional" — the submit precondition, and the fact the review section's authored gate reads.

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

The subtlety is a circularity: `declaration` is confirmed _inside_ the review section, so if the readiness roll-up counted the review section, gating review on it would deadlock — you could never confirm the declaration to make review reachable. That is why `readyForCheckYourAnswers` iterates `answerSections` (every section except `review`). Submit safety is unaffected: the declaration page's own validator enforces `declaration === 'confirmed'` before `submitJourney` runs, so excluding review from the readiness roll-up does not let an unconfirmed journey submit.

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

`flow/navigation.js` is two pure functions over the flow and the gates:

- `sectionEntry(sectionId, scope)` — the first gate-passing page of a section. The hub uses it for each task's href.
- `nextInSection(pageId, scope)` — the next gate-passing page after this one in the same section, else the hub.

Together they produce the journey's shape: a linear run through a section, skipping pages whose gates fail (no commercial transporter chosen means no transporter-select page), then back to the hub. `shared/kit.js`'s `nextTarget` wraps `nextInSection` with one exception — a `?change=1` request returns to check-your-answers instead.

Nothing here derives scope or mutates data. Navigation only reads the scope facts the state layer already computed.

## Roll-ups live flow-side

`flow/section-status.js` is the flow-aware roll-up, and it sits in `flow/` on purpose. It needs two things the engine must not know: the dispatch index (`collectsOf`) and the flow's section list.

- `sectionObligationIds(section)` — the union of every obligation the section's pages collect
- `sectionStatus(section, answers, inScope)` — the engine's pure `statusOf` applied to that union
- `readyForCheckYourAnswers(answers, inScope)` — the submit-readiness gate: true once every answer section is Fulfilled, Not applicable or Optional (it iterates `answerSections`, which excludes `review`). Consulted both by the review section's authored gate and by `submitJourney` in `engine/write.js`.

The dependency direction is one-way: flow calls the engine's `statusOf` downward, never the reverse. The engine still needs submit-readiness inside `makeScope`, so boot hands `readyForCheckYourAnswers` down into `engine/read.js` via `configureReadyForCheckYourAnswers` (`routes.js`). The engine keeps zero `flow/` imports. See [architecture.md](architecture.md) for the full boot sequence and [engine.md](engine.md) for the status values themselves.
