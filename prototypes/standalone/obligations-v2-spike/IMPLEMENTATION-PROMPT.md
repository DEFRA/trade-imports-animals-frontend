# Implementation brief — obligations-v2-spike improvements

You are picking up a **throwaway design spike** (v2 of an obligations paradigm for a
GOV.UK-style car-insurance task-list journey). A review session produced a prioritised
backlog of improvements. Your job is to implement them, in order, to a high standard —
this is a decision/quality artifact, not disposable code.

**Spike directory:**
`~/git/defra/trade-imports-animals/repos/trade-imports-animals-frontend/prototypes/standalone/obligations-v2-spike/`

**Run test/build commands from the frontend repo root:**
`~/git/defra/trade-imports-animals/repos/trade-imports-animals-frontend`

## 1. Load context first — do NOT skip, do NOT work from assumptions

Read these docs IN FULL, in order (they are in the spike dir):

1. `README.md` — the paradigm in three sentences + the module map.
2. `MONDAY.md` — orientation: the GO verdict, current state, how to verify, and (last
   section) the `--no-verify` commit caveat.
3. `FINDINGS.md` — Phase 1 + "Entry 6" (§6a/§6b/§6c verdicts + the FINAL READ).
4. `DISCUSSION-LOG.md` — the running work log; §6 is the nested-collections phase.
5. `DESIGN.md` — §9 (validation rework) and §10/§10.1/§10.2 (indexed collections,
   nesting, the item-relative predicate).
6. `DESIGN-PROVENANCE.md` — how the architecture was chosen (design panels).
7. `EXTENDING.md` — the cookbook (add a field / a page / an indexed collection).

Then ground yourself in the load-bearing code: `registry.js`, `lib/path.js`,
`engine/reconcile.js`, `engine/status.js`, `engine/predicate.js`, `engine/index.js`,
`flow/dispatch.js`, `flow/flow.js`, `features/claims/*`, `features/named-driver/*`,
`features/hub/controller.js`.

**THEN read `CONVERSATION-LOG-2026-07-06.md` IN FULL — it is your work order.** Every
`NW-N` item has the full spec, code citations (file:line), the decisions (`DEC-N`) and
the gotchas already worked out. **Do not re-derive; follow it.** The "WORK ORDER" section
near the top gives the phase sequence; each `NW-N` block below it gives the detail.

## 2. Prime directive — orchestrate with Workflows (heavy, dynamic use)

This work must be driven by **heavy, dynamic use of the Workflow tool (multi-agent
orchestration)** — not solo edits. The spike itself was built this way (see MONDAY.md
"How this was built" and DISCUSSION-LOG §6 "orchestrate, don't solo it"). Mirror that
discipline:

- **One workflow per phase, dynamically.** Author a workflow for the phase, run it, READ
  its results, then decide/author the next phase. Stay in the loop between phases — do
  **not** fire one giant script that runs everything blind.
- **Fan out where the work parallelises** — the per-`.js` best-practices sweep (Phase 0),
  the de-abbreviation across ~14+ sites (Phase 1), the per-module engine decomposition
  audit (Phase 3).
- **Design-panel workflow for any genuine fork** (N architects → adversarial judges →
  synthesize) — e.g. the two-port store shape (Phase 4), how far to decompose each engine
  module (Phase 3). Same method DESIGN-PROVENANCE.md used.
- **Adversarial-verify workflow (skeptics + a completeness critic) as the quality GATE**
  on anything touching `reconcile`/`status`/`predicate`/`store` or the scope/wipe
  invariants (Phases 3, 4, 5). Nothing semantic ships without it.
- **Safety-net tests FIRST** for anything semantic (the store reshape, the collects
  derivation, the reachability extension) — pin current behaviour before the churn, as the
  feature-model restructure and entry-6 phases did.

## 3. Non-negotiables

- **Stay GREEN after every phase:** `npm run test:obligations-v2-spike` (expect **102**
  unit) and `npm run test:prototype` (expect **70** E2E, ~30s). A pure rename/refactor
  (Phases 1–3) MUST stay byte-green; additive work (Phases 4–5) adds tests. Stop a stale
  dev server on :3000 first if E2E hangs (`lsof -ti:3000 | xargs kill`).
- **One commit per phase**, `EUDPA-249` prefix (confirm your branch with `git status`
  first; the spike code + the conversation log are in the working tree — create a working
  branch off the current one, keeping the `EUDPA-249` prefix).
- **Commit with `--no-verify`** (as prior phases did): the repo pre-commit hook runs a
  whole-tree `format:check` that trips on two pre-existing stray prompt files that are not
  ours. Your own code must be **eslint + prettier clean**, and you must run the unit + E2E
  suites by hand in place of the hook. (See MONDAY.md, last section.)
- **After each phase, update `CONVERSATION-LOG-2026-07-06.md`:** tick the `NW-N`, add a
  one-paragraph "landed as" note (as DISCUSSION-LOG §6 does), and record the green counts.
- It's a throwaway spike, but **implement well** — clean, tested, verified.

## 4. The work order (full detail per item in the conversation log)

Follow this sequence. Each is `NW-N` in `CONVERSATION-LOG-2026-07-06.md` — read that
item's block for the exact spec, citations and gotchas before starting it.

- **Phase 0 — NW-6:** spike-scoped best-practices sweep. A read-only Workflow that globs
  the spike's ~58 `.js` files and fans out one agent per file against
  `~/git/defra/trade-imports-animals-workspace/docs/best-practices/`. Produces a triage
  report; makes NO code changes. Use its findings to enrich the phases below (it will
  likely re-derive NW-1/NW-3/NW-7 and surface more of NW-2).
- **Phase 1 — NW-1:** full de-abbreviation pass — `defs`→`obligations`,
  `walkDefs`→`walkObligations`, yielded `def`→`obligation`, `registry.refs`→a real name.
  Pure rename; must stay byte-green. (DEC-1: full family, not just `defs`.)
- **Phase 2 — reference-not-string seams** (cohesive; build on Phase 1's names):
  - **NW-7:** per-feature `page.js` holding `{id, slug}`; `flow/flow.js` spreads the ref
    and adds only `gate`. **Mind the import cycle** (flow→controller→engine→status→flow) —
    the identity module must be cycle-free. (DEC: per-feature, not central.)
  - **NW-3:** derive `meta.collects` by default from the feature's **non-system**
    obligations; multi-page features that split (e.g. `modifications`) override with an
    explicit object-ref subset. (The non-system filter makes `quote` correct with no
    override.)
  - **NW-8:** replace `section.addon` (domain concept in generic `flow`) with a generic
    marker + hub-owned title keyed by section id. (See the gate-vs-marker comparison in the
    log; recommended option is the generic `dynamic` flag — but confirm the option choice.)
- **Phase 3 — NW-2:** audit every `engine/` module for decomposition. `index.js` becomes a
  **pure barrel** (zero owned logic — a standing convention); split the overloaded facade
  and `status` (engine-pure core vs flow-aware roll-up, per OBS-1); move `util.js` → `lib/`.
- **Phase 4 — NW-4:** reshape `store` into a two-port persistence **service shape** —
  session port + records/durable port, write-through-on-save, resume-days-later, journey↔
  user association. **All STUB bodies** (guardrail: NO real Defra ID / Mongo / Redis work —
  the shape of the requirement is what's true). Highlight the paradigm strength (resume =
  load JSON + reconcile, because nothing derived is stored).
- **Phase 5 — NW-5:** extend `proveReachability` to full depth via representative-instance
  witnessing — closes the untested item-conditional (`windscreenProvider`) coverage hole.
- **Phase 6 — verification:** re-run the Phase-0 sweep, full unit + E2E, confirm green,
  finalise the log.

Start by reading everything in §1, then author the Phase 0 workflow.
