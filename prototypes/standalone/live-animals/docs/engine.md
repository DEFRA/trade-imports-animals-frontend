# The engine after the regrouping

The engine (`engine/`) is the spike's pure state core. Pages never touch it
directly — they import one barrel and get a narrow, one-directional surface:
read scope and status up, write answers down. This page describes the layout
that landed with T9, why it looks like that, and the semantics of each part.

See the [docs index](README.md) for the surrounding guides (architecture,
adding a page, adding a field).

## The shape

```
engine/
  index.js          the barrel — the only import a page controller uses
  read.js           read side: get / makeScope / resume (+ the boot seam)
  write.js          write side: commit, collection ops, submitJourney
  journey.js        journey-isolation seam: request -> Journey document
  status.js         the five-status roll-up
  store.js          compat shim over the records port (legacy consumers only)
  evaluate/         the pure derivation core
    reconcile.js    scope + wipe, computed fresh from answers
    predicate.js    the activatedBy vocabulary and its resolution
    complete.js     depth-aware completeness (entryComplete / satisfied)
    collection-view.js  the loop primitive (structural facts only)
  persistence/
    records.js      RECORDS port — the durable store (stub for Mongo)
    session.js      SESSION port — who is the user, which journey is active
```

The engine root holds the sanctioned entry points. `evaluate/` is the pure
derivation core: no I/O, no `request`/`h`, and zero imports from `flow/`.
`persistence/` holds the two ports. Lifecycle tests sit next to what they pin
(`engine/submit-is-finalise.test.js`, `engine/evaluate/reconcile.test.js`,
`engine/persistence/records-port.test.js`).

## Why this layout

T9 regrouped a flat 25-entry folder into the shape above. The judged rationale:

- **The four root modules are externally pinned.** `read.js`, `journey.js`,
  `status.js` and `store.js` are imported from outside the engine (boot roots,
  the flow layer, legacy tests), so they stay at the root where those imports
  already point. `write.js` sits beside `read.js` as its facade peer — the two
  halves of the surface the barrel re-exports.
- **Scenario specs left the engine.** The four whole-journey specs
  (`indexed.test.js`, `item-conditional.test.js`, `nested.test.js`,
  `store-ops.test.js`) import `flow/` and `features/`, so they moved to the
  spike root beside the other scenario tests. That makes the layering seam
  mechanically checkable: `grep -r "from '.*flow/" engine/` returns zero hits,
  with no "source files only" caveat.
- **Rejected alternatives.** A data-flow taxonomy and a responsibility taxonomy
  both forced controller edits, which the task forbade. `__tests__/` folders
  and re-export shims were rejected across the board.

## The barrel facade

`engine/index.js` is a pure barrel — it owns no logic. Page controllers import
it as `import * as state` and see exactly this surface:

| Direction      | Names                                                                                                                        |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Read up        | `get`, `makeScope`, `resume`                                                                                                 |
| Write down     | `commit`, `appendEntry` / `appendEntryAt`, `updateEntry` / `updateEntryAt`, `removeEntry` / `removeEntryAt`, `submitJourney` |
| Loop primitive | `collectionView`                                                                                                             |

Two deliberate absences define the shape:

- **No `setScope` and no `delete(otherObligation)`.** Scope is always derived
  and wipe is always applied by the engine. A page cannot assert scope or
  hand-roll a wipe.
- **No `configureReadyForCheckYourAnswers`.** Boot roots (`routes.js`) import it
  straight from `engine/read.js`, keeping the `state.*` surface stable for pages.

The barrel re-exports names explicitly — never `export *` — so the facade
cannot silently widen when a source module gains an internal export.

## The boot seam

Submit readiness (`readyForCheckYourAnswers`) needs the boot-built dispatch
index and the flow's section list. That is flow knowledge, and the engine must
not import `flow/`. So the roll-up is handed **in** at boot: `routes.js` calls
`configureReadyForCheckYourAnswers(readyForCheckYourAnswers)` during plugin
registration — a downward flow-to-engine data hand-off that keeps the engine
flow-ignorant. (The roll-up excludes the `review` section; it gates both
`submitJourney` in `engine/write.js` and the review section's authored gate.)

The unconfigured default throws:

```js
let readyForCheckYourAnswersFn = () => {
  throw new Error(
    'readyForCheckYourAnswers not configured — call ' +
      'configureReadyForCheckYourAnswers() at boot'
  )
}
```

This is deliberate. An unconfigured `makeScope` is a hard, loud failure — never
a silent wrong answer. Do not soften the throw to `return false`.

## Status semantics

`engine/status.js` rolls a set of obligation ids into one of five statuses:

| Status           | Meaning                                                   |
| ---------------- | --------------------------------------------------------- |
| `not-applicable` | none of the ids are in scope                              |
| `fulfilled`      | every in-scope required id is satisfied                   |
| `in-progress`    | some progress made, but a required id is still missing    |
| `not-started`    | in scope, required ids owed, nothing answered yet         |
| `optional`       | in scope, nothing required owed, and nothing answered yet |

Two edges worth knowing:

- **Started is deliberately weaker than satisfied.** A collection counts as
  started once it holds at least one entry, even an incomplete one. Using
  `satisfied` for the started check would misreport a section whose only
  obligation is a partially filled collection (for example the commodities
  section, which collects just `commodityLines`) as Not started.
- **A section owing nothing required is Optional until touched.** If the
  in-scope ids include no `required` or `requiredAtLeastOne` obligation, the
  status is `optional` while nothing is answered (the hub shows "Optional" and
  it does not count towards the completed total); once ≥1 answer exists it
  tracks `in-progress` / `fulfilled` by completeness. This is what stops a blank
  optional section (e.g. `documents`) reading "Completed". `readyForCheckYourAnswers`
  accepts `optional` alongside `fulfilled`/`not-applicable` — you can submit
  with none.

`status.js` is engine-pure. The flow-aware section roll-up (`sectionStatus`,
`readyForCheckYourAnswers`) lives in `flow/section-status.js` and reads
`statusOf` downward — never the reverse.

## Completeness semantics

`engine/evaluate/complete.js` answers "is this obligation's mandate met?". It
is split out of `status.js` so status depends on completeness one way. Three
functions:

- **`satisfied(id, answers)`** — the depth switch. A collection descends into
  `collectionComplete`; a scalar is simply answered or not.
- **`collectionComplete(obligation, value)`** — the cardinality mandate AND
  every existing entry complete. `requiredAtLeastOne` governs only whether
  **zero** entries is acceptable. Whatever the mandate, any entry that exists
  must itself be complete — a claim with a blank required field never counts
  the section done.
- **`entryComplete(obligation, entry)`** — every required sub-obligation in the
  item is satisfied. Item-relative gates resolve against this entry, and a
  nested collection defers back to `collectionComplete`.

### Worked example: the commodity package count

The `commodityLines` collection (`features/commodities/obligations.js`) has an
item-conditional sub-obligation: `numberOfPackages` is owed only when the
sibling `commoditySelection` is one of the package-count commodities
(`activatedBy: { obligation: commoditySelection, includes: PACKAGE_COUNT_COMMODITIES }`).

- A **fish** line (not on the list) never owes a package count. The gate does
  not fire for that entry, so a stored `numberOfPackages` is out of scope and
  gets wiped at its exact path.
- A **cattle** line (on the list) has `numberOfPackages` in scope. It is
  optional, so the line is complete with or without it.

`entryComplete` resolves the gate with the same sibling-identity check that
`reconcile`'s predicate resolution uses, so completeness and scope can never
disagree about whether a sub-obligation is owed. A sub-obligation gated on a
non-sibling cannot be resolved from inside the entry, so it is treated as owed
— conservative, never falsely complete.

`numberOfPackages` is the only live item-conditional obligation, and it is
INCLUDES-gated and OPTIONAL. An item-conditional field that is EQUALS-gated, or
one that is REQUIRED (so its gate feeds completeness), or one nested at depth 2,
is fully engine-supported but has no live carrier since the car windscreen
claim (`drivers[i].claims[j].windscreenProvider`) was removed with the
named-driver section — see [limits.md](limits.md). M2's `animalIdentifiers`
restores a live depth-2 / required-sibling carrier.

## store.js is a compat shim

`engine/store.js` re-expresses the old `store` surface (`create`, `get`,
`has`, `saveAnswers`, `submit`, `clear`) over the records port. It exists only
so the pre-reshape consumers keep working unchanged.

New code imports the ports directly:

```js
import { records } from './persistence/records.js'
import { session } from './persistence/session.js'
```

Do not add new consumers of `store.js`.
