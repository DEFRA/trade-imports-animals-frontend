# Decision matrix — A ("live-animals", Sam) vs B ("flow-layer", Paul)

Companion grid to `REPORT.md`. A = `clone-live-animals` `prototypes/standalone/live-animals/`.
B = `clone-flow-layer` `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`. All verdicts
adversarially verified. **Score the model, never the breadth** — A's persistence/upload/amend/E2E
surface is a build-loop artefact and is disqualified in every dimension where it appears.

## Dimension verdicts (8 B-better / 8 mixed / 0 A-better)

| # | Dimension | Verdict | Decided by | Retrofit direction |
|---|---|---|---|---|
| 1 | Obligation vocabulary | mixed | A gates=data (analysable) vs B gates=code (expressive) — duals | both add one, neither superset |
| 2 | Evaluation engine | B-better (narrow) | B better semantics + 228 tests; A wins static analysability only | B→A additive + guard the prover |
| 3 | Conditionality & gating | mixed | A wins condition-language + wipe; B wins consequence-language + reveal-discipline | A's conditions + B's consequences |
| 4 | Mandate model | mixed | A wins COMPLETION (per-path); B wins PROCEED (`isSufficientForProceed`) | A completion + B proceed layer |
| 5 | Collections & cardinality | B-better | B identity/status/invariants/page-fan; A→B ~80 LOC, B→A a rewrite | B spine + A cardinality vocab |
| 6 | Validation & errors | B-better (narrow) | B rules=data+addressable; A's bill a rewrite, B's a principle | B registry + A escape-hatch hook |
| 7 | Flow & navigation | mixed | B's walk is a strict *specialisation* of A's; B's tree beats A's 4 orderings | B's declaration under A's walk |
| 8 | Status & task-list | B-better | B one-spine + mandate axis; A wins floor + cannot-start-yet (both additive into B) | B model + A's 2 additive wins |
| 9 | Presentation & widgets | B-better (model) | A derives 0 widgets; A reinvented `addressBlock` worse in one corner | B derivation + value-domain slot |
| 10 | i18n & copy | B-better (decisive) | B has the code↔label *seam*; A destroyed it by axiom | B registry (A is ~1,145-site retrofit) |
| 11 | Persistence & mapping | mixed | neither binds a backend path (0/44 both); A ahead more often on the models | take neither mapper; declare path once |
| 12 | Session & state | mixed | B wins state shape; A wins write-path + actually-persists-the-wipe | B flat keys + A's no-delete port |
| 13 | Testing strategy | mixed | B *model* more testable; A *suite* guards the shared seam better | B's testability + A's totality assert |
| 14 | Docs & extensibility | B-better | B declarative-surface amortises; A per-field tax never does | B derivation + A `activatedBy` vocab |
| 15 | a11y / no-JS / PE | B-better (model) | a11y derived in B, template-only in A; A's no-JS artefacts are code | B model + A picker/upload as escape-hatch |
| 16 | Code shape | B-better | B zero `@hapi`, injected evaluator; A threads `(request,h)` through 10/13 | B decoupling + mandatory `dependsOn` |

## Structural asymmetry grid — capability one side cannot express without a model-shape change

`structural=Y` survived adversarial verification as a genuine model-shape wall. `structural=N` =
merely **unbuilt** (retrofits without a model change) — do **not** score these as wins.

| Capability | Winner | Struct? | Why the loser cannot / has not | Cost to close |
|---|---|---|---|---|
| Statically-invertible gates + reachability prover | **A** | **Y** | B's gates are JS closures; inverting them is undecidable; B withholds the predicate from its own metadata | B re-adopts a data vocab, or mandatory `dependsOn` metadata (~30 LOC recovers most) |
| Per-collection-entry conditional mandate (`enclosing`/`anyItem`) | **A** | **Y** | B stamps the static `obligation.status` on every group record; `applyTo` status discarded (`evaluator.js:477/490/505`) | widen `buildImplication` 3 branches + helper lib + 5-6 readers |
| Durable, first-class empty collection instance | **A** | Y-ish | B infers existence from descendant keys; empty instance is a purge-annihilable seed | **additive ~10-15 LOC** (durability structural, fix is not) |
| Collection-count arithmetic cap enforced at mutation | A | Y | B has no cardinality vocab *and* no mutation primitive | B adds both a verb and a write primitive |
| Cross-field / compound / arithmetic / quantified gate | **B** | **Y** | A's `applyPredicate` is a closed 4-op if-chain that throws on unknown; A's one numeric rule left the model | A extends grammar **+ a witness synth per op** or the prover goes vacuously green |
| Co-derived `{inScope,status}`: retain-value-while-optional | **B** | **Y** | A's `required` is static; its one lever fuses scope with `wipeOnExit` | A widens `reconcile` return + decouples wipe — new Decision axis |
| Retain-value-while-hidden (the dual) | B | Y | B's `purgeStorage` has no per-obligation opt-out | new opt-out key + branch (A can express it, never does) |
| Model value-domain (codes+labels, one declaration) | **B** | Y | A carries no type/options/copy by written decision (`decisions.md #6`); 0 LOC derivation layer | A adds a domain slot + descriptor layer + reverses the decision |
| Static export / stakeholder data-dictionary of gates | A | Y | only ~8/44 of B's gates serialise; branchedGate omits the predicate | B → data gates, or mandatory metadata (partial recovery) |
| Minimum-instance floor (`requiredAtLeastOne`) | A | **N** | B has no floor verb — **LIVE defect**: zero lines ⇒ `fulfilled` + ready-to-submit CYA | ~8 LOC into `groupInvariantErrors` |
| Two-level mandate w/ proceed-composition | B | **N** | A's `enforcedAt` is decorative on save-blocking (4 hand-coded sites) | A wires 1 reader over its existing key |
| "Cannot start yet" ≠ "Not applicable" | A | **N** | B collapses scope + prerequisite into one `inScope` boolean — **live mislabel** | ~30 LOC into B (new status + prereq derivation) |
| Scope-exit wipe applied to *storage* | A | **N** | B computes the purge then **discards it** (`state.js:42-44`) — **live bug** | 1 line write-back (**+ instance registry first**) |
| Same-page conditional reveal | A | **N** | B drops out-of-scope fields from HTML at GET; no client eval / self-POST | client bundle or self-POST (B prefers `branchedGate`) |
| File/document value + external scan status | A | **N** | B has no file widget/route — but purity-collision claim **REFUTED** | 1 domain entry + 1 rule + multipart route |
| CYA `?change=1` return round-trip | A | **N** | B's `urlForNext(opts.query)` stub is never called; doc claims behaviour code lacks | thread context through B's 3 factories |
| Whole-journey deep-link entry guard | A | **N** | B has no entry-guard module; `/start` + every `/pages/*` render directly (`routes.js:59-205`) | small in B — part scope (A's guard rides its import-type service routing) |
| Per-instance URL entry-guard (forged line/unit deep-link) | B | **N** | A's collection editing is flow-major, no per-instance URL surface; doesn't hard-guard at GET | A ~20 LOC via `makeScope().has(pathKey())` |
| Amend-after-submit re-gates a whole section | A | **N** | B has no submit/amend/lifecycle at all (GET-only CYA `routes.js:73-79`) — **build-state** | B lifecycle port/envelope (~200-300 LOC), not a model change |
| Cross-frame / nested conditionality | **both** | — | A: `frame:'enclosing'/'anyItem'` data; B: `allowListed`/`anyAllowListed` — **do not score as asymmetric** | n/a |
| Deep-link/Back into a gated **static** page | **neither** | — | A renders + POST-wipes; B renders empty shell, writes nothing — B guards per-instance but NOT static pages | 1 scope check per generic GET either side |
| Count-drop block (arithmetic + enforcement site) | **neither** | — | A lacks the operator; B lacks a mutation/submit site | third option needs **both** halves |

## Refuted claims — do NOT re-litigate (each was adversarially killed)

| Claim (FALSE) | Corrected position |
|---|---|
| A can't express `A=x AND B=y` — frame is a gate property (OV-4) | frame travels per-reference; `allOf`/`anyOf`/`not` = 3-line prepend |
| B's common shape is code because of a bug (OV-6) | empty `{id,name}` works + defaults mandatory; bug blocks only 1 optional scalar |
| B structurally cannot build A's prover (EE-3) | build+enforcement gap, not an expressive wall — every branchedGate pred is in A's 4 ops |
| A has conditional *mandate* & B has neither per-path nor retain (mandate C5) | A has conditional *scope* not mandate; B *has* cross-frame per-entry conditionality |
| A's rules liftable, B's not "ever" (VE-6) | inverted — 27/39 of B's gates are lossless data; B *loads* validation data, A's spec is dead |
| A's durable doc keyed by semantic id ⇒ can't re-key (PM-2) | A's durable store is the *backend notification*; its 507-LOC mapper IS the table |
| B can't model a file (evaluator purity) (PM-3) | B already has 2 system-populated non-user obligations; A doesn't model the file either |
| recompute-on-load is B's unique asset (PM-5) | A has it, pinned by `resume-self-heal.test.js` |
| A's ports make hand-rolled delete impossible (SS-3) | whole-map replace = delete-by-omission; pages already delete |
| Re-keying A is a live Mongo migration (SS-5) | durable store is the notification; 0 persisted bytes change |
| A's engine needs a hapi request (code-shape C1) | derefs `request` in 1 guarded place; B's `state.js` is *more* coupled |
| A's purity guard forbids presentational data (a11y C1) | it's a regex over import specifiers; permits `services/*`; A ships a live widget renderer |
| Off-gate safety matched-and-bettered by B (a11y C3) | B's purge never touches storage — off-gate values resurrect; A destroys them |
| Min-instance floor is an A-only **structural** capability (edge lens EC3) | AMENDED down — a **filed live defect**: floor lives in B's existing `requires` bag (`minInstances` key + ~3-LOC `records.length` branch), not a model-shape wall; do not re-elevate |

## The call (see `BRIEF.md`)

Base = **B's model** (evaluator + domain + flow/presents tree + i18n registry). Port A's
`activatedBy` data vocabulary into it under one rule — **every gate carries complete `dependsOn`
metadata, fail the build otherwise** (~30 LOC; recovers A's analysability without killing closures).
Take A's persistence + parity harness. **B→A is a principle; A→B is a rewrite** — that asymmetry is
the decision.
