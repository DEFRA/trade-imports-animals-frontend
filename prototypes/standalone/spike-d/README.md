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

- `model/` — the model as portable data, no code: `quote.schema.json` (the JSON
  Schema that owns validity) and `annotations.json` (flow metadata: order/groups/types).
- `runtime/` — the adapter that interprets the model (the `contract`), decomposed by
  concern behind `index.js`: `annotations` (loads the flow metadata), `step-meta`,
  `applicability`, `status`, `navigation`, `mutation`, `view-items`, `page-validation`,
  `assembly`. This is the paradigm's IP — the part worth reading.
- `validation/` — the schema adapter as a folder-module behind `index.js`:
  `schema-document` (load + `$ref` resolve), `validate-value` (one value vs one node),
  `conditionals` (value-based if/then) and `partial-check` (missing vs invalid).
- `journey.js` — the journey shell: base path, layout, the literal task groups,
  navigation, and the start + hub pages (replaces the shared variant builder).
- `handlers.js` — the generic question pages (GET/POST per step).
- `claims-routes.js` / `addons-routes.js` — the claims loop and the add-on fan-out.
- `endings.js` — quote summary, check your answers, confirmation.
- `routes.js` — assembles everything into one Hapi plugin.
- `lib/` — duplicated helpers, each pointed at this folder: leaf utils (store, premium,
  quote, fields, claims, conditions, fieldutil, domain) plus the folder-modules
  `validate/` (Joi factories), `addons/` (catalogue + behaviour) and `sections/`
  (registry + query helpers). `lib/data/` is this spike's own quote store.
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
