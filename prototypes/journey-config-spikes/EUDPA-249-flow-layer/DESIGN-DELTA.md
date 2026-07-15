# DESIGN-DELTA — EUDPA-249 flow-layer spike

Engine-adjacent design deltas landed on top of the frozen spike surface.
One entry per change. Newest at the top.

Each entry names:

- **Change** — what shipped.
- **Backwards compat** — did existing behaviour change? (Almost always
  "fully" here — the spike is a design vehicle, not a shipping app.)
- **Divergence from A** — how this differs from the standalone-spike
  ancestor (`prototypes/standalone/live-animals/`) that A supersedes.
- **Rationale** — citations to BRIEF / REPORT / MATRIX / PLAN sections.
- **Commit** — SHA + date.

---

## 2026-07-15 — `analysis/coverage.test.js`: build-time coverage gate for the helper synth registry

- **Change** — added `analysis/coverage.test.js` (Phase 3 commit 3 of the
  EUDPA-288 blend plan) and exported two named sets from
  `analysis/reachability.js`: `STRUCTURED_HELPER_TYPES` (helpers whose
  gates the prover inverts into witnesses — `allowListed`,
  `anyAllowListed`, `matches`, `branchedGate`) and
  `OPAQUE_HELPER_TYPES` (`allowListedByPredicate` — the sole opaque-by-
  design entry, with a rationale comment on the const pointing at
  Phase 4's `notInUnionOf` migration route). The coverage test pins six
  invariants: sets are exported and disjoint; every case label in
  `synthesiseWitness`'s dispatch matches the STRUCTURED set (parsed
  from the source file — catches drift both ways); every gate-producing
  helper export in `obligations/helpers.js` classifies as STRUCTURED or
  OPAQUE; and each STRUCTURED / OPAQUE helper sample round-trips
  through `synthesiseWitness` to the declared `WITNESS_KIND`.
- **Backwards compat** — fully. No obligation, evaluator, helper, flow,
  route or existing prover test changed. Adds new test file + new
  exports only.
- **Divergence from A** — A doesn't need this coverage gate because A's
  operator set is closed vocabulary in `predicate.js` (four cases
  pattern-matched by TypeScript exhaustive-check). B's helpers are
  additive open-vocabulary — adding a sixth helper is a bare function
  export — so the "did you also write the synth?" question requires an
  explicit build-time enforcement. This is the second half of the tax
  named in REPORT §5.1 ("witness synthesiser + a seeding rule per
  operator"): the first half landed in commit 2 (`synthesiseWitness`),
  this commit turns it into a build-time invariant.
- **Coverage gate mechanism** — the "every case label matches the
  STRUCTURED set" invariant reads `analysis/reachability.js` as source
  text and pulls every `case '<label>':` occurrence via regex,
  filtering out the operator-level labels (`equals`, `includes`,
  `isFilled`) that live inside the split-out
  `synthesiseBranchedGateWitness`. Considered alternatives: a live
  `import * as` probe (can't see labels that dispatch to nested
  synthesisers uniformly), decorator-based registration (would require
  moving away from a plain `switch`). Static parse chosen because the
  file is small (~490 LOC) and adjacent to the test, and the diff
  message when the invariant fires is immediately actionable.
- **Failure-mode verified** — temporarily renamed
  `helpers.js` `allowListed`'s `metadata.type` to `'allowListedTypo'`
  in local scratch; the coverage test fired invariant #4 with:
  "helper 'allowListed' — metadata.type 'allowListedTypo' is not in
  STRUCTURED_HELPER_TYPES or OPAQUE_HELPER_TYPES; add it (with a
  comment) to one of the sets in analysis/reachability.js". Reverted;
  not committed.
- **Rationale** — BRIEF §Migration #3 (build-time guard on the
  reachability prover's assumptions), REPORT §5.1 (the "second tax"
  warning: skip the synth and the pin silently stops proving anything).
  Blend plan §7 Phase 3 commit 3.
- **Commit** — (see git log; SHA appended immediately after landing).

---

## 2026-07-15 — `analysis/reachability.js`: witness synthesisers for structured gate helpers

- **Change** — extended `analysis/reachability.js` with two new entry
  points, `synthesiseWitness(obligation)` and
  `proveWithWitnesses(obligations)`. The tightened prover runs the Phase
  3 commit 1 graph-level check first, then — for every gate whose helper
  attaches recoverable metadata — synthesises a concrete
  `{ obligationId, value }` witness, injects it into a fulfilments map,
  and confirms the real `applyTo` closure returns `inScope: true`. Also
  extended `obligations/helpers.js` `branchedGate` to accept an optional
  4th `predicateMeta` argument so callers can declare the operator shape
  (`equals` / `includes` / `isFilled`) alongside the closure body, and
  annotated the 5 non-total `branchedGate` call sites in
  `obligations/obligations.js` accordingly.
- **Backwards compat** — fully. Every graph-level pass from commit 1
  still passes (see `reachability.test.js` "backwards compat with commit
  1" pin on `numberOfPackages`, and the whole-manifest zero-unreachable
  regression). No obligation, evaluator, flow or route behaviour changed;
  every existing gate test (helpers.test.js, evaluator.units.test.js,
  whitelists.test.js) is untouched.
- **Divergence from A** — A's prover inverts predicates as data because
  A's gates ARE data (four operators pattern-matched in `predicate.js`).
  B's gates stay as JS closures; the synthesiser here reads the
  helper-attached `.metadata` sidecar instead. Coverage is partial by
  design — B's inversion covers the four structured helpers
  (`allowListed`, `anyAllowListed`, `matches`, `branchedGate` with
  `predicateMeta`) — 12 of 19 gated obligations today. The remaining 7
  split into 5 trivial-over-branches (both branches in-scope; no witness
  needed) and 2 opaque (`allowListedByPredicate` — plain-JS predicate,
  no data-level target). One further departure from A: the synthesised
  witness is re-run through the real closure as a fidelity check that
  catches metadata drift; A doesn't need this because predicate
  execution IS metadata evaluation.
- **Witness classification invariant** — every gated obligation
  classifies as one of `witness` / `trivial` / `opaque`. Named in
  `WITNESS_KIND` (exported for commit 3's coverage assertion to
  enumerate). Manifest today: 12 witness, 5 trivial (regionCode plus the
  four accompanyingDocument siblings), 2 opaque
  (`identificationDetails` and `description`).
- **`allowListedByPredicate` stays opaque — documented decision** —
  `identificationDetails` + `description` express INVERSE gates over
  four commodity-code whitelists. The structural fix (A-style) is to
  add a `notInUnionOf: [obligation, ...]` metadata field naming the
  whitelists to complement; witness would then be any code NOT in the
  union. Phase 4 §Migration #4's `notInUnionOf` derived-union helper
  closes this — planned, scoped out of this commit. A cheaper Bloom-
  shape (attach a small `sample` array on the metadata that the caller
  confirms passes the predicate) was rejected as it bloats the helper
  surface. Until Phase 4 lands, the 2 opaque gates keep graph-only
  reachability and are excluded from Phase 3 commit 3's coverage
  assertion.
- **Tax tracked** — REPORT §5.1: "every new operator carries a second
  tax: a witness synthesiser + a seeding rule". This commit lands the
  synthesiser side for `equals` / `includes` / `isFilled` (on
  `branchedGate`) plus the four already-structured helper types. Adding
  a new operator now REQUIRES extending `synthesiseWitness` (commit 3's
  coverage gate will enforce this).
- **Rationale** — BRIEF §Migration #3 (witness-level prover on top of
  the dependency graph), REPORT §5.1 (closures are the exception with a
  build-time guard; when metadata is available prefer data). Blend plan
  §7 Phase 3 commit 2 ("witness synthesiser per operator").
- **Commit** — (see git log; SHA appended immediately after landing).

---

## 2026-07-15 — `analysis/reachability.js`: graph-level dependency-reachability prover

- **Change** — introduced `analysis/reachability.js` (Phase 3 commit 1 of
  the EUDPA-288 blend plan). A pure prover that takes a list of
  `{ id, dependsOn }` records and returns
  `{ reachable, unreachable, errors }`. Fixed-point iteration: an
  obligation is reachable iff every non-self id in its `dependsOn` is
  reachable, seeded from the always-in-scope set (`dependsOn: []`) and
  from pure self-loops (see below).
- **Backwards compat** — fully. No obligation, evaluator, flow or route
  behaviour changes. Adds new files only (`analysis/reachability.js` +
  `analysis/reachability.test.js` + this doc).
- **Divergence from A** — A's `analysis/reachability.js` (215 LOC in the
  standalone spike) inverts predicates as data: A's four operators
  (`equals` / `includes` / `notInUnionOf` / `present`) are pattern-
  matched in `predicate.js` and `gateValue()` synthesises a value that
  fires each gate. B's gates are JS closures; the value-level inversion
  is not available at all, and is not available uniformly even where
  helper metadata exists. This port keeps A's SHAPE (module-level
  functions, a single `proveReachability` entry point, three-outcome
  envelope) but narrows the LOGIC to the graph-only conservative rule.
  Value-level witness synthesis for B's structured helpers
  (`branchedGate` / `allowListed` / `anyAllowListed` / `matches`) is
  deferred to commit 2; a coverage assertion that every helper carries
  a synth is deferred to commit 3. This prover will initially prove
  LESS than A's — that's expected, and worth the trade to preserve B's
  imperative-JS gate surface.
- **Conservative closure treatment invariant** — named explicitly in the
  code (`reachability.js` header): "an obligation is reachable IFF every
  id in its `dependsOn` list is reachable, seeded from `dependsOn: []`."
  Precisely what A's prover collapses to for opaque predicates. Commit
  2 will tighten this by adding value-level checks on top of the SAME
  graph — the graph model here is the durable substrate.
- **Self-loop treatment** — a pure self-loop (`dependsOn === [own-id]`)
  is treated as a seed. Graph-wise a self-loop has no external
  prerequisite, so nothing beyond the obligation itself constrains
  activation. The manifest's one legitimate self-loop is
  `accompanyingDocumentType` (its `branchedGate` closure reads its own
  stored value); commit 2's value-level analysis will confirm the gate
  is total-over-branches (both `whenTrue` and `whenFalse` have
  `inScope: true`). Alternative rules considered:
  - "Refuse self-loops as invalid" — would trip on a legitimate case.
  - "Track visited nodes and treat as unreachable" — would flag
    `accompanyingDocumentType` as an unreachable defect it isn't.
- **Dangling id defensiveness** — Phase 2's coverage assertion prevents
  dangling ids on the current manifest, but the prover reports any
  `dependsOn` id that doesn't resolve to a record in the input as
  `errors: [{ obligationId, reason }]`. The affected obligation is
  neither reachable nor unreachable; it appears in `errors` only.
- **Rationale** — BRIEF §Migration #3 (port A's reachability prover on
  top of Migration #2's dependency graph), REPORT §5.1 (closures are
  the exception with a build-time guard; when data is available prefer
  data). Blend plan §7 (Phase 3 — Step 3: reachability prover live +
  green).
- **Commit** — (see git log; SHA appended immediately after landing).
