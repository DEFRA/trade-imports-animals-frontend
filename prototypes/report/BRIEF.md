# BRIEF — which obligations model to build on

## The call
**Build on B's model. Port A's gate vocabulary into it. Take A's persistence and parity harness.**
Base = B's evaluator + `domain/` registry + `flow/presents` tree + i18n layer. Rewrite B's gate
authoring so every gate is data-or-metadata (one non-negotiable rule below). Bin B's frozen ancestor
tree and A's page-owned presentation layer. Do **not** invert this — building on A means re-authoring
every gate as data (a DSL B already built and killed) and hand-writing all presentation forever.

## Why (the evidence that decides it)
- **B→A is a principle; A→B is a rewrite.** Porting A's model into B means re-authoring 36 closures
  and rewriting the storage contract. Porting B's model into A is additive almost everywhere.
- **Dimension tally: 8 B-better / 8 mixed / 0 A-better.** B wins on the *quality of the model* every
  time breadth is stripped out. A wins **no dimension**.
- **A's greater completeness is not quality** — a build loop was pointed at A (2 mappers, Mongo parity,
  upload, amend, 33 E2E). B is a 33k-line model spike. All of that is disqualified here.
- **A wins exactly one structural property: static analysability.** Its gates are a closed 4-operator
  data vocabulary, so it can invert a gate and prove reachability (`analysis/reachability.js`, 215 LOC,
  run as a test). B cannot — ~47% of its gates are closures that withhold their predicate. **This is
  recoverable for ~30 LOC.**
- The two are duals: B's closure expressiveness is exactly what destroys B's introspectability. The
  third option keeps closures **and** forces every gate to declare its dependency as data.

## Keep from B
- `obligations/evaluator.js` — the pure `evaluate(fulfilments)→{fulfilments,obligations}` core.
- `domain/index.js` — value-domain registry (codes+labels, one declaration) + `addressBlock` composite.
- `flow/flow.js` `presents`/`presentsForEach` tree; `lib/build-field-descriptors.js`+`field-widgets.js` (derived widgets).
- `lib/i18n.js` + `locales/en.json` + `i18n-coverage.test.js` (build-time copy gate).
- `coverage.test.js` / `whitelists.test.js` three-way anti-rot gates; `containerStatus`; `requires.anyOf` group invariant.

## Keep from A
- Both notification mappers + the **two model-agnostic parity harnesses** (`skeleton-equivalence.test.js` is an executable oracle).
- `activatedBy` closed 4-operator data vocabulary + `analysis/reachability.js` prover.
- The no-per-key-delete records port; `destroyWiped` write-path wipe (persist it); `notInUnionOf`-by-reference.
- Boot-time obligation→page totality assert (`flow/dispatch.js:55-63`); `requiredAtLeastOne` floor; `enforcedAt`→prerequisite derivation.
- cdp-uploader upload + paginated address picker, as codified **escape-hatch page patterns** (code, not model).

## Bin
- B's `prototypes/model-spikes/obligations-v4-model/` (7,087 LOC, byte-identical duplicate evaluator) — keep only `GAPS.md`.
- A's page-owned presentation: 32 `.njk` / 1,499 LOC + 1,278 LOC collection controllers + the 495-LOC CYA controller.
- A's hand-maintained 3-spine task list (flow + task-rows + GROUPS); A's Joi-in-controller validation.
- Any JSON/JSONLogic gate DSL proposal — B built it, shipped it, killed it with evidence (`GAPS.md:62-86`).

## What B has no answer for (don't discover this in sprint 3)
- **No persistence, no submit, no journey identity** (`grep journeyId` → 0). Save-and-return, amend, freeze all need a new *layer*.
- **File/upload value kind** — the single hardest retrofit item; a change to B's evaluator contract, not a widget.
- **The byte-exact wire contract** to the legacy skeleton (V4 display labels) — B has no persistence, so no answer at all.
- **Purge is never written to storage** (`state.js:42-44`) — out-of-scope answers resurrect; fix before any real store.
- **No minimum-instance floor** — zero commodity lines classifies `fulfilled` + ready-to-submit CYA (live defect).

## Migration order (each step banks value on its own)
1. **Fix B's live bugs** (S, ~2 days): persist the purge **and reorder `applyTo` post-purge** — write-back alone leaves stale answers driving cross-level gates (`evaluator.js:60-84,:288`), so the purge fix is two-part; add the `requiredAtLeastOne` floor (~8 LOC); fix the `evaluator.js:469-472` deref so 19 closures become data.
2. **Mandatory `dependsOn` metadata on every gate + coverage assertion** (S, ~2 days). ★ Highest value-per-line. Recovers A's static dependency graph without giving up closures.
3. **Port A's reachability prover** over the now-data gates (M, ~1wk). Buys the reachability proof B structurally lacks.
4. **Port A's records port + boot totality assert + `notInUnionOf`** (M, ~1wk). Closes B's silent-invisibility seam; gives a no-hand-rolled-delete storage contract.
5. **Add per-record conditional mandate** (`buildImplication` return contract) (M–L, ~1–2wk). The one genuine B evaluator change; unlocks per-line rules the V4 set is made of.
6. **Build the persistence + submit + parity layer**, reusing A's mappers and both harnesses against a UUID→path table declared once on the obligation (L, ~3–4wk).
7. **Codify upload + address-picker as escape-hatch pages**; add axe + a `javaScriptEnabled:false` Playwright project (M, ~1wk).

## The bill
Steps 1–4 (~2–3 weeks) leave you with B's model, its bugs fixed, and A's analysability recovered — a
defensible base you can stop at. Full parity with A's shipped surface is **~8–10 weeks**. Biggest
risk: **step 5** — per-record conditional mandate is the one change that touches the evaluator's core
return contract; get it wrong and you corrupt status, CYA and submit together.

**Unknowns that could change this:** (1) whether B's widget rule-table survives the *hard* pages
(upload, address-picker, tables) — proven only on the easy half; build one hard page in B to settle.
(2) whether a later requirement ruling reintroduces retain-value-while-optional at scale — it would
harden B's mandate win and is currently ruled *out* (`regionOfOriginCode` → wipe, c-017).
