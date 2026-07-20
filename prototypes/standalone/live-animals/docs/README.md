# Live-animals prototype — documentation index

## What this is

This is the live-animals import-notification journey, built as a standalone hapi
plugin (`routes.js` exports `liveAnimals`). It runs on a page-owned spine over a
declarative obligation model and a pure derivation engine. Pages own the copy,
templates and validation; the model declares only what data is owed and when it
is in scope; the engine derives scope, completeness and status from the answers
on every read and write. Value options come from the reference-data services, not
the model. The prototype exercises the full trader journey — consignment details,
per-species commodity lines, per-animal identifiers, transport, addresses and
accompanying documents — to nesting depth 2 (an identifier inside a commodity line
inside the notification).

## Quick start

Run everything from the frontend repo root (`trade-imports-animals-frontend`).

Run the prototype:

```
npm run prototype
```

Then open the hub:

```
http://localhost:3000/prototype-standalone/live-animals/hub
```

A fresh journey is redirected to the import-type filter by the entry guard, then
lands on the hub.

Run the prototype's unit suite:

```
npm run test:live-animals
```

Run the Playwright E2E suite — the demo journey plus the persistence-parity
compare against Mongo. Needs the workspace stack up (`scripts/stack/run-stack.sh`);
see [testing.md](testing.md):

```
npm run test:prototype
```

Inspect the model without a server — print derived scope, wipes, section statuses
and submit readiness for an editable fixture:

```
npm run dump:live-animals
```

## How the pieces fit

The code is three layers plus a bridge seam. The **model** (`model/`) is pure
data and pure functions: obligations declare identity, cardinality and scope
(`model/obligations/`); the domain registry declares value legality
(`model/domain/`); the evaluator turns a flat map of answers into per-obligation
in-scope decisions (`model/obligations/evaluator.js`); and the engine barrel
(`model/engine/index.js`) derives status and navigation from that output. The model
carries no display copy — no `label`, `title`, `hint`, `legend` or `widget` — and
that rule is enforced at boot by `model/no-display-keys.js`.

The **bridge** (`model/bridge/`) is the only door between the model and the hapi
frontend. It converts the nested answers the controllers hold into the flat
fulfilments the evaluator wants and back (`fulfilments.js`), and projects the
evaluator's decisions into the `scope`, `status` and `wipe` shapes the controllers
consume (`scope.js`, `status.js`, `purge.js`, `collection-complete.js`). The
**flow** layer (`flow/`) arranges pages into sections, builds the obligation→page
dispatch index from each page's declared `collects` list, and computes page and
section gates. The **frontend** (`features/*/`, `shared/`, `engine/`, `services/`)
holds the page-owned controllers and templates, the hapi/session/records plumbing,
in-controller validation, and the reference-data (MDM) and persistence services.
`routes.js` wires them together at boot.

## Where to start

New here? Read in this order:

1. [architecture.md](architecture.md) — the layers and how they fit together
2. [obligation-model.md](obligation-model.md) — the declarative model everything runs on
3. [engine.md](engine.md) — the pure core that derives scope, status and navigation

Then pick the topic you need from the table below.

## All docs

| File                                                         | What it covers                                                                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| [architecture.md](architecture.md)                           | The page-owned spine, the model/bridge/flow/frontend layers, the dependency direction, and how boot wires them                         |
| [obligation-model.md](obligation-model.md)                   | Obligations as pure data: identity, `within` groups, `status`, `requires` floors, and the gate-helper families that build `applyTo`    |
| [engine.md](engine.md)                                       | The evaluator's purge/implication pipeline and the derivation barrel pages read for status and navigation                              |
| [scope-and-wipe.md](scope-and-wipe.md)                       | Why answering to take an obligation out of scope purges its data instead of hiding it, and how the bridge derives the wipe set         |
| [flow-and-gates.md](flow-and-gates.md)                       | Sections and pages, the `collects`-driven dispatch index, and derived page/section gates with the one authored review gate             |
| [features.md](features.md)                                   | Anatomy of a feature: page/controller/template trio, `meta` and `collects`, and why the hub, collections and check-answers are bespoke |
| [kit-library-not-framework.md](kit-library-not-framework.md) | What `shared/kit.js` gives a page and what it deliberately leaves the page to own                                                      |
| [services.md](services.md)                                   | The reference-data (MDM) and persistence services, stub-vs-real selection, and the `LIVE_ANIMALS_MODE` switch                          |
| [persistence.md](persistence.md)                             | The session and records ports, the two notification mappers, and why submit is a status flip                                           |
| [validation.md](validation.md)                               | In-controller field validation via `lib/validate/`, separate from the domain value-legality predicates                                 |
| [add-a-page.md](add-a-page.md)                               | Numbered steps to add a new page, traced against a real feature                                                                        |
| [add-a-field.md](add-a-field.md)                             | Numbered steps to add a new field or obligation, including a conditional one gated by `applyTo`                                        |
| [add-a-collection.md](add-a-collection.md)                   | Numbered steps to add a repeating collection, including a per-entry conditional field                                                  |
| [testing.md](testing.md)                                     | Test layout, the shared helpers, the collection-seeding gotcha, and the headless dump                                                  |
| [analysis.md](analysis.md)                                   | The headless simulator and the two reachability provers — interrogate the journey without a browser                                    |
| [decisions.md](decisions.md)                                 | Short architecture decision records: context, decision, why it won, and the costs accepted                                             |
| [limits.md](limits.md)                                       | Honest limits: what the model does not do, what it does at a cost, and where growth would start                                        |
