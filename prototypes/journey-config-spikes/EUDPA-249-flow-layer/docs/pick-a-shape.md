# Pick a shape for your obligation

A one-page decision tree for turning a spec row into the right
obligation shape. Every shape below has at least one live worked
example in the manifest (`obligations/obligations.js`) — click through
via [worked-examples.md](./worked-examples.md).

For the deeper "how do I add one" walkthrough (five-step checklist,
gotchas, existing iterations) see
[`add-an-obligation.md`](./add-an-obligation.md). This page is the
routing layer — pick the shape first, then jump into the walkthrough
with the shape in hand.

## The decision tree

Answer these in order:

### 1. Is this an indexed obligation?

i.e. can there be multiple values for this obligation in a single journey? Does it repeat?

- **No** → there is a single value. Continue to §2.
- **Yes, always exactly-one-per-parent-instance** → it's a group-scoped
  scalar (e.g. `commodityCode` inside `commodityLine`). Skip to
  §7 "line-scoped scalar".
- **Yes, user-driven 0..N** → it's a **records-shape user-driven
  group**. Same shape as `commodityLine`, `unitRecord`, and (post-WS4)
  `accompanyingDocument`. Skip to §8 "records group".

### 2. Is scope conditional on another field?

Is the user always presented with this obligation as a mandatory or optional requirement?
Or is this dependent on the user's previous answers?

- **Not conditional** → simplest case. Just declare
  `{ id, name, status: 'mandatory' | 'optional' }`. Example:
  `countryOfOrigin`, `arrivalDateAtPort`. Continue to §6 to pick the
  domain shape.
- **Conditional** → the obligation carries an `applyTo` closure. Continue to §3.

### 3. What kind of gate condition?

The gate helpers are all in `obligations/helpers.js`. Pick the one
that matches the spec's phrasing:

| Spec phrasing                                                    | Helper                                                        | Example                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------- |
| "required when Y equals X"                                       | `equalsGate(Y, X, whenTrue, whenFalse)`                       | `purposeInInternalMarket`              |
| "required when Y is one of [A, B, C]"                            | `includesGate(Y, [A,B,C], …)`                                 | WS1 `destinationCountry`               |
| "required when Y is answered (any value)"                        | `presentGate(Y, …)`                                           | (retired) accompanying-doc self-loop   |
| "shown when line's commodityCode ∈ list"                         | `allowListed(commodityCode, LIST, projection, reasons)`       | `passport`, `earTag`                   |
| "shown when line's commodityCode ∉ any specific-identifier list" | `notInUnionOf(commodityCode, LISTS, projection, reasons)`     | `identificationDetails`, `description` |
| "mandatory if ANY line has a code in list"                       | `anyAllowListed(commodityCode, LIST, whenTrue, whenFalse)`    | `cph`, `containsUnweanedAnimals`       |
| "genuinely opaque — helpers can't express it"                    | `branchedGate(predicate, whenTrue, whenFalse, predicateMeta)` | escape hatch; none live today          |

**Prefer meta-first helpers** (`equalsGate` / `includesGate` /
`presentGate`) over `branchedGate` — they attach metadata used by the
reachability prover and by `dependsOn` derivation. If you reach for
`branchedGate`, add `predicateMeta` so the prover isn't blind.

### 4. Purge-on-flip vs retain-value?

When the gate flips OFF, do we drop the stored value?

- **Purge-on-flip** (`whenFalse = { inScope: false }`): the stored
  value is dropped by the evaluator's purge pass. Use when the value
  is meaningless once the gate closes. Example: `purposeInInternalMarket`
  when `reasonForImport` moves off `internal-market`.
- **Retain-value** (`whenFalse = { inScope: true, status: 'optional' }`):
  the value survives; the obligation just goes optional. Use when the
  spec says the value itself isn't purged on flip. Example: `regionCode`
  when `regionCodeRequirement` changes from `yes` to `no` — the spec
  says the field isn't purged on `no`, so both branches stay in-scope.

### 5. Is there a cross-field rule tying these obligations together?

- **No** → single obligation, you're done. Go to §6.
- **Yes, "all of these must be filled together or none"** → this is a
  **scalar all-or-nothing block**. Use a structural container
  obligation carrying `requires.allOrNothingOfIds: [...]`. Retired on
  the current manifest (WS4 upgraded to a records-shape group) but the
  invariant kind is supported. See
  [`invariants.md`](./invariants.md#allornothingofids).
- **Yes, "count of records must match a scalar sibling"** → this is
  the "records ARE counted by a sibling scalar" pattern. Set
  `requires.recordCountEquals: { fieldId, errorCode }` on the records
  group. Example: `unitRecord.requires.recordCountEquals ↦
numberOfAnimals` (WS3).

### 6. Pick the domain shape (validation)

The obligation says _whether_ to ask. The domain (`domain/index.js`)
says _what values are legal_. Match the spec's data type against the
factory table in
[`add-an-obligation.md` §The checklist](./add-an-obligation.md#the-checklist)
— `staticEnum` / `computedEnum` / `predicate` / composite /
`addressBlock`.

Every obligation needs either a domain entry OR an entry on
`KNOWN_UNWIRED` in `obligations/coverage.test.js` (structural containers
and system-populated fields).

### 7. Line-scoped scalar (per commodity line)

Same as notification-level, but with `within: commodityLine` and
storage keyed `{ [lineId]: value }`. Presented via `presentsForEach`
in `flow/flow.js`. Examples: `commodityCode`, `species`,
`numberOfAnimals`. Everything in §2-§6 still applies; the only extra
step is the `within:` line.

### 8. Records group (user-driven 0..N)

New records-shape group needs:

1. The group obligation itself: `{ id, name, requires? }`. No
   `within` for a top-level group; `within: parentGroup` for nested
   (unit records are `within: commodityLine`).
2. Optional `requires.minEntries` floor (e.g. `commodityLine.minEntries:
1` — at least one line per notification).
3. Optional `requires.maxEntries` cap (e.g. `accompanyingDocument.maxEntries:
10`).
4. Member obligations declared `within: group, status: 'mandatory'`.
   Each becomes per-record mandatoriness once a record is created.
5. Storage: `{ [obligationId]: { [recordId]: value } }` — same shape as
   commodity lines / unit records.
6. Bespoke summary/add/delete controller under `features/<group-name>/`
   plus a per-record page controller under `lib/<group-name>-page-controller.js`.
   `WS4 features/accompanying-documents/` and
   `lib/accompanying-doc-page-controller.js` are the canonical worked
   example.
7. Add/delete helpers in `lib/state.js` (mirroring `addCommodityLine` /
   `deleteAccompanyingDocument`) plus a session-scoped
   `NEXT_<GROUP>_ID_KEY` counter.
8. Register three routes in `routes.js` (index / add / delete) and add
   a third `presentsForEach.forEachOf === yourGroup` dispatch branch.

## Anti-patterns

Things not to reach for first:

- **`branchedGate` with a hand-rolled predicate**. If you can express
  the rule as an `equalsGate` / `includesGate` / `presentGate` /
  `allowListed`, do that — the prover and metadata derivation only
  work on meta-first helpers.
- **Storing a JSON blob to avoid modelling structure**. If the spec
  has sub-fields, model them either as an address-block composite
  (single obligation, sub-field validation in the domain) or as a
  records group (each row a record). Not as `JSON.stringify()`.
- **A self-loop gate** (obligation whose `applyTo` reads its own
  value). WS2 lived with one and WS4 retired it in favour of the
  records-shape upgrade. If the spec seems to require a self-loop, you
  probably want a container obligation with a group invariant
  instead — see [`invariants.md`](./invariants.md).
- **Silent data purge across shapes**. If reducing a count would drop
  user-entered records, the evaluator's default is to purge. Use a
  rollup-only invariant instead so the user reconciles the mismatch
  themselves — see the WS3 unit-count invariant plan.
- **Skipping the domain entry**. If you don't wire one, the coverage
  test blocks the PR. Either wire a real one or add the obligation to
  `KNOWN_UNWIRED` with a reason.
