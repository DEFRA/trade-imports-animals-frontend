# `model/obligations`

## Orientation

This module defines the **obligation manifest** and the **evaluator** that
turns a stored `fulfilments` map into per-obligation `implications` — the
in-scope / out-of-scope, mandatory / optional, per-instance verdicts that the
UI, controllers, and analysis tools all consume. It is a pure, side-effect-free
model. It does not know about HTTP requests, the answers POJO the UI works
with, the journey / flow that decides which page to render next, or the
storage backend. All of those live in `bridge/`, `engine/`, and `flow/`
respectively; this module is what they call into.

## Vocabulary

The canonical terms used in identifiers, prose, and docs. Every entry
below reads exactly the same way in the code — one word, one meaning.

| Term                    | Meaning                                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `obligation`            | One manifest entry — a field, a group, or an unindexed value the notification carries.                                                              |
| `fulfilment`            | One stored value for one obligation. Either an unindexed value (`'FR'`, `42`, `null`) or an `indexedFulfilments` map.                               |
| `fulfilments`           | The whole snapshot: `Record<obligationId, fulfilment>`. The evaluator's input.                                                                      |
| `fulfilmentIndex`       | A composite key identifying one instance of a group: `'line0'`, `'line0.unit1'`, etc. Segments joined by `INDEX_DELIMITER` (`.`).                   |
| `indexedFulfilments`    | A map keyed by `fulfilmentIndex` — the storage shape for an indexed obligation.                                                                     |
| `instance`              | One entry in a group's enumeration, identified by a `fulfilmentIndex`.                                                                              |
| `implication`           | The evaluator's verdict for one obligation: `{ inScope, status?, fulfilmentIndexes?, reasons? }`.                                                   |
| `applicabilityDecision` | The raw return value from an obligation's `applyTo` function, before the implication constructor consumes it.                                       |
| `leaf`                  | An obligation that is not a group (has no children).                                                                                                |
| `group`                 | An obligation that other obligations reference via `within`.                                                                                        |
| `unindexed`             | An obligation whose stored value lives directly at `state.fulfilments[id]`. No `fulfilmentIndex`.                                                   |
| `indexed`               | An obligation whose stored values live in an `indexedFulfilments` map.                                                                              |
| `applyTo`               | The optional `applyTo(fulfilments, fulfilmentIndexesByObligationId) → decision` closure on an obligation. Naming role: "gate".                      |
| `gate`                  | The concept: what an `applyTo` does — makes a scope decision. Used freely in prose and helper names (`equalsGate`, `presentGate`, etc.).            |
| `gateObligation`        | The obligation whose stored value a gate reads through its predicate.                                                                               |
| `gatedParentGroup`      | The gated obligation's parent group when the gate is at a shallower identity level; the gate's decision fans onto this group's `fulfilmentIndexes`. |
| `reasons`               | An optional array of `{ code, explanation }` justifications on an in-scope decision.                                                                |
| `within`                | An obligation's link to its parent group.                                                                                                           |
| `status`                | `'mandatory'` or `'optional'` — the effective mandate on an instance.                                                                               |
| `scope`                 | Whether an obligation applies (`inScope: true/false`).                                                                                              |
| `converge-purge`        | The evaluator's fixpoint loop — `{enumerate → applyTo → isInScope → purge}` until fulfilments stop shrinking.                                       |
| `requires`              | Group-level invariants: `minEntries`, `maxEntries`, `anyOfIds`, `allOrNothingOfIds`, `fulfilmentIndexCountEquals`.                                  |

## Taxonomy — the five obligation categories

Every obligation classifies into exactly one category (see
`evaluator/manifest-index/classify-obligations.js`). The split is by two axes:
structural shape (unindexed vs group) and, for indexed leaves, enumeration
provenance (where each leaf's `fulfilmentIndexes` come from).

| Category             | Structural shape                                                  | Enumeration provenance                                                    | Implication constructor       |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------- |
| `unindexed`          | No `fulfilmentIndex`; stored directly at `state.fulfilments[id]`. | —                                                                         | `unindexedImplication`        |
| `group`              | Has children via `within` back-refs.                              | Enumerated from descendants' stored keys.                                 | `groupImplication`            |
| `parent-derived`     | Indexed leaf.                                                     | From the parent group's enumeration — one entry at every parent instance. | `parentDerivedImplication`    |
| `apply-to-derived`   | Indexed leaf.                                                     | From the `applyTo` gate's output.                                         | `applyToDerivedImplication`   |
| `user-input-derived` | Indexed leaf.                                                     | From the user's own inputs (`indexedBy.source !== 'derived'`).            | `userInputDerivedImplication` |

## Storage shapes

Concrete examples of what `state.fulfilments` and `state.obligations`
(implications) look like for each category. `state` is the object the
evaluator's `evaluate(fulfilments)` returns.

### `unindexed` — e.g. `countryOfOrigin`

```js
state.fulfilments.countryOfOrigin === 'FR'

state.obligations.countryOfOrigin ===
  {
    inScope: true,
    status: 'mandatory'
  }
```

### `group` — e.g. `commodityLine`

Groups store no fulfilment of their own. Their `fulfilmentIndexes` come
from descendant leaves.

```js
state.fulfilments.commodityLine === undefined

state.obligations.commodityLine ===
  {
    inScope: true,
    fulfilmentIndexes: ['line0', 'line1']
  }
```

### `parent-derived` — e.g. `commodityCode` (`within: commodityLine`)

One stored value per parent instance; one `fulfilmentIndex` per parent
instance in the implication.

```js
state.fulfilments.commodityCode ===
  {
    line0: 'Cow',
    line1: 'Horse'
  }

state.obligations.commodityCode ===
  {
    inScope: true,
    status: 'mandatory',
    fulfilmentIndexes: ['line0', 'line1']
  }
```

### `apply-to-derived` — e.g. `passport` (`within: unitRecord`, `applyTo` allowListed on `commodityCode`)

The `applyTo` gate produces the set of `fulfilmentIndexes` this leaf is
authorised for. Only stored values under authorised indexes survive
purge.

```js
state.fulfilments.passport ===
  {
    'line0.unit0': 'UK123456',
    'line0.unit1': 'UK123457'
  }

state.obligations.passport ===
  {
    inScope: true,
    status: 'mandatory',
    fulfilmentIndexes: ['line0.unit0', 'line0.unit1'],
    reasons: [
      {
        code: 'obligation.passport.applicable.becausePassportCommodity',
        explanation:
          'passport applies on units of lines whose commodityCode is in the passport list'
      }
    ]
  }
```

### `user-input-derived` — e.g. `documents` upload records

The user creates entries directly; the storage keys ARE the
`fulfilmentIndexes`.

```js
state.fulfilments.documentUploadId ===
  {
    d0: 'upload-001',
    d1: 'upload-002'
  }

state.obligations.documentUploadId ===
  {
    inScope: true,
    status: 'optional',
    fulfilmentIndexes: ['d0', 'd1']
  }
```

## File map

Top-level primitives (used everywhere else in the module):

- `manifest.js` — the configured obligation set for this Service. `configureObligationSet` is called by the set-init code once per process.
- `manifest-graph.js` — pure walks over the manifest (`ancestorChain`, `isGroup`, `leavesUnder`, `groupsFrom`). Reads only from `manifest.js`.
- `index-delimiter.js` — the `.` used to join `fulfilmentIndex` segments.
- `is-blank-value.js` — the "blank fulfilment" predicate used by the read-side queries.
- `state-queries.js` — read-side queries over evaluator output (`leafSatisfied`, `effectiveStatus`, `groupInvariantErrors`).
- `instance-complete.js` — per-instance completeness verdict.
- `helper-internals.js` — shape-level utilities shared by gate helpers (`isNonArrayObject`, `readGate`).

`evaluator/`:

- `evaluator/index.js` — `createObligationEvaluator({ obligations })` and its `evaluate(fulfilments)`. See the docstring there for the algorithm.
- `evaluator/converge-purge.js` — the fixpoint loop.
- `evaluator/manifest-index/` — pre-computed lookup tables (`buildObligationsById`, `buildObligationChildren`, `buildAncestorGroups`, `buildDescendants`, `classifyObligations`).
- `evaluator/scope/` — `runApplicabilityDecisions`, `makeInScopeCheck`.
- `evaluator/enumeration/` — pre-purge (`enumerateGroupPathsFromStorage`) and post-purge (`enumerateGroupFulfilmentIndexesPostPurge`) group `fulfilmentIndex` derivation.
- `evaluator/purge/` — `dropUnrecognisedFulfilments`, `purgeStorage`.
- `evaluator/implications/` — the five implication constructors and their dispatcher (`buildImplication` / `buildImplications`).
- `evaluator/internal/` — `deriveGroupFulfilmentIndexes` (the shared engine for both enumeration passes), `fulfilmentsEqual` (structural equality for the fixpoint check).

`helpers/` — gate helper factories that build `applyTo` closures. See `helpers/index.js` for the pick-a-helper guidance. Split into:

- `helpers/single-decision/` — helpers whose gate returns one `{ inScope, status, reasons? }` verdict (`equalsGate`, `presentGate`, `includesGate`, `matches`, `anyAllowListed`, `alwaysInScope`, `branchedGate`, `present`). Use when the gated obligation is `unindexed`.
- `helpers/per-fulfilmentIndex-decision/` — helpers whose gate returns a decision naming which `fulfilmentIndexes` are in scope (`allowListed`, `notInUnionOf`). Use when the gated obligation is indexed.
- `helpers/introspection/` — `obligationMetadata` — surfaces the gate's `.metadata` sidecar + the `dependsOn` schema key for the reachability prover.

## Algorithm

The per-call evaluation algorithm is described in
`evaluator/index.js`'s module docstring. In outline:

1. Drop unrecognised obligation ids (tolerate-and-amend).
2. Fixpoint (`convergePurge`): repeat `{enumerate → applyTo → isInScope → purge}` until the fulfilments map stops shrinking. Guarantees every `applyTo` sees the same post-purge view its neighbours see.
3. Post-purge enumeration for group implications.
4. Build per-obligation implications.
