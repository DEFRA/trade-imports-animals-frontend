# Prototypes

Throwaway, **non-functional** prototype journeys for spiking GDS layouts and
flow. Deliberately **separate from and parallel to** the real application under
[`../src/`](../src).

Each journey variant is its own self-contained folder. They all implement the
same example **car insurance quote** journey and share a common core, differing
only in how the user moves between questions.

```
prototypes/
  shared/                        car insurance domain shared by every variant
    store.js                       JSON-file "database" (array of quotes)
    quote.js                       options + formatting helpers
    premium.js                     illustrative price calculation
    sections.js                    the questions: collect / isComplete / rows
    section-controller.js          GET/POST factory for one question section
    endings.js                     quote summary -> check answers -> confirmation
    partials/                      GDS field markup, one per section
    *.njk                          shared dynamic-layout templates
    data/quotes.json               the datastore (gitignored, runtime-written)
  linear/                        one question per page, "Save and continue"
  task-list/                     a hub lists every section; do them in any order
  task-list-with-linear-tasks/   a hub of tasks, each a short linear run
  input-types/                   reference journey exercising every GDS input
  index.js                       aggregate plugin + chooser + saved-quotes view
  chooser.njk / quotes.njk       landing + datastore views
```

## How it is wired

Off by default in production. Enabled via `config.features.prototypes.enabled`
(`FEATURES_PROTOTYPES_ENABLED`, default on outside production). When enabled,
`src/server/router.js` registers `prototypes/index.js`, and
`src/config/nunjucks/nunjucks.js` adds `prototypes/` to the template paths.

Run it with `npm run prototype`, then open `/prototype` to choose a variant.

> ⚠️ Prototype code only. No real backend, no auth, no validation. Do not import
> between `src/` and `prototypes/`. When a layout is ready to become real,
> rebuild it properly under `src/server/<feature>/`.
