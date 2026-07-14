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

## 9. Dual-save + cancel hub exits in the shared kit (inc-049)

`shared/kit.js` + `shared/save-actions.njk`: every flow/task page gains the
design's three exits (M3-09, f-016/f-046/f-063/f-099; Sam's D4/D5 rulings) —
the existing primary submit, a secondary named submit **"Save and return to
hub"** (`name="exit" value="hub"`, the GDS multiple-submit convention) and a
**"Cancel and return to hub"** link (plain GET to the hub, no write, discards
the form input). The kit resolves the exit, not the pages:
`kit.hubExitTarget(request)` returns the hub path when the named submit fired
(else `null`), `kit.nextTarget` consults it FIRST, and `kit.base` now exposes
`hubHref` for the cancel link. The `saveActions(hubHref, primary)` macro
renders the triple as one `govuk-button-group`; a page with its own primary
semantics passes it through (documents/list/identifier-list keep `Continue`
`name=action`, the identifier entry keeps `Add animal`).

- **Identical validation (D5).** The secondary submit runs the page's POST
  handler unchanged — the error branch renders before any redirect is
  resolved, so a failing "Save and return to hub" shows exactly the errors a
  failing "Save and continue" would, and commits nothing. On success the
  commit goes through the same `state.commit` → `engine/write.js` path (and
  the collection loops' `appendEntry`/`updateEntry`/`appendEntryAt`); only
  the success redirect changes. No new persistence surface.
- **Uniform per D4, exits ADDED to multi-button pages.** All flow pages carry
  the triple — including the addresses landing page the design was
  inconsistent about — and the documents loop, commodities select/details/
  list and the animal-identifier list/entry loop gain the two hub exits
  WITHOUT disturbing their own actions (`action=add` still loops). The
  sub-page controllers with bespoke success targets (commodities select →
  details, details → list, identifier entry/list → list/commodities,
  cph-number's `?return=addresses`) consult `kit.hubExitTarget` first.
- **Precedence: an explicit hub choice always wins.** `?change=1` still sends
  a save-and-CONTINUE back to check-your-answers, but a user explicitly
  choosing "Save and return to hub" goes to the hub — same rule against the
  cph-number addresses-hub entry context. Cancel is a link, so it needs no
  precedence: it never posts.
- **Exclusions.** Aux spokes keep their existing pattern (five address
  pickers, create-address); check-answers is read-only; declaration keeps its
  single submit (it IS the submit action, not a task save); confirmation,
  hub, dashboard and the import-type filter have no task form. The filter's
  POST does flow through `kit.nextTarget`, but its template renders no exit
  button, so its behaviour is unchanged.
- **Backwards compatible.** No `exit` key in the payload = pre-inc-049
  behaviour byte-for-byte in every handler; `hubHref` is additive view-model
  data. No engine, flow or lib change.

Proven in `shared/save-actions.test.js`: exit submit commits + redirects to
the hub (scalar page, collection sub-page, multi-button loop), identical
validation errors on both submits with nothing committed, save-and-continue
untouched, change-context precedence both ways, cph return-context
precedence, and the `hubHref`/`hubExitTarget` kit contracts.

## 10. Exit-based change-context return through the collection loops (inc-050)

`shared/kit.js`: the scalar `?change=1` check-your-answers round-trip
(behaviour `change-from-cya-collection-round-trip`, f-108; Sam's D6 ruling)
extends to the collection routes via two new kit primitives —
`kit.changeContext(request)` / `kit.withChangeContext(request, href)` carry
the flag across the loops' internal links and PRG redirects, and
`kit.exitTarget(request, fallback)` resolves a loop's exit
(`hubExitTarget` ?? change-context → check-your-answers ?? the loop's own
fallback). `kit.nextTarget` is now `exitTarget` over `nextInSection` —
behaviour byte-for-byte identical for every scalar page.

- **The exit-based return rule (D6).** The CYA collection Change actions
  (species card → `/commodities` and `/commodities/N/identifiers`, uploaded
  documents card → `/accompanying-documents`) now carry `?change=1`, matching
  the scalar `changeHref` convention. The context THREADS through the
  collection's internal navigation untouched — commodities select/details
  progression, the identifier list/entry loop, the documents single-page
  loop: every add / remove / save round-trip and internal link (row actions,
  back links, invalid-index guards) re-appends the flag, and the forms POST
  to their own URL so the query survives validation error re-renders. ONLY
  the collection's exit — the list/loop page's Continue (the identifier
  list's Continue today; "Save and finish" when inc-063 lands) — repoints to
  check-your-answers when the context is present. Mid-loop actions never
  bounce to CYA early.
- **Precedence (established at inc-049, unchanged).** Explicit `exit=hub`
  beats change context; change context beats `nextInSection` / the loop
  fallback. The addresses hub/spokes keep their own return conventions
  (`?return=addresses`, `?for=`) — out of scope.
- **One mechanism, promoted.** transit-countries' inline add-another
  preserve (`request.query.change ? …?change=1 : …`) predated this and now
  uses `kit.withChangeContext` — same behaviour, one source of truth.
- **Backwards compatible.** No `change` in the query = pre-inc-050 redirects
  and links byte-for-byte in every handler; scalar pages are untouched
  (`nextTarget` delegates to the same precedence chain). Navigation only —
  no engine write-path, obligation or mapper change.

Proven in `shared/change-context.test.js`: the `withChangeContext` /
`exitTarget` kit contracts, context surviving the add-another PRG cycles
(commodities list → select → details, identifier entry, documents add and
remove) with the writes committed, exit-with-context landing on
check-your-answers for all three loops, exit-without-context keeping the
flow target (`nextInSection` / the identifier loop's commodities fallback),
and the hub exit beating the change context on a collection exit.
`features/check-answers/check-answers.test.js` pins the card actions'
`?change=1` hrefs.

## 11. Records amend + session-scoped listing; the `/resume` route retired (inc-056)

`engine/persistence/records.js` + `engine/persistence/session.js` +
`engine/journey.js`: the dashboard notifications list (M3-18, f-076/f-110;
the c-029 amend-and-resubmit ruling) grows both port surfaces and the
journey seam. This is deliberate port-surface growth the persistence
workstream inherits at merge-back.

- **RECORDS port: `amend(journeyId)` — the sanctioned unfreeze.** The stub
  flips a SUBMITTED record back to `in-progress` (clearing `submittedAt`)
  so `assertWritable` passes again — a status transition through the
  adapter's own model, never a freeze bypass; amending a record that is not
  submitted throws. The REAL adapter POSTs the backend's existing
  `/notifications/{ref}/amend`; the backend `AMEND` status already
  marshals to `in-progress`/writable via `mapStatus`. A later `finalise`
  re-freezes — the amend-and-resubmit cycle round-trips.
- **RECORDS port: `list({ journeyIds })` — session-scoped by design.** Both
  adapters load exactly the handed references (skipping unknown ids) and
  never browse the wider store/backend — the workstream removed
  resume-by-user precisely because an unscoped backend list leaked other
  users' notifications. Record shape gains `createdAt` (stub stamps it;
  real marshals the backend `created`) for the dashboard's date column.
- **SESSION port: the known-journeys list.** `knownJourneyIds(request)` /
  `addKnownJourney(request, h, journeyId)` keep the per-session references
  the dashboard may list and act on — a second base64json cookie
  (`liveAnimalsKnownJourneys`) in stub mode, a yar entry in real mode,
  appended (deduplicated) on create and amend. `clearActive` leaves it
  alone.
- **Journey seam: multi-notification session model.** `startJourney` adds
  the new journey to the known list — starting with an in-flight draft now
  creates a NEW journey and the old one stays listed (previously the
  session pointer simply moved on and the draft was orphaned).
  `listKnownJourneys` / `selectJourney` / `amendJourney` are the dashboard
  verbs; select/amend refuse references the session does not know — the
  session-known check is the authorisation seam. `amendJourney` is
  idempotent: an already-editable journey just re-enters.
- **The `resume` feature is retired, not repointed.** `GET /resume`
  (recover-by-identity) was already incoherent in real mode — no
  resume-by-user means it silently minted a fresh draft — and nothing
  linked to it. The dashboard rows are now the only re-entry path in both
  modes. `resumeByUser` and `state.resume` are gone;
  `resume-self-heal.test.js` keeps its assertions (nothing derived is
  stored; scope re-derives on load) re-pointed at `state.get`.
- **Backwards compatible.** Existing port methods, the freeze check, the
  write path (`state.commit` → `engine/write.js`) and every task-page
  behaviour are untouched; the strip's status mapping is unchanged — an
  amending journey renders the blue Draft tag (the backend `AMEND` tag is
  not surfaced as its own status).

Proven in `services/persistence/records/records-port.test.js` (amend
unfreeze/re-finalise/rejections, createdAt, session-scoped list),
`services/persistence/records/real.amend-list.test.js` (the amend POST and
scoped GETs at the HTTP boundary), the session adapters' known-list tests,
and `features/dashboard/controller.test.js` (list rows, row actions, the
session-known guard, start-keeps-old-listed).

## 12. The opening run — linear-vs-hub presentation mode in the flow layer (inc-060)

`flow/run.js` + `flow/run-state.js` + `flow/entry-guard.js` +
`shared/kit.js` + one new SESSION port pair: the design-literal pre-hub
linear run (M3-D "linear-run", f-001/f-095/f-094; Sam's D8/D9/D10 rulings, behaviour
`linear-opening-run-then-hub`). A first pass walks filter → origin →
commodity select → details → import reason → conditional purpose →
identification (a zero-record pass does NOT block) → additional details →
hub, and the hub is the resting state thereafter. Presentation only — no
obligation vocabulary change, no engine write-path change, no mapper change.

- **The run is config, not redirects.** `flow/run.js` exports `RUN_STEPS`,
  an ordered page-id sequence where each step resolves its own target from
  scope (`pageGatePasses` for flow pages, so the conditional purpose page
  skips itself; an answers-derived index for the collection sub-pages) and
  a `null` target skips the step. `nextRunTarget(stepId, scope)` walks
  forward from the posting page's position to the first resolvable step,
  else the hub — inc-062 can swap the commodity steps without touching the
  mechanism. The commodity-details step is a position marker
  (`target: () => null`): the select sub-page's own indexed redirect enters
  it, so it is never resolved as a target. The identification step targets
  the FIRST line (`commodities/0/identifiers`) — the design's single
  identification pass at current page shapes; inc-063 restructures the
  surface.
- **Run position is stateless; completion is session-side presentation
  state.** Position derives from the posting page's place in the sequence —
  nothing stored. Completion cannot derive from answers (a zero-record
  identification pass leaves no footprint, and importType does NOT survive
  a real-mode round-trip — Mapper A never persists service-routing
  answers), so the SESSION port grows `openingRun`/`setOpeningRun` holding
  `{ journeyId, phase: active|complete }` — a third base64json cookie in
  stub mode, a yar entry in real mode. The filter POST opens the run only
  for a journey at its genuine start (no committed NOTIFICATION answers
  pre-commit — an earlier filter answer alone, e.g. a corrected poao pick,
  still counts as unstarted — or a run already underway); the hub GET
  flips `active` → `complete` —
  reaching the hub by ANY route (run exhaustion, Save-and-return, cancel,
  resume) ends run mode, and the record then persists as the "entered
  through the filter" memory the entry guard needs in real mode.
- **Precedence unchanged (inc-049/inc-050 chain, extended):** hub exit >
  change context > RUN sequence > `nextInSection`. `kit.nextTarget` (now
  async) consults the new `kit.runTarget` before `nextInSection`; the two
  run-participating sub-pages (commodity details, identifier-list Continue)
  consult it as their pre-fallback target with their hub-exit/change
  behaviour untouched. Outside the run every redirect is byte-for-byte
  pre-inc-060 — no session record means `runTarget` is `null` everywhere.
- **Entry rewiring + deep-link guard (D10, closes the inc-002 debt).**
  Dashboard "Start a new notification" now enters the FILTER (the journey
  is still created at Start; the reference strip still first appears after
  origin's own save — origin's "journey started" check now ignores
  importType so the stub-mode filter commit does not surface it early).
  The spec mandate for importType becomes `{}` with the note "enforced by
  entry routing"; runtime validation unchanged (controller-level
  `requiredOneOf`). A plugin-level `onPreHandler` guard
  (`flow/entry-guard.js`) redirects a FRESH journey — no committed
  notification answers (the filter's own answer never counts, keeping stub
  and real mode identical) AND never through the filter — from any
  post-filter journey page to the filter (exempt: the dashboard and its
  row actions, start, the filter and its holding page). After the first
  notification commit, or with a recorded filter pass (which is what
  survives real mode), deep links behave normally — the E2E helpers rely
  on this.
- **D9: no hub work.** Run pages remain ordinary hub rows via their
  sections; stat cards stay non-links; the hub IA regroup is inc-061.
- **Backwards compatible.** Every pre-inc-060 journey state (no session
  record) behaves identically; all 379 pre-existing unit tests pass
  unmodified.

Proven in `flow/run.test.js` (the sequence: page-to-page targets, the
conditional-purpose skip, the zero-record identification pass-through, run
exhaustion → hub, unreachable-steps collapse, non-run pages → null),
`flow/opening-run.test.js` (the filter opens the run only from a genuine
start; save-and-continue follows the run mid-run and falls back outside it;
hub exit and change context beat the run; hub arrival flips the record and
later saves revert to section flow; the run is scoped to its journey;
Start → filter; the deep-link guard's exemptions, fresh-journey redirect
and both let-through paths), and the session adapters' opening-run
round-trip tests.

## 13. Collection facet status parts + the task-row hub regroup (inc-061)

`engine/status.js` + `engine/evaluate/complete.js`: `statusOf` generalises
from a list of top-level obligation ids to a list of **status parts**, where
a part is either an id (behaviour unchanged) or a **collection facet** — a
declared subset of one top-level collection's members:
`{ collection: 'commodityLines', only: ['animalIdentifiers'] }` /
`{ collection: 'commodityLines', except: ['animalIdentifiers'] }`. A facet
is in scope when its collection is; it is required when the collection or
any included member carries a mandate; it is started when any entry has an
included member answered; and it is satisfied by the existing
`collectionComplete` walk restricted to the included members (a new optional
`includesMember` filter on `entryComplete`/`collectionComplete`). The filter
narrows only which members are CHECKED — reference frames keep the full
sibling list, so enclosing-frame activations (a Cat identifier owing its
permanent address) resolve identically through a facet, and a `requiredOneOf`
group is enforced only by the facet that includes one of its members. This is
what lets the design's hub split one stored collection between two task rows
(c-035, Sam's D11 ruling) without moving any data.

- **Carrier: `flow/task-rows.js`.** The hub's unit of status becomes the
  PAGE-LEVEL task row: eleven answer rows, each naming its flow pages (rows
  spanning several pages — Arrival details, Transporter, Roles and
  addresses — aggregate every page's collects) with the two commodityLines
  facets carrying the "What are you importing?" / "Animal identification
  details" split. `rowStatus` is the engine's `statusOf` over the row's
  parts; `rowGatePasses`/`rowEntry` (`flow/navigation.js`) derive a row's
  gate from its FIRST page exactly as sections derive theirs, so
  enforcedAt-derived prerequisites (RULE 1) are untouched. The conditional
  transit-countries row renders only while `transitedCountries` is in scope
  (status ≠ Not applicable) — the addresses-hub CPH row precedent at hub
  level. The identification row enters at the commodities list until the
  inc-063 single identification surface gives it a page of its own.
- **Submit-readiness re-expressed, unchanged in substance.**
  `readyForCheckYourAnswers` (`flow/section-status.js`) now rolls up
  Fulfilled / Not applicable / Optional over the task rows instead of
  `answerSections`. The obligations are the same — the rows partition the
  answer sections' obligation union minus `importType`, which as an optional
  service-routing scalar can never be In progress or Not started and so
  never blocked submission. `flow/task-rows.test.js` proves equivalence
  directly: the row roll-up and the retired section roll-up agree over a
  battery of submittable and gapped journey states, and the happy-path
  fixture stays submittable.
- **Hub presentation (D11/D12/D13).** `features/hub/controller.js` owns the
  presentation mapping: six numbered groups ("1. About the consignment" …
  "6. Check and submit") each rendered as a stock `govukTaskList` under an
  h2, page h1 "Overview", GDS tag vocabulary retained (not the design's
  Complete/To do). The "You have completed X of N tasks" progress line is
  DROPPED (D12) — the Draft strip, tags and stat cards carry state. Chrome
  (D13): back link to the dashboard plus a "Return to dashboard" secondary
  button REPLACE the breadcrumbs on the hub (GDS: back link and breadcrumbs
  do not combine; the layout suppresses breadcrumbs only when a view passes
  `breadcrumbs: false`); the design's always-on "Review and submit" primary
  button stays rejected — review remains the gated Check-and-submit row
  (c-029), its status still computed over the review section.
- **Flow sections untouched.** `flow/flow.js` remains the navigation spine —
  `nextInSection`, the run sequence and section gates are byte-for-byte;
  the regroup is hub presentation plus the readiness roll-up only. No
  mapper changes.
- **Backwards compatible.** String parts take the exact pre-inc-061 path
  through `statusOf`; `entryComplete`/`collectionComplete` without a filter
  are unchanged; `sectionStatus`/`sectionEntry`/`sectionGatePasses` keep
  their semantics for the remaining consumers (review row, simulate, dump).

Proven in `engine/status.test.js` (facet NA/Not-started, the facet split,
facets-fulfilled ⟺ whole-collection-fulfilled agreement, string-part
backwards compat), `flow/task-rows.test.js` (per-row status walks including
multi-page aggregation, the conditional transit row present/absent, the
enclosing-frame activation through a facet, per-row gating on a blank and an
unlocked journey, row entry hrefs, the submit-readiness equivalence battery
and the unchanged review gate) and `t2-hub-copy.test.js` (rendered groups,
row copy, chrome, dropped progress line, conditional row, review lock).

## 2. Session cookie renamed (inc-001, f27b76c)

`engine/persistence/session.js`: `obligationsV2JourneyId` →
`liveAnimalsJourneyId`. Not a semantic divergence — both prototypes
register on one Hapi server and `server.state()` rejects duplicate
cookie names; the spike itself is unaffected. Arguably part of the
vendoring rename rather than a delta; recorded for completeness.
