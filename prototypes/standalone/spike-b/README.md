# Spike B — standalone (statechart / FSM)

A **fully self-contained, flattened** copy of `model-spikes/spike-b`, built for
readability: it shares **nothing** with the other spikes or with the original
prototypes (only the `govuk-frontend` framework is shared). There is no generic
`buildVariant`, no contract-blackbox indirection and no shape registry — the
single grouped journey (a task list whose tasks are short linear runs) is spelled
out directly in this folder.

The journey content is identical to the original spike-b (same car-insurance
steps); only the structure differs.

## Layout

- `model/machine.json` — the model: a statechart (states + guarded transitions)
  as portable data, no code (unchanged from the original).
- `runtime/` — the adapter that interprets the machine (the paradigm's IP — the
  part worth reading), split by concern:
  - `interpreter.js` — a tiny, journey-agnostic statechart interpreter
    (`transition`, `realizedPath`, `reverseIndex`, `prevState`). Navigation falls
    out of the machine rather than being hand-coded.
  - `model.js` — loads `machine.json`.
  - `steps.js` — step metadata (kind/title/field specs).
  - `navigation.js` — machine-derived `next`/`prev`/`applicableSteps` + the
    module-level reverse index.
  - `status.js` — per-step + journey status, layered on `context.fields`.
  - `mutation.js` — answer mutation + the applicability cascade.
  - `view.js` — per-step option-list view model.
  - `assembly.js` — whole-object wiring (`validate`, `assembleQuote`,
    `missingRequired`).
  - `contract.js` — thin assembler composing the above into the one `contract`.
- `journey/` — the journey shell: `config.js` (base path, layout, the literal
  task groups), `links.js` (URL/nav resolution), `hub.js` (task-list view model)
  and `index.js` (barrel + the start + hub routes).
- `section-routes.js` — the generic question pages (GET/POST per step).
- `claims-routes.js` / `addons-routes/` — the claims loop and the add-on fan-out
  (`addons-routes/step-view.js` holds its step helpers).
- `endings/` — quote summary, check your answers, confirmation
  (`endings/check-answers.js` holds the CYA view builders).
- `routes.js` — assembles everything into one Hapi plugin.
- `lib/` — duplicated helpers (store, premium, quote, claims, conditions,
  fieldutil) plus folder-modules with barrels for the larger catalogues
  (`validate/`, `sections/`, `fields/`, `addons/`) and this spike's inlined
  validation — `page-validator.js` (`makePageValidator`, page-slice) and
  `assembler.js` (`makeAssembler`, whole-object). Each is pointed at this folder;
  `lib/data/` is this spike's own quote store.
- `templates/` — this spike's own njk (layout, start, hub, section-page, endings,
  claims, add-ons, partials).
- `dump.js` — headless JSON dump of the journey state for a fixture.

## Run

The standalone copy mounts at `/prototype-standalone/spike-b/task-list-with-linear-tasks`.

```bash
npm run prototype                 # serves the whole prototype app incl. standalone
node prototypes/standalone/spike-b/dump.js with-claims   # headless model dump
npm test                          # unit tests (interpreter + contract + validation)
```
