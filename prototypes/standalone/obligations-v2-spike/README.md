# obligations-v2-spike — page-owned spine

> **GATED THROWAWAY PROTOTYPE.** A v2 of the obligations paradigm for the
> car-insurance task-list journey. Where v1 (`../obligations-standalone-spike/`,
> read-only) made a config engine the spine — one generic template rendering all
> pages from JSON — **v2 makes the pages the spine** and keeps only a thin,
> declarative obligation model underneath. It is organised as **feature (vertical-slice)
> folders** (`features/<feature>/`) over a central engine + flow + registry barrel.
> Built to the same acceptance gate as v1: the three shared Playwright specs.

## Read in this order

1. **[`FINDINGS.md`](FINDINGS.md)** — Phase 1: what v1 is, which of its ideas earned
   their place, and where the fully-generic renderer hurt (the bespoke-bypass evidence).
2. **[`DESIGN.md`](DESIGN.md)** — Phase 2: the v2 paradigm, module map, obligation-model
   shape, the dispatch seam, worked pages (plain + the claims loop), trade-off ledger,
   KEEP/DROP.
3. **[`DESIGN-PROVENANCE.md`](DESIGN-PROVENANCE.md)** — how the architecture was chosen
   (3-architect / 3-judge panel; page-owned spine won all three lenses) and the grafts folded in.

## The paradigm in three sentences

1. **Features are the spine.** Every feature is a **vertical slice** (`features/<feature>/`):
   an ordinary Hapi GET/POST pair with its own bespoke `.njk` template, owning its copy,
   validation and view-model — **and a pure `obligations.js` holding the obligation defs
   that feature owns.** "Read the feature you're changing" now covers the model too.
2. **A central engine over an assembling model barrel.** Each feature's `obligations.js`
   holds plain-JS data — identity, structural facts (`cardinality`, `system`, `renderOnly`),
   mandate facts (`required`) and activation/wipe **relationships** as inert literals over
   real JS references (which cross feature boundaries — a shared DAG). A top-level
   `registry.js` **barrel** assembles them into the `all`/`byId`/`refs` catalogue. The
   central `engine/` (`reconcile`, `status`, `store`, `journey`, `predicate`, `util`)
   operates over _all_ obligations at once: one pure `reconcile` (scope + Yes-No-Yes wipe,
   to a fixpoint) and one pure `rollUp` (four-status). The model carries **no `type`** and
   **no validation**, and it **never renders and never owns copy**. **Validation lives in
   the controllers**, drawn from a reusable, context-agnostic Joi library (`lib/validate/`).
3. **The seam is one-directional and derived.** Features declare the obligations they
   `collects`; at boot those are inverted into `flow/dispatch.js` (obligation → page,
   coverage-asserted). Controllers write answers **down** (`state.commit`); the store
   derives scope/wipe/status and hands them **up**. Nothing else crosses. Two boot guards
   keep it honest: a **per-file model-purity** assertion (`obligation-purity.js` — every
   feature `obligations.js` imports only another feature's `obligations.js`) and the
   **dispatch coverage** assertion.

## Run it

```bash
# unit — scope/wipe/dispatch/navigation/readiness (also loads the whole graph + boot assertion)
npm run test:obligations-v2-spike

# acceptance — the three shared specs against this journey
npm run test:prototype -- -g "page-owned spine"

# the app (mounts at /prototype-standalone/obligations-v2-spike/task-list-with-linear-tasks)
npm run prototype

# headless state dump for a fixture (no server, no rendering)
node prototypes/standalone/obligations-v2-spike/dump.js
```

## What survives from v1 (and what does not)

**Kept** — scope-exit data wipe (destroyed, not hidden), obligation activation/
relationships, the pure-evaluator / side-effecting split (collapsed to `reconcile` +
`store.commit`), reconcile-on-load, the four-status roll-up, the stable-id principle.
**Dropped** — UUID ceremony, model-owned copy, the generic `page.njk` + type→widget
engine, the contract barrel, i18n reason codes, the mandate-composition table, the
equivalence harness, and obligations knowing about pages (inverted to page-side `collects`).

## Where things live

| Concern                                          | Home                                                                      |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| Feature slice (controller + template + defs)     | `features/<feature>/` (`controller.js`, `template.njk`, `obligations.js`) |
| Obligation defs a feature owns (pure)            | `features/<feature>/obligations.js` (imports only sideways)               |
| Assembling model barrel (`all`/`byId`/`refs`)    | `registry.js` (top-level — imports every feature's defs)                  |
| Full tree catalogue (every depth) + per-instance | `registry.js` (`walkDefs` / `walk` / `byPath` — indexed obligations)      |
| Path address vocabulary (indexed collections)    | `lib/path.js` (`pathKey`/`valueAt`/`deleteAt` — pure leaf)                |
| Reusable loop LIBRARY (facts, never renders)     | `engine/index.js` (`collectionView` — `{ index, path, entry, complete }`) |
| Per-file model-purity guard (boot)               | `obligation-purity.js`                                                    |
| Scope + scope-exit wipe (path-addressed)         | `engine/reconcile.js` (pure)                                              |
| Four-status roll-up + quote-readiness            | `engine/status.js` (pure)                                                 |
| The one-directional facade controllers call      | `engine/index.js` (`get`/`commit`/`appendEntry`/…)                        |
| In-memory store + journey cookie                 | `engine/store.js` + `engine/journey.js`                                   |
| Flow ordering + gating (no copy)                 | `flow/flow.js` + `flow/navigation.js`                                     |
| Dispatch seam (obligation → page, boot-asserted) | `flow/dispatch.js`                                                        |
| Shared per-page library (not a framework)        | `shared/kit.js` (+ `layout.njk`, `error-summary.njk`)                     |
| Reusable Joi validators (context-agnostic)       | `lib/validate/` (`requiredText`/`postcode`/`currency`/…)                  |
| Premium calculator (pure domain, not state)      | `lib/quote.js`                                                            |
| Controller↔model commit contract (safety net)    | `contract.test.js`                                                        |
| Model-level journey simulator + dead-end prover  | `analysis/` (`simulateJourney`, `proveReachability`)                      |
