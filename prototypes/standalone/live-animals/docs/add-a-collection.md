# How to add a repeatable collection

A collection is a group of obligations the user can add more than one of: the
consignment holds many commodity lines, a line holds many animal-identifier
records, the consignment holds many documents. Each occurrence is an
**instance** with its own fields. This guide shows you how to add one,
including a field that applies to only some instances.

Three live collections show the shape:

- [`features/documents/`](../features/documents/) — a top-level collection as a
  single-page add-another loop: the entry form and the read-back table sit on
  one page.
- [`features/commodities/`](../features/commodities/) — a top-level collection
  built as a two-page batch: a search page that reconciles the selection, and a
  consignment-details page that edits every line's quantities in place. This
  collection also carries a per-instance conditional field and a collection
  floor.
- The `animalIdentifiers` records inside each commodity line
  ([`features/commodities/animal-identification.controller.js`](../features/commodities/animal-identification.controller.js))
  — a collection nested one level down, with a per-instance count cap.

Every snippet below traces to one of them.

## 1. Declare the group and its members in the manifest

A collection is a **group obligation** plus the member obligations that point
at it. Both live in
[`model/obligations/obligations.js`](../model/obligations/obligations.js).

A group carries an `id` (a UUID) and a `name` (the A-facing id used as the
storage key and DOM field name). It carries no `status` and no value of its
own. It becomes a group purely because other obligations name it in their
`within`:

```js
export const commodityLine = {
  id: '20e5f607-1829-4c3d-8abc-06d7e8f9a0b2',
  name: 'commodityLines',
  requires: {
    minEntries: 1,
    errorCode: 'obligation.commodityLine.atLeastOne'
  }
}

export const commodityCode = {
  id: '21f60718-192a-4d4e-8bcd-17e8f9a0b1c3',
  name: 'commoditySelection',
  within: commodityLine,
  status: 'mandatory'
}
```

The `groups` array is derived, not hand-maintained — it is every obligation
some other obligation points at:

```js
export const groups = obligations.filter((o) =>
  obligations.some((other) => other.within === o)
)
```

Collection-level facts:

- **`within`** on a member references the group object by identity (a real
  import). A member with no `applyTo` is always in scope for every instance; a
  member with `applyTo` is scoped per instance (see step 2).
- **`requires`** on the group sets a floor. `{ minEntries, errorCode }` is a
  collection floor — `commodityLine` sets `minEntries: 1`, so a consignment
  with no lines never reaches submit. `{ anyOfIds, errorCode }` is a
  per-instance "at least one of" floor — the `animalIdentifiers` group requires
  each record to carry at least one of its six identifier obligations,
  referenced by literal id. Omit `requires` entirely — as `documents` does — and
  an empty collection is complete, but every instance that exists must still be
  complete.
- Member ids are the keys inside each instance object
  (`answers.commodityLines[0].commoditySelection`) and the DOM field names.
  They must be path-safe — no `.`, `[` or `]` — or `buildDispatch` throws at
  boot ([`flow/dispatch.js`](../flow/dispatch.js)).

Nesting is the same declaration one level deeper: a group whose `within` points
at another group. `unitRecord` (name `animalIdentifiers`) sits `within:
commodityLine`, so its instances live at
`answers.commodityLines[i].animalIdentifiers[j]`:

```js
export const unitRecord = {
  id: '385d6e7f-8091-4eb5-8234-8ef506172940',
  name: 'animalIdentifiers',
  within: commodityLine,
  requires: {
    anyOfIds: [
      /* the six identifier obligation ids */
    ],
    errorCode: 'obligation.unitRecord.identifiersRequired'
  }
}
```

## 2. Add a per-instance conditional field

A conditional member is one that carries an `applyTo` closure. The closure
decides, per instance, whether the field is in scope. You build it with a
helper from [`model/obligations/helpers.js`](../model/obligations/helpers.js) —
no new syntax on the obligation itself:

```js
export const numberOfPackages = {
  id: '252a3b4c-5d6e-4b82-8f01-5bc2d3e4f507',
  name: 'numberOfPackages',
  within: commodityLine,
  status: 'optional',
  applyTo: allowListed(commodityCode, PACKAGE_COUNT_COMMODITIES, null, [
    numberOfPackagesReason
  ])
}
```

`allowListed(gate, values, projectionGroup, reasons)` scopes the field to the
instances whose gate value is on the whitelist. The **projection group**
argument is what makes it work at depth:

- **`null` projection** — the gate and the gated field sit at the same identity
  level. `numberOfPackages` and its gate `commodityCode` are both `within
commodityLine`, so the field is in scope for exactly the lines whose own
  commodity code is whitelisted.
- **a group** — the gated field is deeper than its gate. The per-unit
  identifier fields (`passport`, `earTag`, …) are `within unitRecord` but gate
  on `commodityCode`, which lives one level up on the line. They pass
  `unitRecord` as the projection group so the line-level decision projects down
  onto every unit in that line.

When an instance falls out of scope, the engine wipes that instance's stale
value — a field-level wipe inside one instance, not a whole-instance delete.
The reveal markup (show or hide the field as the user types) is page-side, in
the entry template. Scope and wipe stay in the model.

## 3. What the engine gives you free

Once the manifest declares the group, you write no scope or wipe code. The
evaluator ([`model/obligations/evaluator.js`](../model/obligations/evaluator.js))
materialises the tree against the answers, so a two-line journey yields
`commodityLines[0]` and `commodityLines[1]` as independent instances, each
scoped on its own values.

- **Per-instance scope.** Every in-scope field of every instance is projected
  into the controller-facing scope through
  [`model/bridge/scope.js`](../model/bridge/scope.js).
- **Per-path wipe.** [`model/bridge/purge.js`](../model/bridge/purge.js) names
  exactly the out-of-scope paths that still hold data; the write layer destroys
  them.
- **Per-instance completeness.**
  [`model/bridge/collection-complete.js`](../model/bridge/collection-complete.js)
  answers whether one instance is complete; the group is complete when its
  `requires` floor is met and every instance is complete.
- **Dispatch coverage at depth.** Boot asserts every obligation, at every
  depth, is collected by exactly one page. A member inherits its owning page
  from the nearest ancestor group in the dotted path
  ([`flow/dispatch.js`](../flow/dispatch.js) `ownerOfObligation`), so a loop
  page declares only the group in `collects` — `['documents']` or
  `['commodityLines']` — and every member rides along.

## 4. Build the loop pages

A collection needs a hand-written loop controller. A repeating group has no
uniform-widget projection, so each loop owns its rows and copy. The controller
reads facts from the engine barrel
([`engine/index.js`](../engine/index.js)) and writes through it — it never
touches the evaluator directly.

`state.collectionView(answers, collectionPath)` returns facts only:
`[{ index, path, entry, complete }]`. No hrefs, no labels, no view-models. The
controller builds its own rows over those facts.

### The single-page loop (entry form + read-back on one page)

[`features/documents/controller.js`](../features/documents/controller.js) is
the page the flow knows about. It declares the group it collects and renders
both the entry form and the read-back table on one page, with a per-row Remove
link:

```js
export const meta = { ...page, collects: ['documents'] }
```

Its POST branches on the submit button. `action === 'add'` validates the entry
fields and appends; a plain Continue advances with no write. The append mints
the instance's identity — until that POST the draft lives only in the payload,
never a half-created instance in the store:

```js
await state.appendEntry(request, h, 'documents', entry)
```

Remove splices the instance out and reconciles, so anything left dangling
out of scope is pruned too:

```js
await state.removeEntry(request, h, 'documents', index)
```

`appendEntry` / `updateEntry` / `removeEntry` are the top-level convenience
forms; each delegates to the `…At` form with a single-segment path
([`engine/write.js`](../engine/write.js)).

### The batch split (search page + consolidated details page)

The commodities collection uses two pages. The SEARCH page
([`features/commodities/search.controller.js`](../features/commodities/search.controller.js))
declares the group in `collects` and, on save, reconciles one line per selected
species in a single write:

```js
await state.reconcileEntriesAt(
  request,
  h,
  ['commodityLines'],
  lineKey,
  selected.map(seedLine)
)
```

`reconcileEntriesAt` keys existing instances by `keyOf`, keeps a still-selected
line's data (including its nested identifier records), and drops a deselected
line with wipe semantics. The CONSOLIDATED DETAILS page
([`features/commodities/consignment-details.controller.js`](../features/commodities/consignment-details.controller.js))
collects nothing (`collects: []`), renders the selected-commodities table with a
per-commodity Remove and an Add-another link, and edits every line's quantities
in place with `state.updateEntryAt(request, h, ['commodityLines'], index, …)`.

### The nested loop

The `animalIdentifiers` collection lives one level down, one card per commodity
line. It appends and removes on a two-segment-plus-index path:

```js
await state.appendEntryAt(
  request,
  h,
  ['commodityLines', index, 'animalIdentifiers'],
  unit
)
```

and reads its instances with the same `collectionView` call, deeper:

```js
state.collectionView(answers, ['commodityLines', index, 'animalIdentifiers'])
```

### Thread the change context through the loop

A collection reached from a Change link on check-your-answers carries a change
context. Wrap every internal link and redirect — row actions, back links,
add/remove/save round-trips — in `kit.withChangeContext(request, href)` so the
context survives the loop. Resolve the loop's exiting Continue with
`kit.nextTarget(request, page, scope)`, and let a hub exit win first via
`kit.hubExitTarget(request)`. Only the exit repoints to check-your-answers;
mid-loop actions must never bounce there early.

## 5. Cap the count where the model demands it

Some collections cap their instance count at a sibling field. The declaration
is data, in [`flow/obligation-source.js`](../flow/obligation-source.js):

```js
export const MAX_ENTRIES_FROM = {
  animalIdentifiers: 'numberOfAnimalsQuantity'
}
```

Each `animalIdentifiers` collection is capped at its line's
`numberOfAnimalsQuantity`. The cap is computed by
[`engine/evaluate/cardinality.js`](../engine/evaluate/cardinality.js):

```js
export const collectionCapAt = (answers, collectionPath) => { … }
```

`collectionCapAt` reads the named sibling in the frame that holds the
collection and returns the cap, or `null` when there is no cap declared, the
count is unanswered, or the value is not a non-negative integer. An **unanswered
count is deliberately no cap** — the per-instance floor still bites at submit,
so a blank count never lets a journey finish early. Enforcement lives on the
write path: `appendEntryAt` reads the cap and returns `null` (no write) when the
list is already at it, so a stale form racing the cap is rejected rather than
silently over-filling.

## 6. Keep the write guards

Two guards protect collection writes. Do not remove them.

1. **Validate the parent index in a nested loop.** The write primitives append
   or splice at whatever path you give them. An out-of-range parent index would
   fabricate a phantom parent instance. The nested identifier loop's remove
   handler checks `Number.isInteger(index) && index >= 0 && index <
lines.length` before touching the store; copy that guard into any new nested
   controller.
2. **The engine rejects non-integer indices.** `isValidIndex` in
   [`engine/write.js`](../engine/write.js) uses `Number.isInteger` because
   `splice(NaN, 1)` coerces to `splice(0, 1)` — a malformed remove URL would
   otherwise destroy the first instance.

## 7. Extend the contract test

[`contract.test.js`](../contract.test.js) pins that each page commits exactly
what it declares. Add a case shaped like the matching layout:

1. Assert the loop page's declaration — for the single-page loop,
   `documents.meta.collects` equals `['documents']`; for the batch split, the
   search page's meta collects `['commodityLines']`.
2. Drive the committing handler with a valid payload — the `action === 'add'`
   POST for a single-page loop, or the reconcile save for a batch split.
3. If the collection is conditionally scoped, seed the gating answer so it stays
   in scope — otherwise reconcile wipes the fresh write. Always-in-scope groups
   need no seed.
4. Assert the handler committed exactly the declared ids.

## The one hard limit

A member's `applyTo` gate reads values at the same identity level, or projects
a shallower gate down onto its own instances via the projection group. It
cannot read a value in a sibling frame at the same depth. A field gated on
another value in the _same_ enclosing instance (for example a per-unit field
gated on a per-unit sibling) is expressible; a field gated across unrelated
frames is not. See [limits.md](limits.md).
