# Flow, gates and dispatch

How the spike decides what comes next, what is reachable, and which page owns each answer. The code lives in `flow/` — read [architecture.md](architecture.md) first for where `flow/` sits between `features/` and `engine/`.

## The flow is the spine

`flow/flow.js` exports `sections`: an ordered array of sections, each holding an ordered list of pages. It owns two things — sequence and gating — and nothing else. No copy, no headings, no validation, no template choice. Those all live per page in `features/` (see [features.md](features.md)).

Sections survive from v1 because the journey shape needs them: the user runs through a section's pages in order, then returns to the hub, and the hub renders one task per section.

Each page entry is the feature's `page.js` identity leaf (`{ id, slug }`), imported by reference. Page identity is a shared JS object, not a string that happens to match.

`flow.js` also derives three views:

- `allFlowPages` — every page across all sections, flattened, each tagged with its `sectionId`
- `sectionOfPage(pageId)` — the first section containing the page
- `nonQuoteSections` — every section except `get-your-quote` (the quote-readiness roll-up iterates these)

### `dynamic: true` is a presentation axis, not a gate

One section (`protected-ncd`) carries `dynamic: true` (the others, `named-driver` and `modifications`, were removed in inc-025 and inc-026). It marked add-on rows the hub rendered only once picked — a presentation choice, distinct from the gate that decides reachability. The hub's add-on row machinery went with the `addons` picker in inc-024; nothing writes the `addons` answer any more, so this section's derived gate never passes and it renders nowhere. The marker stays on it purely as part of the vendored shape and dies with the section in inc-027 — do not use it for a live-animals section.

## Gates are derived by default

A gate is a pure `(scope) => boolean` that decides whether a page or section is reachable. `flow/gates.js` exports the two evaluators, `pageGatePasses` and `sectionGatePasses`.

By default no gate is authored. A step with no `gate` is reachable exactly when some obligation it collects is in scope. The derivation reads the same boot-built dispatch index the status roll-up reads (a page's `collects`, a section's pages' `collects` combined), so the flow never restates the model's activation rules as hand-typed `inScope.has('<key>')` strings.

This earned its place the hard way. Four of the five gates the flow used to author were bare `inScope.has('<key>')` restatements of the obligation model, coupled to it by a raw string. If the string and the model diverged, you got a ghost Not applicable row on the hub, or a quote that could never unlock. Deriving both from one source makes the invariant hold by construction:

> A derived gate passes exactly when the section's status is not Not applicable.

`flow/gates.test.js` pins this exhaustively — it checks the equivalence for every dynamic section across every enumerable scope state (`analysis/reachability.js`), not a sample of personas.

Two deliberate edges:

- **Authored gates are the override.** Write a `gate` only for a flow-level fact the model cannot express. Exactly one exists: `get-your-quote`'s `gate: (scope) => scope.readyForQuote`. An authored gate wins outright — the derivation is never consulted.
- **Empty `collects` derives to reachable.** A step that collects nothing (the quote-summary page — its only obligation is the `system` premium, which no page collects) passes its derived gate. Restricting such a step is exactly what an authored gate is for, and quote-summary's section has one.

## Fail loud before boot

The derived gate refuses to answer until `buildDispatch()` has run. `flow/gates.js` throws if consulted first.

The reason is an ambiguity: `collectsOf(pageId)` legitimately returns `[]` for a known page that collects nothing, and its `?? []` fallback would return the same for every page if the index were simply not built yet. Unbuilt and collects-nothing are indistinguishable from the caller's side. Without the guard, a derived gate consulted before boot would silently gate every page and section out — no error, just an empty journey. So `flow/dispatch.js` tracks `isDispatchBuilt()` and `flow/gates.js` checks it before every derived answer.

This mirrors the engine's `configureReadyForQuote` default, which throws until boot configures it — the same fail-loud stance at both ends of the boot seam (see [architecture.md](architecture.md)).

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
- `readyForQuote(answers, inScope)` — true once every non-quote section is Fulfilled or Not applicable

The dependency direction is one-way: flow calls the engine's `statusOf` downward, never the reverse. The engine still needs quote-readiness inside `makeScope`, so boot hands `readyForQuote` down into `engine/read.js` via `configureReadyForQuote` (`routes.js`). The engine keeps zero `flow/` imports. See [architecture.md](architecture.md) for the full boot sequence and [engine.md](engine.md) for the status values themselves.
