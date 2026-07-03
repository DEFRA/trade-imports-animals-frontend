# Phase 1 — Investigation findings (v1 → v2)

> **Addendum (validation rework).** A later review steer removed the obligation `type`
> taxonomy and all constraint metadata (`pattern`/`min`/`max`/`maxLength`/`options`/
> `saveBlocking`) after a usage trace confirmed **no runtime code read them** — every
> widget and value-domain was already re-declared in the per-page templates/controllers,
> so the def copies were dead. Validation is now a **controller** concern backed by a
> reusable Joi lib (`lib/validate/`), loosely coupled to obligations rather than owned by
> them. See `DESIGN.md` §9. This sharpened, rather than contradicted, the finding below
> that "mandates become ordinary per-controller validation".

Grounding note for the v2 design. Everything here is read from the v1 spike
(`../obligations-standalone-spike/`, **read-only**), the source spec
(`../../model-spikes/obligations.md`) and the three shared Playwright specs
(`../../e2e/`). The v1 spike is treated as reference only; nothing in it was edited.

## 1. How v1 is structured

The journey (a car-insurance quote task-list) is **committed declarative data**
plus two pure evaluators plus one side-effecting orchestrator, rendered through
**one generic template**:

| Layer                 | v1 location              | What it does                                                                                                                                                                                                                                                                                               |
| --------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Obligations catalogue | `model/obligations.json` | 30 records keyed on **UUID `id`**, bound in code by **`name`**. Pure data: type, cardinality, `indexedBy {source, mutability, controllingObligation, controllingValue}`, constraints, option value-domains. **No copy, no scope, no page membership, no mandate.**                                         |
| Flow                  | `model/flow.json`        | A recursive Container tree (Group/Page) referencing obligations by UUID. **Owns ALL journey copy** — headings, labels, hints, option labels, button text, CYA keys, quote copy, confirmation copy. Carries `presents[]` / `presentsForEach[]`, `appliesWhen` gate names, `sectionEntryMode`, `revealedBy`. |
| ObligationEvaluator   | `engine/`                | Pure, id-keyed. Scope via **named predicate functions** in `engine/scope/`, most-restrictive mandate composition, dotted reason codes, per-fulfilment states, reconcile-on-load prune.                                                                                                                     |
| JourneyEvaluator      | `flow-eval/`             | Pure. Four-status roll-up (Not Applicable / Not Started / In Progress / Fulfilled), slot expansion (`presents`→govuk fields), navigation primitives, journey state. Consumes the ObligationEvaluator output.                                                                                               |
| Orchestrator          | `orchestrator/`          | The **only** side-effecting layer: canonicalise write → mint stable indexed ids → **scope-exit wipe** (Yes-No-Yes) + reconcile derived → run the in-process quote system-handler → re-evaluate **to a fixed point** → save.                                                                                |
| Contract barrel       | `contract/`              | 21-export seam routes plumb over (evaluate/status/view/navigation/mutation/submit/guards/modelJson).                                                                                                                                                                                                       |
| Routes                | `routes/`                | `page.js` = **one generic GET/POST** for every `template:"page"` Page; `claims/` bespoke; `endings/` (quote/CYA/submit/confirmation); `guard.js`.                                                                                                                                                          |
| Templates             | `templates/`             | `page.njk` (generic) + `partials/fields.njk` (type→govuk widget dispatch) + bespoke `claims-*`, `quote-summary`, `check-your-answers`, `confirmation`, `hub`, `start`, `layout`.                                                                                                                           |
| Shell / store         | `journey/`, `store/`     | Cookie-carried journeyId (no `{id}` URL segment), load-or-create, in-memory Map, deep-copy both ways, frozen after submit.                                                                                                                                                                                 |

**Request flow.** GET: `currentJourney` → `evaluate` → `pageViewModel` (slot→widget) → render `page.njk`. POST: `currentJourney` → `evaluate` → `checkSave` (payload-merged re-scope; on fail re-render with GDS errors, no write) → `applyAnswers` (orchestrator write→fixed-point→save) → redirect to `nextAfter` (or CYA when `?change=1`).

## 2. Which v1 ideas earned their place

Judged against the criterion "does it still pay once pages are hand-built?":

| v1 idea                                                                                                                                          | Verdict for v2                                                      | Reason                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Scope-exit data wipe (Yes-No-Yes: destroyed not hidden)**                                                                                      | **KEEP**                                                            | Directly asserted by `invalidation.spec.js` (claim data must not rehydrate). Independent of how pages render. This is the paradigm's sharpest, page-agnostic mechanism.                                                                                       |
| **Obligation relationships / activation** (a controlling answer brings others into scope; derived-indexed spawn/drop)                            | **KEEP (lighter)**                                                  | This _is_ the concept the design verdict wants to retain — "what activates what" as a clean state layer. Drives the addons fan-out + claims.                                                                                                                  |
| **Pure-evaluator / side-effecting-orchestrator split**                                                                                           | **KEEP**                                                            | Recompute-derived-state-on-load (nothing derived stored) is sound regardless of rendering. Keeps state reasoning testable.                                                                                                                                    |
| **Reconcile-on-load pruning**                                                                                                                    | **KEEP (trivially)**                                                | Cheap; keeps stored fulfilments honest across model edits. Folds into the evaluator.                                                                                                                                                                          |
| **Four-status roll-up** (NA/Not started/In progress/Fulfilled)                                                                                   | **KEEP**                                                            | The hub task-list + CYA gating need exactly this. Page-agnostic.                                                                                                                                                                                              |
| **Dual identifier (stable id vs meaningful name)**                                                                                               | **DROP the UUID ceremony; keep the _principle_ only where it pays** | The prompt asks for plain-JS definitions "no UUID ceremony". With a single hand-authored model and no live persistence/migration, opaque UUIDs are pure overhead. The `name` becomes the key. (Rename-survival was a v1 proof for a problem v2 doesn't have.) |
| **Model owns all copy (flow.json)**                                                                                                              | **DROP**                                                            | The key inversion. Copy/layout/widgets move into per-page templates+controllers.                                                                                                                                                                              |
| **Generic renderer** (`page.njk` + `pageViewModel` + `lib/fields` + `partials/fields.njk`)                                                       | **DROP**                                                            | The overhead the whole exercise is removing.                                                                                                                                                                                                                  |
| **21-export contract barrel**                                                                                                                    | **DROP / shrink**                                                   | Existed to feed the generic routes. Per-page controllers import the small state API directly.                                                                                                                                                                 |
| **Named scope-predicate registry, i18n dotted reason codes, mandate composition table, cross-Flow equivalence harness, interrogation endpoints** | **DROP**                                                            | Machinery that served the generic engine / paradigm-demonstration goal, not per-page journeys. Mandates become ordinary per-controller validation.                                                                                                            |

## 3. Where the fully-generic rendering hurt — the bespoke-bypass evidence

v1's own README/DESIGN-DECISION concede the generic renderer could not stay generic. Every page that needed something custom **dropped out of config into a hand-written template + handler**, each tagged "bespoke bypass (graft 9)":

- **`routes/claims/` + `claims-list.njk` + `claims-add.njk`** — the indexed/repeating case. The generic `pageViewModel` expands "one slot per existing fulfilment", so it **cannot render an add form** (a new claim has no fulfilment id yet). `view-models.js:addFields()` hand-builds the two govuk widgets; `handlers.js` hand-wires add/remove/continue and `markCollectionReviewed`. The model has "no list-management vocabulary (TOOL-14)". This is the clearest proof: the moment a page is a loop, the generic engine is bypassed entirely.
- **`contract/cya-rows/page-rows.js`** — three `BESPOKE_ROWS` builders (`vehicleRows` composing make/model/year into one "Vehicle" row; `claimsRows` per-fulfilment "Claim N"; `addonRows` Added/Incomplete per selected add-on). The generic "one row per presents entry with a cyaKey" could not express any of them.
- **`quote-summary.njk` + `routes/endings/quote-summary.js`** — bespoke read-only presentation of the system-handled premium; prices a half-empty journey by an empty-payload orchestrator pass.
- **`journey/hub-view.js`** — per-section visibility (always-inert "Get your quote", addon rows appearing on selection) that the generic task-list roll-up could not produce; a documented deviation from doc-default NA-hiding.

**Reading of the evidence:** on this journey the bespoke pages are the _interesting_ ones (claims loop, CYA composition, quote, hub), and the generic pages are the trivial stacks of standard widgets. That inverts v1's maintainability pitch — the config engine paid off only on the boring pages and was routed around on every page that mattered. v2 makes per-page control the norm and keeps only the state layer that the bespoke pages were _already_ leaning on (scope-exit wipe, activation, status roll-up).

## 4. The acceptance ground truth (unchanged for v2)

Three data-driven specs in `../../e2e/` iterate over `JOURNEYS` in `journey.js`.
v2 is wired in **exactly as v1 is**: add one `JOURNEYS` entry
(`obligations-v2-spike`, grouped path
`/prototype-standalone/obligations-v2-spike/task-list-with-linear-tasks`) and
register the plugin in `standalone/index.js`. Then the same three specs walk v2:

- **`task-list-with-linear-tasks.spec.js`** — full journey start→confirmation, with claims + both addons. Pins exact headings, task-link names, button names.
- **`mandatory-fields.spec.js`** — About you blocks Save when Full name blank (GDS error summary + `#fullName-error` + `a[href="#fullName"]`); progresses with only Full name (preferredName etc. optional).
- **`invalidation.spec.js`** — "Change recent claims" → No drops the "Claim 1" rows and shows "Recent claims: No"; Yes→No→Yes does **not** rehydrate the old claim.

**Exact-DOM traps to reproduce** (from `journey.js` + the specs): one visible "Yes" label on Choose your cover (conditional reveal), `exact:true` radios "Yes"/"No" on Driving history, buttons `/Add a claim|Add another claim/` vs `Add claim`, `Save and continue` vs `Continue`, task links by role/name, `Change recent claims` visually-hidden composition, `Claim 1` summary key, `Accept and continue` (quote) then `Accept and get quote` (CYA) → `Quote confirmed` panel.

Copy/labels/headings for every page are pinned in `journey.js` and the v1 flow.json — v2 controllers/templates author them directly (that is the inversion).

## 5. Design implications carried into Phase 2

1. **Model = plain-JS obligation definitions, keyed by `name`, no UUIDs, no copy.** Carries type/cardinality, constraints, and **relationships** (activation/dependency/wipe) as data-like references between obligations.
2. **A light flow** for navigation + status roll-up + gating only (ordered sections→pages, `appliesWhen` as references to obligation state) — **no copy**.
3. **Per-page controller + template**, one folder per page, owning GET/POST, validation, view-model, copy, layout. Explicit and greppable.
4. **The dispatch seam:** obligation state → "owed, and page P handles it"; a page→obligations binding (page declares what it collects). Keep the seam crisp and one-directional.
5. **Keep:** scope-exit wipe, activation/derived reconcile, pure-eval/orchestrator split, status roll-up, recompute-on-load. **Drop:** UUIDs, model-owned copy, generic renderer, contract barrel, i18n codes, mandate table, equivalence harness.
   </content>

---

# Entry 6 — stress-testing the model with nested, conditional, indexed collections

The verdict trail for DISCUSSION-LOG entry 6 (are indexed obligations first-class?).
Each phase (6a/6b/6c) escalates and ends with a written go/no-go on whether the
paradigm survives real recursive, conditional, indexed requirements. Method: a
design-panel workflow (3 architects → 3 diverse-lens judges) chose each load-bearing
representation, then an adversarial-verify workflow (skeptics + completeness critic)
stress-tested the code before the verdict landed — the same provenance discipline that
chose the paradigm (`DESIGN-PROVENANCE.md`).

## 6a — Verdict: single-level indexing made first-class (claims canary)

**Did the model hold? YES.** Indexed obligations are no longer a special case the
engine tolerates; they are a modelled concept the engine sees. A collection def now
carries `collection: true` + a real nested `item: [...defs]` (`features/claims/obligations.js`),
so sub-obligations (`claimType`, `claimAmount`) are first-class defs with their own
mandate facts. The engine gained a path vocabulary (`lib/path.js`) and walks the tree
MATERIALISED against the answers (`registry.walk`), so `reconcile` produces per-instance
scope (`claims[0].claimType`) and per-instance wipe, `status` computes per-item
completeness (a claim with a blank required field no longer counts the section done),
and dispatch coverage descends every depth. The existing `claims` collection was
re-expressed on this mechanism with **zero rendered-DOM change**: the three shared
Playwright specs and `contract.test.js` stayed green **untouched**, plus 80 unit tests
(13 new engine tests for path scope / per-item wipe / per-item completeness, 4 more
pinning the adversarial fixes). The panel chose the **recursive-tree** representation
unanimously across all three lenses precisely because the model IS a tree — walk/walkDefs
are literal tree-walks — so Phase 2 nesting is projected to add new defs, not new engine.

**Where did it strain? Three honest concessions, none a breakage.**

1. **Ownership at depth is DERIVED, not declared per field — and the regression net
   forced it.** The zero-touch contract pins `claimsList.meta.collects === ['claims']`,
   so a sub-obligation's owning page could not be declared per field without editing
   `contract.test.js`. Coverage therefore DERIVES a sub-obligation's page from its
   nearest collection ancestor (`flow/dispatch.js`). Coverage stays total and
   boot-asserted (an uncovered top-level or nested collection still crashes boot, with
   teeth — verified), but strictness about _authorial intent_ at depth is traded away: a
   new sub-field silently inherits its collection's page rather than forcing a decision.
   Notable that the safety net itself shaped the ownership model.

2. **The model now carries TWO identity vocabularies.** A dot-form TEMPLATE address
   (`claims.claimType`, for dispatch/coverage, from `walkDefs`) and a bracketed INSTANCE
   pathKey (`claims[0].claimType`, for scope/wipe, from `reconcile`/`pathKey`). They must
   be bridged — `pageOfObligation` now normalises instance→template before resolving. The
   panel's unanimous kill-objection was that keeping sub-defs out of `registry.all` to
   protect the contract iterator re-creates "the engine is blind to sub-fields" one level
   down; that was answered by making `walkDefs`/`byPath` the FULL catalogue (nothing is
   blind) while `registry.all` stays the roots VIEW the contract test walks. A single
   unified path-addressed lookup would be cleaner; the split is a documented tax kept to
   leave the regression net structurally untouched.

3. **The reusable loop is near-vestigial at ONE flat level.** `collectionView` (the
   facts-only loop library) barely removes bespoke code today; its justification is
   forward-looking to Phase 2's loop-inside-a-loop. Honest, and flagged by the panel.

**Is the no-generic-engine / library-not-framework line intact? YES at this level — but
Phase 2 is the real trial.** `collectionView(answers, collectionPath)` returns pure
structural facts — `{ index, path, entry, complete }` — and nothing presentational: no
hrefs, no labels, no copy, no row view-models, no template, no routes, no Joi. The
claims list/entry/CYA controllers compose ALL presentation themselves; CYA's per-item
change link now routes through the dispatch seam (`pageOfObligation('claims')`) instead
of a hardcoded slug, still byte-identical. The store facade stayed narrow — a page still
physically cannot hand-roll a wipe. The line held because a single flat loop does not yet
pressure the helper to render; the loop-inside-a-loop in 6b is where that pressure peaks.

**Adversarial pass — 3 real defects found, all latent in 6a, all fixed now.** Skeptics
broke: (a) `commit`'s wipe ordering (sibling array-index splices renumber each other —
unreachable at one level because only the `claims` root is `wipeOnExit`, but live in 6c's
item-scoped wipes) — fixed with a sibling-aware comparator + regression test, and the
docstring that overclaimed depth-correctness was corrected; (b) `pageOfObligation`
returning `undefined` for the engine's own bracketed instance addresses (live in 6b/6c
per-item change links) — fixed by normalising instance→template + a round-trip test;
(c) a model→engine layering import (`registry.js` reaching into `engine/path.js`) — fixed
by relocating the pure path helpers to the neutral `lib/` leaf. Two lanes (per-item
completeness; DOM parity + library line) survived the skeptics unbroken.

**Go/no-go: GO.** The paradigm survives single-level first-class indexing cleanly. The two
structural tensions (derived ownership; dual identity vocabulary) are documented
concessions the canary constraint dictated, not model breakages. Carried into 6b: whether
`entryComplete` must recurse into a nested `requiredAtLeastOne` collection (it does not
yet — invisible at one level), and whether the loop library survives the loop-inside-a-loop
without rendering.
