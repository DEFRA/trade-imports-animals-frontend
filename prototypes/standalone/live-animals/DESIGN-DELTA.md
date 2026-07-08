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
- `analysis/reachability.js` needed no change until a frame gate was
  registered. inc-033 registered the first — `containsUnweanedAnimals`
  (frame:"anyItem") — and extended the prover accordingly: `scaffoldFor` now
  seeds ONE triggering collection entry for an anyItem gate (the enclosing-gate
  seed is still owed by inc-035), and `orphanedRootIds` now checks activator
  membership against EVERY registered obligation (walkObligations), not just the
  top-level `registry.all`, so a commodityLines ITEM activator like
  `commoditySelection` is recognised and the anyItem root is not wrongly
  orphaned. `enumerateScopeStates` was left a pure top-level cartesian (its
  docstring now records why): the anyItem activator is not a top-level scalar
  axis, so it is seeded structurally by `scaffoldFor` rather than enumerated —
  the honest recomputed pin stays green (`proveReachability` empty,
  `orphanedRootIds` empty) with no spurious axis. Still owed by inc-035
  (enclosing carrier `permanentAddress`): the `scaffoldFor` enclosing-frame seed
  and any `entryComplete` frame-context threading noted above.

## 4. `requiredOneOf` — sibling-at-least-one group mandate (inc-032)

`engine/evaluate/complete.js#entryComplete`: a collection may carry an OPT-IN
`requiredOneOf` array naming a SUBSET of its `item` field ids. An entry is
complete only if, on top of the existing per-field checks, at least one of the
named fields is answered. This expresses the V4 rule "a notification must be
submitted with at least one animal identifier PER ANIMAL" — each identifier
field (passport / tattoo / ear tag / horse name / identification details /
description) is individually OPTIONAL, but the group is owed once per unit
entry. `animalIdentifiers.permanentAddress` is a sibling `item` but is
deliberately NOT in the group, so the marker names fields explicitly rather
than meaning "any sibling".

Same-frame only: the named ids are siblings within the one entry, so the check
reads `entry[id]` directly — no gate resolution, no enclosing-frame context.
It is orthogonal to `requiredAtLeastOne` (which counts ENTRIES): a collection
can carry both (as `animalIdentifiers` will), and they compose without
interaction. The marker is read-only and never touches `reconcile` / scope /
wipe, so no path can be orphaned by it. Backwards compatible: absent marker =
today's per-field behaviour, byte-for-byte; `status.js` is unchanged (the
mandate flows through `satisfied -> collectionComplete -> entryComplete`, and
the only live carrier also has `requiredAtLeastOne`, so `isRequired` already
counts it). Proven in `engine/evaluate/sibling-at-least-one.test.js`:
zero-of-group incomplete, exactly-one complete, more-stays-complete,
non-group-sibling does not satisfy, per-field required still enforced on top,
per-entry across a collection, depth-2 nested, and the no-marker
backwards-compat pin.

## 2. Session cookie renamed (inc-001, f27b76c)

`engine/persistence/session.js`: `obligationsV2JourneyId` →
`liveAnimalsJourneyId`. Not a semantic divergence — both prototypes
register on one Hapi server and `server.state()` rejects duplicate
cookie names; the spike itself is unaffected. Arguably part of the
vendoring rename rather than a delta; recorded for completeness.
