# Prompt — stress-test the obligations model with nested, conditional indexed collections

> Hand this whole file to a **fresh agent**. It is self-contained. The task is to
> **extend the existing obligations v2 spike** so it exercises the real-world collection
> constraints the current spike does not: **many indexed obligations, indexed obligations
> that nest, and obligations that a value _inside_ an item triggers for that item only.**
> The point is to **stress-test the model** and produce a **written verdict** on whether it
> holds — not just green code. Work in **three escalating phases**, each a self-contained,
> independently-verifiable canary that de-risks the next. **Do NOT create a v3 spike. Do NOT
> modify the v1 spike** (`obligations-standalone-spike/`, read-only).

---

## Where the code is

- Repo: `DEFRA/trade-imports-animals-frontend`, branch `spike/EUDPA-249-prototype-layouts`
  (branch off it; keep the `EUDPA-249` prefix on your branch).
- Spike: `prototypes/standalone/obligations-v2-spike/` (ESM throughout, **feature/vertical-slice
  layout** — `features/<feature>/` over a central `engine/` + `flow/` + a top-level `registry.js`
  barrel).
- **Read first, in this order:** `README.md`, `DESIGN.md` (esp. §6 "no generic engine" and §9
  "model = data, validation = controller"), then **`DISCUSSION-LOG.md` entry 6** — the review
  that produced this task. Entry 6 is the authoritative brief; this prompt is its executable
  summary. Skim `FINDINGS.md` and `DESIGN-PROVENANCE.md` for the paradigm's origins.
- Acceptance specs (shared across every journey): `prototypes/e2e/`
  (`task-list-with-linear-tasks.spec.js`, `mandatory-fields.spec.js`, `invalidation.spec.js`);
  they iterate `JOURNEYS` in `prototypes/e2e/journey.js` — the v2 entry's label contains
  `page-owned spine`.

## The finding you are starting from (DISCUSSION-LOG entry 6)

The single indexed obligation in the spike — `claims` — is **NOT first-class**. The model engine
is blind to it; the indexing lives in controller convention over an array-shaped value. Concretely,
and each anchored in entry 6:

- `cardinality` / `fields` on the def are **declared but read by nothing** (inert metadata).
- Sub-fields (`claimType`, `claimAmount`) are **not obligations** — no scope, no per-item wipe, no
  dispatch coverage, no status.
- `reconcile` treats the whole array as one opaque scalar (all-or-nothing wipe).
- Completeness is "≥1 entry exists", never "each entry complete".
- `evalPredicate` reads only top-level answers — **item-scoped conditionality is inexpressible**.
- The store facade (`appendEntry`/`updateEntry`/`removeEntry`) is single-level; `updateEntry` is
  dead code (add/remove only, no edit).
- The loop UI is bespoke and hardcoded to `'claims'`; CYA hand-builds Claim-N rows, bypassing the
  generic dispatch `changeHref`.

So a second collection today is copy-paste; nesting and item-conditionality are not just
unbuilt — they cannot be expressed. **Re-confirm this yourself quickly** (grep the anchors above)
before you start — it is the whole motivation.

## What "handling these constraints" requires (the model's real test)

- A **recursive obligation model** — a collection's item is itself a set of obligations, possibly
  including nested collections. The registry becomes (or is walked as) a tree.
- **Path-addressed scope + wipe** — an obligation _instance_ has a path
  (`drivers[1].claims[0].windscreenProvider`); `reconcile` descends and wipes per-instance.
- **Item-relative predicates** — `activatedBy` resolves against the current item's context, not a
  global answer.
- **A reusable loop that stays a LIBRARY, not a FRAMEWORK** — see Guardrails. This is the crux.
- **Dispatch coverage, status roll-up, CYA over the tree.**

---

## Guardrails — the paradigm you must not break (and must test)

- **No generic engine.** v2's non-negotiable (`DESIGN.md` §6): shared code is _a library the
  controller calls_, never _a framework that renders_. A nested add/remove loop begs to become
  that framework. **You may extract a reusable loop helper, but no helper may take a template
  name or a field schema and render.** Each collection feature keeps its own bespoke templates
  and copy. **Whether the loop can be first-class without crossing this line is the primary
  research question — if it cannot, hold the line and document precisely where and why it bends.**
- **Model stays pure data.** Defs carry identity + relationships + structural facts only — no
  copy, no validation, no rendering. Extend the **per-file purity guard** (`obligation-purity.js`)
  to every new obligations file (including any that describe item shapes).
- **Validation stays controller-owned.** New entry controllers compose their own Joi from
  `lib/validate/`, exactly as today. The model never validates.
- **Derived, coverage-asserted dispatch.** Every obligation — at _every depth_ — must have exactly
  one owning page, asserted at boot. Extend the coverage assertion to descend the tree.
- **Destroyed, not hidden.** Scope-exit wipe stays the single home of invalidation, now
  per-instance: removing a driver destroys that driver's claims subtree; Yes→No→Yes never
  rehydrates, at any depth. Pages still cannot hand-roll a wipe (the store facade stays narrow).
- **Safety net first, canary before fan-out, verdict at the end** — every phase (below).

---

## How to run this — orchestrate with sub-agents and workflows (do NOT solo it)

**This is deliberately too big for one context to hold well, and the deliverable is quality, not
speed. Treat yourself as a COORDINATOR, not a lone implementer.** Each phase is a separate
orchestrated pass; you stay in the loop between phases, reading back structured conclusions — you
do not carry the whole thing in one head, and you do not quietly force green. The failure mode to
avoid is exactly "one agent trying to take on the world." Prefer many independent perspectives and
a verdict that survives a skeptic.

Two primitives, used heavily:

- **Task subagents** (the `Agent` tool) — fan out independent reads, reviews and mechanical edits;
  each returns a conclusion, not a file dump, so your context stays clean. Use `Explore` for
  read-only mapping, `general-purpose` for work that writes.
- **Workflows** (the `Workflow` tool) — deterministic multi-agent orchestration (fan-out, judge
  panels, pipelines, adversarial verify). Use them for the design forks and the verification gates.
  **Handing you this prompt is the authorization to use them — that is the point.** Author one
  workflow per phase-step rather than one mega-workflow, and read each result before the next.

**Per-phase spine (adapt as you judge right, but do every step):**

1. **Understand — fan-out readers.** Before touching code, spawn parallel reader subagents, one
   per concern (engine scope/wipe, dispatch/coverage, store facade, status roll-up, CYA
   rendering, the e2e specs), to map **every** place the current single-level `claims` is
   special-cased. Synthesize their conclusions into a "sites to change" list. Do not read it all
   serially yourself.
2. **Design the forks — judge panel.** For each load-bearing decision (recursive item shape in
   the pure model; path-addressed scope/answers representation; item-relative predicate vocab;
   **where the loop's library/framework line sits**), run a **design-panel workflow**: N
   independent architect agents each propose an approach from a different angle; M independent
   judge agents score them against the guardrails (model purity, no-generic-engine, zero-DOM
   parity, tractability); then synthesize the winner, grafting the best of the runners-up. **This
   is exactly how this paradigm was chosen** (`DESIGN-PROVENANCE.md`: a 3-architect / 3-judge
   panel) — reuse the pattern deliberately.
3. **Safety net first — do NOT delegate this away.** Write the phase's property tests/specs and
   get them green (or red-for-the-right-reason) on the current code, before the churn. This is the
   regression net that lets the fan-out be aggressive.
4. **Implement.** Fan out implementor subagents for mechanical, parallelizable breadth (re-pointing
   call sites, standing up per-feature files) — but keep the model/engine **core** changes
   coherent in one hand. If parallel implementors touch the same files, isolate them
   (`isolation: 'worktree'`) or serialize the conflicting writes.
5. **Adversarially verify — the quality gate.** After each phase, run an **adversarial-verify
   workflow**: spawn skeptic agents whose job is to BREAK the invariants — per-instance wipe
   destroys only the right subtree; no rehydrate at any depth (Yes→No→Yes); every obligation at
   every depth has exactly one owning page; DOM parity for the phase-1 canary. Majority-refute
   kills a claim. Add a **completeness critic**: "what did we not test — which nesting depth,
   which path, which modality?" Its findings become the next round.
6. **Verdict.** One agent drafts the phase's finding (does the model hold; where it strains; is the
   no-generic-engine line intact); a second, adversarial reviewer stress-tests that verdict for
   wishful thinking before it lands.

**Scale the orchestration to the work.** Phase 1 (the model/engine generalisation) is the deep
one — invest the full panel + adversarial passes. Phases 2-3 are additive proofs — lighter fan-out,
but still safety-net-first and adversarially verified.

---

## The three phases (escalating; do them in order)

### Phase 1 — make single-level indexing first-class (claims is the zero-DOM canary)

**Goal.** Promote "indexed obligation" from a special case to a modelled concept, with **no
nesting and no new conditionality yet**:

- Sub-fields become real (sub-)obligations the model can see (scope, per-item wipe, dispatch
  coverage, status).
- The engine gains **path-addressed** scope/wipe/status for **one** level of indexing.
- Per-item completeness becomes a real model fact (a claim with blank required fields is not
  "complete").
- The bespoke claims loop is extracted into a **reusable pattern** (holding the no-framework line).

**Safety net + canary.** **Re-express the existing `claims` collection on the new mechanism with
ZERO rendered-DOM change.** The three shared specs and `contract.test.js` are your ready-made
regression net — they must stay green untouched. Add unit tests for the new engine behaviour
(path scope, per-item wipe, per-item completeness) _before_ the churn. If DOM parity + specs hold,
the generalisation is sound.

**Design decisions to make and record (entry 6 lists them):** how an item's shape is represented
in the pure model; the answers/scope representation for paths; how dispatch coverage descends;
**where exactly the loop-as-library line sits.**

**Verify.** `npm run test:obligations-v2-spike` (new engine tests + all existing green);
`npm run test:prototype -- -g "page-owned spine"`.

### Phase 2 — one level of nesting (drivers → claims)

**Goal.** A `drivers` indexed obligation whose item contains a **nested** `claims` indexed
obligation. Proves the model recurses: nested paths (`drivers[i].claims[j].claimType`), cascading
per-instance wipe (remove a driver → destroy that driver's claims), and a loop-inside-a-loop UI
(a claims sub-hub inside a driver item, inside the drivers hub).

**Landing — DECIDED.** Extend the existing single `named-driver` add-on into an indexed
**`drivers`** collection (n drivers), each driver owning its own nested `claims`. This is the
settled approach — reusing the existing gated add-on keeps the change contained and keeps the
existing specs meaningful; a brand-new journey was considered and rejected as more scaffolding for
less signal. You will **update the happy-path spec** (it already walks "Add a named driver") to
add a driver, add a claim under that driver, and continue. Keep iterating on **this** v2 prototype;
do not spin up a parallel spike.

**Safety net.** Write property specs _first_: add two drivers; add claims under driver 1 and
driver 2 independently; removing driver 1 wipes only driver 1's claims; Yes→No→Yes on a driver's
claims does not rehydrate at any depth. Then build.

**Verify.** New specs green; `npm run test:prototype` (full — no regressions across other journeys).

### Phase 3 — item-scoped conditionality (windscreen claim → approved provider)

**Goal.** Inside a claim item, `claimType === 'windscreen'` activates an extra obligation
`windscreenProvider` (one of three approved repairers) **for that claim instance only**. Proves
item-relative predicates at full depth: `drivers[i].claims[j].windscreenProvider` is in scope iff
`drivers[i].claims[j].claimType === 'windscreen'`.

**Design decision.** The predicate vocab extension for item-relative references (a relative
`activatedBy` resolved within the item's context frame during the recursive `reconcile`) — keep it
as small as the existing three-operator vocab; if it needs to grow, that growth _is_ a finding.

**Safety net.** Specs first: driver 1's claim 2 is windscreen → the provider is asked for _that_
claim only; changing that claim away from windscreen wipes the provider at that exact path
(destroyed, not hidden); two windscreen claims each carry their own provider answer independently.

**Verify.** New specs green; full `npm run test:prototype`.

---

## The deliverable is a verdict, not just green code

The point is to test the model. **Each phase ends with a written assessment** (append to
`FINDINGS.md` and tick `DISCUSSION-LOG.md` entry 6a/6b/6c) answering: did the model hold; where did
it strain; is the "no generic engine / library-not-framework" line intact or did nesting force a
principled concession — and if so, exactly where and why. The final output is a **go/no-go read**
on whether this obligations paradigm survives real recursive, conditional, indexed requirements.
If some phase reveals the model breaks down, that is a **successful** outcome — document it
precisely; do not paper over it to force green.

## Environment watch-outs

- Port 3000 is sometimes held by a stale `node ./src` dev server — stop it before an E2E run.
- The pre-commit hook runs `format:check` + `eslint` + the **whole-repo** test suite. Format the
  files and fix duplicate/unused imports before committing (`import-x/no-duplicates`,
  `no-unused-vars` bite easily). Note `format:check` scans the whole tree, so a stray unformatted
  untracked file elsewhere can trip it — check `npx prettier --check` output names _your_ files.
- Sonar's staged secrets scan is fine; agentic analysis is skipped for the prototypes tree
  (no project configured) — expected, not a failure.

## Docs to update as part of the change

- `README.md` / `DESIGN.md` — describe first-class indexed obligations (the model's item shape,
  path-addressed scope, the reusable loop and where its library/framework line sits), and the
  nested + item-conditional capabilities as they land.
- `DISCUSSION-LOG.md` — tick off 6a/6b/6c as they land; note anything discovered that revises the
  entry-6 plan.
- `FINDINGS.md` — the phase-by-phase verdict on whether the model holds.
