# Phase 2 — v2 design (synthesised)

Chosen by a 3-architect / 3-judge panel (see `DESIGN-PROVENANCE.md`). Winner across
all three lenses: **page-owned spine** (fidelity 90, simplicity 88, implementability 88).
This document reconciles that proposal to the **real** journey (exact obligations,
pages and pinned copy from the v1 spike + the shared specs) and folds in the grafts the
judges converged on. Code is **ESM** to match the frontend/prototypes codebase.

## 1. The v2 paradigm, in one paragraph

v1 made a config engine the spine — a UUID-keyed JSON catalogue plus a `flow.json`
Container-tree that owned every page's copy, rendered through one generic `page.njk`.
v2 **makes the pages the spine.** Each page is an ordinary Hapi GET/POST pair with its
own bespoke `.njk` template, owning its copy, its validation and its view-model —
explicit and greppable. What survives from v1 is a deliberately **thin declarative state
layer**: obligations described as plain-JS data (type, cardinality, options, and
activation/wipe _relationships_ expressed as **inert data literals over real JS
references**) plus one pure `reconcile` (scope + wipe, to a fixpoint) and one pure
`rollUp` (four-status). That layer answers exactly two questions — _what is owed / is it
satisfied_ and _is this obligation in scope_ — and it **never renders and never owns
copy**. Pages declare the obligations they `collects`; at boot those declarations are
inverted into a **dispatch index** so the hub and CYA can ask _"which page owns
obligation X"_ without the state layer knowing anything about pages. The seam is
one-directional: pages write answers **down** (`commit`); the store derives scope/wipe/
status and hands them **up** as read-only facts. Nothing else crosses.

## 2. Module map + folder tree

> **Revision (feature model — DISCUSSION-LOG entry 5).** The layout below replaces
> the original `pages/` + central-`state/` map. The defs moved from one central
> `state/obligations/registry.js` into a pure `obligations.js` **per feature**
> (entry 3a's split, landed inside the features), assembled by a top-level
> `registry.js` **barrel** (entry 3 — the model is now first-class, not a drawer
> in `state/`). What remained of `state/` — the pure evaluators + store + facade —
> is the central `engine/`; `quote.js` moved to `lib/` as domain logic (entry 2).
> The model-purity guard is **re-pointed per-file** (`obligation-purity.js`).

```
obligations-v2-spike/
  FINDINGS.md  DESIGN.md  DESIGN-PROVENANCE.md  README.md  DISCUSSION-LOG.md
  routes.js                     # one Hapi plugin; runs the two boot guards, registers the routes
  registry.js                   # the ASSEMBLING BARREL — imports every feature's obligations.js
  obligation-purity.js          # per-file boot guard: a def file imports ONLY another def file
  contract.test.js              # controller<->model commit contract (the restructure safety net)
  config.js  dump.js            # (dump = headless state dump for a fixture)

  features/                     # ── THE SPINE — one vertical slice per feature ──
    start/          { controller.js, template.njk }                      # shell (no obligations)
    hub/            { controller.js, template.njk }                      # task-list; owns task titles
    email/          { controller.js, template.njk, obligations.js }
    about-you/      { controller.js, template.njk, obligations.js }      # owns fullName (sole save-blocking mandate)
    your-vehicle/   { controller.js, template.njk, obligations.js }      # owns vehiclePhoto (renderOnly)
    driving-history/{ controller.js, template.njk, obligations.js }      # owns hadClaims (activates claims)
    claims/         { list.controller.js, entry.controller.js, list.njk, entry.njk, obligations.js }
    cover-type/     { controller.js, template.njk, obligations.js }      # voluntaryExcess Yes reveals excessAmount
    optional-extras/{ controller.js, template.njk, obligations.js }
    addons/         { controller.js, template.njk, obligations.js }      # picker; activates 3 detail slices
    named-driver/   { who.controller.js, relationship.controller.js, who.njk, relationship.njk, obligations.js }
    modifications/  { describe.controller.js, value.controller.js, describe.njk, value.njk, obligations.js }
    protected-ncd/  { years.controller.js, years.njk, obligations.js }
    quote/          { controller.js, template.njk, obligations.js }      # owns premium (system, computed)
    check-answers/  { controller.js, template.njk }                      # bespoke rows; SOFT-GATE at POST
    confirmation/   { controller.js, template.njk }
    index.js                    # the route + dispatchPages barrel (every controller assembled)

  engine/                       # ── THE CENTRAL ENGINE (was state/, model + calculator removed) ──
    predicate.js                # evalPredicate(activatedBy, answers) — the tiny vocab
    reconcile.js                # PURE: (answers) -> { inScope:Set, wiped:[] }, fixpoint
    status.js                   # PURE: rollUp(obligationIds, answers, scope) -> status
    util.js                     # isBlank/isAnswered
    store.js                    # in-memory Map; get/commit/appendEntry/updateEntry/removeEntry
    journey.js                  # cookie journeyId, load-or-create, submit-freeze
    index.js                    # the narrow state facade controllers import

  flow/
    flow.js                     # ordered sections -> pages {id, slug, gate?} — STRUCTURE + GATING only
    navigation.js               # sectionEntry, nextInSection (else hub)
    dispatch.js                 # obligationId -> {pageId, slug} built at boot; coverage-asserted

  shared/                       # shared UI plumbing (a LIBRARY the page calls, never a framework)
    kit.js                      # errorSummary, nextTarget, pageRoutes, view ctx, date helpers
    layout.njk                  # base template (service nav, phase banner, breadcrumbs, back link)
    error-summary.njk           # shared GDS error-summary partial (#id-error, a[href="#id"])

  lib/
    validate/                   # reusable, context-agnostic Joi validators (unchanged)
    quote.js                    # calculatePremium(answers) + makeReference(id) — pure domain, not state

  analysis/                     # ── MODEL-LEVEL TOOLING (browser-free payoff, entry 4) ──
    simulate.js                 # simulateJourney(answers) -> ordered page ids a persona visits
    reachability.js             # proveReachability() -> [] (no owed obligation is unreachable)
```

**The dispatch seam is `flow/dispatch.js`** — _derived_ at boot from every page's
`collects`. Authored source of truth is page-side; the inverse (obligation→page) is
generated and **coverage-asserted** (graft): every non-system obligation resolves to
exactly one page, or boot crashes. This is the crisp resolution of "the model indexes
off to the relevant page" with "the binding lives on the page side": pages declare, boot
inverts, the state layer dispatches through the derived index and never learns a page's
copy or shape.

> **Revision (validation rework).** The obligation model below has since **shed its
> `type` taxonomy and every presentation/validation-shaped field** (`type`, `pattern`,
> `min`, `max`, `maxLength`, `options`, `saveBlocking`). A def now carries only identity,
> relationships and structural state facts. Validation moved into the controllers, backed
> by a reusable Joi lib. See **§9** for the rationale and the current shape; the block in
> this section is retained as the design's original record.

## 3. Obligation-model shape (real JS, real journey)

Defs are plain objects: **nouns and constraint values only** — `type`, `cardinality`,
`options` (value-domains, not labels), `required`, `saveBlocking`, `system`, and the
relationship literals `activatedBy` / `wipeOnExit`. No copy, no widget choice, no
message text, no closures. Relationships reference **real JS consts** (no UUID ceremony).

```js
// state/obligations/registry.js  (shape — real ids from the journey)
import { T } from './types.js'
const POSTCODE = /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s*\d[A-Za-z]{2}$/
const REG = /^[A-Za-z]{2}\d{2}\s?[A-Za-z]{3}$/

// root (always in scope)
const email = { id: 'email', type: T.EMAIL, required: true }
const fullName = {
  id: 'fullName',
  type: T.TEXT,
  required: true,
  saveBlocking: true
} // ONLY hard mandate
const preferredName = { id: 'preferredName', type: T.TEXT } // optional
const phone = { id: 'phone', type: T.TEL }
const postcode = { id: 'postcode', type: T.FORMATTED, pattern: POSTCODE }
const country = {
  id: 'country',
  type: T.SELECT,
  options: ['england', 'scotland', 'wales', 'northern-ireland']
}
const dateOfBirth = { id: 'dateOfBirth', type: T.DATE }
const registration = { id: 'registration', type: T.FORMATTED, pattern: REG }
const make = { id: 'make', type: T.TEXT }
const model = { id: 'model', type: T.TEXT }
const year = { id: 'year', type: T.NUMBER }
const estimatedValue = { id: 'estimatedValue', type: T.CURRENCY }
const vehiclePhoto = { id: 'vehiclePhoto', type: T.FILE, renderOnly: true } // never stored (parity)
const yearsNoClaims = { id: 'yearsNoClaims', type: T.NUMBER }
const hadClaims = { id: 'hadClaims', type: T.BOOLEAN, required: true }
const penaltyPoints = { id: 'penaltyPoints', type: T.NUMBER }
const coverType = {
  id: 'coverType',
  type: T.RADIO,
  required: true,
  options: ['comprehensive', 'third-party-fire-theft', 'third-party']
}
const voluntaryExcess = { id: 'voluntaryExcess', type: T.BOOLEAN }
const extras = {
  id: 'extras',
  type: T.MULTISELECT,
  options: ['breakdown', 'courtesy-car', 'legal', 'windscreen']
}
const addons = {
  id: 'addons',
  type: T.MULTISELECT,
  options: ['named-driver', 'modifications', 'protected-ncd']
}

// the ONE repeating collection: claims (0..n, user add/remove)
const claims = {
  id: 'claims',
  type: T.GROUP,
  cardinality: 'indexed',
  fields: ['claimType', 'claimAmount'], // sub-field ids (validated page-side)
  activatedBy: { obligation: hadClaims, equals: 'yes' }, // in scope iff hadClaims === 'yes'
  requiredAtLeastOne: true, // when in scope, ≥1 entry for completion
  wipeOnExit: true // Yes→No DESTROYS; No→Yes no rehydrate
}

// conditional reveal — scope/wipe here; the reveal markup is page-side
const excessAmount = {
  id: 'excessAmount',
  type: T.CURRENCY,
  activatedBy: { obligation: voluntaryExcess, equals: 'yes' },
  wipeOnExit: true
}

// addon detail obligations — SINGLE, spawn on selection, wipe on deselect
const driverName = {
  id: 'driverName',
  type: T.TEXT,
  activatedBy: { obligation: addons, includes: 'named-driver' },
  wipeOnExit: true,
  required: true
}
const driverDob = {
  id: 'driverDob',
  type: T.DATE,
  activatedBy: { obligation: addons, includes: 'named-driver' },
  wipeOnExit: true
}
const relationship = {
  id: 'relationship',
  type: T.RADIO,
  options: ['spouse', 'child', 'parent', 'other'],
  activatedBy: { obligation: addons, includes: 'named-driver' },
  wipeOnExit: true,
  required: true
}
const modDescription = {
  id: 'modDescription',
  type: T.TEXTAREA,
  activatedBy: { obligation: addons, includes: 'modifications' },
  wipeOnExit: true,
  required: true
}
const modValue = {
  id: 'modValue',
  type: T.CURRENCY,
  activatedBy: { obligation: addons, includes: 'modifications' },
  wipeOnExit: true
}
const ncdYears = {
  id: 'ncdYears',
  type: T.NUMBER,
  activatedBy: { obligation: addons, includes: 'protected-ncd' },
  wipeOnExit: true,
  required: true
}

// system-handled: computed, never collected
const premium = {
  id: 'premium',
  type: T.QUOTE,
  system: true,
  activatedBy: { obligation: coverType, present: true }
}
```

**Why this stays "close to data":** the only vocabulary is inert nouns/values; a PM can
read `activatedBy: { obligation: hadClaims, equals: 'yes' }` as English. The reference is
a real const (`hadClaims`) — typed and greppable, no UUIDs. There is no copy, no widget
choice, no message and no ordering on any def. The predicate vocab is intentionally tiny
(`equals` / `includes` / `present`); anything needing real branching is the signal it
belongs in a page controller — a pressure valve that keeps the model thin. **Graft
(model-dispatch):** a boot assertion + the narrow store API make "no behaviour/copy in
defs" enforced, not merely conventional.

## 4. Flow, navigation, status (what survives; what it must NOT own)

`flow/flow.js` is an ordered **section → pages** structure. It owns **sequence** and
**gating** — nothing else (no copy, no headings, no validation, no template choice).
Section grouping is retained (lighter than v1's Container tree, copy-free) because the
journey returns to the hub _after each section_, and the hub renders one task per section.

```js
// flow/flow.js  (structure + gating only)
export const sections = [
  { id: 'email', pages: [{ id: 'email', slug: 'email' }] },
  {
    id: 'about-you-and-your-vehicle',
    pages: [
      { id: 'about-you', slug: 'about-you' },
      { id: 'your-vehicle', slug: 'your-vehicle' }
    ]
  },
  {
    id: 'your-driving-and-cover',
    pages: [
      { id: 'driving-history', slug: 'driving-history' },
      { id: 'claims', slug: 'claims', gate: (s) => s.inScope.has('claims') },
      { id: 'cover-type', slug: 'cover-type' },
      { id: 'optional-extras', slug: 'optional-extras' }
    ]
  },
  { id: 'add-to-your-policy', pages: [{ id: 'addons', slug: 'addons' }] },
  {
    id: 'named-driver',
    addon: 'named-driver',
    gate: (s) => s.inScope.has('driverName'),
    pages: [
      { id: 'named-driver-who', slug: 'addons/named-driver/who' },
      {
        id: 'named-driver-relationship',
        slug: 'addons/named-driver/relationship'
      }
    ]
  },
  {
    id: 'modifications',
    addon: 'modifications',
    gate: (s) => s.inScope.has('modDescription'),
    pages: [
      { id: 'modifications-describe', slug: 'addons/modifications/describe' },
      { id: 'modifications-value', slug: 'addons/modifications/value' }
    ]
  },
  {
    id: 'protected-ncd',
    addon: 'protected-ncd',
    gate: (s) => s.inScope.has('ncdYears'),
    pages: [{ id: 'protected-ncd-years', slug: 'addons/protected-ncd/years' }]
  },
  {
    id: 'get-your-quote',
    gate: (s) => s.readyForQuote,
    pages: [{ id: 'quote-summary', slug: 'quote-summary' }]
  }
]
```

- **`gate`** is a pure read of the scope facts the state layer already computed; the flow
  never re-derives scope or mutates data.
- **`navigation.nextInSection(pageId, scope)`** returns the next gated-in page in the
  _same_ section, else the hub sentinel. **`sectionEntry(sectionId, scope)`** returns the
  first gated-in page of a section. This reproduces "linear run then back to the hub".
- **Status** (`state/status.js`) is a pure per-obligation-set roll-up: `NA` when none of
  the ids are in scope; `NotStarted` in scope but unanswered; `InProgress` some answered;
  `Fulfilled` when every in-scope `required` id (and `requiredAtLeastOne` collection) is
  satisfied. The hub calls it per section. `readyForQuote` = every non-quote section is
  `Fulfilled` or `NA` — computed once in `reconcile` output so `gate` can read it.

**Reconcile (the single home of scope-exit wipe + activation):**

```js
// state/reconcile.js — PURE (fixpoint over the small activation graph)
export function reconcile(answers) {
  const inScope = new Set()
  let changed = true
  while (changed) {
    changed = false
    for (const o of registry.all) {
      if (inScope.has(o.id)) continue
      if (!o.activatedBy || evalPredicate(o.activatedBy, answers)) {
        inScope.add(o.id)
        changed = true
      }
    }
  }
  const wiped = registry.all
    .filter((o) => o.wipeOnExit && !inScope.has(o.id) && answers[o.id] != null)
    .map((o) => o.id) // caller DELETES — destroyed, not hidden
  return { inScope, wiped }
}
```

`store.commit` applies the patch, runs `reconcile`, **deletes every `wiped` key**, and
recomputes `readyForQuote`. Cascading retraction converges via the fixpoint (deselect an
addon → its detail obligations leave scope → their data is wiped). This is the one place
scope/wipe can live, which is exactly how the page-owned spine avoids every page
hand-rolling its own scope.

## 5. Worked illustrations

### 5a. Plain page end-to-end — About you (the sole save-blocking mandate)

`fullName` is root (always in scope), `required + saveBlocking`. `pages/about-you/`
declares `collects = [fullName, preferredName, phone, postcode, country, dateOfBirth]`
(the page→obligation binding — the seam). GET renders its bespoke template. POST reads
its payload, runs **its own** validation — only `fullName` blank blocks the save (GDS
error summary + `#fullName-error` + `a[href="#fullName"]`); everything else saves blank —
then `state.commit(request, patch)` (writes down → reconcile), and redirects via
`kit.nextTarget` (`?change=1` → CYA, else `nextInSection`). The hub later calls
`rollUp` over the page's collected ids. **One direction down (commit), one up
(get/rollUp/dispatch).** The mandatory-fields spec passes because page-save blocks on
`saveBlocking` only, while `required` (broader) affects _completion/quote-readiness_, not
page-save — so "progresses with only Full name" still advances.

### 5b. Indexed / repeating — Claims (the add form has no id yet)

`claims` is `cardinality:'indexed'`, `activatedBy hadClaims==='yes'`, `wipeOnExit`. Store
shape: `answers.claims = [{ claimType, claimAmount }, …]`. **Identity is `(claims,
arrayIndex)` minted on commit** — that is the whole answer to "the add form has no id
yet": the add form is a page that, on valid POST, _appends_ and thereby _creates_ the
identity (graft, model-dispatch framing: _instances are a pure function of array length —
no id ledger, no orphans_).

- `list.controller.js` (`GET/POST /claims`): renders "Claim N" rows + Remove links; the
  add button label is page-owned (`rows.length ? 'Add another claim' : 'Add a claim'`);
  POST `action=add` → redirect `/claims/add`; `action=continue` → `nextInSection` (cover).
- `entry.controller.js` (`GET/POST /claims/add`, `/claims/{index}/remove`): valid add →
  `store.appendEntry('claims', entry)` → redirect `/claims`. Until that POST, the draft
  lives only in the payload — never a half-created entry in the store. Graft (registry-
  seam): the add-vs-edit route is stated explicitly at the seam (`index == null` → add).
- **Scope-exit wipe is automatic:** "Change recent claims" → No sets `hadClaims='no'`;
  `reconcile` finds `claims` out of scope → `store` deletes `answers.claims`; the CYA
  shows "Recent claims: No" and no "Claim 1" rows; **Yes→No→Yes** re-enters with a fresh
  empty array (destroyed, not hidden). This _is_ the invalidation spec — guaranteed by the
  state layer; neither controller knows about `wipeOnExit` and so **cannot** rehydrate.

## 6. Shared plumbing without a generic engine

The hazard of a page-owned spine is 12× boilerplate; the wrong cure is a config engine
that calls the pages back. The line held: **shared code is a LIBRARY the page calls,
never a FRAMEWORK that calls the page.** `pages/_shared/kit.js` is small independently-
callable helpers — `errorSummary(fieldErrors)` (pure `{field:msg}` → GDS summary),
`nextTarget(request, page, scope)` (`?change=1` vs `nextInSection`), `pageRoutes(page,
{get,post})` (route glue), `viewContext(...)` (layout/back/breadcrumbs). Each controller
_explicitly_ composes: reads its own inputs, runs its own bespoke validation (cross-field
rules like "excessAmount required only when voluntaryExcess=yes" live here), builds its
own view-model, chooses its own template, and calls kit only for genuinely-uniform
mechanical bits. Guardrails (graft-hardened):

1. **Store API is narrow** — pages get `get/commit/appendEntry/updateEntry/removeEntry`.
   No `store.delete(otherObligation)`, no `setScope`. Scope + wipe are derived by
   `reconcile` only. A page **physically cannot** hand-roll scope-exit wipe.
2. **`activatedBy` is the only home for activation** — a controller `if` mirroring a rule
   is a review smell; the page reads `scope.has(id)`.
3. **`rollUp` is pure + page-agnostic** — the hub calls it; no controller computes status.
4. **kit never renders** — its helpers take/return plain values (maps, strings, route
   arrays); none accepts a template name or field schema. A `kit.renderPage(spec)` is the
   generic engine sneaking back and is rejected. (Graft, model-dispatch: enforce model
   purity + `collects`↔page coverage with boot assertions so drift crashes at startup.)

## 7. Trade-off ledger + KEEP/DROP

| Dimension                 | v1 (config-engine spine)                    | v2 (page-owned spine)                                             |
| ------------------------- | ------------------------------------------- | ----------------------------------------------------------------- |
| Per-page bespoke layout   | impossible without a "bespoke bypass"       | native — every page its own template ✅ the core fix              |
| Copy ownership            | centralised in `flow.json`, rots into logic | in templates, beside the markup ✅ for a design team              |
| File count                | 1 template + 2 config files                 | ~18 controllers + ~18 templates — accepted; each small, greppable |
| "Add a field = data edit" | true only for uniform standard-widget pages | add a def + a field in one template/controller — honest           |
| Scope/wipe/activation     | in the engine, entangled with render        | one pure `reconcile`, decoupled ✅ keeps the good part            |
| Duplication risk          | low (one renderer)                          | real — mitigated by kit-as-library (not eliminated)               |
| Onboarding                | learn engine + config DSL                   | read the page you're changing ✅                                  |

**KEEP** — scope-exit wipe (invalidation spec depends on it; pages can't express it);
obligation activation/relationships (the concept the verdict retains); pure-eval /
side-effecting split (collapsed to one `reconcile` + `store.commit` applying wipes);
reconcile-on-load pruning (runs every commit); four-status roll-up (hub needs it); the
stable-id principle (the `id` string is the store key + DOM field name — but drop the
_separate_ meaningful-name field; the JS const binding is the meaningful reference).

**DROP** — UUID ceremony; `flow.json` owning copy; the generic `page.njk` + type→widget
dispatch; the 21-export contract barrel; i18n dotted reason codes; the mandate-composition
table; the cross-Flow equivalence harness; obligations knowing about pages (inverted:
pages declare `collects`, boot builds the dispatch index).

## 8. Build & verify plan

1. Core (angle-independent): `state/`, `flow/`, `pages/_shared/`, `routes.js`, shell
   (start/hub), layout — with boot coverage assertions.
2. Pages section-by-section; **canary = mandatory-fields spec green** (start→email→
   about-you→vehicle) before fanning the rest.
3. Wire acceptance: add the `obligations-v2-spike` entry to `../../e2e/journey.js`,
   register the plugin in `../index.js`, add `test:obligations-v2-spike` to `package.json`.
4. All three shared specs green (`npm run test:prototype`); plus pure unit tests for
   `reconcile` (single + cascading wipe), `rollUp`, `navigation`, `dispatch` coverage,
   and the claims append/remove/wipe lifecycle.

## 9. Validation rework — no model `type`, controller-owned Joi (revision)

A review steer landed after the design above: **obligations should not carry
presentation-shaped "types", and must not own validation.** This section records how
that was resolved. It is a subtraction _and_ an addition — the model gets thinner while
the validation the model only _implied_ becomes real, in the right place.

**The subtraction — the model sheds `type` and all constraint metadata.** A usage trace
confirmed `type`, `pattern`, `min`, `max`, `maxLength`, `options` and `saveBlocking` were
**near-vestigial**: no runtime code read them. `reconcile`/`status`/`dispatch`/`predicate`
key off `id` / `activatedBy` / `wipeOnExit` / `required` / `requiredAtLeastOne` / `system`
only, and every widget/value-domain was already re-declared literally in the per-page
templates and controllers. So `type` and the constraint fields were **dead duplicates of
presentation** and are removed; `state/obligations/types.js` is deleted. A def now carries
only:

- **identity** — `id` (the store key + DOM field name);
- **mandate facts** — `required` / `requiredAtLeastOne` ("what is _owed_" — a completion
  fact the status roll-up reads; deliberately **distinct** from save-time validation);
- **structural state facts** — `cardinality` + `fields` (the JSON shape of the `claims`
  collection), `system` (`premium`, computed), `renderOnly` (`vehiclePhoto`, never stored);
- **relationships** — `activatedBy` / `wipeOnExit`.

**Q1 — reduce `type` to native-JSON, or drop it?** Dropped entirely. Nothing read it, and
the only honest notion of a value's "shape" that the state layer still needs is expressed
by the structural facts above (`cardinality`/`fields` for the one collection). A single
`type: 'string'` on every scalar would have been ceremony no code consults.

**The addition — a reusable Joi lib the controllers own (`lib/validate/`).** Steer B is
load-bearing: validation is a **controller** concern (and later a mapping-layer concern),
and the _same_ value may be validated differently in different contexts — so it cannot be
a fact stamped on the obligation.

- **Q2 — shape of the validators.** A **flat library of small, named, context-agnostic
  Joi factories** (`requiredText`, `optionalText`, `postcode`, `vehicleReg`, `ukPhone`,
  `oneOf`, `integerInRange`, `currency`, `dateParts`, `maxText`). Each returns a single-key
  `Joi.object({ [name]: rule }).unknown(true)`, so it is greppable, unit-testable in
  isolation, and reusable by a page, a controller or a future transform — none of them
  knows about obligations. Chosen over per-page schema classes (less reusable) and a
  model-derived compiler (re-introduces the config engine v2 exists to avoid).
- **Q3 — the hook / coupling.** Each controller declares **its own** field→validator map
  (`const fields = compose(requiredText('fullName', …), postcode('postcode'), …)`) and
  calls `validate(fields, payload)` on POST. The association lives on the **page side**,
  never on the obligation — the same seam v2 already uses for `collects`. `lib/validate`
  is a **library the controller calls**, never a framework that renders or drives the
  page: no helper takes a template name or field schema and renders.
- **Q4 — the mandate split.** `fullName` is the sole **save-blocking** rule, now an
  explicit controller-owned `requiredText('fullName', 'Enter your full name')` in
  `about-you`. Every other validator is **optional** (blank passes; only malformed
  non-blank input is caught), so "progresses with only Full name" still holds.
  _Completion_-required-ness (`required` / `requiredAtLeastOne`) stays on the obligation
  because the status roll-up and quote-readiness legitimately need "what is owed" — a
  state fact, distinct from save-time validation, which does not live there.

**The Joi → GDS seam is reused, not reinvented.** `validate()` maps Joi's `error.details`
to the exact `{ fieldId: message }` map v2 already speaks; `kit.errorSummary` turns it into
the GDS summary (`a[href="#fieldId"]`) and each govuk macro, given `errorMessage` + a
matching `id`, emits the inline `#fieldId-error`. So `mandatory-fields`' error wiring is
unchanged and DOM parity holds (optional validators never fire on the valid journeys).

**Net crispness:** obligation = identity + relationships + structural flags; validation =
controller + `lib/validate`; presentation = template. Three seams, none overlapping.

## 10. First-class indexed obligations (revision — DISCUSSION-LOG entry 6a)

The original model _tolerated_ one repeating collection (`claims`) as an array-shaped value
the engine could not see: `cardinality`/`fields` were inert, the sub-fields were not
obligations, `reconcile` treated the array as an opaque scalar, and completeness was merely
"≥1 entry exists". Entry 6a promoted indexing to a **modelled concept** without breaking any
of the three seams above. Chosen by a 3-architect/3-judge design panel (unanimous winner:
_recursive-tree_) and hardened by an adversarial-verify pass.

**The model IS a tree.** A collection def carries `collection: true` and a real nested
`item: [...defs]` array of sub-obligations — ordinary pure defs with their own mandate facts:

```js
export const claimType = { id: 'claimType', required: true }
export const claimAmount = { id: 'claimAmount' }
export const claims = {
  id: 'claims',
  collection: true,
  item: [claimType, claimAmount],
  activatedBy: { obligation: hadClaims, equals: 'yes' },
  requiredAtLeastOne: true,
  wipeOnExit: true
}
```

Sub-def ids are **frame-relative** (`claimType`, not `claims.claimType`): the id is the key
inside each entry object (`answers.claims[0].claimType`) _and_ the DOM field name — both
unchanged, which is what makes the re-expression **zero-DOM**.

**One catalogue, reaching every depth.** `registry.all` stays the flat ROOTS array — the view
`contract.test.js` iterates — while two generators reach the whole tree: `walkDefs()` (the
FULL structure-only catalogue, `{ templatePath, def }`) and `walk(answers)` (the tree
MATERIALISED against the data, `{ path, def, collectionAncestorKey }`, once per stored entry).
`byPath('claims.claimType')` resolves any sub-def. So nothing in the model is blind to a
sub-obligation — the finding that motivated 6a — yet the regression net is structurally
untouched.

**Path-addressed scope/wipe/status.** `lib/path.js` is the address vocabulary: a path array
(`['claims', 0, 'claimType']`) with `pathKey` stringifying it (`claims[0].claimType`). The
**depth-0 collapse** (`['claims'] → 'claims'`) is the compatibility keystone — every scalar
`scope.has('claims')` is byte-identical once scope is keyed by path. `reconcile` walks the
per-instance tree once (projected before the fixpoint), keys `inScope` by `pathKey`, and gates
a sub-obligation on its enclosing collection being in scope; `wiped` is path-addressed and
deduped by array-segment prefix (a wiped collection root destroys its subtree). `status`
gained per-item completeness: `entryComplete`/`collectionComplete` mean a claim with a blank
required field no longer counts the section done.

**Dispatch coverage descends — via DERIVED ownership.** Coverage now asserts over `walkDefs()`,
so every obligation at every depth must resolve to exactly one page. A sub-obligation's owner
is DERIVED from its nearest collection ancestor (a collection's items are collected by the
collection's loop). This keeps coverage total and boot-asserted _without_ the collection's
`collects` enumerating its item ids — which is what lets `contract.test.js` stay untouched.
The trade-off (recorded, not hidden): ownership at depth is derived, not declared per field.
An id-safety boot assertion rejects path metacharacters in any def id.

**The loop as a LIBRARY, not a framework (§6 held).** The reusable loop primitive is
`state.collectionView(answers, collectionPath)`, returning pure structural FACTS —
`{ index, path, entry, complete }` — and nothing presentational: no hrefs, labels, copy, row
view-models, template, routes or Joi. It descends by path, so it works at any depth (a nested
sub-hub is `collectionView(answers, ['drivers', i, 'claims'])`). The claims list/entry/CYA
controllers compose ALL presentation themselves; the store facade stays narrow, so a page
still physically cannot hand-roll a wipe. At one flat level the library is near-vestigial —
its justification is the loop-inside-a-loop that entry 6b will exercise.

**Net:** the tree lives in the data (`item`), the addresses live in `lib/path.js`, the
traversal lives in `registry.walk`, and presentation stays entirely in the bespoke
controllers — the three seams remain non-overlapping, now at depth.

### 10.1 Nesting — the loop inside the loop (entry 6b)

The named-driver add-on became an indexed `drivers` collection whose item contains a NESTED
`claims` collection, so the model tree reaches depth 2 (`drivers[i].claims[j].claimType`). The
result that matters: **nesting required no engine change to scope, wipe or dispatch.**
`reconcile.walk` recurses `def.item`, `pathKey` addresses any depth, and `walkDefs` coverage
already descends — so a nested collection is "just more tree". The ONE engine change was making
`entryComplete` depth-aware: an incomplete nested collection must fail its parent entry, while
the mandate (`requiredAtLeastOne`) governs only whether ZERO entries is acceptable.

The store facade gained PATH-ADDRESSED mutation — `appendEntryAt(path, entry)` /
`updateEntryAt(path, i, entry)` / `removeEntryAt(path, i)` — so the same primitives drive a loop
and a loop-inside-a-loop (a nested claim is appended at `['drivers', d, 'claims']`); the
single-level `appendEntry(id, …)` calls are thin wrappers over a depth-0 path, and `updateEntry`
is no longer dead code. Malformed URLs are hardened at the seam: the primitives reject a
non-integer index (a `.../foo/remove` URL must not `splice(NaN)` → destroy instance 0), and the
nested add controller validates its parent index (mirroring the read path) so an out-of-range
`{driver}` cannot fabricate a phantom via the generic `setAt` write.

The **library-not-framework line held at depth 2** — the crux this phase existed to test. The
inner claims sub-hub calls the SAME facts-only `collectionView(answers, ['drivers', d,
'claims'])`; the drivers hub, driver detail and driver-claim controllers each compose their own
bespoke rows and copy. It held by ACCEPTING per-loop bespoke rendering (duplication over a
re-emergent engine), not by a new abstraction — the honest answer to "can the loop be
first-class without a framework" is yes, at the price of that duplication.

### 10.2 Item-scoped conditionality — the item-relative predicate (entry 6c)

A windscreen claim activates a `windscreenProvider` obligation for THAT claim instance only:
`drivers[i].claims[j].windscreenProvider` is in scope iff `drivers[i].claims[j].claimType ===
'windscreen'`. This is the item-relative predicate — the last machinery the model had not
exercised — and it landed by growing RESOLUTION, not vocabulary.

The three-operator vocab (`equals`/`includes`/`present`) is UNCHANGED. `evalPredicate` split into
a pure operator (`applyPredicate`) and a frame-aware resolver: `evalPredicate(activatedBy,
answers, framePath, siblings)` resolves a reference within the current item's frame —
`valueAt(answers, [...framePath, ref.id])` — when the referenced def is one of the node's
`siblings` (the item's own def list it was walked from), else it resolves top-level exactly as
before. `registry.walk` now yields `framePath` + `siblings` for every node; item-relativeness is
INFERRED by object identity (`siblings.includes(ref)`), so the SAME `{ obligation: claimType,
equals: 'windscreen' }` literal — with `claimType` a real sibling def — works at any depth without
a new operator or a marker on the predicate.

Scope-exit wipe is now FIELD-LEVEL within an item: when a claim leaves windscreen, its
`windscreenProvider` is destroyed at that exact path (`deleteAt` on a string leaf deletes the
key), and `wipeOrder`'s sibling/nested ordering — defensive-but-unreachable through 6b — becomes
load-bearing. Completeness uses the SAME sibling-identity criterion: `entryComplete` treats a sub
as owed only when its item-relative gate (evaluated against the entry) holds, so a windscreen
claim without a provider is incomplete while a non-windscreen claim is not. Crucially, both
resolvers share the `siblings.includes(ref)` test, so scope and completeness cannot diverge
toward a false completion (a non-sibling gate is treated conservatively as owed).

**The one documented boundary:** `siblings` carries only the immediate item's forest, so the
model expresses SAME-FRAME conditions only. A reference reaching an ENCLOSING frame
(`drivers[i].claims[j].x` gated on `drivers[i].y`) is unmodelled and would force the first genuine
vocab/model growth — recorded in FINDINGS 6c as the precise edge NOT proven.
