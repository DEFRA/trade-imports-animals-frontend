# Limits and edges

The prototype does a lot, but not everything. This page names the edges of
the design so a new reader knows where the guarantees stop. None of these is
a bug. Each is a deliberate boundary, a documented cost, or a stub that is
honest about being a stub.

## The model is code, not portable config

The obligation model under `model/` is JavaScript, not serialisable data.
An obligation's scope is an `applyTo` closure built by a gate helper
([model/obligations/helpers.js](../model/obligations/helpers.js)); the value
domain is a registry of predicate functions
([model/domain/index.js](../model/domain/index.js)). The `.metadata` sidecar
on each closure makes the dependency graph inspectable, but the decision
logic itself is a function, not a rule you can read out as JSON.

The consequence: you cannot ship the model to a non-JS runtime, drive it from
a database, or let a non-developer edit it. Growing the model means writing
JavaScript — a new obligation object, a gate helper, a domain entry — not
editing a config file. See [obligation-model.md](obligation-model.md).

## The bridge round-trip loses data in two named places

Controllers store answers in A's nested shape and the model evaluates B's
flat fulfilments; [model/bridge/fulfilments.js](../model/bridge/fulfilments.js)
translates between them. The forward direction (answers → fulfilments, the
evaluate path) is always exact. The reverse direction has two documented
losses:

- **`Cat` and `Dog` collapse to `Cat`.** `COMMODITY_CODES` maps both to the
  CN code `01061900`, so it is non-injective. `commodityCodeFor` (A → B) is
  exact — a cats-or-dogs consignment always produces the right code and the
  right gate decisions — but `commodityNameFor` (B → A) recovers only the
  representative name. The wire-durable value (the CN code) is preserved
  exactly; only the display name `Dog` degrades to `Cat` on rehydration. This
  is deterministic, tested loss, never a silent pass.
- **Value-less lines cannot be reconstructed.** B infers a group's instances
  from its descendant storage, so `{ commodityLines: [] }` and
  `{ commodityLines: [{}] }` both translate to `{}`. An empty line leaves no
  fulfilment for the bridge to rebuild. In the live journey every line always
  carries at least a commodity selection, so this edge is not reached through
  the UI.

## Accompanying documents are capped at one

The model holds the four `accompanyingDocument*` fields as notification-level
singletons. The documents bridge maps A's `documents[0]` to those four fields;
**`documents[1]` and later are dropped**, and the upload `filename` metadata
is dropped with them — the model stores a document-type selection, not the
uploaded bytes. B → A rebuilds a single-element `documents` array. A journey
that needs several accompanying documents on one notification is beyond the
current model.

## Mapper A loses data in reverse; Mapper B is lossless

Two mappers translate answers to the backend notification
([services/persistence/records/notification-mapper.js](../services/persistence/records/notification-mapper.js)).
The active mapper is selected in
[services/persistence/records/mapper.js](../services/persistence/records/mapper.js).

**Mapper A** targets the skeleton notification shape, which cannot carry
everything the store holds. `notificationToAnswers` therefore loses:

- **Commodity identity of every group after the first** — the notification
  has one top-level `commodity.name` and no per-complement code, so lines
  rebuilt from the second commodity onward come back with no
  `commoditySelection`.
- **Identifier records beyond one per species, and every identifier field
  except ear tag and passport** — tattoo, horse name, the free-text
  fallbacks and the per-animal permanent address have no home in the skeleton
  shape.

**Mapper B** carries per-group `commodityCode` and full per-species
`animalIdentifiers` arrays precisely to round-trip losslessly, falling back to
Mapper A recovery when a backend strips the extras. If the wired mapper is A,
a submit-then-reload cannot restore the fields above. See
[persistence.md](persistence.md).

## Some values cross the bridge unmapped

Two fields pass through the vocabulary bridge unchanged because no clean
mapping exists and no gate reads them:

- **`species`** — stored as taxonomy ids. No gate compares species, so the
  value is opaque to the evaluator and passes through. If a future gate ever
  reads species, it will need a taxonomy-id ↔ species-code map that does not
  exist today.
- **`accompanyingDocumentType`** — stored as display strings. Its gate is a
  presence check, not a value check, so the string passes through. A wire
  mapper that needs coded document types would need a code table.

Both are safe today; both are the first places a future value-comparing gate
would break.

## Identifier records are capped at the declared animal count

A collection may declare `maxEntriesFrom`, a reference to a sibling count
field, and its entry count is then capped at that field's value. One carrier
uses it: `animalIdentifiers` declares
`maxEntriesFrom: numberOfAnimalsQuantity`, so a line's identifier records are
capped at that line's declared animal count. The cap resolves per line —
each `commodityLines[i]` caps its own records, never a sibling's — in
[engine/evaluate/cardinality.js](../engine/evaluate/cardinality.js), and
`appendEntryAt` in [engine/write.js](../engine/write.js) rejects an append at
the cap.

The edges of the cap:

- An **unanswered** count is no cap — the entry form stays open while the
  count is blank. The per-species at-least-one floor still bites at submit.
- A **non-integer** stored count is no cap — garbage never blocks a save.
- The cap is a **maximum only**. It does not force a minimum: one record for
  a hundred animals still passes, per the spec.

## Re-entry is by reference and session-scoped, not by identity

The dashboard's authorisation seam is the session's known-journeys list, not
a per-user owner check on the record ([engine/journey.js](../engine/journey.js)).
A reference reaches another session only if the session state carrying it
does. `selectJourney` and `amendJourney` refuse any reference the session does
not already know — that refusal is the whole access check.

Two consequences follow:

- **Multi-draft is per session.** One session can hold several drafts, but a
  user on a new device starts with an empty dashboard. Cross-device recovery
  needs a backend owner field, which the service does not have.
- **The session is not authentication.** Do not treat the session state as an
  identity check in production. Resume is by reference, never by identity —
  the main flow only ever loads a journey by its id.

## The stubs are shaped, not verified integrations

The prototype runs in `stub` or `real` mode
([services/mode.js](../services/mode.js)). The stub deliberately collapses
production concerns:

- The session stub is a cookie standing in for the production session-id plus
  Redis indirection.
- The records stub mints and stores notifications in memory; the real adapter
  posts to the backend, but that mapping is exercised against a stub backend,
  not a verified production service.
- The stub's resume-by-identity affordance (`load({ userId })`) is a
  demo-only convenience the real adapter does not implement.

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

## The page-owned spine costs file count

Pages are the spine: each is its own controller plus template, sharing plumbing
through [shared/kit.js](../shared/kit.js). The costs are accepted knowingly:

| Cost             | Reading                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- |
| File count       | Many small controllers and templates. Each is greppable, but there are a lot of them.       |
| Duplication risk | Real. The shared kit mitigates it; it does not eliminate it. Similar controllers can drift. |
| "Add a field"    | Three edits — a model obligation, a controller edit and a template edit.                    |

What the costs buy: bespoke layout on every page, copy beside the markup that
renders it, and onboarding that is "read the page you are changing" rather
than "learn one renderer and its config". See
[kit-library-not-framework.md](kit-library-not-framework.md).
