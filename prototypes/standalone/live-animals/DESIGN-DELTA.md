# Design delta vs obligations-v2-spike@1d0a904

Engine/flow/lib/shared divergences from the vendored source, per
PROVENANCE.md. Candidates to flow back to the spike as findings.

## 1. `activatedBy.includes` accepts a list (inc-003, 5ff76d6)

`engine/evaluate/predicate.js`: `includes` generalised from a single
target to set-intersection — a list target means "the answer (scalar or
array) includes any of these values". Needed by
`numberOfPackages.activatedBy = { commoditySelection, includes: [54 commodity codes] }`;
the M2 `frame: "anyItem"` / `frame: "enclosing"` work will use the same
form. Backwards compatible (single-target behaviour unchanged; all
pre-existing tests untouched). Documented in `docs/obligation-model.md`;
`analysis/reachability.js#gateValue` updated to pick a representative
activating value from a list.

## 3. `activatedBy.frame` — cross-frame conditionality (inc-031)

`engine/evaluate/predicate.js` + `registry.js#walk`: scope resolution grows
from two cases to four, driven by an OPT-IN `frame` key on `activatedBy`.

- **`frame` absent — unchanged.** Resolves in the node's own frame: a
  same-frame sibling reads inside the entry, anything else reads the top-level
  answer. Byte-for-byte the pre-M2 behaviour; every existing obligation and all
  133 pre-inc-031 tests are untouched (the primary backwards-compat witness).
- **`frame: "enclosing"`** — the reference lives in an ENCLOSING frame. The
  resolver walks strictly outward (nearest first) to the first ancestor frame
  whose obligation list holds the reference and reads it there — so it resolves
  correctly two frames out (a root flag read from a depth-2 unit). Needed by
  the unit-level identifiers + `permanentAddress`, each gated on the enclosing
  `commodityLines[i].commoditySelection`.
- **`frame: "anyItem"`** — the reference lives in the ITEMS of a collection;
  the predicate holds if ANY item satisfies it. Needed by the notification-level
  `countyParishHoldingCph` / `containsUnweanedAnimals`, gated across all commodity
  lines' `commoditySelection`.

Enabling mechanics: `walk` now yields a `frames` chain (innermost-first
`{ framePath, siblings }`) instead of the single `framePath`/`siblings` pair,
and `reconcile` gained a test-only `forest` seam so the synthetic cross-frame
scope+wipe specs can inject a hand-built forest (no live carrier exists until
inc-033..035). Both `frame` forms reuse the list-valued `includes` predicate
from delta #1. Proven in `engine/evaluate/cross-frame.test.js`: per-instance
scope with no sibling leak, field-level wipe at the exact path when a gate
leaves scope (destroyed not hidden), depth-2 two-frames-out resolution, and the
default-branch backwards-compat pins.

**Not done here (for the carrier increments):**

- `engine/evaluate/complete.js#entryComplete` still resolves ONLY same-frame
  sibling gates; a non-sibling gate is treated as owed (conservative). For a
  REQUIRED enclosing-gated unit field — `permanentAddress` — that means
  completeness would treat it as owed even on a line whose gate is off,
  diverging from scope. `entryComplete`/`collectionComplete` have no enclosing
  context in their signatures. inc-035 (which registers `animalIdentifiers` +
  `permanentAddress`, the first required enclosing-gated carrier) must thread
  frame context into the completeness resolver, or the resolver-unity invariant
  in obligation-model.md breaks. anyItem consumers are notification-level roots
  whose completeness is driven by `inScope`, so they need no `entryComplete`
  change.
- `analysis/reachability.js` needs NO change now (no frame gate is registered,
  so `buildWitnesses` never scaffolds one; `gateValue` is predicate-type based
  and frame-agnostic). When inc-033..035 register frame-gated obligations, that
  increment must extend `scaffoldFor` (satisfy an enclosing gate by seeding the
  ancestor frame; satisfy an anyItem gate by seeding one triggering collection
  entry) and `enumerateScopeStates` (the activator `commoditySelection` lives
  inside commodityLines items, not at top level) — otherwise the prover
  under-enumerates and can false-pass/false-fail. `orphanedRootIds` will also
  flag the frame obligations unless `commoditySelection` is reachable from
  `registry.all`.

## 2. Session cookie renamed (inc-001, f27b76c)

`engine/persistence/session.js`: `obligationsV2JourneyId` →
`liveAnimalsJourneyId`. Not a semantic divergence — both prototypes
register on one Hapi server and `server.state()` rejects duplicate
cookie names; the spike itself is unaffected. Arguably part of the
vendoring rename rather than a delta; recorded for completeness.
