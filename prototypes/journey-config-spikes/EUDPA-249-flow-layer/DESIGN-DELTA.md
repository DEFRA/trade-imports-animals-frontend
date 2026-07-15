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
