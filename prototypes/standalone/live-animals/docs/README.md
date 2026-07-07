# Obligations v2 spike — documentation index

## What this spike is

The spike is a standalone car-insurance journey built to test one paradigm: pages act as the spine of the application, over a thin declarative obligation model and a central pure engine. Pages own copy, templates and validation; the model declares only what data is owed and when it is in scope; the engine derives scope, completeness and status from the answers on every read and write. It is a decision and quality artefact — it proves the paradigm works to nesting depth 2 (a claim inside a driver inside the journey), not a product.

## Quick start

Run everything from the frontend repo root (`trade-imports-animals-frontend`).

Run the prototype:

```
npm run prototype
```

Then open:

```
http://localhost:3000/prototype-standalone/live-animals/task-list-with-linear-tasks
```

Run the spike's unit suite:

```
npm run test:live-animals
```

Run the Playwright E2E suite (covers all prototypes, including this spike):

```
npm run test:prototype
```

Inspect the model without a server — print derived scope, wipes, section statuses and quote readiness for an editable fixture:

```
npm run dump:live-animals
```

## Where to start

New to the spike? Read in this order:

1. [architecture.md](architecture.md) — the layers and how they fit together
2. [obligation-model.md](obligation-model.md) — the declarative model the whole thing runs on
3. [engine.md](engine.md) — the pure state core that interprets the model

Then pick the topic you need from the table below.

## All docs

| File                                       | What it answers                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md)         | Three layers, one dependency direction — why the engine never imports flow, and how boot wires them together         |
| [obligation-model.md](obligation-model.md) | Obligations are pure data: what `required` really means, how `activatedBy` works, and why collections are real trees |
| [engine.md](engine.md)                     | The state barrel pages import: read scope up, write answers down — and why there is no `setScope` and no delete      |
| [scope-and-wipe.md](scope-and-wipe.md)     | Why answering No destroys data instead of hiding it (the Yes-No-Yes invariant), and how reconcile derives it         |
| [flow-and-gates.md](flow-and-gates.md)     | Derived gates: a page is reachable exactly when something it collects is in scope — and the one authored override    |
| [features.md](features.md)                 | Anatomy of a feature: pages own all copy and rendering — the hub, loop hubs and check-answers are bespoke by design  |
| [persistence.md](persistence.md)           | Two honest stub ports (session and records) with named prod seams; why submit is a pure status flip                  |
| [validation.md](validation.md)             | Controllers own validation: blank saves everywhere except full name, and currency commits the cleaned value          |
| [add-a-page.md](add-a-page.md)             | Numbered steps to add a new page, traced against a real feature                                                      |
| [add-a-field.md](add-a-field.md)           | Numbered steps to add a new field or obligation, including a conditional field with `activatedBy`                    |
| [add-a-collection.md](add-a-collection.md) | Numbered steps to add a repeating collection, including a per-entry conditional field                                |
| [testing.md](testing.md)                   | Test layout, the shared test helpers, the collection-seeding gotcha, and the headless dump                           |
| [analysis.md](analysis.md)                 | The headless simulator and the reachability prover: interrogate the journey without a browser                        |
| [decisions.md](decisions.md)               | Short architecture decision records: context, decision, why it won, and the costs accepted                           |
| [limits.md](limits.md)                     | Honest limits: what the paradigm does not do, what it does at a cost, and where growth would start                   |

## Provenance

This folder replaces the spike's earlier root-level design and process logs. Git history on the `spike/EUDPA-249-prototype-layouts` branch preserves every deleted file.
