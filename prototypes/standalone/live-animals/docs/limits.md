# Honest limits

The spike ends with a go verdict, but the verdict is only trustworthy if its edges are named. This page records what the paradigm does not do, what it does at a cost, and where the first growth would have to happen. None of these broke the spike. All of them are real.

## Cross-frame conditionality (modelled in inc-031)

`activatedBy` resolves a reference in four ways, keyed by an OPT-IN `frame`
(see [engine/evaluate/predicate.js](../engine/evaluate/predicate.js) and DESIGN-DELTA #3):

- no `frame` — the referenced obligation is a sibling inside the same collection item → resolve within that item's frame; anything else → resolve as a top-level answer (the pre-M2 behaviour, unchanged)
- `frame: "enclosing"` — resolve in the nearest ENCLOSING frame that holds the reference (walks outward, so it works two frames out)
- `frame: "anyItem"` — the reference lives in the ITEMS of a collection; the predicate holds if ANY item satisfies it

This was the first genuine growth of the model. A nested obligation gated on a field of its enclosing frame — `commodityLines[i].animalIdentifiers[j].permanentAddress` depending on `commodityLines[i].commoditySelection` — is now expressible via `frame: "enclosing"`, and a notification-level field gated across all commodity lines (`countyParishHoldingCph`) via `frame: "anyItem"`.

The SCOPE + WIPE resolution is done and proven (`engine/evaluate/cross-frame.test.js`), but with SYNTHETIC obligations — no live carrier is registered until inc-033..035. Two follow-ons are deliberately deferred to the carrier increments (see DESIGN-DELTA #3): `complete.js#entryComplete` does not yet resolve enclosing gates (a required enclosing-gated field would be treated as owed even off-gate), and `analysis/reachability.js` will need extending once a frame gate is registered.

Conditionality is proven for indexed and same-frame cases against live carriers, and for cross-frame cases against synthetic ones. Depth-2 and equals-gated / required-sibling item-conditionality are engine-supported but do not yet have a live carrier — see [Depth-2 and equals-gated conditionality have no live carrier](#depth-2-and-equals-gated-conditionality-have-no-live-carrier) below. See [obligation-model.md](obligation-model.md) for what the vocabulary covers.

## Depth-2 and equals-gated conditionality have no live carrier

The car named-driver section was the last live carrier for a family of behaviours the engine still fully supports. Its removal (inc-025) left them dormant — the engine SOURCE is unchanged; only the car-domain tests and fixtures that exercised them were removed, and the coverage was honestly shrunk rather than force-re-pointed.

Behaviours now engine-supported but without a live instance:

- **Depth-2 nesting.** A collection item holding another collection (`drivers[i].claims[j]`). The surviving `commodityLines` is depth-1. M2's `animalIdentifiers` restores a depth-2 carrier.
- **Equals-gated item-conditionality.** An item field owed on `sibling === value`. The surviving item-conditional (`commodityLines[i].numberOfPackages`) is INCLUDES-gated, not equals-gated.
- **Required-sibling item-conditionality feeding completeness.** `windscreenProvider` was REQUIRED, so its gate fed `entryComplete` and could hold a section In progress / lock `readyForCheckYourAnswers` (submit readiness). `numberOfPackages` is OPTIONAL, so no live item-conditional field gates completeness.
- **Path-addressed store ops at depth.** `appendEntryAt` / `updateEntryAt` / `removeEntryAt` on a `['drivers', i, 'claims']` path, and reconcile-driven field-level destruction inside a nested item. Live collections reach these only through the depth-1 `appendEntry` / `updateEntry` / `removeEntry` wrappers (see [engine/write.js](../engine/write.js)), covered via the commodities and documents append contracts in [contract.test.js](../contract.test.js).

The synthetic-obligation tests in [nested.test.js](../nested.test.js) and [item-conditional.test.js](../item-conditional.test.js) keep the pure engine guarantees (nested-collection completeness, sibling-identity gate resolution) pinned without a car carrier. inc-029 re-points the root model / write-through fixtures at the live domain; M2 (inc-030/031) restores live depth-2 and required-sibling carriers.

## Currency cleaning has no live carrier

The car modifications value page (`modValue`) was the last LIVE field that ran the `currency()` validator — cleaning `£1,500` to `1500` on the way into the store and echoing the raw input back on a malformed amount. It went with the modifications section in inc-026. No live-animals field collects a currency amount; the only other currency in the domain was the car quote's `premium` — `system`, computed on demand and never stored — which went with the quote feature in inc-028.

The engine capability is unchanged: `currency()` lives in [lib/validate/validators.js](../lib/validate/validators.js) and is unit-tested directly in [lib/validate/validate.test.js](../lib/validate/validate.test.js). The handler-level T1 guarantee — a controller persists the CLEANED value and, on error, re-renders the RAW input committing nothing — is kept pinned in [t1-currency-persist.test.js](../t1-currency-persist.test.js) against a SYNTHETIC currency controller only, dormant until a live-animals currency field returns.

## Two identity vocabularies, bridged not unified

The spike addresses obligations in two forms:

- **template addresses**, index-free (`commodityLines.commoditySelection`) — used by dispatch coverage and `byPath` lookups
- **instance path keys**, bracketed (`commodityLines[0].commoditySelection`) — used by scope and wipe

They are bridged, not unified. `ownerOfObligation` in [flow/dispatch.js](../flow/dispatch.js) strips instance indices before looking up an owner, so a per-instance change link can still find its page. The tax is documentation and care: every surface speaks one vocabulary, and a reader has to know which. See [architecture.md](architecture.md).

## Ownership at depth is derived, not declared

The dispatch index assigns a sub-obligation to the page that owns its nearest collection ancestor ([flow/dispatch.js](../flow/dispatch.js)). A collection's `collects` never enumerates its item fields.

The consequence: add a new sub-field to a collection item and it silently inherits the collection's page. Coverage stays total and unambiguous, but you cannot redirect ownership of one field at depth to a different page. If a future journey needs that, ownership has to become declarable per field. See [add-a-field.md](add-a-field.md).

## Edit-in-place has no UI route

`updateEntry` (and its path-addressed `updateEntryAt` primitive) is engine source, but no feature controller calls the update path — in the browser, collections change through add and remove only. The primitive lost its direct test when the car `store-ops.test.js` was removed with the named-driver section; it is re-pointed at the live domain in inc-029 (see [Depth-2 and equals-gated conditionality have no live carrier](#depth-2-and-equals-gated-conditionality-have-no-live-carrier)).

Check your answers is deliberately shallow at depth: it composes one row per collection entry (Commodity N, Document N), but shows no per-entry field detail — changing an entry means going back through its loop hub. Field-level wipe inside a collection item is proven at the model layer through `commodityLines[i].numberOfPackages` (see [item-conditional.test.js](../item-conditional.test.js)); the depth-2 case (a driver claim leaving windscreen) lost its carrier with the named-driver section.

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

- **Re-entry is session-scoped, not identity-scoped.** The dashboard lists and acts on only the references the session already knows ([features/dashboard/controller.js](../features/dashboard/controller.js)); there is no per-user owner check on the record and no backend browse. The deliverable is the shape — session-known list, then reconcile on load — not an identity integration. Do not treat the session cookie as auth in production.
- **The prod seams are design notes, not verified integrations.** The session stub collapses the production session-id plus Redis indirection into one cookie. The records stub names its intended backend endpoints (`POST /applications`, `PATCH .../answers` and so on). Neither mapping has been checked against the real service.
- **Multi-draft is per session, not per account.** The session's known-journeys list holds several drafts, but a user on a new device starts with an empty dashboard. Cross-device recovery needs a backend owner field — an open product question, not a decision this spike made.

See [persistence.md](persistence.md) for the full port contracts.

## Review coverage was JavaScript only

The best-practices sweep that fed the cleanup covered `.js` files only. The `.njk` templates and the route wiring never got a sweep. Template-level GDS component usage, and copy correctness beyond the hub fix that was found by other means, are unexamined.
