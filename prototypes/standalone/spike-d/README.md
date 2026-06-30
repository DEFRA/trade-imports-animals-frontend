# Spike D — standalone (schema-first)

A **fully self-contained, flattened** copy of `model-spikes/spike-d`, built for
readability: it shares **nothing** with the other spikes or with the original
prototypes (only the `govuk-frontend` framework is shared). There is no generic
`buildVariant`, no contract-blackbox indirection and no shape registry — the
single grouped journey (a task list whose tasks are short linear runs) is spelled
out directly in this folder.

The journey content is identical to the original spike-d (same car-insurance
steps); only the structure differs.

## Layout

- `model/journey.json` — the model: portable data, no code (unchanged from the original).
- `runtime/` — the adapter that interprets the model (the `contract`). This is the
  paradigm's IP — the part worth reading.
- `validation/` — page-slice (`compile.js`) + whole-object (`assemble.js`) validation.
- `journey.js` — the journey shell: base path, layout, the literal task groups,
  navigation, and the start + hub pages (replaces the shared variant builder).
- `handlers.js` — the generic question pages (GET/POST per step).
- `claims-routes.js` / `addons-routes.js` — the claims loop and the add-on fan-out.
- `endings.js` — quote summary, check your answers, confirmation.
- `routes.js` — assembles everything into one Hapi plugin.
- `lib/` — duplicated helpers (store, premium, quote, validate, fields, claims,
  addons, sections), each pointed at this folder. `lib/data/` is this spike's own
  quote store.
- `templates/` — this spike's own njk (layout, start, hub, section-page, endings,
  claims, add-ons, partials).
- `dump.js` — headless JSON dump of the journey state for a fixture.

## Run

The standalone copy mounts at `/prototype-standalone/spike-d/task-list-with-linear-tasks`.

```bash
npm run prototype                 # serves the whole prototype app incl. standalone
node prototypes/standalone/spike-d/dump.js with-claims   # headless model dump
npm test                          # unit tests (runtime + validation)
```
