# Spike A — standalone (declarative selectors)

A **fully self-contained, flattened** copy of `model-spikes/spike-a`, built for
readability: it shares **nothing** with the other spikes or with the original
prototypes (only the `govuk-frontend` framework is shared). There is no generic
`buildVariant`, no contract-blackbox indirection and no shape registry — the
single grouped journey (a task list whose tasks are short linear runs) is spelled
out directly in this folder.

The journey content is identical to the original spike-a (same car-insurance
steps); only the structure differs.

## Layout

- `model/journey.json` — the model: portable data, no code (unchanged from the original).
- `runtime/` — the adapter that interprets the model (the `contract`, in
  `selectors.js`, with colocated `selectors.test.js`). This is the paradigm's IP —
  the part worth reading.
- `validation/` — page-slice (`compile.js`) + whole-object (`assemble.js`)
  validation, each with a colocated `*.test.js`.
- `journey/` — the journey shell, split by concern: `config.js` (base path, layout,
  the literal task groups, URL builders), `navigation.js` (contract-driven Back/Next
  resolution) and `hub-view-model.js` (task-list presentation).
- `routes/` — the Hapi route builders: `shell.js` (start + hub), `section.js` (the
  generic question pages, GET/POST per step), `claims.js` (the claims loop),
  `addons.js` (the add-on fan-out) and `endings.js` (quote summary, check your
  answers, confirmation).
- `routes.js` — assembles every route builder into one Hapi plugin.
- `lib/` — duplicated helpers (store, premium, quote, fields, claims, addons), each
  pointed at this folder. `validate/` (schema factories grouped by field family
  behind a barrel) and `sections/` (the question catalogue plus its query helpers)
  are folder-modules. `lib/data/` is this spike's own quote store.
- `templates/` — this spike's own njk (layout, start, hub, section-page, endings,
  claims, add-ons, partials).
- `dump.js` — headless JSON dump of the journey state for a fixture.

## Run

The standalone copy mounts at `/prototype-standalone/spike-a/task-list-with-linear-tasks`.

```bash
npm run prototype                 # serves the whole prototype app incl. standalone
node prototypes/standalone/spike-a/dump.js with-claims   # headless model dump
npm test                          # unit tests (runtime + validation)
```
