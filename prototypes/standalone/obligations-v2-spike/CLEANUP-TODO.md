# Cleanup TODO — obligations-v2-spike (EUDPA-249)

Orchestrated clean-up pass over the spike, driven from this file. Sam asked for
the code to be **clean**: clear the known-but-unactioned backlog (HIGH bugs,
test-scaffold duplication, engine DRY, magic strings, house-style naming +
test-naming), the residual best-practices mediums, and a structural tidy of the
oversized `engine/` folder.

**These are TASKS, not solutions.** Each entry states the *problem*, the
*acceptance criteria*, and the *gate* — the worker investigates, decides the fix,
and proves it. Evidence pointers below are leads to confirm-or-refute, not
answers to apply. A worker that just implements the pointer without verifying the
underlying claim has failed the task.

## Standing rails (apply to every task)

- **Stay green after every task:** unit `npm run test:obligations-v2-spike`, E2E
  `npm run test:prototype`. Establish the baseline count at task start; a pure
  refactor stays **byte-green** on the DOM/behaviour and keeps the existing tests
  passing unchanged; a bug fix or additive work **adds tests** that fail before /
  pass after.
- **One commit per task**, `EUDPA-249` prefix (`fix/|refactor/|test/|docs/`), on
  branch `spike/EUDPA-249-obligations-v2-improvements`. Commit `--no-verify`
  (whole-tree `format:check` trips on two pre-existing stray files that aren't
  ours) — but your own touched files must be **eslint + prettier clean**, and
  **re-lint after any `prettier --write`** (prettier re-wrapping a long line can
  trip the eslint `curly` rule).
- **Update the log:** append a "landed as" note + green counts to
  `CONVERSATION-LOG-2026-07-06.md` for each task.
- **Quality gate on anything touching `reconcile`/`status`/`predicate`/`write`/
  `read`/`records`/scope-wipe:** adversarial skeptics + a completeness critic
  before the commit is accepted. Don't self-certify engine-core changes.
- **Verify claims yourself** — never relay a worker's "it's green" without
  reproducing the two suites in the parent shell.

---

## Phase 0 — Design investigation (NO CODE CHANGES; report only)

### T0 — Do `activatedBy` (model) and `gate` (flow) overlap?
**Problem / question.** `activatedBy` on an obligation is a declarative predicate
that reconcile evaluates to put an obligation *in scope*. `gate` on a flow
page/section is a pure `(scope) => boolean` deciding sequence reachability — and
for the **add-on** sections it is almost always exactly `s.inScope.has('<key>')`,
i.e. a read of the scope that `activatedBy` already derived. **This looks like it
could be full or partial duplication.** Investigate whether it is — and whether
anything can be collapsed or consolidated. **Focus on add-ons in particular**,
where the gate is most mechanically derivable from the section's obligations.

- **This is an investigation, not a change. Produce NO code edits.** The
  deliverable is a written analysis + recommendation.
- **Investigate genuinely, argue both sides:** Is the addon `gate` a restatement
  of the section's `activatedBy`, or a legitimate separation of concerns (model
  owns *what data applies*; flow owns *what page comes next*)? Could an addon
  section's gate be *derived* from its collected obligations' scope keys instead
  of hand-authored? What breaks if you try (the `readyForQuote` gate, the
  `claims` row gate, item-conditional gates, the picker section)? Is there a
  *partial* consolidation (e.g. a helper/derivation for the pure
  `inScope.has(x)` cases) that keeps the non-derivable gates explicit?
- **Acceptance:** a clear verdict — **collapse fully / consolidate partially /
  keep separate (with reasons)** — grounded in the actual code, naming the exact
  sites and the concrete trade-offs. "No, they're distinct, here's why" is a
  perfectly acceptable and valuable answer if that's what the evidence shows.
- **Where it goes:** write the analysis to a report file. If the verdict is
  *keep separate*, that model-vs-flow rationale is exactly the kind of "why" T10
  should fold into `docs/` (an architecture-decision note). If the verdict is
  *collapse/consolidate*, that becomes a **new task for Sam to decide on** — it is
  out of scope for this no-code-change investigation.
- **Runs FIRST** (before any code task) so its verdict can inform the naming /
  structural / docs work. Read-only, so no green gate.

---

## Phase 1 — HIGH correctness (behaviour-changing; verify + E2E)

### T1 — Cleaned input values are being discarded on persist
**Problem.** Some feature controllers appear to persist the raw request payload
rather than the validated/normalised value the validation layer produces, so a
user-entered string like `£1,234` may reach the store (and any downstream
computation over it) uncleaned. **Task:** establish exactly which controllers are
affected and what the correct persisted value should be, then make persistence
store the normalised value without regressing error re-rendering.
- **Investigate, don't assume:** which validators actually normalise (not only
  `currency`)? what does the validation runner return and is it used? what
  downstream consumers (e.g. premium calculation) break on an uncleaned value?
- **Acceptance:** a failing-before/passing-after test that pins the persisted
  value (and, if provable, the downstream numeric consequence); every affected
  controller fixed; error-path re-render still shows the user's raw input.
- **Gate:** adversarial verify (did we miss a controller? did we over-clean a
  field that should stay raw?) + full E2E.

### T2 — Internal identifiers rendered into user-facing hub copy
**Problem.** The task-list hub's add-on rows appear to derive their hint text from
internal page identifiers rather than authored copy, so technical ids may be
shown to users. There may be adjacent copy/robustness smells in the same handler
(a hint that merely echoes its title; an unguarded title lookup that could render
`undefined`). **Task:** confirm what actually renders for a real add-on row, and
make hub copy authored + robust.
- **Acceptance:** add-on rows show human copy (no internal ids); a missing
  copy-lookup fails loud rather than rendering blank/undefined; verified against a
  *running* hub (E2E/snapshot), since the shared spec navigates by title and will
  stay green either way.
- **Gate:** browser-level evidence that the rendered hint changed.

---

## Phase 2 — Engine content cleanup

### T3 — Test-scaffold duplication across engine specs
**Problem.** Hand-rolled fakes (recording toolkit / request / handler stubs) are
copied across several `engine/*.test.js` files and have begun to drift. **Task:**
consolidate to a single shared test-support module and retire the copies (and any
dead variant), without weakening what each spec asserts.
- **Acceptance:** one source of truth for the shared fakes; every affected spec
  uses it; no assertion coverage lost; unit suite byte-green.

### T4 — Duplicated logic in the state-I/O core
**Problem.** There appear to be near-identical code paths in the engine's read /
write / records modules (e.g. two readers differing only in a lookup; a bounds
guard written twice; a lookup-then-guard sequence repeated). **Task:** identify
the genuine duplications and factor them to single, well-named helpers —
preserving every guard's intent (including any NaN/edge-case rationale).
- **Acceptance:** duplications removed behind named helpers; behaviour byte-green;
  the reason each guard exists survives in code/comment.
- **Gate:** skeptic pass — a refactor here must not loosen a bounds/freeze guard.

### T5 — Magic strings that should derive from a single source
**Problem.** Several literals re-type values that are authored elsewhere (a
hard-coded add-on slug list that mirrors the obligation model; an inlined header
name; a status string duplicated instead of importing the exported constant).
**Task:** find the literals that have an authoritative source and derive them from
it; leave genuinely-local literals alone.
- **Acceptance:** no re-typed slug/status/header where an exported source exists;
  byte-green.

---

## Phase 3 — House style

### T6 — Single-character / abbreviated identifiers
**Problem.** Pervasive single-char params and abbreviations remain
(`s`/`p`/`o`/`a`/`b`, `sub`/`ref`, generic `get`/`fn`/`opts`, `base`,
`template`). **Task:** rename to intention-revealing names across engine / flow /
features / analysis. **Open question for the worker to respect (do not decide
unilaterally):** the Hapi response-toolkit param `h` is a repo-wide idiom — see
the scoping decision recorded at the top of the orchestration before touching it.
- **Acceptance:** identifiers read for what they are; byte-green mechanical
  rename; re-lint after prettier.

### T7 — Test naming convention
**Problem.** Engine specs drift from the codebase `#functionName` describe /
`Should …` it convention, and some `it`s bundle multiple unrelated facts.
**Task:** align naming and split multi-fact tests where it improves failure
localisation — no assertion changes.
- **Acceptance:** consistent naming; split tests still green; byte-green on
  behaviour.

---

## Phase 4 — Residual best-practices mediums (full-clean pass)

### T8 — Functional-style + test-quality residue
**Problem.** The Phase-6 sweep left a tail of medium **code** findings (not
comments — see the note below): imperative clone-then-mutate where an immutable
builder reads better; a function-declaration that breaks the file's arrow
convention; a controller handler doing several un-named jobs inline;
presentational noise (redundant spreads that quietly break documented
reference-sharing; a redundant arrow wrapper); and remaining weak/bare test
assertions. **Task:** work the functional-style and test-quality rows of
`PHASE6-SWEEP.md` §2 to closure, using judgement — some rows are explicitly
"awareness only". State what you consciously skipped and why.
- **Scope note — JSDoc/docblock rows are DEFERRED to T10.** The documentation
  task strips/rewrites the vast majority of comments, so polishing docblock
  precision here would be wasted. Do **not** touch docblock-drift rows in T8.
- **Acceptance:** the functional-style + test-quality rows are either fixed or
  explicitly declined with a reason; behaviour byte-green.
- **Gate:** skeptic pass on any `write`/`status` change.

---

## Phase 4.5 — Gate derivation (T0's accepted recommendation)

### T11 — Derive default gates from `collects`; keep `gate` as authored override
**Problem.** T0 (see `T0-ACTIVATEDBY-VS-GATE.md`) found that four of the five
flow gates are pure `inScope.has(key)` reads whose content is fully determined
by the obligation model + each page's `collects` — hand-authored restatements
coupled by a raw string (the rename hazard has already fired once in the docs),
where divergence means a ghost NA row or a quote deadlock. Sam accepted the
CONSOLIDATE PARTIALLY verdict. **Task:** make the derived gate the default and
authored `gate` the override, per the report's §7 proposal — treating §7 as the
*design input to re-verify against the code*, not gospel: if implementation
reveals a flaw in the proposal, surface it rather than force it.
- **Acceptance:** the four hand gates are gone; exactly one authored gate
  remains (`get-your-quote`'s `readyForQuote`); a derived gate consulted before
  the dispatch index is built fails loud (mirroring the `configureReadyForQuote`
  precedent); an invariant test pins derived-gate ⟺ ¬NA for every dynamic
  section across enumerated scope states; stale gate copy in DESIGN/EXTENDING
  fixed (or noted for T10 if those files are already gone by then); behaviour
  byte-identical — all existing pinning tests pass unchanged.
- **Gate:** full adversarial panel — this touches flow/dispatch/navigation and
  the NA invariant. Skeptics: divergence/deadlock hunter, boot-order/cycle
  checker, behaviour-parity auditor. Both suites in the parent shell.
- **Ordering:** runs after Phase 4 and **before T9/T10**, so the reorg and the
  new docs describe the consolidated design.

---

## Phase 5 — Structural tidy (runs LAST, over already-cleaned files)

### T9 — `engine/` is too large and flat
**Problem.** `engine/` holds ~12 source + ~12 test files in one flat directory;
`persistence/` is the only grouping. It warrants cohesive subfolders. **Task:**
FIRST analyse the module graph and propose a grouping (a design panel — genuine
fork, not a foregone conclusion; `persistence/` is the *model* for the kind of
grouping wanted, not necessarily the only axis). THEN execute a **byte-green
structural move**: relocate files and rewrite every import path. The engine is
consumed through its pure barrel by ~20 controllers — **the barrel's public
surface must not change**.
- **Acceptance:** engine is grouped into cohesive subfolders with a documented
  rationale; the barrel API is identical; 141 unit / 70 E2E unchanged; no
  controller import outside the barrel had to change.
- **Gate:** acyclicity + barrel-stability critic; both suites in the parent shell.

---

## Phase 6 — Documentation consolidation (runs DEAD LAST, after everything else)

### T10 — Consolidate all documentation into a bitesized `docs/` folder
**Problem.** The spike's documentation is sprawled across (a) heavy inline code
comments and (b) a dozen root-level `.md` files that mix product docs with
process/decision logs. There is no single, navigable home for "what is this / how
do I work on it". **Task:** synthesise a new, well-structured
`prototypes/standalone/obligations-v2-spike/docs/` folder from *all* existing
sources — every code comment and every existing `.md` — then remove the old
sprawl.

**This runs last on purpose:** it describes and strips the *final* cleaned,
renamed, reorganised code (post-T9), so nothing it writes goes stale, and it
doesn't strip comments that an earlier task is still editing.

- **Read everything first:** all inline comments across the spike + all root
  `.md` (README, DESIGN, EXTENDING, the sweeps, DISCUSSION-LOG, DESIGN-PROVENANCE,
  FINDINGS, MONDAY, CONVERSATION-LOG, HANDOVER, IMPLEMENTATION-PROMPT, this file).
  Mine them for the real content; don't invent architecture.
- **Produce `docs/`:** a `README.md` **index** plus focused, bitesized topic
  files. Must cover at least: the architecture/paradigm (pages-as-spine over a
  thin declarative obligation model + central engine), the engine's shape after
  T9's regrouping, **how to add a new page**, **how to add a new field/
  obligation**, the scope/reconcile/wipe model, persistence ports, and the
  validation seam. Detailed but each file digestible — link out from the index,
  don't write one monolith.
- **GDS language:** apply the GDS content style guide — plain English, short
  sentences, active voice, no needless jargon; readable by someone new to the
  spike. (Best-practice source: the workspace `docs/best-practices/gds/`.)
- **Remove the sprawl:** per the recorded decision, **delete every existing
  root-level `.md`** (product AND process/provenance — git history preserves them
  on the branch) once their content is carried across or consciously dropped. And
  **strip the vast majority of code comments**: move the design narrative into
  `docs/`, delete comments that merely restate the code, but **preserve the
  minority of genuinely load-bearing 'why'/gotcha/invariant comments inline**
  (e.g. NaN bounds-guard rationale, fail-loud seam, scope-wipe invariants). The
  skeptic gate adjudicates borderline "is this load-bearing?" calls.
- **Acceptance:** `docs/` exists, indexed, GDS-styled, covers the topics above and
  is accurate to the final code; the "add a page" / "add a field" guides are
  followable end-to-end (validate by tracing them against a real feature); old
  root `.md` gone; comments reduced to the load-bearing minority; **141 unit / 70
  E2E still green** (docs/comment changes must not alter behaviour — re-lint,
  since removing a docblock can trip a lint rule).
- **Gate:** completeness critic (does a newcomer have everything they need? is any
  deleted rationale unrecovered?) + a load-bearing-comment skeptic (did the strip
  remove a 'why' that guards an invariant?) + both suites in the parent shell.

---

## Orchestration decisions (recorded before kickoff)

- **`h` Hapi-toolkit param (T6): KEEP.** It's a repo-wide idiom shared with every
  real controller — de-abbreviate everything else, but leaving `h` keeps the spike
  consistent with prod. Renaming `h` is explicitly out of scope.
- **Residual-sweep breadth (Phase 4): FULL.** Work the residual medium tail to
  closure with judgement (Sam: "I want this code clean").
- **Doc consolidation (T10) delete scope: DELETE EVERYTHING.** New `docs/` becomes
  the only documentation; all existing root `.md` (product + process/provenance)
  are removed from the working tree — git history on the branch preserves them.
- **Comment strip (T10): strip 'what', keep load-bearing 'why'.** Vast majority
  removed to `docs/`; the minority of invariant/gotcha 'why' comments stay inline.
- **T8 ⇄ T10 interaction:** T10 owns all comment/docblock transformation, so T8 is
  narrowed to functional-style + test-quality only (no docblock polishing).
- **Model routing:** session runs on Fable 5. Phase 1–4 workflow agents get an
  explicit `model: 'opus'` override (Opus 4.8, 1M context — code-edit passes).
  Phase 5 (T9 reorg) and Phase 6 (T10 docs) agents inherit Fable (no override) —
  the design-judgement / read-everything-synthesise phases benefit from it.
  T11 (gate derivation): Fable — engine-adjacent design work with a full
  adversarial panel.
- **T0 outcome (2026-07-07): CONSOLIDATE PARTIALLY — ACCEPTED as T11** (Phase
  4.5, before T9/T10). Report: `T0-ACTIVATEDBY-VS-GATE.md`; T10 folds its
  layering rationale into `docs/` as an architecture-decision note either way.
