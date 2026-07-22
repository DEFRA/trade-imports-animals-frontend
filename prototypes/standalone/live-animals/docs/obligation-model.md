# The obligation model

An obligation is a small data record that says "the journey owes this
answer". The model is a single manifest of obligations plus a parallel
registry of value rules. It carries identity, scope and legality — never
display copy. Pages own presentation, controllers own save-blocking, and
the model keeps only the facts the evaluator and the derivation engine
read.

The model has two files at its core:

- `model/obligations/obligations.js` — the obligation manifest: what the
  journey can owe, and when.
- `model/domain/index.js` — the value-legality registry: what a legal
  answer to each obligation looks like.

Two supporting files complete the picture: `model/obligations/helpers.js`
(the gate-helper library that builds scope closures) and
`model/no-display-keys.js` (the boot-time purity check).

All file paths in this document are relative to the spike root
(`prototypes/standalone/live-animals/`).

## What an obligation carries

An obligation is a plain object with at most these keys:

| Key        | Kind      | Meaning                                                                                                                                                             |
| ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`       | identity  | A stable UUID. The key under which the obligation's value is stored in the flat `fulfilments` map, and the key the domain registry uses.                            |
| `name`     | identity  | The obligation's field name (`countryOfOrigin`, `commoditySelection`). The vocabulary the frontend, storage answers and bridge speak.                               |
| `within`   | structure | A direct JS reference to the parent group obligation. Present on every member of a group; absent on notification-level obligations.                                 |
| `status`   | mandate   | `'mandatory'` or `'optional'`. Present on an obligation that is always in scope. A group carries no `status`; a gated obligation gets it from its gate.             |
| `applyTo`  | scope     | A closure `(fulfilments, fulfilmentIdsByObligationId) → decision` that decides whether this obligation is in scope, and with what status. Absent = always in scope. |
| `requires` | mandate   | Group-level invariants: a collection floor (`minEntries`) and/or a per-instance "at least one of" rule (`anyOfIds`). Only meaningful on a group.                    |

That is the whole vocabulary. There is deliberately no `type`, no copy,
no widget choice and no page-level validation on an obligation. Those
live where they are read — in the templates, controllers and the domain
registry.

`id` and `name` split two roles. `id` is the storage key and the domain
registry key; `name` is the field vocabulary the frontend and the storage
answers speak. The bridge layer (`model/bridge/`)
converts between the model's flat `fulfilments` map (keyed by `id`) and
the frontend's nested answers (keyed by `name`).

### Always-in-scope vs gated

An obligation with a `status` and no `applyTo` is always in scope —
`countryOfOrigin`, the address blocks, the notification-level scalars.
An obligation with an `applyTo` closure is gated: the closure decides,
per evaluation, whether the obligation is in scope and (when in scope)
what status it takes. A group is neither — it has neither `status` nor a
value; it exists to hold members via `within`.

## The manifest

`model/obligations/obligations.js` exports one obligation object per
declaration, plus two collection exports:

- `obligations` — the flat array of every obligation, in declaration
  order. Order does not affect evaluation: the evaluator rebuilds the
  group hierarchy from `within` back-references, so an obligation may be
  declared before or after the group it belongs to.
- `groups` — derived, not authored:

  ```js
  export const groups = obligations.filter((o) =>
    obligations.some((other) => other.within === o)
  )
  ```

  A group is simply an obligation that at least one other obligation
  points at via `within`. Today the groups are `commodityLine`
  (name `commodityLines`), `unitRecord` (name `animalIdentifiers`,
  nested inside `commodityLine`) and `documents`.

The manifest also exports the commodity-code whitelists that the gates
read as plain const arrays — `PACKAGE_COUNT_COMMODITIES`,
`CPH_REQUIRED_COMMODITIES`, `PASSPORT_COMMODITIES`, `TATTOO_COMMODITIES`,
`EAR_TAG_COMMODITIES`, `HORSE_NAME_COMMODITIES`,
`PERMANENT_ADDRESS_COMMODITIES`, `UNWEANED_APPLICABLE_COMMODITIES` and
`SPECIFIC_IDENTIFIER_WHITELISTS`. Keeping them named and exported means
a gate declaration stays a one-liner and the same list can be inspected
by tests.

### Structure of the manifest

The manifest lays out the V4 data fields:

- **Notification-level scalars and address blocks** — `countryOfOrigin`,
  `reasonForImport`, `transporterType`, `meansOfTransport`, the arrival
  and port fields, `animalsCertifiedFor`, and the address blocks
  (`placeOfOrigin`, `consignor`, `consignee`, `importer`,
  `placeOfDestination`, `contactAddress`).
- **`commodityLine`** (name `commodityLines`) — a user-driven group.
  Each line owns `commodityCode` (name `commoditySelection`),
  `commodityType`, `species` (name `speciesSelection`), `numberOfAnimals`
  and the conditionally-scoped `numberOfPackages`.
- **`unitRecord`** (name `animalIdentifiers`) — a group nested inside
  `commodityLine`. Each unit owns the six identifier obligations
  (`passport`, `tattoo`, `earTag`, `horseName`, `identificationDetails`,
  `description`) and `permanentAddress`.
- **`documents`** — a group of four accompanying-document fields.

Two obligations are **system-populated**: `poApprovedReferenceNumber`
(minted at notification-creation time) and `responsiblePersonForLoad`
(taken from gov.identity). They are declared for completeness and carry
`status: 'mandatory'`, but no page presents them and their value
legality is enforced upstream, so neither carries a domain entry.
`commodityType` rides the same coverage exemption (`SYSTEM_POPULATED` in
`flow/obligation-source.js`): it is declared on each commodity line for
V4 completeness, but no page presents it — the batch commodity search
subsumes the type filter's purpose.

## Scope: the gate helpers and their metadata

Every conditionally-scoped obligation carries an `applyTo` closure. The
closure is never hand-written — it is built by a pure helper from
`model/obligations/helpers.js`. Each helper returns the closure and hangs
a `.metadata` sidecar off it describing the gate as data. That gives one
mechanism and one testing story: any obligation's `applyTo` runs as a
plain function call over a `fulfilments` map, and the same gate is
inspectable without executing it.

The closure signature is
`(fulfilments, fulfilmentIdsByObligationId) → decision`, where
`fulfilments` is the flat storage map and `fulfilmentIdsByObligationId`
maps each obligation id to its current instance-paths (so a gate can look
up a group's live instances without walking storage itself).

The decision object is `{ inScope, status?, reasons?, records? }`:

- `inScope: false` — out of scope. Any stored value is purged.
- `inScope: true` with a `status` — in scope, mandatory or optional.
- `reasons` — an array of reason objects explaining the decision (no
  display copy — a machine-readable code plus an explanation string).
- `records` — for a group-scoped gate, the instance-paths on which the
  obligation is in scope.

Two decision patterns recur:

- **Status-flip** — both branches are `inScope: true` with different
  `status`. `regionCode` is mandatory when
  `regionOfOriginCodeRequirement` is `yes` and drops out of scope
  otherwise.
- **Purge-on-flip** — the false branch is `{ inScope: false }`, so
  leaving scope destroys the stored value. `purposeInInternalMarket`
  (gated on `reasonForImport`) and `commercialTransporter` (gated on
  `transporterType`) work this way.

### Which helper for which gate

The helper depends on the SHAPE of the value the gate reads, not on how
deep the gated obligation sits.

**Scalar gates** read a plain top-level value (`fulfilments[gate.id]` is
a scalar) and return a single decision:

- `equalsGate(gate, value, whenTrue, whenFalse)` — value equality. The
  workhorse for status-flip and purge-on-flip (`regionCode`,
  `purposeInInternalMarket`, `commercialTransporter`,
  `privateTransporter`).
- `includesGate(gate, values, whenTrue, whenFalse)` — the gate value is
  one of a set (`transitedCountries` on land-transport modes).
- `presentGate(gate, whenTrue, whenFalse)` — the gate has any non-blank
  answer.
- `anyAllowListed(gate, values, whenTrue, whenFalse)` — aggregates over a
  group's records to a single notification-level decision. `cph` and
  `containsUnweanedAnimals` use it: in scope when ANY commodity line has
  a qualifying code.
- `alwaysInScope(status, reasons)` — no gate; unconditional, but with a
  `reasons` list attached. Reserved for an always-in-scope obligation
  that must explain itself; idle on the manifest today.
- `matches` and `branchedGate` are escape hatches for opaque predicates.
  Neither appears on the manifest.

**Group-scoped gates** read a records-map (`fulfilments[gate.id]` is
`{ instancePath: value }`, because the gate obligation is `within` a
group) and return per-record decisions:

- `allowListed(gate, values, projectionGroup, reasons)` — in scope on
  records whose gate value is in the allowlist.
- `notInUnionOf(gate, unionOfAllowlists, projectionGroup, reasons)` — the
  dual: in scope where the gate value is in NONE of the given allowlists.
  The union is derived once at build time and pinned on
  `.metadata.values`, so the complement can never drift from the
  positive gates it negates. The two free-text identifier fields
  (`identificationDetails`, `description`) use it — they apply on units
  whose commodity has no typed identifier.
- `presentPerRecord(gate, projectionGroup, reasons)` — in scope on each
  record where the gate value is answered. The three dependent
  accompanying-document fields gate on `accompanyingDocumentType` this
  way.

The `projectionGroup` argument handles depth. Pass `null` when the gate
and the gated obligation sit at the same identity level — `numberOfPackages`
reads `commoditySelection`, both `within: commodityLine`. Pass the gated
obligation's parent group when it sits deeper — the per-unit identifiers
read the line's `commoditySelection` and project onto `unitRecord`, so
the engine walks each matching line's unit records.

### Metadata and the dependency graph

Every helper attaches `.metadata` describing the gate: `{ type,
obligation, values?, projection?, whenTrue?, whenFalse?, reasons? }`.
`obligationMetadata(obligation)` merges that sidecar with a derived
`dependsOn` list — `deriveDependsOn` reads `metadata.obligation` to
recover which obligation each gate reads. A closure is opaque to a static
reachability prover; the metadata makes the gate's dependency graph
inspectable data without duplicating it on the obligation.

## Groups and the `within` reference

A repeating list is a group obligation — one that other obligations
reference via `within`. The reference is a real JS object reference, not
a string id:

```js
export const commodityCode = {
  id: '21f60718-192a-4d4e-8bcd-17e8f9a0b1c3',
  name: 'commoditySelection',
  within: commodityLine,
  status: 'mandatory'
}
```

Because members point at the group object directly, a misspelt reference
throws when the module loads, editors navigate straight to the group
definition, and searching for the group constant finds every member. The
group itself carries no `status` and no value — it is a structural node.

Nesting is literal: `unitRecord` is `within: commodityLine`, and the
six identifier obligations are `within: unitRecord`. That gives the
model its depth-2 shape — a unit record lives inside a commodity line,
and each unit owns its own identifier fields.

### Group invariants: `requires`

A group can pin invariants the evaluator enforces:

- **Collection floor** — `{ minEntries, errorCode }`. `commodityLine`
  requires at least one line on every consignment:

  ```js
  requires: {
    minEntries: 1,
    errorCode: 'obligation.commodityLine.atLeastOne'
  }
  ```

  Without the floor a zero-line session would collapse to
  not-applicable in the status roll-up.

- **Per-instance "at least one of"** — `{ anyOfIds, errorCode }`. Every
  `unitRecord` must carry at least one of the six identifier obligations,
  named by literal id:

  ```js
  requires: {
    anyOfIds: [
      '39657a80-...', // passport
      '3a768b91-...', // tattoo
      /* ...earTag, horseName, identificationDetails, description */
    ],
    errorCode: 'obligation.unitRecord.identifiersRequired'
  }
  ```

  Referencing by literal id (rather than obligation reference) keeps the
  "requires-any-of" edge legible as data, and avoids coupling to
  declaration order.

`groupInvariantErrors` (`model/obligations/state-queries.js`) reads
`requires` to emit one invariant error per violating instance; the bridge's
status rollups hold a group at in-progress until the invariant is satisfied.

## The domain: value legality

`model/domain/index.js` is the value-legality registry — Layer 1.25 of
the architecture. It owns "what is a legal value?" and nothing else. No
identity, no cardinality, no scope (those are the obligation manifest);
no pages, sections or navigation (those are the flow); and no display
copy.

`domain` is a `Map` keyed by obligation `id`. Each entry is a pure
function of `fulfilments`, the same idiom as an obligation's `applyTo`.
There are five entry shapes:

- **`enum`** — `options(fulfilments, ids, ctx) → string[]`. The legal
  option list, as codes/values only.
- **`integer` / `string` / `date`** — `predicate(value, ctx) → error[]`
  plus a `reasons` list. Returns an empty array on pass.
- **`address`** — a composite block: `subFields`, `required`,
  `subFieldRules`, an `isComplete(value)` check and a `predicate`.

Four factories build these entries, each attaching a `.metadata`
sidecar mirroring the obligations helpers: `staticEnum`, `computedEnum`,
`predicate` and `addressBlock`. A shared `reasons` map at the top of the
file holds every failure code (`domain.enum.notInOptions`,
`domain.string.maxLength`, the address sub-field codes, and so on), so
error formatting can name-check them.

### Options come from the reference-data services

Enum options are codes, not copy, and the closed lists come from the
MDM reference-data services — the same accessors the frontend
controllers call:

| Obligation                              | Service accessor                                 |
| --------------------------------------- | ------------------------------------------------ |
| `reasonForImport`                       | `import-reason-purpose.reasons()`                |
| `purposeInInternalMarket`               | `import-reason-purpose.purposes()` (gated)       |
| `countryOfOrigin`, `transitedCountries` | `countries.originCountries()`                    |
| `portOfEntry`                           | `ports.list()`                                   |
| `meansOfTransport`                      | `transport-reference.meansOfTransport()`         |
| `transporterType`                       | `transport-reference.transporterTypes()`         |
| `commodityCode`                         | `commodities.list()`                             |
| `species`                               | `commodities.speciesFor(line's commodity)`       |
| `animalsCertifiedFor`                   | `certification-purposes.certificationPurposes()` |
| `accompanyingDocumentType`              | `document-types.documentTypes()`                 |
| `accompanyingDocumentAttachmentType`    | `document-types.attachmentTypes()`               |

A `computedEnum` closure delegates to the service and returns values
only. A handful of enums stay static because no service backs them —
`containsUnweanedAnimals` and `regionOfOriginCodeRequirement` (yes/no)
and `commodityType` (a small placeholder set). The domain never carries
option labels: the templates render the copy, the services supply the
codes.

### Predicates and address blocks

The `predicate` entries express the V4 field rules: max-length caps
(`internalReferenceNumber` max 58, `cph` max 11, `regionCode` max 5),
integer floors (`numberOfPackages`, `numberOfAnimals` — at least 1),
date format (`arrivalDateAtPort`, `accompanyingDocumentDateOfIssue` —
calendar-valid DD/MM/YYYY), and the transited-countries max-12-selection
cap. A blank value passes every predicate — completeness is a separate
concern from legality, decided by the derivation engine.

The `addressBlock` factory models the V4 standard address as a composite
of nine sub-fields (six required, three optional) with per-sub-field
rules for max-length, email format and the MDM country enum. Every
address obligation reuses it; `commercialTransporter` extends the base
set with a `transporterAuthorisationNumber` sub-field. The block
validates only the sub-fields the user supplied; whether a partly-blank
address blocks completeness is surfaced by `isComplete(value)`, not by
the predicate.

## No display logic in the model

The model carries no display copy — no `label`, `title`, `titleKey`,
`hint`, `legend` or `widget` on any obligation or domain entry. Copy
lives in the `.njk` templates; option lists come from the reference-data
services. The model owns identity, cardinality and scope (obligations),
value legality (domain), and status and navigation derivation (engine) —
never presentation.

This is enforced at boot, not just in tests. `model/no-display-keys.js`
exports `assertNoDisplayKeys(obligations, domain)`, which walks the live
obligation and domain object graphs — objects, arrays and the `.metadata`
sidecars hung off gate closures — and throws if any object carries a
banned key from `DISPLAY_KEYS`:

```js
export const DISPLAY_KEYS = Object.freeze([
  'label',
  'title',
  'titleKey',
  'hint',
  'legend',
  'widget'
])
```

`obligation-purity.js` wraps it as `assertObligationPurity()`, and
`routes.js` calls that during plugin registration. A display key added to
an obligation or a domain entry fails the boot — the server does not
start with presentation smuggled into the model.

The check walks the live object graph rather than the source text on
purpose: it inspects the actual keys reachable from the obligation array
and domain map, so it cannot false-positive on the engine-introspection
constants elsewhere in the tree that merely name AST operators, and it
catches a display key however it was assembled.
