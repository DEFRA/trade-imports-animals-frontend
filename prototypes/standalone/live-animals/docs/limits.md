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

## The bridge preserves vocabulary, with two representation edges

Controllers store answers in a nested shape and the model evaluates flat
fulfilments; [bridge/fulfilments.js](../bridge/fulfilments.js) translates
between them. Values pass through unchanged except for the animal count:

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

`documents` is an ordinary model collection — the four `accompanyingDocument*`
fields sit `within` it — and the manifest pins the V4 cap as a group invariant,
`requires: { maxEntries: 10 }`
([model/obligations/obligations.js](../model/obligations/obligations.js)). The
documents page also caps its Add affordance (`MAX_DOCUMENTS`), but the model
invariant is the after-the-fact defence: records saved over a later, lower cap
surface as an invariant error rather than passing silently. Each document
record stores its obligation fields plus two feature-owned aux keys
(`uploadId`, `filename` — `AUX_ENTRY_KEYS` in
[flow/obligation-source.js](../flow/obligation-source.js)); the file bytes
never enter the answers — they live behind the `document-uploads` service,
linked by `uploadId`.

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

## Commodity mapping belongs to notification persistence

The answer-to-fulfilment bridge does not translate commodity names or codes;
the answers and gates use the same stored values. Commodity translation is a
notification-mapper concern
([services/persistence/records/notification-mapper.js](../services/persistence/records/notification-mapper.js)).
Mapper B writes each complement's `commodityCode` with `commodityCodeFor` and,
when a complement name is absent on recovery, resolves that code with
`commodityNameFor`. That fallback is non-injective for `Cat` and `Dog`: both
write `01061900`, whose reverse lookup returns `Cat`. Mapper B's normal shape
also stores the complement name, so the fallback only applies when that name
is absent. Mapper A stores the first commodity name at the notification's top
level and has the separate reverse-mapping losses described above.

## No gate reads an array-valued answer

The gate helpers compare a scalar stored value —
`values.includes(value)` in
[model/obligations/helpers.js](../model/obligations/helpers.js) — so an
array-valued answer would silently compare as no-match, not throw. The only
array-valued obligation, `transitedCountries`, gates nothing, so no live gate
reads an array. A future gate over an array-valued field must first teach the
helpers scalar-or-array membership; do not rely on the raw comparison.

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
- A **count drop below the record count blocks, never trims.** Lowering a
  species' animal count below its existing identifier-record count is rejected
  at the consignment-details save with an error naming the species; identifier
  records are never silently deleted to fit the new count.

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
