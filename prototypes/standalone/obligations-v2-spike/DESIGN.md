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

```
obligations-v2-spike/
  FINDINGS.md  DESIGN.md  DESIGN-PROVENANCE.md  README.md
  routes.js                     # one Hapi plugin; boot-asserts, registers pages, wraps guard
  index.js  dump.js             # (dump = headless state dump for a fixture)

  state/                        # ── THIN SHARED STATE LAYER (no copy, no render) ──
    obligations/
      types.js                  # type tag constants
      registry.js               # ALL obligation defs — plain data + real JS references
    predicate.js                # evalPredicate(activatedBy, answers) — the tiny vocab
    reconcile.js                # PURE: (answers) -> { inScope:Set, wiped:[] }, fixpoint
    status.js                   # PURE: rollUp(obligationIds, answers, scope) -> status
    store.js                    # in-memory Map; get/commit/appendEntry/updateEntry/removeEntry
    journey.js                  # cookie journeyId, load-or-create, submit-freeze
    quote.js                    # calculatePremium(answers) + makeReference(id)  [system handler]
    index.js                    # the narrow facade pages import

  flow/
    flow.js                     # ordered sections -> pages {id, slug, gate?} — STRUCTURE + GATING only
    navigation.js               # sectionEntry, nextInSection (else hub), changeReturn
    dispatch.js                 # obligationId -> {pageId, slug} built at boot; coverage-asserted

  pages/                        # ── THE SPINE — one folder per page, fully bespoke ──
    _shared/
      kit.js                    # a LIBRARY of helpers (errorSummary, nextTarget, pageRoutes, view ctx)
      layout.njk                # base template (service nav, phase banner, breadcrumbs, back link)
      error-summary.njk         # shared GDS error-summary partial (#id-error, a[href="#id"])
    start/          { controller.js, template.njk }
    hub/            { controller.js, template.njk }   # task-list; owns task titles (page copy)
    email/          { controller.js, template.njk }
    about-you/      { controller.js, template.njk }   # collects fullName (the ONLY save-blocking mandate)
    your-vehicle/   { controller.js, template.njk }
    driving-history/{ controller.js, template.njk }
    claims/         { list.controller.js, entry.controller.js, list.njk, entry.njk }
    cover-type/     { controller.js, template.njk }   # voluntaryExcess Yes reveals excessAmount
    optional-extras/{ controller.js, template.njk }
    addons/         { controller.js, template.njk }   # picker; Continue button
    named-driver/   { who.controller.js, relationship.controller.js, who.njk, relationship.njk }
    modifications/  { describe.controller.js, value.controller.js, describe.njk, value.njk }
    protected-ncd/  { years.controller.js, years.njk }
    quote/          { controller.js, template.njk }   # reads system premium
    check-answers/  { controller.js, template.njk }   # bespoke rows; SOFT-GATE at POST
    confirmation/   { controller.js, template.njk }
```

**The dispatch seam is `flow/dispatch.js`** — _derived_ at boot from every page's
`collects`. Authored source of truth is page-side; the inverse (obligation→page) is
generated and **coverage-asserted** (graft): every non-system obligation resolves to
exactly one page, or boot crashes. This is the crisp resolution of "the model indexes
off to the relevant page" with "the binding lives on the page side": pages declare, boot
inverts, the state layer dispatches through the derived index and never learns a page's
copy or shape.

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
