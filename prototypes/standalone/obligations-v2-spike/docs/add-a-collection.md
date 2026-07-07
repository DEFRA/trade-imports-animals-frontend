# How to add a collection with a conditional field

A collection is a repeating obligation: the user adds 0 or more entries, each
with its own fields. This guide shows you how to add one, including a field
that only applies to some entries.

Two reference implementations exist:

- [`features/claims/`](../features/claims/) — a top-level collection (depth 1)
- [`features/named-driver/`](../features/named-driver/) — a collection inside a
  collection (depth 2)

Follow the steps against `features/claims/` — every snippet below traces to it.

## 1. Declare the collection in the model

A collection is an ordinary obligation that carries `collection: true` and a
real `item: [...]` array of nested sub-obligations. From
[`features/claims/obligations.js`](../features/claims/obligations.js):

```js
export const claimType = { id: 'claimType', required: true }
export const claimAmount = { id: 'claimAmount' }

export const claims = {
  id: 'claims',
  collection: true,
  item: [claimType, claimAmount, windscreenProvider],
  activatedBy: { obligation: hadClaims, equals: 'yes' },
  requiredAtLeastOne: true,
  wipeOnExit: true
}
```

The collection-level facts:

- `activatedBy` puts the whole collection in scope. It references a real
  obligation object from another feature (`hadClaims` from driving-history),
  imported sideways.
- `wipeOnExit` means deselecting the activating answer destroys the whole
  subtree — every entry and everything inside it. Data is destroyed, not
  hidden, so re-activating starts blank.
- `requiredAtLeastOne` makes an in-scope collection owe at least one entry.
  Omit it and an empty collection is complete — but every entry that does
  exist must still be complete
  ([`engine/evaluate/complete.js`](../engine/evaluate/complete.js)).

Sub-obligation ids are frame-relative: `claimType`, not `claims.claimType`.
The id is the key inside each entry object (`answers.claims[0].claimType`)
and the DOM field name. Ids must be path-safe — no `.`, `[` or `]` — or boot
throws ([`flow/dispatch.js`](../flow/dispatch.js)).

## 2. Add the item-scoped conditional field

An item-scoped conditional is a sub-obligation whose `activatedBy` references
a sibling — another obligation in the same `item` list. There is no new
syntax and no marker:

```js
export const windscreenProvider = {
  id: 'windscreenProvider',
  required: true,
  activatedBy: { obligation: claimType, equals: 'windscreen' },
  wipeOnExit: true
}
```

The same three operators apply as everywhere else: `equals`, `includes`,
`present`. The engine infers item-relative resolution from sibling identity:
because `claimType` sits in the same `item` list, the reference resolves
within each entry's own frame
([`engine/evaluate/predicate.js`](../engine/evaluate/predicate.js)). So
`windscreenProvider` is in scope for exactly the entries whose own
`claimType` is `'windscreen'`. Changing an entry's `claimType` away from
`'windscreen'` wipes that entry's stale provider — a field-level wipe inside
one instance.

The reveal markup (show or hide the field as the user picks a type) is
page-side, in your entry template. Scope and wipe stay model-side.

## 3. What the engine gives you free

You write no engine code. Once the model declares the collection:

- **Per-instance scope.** The registry walk materialises the tree against the
  answers, so a two-claim journey yields `claims[0].claimType` and
  `claims[1].claimType` as distinct instances, each scoped independently.
- **Per-path wipe.** `reconcile` names exactly the out-of-scope paths that
  still hold data; the write layer destroys them.
- **Per-item completeness.** An entry is complete when every required
  sub-obligation is satisfied; a collection is complete when its cardinality
  mandate is met and every existing entry is complete
  ([`engine/evaluate/complete.js`](../engine/evaluate/complete.js)).
- **Dispatch coverage at depth.** Boot asserts every obligation at every
  depth is collected by exactly one page. Sub-obligations inherit their
  owning page from the nearest collection ancestor, so your list page
  declares only `collects: ['claims']`
  ([`flow/dispatch.js`](../flow/dispatch.js)).

## 4. Build the two pages

A collection needs two bespoke controllers. Both are deliberately
hand-written — a repeating collection has no uniform-widget projection, so
each loop owns its own rows and copy (see [decisions.md](decisions.md)).

### The list page (the loop hub)

[`features/claims/list.controller.js`](../features/claims/list.controller.js)
is the page the flow knows about. It declares the `collects`, renders the
Claim-N rows, and offers Add / Remove / Continue.

`state.collectionView(answers, ['claims'])` returns facts only:
`[{ index, path, entry, complete }]`. No hrefs, no labels, no row
view-models. The controller hand-builds its rows over those facts:

```js
const rows = state
  .collectionView(answers, ['claims'])
  .map(({ index, entry }) => ({
    key: { text: `Claim ${index + 1}` },
    value: { text: claimValue(entry) },
    actions: { items: [{ href: pagePath(`claims/${index}/remove`), ... }] }
  }))
```

The POST branches: `action === 'add'` redirects to the entry sub-page;
otherwise Continue advances with no write.

### The entry page (add and remove)

[`features/claims/entry.controller.js`](../features/claims/entry.controller.js)
answers "the add form has no instance id yet": the valid POST appends, and
the append mints the entry's identity `(claims, arrayIndex)`. Until that
POST the draft lives only in the payload — never a half-created entry in the
store.

```js
state.appendEntry(request, h, 'claims', {
  ...entry,
  claimAmount: clean.claimAmount ?? ''
})
```

`removeEntry` splices the entry — destroying its whole subtree — then
reconciles, so anything left dangling out of scope is pruned too
([`engine/write.js`](../engine/write.js)).

## 5. Keep the guards

Two guards protect collection writes. Do not remove them, and copy the first
into any new nested controller.

1. **Validate the parent index in nested add controllers.** The generic store
   primitive appends at whatever path you give it. An out-of-range parent
   index would fabricate a phantom parent entry. See `validDriver` in
   [`features/named-driver/driver-claim.controller.js`](../features/named-driver/driver-claim.controller.js):
   a malformed or out-of-range `{driver}` param redirects to the hub instead
   of writing.
2. **The engine rejects non-integer indices.** `isValidIndex` in
   [`engine/write.js`](../engine/write.js) uses `Number.isInteger` because
   `splice(NaN, 1)` coerces to `splice(0, 1)` — a malformed remove URL would
   destroy the wrong (first) instance.

## 6. Extend the contract test

[`contract.test.js`](../contract.test.js) pins that each page commits exactly
what it declares. Collections split that across two pages: the list page
declares `collects: ['claims']`, but the committing write is the entry
page's append handler. Add a case shaped like the existing claims one:

1. Assert the list page's declaration: `claimsList.meta.collects` equals
   `['claims']`.
2. Drive the entry page's add handler with a valid payload.
3. Seed the activating answer (for claims, `{ hadClaims: 'yes' }`) so the
   collection stays in scope — otherwise reconcile wipes the fresh write.
4. Assert the handler committed exactly the declared ids.

## 7. Nesting a collection

To nest, put a collection obligation inside another collection's `item`
list. Everything recurses — scope, wipe, completeness and dispatch coverage
all descend with no engine changes.
[`features/named-driver/obligations.js`](../features/named-driver/obligations.js)
does exactly this: each driver owns a nested `claims` collection, so the
model tree reaches `drivers[i].claims[j].claimType`.

The nested sub-hub is the same library call one level deeper:

```js
state.collectionView(answers, ['drivers', driverIndex, 'claims'])
```

and the nested writes take a path: `state.appendEntryAt(request, h,
['drivers', d, 'claims'], entry)`. Remember guard 1 above — validate the
parent index first.

## The one hard limit

The model cannot express cross-frame conditionality: a sub-field gated on a
value in an enclosing frame, such as `drivers[i].claims[j].x` gated on
`drivers[i].y`. `activatedBy` resolves same-frame siblings and top-level
answers only. See [limits.md](limits.md).
