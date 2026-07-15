# EUDPA-288 — Blend plan (draft for review)

Consolidate the two obligation-model spikes into a single defensible base, following
the migration order agreed in `prototypes/report/BRIEF.md#migration-order-each-step-banks-value-on-its-own`.

---

## 1. Ground truth

- **Base = B** (REPORT's B = `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`)
  on branch `spike/EUDPA-249-flow-layer` — the branch you're already on.
- **Source of ports = A** (REPORT's A = `prototypes/standalone/live-animals/`)
  on branch `spike/EUDPA-249-prototype-layouts`. **Read-only reference.**
- **New branch:** `spike/EUDPA-288-blend-obligations-models` off current HEAD (78f5e79).
  We do **not** merge A into B. We port by file-copy of the specific artefacts named
  in the BRIEF, per commit.
- The frozen ancestor `prototypes/model-spikes/obligations-v4-model/` (~7,087 LOC,
  byte-identical duplicate evaluator) is **binned early** except `GAPS.md`
  (BRIEF line 39, REPORT §7 last item).

## 2. Working rules

- One ★ heading = one commit. Each commit follows **red → green → refactor**.
- **HALT** gates require review by Paul (and Sam where noted) before proceeding.
- Commit-message prefix: `feat(EUDPA-288):`, `fix(EUDPA-288):`, `chore(EUDPA-288):`,
  `test(EUDPA-288):`.
- Every commit must pass the root `npm run test` (vitest) before commit.
- Every commit that adds/changes an obligation extends `spec/fixtures/happy-path.json`
  (or the equivalent B fixture) so downstream E2E walks stay coherent.
- **Never** bypass a failing test to force green — fix code or STOP and report.
- Per-commit delivery pattern (mirrors journey-builder's `INCREMENT_IMPLEMENTOR`):
  1. Parent (me) creates a task for the commit.
  2. Spawn ONE `general-purpose` Task subagent, briefed with the increment id,
     the specific files to touch, and the persona (INCREMENT_IMPLEMENTOR for
     additive work; MODEL_EXTENDER for `engine/` changes).
  3. Subagent implements + commits.
  4. Parent re-verifies (never trusts worker's green — same rule journey-builder
     enforces).
  5. Mismatch → rollback + create failure task. 3 consecutive failures → HALT.

## 3. Explicit no-goes (bounds from BRIEF §Bin)

- Do not edit anything under `prototypes/standalone/live-animals/` or
  `prototypes/standalone/obligations-v2-spike/` — A-side sources are read-only.
- Do not port A's `.njk` templates, page-owned controllers, hand-maintained
  3-spine task list, or Joi-in-controller validation.
- Do not introduce a JSON/JSONLogic gate DSL (BRIEF §Bin: "B built it, shipped
  it, killed it").
- No changes to `engine/` files except under a MODEL_EXTENDER gate with a
  `DESIGN-DELTA.md` entry in the same commit.

---

## 4. Phase 0 — set-up (2 commits, ~30 min)

★ **chore(EUDPA-288): branch off flow-layer + land PLAN.md**

- New branch `spike/EUDPA-288-blend-obligations-models` from
  `spike/EUDPA-249-flow-layer` HEAD.
- Copy this PLAN.md into
  `prototypes/journey-config-spikes/EUDPA-249-flow-layer/EUDPA-288-PLAN.md`
  (or agreed alternate location — see Q4 below).

★ **chore(EUDPA-288): bin frozen ancestor obligations-v4-model except GAPS.md**

- `git rm -r prototypes/model-spikes/obligations-v4-model/` — then re-add
  `GAPS.md` only.
- Reasoning committed via the trailer + link to BRIEF line 39 / REPORT §7.

---

## 5. Phase 1 — Step 1: fix B's live bugs (S, ~2 days, 4 commits + 1 HALT)

Source: BRIEF §Migration #1, REPORT §7 (Side B bugs), MATRIX rows for
"Scope-exit wipe applied to storage", "Minimum-instance floor",
"Statically-invertible gates".

★ **fix(EUDPA-288): persist purge write-back to storage** (`lib/state.js:42-44`)

- **Red:** integration test — set gate G, answer dependent D, flip G off (D
  purged from view), flip G back on. Assert D is absent from persisted yar
  state AND from render. Today this test fails: D resurfaces pre-filled.
- **Green:** write `amendedFulfilments` on read-purge. Note per REPORT §7:
  this alone is insufficient — see next commit.

★ **fix(EUDPA-288): reorder `applyTo` to run post-purge**
(`obligations/evaluator.js:60-84,:288`)

- **Red:** cross-level gate scenario. Obligation `D` gated by `G`; obligation
  `G'` reads `D`. Change `G` → `D` untouched in raw yar → assert `G'`
  evaluates on the **purged view**, not the pre-purge fulfilments (currently
  reads stale).
- **Green:** move `applyTo` enumeration to a post-purge pass. Non-trivial —
  pre-purge enumeration currently feeds B's cross-level gates; audit each
  caller.
- **Refactor:** name the phase boundary explicitly in code + a one-line comment
  citing the invariant.

★ **fix(EUDPA-288): guard `evaluator.js:469-472` unconditional `within.id` deref**

- **Red:** add a data-only top-level obligation `{id, name, status:'optional'}`;
  evaluate; today throws TypeError.
- **Green:** guard the deref, default to top-level frame. Do **not** convert
  the 19 existing closures here — that's Step 2's coverage-gate sweep.

★ **feat(EUDPA-288): add `requiredAtLeastOne` (`minEntries`) collection floor**
(~8 LOC into `groupInvariantErrors`)

- **Red:** zero commodity-lines case — today `journeyState → fulfilled` and
  CYA prints ready-to-submit. Add fixture; assert NOT fulfilled.
- **Green:** add `minEntries` branch in `groupInvariantErrors`. Wire into at
  least one obligation (`commodities` or equivalent).
- Fixes REPORT §7 "No minimum-instance floor" live defect.

**HALT 1** — smoke walk the app, publish "bugs banked". Decision point:
proceed to Step 2 or hand back for review.

---

## 6. Phase 2 — Step 2: mandatory `dependsOn` metadata + coverage assertion

**★ Highest value-per-line item in the whole comparison** (BRIEF §Migration #2,
REPORT §5.1). Source: MATRIX row "Statically-invertible gates".

★ **feat(EUDPA-288): extend obligation schema with `dependsOn` metadata**

- No enforcement yet.
- **Red:** an obligation authored with `dependsOn: [otherObligationId, ...]`
  surfaces those ids in the metadata sidecar.
- **Green:** extend obligation shape + `helpers.js` metadata accessor.
  Confirms the format the coverage gate will enforce.

★ **feat(EUDPA-288): coverage assertion — every gate carries complete `dependsOn`**

- **Red:** extend `coverage.test.js` — enumerate all obligations with
  `applyTo` or any gate; assert every one declares a complete `dependsOn` list.
  Today ~19 closures + branchedGate metadata predicate-holes fail.
- **Green:** sweep all ~38 gated obligations — annotate each with `dependsOn`.
  This is a wide diff (touches every `features/*/obligations.js`), but
  mechanical. Use a helper script if the sweep exceeds ~20 files.
- This is the ~30 LOC of assertion + the widescale annotation the BRIEF
  quantifies. Fails the build if a future gate lacks `dependsOn`.

**HALT 2** — publish coverage stats: `X obligations, Y gated, 100% dependsOn`.
Base for Step 3's prover.

---

## 7. Phase 3 — Step 3: port A's reachability prover (M, ~1wk, 4 commits + 1 HALT)

Source: BRIEF §Migration #3, REPORT §5.1 "What breaks", MODEL_EXTENDER persona
(this is engine work).

★ **feat(EUDPA-288): copy reachability scaffold from A, adapted to B's dependsOn**

- Copy `prototypes/standalone/live-animals/analysis/reachability.js` (215 LOC)
  to `prototypes/journey-config-spikes/EUDPA-249-flow-layer/analysis/reachability.js`.
- Adapt `gateValue` and `invertGate` to read B's `dependsOn` + `applyTo`
  metadata (not A's `activatedBy`).
- **Red:** run over B's obligations; expect all-green (Step 2's coverage gate
  guarantees data). Any reachability failure is a real defect and stops the loop.
- Requires MODEL_EXTENDER persona (engine touch) + `DESIGN-DELTA.md` entry.

★ **feat(EUDPA-288): witness synthesiser per operator** (equals / includes / notInUnionOf / present)

- Addresses REPORT §5.1 warning: "Every new operator A adds carries a second
  tax: a witness synthesiser in `gateValue` and a seeding rule in
  `scaffoldFor`. Skip it and the pin silently stops proving anything."
- **Red:** per-operator witness-synth unit test.

★ **test(EUDPA-288): coverage assert — every operator has a witness synth**

- **Red:** future-proof — a new operator without a witness synth silently
  turns the prover vacuously green.
- **Green:** enumerate operators, assert `witnessSynth` map covers each.

**HALT 3** — reachability prover live + green.

---

## 8. Phase 4 — Step 4: records port + boot totality assert + `notInUnionOf` (M, ~1wk, 3 commits + 1 HALT)

Source: BRIEF §Migration #4, REPORT §5.1.

★ **feat(EUDPA-288): port A's records port**

- Copy A's persistence-records abstraction (from `services/persistence/records/`
  on A branch). Seed a no-op / in-memory backing store — the real Mongo backing
  is Step 6.
- **Red:** write-then-read of a record, delete-by-omission (no per-key delete),
  round-trip an empty collection instance.

★ **feat(EUDPA-288): boot-time obligation → page totality assert** (~20-40 LOC)

- Port from A's `flow/dispatch.js:55-63` over B's `presents` tree.
- **Red:** add an obligation not referenced by any page; boot should fail
  with a named diagnostic.
- **Green:** enumerate all obligations; enumerate all page collects; diff;
  throw on init if diff is non-empty. Closes B's silent-invisibility seam.

★ **feat(EUDPA-288): `notInUnionOf` derived-union helper** (~5 LOC)

- **Red:** replace `obligations.js:674-678`'s hand-restated four-whitelist
  complement with `notInUnionOf`; assert equivalent behaviour.
- **Green:** implement derived-union over `.metadata.values`. Sweep any
  other hand-restated complements.

**HALT 4** — this is the **"defensible base you can stop at"** per BRIEF §The bill.
Bugs fixed, analysability recovered, storage contract clean. Decision point —
Paul + Sam to decide: **bank here** (~2–3wk delivered) or continue.

---

## 8.5. Phase 4.5 — Meta-first helpers refactor (added 2026-07-15, ~1–2 days, 4 commits + 1 HALT)

Added mid-flight after Phase 3.3 revealed genuine surface duplication: `regionCode` and 4 similar gates end up declaring the same dependency three times (closure body + `predicateMeta` + `dependsOn`). Not on BRIEF's original migration order, but a natural cleanup on the base Phase 4 leaves behind.

**Design premise.** Extend the pattern `allowListed`/`anyAllowListed`/`notInUnionOf` already use — where the helper's metadata IS the definition, not a mirror of a closure. Introduce meta-first helpers for the remaining structured predicates, migrate the 10 sites that today carry duplication, and delete 19 trivial `applyTo: () => (...)` closures that Phase 1.3's `within.id` guard has already made data-expressible.

**After Phase 4.5:** every gated obligation reads as pure metadata (or a `branchedGate` escape hatch for genuinely opaque predicates, of which the manifest today has none). `dependsOn` becomes derivable from any helper's metadata; we retain the schema key + coverage assertion for defence-in-depth.

★ **docs(EUDPA-288): revise PLAN.md — add Phase 4.5 meta-first refactor**

- This commit. Documents the scope and sequencing agreed with Paul after seeing the duplication surface on `regionCode` / `purposeInInternalMarket` / etc.

★ **feat(EUDPA-288): introduce meta-first gate helpers**

- New helpers in `obligations/helpers.js`: `equalsGate(gate, value, whenTrue, whenFalse, reasons?)`, `presentGate(gate, whenTrue, whenFalse, reasons?)`, `includesGate(gate, values, whenTrue, whenFalse, reasons?)`, `alwaysInScope(status, reasons?)`.
- Each helper's `.metadata` fully describes the gate — no closure body needed for reachability, witness synthesis, or `dependsOn` derivation.
- Add witness synth cases in `analysis/reachability.js`; add to `STRUCTURED_HELPER_TYPES`; extend `coverage.test.js` samples.
- **Red:** unit tests per helper — round-trip metadata; runtime evaluation for each `applyTo` shape; fidelity check (synthesised witness makes real evaluation return the expected decision).

★ **feat(EUDPA-288): migrate 10 duplicated / total-branch sites onto meta-first helpers**

- 5 duplicated `branchedGate`-with-`predicateMeta` sites → `equalsGate` / `presentGate` (whichever matches the predicate operator): `purposeInInternalMarket`, `commercialTransporter`, `privateTransporter`, `transitedCountries`, `containsUnweanedAnimals`.
- 5 total-branch sites → `alwaysInScope` or `equalsGateStatus` (needed for `regionCode`'s mandatory-vs-optional flip): 4 `accompanyingDocument*` siblings + `regionCode`.
- Drop each site's redundant `dependsOn: [...]` — derive from metadata. Coverage assertion updated to accept derived-or-declared.
- **Red:** fidelity check across all 10 migrated sites; regression pin on `regionCode`'s status flip.

★ **feat(EUDPA-288): drop trivial `applyTo` from 19 always-in-scope obligations**

- The 19 obligations with `applyTo: () => ({inScope:true, status:'mandatory'})` (post-Phase-2 sweep, all with `dependsOn: []`) become data-only `{id, name, status:'mandatory'}` — Phase 1.3's `within.id` guard made this shape work.
- Drop the closures + the now-redundant `dependsOn: []`.
- Coverage assertion updated: gates without `applyTo` are not in scope for the check.
- **Red:** assert the 19 obligations evaluate identically without `applyTo`.

**HALT 4.5** — zero duplication banked. Prover's classification: 14 witness-synthesisable, 30 trivial, 0 opaque. `branchedGate` absent from the manifest (retained as escape hatch in `helpers.js`). Hand back to Paul.

---

## 8.6. Phase 4.6 — Cleanup pass (added 2026-07-15 after Paul's 4 residual-smell questions, ~half a day, 5 commits + 1 HALT)

Paul reviewed Phase 4.5 and flagged four things worth cleaning up before Phase 5's design gate:

1. **10 remaining explicit `dependsOn`** on non-migrated meta-first sites — redundant now that `obligationMetadata()` derives them from `.metadata.obligation`.
2. **`numberOfPackages` uses `allowListed` with null projection** — functionally equivalent to `includesGate` for the same-frame scalar case. Two overlapping helpers for the same shape.
3. **`unitRecord.requires` uses `get anyOf()`** — a JS getter working around declaration order. Not data-shaped.
4. **Helper closure bodies duplicate a "stored → candidates" normalization** across `anyAllowListed`, `allowListed`, `notInUnionOf`, and (variants of) `equalsGate`/`includesGate` — same pattern, four implementations.

All four are behaviour-preserving. Landed as a coherent cleanup before the higher-risk Phase 5.

★ **docs(EUDPA-288): revise PLAN.md — add Phase 4.6 cleanup pass**

- This commit. Records the 4 items + landing sequence.

★ **refactor(EUDPA-288): drop 10 redundant explicit dependsOn annotations (Q1)**

- Sites: 6 `allowListed`, 2 `anyAllowListed`, 2 `notInUnionOf` — all meta-first, all derive `dependsOn` from `metadata.obligation`.
- Coverage assertion in `obligations/coverage.test.js` was already updated in Phase 4.5.2 to accept derived-or-declared. No further test change needed.

★ **refactor(EUDPA-288): migrate null-projection allowListed sites to includesGate (Q2)**

- Confirmed: `numberOfPackages` (only null-projection `allowListed` site today).
- Rule going forward: `allowListed` / `notInUnionOf` for PROJECTED gates only (`projectionGroup` non-null). Same-frame scalar gates use `includesGate` / `equalsGate`.
- Document the rule in the file-level docstring of `obligations/helpers.js`.

★ **refactor(EUDPA-288): unitRecord.requires — anyOfIds (id-based deferred resolution) (Q3)**

- Replace `get anyOf()` getter with `anyOfIds: [<uuid>, ...]` (literal ids).
- Wire the engine (whichever `groupInvariantErrors` consumer reads `.requires.anyOf`) to resolve ids → obligations at boot.
- Reachability prover extended to reason over `anyOfIds` as a data-shaped structural relationship — a "requires-any-of" edge in the graph.
- Declaration-order coupling removed; the manifest is free to declare unitRecord in any position.

★ **refactor(EUDPA-288): extract shared helper internals (isRecordMap, readGate) (Q4)**

- New private module (`obligations/helper-internals.js` or a private section of `helpers.js`):
  - `isRecordMap(v)` — "stored value is a records-keyed object, not a scalar / array"
  - `readGate(fulfilments, gateId) → { present, candidates }` — one canonical normalization used across all helpers
- Refactor `anyAllowListed`, `allowListed`, `notInUnionOf`, `equalsGate`, `includesGate` bodies to use `readGate`. Each closure body shrinks from 6-10 lines to 2-3 lines.
- Behaviour-preserving; existing tests + a small new unit test on `readGate`/`isRecordMap` lock the normalization semantics.

**HALT 4.6** — cleanup landed. Hand back to Paul before Phase 5's design gate (highest-risk phase).

---

## 9. Phase 5 — Step 5: per-record conditional mandate (M–L, ~1–2wk, 5 commits + 2 HALTs) — HIGHEST RISK

The one genuine B evaluator change. REPORT §The bill: "get it wrong and you
corrupt status, CYA and submit together." Uses MODEL_EXTENDER persona +
adversarial self-check.

**HALT 5a — design gate before any code.** Present to Sam:

- Vocabulary (`enclosing` / `anyItem` frames), resolution rule, backwards-compat
  story, `buildImplication` return-contract widening.
- Cite MATRIX row "Per-collection-entry conditional mandate".

★ **feat(EUDPA-288): widen `buildImplication` return contract**

- **Red:** per-line rule test — "field required on horse lines, not cattle
  lines" — today inexpressible in B.
- **Green:** three branches per REPORT §3.4; new mandate return shape.

★ **feat(EUDPA-288): update ~5–6 status/CYA readers**

- Named in the design-gate output. **Red per reader** — each gets a test
  proving it consumes the new contract without breaking existing per-obligation
  reads.

★ **feat(EUDPA-288): helper library for per-record mandate consumers**

- Extract the common shape from the reader diffs.

★ **test(EUDPA-288): adversarial self-checks** (from MODEL_EXTENDER §Adversarial)

- (a) an existing obligation is unaffected — pin with a test.
- (b) depth-2 cross-frame gate behaves.
- (c) a wiped cross-frame field leaves no orphan data at any path.

**HALT 5b — walk-through with Sam.** New capability demo in situ.

---

## 10. Phase 6 — Step 6: persistence + submit + parity layer (L, ~3–4wk, ~8 commits + 1 HALT)

Source: BRIEF §Migration #6, REPORT §3.11.

★ **feat(EUDPA-288): declare UUID→path table once on the obligation**

- **Red:** every obligation resolves to exactly one path.

★ **feat(EUDPA-288): port A's notification mapper (V4-labeled)**

- Copy from `features/persistence/records/notification-mapper.js` on A.
- **Red:** mapper input → expected V4-labeled output; oracle fixtures.

★ **feat(EUDPA-288): port `skeleton-equivalence.test.js` parity harness**

- REPORT §5.2 calls this an "executable oracle that would work against B's
  mapper the day one exists."
- **Red:** run against B's new mapper; byte-equivalence pin.

★ **feat(EUDPA-288): port second parity harness** (both are needed per BRIEF §Keep from A).

★ **feat(EUDPA-288): submit route + `submitted` flag**

- **Red:** POST /submit → 200, state transitions to `submitted`, subsequent
  edits blocked.

★ **feat(EUDPA-288): journey identity + draft record**

- Add `journeyId` (B currently `grep journeyId → 0` per BRIEF).
- **Red:** create draft, close session, resume by reference, state intact.

★ **feat(EUDPA-288): amend-and-resubmit flow**

- **Red:** submit, amend a section, resubmit — status re-gates the amended
  section.

★ **feat(EUDPA-288): multi-draft dashboard** (optional — may split)

**HALT 6 — full parity walkthrough.**

---

## 11. Phase 7 — Step 7: escape-hatch pages + a11y coverage (M, ~1wk, 4 commits + 1 HALT)

Source: BRIEF §Migration #7.

★ **docs(EUDPA-288): codify escape-hatch page pattern (`PAGE_PATTERNS.md`)**

- The pattern (code-not-model) for pages that legitimately can't be derived
  (upload, address picker, tables).

★ **feat(EUDPA-288): port cdp-uploader upload as escape-hatch page**

- From A's `features/documents/`.
- **Red:** upload happy path — file → scan status → obligation fulfilled.

★ **feat(EUDPA-288): port paginated address picker as escape-hatch page**

- From A's `features/addresses/`.
- **Red:** pagination + happy path.

★ **feat(EUDPA-288): axe-core over rendered pages**

- **Red:** axe run against representative pages; no violations.

★ **feat(EUDPA-288): Playwright project `javaScriptEnabled: false`**

- Existing walks re-run with JS off; assert no regressions.

**HALT 7 — final walkthrough, open PR to `main`.**

---

## 12. Test discipline reminders

- Vitest + Playwright run: root `npm run test` + `npm run test:prototype:parity` (A
  branch has this; needs porting if we adopt A's parity harness in Step 6).
- Every commit touching a controller updates its `contract.test.js` case.
- The three-way anti-rot gates (`coverage.test.js` / `whitelists.test.js`) stay
  green throughout — they are load-bearing per BRIEF §Keep from B.
- SonarCloud: `sonar analyze --staged` before commit; fix BLOCKER/CRITICAL
  before commit (workspace CLAUDE.md rule).

---

## 13. Decisions (locked in with Paul, 2026-07-15)

1. **Scope.** Run through **all 7 steps** to full parity. Paul monitors the
   commit stream and interrupts if anything looks off — no formal stop at Step 4.
2. **Branch name.** `spike/EUDPA-288-blend-obligations-models` off current
   HEAD (78f5e79 on `spike/EUDPA-249-flow-layer`).
3. **Frozen-ancestor bin.** DELETE `prototypes/model-spikes/obligations-v4-model/`
   except `GAPS.md` — **on the new branch only**. The old spike branches remain
   read-only for the duration of this ticket.
4. **PLAN.md location.** Replaces the existing
   `prototypes/journey-config-spikes/EUDPA-249-flow-layer/PLAN.md` on the new
   branch (same path as the current `obligations.md` for visibility).
5. **Reviewer.** Sam is the co-reviewer on Sam-tagged HALT gates (5a / 5b / 6).
6. **Cadence.** HALT-gate reviews only. Between HALTs the loop keeps
   committing as long as parent verification stays green. Paul follows the
   commit log and interrupts at any point. Every commit is fully verified
   by the parent (never trust worker green) regardless.

---

## 14. Not-yet-decided items I've deferred

- The exact reader list for Step 5 (design gate output).
- Whether Step 6's persistence layer targets Mongo directly or an in-memory
  stub first (BRIEF is silent; A uses Mongo).
- Whether Step 7 grows a hard page in B "to settle the widget-derivation
  unknown" (BRIEF §Unknowns #1) — this is a Sam call.
