# Spike C — standalone (rules engine)

A **fully self-contained, flattened** copy of `model-spikes/spike-c`, built for
readability: it shares **nothing** with the other spikes or with the original
prototypes (only the `govuk-frontend` framework is shared). There is no generic
`buildVariant`, no contract-blackbox indirection and no shape registry — the
single grouped journey (a task list whose tasks are short linear runs) is spelled
out directly in this folder.

The journey content is identical to the original spike-c (same car-insurance
steps); only the structure differs.

## Layout

- `model/fields.json` + `model/rules.json` — the model: the typed answer-data
  model and the rules layer (require / min-age / lte with authored reasons).
  Portable data, no code.
- `runtime/` — the adapter that interprets the model. This is the paradigm's IP —
  the part worth reading. `model.js` loads the JSON; `engine.js` is the
  requirement-graph engine (kept whole); `contract/` decomposes the thin reads
  over the engine snapshot into `view` / `status` / `navigation` / `mutation` /
  `assembly`, re-assembled behind `contract/index.js`.
- `journey/` — the journey shell: `config.js` (base path, layout, the literal
  task groups), `paths.js` (URL building + nav resolution), `hub-view.js` (the
  hub task-list view model), behind `journey/index.js`.
- `shell-routes.js` — the start + hub pages (replaces the shared variant builder).
- `section-routes.js` — the generic question pages (GET/POST per step).
- `claims-routes.js` / `addons-routes.js` — the claims loop and the add-on fan-out.
- `endings-routes.js` — quote summary, check your answers, confirmation.
- `routes.js` — assembles everything into one Hapi plugin.
- `lib/` — duplicated helpers (store, premium, quote, claims, fieldutil,
  conditions), plus folder-as-module helpers: `validate/` (the runner +
  per-field-family schema factories), `field-view/` (spec → GOV.UK macro),
  `addons/` (catalog + state + view), `sections/` (the question registry +
  queries), `page-validator.js` (page-slice validation) and `assembler.js`
  (whole-object transform + validation). `lib/data/` is this spike's own
  quote store.
- `templates/` — this spike's own njk (layout, start, hub, section-page, endings,
  claims, add-ons, partials).
- `dump.js` — headless JSON dump of the journey state for a fixture.

## Run

The standalone copy mounts at `/prototype-standalone/spike-c/task-list-with-linear-tasks`.

```bash
npm run prototype                 # serves the whole prototype app incl. standalone
node prototypes/standalone/spike-c/dump.js with-claims   # headless model dump
npm test                          # unit tests (runtime + validation)
```
