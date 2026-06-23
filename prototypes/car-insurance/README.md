# Car insurance journey (prototype)

**Spike: EUDPA-249.** A non-functional example journey used to explore GDS
layouts and page flow. There is no data persistence, no validation and no
back-end — pages are static GOV.UK Design System mock-ups only.

## Folder structure

```
car-insurance/
  journey/              one folder per page/step in the flow
    start/                start page (guidance + "Start now")
    about-you/            personal details
    your-vehicle/         vehicle registration / details
    driving-history/      claims, convictions, no-claims
    cover-type/           comprehensive / third party etc.
    optional-extras/      add-ons (breakdown, courtesy car…)
    quote-summary/        indicative price + breakdown
    check-your-answers/   GDS summary-list review page
    confirmation/         confirmation panel
  layouts/              shared page layout(s) for the prototype
  components/           shared partials / GDS component snippets
  data/                 static mock data (NOT persistence — fixtures only)
  assets/
    scss/               prototype-only styling
```

## How the steps relate

```
start → about-you → your-vehicle → driving-history → cover-type
      → optional-extras → quote-summary → check-your-answers → confirmation
```

Each `journey/<step>/` folder is currently an empty placeholder (`.gitkeep`).
Drop GOV.UK-styled markup in here to mock up each page. Keep everything inside
the GOV.UK Design System toolbox — `govuk-*` components and utility classes —
rather than custom CSS.
