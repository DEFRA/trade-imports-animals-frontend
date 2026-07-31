# Live-animals service — documentation index

## What this is

This is the live-animals import-notification journey, built as a standalone hapi
plugin (`routes.js` exports `liveAnimals`). It runs on a page-owned spine over a
declarative obligation model and a pure derivation engine. Pages own the copy,
templates and validation; the model declares only what data is owed and when it
is in scope; the engine derives scope, completeness and status from the answers
on every read and write. Value options come from the reference-data services, not
the model. The service covers the full trader journey — consignment details,
per-species commodity lines, per-animal identifiers, transport, addresses and
accompanying documents — to nesting depth 2 (an identifier inside a commodity line
inside the notification).

## Quick start

Run everything from the frontend repo root (`trade-imports-animals-frontend`).

Run the local service:

```
npm run dev
```

Then open the dashboard and start a notification:

```
http://localhost:3000/
```

The create POST redirects to the journey-scoped import-type filter.

Run the service unit suite:

```
npm run test:live-animals
```

Run the journey's Playwright E2E suite:

```
npm run test:e2e
```

Inspect the model without a server — print derived scope, wipes, section statuses
and submit readiness for an editable fixture:

```
npm run dump:live-animals
```

## Where to start

New here? Read in this order:

1. [architecture.md](architecture.md) — the layers and how they fit together
2. [obligation-model.md](obligation-model.md) — the declarative model everything runs on
3. [engine.md](engine.md) — the pure core that derives scope, status and navigation

Then pick the topic you need from the table below.

## All docs

| File                                       | What it covers                                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md)         | The page-owned spine, the model, bridge, flow and frontend layers, the dependency direction, and how boot wires them                   |
| [obligation-model.md](obligation-model.md) | Obligations as pure data: identity, `within` groups, `status`, `requires` floors, and the gate-helper families that build `applyTo`    |
| [engine.md](engine.md)                     | The evaluator's purge/implication pipeline and the derivation barrel pages read for status and navigation                              |
| [scope-and-wipe.md](scope-and-wipe.md)     | Why answering to take an obligation out of scope purges its data instead of hiding it, and how the bridge derives the wipe set         |
| [flow-and-gates.md](flow-and-gates.md)     | Sections and pages, the `collects`-driven dispatch index, and derived page/section gates with the one authored review gate             |
| [features.md](features.md)                 | Anatomy of a feature: page/controller/template trio, `meta` and `collects`, and why the hub, collections and check-answers are bespoke |
| [services.md](services.md)                 | The reference-data (MDM) and persistence services, stub-vs-real selection, and the `LIVE_ANIMALS_MODE` switch                          |
| [persistence.md](persistence.md)           | The session and records ports, the two notification mappers, and why submit is a status flip                                           |
| [validation.md](validation.md)             | In-controller field validation via `lib/validate/`, including address field completeness                                               |
| [add-a-collection.md](add-a-collection.md) | Numbered steps to add a repeating collection, including a per-entry conditional field                                                  |
| [analysis.md](analysis.md)                 | The headless simulator and the two reachability provers — interrogate the journey without a browser                                    |
| [decisions.md](decisions.md)               | Short architecture decision records: context, decision, why it won, and the costs accepted                                             |
| [limits.md](limits.md)                     | Honest limits: what the model does not do, what it does at a cost, and where growth would start                                        |
