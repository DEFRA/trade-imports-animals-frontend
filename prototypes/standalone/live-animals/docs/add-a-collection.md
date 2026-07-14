# How to add a collection with a conditional field

A collection is a repeating obligation: the user adds 0 or more entries, each
with its own fields. This guide shows you how to add one, including a field
that only applies to some entries.

Two reference implementations exist:

- [`features/documents/`](../features/documents/) — a top-level collection
  (depth 1) as a single-page add-another loop: entry form and read-back
  table on one page
- [`features/commodities/`](../features/commodities/) — a top-level collection
  with a cardinality mandate, an item-scoped conditional field and the
  list/entry sub-page split

The depth-2 case (a collection inside a collection) was the car
`features/named-driver/` feature, removed in inc-025. The engine still
supports nesting — see [step 7](#7-nesting-a-collection) — but there is no
live nested collection until M2's `animalIdentifiers` (see
[limits.md](limits.md)).

Follow the steps against `features/documents/` and
`features/commodities/` — every snippet below traces to one of them.

## 1. Declare the collection in the model

A collection is an ordinary obligation that carries `collection: true` and a
real `item: [...]` array of nested sub-obligations. From
[`features/commodities/obligations.js`](../features/commodities/obligations.js):

```js
export const commoditySelection = { id: 'commoditySelection', required: true }
export const numberOfAnimalsQuantity = {
  id: 'numberOfAnimalsQuantity',
  required: true
}

export const commodityLines = {
  id: 'commodityLines',
  collection: true,
  item: [
    commoditySelection,
    typeSelection,
    speciesSelection,
    numberOfPackages,
    numberOfAnimalsQuantity
  ],
  requiredAtLeastOne: true
}
```

The collection-level facts:

- `activatedBy` (optional) puts the whole collection in scope — it references
  an obligation object by identity (a real sideways import from the owning
  feature). The car `drivers` collection was the live example of a gated
  collection; it was removed in inc-025, so no live collection carries an
  `activatedBy` today (M2 restores one — see [limits.md](limits.md)).
  `commodityLines` and `documents` have none, so they are always live.
- `wipeOnExit` (meaningful only with `activatedBy`) means deselecting the
  activating answer destroys the whole subtree — every entry and everything
  inside it. Data is destroyed, not hidden, so re-activating starts blank.
- `requiredAtLeastOne` makes an in-scope collection owe at least one entry.
  Omit it — as `documents` does — and an empty collection is complete, but
  every entry that does exist must still be complete
  ([`engine/evaluate/complete.js`](../engine/evaluate/complete.js)).

Sub-obligation ids are frame-relative: `commoditySelection`, not
`commodityLines.commoditySelection`. The id is the key inside each entry
object (`answers.commodityLines[0].commoditySelection`) and the DOM field
name. Ids must be path-safe — no `.`, `[` or `]` — or boot throws
([`flow/dispatch.js`](../flow/dispatch.js)).

## 2. Add the item-scoped conditional field

An item-scoped conditional is a sub-obligation whose `activatedBy` references
a sibling — another obligation in the same `item` list. There is no new
syntax and no marker:

```js
export const numberOfPackages = {
  id: 'numberOfPackages',
  activatedBy: {
    obligation: commoditySelection,
    includes: PACKAGE_COUNT_COMMODITIES
  },
  wipeOnExit: true
}
```

The same three operators apply as everywhere else: `equals`, `includes`,
`present`. The engine infers item-relative resolution from sibling identity:
because `commoditySelection` sits in the same `item` list, the reference
resolves within each entry's own frame
([`engine/evaluate/predicate.js`](../engine/evaluate/predicate.js)). So
`numberOfPackages` is in scope for exactly the lines whose own commodity is
one of the listed values. Changing a line's commodity out of the list wipes
that line's stale package count — a field-level wipe inside one instance.
(`numberOfPackages` is INCLUDES-gated and optional. The `equals` flavour and
a REQUIRED item-conditional field were the car `windscreenProvider` gated on
its sibling `claimType`; that carrier went with named-driver in inc-025, so
the engine still supports both but neither has a live instance until M2 — see
[limits.md](limits.md).)

The reveal markup (show or hide the field as the user picks a value) is
page-side, in your entry template. Scope and wipe stay model-side.

## 3. What the engine gives you free

You write no engine code. Once the model declares the collection:

- **Per-instance scope.** The registry walk materialises the tree against the
  answers, so a two-line journey yields
  `commodityLines[0].commoditySelection` and
  `commodityLines[1].commoditySelection` as distinct instances, each scoped
  independently.
- **Per-path wipe.** `reconcile` names exactly the out-of-scope paths that
  still hold data; the write layer destroys them.
- **Per-item completeness.** An entry is complete when every required
  sub-obligation is satisfied; a collection is complete when its cardinality
  mandate is met and every existing entry is complete
  ([`engine/evaluate/complete.js`](../engine/evaluate/complete.js)).
- **Dispatch coverage at depth.** Boot asserts every obligation at every
  depth is collected by exactly one page. Sub-obligations inherit their
  owning page from the nearest collection ancestor, so your list page
  declares only `collects: ['documents']`
  ([`flow/dispatch.js`](../flow/dispatch.js)).

## 4. Build the loop pages

A collection needs a bespoke loop controller, deliberately hand-written —
a repeating collection has no uniform-widget projection, so each loop owns
its own rows and copy (see [decisions.md](decisions.md)). Two layouts are
live:

### The single-page loop (entry form + read-back on one page)

[`features/documents/controller.js`](../features/documents/controller.js)
is the page the flow knows about. It declares the `collects` and renders
the entry form and the read-back table of added entries on the same page,
with a per-row Remove action.

`state.collectionView(answers, ['documents'])` returns facts only:
`[{ index, path, entry, complete }]`. No hrefs, no labels, no row
view-models. The controller hand-builds its rows over those facts:

```js
const rows = state
  .collectionView(answers, ['documents'])
  .map(({ index, entry }) => [
    { text: cellText(entry.accompanyingDocumentReference) },
    { text: cellText(entry.accompanyingDocumentType) },
    { text: dateText(entry.accompanyingDocumentDateOfIssue) },
    { html: removeCell(index) }
  ])
```

The POST branches: `action === 'add'` validates the entry fields and
appends; otherwise Continue advances with no write. The append mints the
entry's identity `(documents, arrayIndex)` — until that POST the draft
lives only in the payload, never a half-created entry in the store.

```js
state.appendEntry(request, h, 'documents', entry)
```

`removeEntry` splices the entry — destroying its whole subtree — then
reconciles, so anything left dangling out of scope is pruned too
([`engine/write.js`](../engine/write.js)).

### The sub-page split (list hub + entry sub-pages)

The commodities loop keeps the split layout: the list page
([`features/commodities/list.controller.js`](../features/commodities/list.controller.js))
declares the `collects`, renders the Commodity-N rows and offers
Add / Remove / Continue; its `action === 'add'` POST redirects to a SELECT
sub-page (which appends — the same identity-minting write) and a DETAILS
sub-page edits the same entry in place. The nested `animalIdentifiers`
loop follows the same split one level down.

### Thread the change context through the loop

A collection reached from a check-your-answers Change link carries
`?change=1`. Wrap every internal link and PRG redirect (row actions, back
links, add/remove/save round-trips, invalid-index guards) in
`kit.withChangeContext(request, href)` so the context survives the loop,
and resolve the loop's exiting Continue with
`kit.exitTarget(request, fallback)` — hub exit beats change context beats
the fallback. Only the exit repoints to check-your-answers; mid-loop
actions must never bounce there early.

## 5. Keep the guards

Two guards protect collection writes. Do not remove them, and copy the first
into any new nested controller.

1. **Validate the parent index in nested add controllers.** The generic store
   primitive appends at whatever path you give it. An out-of-range parent
   index would fabricate a phantom parent entry. The car nested claim form's
   `validDriver` guard did this — redirecting a malformed or out-of-range
   `{driver}` param to the hub instead of writing — and went with named-driver
   in inc-025. There is no live nested add controller today; copy this guard
   into the first one M2 brings back (see [limits.md](limits.md)).
2. **The engine rejects non-integer indices.** `isValidIndex` in
   [`engine/write.js`](../engine/write.js) uses `Number.isInteger` because
   `splice(NaN, 1)` coerces to `splice(0, 1)` — a malformed remove URL would
   destroy the wrong (first) instance.

## 6. Extend the contract test

[`contract.test.js`](../contract.test.js) pins that each page commits exactly
what it declares. A single-page loop commits via its own `action === 'add'`
POST (the documents case); a sub-page split commits via the entry sub-page's
append handler while the list page declares the `collects` (the commodities
case). Add a case shaped like the matching one:

1. Assert the loop page's declaration: `documents.meta.collects` equals
   `['documents']`.
2. Drive the committing add handler with a valid payload.
3. If the collection is gated, seed the activating answer so the collection
   stays in scope — otherwise reconcile wipes the fresh write. Always-live
   collections need no seed.
4. Assert the handler committed exactly the declared ids.

## 7. Nesting a collection

To nest, put a collection obligation inside another collection's `item`
list. Everything recurses — scope, wipe, completeness and dispatch coverage
all descend with no engine changes. The car `features/named-driver/` feature
did exactly this before inc-025 (each driver owned a nested `claims`
collection, reaching `drivers[i].claims[j].claimType`); M2's
`animalIdentifiers` under `commodityLines` will be the next live instance.
The examples below use that planned shape.

The nested sub-hub is the same library call one level deeper:

```js
state.collectionView(answers, [
  'commodityLines',
  lineIndex,
  'animalIdentifiers'
])
```

and the nested writes take a path: `state.appendEntryAt(request, h,
['commodityLines', i, 'animalIdentifiers'], entry)`. Remember guard 1 above —
validate the parent index first.

## The one hard limit

The model cannot express cross-frame conditionality: a sub-field gated on a
value in an enclosing frame, such as a future
`commodityLines[i].animalIdentifiers[j].x` gated on `commodityLines[i].y`.
`activatedBy` resolves same-frame siblings and top-level answers only. See
[limits.md](limits.md).
