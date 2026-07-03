# obligations-v2-spike — page-owned spine

> **GATED THROWAWAY PROTOTYPE.** A v2 of the obligations paradigm for the
> car-insurance task-list journey. Where v1 (`../obligations-standalone-spike/`,
> read-only) made a config engine the spine — one generic template rendering all
> pages from JSON — **v2 makes the pages the spine** and keeps only a thin,
> declarative obligation **state layer** underneath. Built to the same acceptance
> gate as v1: the three shared Playwright specs.

## Read in this order

1. **[`FINDINGS.md`](FINDINGS.md)** — Phase 1: what v1 is, which of its ideas earned
   their place, and where the fully-generic renderer hurt (the bespoke-bypass evidence).
2. **[`DESIGN.md`](DESIGN.md)** — Phase 2: the v2 paradigm, module map, obligation-model
   shape, the dispatch seam, worked pages (plain + the claims loop), trade-off ledger,
   KEEP/DROP.
3. **[`DESIGN-PROVENANCE.md`](DESIGN-PROVENANCE.md)** — how the architecture was chosen
   (3-architect / 3-judge panel; page-owned spine won all three lenses) and the grafts folded in.

## The paradigm in three sentences

1. **Pages are the spine.** Every page is an ordinary Hapi GET/POST pair with its own
   bespoke `.njk` template, owning its copy, validation and view-model (`pages/<page>/`).
2. **A thin declarative state layer** (`state/`) holds obligations as plain-JS data —
   type, cardinality, and activation/wipe **relationships** as inert literals over real
   JS references — plus one pure `reconcile` (scope + Yes-No-Yes wipe, to a fixpoint) and
   one pure `rollUp` (four-status). It **never renders and never owns copy**.
3. **The seam is one-directional and derived.** Pages declare the obligations they
   `collects`; at boot those are inverted into `flow/dispatch.js` (obligation → page,
   coverage-asserted). Pages write answers **down** (`state.commit`); the store derives
   scope/wipe/status and hands them **up**. Nothing else crosses.

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

| Concern                                          | Home                                                      |
| ------------------------------------------------ | --------------------------------------------------------- |
| Obligation defs (data only)                      | `state/obligations/registry.js` (imports only `types.js`) |
| Scope + scope-exit wipe                          | `state/reconcile.js` (pure)                               |
| Four-status roll-up + quote-readiness            | `state/status.js` (pure)                                  |
| The one-directional facade pages call            | `state/index.js` (`get`/`commit`/`appendEntry`/…)         |
| Flow ordering + gating (no copy)                 | `flow/flow.js` + `flow/navigation.js`                     |
| Dispatch seam (obligation → page, boot-asserted) | `flow/dispatch.js`                                        |
| Per-page controllers + templates                 | `pages/<page>/`                                           |
| Shared per-page library (not a framework)        | `pages/_shared/kit.js`                                    |
