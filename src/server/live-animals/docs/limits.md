# Limits and edges

The prototype does a lot, but not everything. This page names the edges of
the design so a new reader knows where the guarantees stop. None of these is
a bug. Each is a deliberate boundary, a documented cost, or a stub that is
honest about being a stub.

## The model is code, not portable config

The obligation model under `model/` is JavaScript, not serialisable data.
An obligation's scope is an `applyTo` closure built by a gate helper
([model/obligations/helpers/index.js](../model/obligations/helpers/index.js)). The
`.metadata` sidecar on each closure makes the dependency graph inspectable,
but the decision logic itself is a function, not a rule you can read out as
JSON.

The consequence: you cannot ship the model to a non-JS runtime, drive it from
a database, or let a non-developer edit it. Growing the model means writing
JavaScript — a new obligation object and, when needed, a gate helper — not
editing a config file. See [obligation-model.md](obligation-model.md).

## The bridge preserves vocabulary, with two representation edges

Controllers use request-local answers in a nested shape while the durable store
and model use flat fulfilments. Feature-owned bindings assemble the canonical
map and [bridge/fulfilments/index.js](../bridge/fulfilments/index.js) projects it
back.
Values pass through unchanged except for the animal count:

- **Parsable animal-count strings become numbers.** The page stores
  `numberOfAnimalsQuantity` from HTTP as a string. The bridge coerces a
  parsable value to the number that the model's strict record-count comparison
  expects. Rebuilding answers returns that number, not the original string.
  Blank and unparseable strings pass through unchanged for controller-side
  validation.
- **Value-less lines cannot be reconstructed.** The bridge infers a group's
  instances from its descendant storage, so `{ commodityLines: [] }` and
  `{ commodityLines: [{}] }` both translate to `{}`. An empty line leaves no
  fulfilment for the bridge to rebuild. In the live journey every line always
  carries at least a commodity selection, so this edge is not reached through
  the UI.

## Accompanying documents are capped at ten

`documents` is an ordinary model collection — the `accompanyingDocument*`
fields sit `within` it — and the manifest pins the V4 cap as a group invariant,
`requires: { maxEntries: 10 }`
([model/obligations/obligations.js](../model/obligations/obligations.js)). The
documents page also caps its Add affordance (`MAX_DOCUMENTS`), but the model
invariant is the after-the-fact defence: records saved over a later, lower cap
surface as an invariant error rather than passing silently. Each document
record stores its typed fields plus the manifest-owned `documentUploadId` and
`documentFilename` obligations. The file bytes never enter fulfilment — they
live behind the `document-uploads` service, linked by `uploadId`.

## Mapper A is narrower than Mapper B

Two forward mappers translate the same canonical snapshot to backend
notifications
([services/persistence/records/notification-mapper/index.js](../services/persistence/records/notification-mapper/index.js)).
Both run on every real-mode replacement.

**Mapper A** targets the skeleton notification shape, which cannot carry
everything canonical fulfilment holds:

- **Commodity identity of every group after the first** — the notification
  has one top-level `commodity.name` and no per-complement code, so lines
  cannot represent every complement's identity.
- **Identifier records beyond one per species, and every identifier field
  except ear tag and passport** — tattoo, horse name, the free-text
  fallbacks and the per-animal permanent address have no home in the skeleton
  shape.

**Mapper B** carries per-group `commodityCode`, full per-species
`animalIdentifiers`, typed documents, and the other additional projection
fields. Neither notification is used to resume: `/fulfilments` is the source of
truth, so Mapper A's narrower shape cannot lose durable data. See
[persistence.md](persistence.md).

## Commodity mapping belongs to notification persistence

The answer/fulfilment bridge does not translate commodity names or codes; page
answers and gates use the same values. Commodity translation is a
notification-mapper concern
([services/persistence/records/notification-mapper/index.js](../services/persistence/records/notification-mapper/index.js)).
Mapper B writes each complement's `commodityCode` with `commodityCodeFor` and
also carries its name. Mapper A stores only the first commodity name at the
notification's top level.

## No gate reads an array-valued answer

The gate helpers compare a scalar stored value —
`values.includes(value)` in
[model/obligations/helpers/index.js](../model/obligations/helpers/index.js) — so an
array-valued answer would silently compare as no-match, not throw. The only
array-valued obligation, `transitedCountries`, gates nothing, so no live gate
reads an array. A future gate over an array-valued field must first teach the
helpers scalar-or-array membership; do not rely on the raw comparison.

## The stubs are shaped, not verified integrations

The prototype runs in `stub` or `real` mode
([services/mode.js](../services/mode.js)). The stub deliberately collapses
production concerns:

- The session stub is a cookie standing in for the production session-id plus
  Redis indirection.
- The records stub mints and stores canonical fulfilment in memory; the real
  adapter persists the same at-rest shape to `/fulfilments` and writes both
  notification projections.
  The deliverable is the shape of each seam — the port contract — not a
  production-verified integration. See [persistence.md](persistence.md).

## Ownership at depth is derived, not declared

Each page declares a `collects` array of top-level obligation names on its
controller `meta`. The dispatch index
([flow/dispatch.js](../flow/dispatch.js)) assigns any sub-obligation to the
page that owns its nearest collected ancestor: `ownerOfObligation` strips the
instance indices from an address and walks up the template-path chain until it
finds a collected owner. A group's `collects` never enumerates its item
fields.

The consequence: add a sub-field to a collection item and it silently inherits
the collection's page. Coverage stays total — `buildDispatch` throws if any
non-system-populated obligation reaches no page — but you cannot redirect one
field at depth to a different page. If a future journey needs that, ownership
would have to become declarable per field.

This is also where the two address vocabularies meet: template addresses are
index-free (`commodityLines.commoditySelection`), instance path keys are
bracketed (`commodityLines[0].commoditySelection`). They are bridged, not
unified — every surface speaks one, and a reader has to know which.

## Derived gates assume any-in-scope

A section's derived gate passes when **any** obligation the section collects
is in scope ([flow/gates.js](../flow/gates.js)). That is correct today because
each conditional section's obligations share one activation.

A future section that mixed conditional and unconditional obligations would
get an always-true derived gate — the unconditional obligation is always in
scope. The author would then have to write an explicit `gate` override,
bringing back exactly the hand-written restatement the derivation removes. The
override slot exists for this case. See
[flow-and-gates.md](flow-and-gates.md).
