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
  context in their signatures. **DONE in inc-035** — see DESIGN-DELTA #5, which
  threads an opt-in enclosing `ctx` through the completeness resolver
  backwards-compatibly. anyItem consumers are notification-level roots
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
  `orphanedRootIds` empty) with no spurious axis. **The enclosing-frame seed is
  DONE in inc-035** — `scaffoldFor` now seeds a `frame:"enclosing"` gate's
  triggering value on the nearest ancestor frame that holds the reference (see
  DESIGN-DELTA #5), so `permanentAddress` and the gated identifier type fields
  get honest witnesses; the recomputed pin stays green and `orphanedRootIds`
  stays empty (the identifier fields are collection ITEMS, not top-level roots).

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

## 5. Enclosing-frame completeness threading (inc-035)

`engine/evaluate/complete.js`: `entryComplete` / `collectionComplete` gain an
OPT-IN `ctx` parameter carrying the enclosing-frame chain, so a sub-field gated
on an ENCLOSING frame (`activatedBy.frame === 'enclosing'`) resolves for
completeness exactly as `reconcile`'s `evalPredicate` resolves it for scope —
the resolver-unity invariant (obligation-model.md) now holds at depth. Needed by
`animalIdentifiers.permanentAddress` (inc-035), the FIRST required
enclosing-gated carrier: without it a required off-gate field is counted owed on
every unit regardless of the enclosing commodity, so the commodities task could
never complete on a non-Cats/Dogs line.

- **Shape.** `ctx = { answers, frames }` at entry level (mirrors `evalPredicate`);
  `collectionComplete` takes `{ answers, basePath, enclosingFrames }` and builds
  each entry's innermost-first `frames` chain. `satisfied` seeds the root frame
  (`{ framePath: [], siblings: registry.all }`) so live callers thread context
  automatically.
- **Backwards compatible.** ABSENT ctx = pre-inc-035 behaviour byte-for-byte:
  only same-frame sibling gates resolve, a non-sibling gate falls through to the
  per-field required check (owed, conservative). `collectionView` and the
  synthetic unit tests (`sibling-at-least-one.test.js`) call with no ctx and are
  unchanged. Same-frame `includes` gates (`numberOfPackages`) are unaffected —
  they never enter the enclosing branch.
- **Reachability.** `analysis/reachability.js#scaffoldFor` now seeds a
  `frame:"enclosing"` gate's triggering value on the nearest ancestor frame that
  holds the referenced obligation (a small stack refactor; the anyItem and
  same-frame seeds are unchanged). `orphanedRootIds` stays empty — the gated
  identifier fields are collection ITEMS, not top-level roots.

Proven in `engine/evaluate/enclosing-complete.test.js`: off-gate unit does not
owe permanentAddress, on-gate unit does (complete once answered), per-unit scope
with no leak between sibling lines, requiredOneOf still enforced off-gate,
depth-2 ctx built by hand, and the no-ctx backwards-compat pins (required
enclosing-gated field owed without ctx; same-frame and gate-free collections
unchanged). The depth-2 wipe counterpart is in `store-ops.test.js`.

## 6. `mandate.enforcedAt`-derived flow sequencing + the OPTIONAL status

Two coupled hub/nav bugs (task-list tags rendered wrong; every row was a live
link with no gating) were fixed together because they meet at the "Cannot start
yet" state. This is the first flow-behaviour divergence from the spike: the
engine vocabulary additions are opt-in and backwards-compatible, but the flow
sequencing and hub rendering **change by design** — that is the bug fix.

### New `enforcedAt` interpretation

`features/origin/obligations.js` + `features/commodities/obligations.js`: the
two "needed-to-PROCEED" obligations (`countryOfOrigin`, notification-level;
`commoditySelection`, a `commodityLines` ITEM field) now carry
`enforcedAt: 'continue'`, mirroring the spec. The engine reads this fact rather
than hardcoding ids:

- **`enforcedAt: 'continue'`** — the obligation blocks LATER flow steps until it
  is answered. `flow/prerequisites.js` derives, for any page/section, the set of
  `continue` obligation ids owned by a STRICTLY-EARLIER flow step, from flow
  order (`allFlowPages`) + the dispatch index (`pageOfObligation`) + the
  obligation's own `enforcedAt`. No hand-authored prerequisite graph — origin is
  always open, commodities opens once `countryOfOrigin` is answered, everything
  after commodities opens once `commoditySelection` is. A step never blocks on
  its own `continue` obligation, only strictly-earlier ones.
- **`enforcedAt: 'submit'`** (the default reading for every other required
  obligation) — feeds submit-readiness only, never blocks a mid-journey step.

Backwards compatible: an obligation with no `enforcedAt` is never anyone's RULE
1 prerequisite, so existing sequencing is unchanged for every other field.

### Instance-aware `scope.answered`

`engine/read.js#makeScope` gains `answered(id)` — true if ANY instance of `id`
at any depth is answered, by walking `registry.walk(answers)` (not a top-level
`answers[id]` lookup). This is what lets a prerequisite key on an item-level
obligation: `commoditySelection` is "answered" once ANY commodity line fills it.
`flow/gates.js#derivedGate` gains a prerequisites clause
(`prereqIds.every(scope.answered)`) alongside the existing in-scope reachability
clause and the empty-collects reachable invariant; the `assertDispatchBuilt`
fail-loud guard is unchanged.

### The `review` authored gate + the `readyForQuote` → `readyForCheckYourAnswers`

rename/redefinition

RULE 2 gates the `review` section ("Check and submit") on submit-readiness. But
`declaration` (collected inside the review section) rolls the review section up
to NOT_STARTED, and the old readiness roll-up (`nonQuoteSections` = ALL sections)
included review — so gating review on it would DEADLOCK (you confirm the
declaration inside the very section it gates).

Fix: the roll-up was redefined to EXCLUDE the review section
(`flow/flow.js#answerSections = sections without 'review'`) and renamed
`readyForQuote` → `readyForCheckYourAnswers` (`configureReadyForQuote` →
`configureReadyForCheckYourAnswers`, `scope.readyForQuote` →
`scope.readyForCheckYourAnswers`). The review section carries the flow's only
authored gate, `gate: (scope) => scope.readyForCheckYourAnswers`. Submit safety
is unweakened: the declaration page's own validator enforces
`declaration === 'confirmed'` BEFORE `submitJourney` runs, so excluding
review/declaration from the readiness roll-up does not let an unconfirmed
journey submit — `submitJourney` still consults the renamed signal, now
correctly meaning "every ANSWER section is ready".

### The OPTIONAL status

`engine/status.js` gains `OPTIONAL`. A section owing nothing required used to
return FULFILLED unconditionally (so a blank optional `documents` section read
"Completed" and counted towards "X of N"). It now returns OPTIONAL while
untouched, then tracks IN_PROGRESS / FULFILLED by completeness once ≥1 entry
exists. `readyForCheckYourAnswers` accepts OPTIONAL alongside FULFILLED/NA (you
can submit with no documents). The hub (`features/hub/controller.js`) maps the
GDS-canonical vocabulary: FULFILLED → plain "Completed", OPTIONAL → plain
"Optional", IN_PROGRESS → light-blue "In progress", NOT_STARTED → **blue** "Not
yet started", and a gated-out row → grey **text** "Cannot start yet"
(`govuk-task-list__status--cannot-start-yet`) with NO link. `countCompletedGroups`
still counts FULFILLED only, so a blank journey now reads "0 of 7".

### Reachability prover

`analysis/reachability.js`: the flow gates now read answers, so the dead-end
prover's witnesses ride a fully submit-ready base journey (`submitReadySeed`)
rather than scope-only fragments — the "enumerate more witnesses" hook the
prover's soundness note always reserved for exactly this. Blank enumerated axes
are dropped before layering (activation is always positive, so no witness needs
a blank axis to enter scope, but a blank would defeat the RULE 2 review gate for
the always-in-scope `declaration`). `proveReachability` stays empty and the
teeth tests keep their teeth.

Proven across `flow/gates.test.js` (RULE 1 + RULE 2, no deadlock),
`indexed.test.js` (OPTIONAL / IN_PROGRESS / FULFILLED for an optional section),
`t2-hub-copy.test.js` (new vocabulary, "0 of 7", Cannot-start-yet rows have no
link), and `analysis/reachability.test.js` (recomputed pin stays green).

## 7. `activatedBy.notInUnionOf` — negated cross-frame gating by complement-by-reference (inc-040)

`engine/evaluate/predicate.js`: a fourth activation operator, sitting beside
`equals` / `includes` / `present`. `notInUnionOf` names a list of OBLIGATION
references; the predicate holds when the gating obligation's answer is
ANSWERED and appears in NONE of the named obligations' `includes` lists. The
engine derives the union at runtime (`includesUnion`, exported for reuse) —
the complement is expressed BY REFERENCE to the positive gates, so there is
no duplicated commodity list to drift when a typed-identifier list changes
(Sam's D1(a) ruling, M3-0A, closes c-028's over-show).

- **Carrier.** `animalIdentifierIdentificationDetails` +
  `animalIdentifierDescription` (`features/commodities/obligations.js`)
  switch from always-in-scope to
  `{ obligation: commoditySelection, frame: "enclosing", notInUnionOf: [animalIdentifierPassport, animalIdentifierTattoo, animalIdentifierEarTag, horseName] }`
  with `wipeOnExit: true`. The free-text fallbacks now render and count only
  for commodities in NO typed-identifier list (V4's bees/poultry intent —
  today's stub that means Fish only); a stale fallback on a typed line is
  destroyed at reconcile, so it can never satisfy the `requiredOneOf` group.
- **Unanswered gate = not active.** Activation stays strictly positive: a
  blank `commoditySelection` activates nothing, preserving the reachability
  prover's "no witness needs a blank axis" property.
- **Backwards compatible.** The operator keys are mutually exclusive; every
  existing `equals` / `includes` / `present` gate takes the same branch as
  before, and all pre-inc-040 tests are untouched. The form composes with the
  existing `frame` vocabulary (delta #3) unchanged — resolution is the same
  frame walk, only the value test differs.
- **Reachability.** `analysis/reachability.js#gateValue` synthesises a
  witness value guaranteed outside the derived union, so both fallback
  fields get honest witnesses and the recomputed pin stays green.
- **UI.** The identifier entry form scopes the fallback inputs off the
  obligation's own gate (`includesUnion` over `notInUnionOf`), the same
  pattern as the typed-identifier fields' `includes` filter — no parallel
  list in the controller.

Proven in `engine/evaluate/cross-frame.test.js` ("negated cross-frame gating"):
union derived from every referenced list (deduplicated), per-instance on/off
with no sibling leak, unanswered-gate inactivity, exact-path wipe leaving the
typed sibling untouched, wiped-stale-value-cannot-satisfy-`requiredOneOf`, and
depth-2 enclosing resolution.

## 8. Journey reference strip in the shared kit/layout + GBN-AG stub ids (inc-048)

`shared/kit.js` + `shared/layout.njk`: the kit gains a `journeyStrip(journey)`
primitive mapping the journey record to a status-tag view model (`in-progress`
→ blue "Draft", `submitted` → green "Submitted", no journey → `null`), and
`kit.base` gains an opt-in `journey` option that feeds it. The shared layout
renders the strip (govukTag + bold reference) above the page heading whenever
`journeyStrip` is set — one partial, inherited by every template that extends
the layout (M3-08, f-100/f-025/f-019/f-093; Sam's D2/D3 rulings).

- **Opt-in per page, data from the one-load-per-request journey record.** The
  hub and every post-origin task page pass `journey` from `state.get`/the
  commit read view; POST error re-renders read the same memoised record (no
  second store load). Pre-origin surfaces pass nothing: the dashboard and the
  import-type filter never render the strip, and origin passes the journey
  only once it has committed answers (`journeyIfStarted`) — the spec fiction
  is that the reference is assigned on the journey's first save. The
  confirmation page also omits the strip: its govukPanel already carries the
  reference, and a second rendering above the panel would double it.
- **Stub reference format (D2).** `services/persistence/records/stub.js`
  `create` mints `GBN-AG-YY-XXXXXX` (two-digit year + six Crockford-base32
  characters via `randomInt`) instead of a raw UUID, matching the backend's
  canonical V4 format so stub and real modes render the same strip shape.
  Real mode is untouched — its journeyId IS the backend reference. Mapper
  parity is unaffected: stub answers never pass through the notification
  mappers, and the parity fixtures pin their own hardcoded references.
- **Backwards compatible.** `journey` absent = pre-inc-048 view model
  byte-for-byte (`journeyStrip: null`, nothing rendered). No engine, flow or
  lib change; no test pinned the UUID shape.

Proven in `shared/journey-strip.test.js` (strip on hub and a task page,
Draft/Submitted mapping, absence on dashboard/filter/fresh origin, presence on
origin once started) and `services/persistence/records/records-port.test.js`
(GBN-AG-YY-XXXXXX shape from stub `create`).

## 2. Session cookie renamed (inc-001, f27b76c)

`engine/persistence/session.js`: `obligationsV2JourneyId` →
`liveAnimalsJourneyId`. Not a semantic divergence — both prototypes
register on one Hapi server and `server.state()` rejects duplicate
cookie names; the spike itself is unaffected. Arguably part of the
vendoring rename rather than a delta; recorded for completeness.
