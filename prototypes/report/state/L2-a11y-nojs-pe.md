# L2 — Accessibility, no-JS and progressive enhancement — A (live-animals) vs B (flow-layer)

**Verdict: B-better — on the MODEL, decisively. A wins on the delivered artefact, and that is a build-loop win, not a model win.**

Both sides produce a journey that works with JavaScript off. Neither side tests that
property, and neither side has a single line of automated accessibility tooling. So the
dimension does not turn on "does it work no-JS" — it turns on **where accessibility
lives**: in the model (fix once, applies to every page) or in the templates (fix 32
times, and nothing notices when you miss one).

- **A**: accessibility lives *only* in the templates, and this is **enforced at boot**.
  `docs/obligation-model.md:36-42` — "There is deliberately no `type`, no copy, no widget
  choice and no validation on an obligation" — and `assertObligationPurity()` (called from
  `routes.js`, implemented in `obligation-purity.js`) **refuses to start the server** if an
  `obligations.js` imports anything presentational. A's model *cannot ever* say anything
  about a label, a hint, a widget or an `autocomplete` token. That is not an omission; it
  is the design.
- **B**: accessibility is derived. `lib/build-field-descriptors.js:64-97` turns
  (obligation × domain entry × scope) into a widget descriptor; `lib/field-widgets.js` is
  an ordered dispatch table (5 emittable widget types); `lib/presentation.js` maps every
  obligation id to `pageTitleKey`/`legendKey`/`hintKey` resolved through
  `lib/i18n.js` (362 externalised keys, coverage-tested). **8 templates serve all 31
  pages.** Adding `autocomplete` to every text field, or switching `date` to
  `govukDateInput`, is *one rule edit*. In A it is 32 template edits and no test would
  catch the one you missed.

## The three "A model wins" from the Layer-1 read that do not survive contact with B's source

The Layer-1 A read nominated three model-derived a11y/no-JS advantages. Two are matched by
B, one is bettered by B:

1. **"Off-gate answers are destroyed on write"** (`engine/write.js:14-15` + `wipeOnExit:
   true` on 15/44 obligations). B does this *universally and without a flag*:
   `obligations/evaluator.js:93-99` runs `purgeStorage` as step 5 of **every** evaluate, and
   `purgeStorage` at `:346` drops the entire fulfilment of any out-of-scope obligation
   (`if (!isInScope(obligation)) continue`). A must opt in per obligation; B cannot opt out.
   On top of that, B's POST path is a **model-derived whitelist**: `contract.js:225-228`
   iterates the *in-scope descriptors* for the page and reads payload keys from them, so an
   off-gate or unknown payload key is silently ignored — mass-assignment-proof by
   construction. A's controllers hand-pick payload keys
   (`features/origin/controller.js:79-91` commits `regionOfOriginCode` unconditionally) and
   rely on the engine to undo the damage afterwards.
2. **"A failed gate produces a task row with no href"** (`features/hub/controller.js:152-162`).
   B does the same, also derived: `features/hub/controller.js:113-114` —
   `if (href && (isLinesManage || status !== STATUSES.NOT_APPLICABLE)) item.href = href`.
   Not-applicable rows render as text, no dead link.
3. **"Conditionality can only be discharged by routing, so no-JS is structural"**. True for
   A — and equally true for B, by a *stronger* mechanism: A's guarantee is that the model
   has no widget vocabulary, so nobody *can* express a reveal; B's guarantee is that the
   renderer will not emit an out-of-scope field at all
   (`lib/build-field-descriptors.js:67`), and the option list itself is server-computed
   (`optionsFor`, `:73`), so **show/hide-page, show/hide-question and show/hide-option are
   one declarative mechanism**. A has no model-level concept of an option domain at all, so
   option-level conditionality is per-controller code.

So the standing prior holds on this dimension. B's model is better here, and the Layer-1 A
read was generous to A's model.

## Where A genuinely wins — and what kind of win it is

| A asset | Kind of win |
|---|---|
| No-JS file upload + cdp-uploader forward + 413→GDS field error (`features/documents/template.njk:15`, `controller.js:260,315-332,341-345`) | **Code**, not model. B has zero file inputs/routes/domain shapes, but `obligations.md:1847` already carries the modelling position and the dispatch table takes a new widget in one rule. Transplantable. |
| No-JS async virus-scan loop as a refresh **link** with `?attempt=N` and a cap (`template.njk:78-82`, `controller.js:33,169-173`) | **Code**. The strongest single no-JS artefact in either clone. Nothing in B obstructs it. |
| accessible-autocomplete over `<select>` (12 LOC, `src/client/javascripts/select-autocomplete.js`, 1 webpack entry, 3 templates opted in) | **Code, and worse-shaped**. B would get the same enhancement for *every* >5-option field from one dispatch rule (`RADIO_MAX = 5`, `lib/field-widgets.js:64,152`); A needs a hand-typed `data-select-autocomplete` + a `bodyEnd` block per template. |
| Address picker with server-side search + `govukPagination` + radio-per-row, "no client JS anywhere" (`features/addresses/_address-picker.njk:8-12`) | **Code — and the one thing B has no pattern for.** B's 5-widget dispatch table cannot express a paginated searchable picker; it would need a bespoke escape-hatch page (precedent exists: `features/commodity-lines/`, `features/units/`). |
| Same-page GDS conditional reveal (`features/origin/template.njk:37-45`) that degrades to always-visible and is made safe by the engine's wipe | **The only true model-level asymmetry** — see aOnly. Narrow, and B answers the same design need differently (`branchedGate`, `flow/flow.js:357-363,379-404`: always show, conditionally mandate). |

A is further along on this dimension because a build loop pointed at it built an upload
page and an address picker. That is breadth. It says nothing about whether the obligation
model helped, and `DESIGN-DELTA.md` (761 LOC, 15 engine divergences) confirms it did not:
**zero mentions of JavaScript, accessibility or progressive enhancement**. The PE work
never touched A's engine, because A's engine has nothing to say about it.

## Where B is plainly wrong today (and cheap to fix)

- `date` → single free-text `DD/MM/YYYY` input (`lib/field-widgets.js:271-293`) while
  `obligations.md:2458-2460` claims a three-part widget. `shared/partials/fields.njk:21-24`
  already dispatches `govukDateInput` and `govukTextarea` — **two dead branches**. One rule
  each.
- >5 options → bare `govukSelect`, no autocomplete (`field-widgets.js:64,152`). Wrong
  end-state for country/commodity/port pickers — but the correct *no-JS base* for one. One
  rule + a bundle entry, and it lands on all 31 pages at once.
- GDS question-page pattern (label-as-h1, `isPageHeading`) followed on **0 of 31 pages**
  (`shared/page.njk:14` h1 = pageTitle; widgets emit a separate `--m` legend;
  `locales/en.json:75-79` shows they are different strings). Systematic — and therefore
  systematically fixable, which is the point.
- `obligations.md:2461-2462` promises an "A11y / required-attribute alignment" check;
  nothing in the HTML signals required. Doc↔code disagreement.
- No Welsh (`cy.json` absent) — but 362 keys are already externalised and coverage-tested.
  A hard-codes every string in 32 templates; Welsh in A is a rewrite, in B it is a file plus
  a locale param.

## Where BOTH are at zero — the third option must pay this regardless

| Check | A | B |
|---|---|---|
| axe / pa11y / Lighthouse | 0 | 0 |
| Playwright projects with `javaScriptEnabled: false` | 1 leg of 33 tests, covering only the country select (`prototypes/e2e/live-animals.spec.js:2892-2917`) | 0 (`playwright.config.js:49` — single chromium project, JS on) |
| Explicit a11y assertions in tests | 2 | 4 |
| a11y / no-JS / PE mentioned in the testing doc | not in `docs/limits.md` beyond an admission the templates were never reviewed (`:86-88`) | 0 mentions in `docs/testing.md` (644 LOC) |

Both no-JS stories are **true but unenforced**. B's is incidentally corroborated by ≥76
`server.inject` HTTP-level cases (no browser, no JS can run) — a stronger accidental proof
than A's single no-JS E2E leg — but neither side has a guard that would fail if someone
added a JS-dependent control tomorrow.

## Retrofit

### B's model-derived rendering into A (`retrofitBintoA`) — expensive, and it is the paradigm A exists to reject

Obligations gain `type` / domain / copy keys (44 obligations); a central renderer replaces
32 hand-written templates with ~8; every controller's hand-picked `values` map and bespoke
`validate()` is replaced by a contract-level payload validator; the 19 hand-included error
summaries and 21 hand-typed `autocomplete` tokens disappear into the dispatch table. Two
things bite:
1. **A's boot guard actively prevents it.** `assertObligationPurity()` reads the source of
   every `features/*/obligations.js` and rejects any import that is not another
   `obligations.js`; the server does not start if the model is re-coupled to presentation.
   You must delete the guard to begin.
2. **A's docs name this as the failure mode.** `docs/features.md:333-338` — "The moment a
   `kit.renderPage(spec)` appears, the rejected generic config-engine has sneaked back in";
   `docs/kit-library-not-framework.md`. Retrofitting B here is not a change to A, it is a
   replacement of A.
3. **The rich pages have no home.** Documents upload, the paginated address picker, the
   commodity search, the per-animal identification cards — B's 5-widget table cannot emit
   any of them. Realistic end-state is a **hybrid**: generic pipeline for the ~20 simple
   question pages, page-owned templates for the 6-8 rich ones.

**The cheap 80%, staying inside A's paradigm:** a `kit.field(obligation, opts)` helper that
centralises label/hint/`autocomplete`/error wiring and auto-includes the error summary,
without the model carrying a `type`. That buys the derivable a11y wins without a config
engine — and A did not write it.

### A's no-JS assets into B (`retrofitAintoB`) — mostly cheap; one genuine hole

- **accessible-autocomplete**: one dispatch rule (`options.length > RADIO_MAX` → select with
  `data-select-autocomplete`) + one bundle entry. B gets it on **every** long-list field at
  once — strictly better than A's per-template opt-in. Cheap.
- **Three-part date, textarea**: one rule each; the template branches already exist and are
  dead. Cheap.
- **File upload + cdp-uploader + no-JS scan-refresh link**: needs a `file` domain shape
  (`domain/index.js` has 4: staticEnum, computedEnum, predicate, addressBlock), a widget
  rule, a multipart route, and a bespoke page controller — B's generic
  `lib/page-controller.js` assumes payload → coerce → `writeAnswer`, and a file is a
  *reference*, not a fulfilment value. Moderate; precedent exists in the bespoke
  commodity-lines/units controllers. The cdp-uploader integration itself is net-new work
  either way.
- **The paginated, searchable address picker**: the load-bearing thing A has that **B has no
  answer for**. Not expressible in the dispatch table; needs an escape-hatch page pattern
  that B has used but not codified.
- **A's same-page conditional reveal**: needs a tri-state (in-scope-but-gated) in the
  evaluator *and* a payload-acceptance change in `contract.js:225-251`. Probably **don't** —
  `branchedGate` (always show, conditionally mandate) is the better no-JS answer and is
  already built and tested.
- **Nothing in B's model breaks** under any of this. That asymmetry is the finding.

## Shopping list for the third option

1. Take **B's obligation model + evaluator** (scope purge on every evaluate; in-scope POST
   whitelist; server-computed option lists).
2. Take **B's widget dispatch table + presentation/i18n registry** — this is where every
   a11y property becomes fixable once. Add the missing rules on day one: search-select,
   three-part date, `autocomplete` on top-level text fields, required signalling,
   `isPageHeading` for single-obligation pages.
3. Take **A's documents feature wholesale as code** (multipart route, cdp-uploader forward,
   413→GDS error, `?attempt=N` refresh link) and A's address-picker page — and codify them as
   B's **escape-hatch page pattern**: bespoke template + bespoke controller, still reading
   scope from the evaluator.
4. Take **A's 12-LOC accessible-autocomplete bundle** and wire it to B's dispatch rule, not
   to templates.
5. Add what **neither** has: axe in the Playwright run, a `javaScriptEnabled: false`
   project that walks the whole journey, and a `cy.json`.
