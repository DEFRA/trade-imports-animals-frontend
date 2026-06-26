# Prototypes

Throwaway, **non-functional** prototype journey for spiking GDS layouts and
flow. Deliberately **separate from and parallel to** the real application under
[`../src/`](../src).

A single example **car insurance quote** journey, shaped as a hub of tasks
where each task is a short linear run of questions.

```
prototypes/
  shared/                        car insurance domain
    store.js                       JSON-file "database" (array of quotes)
    quote.js                       options + formatting helpers
    premium.js                     illustrative price calculation
    sections.js                    the questions: collect / isComplete / rows
    section-controller.js          GET/POST factory for one question section
    endings.js                     quote summary -> check answers -> confirmation
    partials/                      GDS field markup, one per section
    *.njk                          shared dynamic-layout templates
    data/quotes.json               the datastore (gitignored, runtime-written)
  task-list-with-linear-tasks/   a hub of tasks, each a short linear run
  index.js                       aggregate plugin + chooser + saved-quotes view
  chooser.njk / quotes.njk       landing + datastore views
```

## How it is wired

Off by default in production. Enabled via `config.features.prototypes.enabled`
(`FEATURES_PROTOTYPES_ENABLED`, default on outside production). When enabled,
`src/server/router.js` registers `prototypes/index.js`, and
`src/config/nunjucks/nunjucks.js` adds `prototypes/` to the template paths.

Run it with `npm run prototype`, then open `/prototype`.

> ⚠️ Prototype code only. No real backend, no auth, no validation. Do not import
> between `src/` and `prototypes/`. When a layout is ready to become real,
> rebuild it properly under `src/server/<feature>/`.
