# Honest limits

The spike ends with a go verdict, but the verdict is only trustworthy if its edges are named. This page records what the paradigm does not do, what it does at a cost, and where the first growth would have to happen. None of these broke the spike. All of them are real.

## Cross-frame conditionality is unmodelled

`activatedBy` resolves a reference in exactly two ways (see [engine/evaluate/predicate.js](../engine/evaluate/predicate.js)):

- the referenced obligation is a sibling inside the same collection item — resolve within that item's frame
- anything else — resolve as a top-level answer

There is no third case. A nested obligation gated on a field of its enclosing frame — for example `drivers[i].claims[j].excess` depending on `drivers[i].relationship` — has no representation in the vocabulary. Supporting it would force the first genuine growth of the model: an explicit frame-hop reference.

Conditionality is proven for indexed, same-frame and depth-2 cases. Cross-frame is the precise edge that is not proven. See [obligation-model.md](obligation-model.md) for what the vocabulary does cover.

## Two identity vocabularies, bridged not unified

The spike addresses obligations in two forms:

- **template addresses**, index-free (`commodityLines.commoditySelection`) — used by dispatch coverage and `byPath` lookups
- **instance path keys**, bracketed (`commodityLines[0].commoditySelection`) — used by scope and wipe

They are bridged, not unified. `ownerOfObligation` in [flow/dispatch.js](../flow/dispatch.js) strips instance indices before looking up an owner, so a per-instance change link can still find its page. The tax is documentation and care: every surface speaks one vocabulary, and a reader has to know which. See [architecture.md](architecture.md).

## Ownership at depth is derived, not declared

The dispatch index assigns a sub-obligation to the page that owns its nearest collection ancestor ([flow/dispatch.js](../flow/dispatch.js)). A collection's `collects` never enumerates its item fields.

The consequence: add a new sub-field to a collection item and it silently inherits the collection's page. Coverage stays total and unambiguous, but you cannot redirect ownership of one field at depth to a different page. If a future journey needs that, ownership has to become declarable per field. See [add-a-field.md](add-a-field.md).

## Edit-in-place has no UI route

`updateEntryAt` is a tested engine primitive (pinned in [engine/write-through-per-commit.test.js](../engine/write-through-per-commit.test.js) and [store-ops.test.js](../store-ops.test.js)), but no feature controller calls it. In the browser, collections change through add and remove only.

Check your answers is deliberately shallow at depth: it composes top-level claim rows and names the selected add-ons, but shows no per-driver or nested-claim detail — changing a driver means going back through the drivers hub. So the "change a claim away from windscreen" wipe is proven at the model layer, not through a browser edit.

## Derived gates bake in any-in-scope semantics

A derived gate passes when **any** obligation the step collects is in scope ([flow/gates.js](../flow/gates.js)). That matches today's behaviour because each conditional section's obligations share one activation literal.

A future section mixing conditional and unconditional obligations would get an always-true derived gate — the unconditional obligation is always in scope. The author must then write an authored `gate` override, which brings back exactly the hand-written restatement the derivation removed. The override slot exists for this reason. See [flow-and-gates.md](flow-and-gates.md).

## The trade-off ledger against v1

v1 put one generic renderer over config. v2 makes pages the spine. The costs were accepted knowingly:

| Cost             | Honest reading                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| File count       | About 22 controllers and 20 templates, against v1's single template plus two config files. Each file is small and greppable, but there are many of them.                    |
| Duplication risk | Real. The shared kit ([shared/kit.js](../shared/kit.js)) is a library that mitigates it — it does not eliminate it. Similar controllers can drift.                          |
| "Add a field"    | Honestly means three edits: a model entry, a controller edit and a template edit. v1 could sometimes do it with one data edit — but only for uniform standard-widget pages. |

What the costs buy: bespoke layout on every page, copy beside the markup that renders it, and onboarding that is "read the page you are changing" rather than "learn the engine and its config DSL".

## The stubs are honest, but they are stubs

- **Resume has no auth.** `GET /resume` serves the single global stub user's record to anyone who requests it ([features/resume/controller.js](../features/resume/controller.js)). The deliverable is the shape — load by user, then reconcile — not the missing identity integration. Do not copy the auth gap to production.
- **The prod seams are design notes, not verified integrations.** The session stub collapses the production session-id plus Redis indirection into one cookie. The records stub names its intended backend endpoints (`POST /applications`, `PATCH .../answers` and so on). Neither mapping has been checked against the real service.
- **Multi-draft per user is undecided.** The records stub keeps one active journey per user, last writer wins. Whether a user can hold several drafts is an open product question, not a decision this spike made.

See [persistence.md](persistence.md) for the full port contracts.

## Review coverage was JavaScript only

The best-practices sweep that fed the cleanup covered `.js` files only. The `.njk` templates and the route wiring never got a sweep. Template-level GDS component usage, and copy correctness beyond the hub fix that was found by other means, are unexamined.

## The claim form's logic lives beside its controller

A driver's nested claim form imports a view-model builder, payload parser and validators from a sibling module ([features/named-driver/driver-claim.controller.js](../features/named-driver/driver-claim.controller.js) uses `features/named-driver/claim-entry.js` and its `claim-entry.njk` template — the form the removed top-level claims feature used to own).

The shared pieces are logic and a value domain, not a renderer — the controller still picks its template and calls `h.view` itself. If a second consumer ever appears and the forms diverge, split them; do not grow the shared code into a renderer to avoid the split. See [features.md](features.md).
