# EUDPA-288 — handover for pair / continuation

Written 2026-07-16 by Paul + Claude Opus 4.7 at end of session. For whoever picks up next (Sam, another agent, future you). Aim: 5-minute read → know where to start.

---

## TL;DR

EUDPA-288 is the "blend the two obligation-model spikes" ticket. **28 commits landed, all pushed to origin.** Phases 0–4.6 delivered per BRIEF's migration order (bugs fixed, analysability recovered, storage-contract clean, zero duplication). Phase 5 (per-record conditional mandate) deferred under YAGNI — no current V4 rule needs it; design captured for reopen. **Phase 6 (persistence + submit + parity) is up for pair with Sam.** Design brief drafted; scope + parity strictness are the two open decisions.

## Where we are

- **Branch:** `spike/EUDPA-288-blend-obligations-models`
- **Head:** `26dbc66 docs(EUDPA-288): draft Phase 6 design brief`
- **Base:** cut from `spike/EUDPA-249-flow-layer` HEAD (`78f5e79`); A-side reference is `spike/EUDPA-249-prototype-layouts`, read-only.
- **Tests:** 1361 passing, 0 failing. Prettier + eslint clean. Pre-commit hook is honoured on every commit (`npm run format:check && npm run lint && npm test` via husky).
- **Working tree:** clean. No uncommitted work.

## What was delivered (Phases 0–4.6)

| Phase | Ships                                                                                                                                                                                                                       | Value                                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 0     | Branch off flow-layer + PLAN.md + bin frozen ancestor `obligations-v4-model` (kept GAPS.md)                                                                                                                                 | Setup                                                                |
| 1     | Fixed 3 live B bugs: persist purge, applyTo reorder (fixpoint), `within.id` deref guard; added `minEntries` collection floor                                                                                                | Bugs banked                                                          |
| 2     | `dependsOn` metadata schema + coverage assertion + swept all 38 gated obligations                                                                                                                                           | Static dependency graph recovered (★ BRIEF's highest value-per-line) |
| 3     | Reachability prover ported (graph-level) + per-helper witness synths + coverage gate on helpers                                                                                                                             | Analysability recovered without giving up closures                   |
| 4     | Records port abstraction + boot-time obligation→page totality assert + `notInUnionOf` helper (emptied OPAQUE set)                                                                                                           | Storage contract + silent-invisibility seam closed                   |
| 4.5   | Meta-first helpers (`equalsGate`/`presentGate`/`includesGate`/`alwaysInScope`) + migrated 9 sites off `branchedGate` + dropped 19 trivial `applyTo` closures                                                                | Zero duplication; the "Paul spotted the smell" refactor              |
| 4.6   | Cleanup: dropped 10 redundant explicit `dependsOn` (Q1); documented helper taxonomy (Q2 rescoped from migration to docs); `anyOfIds` id-based deferred resolution (Q3); extracted `isRecordMap` + `readGate` internals (Q4) | Residual smells cleared                                              |

**Prover state:** 44 obligations, 44 reachable, 14 witness-synthesisable, 30 trivial, 0 opaque, 0 errors. `branchedGate` absent from the manifest (retained in `helpers.js` as escape hatch).

## What was deferred (Phase 5)

**Per-record conditional mandate — YAGNI defer.** No current V4 rule needs it. `DESIGN-PHASE-5.md` retains the full design (code sites, decisions, adversarial checks, load-bearing finding that reader count is ~2 not 5–6) as an extension-point spec for when a real rule surfaces. Reopen triggers documented in §10 of that doc.

## What's up for grabs (Phase 6)

Draft brief at `DESIGN-PHASE-6.md`. Two open decisions:

1. **Scope split** — 4a essential (mapper + parity, ~1wk, 3 commits) / +4b useful (real persistence + journeyId + submit, ~2wk, 3 commits) / +4c optional (draft/resume/amend/multi-draft, ~1wk, 3 commits) / defer entirely.
2. **Parity strictness** — byte-for-byte via `skeleton-equivalence.test.js` (BRIEF's "executable oracle"), structural-only, or B-mapper unit tests only.

Claude's recommendation: **4a only + byte-for-byte parity.** Highest evidentiary value per line. 4b/4c are YAGNI candidates until real spike-demonstration need surfaces. Paul + Sam to converge.

## Entry-point docs — reading order for a fresh reader

1. **`PLAN.md`** (this dir) — master plan. Sections 1–8.6 are done; §9 defers Phase 5 (link to brief); §10 is Phase 6.
2. **`DESIGN-PHASE-6.md`** (this dir) — the design brief driving the next conversation. Reads Sam's input.
3. **`DESIGN-PHASE-5.md`** (this dir) — deferred but complete; reopen spec for future.
4. **`obligations.md`** (this dir) — the canonical model doc. Baseline for what B expresses.
5. **`DESIGN-DELTA.md`** (this dir) — engine-adjacent design decisions landed across Phases 3, 4, 4.6.
6. **`prototypes/report/BRIEF.md`** on `origin/chore/EUDPA-249-model-comparison` — the original decision brief driving the whole blend. Migration order lives here.
7. **`prototypes/report/REPORT.md`** on the same branch — long-form argument behind BRIEF/MATRIX.

## Model exploration tools (added 2026-07-17)

Two tools were added at end of session to make the model easier to surface + query.

- **`MODEL.md`** (this dir) — auto-generated data dictionary + Mermaid dependency graph + per-section page→obligations flow graphs. GitHub renders the Mermaid inline. Regenerate via `npm run docs:model` from repo root. Staleness test in `docs/generate-model.test.js` catches unregenerated commits at CI time. Baseline is stamped as a content-hash (sha256 of the four input files) rather than git SHA — byte-identical on unchanged inputs, obvious diff when any input changes.
- **`repl-obligations.js`** (this dir) — interactive REPL for querying the model. Start with `npm run repl:eudpa-249`. Commands: `help`, `list [group]`, `state`, `set <name> [<recordId>] <value>`, `clear [<name>]`, `evaluate`, `explain <name>`, `witness <name>`, `reach`, `fixture <name>`. Values parsed as JSON with bare-token fallback (so `set commodityCode line1 0101` and `set reasonForImport '"sale"'` both work). Handlers are pure `(session, args) → {session, output}` — testable without spawning a subprocess.

Typical exploration flow: fire the REPL, `fixture internal-market-partial` to load a canned scenario, `evaluate` to see the journey state, `explain <someObligation>` to trace why it's in its current state, `witness <someGate>` to see what value would open a specific gate.

## Working pattern that worked in this session

- **HALT-only cadence.** Paul reviewed at end of each phase, not per-commit. Between HALTs the loop runs by delegating to `general-purpose` Task subagents (one per commit), then the parent (me) re-verifies (`never trust the worker's green` — run test suite, check diff scope).
- **Persona routing:**
  - Additive work → `INCREMENT_IMPLEMENTOR`-style brief (see [`~/git/defra/trade-imports-animals-workspace/.claude/skills/journey-builder/references/INCREMENT_IMPLEMENTOR.md`](/Users/paulhodgson/git/defra/trade-imports-animals-workspace/.claude/skills/journey-builder/references/INCREMENT_IMPLEMENTOR.md))
  - Engine work → `MODEL_EXTENDER`-style brief (adversarial self-check, DESIGN-DELTA entry, backwards-compat guarantee)
- **Sub-agents receive:** repo + branch + prototype path + PLAN.md section + previous-commit hand-off note + explicit scope boundaries + red-green-refactor structure + rules (no `--no-verify`, don't touch `prototypes/standalone/`, etc). Brief carefully — the persona rules are load-bearing.
- **One subagent connection dropped mid-flight** (Phase 4.3, ~32 min in). Parent verified the uncommitted work locally + committed with attribution. Recovery pattern worth knowing.
- **Every commit passes the pre-commit hook** (prettier + eslint + full vitest with coverage). No `--no-verify` ever. Sonar is a workspace CLAUDE.md rule but N/A for docs-only or delete-only commits.
- **Commit messages:** plain `-m` argument (avoid HEREDOC — bash quirks in the harness). `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` trailer on every AI-assisted commit.

## Notable in-flight decisions worth carrying forward

- **Path clarification early.** BRIEF/REPORT name A as `standalone/live-animals/` and B as `journey-config-spikes/EUDPA-249-flow-layer/`. Ticket wording named other paths — Paul confirmed REPORT's A/B was the intended blend. Verify similar path questions with Paul early.
- **Phase 4.5 (meta-first helpers) added mid-flight** after Paul spotted duplication in the Phase 3.2 output. The refactor eliminated the smell. Willingness to add mid-flight phases is a feature of this workflow.
- **Phase 4.6 (cleanup pass) added mid-flight** after Paul flagged 4 residual smells (redundant `dependsOn`, `allowListed`-vs-`includesGate`, `get anyOf()` getter, helper closure density). One of the four (Q2) rescoped from migration to docs when I found my initial answer was subtly wrong.
- **YAGNI applied cleanly on Phase 5.** Paul's challenge: "we can always document this as a possible extension point. Otherwise we risk YAGNI." Steelmanned and accepted. Same instinct available for Phase 6 sub-scopes.

## Files worth grepping if lost

- **`helpers.js`** — all `applyTo` factories + the taxonomy docstring (`§Helper taxonomy`).
- **`analysis/reachability.js`** — prover, witness synths, `STRUCTURED_HELPER_TYPES` / `OPAQUE_HELPER_TYPES`.
- **`obligations.js`** — the 44-obligation manifest.
- **`obligations/evaluator.js`** — `buildImplication` (line 497), `convergePurge` (fixpoint), classifier.
- **`engine/index.js`** — `groupInvariantErrors`, `effectiveStatus`, `journeyState`, `containerStatus`.
- **`services/persistence/records/`** — Phase 4.1's port abstraction (stub only; real backing is Phase 6).
- **`flow/boot-totality.js`** — Phase 4.2's obligation→page totality assert.
- **`obligations/helper-internals.js`** — `isRecordMap`, `readGate` (Phase 4.6.4 shared normalization).

## Known follow-ups / TODOs

- **[DONE 2026-07-17] Reason-gated `destinationCountry` / `portOfExit` / `exitDate`** landed alongside a page-visibility matrix test covering all five reason values (Confluence page 6497338582, "Reason of Import" section). Fixture `transit-with-lines.json` and every transit-path test now include the two mandatory follow-up fulfilments. Plan preserved in `PLAN-reason-gated-fields.md`.
- **[DONE 2026-07-17] Accompanying-document "all-or-nothing" block (Option A)** landed. New `accompanyingDocument` container obligation with `requires.allOrNothingOfIds`; the four fields are unconditional scalar-optional (no `applyTo`, no self-loop). Engine primitive `groupInvariantErrors` extended with `allOrNothingOfIds`; `collectGroupsPresentedIn` walks `presents[].obligation.containers` back-refs. Container is on `KNOWN_UNWIRED` + `boot-totality` invariant-carrier exclusion. Plan preserved in `PLAN-accompanying-doc-block.md`.
- **[DONE 2026-07-20] Unit-count-equals-numberOfAnimals invariant.** V4 "unit records ARE animals" reading of Confluence 6497338582: `unitRecord.requires.recordCountEquals: { fieldId: numberOfAnimals.id, errorCode: … }` enforces count parity per commodity-line instance. Fourth invariant kind on `groupInvariantErrors`; walks the parent group's records and compares child-record count (by fulfilmentId prefix) to the scalar sibling per line. Rollup-only — no purge on either direction; the user reconciles by adding/removing units or amending the number. CYA prompt routing broadened by `err.code` so `allOrNothingOfIds` (previously silent — a small WS2 gap) and the new count mismatch both surface as prompts. Plan preserved in `PLAN-unit-count-invariant.md`. Related open follow-up: whether `animalsCertifiedFor` becomes commodity-conditional (spec: "APHA to confirm") — same "how strict is the model" theme.
- **Regenerate `MODEL.md` when the manifest, flow, or helpers change.** The auto-generated doc (particularly its page → obligations section) will drift as Sam's consolidation work touches `flow.js` / `obligations.js` / `helpers.js` / `boot-totality.js`. The staleness test in `docs/generate-model.test.js` fires at CI time when any of the four hashed inputs change without a regen — but the text reminder helps you not be surprised. Fix is one command: `npm run docs:model` from repo root, then commit the regenerated `MODEL.md` alongside the code change.
- **Phase 5 reopen triggers** — documented in `DESIGN-PHASE-5.md §10`. Watch for a V4 spec revision naming a per-line status flip, or a real rule the current model forces into the wrong shape.
- **Phase 6 scope decisions** — open in `DESIGN-PHASE-6.md §§7 + 8`. Sub-scope split (4a / +4b / +4c / defer) + parity strictness (byte-for-byte / structural-only / unit-tests-only). Claude's recommendation: 4a + byte-for-byte.
- **`containsUnweanedAnimals` — per-line vs per-notification** — currently notification-level (one yes/no for the consignment). If V4 later wants per-line ("unweaned mandatory on cattle lines specifically"), that's a model change (moving from notification-level to line-scoped) — bigger than Phase 5's per-record mandate. Flagged in `DESIGN-PHASE-5.md §10` as one of the weak signals to watch.
- **REPL `help` output vs README** — `repl-obligations.js`'s `help` command is terse. Some non-obvious behaviours (JSON-vs-bare-token value parsing, name-keyed state, WITNESS_KIND meaning) are in the commit body but not in `help`. If REPL usage grows, land a short doc block at the top of `repl-obligations.js` covering those.

## What NOT to do (learned the hard way)

- Do NOT touch anything under `prototypes/standalone/` — A-side sources are read-only reference throughout this ticket.
- Do NOT re-introduce a JSON/JSONLogic gate DSL (BRIEF §Bin: "B built it, shipped it, killed it").
- Do NOT delete `branchedGate` from `helpers.js` — it's absent from the manifest but retained as escape hatch for genuinely non-derivable predicates.
- Do NOT use `git commit --no-verify` (workspace CLAUDE.md rule + pre-commit hook is load-bearing).
- Do NOT modify existing behaviour under `engine/` without a MODEL_EXTENDER-style brief + `DESIGN-DELTA.md` entry.
