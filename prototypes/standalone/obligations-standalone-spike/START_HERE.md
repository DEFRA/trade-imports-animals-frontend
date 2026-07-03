# START HERE — obligations-standalone-spike

You are looking at this implementation for the first time. This page explains what it is, how it is
built, and — crucially — **which documents to trust for what**, because the docs fall into three very
different categories (live product data, narrative design prose, and build-time agent scaffolding) and a
few of the prose figures have drifted. Read this page first, then follow the reading order below.

> **If you wrote `obligations.md`** (the source paradigm spec at `../../model-spikes/obligations.md`) but
> have never seen this code: this spike _is_ your spec, realised. Your fastest bridge from spec to code is
> `coverage-matrix.json` (every obligation id → the files that handle it → its test) and
> `obligations-catalogue.json` (your 2090-line doc chunked into 514 individually fact-checked claims).
> Neither is runtime code — they are the traceability ledger between your prose and this implementation.

---

## 1. What this is

A **self-contained, gated throwaway prototype** — a fifth standalone spike living alongside spikes A–D in
`prototypes/standalone/`, implementing the _obligations paradigm_ from `obligations.md`. It is a working
Hapi + Nunjucks app for a car-insurance task-list journey, but it exists to **demonstrate a paradigm**, not
to ship: the README calls itself an "honesty ledger" and the banner reads _"GATED THROWAWAY PROTOTYPE …
never to be productionised."_

Important framing: the **A–D bake-off** (`../comparison.md`) scored four _other_ paradigms
(selectors / statechart / rules-engine / schema-first; ranked A 58, C 55, B 54, D 53). **This obligations
spike is a later, separate addition and is _not_ part of that scored comparison** — do not look for it in
`../README.md` or `../comparison.md`.

Green baselines (verify these yourself — they are the ground truth the prose can drift from):

```bash
npm run test:obligations-standalone-spike   # 633 unit tests / 85 files
npm run test:prototype                       # 61 e2e across all prototype journeys
node prototypes/standalone/obligations-standalone-spike/dump.js   # headless: model without its UI
```

---

## 2. Read this before you trust any number in the docs

The narrative docs (section 5B) were written during the build and carry figures that later work moved.
**When a prose figure and a `*.test.js` pin disagree, the test wins.** Known drift:

| Claim in prose                                                                   | Reality                                                | Where to confirm                                               |
| -------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| "20-export contract barrel" (README, EXTENDING)                                  | **21 named exports** (a 16-item conceptual surface)    | `contract/index.test.js` — `expect(exported).toHaveLength(21)` |
| Per-file `~lines` counts (PLAN.md), "everything ≤150 lines"                      | Shifted by the 2026-07-03 style refactor               | `wc -l` / current files                                        |
| "this spike's folder is not yet under version control" (EXTENDING)               | Stale — it is in git; latest style commit is `161898f` | `git log`                                                      |
| DESIGN-DECISION §4 graft 15 / §6 risk 8 talk of rulings as "pending"             | Those three rulings are now **decided** (section 4)    | PLAN.md `## Rulings`                                           |
| Exact identifiers / line anchors in EXTENDING.md and in `SIMPLIFICATION-PLAN.md` | May be off by a few lines after the style refactor     | the cited source files                                         |

Two things that are **not** drifted: (a) citations like `obligations.md:196` point at the _paradigm spec_,
a different file the refactor never touched; (b) the word **`catalogue`** in the JS code resolves to
`model/obligations.json`, **not** the root `obligations-catalogue.json` — don't confuse the two.

---

## 3. The paradigm in three sentences

1. The journey is **committed declarative data**: an obligations catalogue keyed on immutable UUID **ids**
   (code binds to meaningful **names**), plus a Container-tree **Flow** carrying all page copy.
2. Two **pure, zero-I/O evaluators** read that data: the **ObligationEvaluator** decides _what is owed and
   whether it is satisfied_ (flow-agnostic, id-keyed), and the **JourneyEvaluator** decides _where that
   shows up in the page tree and where to go next_ (it consumes the first evaluator's output verbatim).
3. One **side-effecting orchestrator** canonicalises writes, mints stable fulfilment ids, wipes
   out-of-scope answers, runs the in-process quote handler, and re-evaluates to a fixed point — **nothing
   derived is ever stored; every request recomputes state from a `fulfilments` map.**

---

## 4. The three human rulings (decided 2026-07-02 — do not revisit)

These are load-bearing and supersede the "pending" language in DESIGN-DECISION. Verbatim from `PLAN.md`:

1. **Post-submit freeze:** one-way in-progress→submitted flip; after submit every route resolves to a
   read-only CYA; the `post-submit-freeze` e2e spec asserts it.
2. **Early CYA:** open access — direct-URL CYA mid-journey shows soft "you still need to…" prompts and
   prices a partial quote; the **hard gate is at CYA POST only**.
3. **Mandates:** `fullName` is the **only** page-hard field (blocks save with a GDS error); every other
   field is page-soft (blank saves advance), and engine-mandatory gaps block only at CYA POST.

---

## 5. Documentation index — by category

### 5A. Runtime model data — _load-bearing; this is what the app actually reads_

Hand-authored JSON, imported by product code and served over routes. Treat as reference/lookup, not prose.

| File                       | What                                                         | Read by                                                        |
| -------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| `model/obligations.json`   | The real obligations catalogue (30 records)                  | `contract` (served raw), `engine`, `i18n`, `lib/fields`, tests |
| `model/flow.json`          | The polished runtime Flow (sections, hub, CYA, confirmation) | `contract/status`, `journey`, `flow-eval`, tests               |
| `model/messages.en.json`   | Reason-code + validation message catalogue                   | `i18n/resolve` (the single copy-resolution point)              |
| `model/skeleton-flow.json` | A minimal second Flow over the same core                     | **tests only** — the cross-Flow equivalence fixture            |

### 5B. Narrative design docs — _read these to understand; verify figures against tests_

Prose written during the build. Reading order for a first-timer is numbered.

| #   | File                 | Purpose                                                                                                     | Read it when…                                                          |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1   | `README.md`          | "Honesty ledger" — paradigm in 3 sentences, run commands, the full implement/reduce/defer accounting        | **First.** Read the top third to orient; the ledgers are a lookup      |
| 2   | `DESIGN-DECISION.md` | Why `obligations-engine` beat two rival architectures; the module map (§2) and grafts (§4)                  | You want the _why_ and a map of what lives where                       |
| 3   | `EXTENDING.md`       | Cookbook — two worked examples (add a field; add a page) showing the model-driven claim                     | You are about to _change_ the model (verify identifiers first)         |
| 4   | `tests/README.md`    | Maps the five browserless invariant tiers + the pinned-test registry; honest "structural, not proof" limits | You want to know _what is verified and how strongly_                   |
| 5   | `PLAN.md`            | The 13-step build manifest with per-file → obligation-id → test tables                                      | As an **index** when hunting where a behaviour lives (ignore `~lines`) |

### 5C. Build-time provenance & verification ledgers — _agent scaffolding; reference only, NOT runtime_

Produced by the plan-first AI build/verification passes. **No product code or test imports these.** They
record how the spike was derived from the spec and how each claim was checked — invaluable for tracing spec
↔ code, useless as a top-to-bottom read.

| File                         | What it records                                                                                                                        | Nature                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `obligations-catalogue.json` | 514 atomic claims chunked out of `obligations.md`, each fact-checked (`source`, `verification`, `rejected_during_verification` fields) | Extraction + verification ledger       |
| `coverage-matrix.json`       | Each claim id → `handled_by` files → `test` → `scope` (implement/reduce/defer) → note                                                  | Claim→code traceability map            |
| `synthesis.json`             | 45 themes, duplicates, e2e edges, `open_for_human` items, back-referencing catalogue ids                                               | Planning/distillation of the catalogue |
| `parity-facts.json`          | The browser behaviour extracted from spike-a that this spike must match (only _cited_ in comments; constants hand-copied)              | Parity baseline                        |

### 5D. Review outputs & next steps — _the freshest docs (created 2026-07-03); potential future work_

Post-implementation review artifacts. These describe **possible** next work and are the most up-to-date
files here.

| File                     | What                                                                                                                                                                  | Status                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `SIMPLIFICATION-PLAN.md` | 40 candidate architecture simplifications (2 killed, 38 need a human ruling, 0 auto-safe), collapsing to **6 policy rulings**                                         | **Analysis only — nothing applied. Awaiting your decisions.** |
| `STYLE-FINDINGS.json`    | 406 verified JS style findings — 237 **applied** (commit `161898f`), 169 **held** (bulk test-name rewrites that would strip obligation/parity provenance), 4 rejected | Applied set is live; held set is recorded for your call       |

### 5E. Sibling & source context (one level up)

- `../../model-spikes/obligations.md` — **the source paradigm spec** (the thing this spike implements).
- `../README.md`, `../comparison.md` — the A–D paradigm bake-off (this spike is **not** in it).
- `../spike-a…d/*.md` — per-paradigm deep-dives (selectors / statechart / rules-engine / schema-first).

---

## 6. Architecture at a glance

Storage keys on immutable **ids**; code binds to **names**; nothing derived is stored. Open **`routes.js`
first** — it assembles every route module into one Hapi plugin and wraps each surface in the post-submit
guard.

### Layers

| Folder                                                                | Responsibility                                                                                                                                     |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model/`                                                              | The journey as committed JSON (catalogue, Flow, copy, skeleton Flow)                                                                               |
| `engine/` (+ `scope/`)                                                | The pure **ObligationEvaluator** + primitives (prune, identifiers, mandates, reasons); named scope-rule registry                                   |
| `flow-eval/` (+ `navigation/`)                                        | The pure **JourneyEvaluator** — slot expansion, container/journey status, page-finding — over the Flow tree                                        |
| `orchestrator/` (+ `apply-answers/`)                                  | The **only** side-effecting layer: canonicalise → write → fixed-point → save (the "risk-7 invariant" in one place)                                 |
| `contract/` (+ `cya-rows/`)                                           | The **seam**: a 21-export barrel that routes plumb over (status/evaluate, view-models, navigation URLs, mutations, submit, guards, raw model JSON) |
| `routes/` (+ `claims/`, `endings/`)                                   | Thin Hapi handlers; a generic model-driven question page, a guard pre-handler, the indexed-collection loop, and the four terminal surfaces         |
| `journey/`                                                            | The shell + isolation seam: per-request journeyId cookie, load-or-create, hub view-model, paths                                                    |
| `store/`                                                              | The persistence seam — one in-memory Map, deep-copy both ways, frozen once submitted (explicitly non-precedential)                                 |
| `validation/` · `lib/fields/` · `lib/quote/` · `i18n/` · `templates/` | Save gate; slot→govuk field mapping; premium formula + quote ref; single copy-resolution point; Nunjucks views                                     |
| `tests/`                                                              | Five browserless invariant tiers + fixtures/helpers                                                                                                |

### Request data flow

**GET a page** — `currentJourney` (load/create from store) → `evaluate(journey)` (compose both evaluators
into one frozen object) → `pageViewModel` (expand slots → govuk fields) → render.

**POST a page** — `currentJourney` → `evaluate` → `checkSave` (re-scope over payload-merged candidate; if
not ok, re-render with GDS errors, **no write**) → `applyAnswers` (orchestrator: pure write →
`runToFixedPoint` → `repository.save`) → redirect to `nextAfter` (or back to CYA when `?change=1`). A guard
pre-handler enforces the post-submit freeze and deep-link redirects; a submitted journey also throws at the
store.

### The five invariant test tiers (`tests/`)

| Tier               | Proves                                                                                                                            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `reachability`     | Static walk: every obligation is presented, every Flow reference resolves, conditions stay in the closed registry                 |
| `alignment-walker` | Model ↔ template line up both directions via the real render; hard-mandate + a11y error wiring                                    |
| `completability`   | Bounded enumeration (162 states): every state can be driven to Fulfilled — no dead ends, no unsatisfiable mandate                 |
| `flow-equivalence` | Same scripts land the same evaluator end-state against `flow.json` **and** `skeleton-flow.json` (proves Flow-independence)        |
| `rename-survival`  | The dual-identifier proof: a cosmetic rename never touches persisted fulfilments; deletes prune idempotently; collisions rejected |

---

## 7. Where to go for what

| I want to…                                     | Go to                                                                                                       |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Run it / see the paradigm move                 | `README.md` "Run it"; `dump.js` for a headless model dump                                                   |
| Understand the shape and _why_ this design won | `DESIGN-DECISION.md` §1, §2 (module map), §7 (plain-English framing)                                        |
| Find where a specific behaviour lives          | `PLAN.md` §(c) per-file tables, or `coverage-matrix.json` by obligation id                                  |
| Change the model (add a field/page)            | `EXTENDING.md` — then let the pinned tests walk you to the rest                                             |
| Know what is verified, and how strongly        | `tests/README.md` (note the honest "structural, not proof" limits)                                          |
| See open decisions / next work                 | `README.md` "open for a human ruling"; `SIMPLIFICATION-PLAN.md` needs-human-ruling list; the `EVAL-35` TODO |
| Trace a spec claim to code                     | `coverage-matrix.json` (id → files → test) + `obligations-catalogue.json` (the claim itself)                |

---

## 8. Known open questions & caveats (read before judging completeness)

- **`EVAL-35` — the fixed-point loop realises an _unreviewed sketch_.** `orchestrator/fixed-point.js`
  carries a test-pinned `TODO review with Sam` tag; the implementation is meant as _input_ to that review,
  not a settled answer.
- **Provisional Container-schema picks** and the **non-precedential datastore** — the README's
  "open for a human ruling" register (controllingValue, deselect→reselect rehydration, the post-POST
  forward rule, datastore choice, EVAL-35) lists what a human still needs to decide.
- **The simplification pass found 0 auto-safe changes** — in a paradigm-demonstration spike, "unused"
  exports, thin barrels and one-caller factories are frequently the demonstration itself. See
  `SIMPLIFICATION-PLAN.md` for the 6 rulings that would unlock the 38 candidates.
- **`engine/evaluate.js` is intentionally ~159 lines** (an accepted design graft), the one product file
  over the ~150-line folder-module budget.
