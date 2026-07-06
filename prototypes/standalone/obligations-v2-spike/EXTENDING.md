# Extending the obligations spike (v2) — worked examples

This is a step-by-step cookbook for extending the journey in the **v2
page-owned-spine** paradigm. Read [`README.md`](README.md) first for the shape of
the spike, and [`DESIGN.md`](DESIGN.md) §10 for the indexed-collection mechanics
example 3 leans on.

> The first two worked examples are the SAME two used in all the sibling spikes'
> `EXTENDING.md` (obligations-standalone-spike, spike-a…d), so the paradigms are
> directly comparable: example 1 adds a **field to an existing page**, example 2
> adds a **whole new page** (its own section, its own hub task). Example 3 is
> unique to v2 — it adds a **first-class indexed collection with an item-scoped
> conditional field** (the DISCUSSION-LOG entry 6 machinery). **All three were
> validated by doing** — each was built on the real code, proven green (unit +
> the shared Playwright walk), then reverted so only this document changed. The
> exact commands, the pins that fired and the counts are recorded in each
> example's "Verification" section.

## How this spike differs before you start

Where v1 and the sibling spikes project rendering, validation and CYA from a
central config, **v2 inverts that**: the page is the spine. So the contrast to
hold in mind is the opposite of every sibling cookbook —

1. **There is no free rendering, and no free CYA row.** Every page is a bespoke
   Hapi GET/POST pair with its own hand-written `.njk` template
   (`features/<feature>/`); there is no generic `page.njk`, no type→widget
   registry, no `presents`/`cyaKey` projection. Adding a field means editing a
   real template and a real controller, and hand-adding a Check-your-answers row
   in [`features/check-answers/controller.js`](features/check-answers/controller.js).
   The upside: everything is explicit and greppable; the cost: more files per
   change. This is the paradigm's whole trade — bespoke pages over a config
   engine.
2. **The model is pure data and never renders.** Each feature owns a
   `obligations.js` of plain-JS defs — identity + structural facts (`collection`,
   `system`, `renderOnly`), mandate facts (`required`/`requiredAtLeastOne`) and
   activation/wipe **relationships** as inert literals over real JS references. It
   carries **no copy, no `type`, no validation**. A per-file boot guard
   ([`obligation-purity.js`](obligation-purity.js)) asserts a feature
   `obligations.js` imports only another feature's `obligations.js` — so a def can
   never reach a view or a request.
3. **Validation is a controller concern.** Controllers `compose` context-agnostic
   Joi validators from [`lib/validate/`](lib/validate/index.js)
   (`requiredText`/`postcode`/`currency`/`integerInRange`/`oneOf`/…) and call
   `validate(schema, payload)`. Nothing in the model knows about it.
4. **The seam is one-directional and boot-asserted.** A page declares the
   obligations it `collects` in its `meta`; at boot
   [`flow/dispatch.js`](flow/dispatch.js) `buildDispatch` inverts those into an
   obligation→page index and **coverage-asserts** it — every obligation at every
   depth must be collected by exactly one page or boot throws. Controllers write
   answers DOWN (`state.commit` / `state.appendEntry`); the engine derives
   scope/wipe/status and hands them UP. There is no `setScope`, no
   `delete(other)` — a page physically cannot hand-roll a wipe.
5. **The discovery mechanism is behavioural, not count pins.** v2 has no "30-name
   catalogue" or "reason-code lockstep" to bump. The one safety net that names
   itself when you extend is [`contract.test.js`](contract.test.js): for each
   collecting page it drives the real POST handler and asserts the set of
   obligation ids the handler COMMITS equals its declared `collects` (minus
   `renderOnly`/`system`). Add a field to `collects` and forget to wire the
   handler — or forget to add it to the contract's synthetic payload — and that
   page's case goes red, naming the file. Run
   `npm run test:obligations-v2-spike` after the model+controller edits and let
   the failure walk you the rest of the way.

## Worked example 1 — a new field on an existing page

> **Add a new question — `mileage` (estimated annual mileage), an optional
> whole-number field with a sensible range — to the Your vehicle page, so it is
> asked on the page, format-validated, shown on Check your answers, committed with
> the journey, and covered by the contract test.**

(The sibling spikes make their mileage field required. Requiredness in v2 is a
one-line mandate fact on the def — the "Variations" section shows the delta.)

### What the paradigm gives you for free

Very little, by design — and that is the honest v2 answer. Because the model
never renders, declaring the obligation buys you **only** the state-layer
behaviour: the field participates in scope, its value is preserved/wiped by
`reconcile` like any other, and (because it is optional) it never moves a task's
status. **Rendering, validation, persistence-wiring and the CYA row are all
authored by hand** — that is the inversion. What you do NOT get is the sibling
spikes' "just declare it and the renderer does the rest".

### The exact steps

**1. Add the obligation def — `features/your-vehicle/obligations.js`.** A pure
one-liner (no copy, no type, no page), added to the feature's `obligations` export so the
registry barrel picks it up:

```js
export const mileage = { id: 'mileage' }
// …add `mileage` to the exported `obligations` array (order is immaterial — the
// contract test and CYA are set-based / hand-ordered).
```

No registry.js edit: `registry.js` already spreads `...vehicle.obligations`, so growing
that array is enough.

**2. Wire the controller — `features/your-vehicle/controller.js`.** Four small
edits in one file:

```js
// (a) declare it collected — feeds the boot coverage assertion
collects: [
  'registration',
  'make',
  'model',
  'year',
  'estimatedValue',
  'mileage',
  'vehiclePhoto'
]

// (b) add a format validator to the page schema (optional → blank still saves,
//     a malformed non-blank value is caught)
const fields = compose(
  vehicleReg('registration'),
  integerInRange('year', { min: 1900, max: 2100 }),
  currency('estimatedValue'),
  integerInRange('mileage', { min: 0, max: 200000 })
)

// (c) seed it in the GET view-model
mileage: answers.mileage ?? ''

// (d) read it in the POST value map (so `state.commit` persists it)
mileage: (payload.mileage ?? '').trim()
```

**3. Render it — `features/your-vehicle/template.njk`.** Add a `govukInput` (the
template already imports the macro):

```njk
{{ govukInput({
  id: "mileage", name: "mileage",
  label: { text: "Estimated annual mileage" },
  hint: { text: "Optional. The number of miles you expect to drive in a year" },
  classes: "govuk-input--width-5",
  inputmode: "numeric",
  value: values.mileage,
  errorMessage: errors.mileage and { text: errors.mileage }
}) }}
```

**4. Add the Check-your-answers row — `features/check-answers/controller.js`.**
CYA is bespoke composition; add one `row(...)` in `buildRows` (the `changeHref`
resolves the owning page through the dispatch seam automatically):

```js
row('Annual mileage', val('mileage'), 'mileage'),
```

That's it for behaviour. **Four files** — the def, the controller, the template,
the CYA. Rendering, validation and persistence are the controller/template edits
themselves (there is nothing central to project them from).

### The pin that then names itself

Running `npm run test:obligations-v2-spike` after steps 1–4 fails **exactly one
test**, and it names its file:

| Pin                                                       | File               | Edit                                                                 |
| --------------------------------------------------------- | ------------------ | -------------------------------------------------------------------- |
| `'your-vehicle' commits exactly its committable collects` | `contract.test.js` | add `mileage: '8000'` to the `your-vehicle` case's synthetic payload |

The contract test drives the real POST handler and now sees `mileage` declared in
`collects` but absent from its payload, so the handler never commits it → the
"declared but never written" direction fails. Supplying it in the payload makes
the set match. **Five files total**: four slice edits + one contract-payload line.

### What you did NOT have to touch

- **No `registry.js`** — it spreads the feature's `obligations`.
- **No `flow/flow.js`, no `flow/dispatch.js`** — the field's owning page already
  exists; coverage derives from the unchanged `collects` list.
- **No engine, status, navigation or hub** — an optional field never changes
  scope, completeness or the section roll-up.
- **No new test file** — the contract pin covers the commit; `lib/validate` is
  tested generically.

### Verification — validated by doing

The steps above were **performed on the real code and proven**, then reverted so
only this document changed:

1. Applied steps 1–4 (the four slice edits). Ran
   `npm run test:obligations-v2-spike` → **1 failed | 106 passed**, the single
   failure being `contract.test.js > 'your-vehicle' commits exactly its
committable collects` — the pin naming itself, exactly as above.
2. Added `mileage: '8000'` to the contract's `your-vehicle` payload and re-ran →
   **107 passed (12 files)**.
3. Ran the acceptance walk for this journey,
   `npm run test:prototype -- -g "page-owned spine"` → **5 passed**. The field is
   optional and the shared walk never fills it, so no spec tolerance is needed
   (unlike a required field — see Variations).
4. Reverted all five files with `git checkout --` and re-ran
   `npm run test:obligations-v2-spike` → **107 passed** again, proving the revert
   exact.

### Variation — make the field required

Add the mandate fact to the def and nothing else in the model:

```js
export const mileage = { id: 'mileage', required: true }
```

Now `mileage` is engine-mandatory: the About-your-vehicle section's status will
read In Progress until it is answered, and `readyForQuote` will not unlock. Two
follow-ons: the validator should reject blank (swap `integerInRange` for a
`compose(requiredText('mileage'), integerInRange('mileage', …))`, or add a
`requiredText` clause), and the **shared happy-path spec must fill it** — teach
the walk in [`../../e2e/journey.js`](../../e2e/journey.js) to complete the field
only when present (`if (await mileage.count()) await mileage.fill('8000')`), run
`npm run test:prototype`, then revert so the other ten journeys are unaffected.

## Worked example 2 — a whole new page

> **Add a new page — `vehicle-security` ("Vehicle security") — as its own task on
> the hub, asking where the vehicle is kept overnight (`parkingLocation`, a
> required radio) and whether a tracker is fitted (`hasTracker`, an optional
> yes/no), so the page is reachable from the hub, navigable, validated, shown on
> Check your answers, gated into quote-readiness, and committed with the
> journey.**

This was **performed live** (see Verification below). The one lesson doing it
surfaced that reading would have missed: making `parkingLocation` a **required**
obligation in an **always-live** section fails every "ready-to-quote" fixture in
the suite, not just the page's own pins — the blast radius is called out in the
pins section.

A page in v2 is a **vertical slice plus three registrations**: the slice
(obligations + controller + template), an entry in the flow, and its appearance
in the two aggregators and the hub.

### What the paradigm gives you for free

- **Routing** — the controller exports its own `routes` (via `kit.pageRoutes`);
  adding it to `allRoutes` in [`features/index.js`](features/index.js) registers
  the GET/POST pair. No central route table derives anything.
- **Navigation** — [`flow/navigation.js`](flow/navigation.js) `sectionEntry` /
  `nextInSection` walk the `sections` array; a one-page section returns to the hub
  on Save with no wiring, honouring any `gate`.
- **Status roll-up** — `sectionStatus` ([`engine/status.js`](engine/status.js))
  computes the section's tag from the obligations its pages `collect`; a required
  `parkingLocation` drives Not started → In progress → Completed for free.
- **Quote gating** — `readyForQuote` requires every non-quote section Fulfilled or
  NA, so the new section counts automatically; the CYA POST re-checks server-side.
- **The scope-exit invariant** — no `appliesWhen` here (the section is
  unconditional), but if you gated it, a gated-out page's data would be wiped by
  `reconcile`, not hidden, like every other obligation.

What is NOT free: the template, the validation schema, the CYA rows, and the hub
task row — all authored by hand.

### The exact steps

**1. Create the slice — `features/vehicle-security/`.**

`obligations.js` (pure defs; `parkingLocation` required, `hasTracker` optional):

```js
export const parkingLocation = { id: 'parkingLocation', required: true }
export const hasTracker = { id: 'hasTracker' }
export const obligations = [parkingLocation, hasTracker]
```

`controller.js` (mirror `your-vehicle/controller.js`): a `meta` with
`collects: ['parkingLocation', 'hasTracker']`, a `fields` schema
(`compose(oneOf('parkingLocation', ['garage','driveway','street']))` — `hasTracker`
is a soft yes/no), a GET `render` seeding values, a POST that `validate`s then
`state.commit`s and redirects via `kit.nextTarget`, and
`export const routes = kit.pageRoutes(page, { get, post })`.

`template.njk` (extends `shared/layout.njk`, includes `shared/error-summary.njk`):
a `govukRadios` for `parkingLocation` (three options) and a `govukRadios` yes/no
for `hasTracker`.

**2. Register the obligations — `registry.js`.** Add the sideways import and spread:

```js
import * as vehicleSecurity from './features/vehicle-security/obligations.js'
// …and `...vehicleSecurity.obligations` in the `all` array (in flow order).
```

**3. Register the routes + dispatch meta — `features/index.js`.** Add
`import * as vehicleSecurity from './vehicle-security/controller.js'`, put
`vehicleSecurity.meta` in `dispatchPages` (so its `collects` join the coverage
assertion) and `...vehicleSecurity.routes` in `allRoutes`.

**4. Add the section — `flow/flow.js`.** A new one-page section in the desired
order (position matters for the hub count — see step 6):

```js
{
  id: 'vehicle-security',
  pages: [{ id: 'vehicle-security', slug: 'vehicle-security' }]
}
```

No `gate` (unconditional). A required field needs no `mandate:"hard"` — v2 has no
page-hard concept; requiredness is the def's `required` fact, enforced by the
controller's validator + the status roll-up + the CYA soft gate.

**5. Add the Check-your-answers rows — `features/check-answers/controller.js`.**
Two `row(...)` lines in `buildRows` (with a `PARKING_LABEL` lookup, as
`COVER_LABEL` does):

```js
row('Overnight parking', PARKING_LABEL[val('parkingLocation')] ?? '', 'parkingLocation'),
row('Tracking device', val('hasTracker') === 'yes' ? 'Yes' : 'No', 'hasTracker'),
```

**6. Put it on the hub — `features/hub/controller.js`.** The hub's three
always-live tasks are the `GROUP_ROWS` literal, and the progress line counts over
`GROUP_ROWS.length`. Add a row:

```js
{ id: 'vehicle-security', title: 'Vehicle security', hint: 'Where the vehicle is kept, tracker' }
```

`sectionStatus` gives its tag and `sectionEntry` its href generically; the
progress line becomes "…of 4 tasks".

**Six files** (one new folder of three): the slice, the registry barrel, the
feature aggregator, the flow, the CYA and the hub. Still no generic renderer, no
type registry, no reason codes.

### The pins and tolerances a walk should then hit

- **Boot coverage assertion (`flow/dispatch.js`, exercised by every test's
  `beforeAll(buildDispatch)`)** — until `vehicle-security.meta` is in
  `dispatchPages`, `parkingLocation`/`hasTracker` are "collected by no page" and
  **boot throws**, failing the whole suite loudly. This is the primary guard that
  the page is wired.
- **`contract.test.js`** — add a `vehicle-security` case (valid payload filling
  both fields) to the `cases` array; it asserts the handler commits exactly
  `['parkingLocation','hasTracker']`.
- **Every "ready-to-quote" fixture in the suite (the blast radius).** This is the
  cost of a **required** obligation in an **always-live** section, and it is
  wider than the page itself: any fixture that expects `readyForQuote === true`
  (or the quote page to appear) now fails, because `parkingLocation` is a new
  in-scope required gap. Building this live turned **four** tests red at once —
  `engine/item-conditional.test.js`, `flow/dispatch.test.js`,
  `engine/indexed.test.js` and `analysis/simulate.test.js` — each fixed by adding
  `parkingLocation: 'garage'` to its ready fixture. (An _optional_ field, as in
  example 1, has none of this reach — it never gates the quote. Example 3's
  collection is optional for exactly this reason.)
- **The shared happy-path spec (`task-list-with-linear-tasks.spec.js`)** — the
  spec does NOT assert the task count or list (it navigates by clicking named task
  links and asserting headings), so an extra hub task is invisible to it — with
  one exception: a **required** new field blocks `readyForQuote`, so the walk's
  `Get your quote` step becomes unreachable. Fix it journey-conditionally (as
  `walkNamedDriver` already branches for the v2 drivers loop): for the
  `obligations-v2-spike` journey only, click the new task and complete
  `parkingLocation` before `Get your quote`. The other ten journeys are untouched.

### What you did NOT have to touch

`engine/` (scope/wipe/status are model-parameterised — a bigger model is a bigger
input), `lib/validate/` (radio/oneOf validators exist), `flow/navigation.js` (the
walkers are generic over `sections`), `shared/kit.js`, and the store facade. The
only "logic" files that change are the hub literal and the CYA composition — both
presentation, which is exactly where v2 says presentation belongs.

### Verification — validated by doing

Performed on the real code, then reverted so only this document changed:

1. Built the slice (three new files) and made the six wiring edits. Ran
   `npm run test:obligations-v2-spike` → **4 failed | 104 passed** — the boot
   assertion and contract case passed, but the four ready-to-quote fixtures above
   went red (the required-field blast radius, exactly as listed).
2. Added `parkingLocation: 'garage'` to each of the four ready fixtures and the
   `vehicle-security` contract case → **108 passed (12 files)**.
3. Added the journey-conditional walk step and ran the shared spec across all
   journeys, `npm run test:prototype -- -g "task list with linear tasks"` →
   **11 passed** (the v2 journey walks the new page; the other ten unaffected).
4. Reverted every new file and edit → back to the baseline suite, green.

## Worked example 3 — a first-class indexed collection with an item-scoped conditional

> **Add a repeating collection — `previousInsurers` ("Previous insurers") — where
> the user adds 0..n insurers, each with a name and a policy number, and — when
> the reason for leaving is "other" — an item-scoped free-text `leavingDetail`
> asked for that entry only. Prove it is first-class: per-instance scope, per-item
> completeness, per-instance and field-level scope-exit wipe, and the loop staying
> a library, not a framework.**

This is the v2-specific example — the DISCUSSION-LOG entry 6 machinery
([`DESIGN.md`](DESIGN.md) §10), modelled directly on the shipped `claims`
collection (and its windscreen→provider item-conditional), which is the reference
implementation to copy. It reuses example 2's page/section wiring (registry,
`features/index.js`, flow, hub, CYA) — the parts below are the
**collection-specific** additions on top. It was **validated by doing** — a real
second collection (`convictions`, with an item-scoped `offenceDetail`) built,
proven green, and reverted (see Verification). The steps below use
`previousInsurers` for narrative continuity; the Verification records the actual
`convictions` build and the one simplification it made.

### The model — a collection is a tree node

An indexed collection is an ordinary def carrying `collection: true` and a real
nested `item: [...defs]` of sub-obligations. The item-scoped conditional is a
sub-obligation whose `activatedBy` references a **sibling** def
(`features/previous-insurers/obligations.js`):

```js
// `hasPreviousInsurers` is a yes/no gating scalar you add (its own page, per
// example 2) — the exact shape `hadClaims` takes for the `claims` collection.
import { hasPreviousInsurers } from '../previous-insurers/gate.obligations.js'

export const insurerName = { id: 'insurerName', required: true }
export const policyNumber = { id: 'policyNumber' }
export const leavingReason = { id: 'leavingReason', required: true }

// ITEM-SCOPED CONDITIONALITY (entry 6c): activated by a SIBLING field within the
// same entry, so it comes into scope for THAT instance only. Same three-operator
// vocab (`equals`/`includes`/`present`) — no new operator, no marker.
export const leavingDetail = {
  id: 'leavingDetail',
  required: true,
  activatedBy: { obligation: leavingReason, equals: 'other' },
  wipeOnExit: true
}

export const previousInsurers = {
  id: 'previousInsurers',
  collection: true,
  item: [insurerName, policyNumber, leavingReason, leavingDetail],
  activatedBy: { obligation: hasPreviousInsurers, equals: 'yes' },
  requiredAtLeastOne: true, // "≥1 entry"; omit for an optional collection
  wipeOnExit: true // deselecting the gate destroys the whole subtree
}

export const obligations = [previousInsurers]
```

Sub-def ids are **frame-relative** (`insurerName`, not `previousInsurers.insurerName`):
the id is the key inside each entry object (`answers.previousInsurers[0].insurerName`)
AND the DOM field name. Ids must be **path-safe** — no `.`, `[`, `]` — or the boot
id-safety assertion in `buildDispatch` throws.

**What the engine now sees for free** (this is the point of 6a): materialised
against the answers, `registry.walk` yields `previousInsurers[0].insurerName`,
`previousInsurers[0].leavingDetail`, … as distinct instances, so `reconcile` gives
per-instance scope + per-path wipe, and `status.entryComplete`/`collectionComplete`
give per-item completeness — a collection with a blank required sub-field no longer
counts the section done. You write **no engine code**.

### The loop UI — two controllers, both bespoke, over one facts-only library

Copy the `claims` pattern exactly ([`features/claims/list.controller.js`](features/claims/list.controller.js)

- [`entry.controller.js`](features/claims/entry.controller.js)):

**The loop hub — `list.controller.js`.** `meta = { id, slug, collects:
['previousInsurers'] }`. Its GET asks the reusable library for the instance FACTS
and composes bespoke rows over them:

```js
const rows = state
  .collectionView(answers, ['previousInsurers'])
  .map(({ index, entry }) => ({
    /* bespoke "Insurer N" row + Remove link */
  }))
```

`collectionView(answers, path)` returns `[{ index, path, entry, complete }]` and
**nothing presentational** — no hrefs, labels or row view-models. The controller
owns all of that. Its POST branches: `action === 'add'` redirects to the entry
sub-page; otherwise `Continue` advances via `kit.nextTarget`.

**The entry sub-page — `entry.controller.js`.** This is the answer to "an add form
has no instance id yet": on valid POST it **appends and thereby mints** the
identity `(previousInsurers, arrayIndex)`:

```js
const postAdd = (request, h) => {
  const entry = { insurerName: …, policyNumber: …, leavingReason: …, leavingDetail: … }
  const { errors } = validate(fields, request.payload ?? {})
  if (errors) return render(h, entry, errors)
  state.appendEntry(request, h, 'previousInsurers', entry) // MINTS the index
  return h.redirect(pagePath('previous-insurers'))
}
// getRemove: state.removeEntry(request, h, 'previousInsurers', Number(request.params.index))
```

`removeEntry` splices the instance (destroying its subtree) then reconciles the
rest — destroyed-not-hidden, per instance. The item-scoped `leavingDetail` reveal
is **bespoke template markup** (mirror the windscreen-provider conditional in
`claims/entry.njk`): render the field and let a stale value be wiped server-side by
`reconcile` when `leavingReason` leaves `'other'` — the field-level wipe fires
WITHIN the entry, at its exact path.

### Dispatch, CYA, flow, contract — the collection specifics

- **Dispatch (`flow/dispatch.js`) is DERIVED at depth.** The list page declares
  only `collects: ['previousInsurers']`; the sub-obligations' owning page is
  derived from their nearest collection ancestor. You do **not** enumerate item
  ids in `collects` — coverage still descends `walkObligations()` and stays total. (The
  recorded trade-off: ownership at depth is derived, not declared per field.)
- **CYA (`features/check-answers/controller.js`)** — bespoke "Insurer N" rows over
  `state.collectionView(answers, ['previousInsurers'])`, only when the collection
  is in scope, exactly like the Claim-N block; surface `leavingDetail` on the row
  only for `leavingReason === 'other'`.
- **Flow + hub** — the gating scalar (`hasPreviousInsurers`) needs a page (example
  2), and the collection is a gated section
  (`gate: (s) => s.inScope.has('previousInsurers')`), reached from the hub. If it
  is an add-on rather than always-live, model it like the `named-driver` section
  (`addon:` + `gate:`), which keeps the shared task-list count unchanged.
- **Contract test (`contract.test.js`)** — a collection's identity-minting write
  happens in the ENTRY (append) handler, not the list page, so add a case shaped
  like the existing claims one: assert `listController.meta.collects ===
['previousInsurers']`, then drive the entry `postAdd` (seeded so the collection
  is in scope) and assert it commits exactly `['previousInsurers']`.

### Nesting it (entry 6b) — a collection inside a collection

To nest (as `drivers` owns nested `claims`), put a collection def **inside**
another's `item`. Nothing in scope/wipe/dispatch changes — `reconcile.walk` and
`pathKey` already recurse, and coverage already descends. The one engine fact that
is depth-aware is completeness (`entryComplete` defers a sub-collection to
`collectionComplete`). The nested sub-hub is the SAME library call one level
deeper: `state.collectionView(answers, ['drivers', i, 'claims'])`, with its own
bespoke controller. See [`features/named-driver/`](features/named-driver/) for the
worked depth-2 case.

### The line, and the one honest limit

The loop stays a **library, not a framework**, but only because each hub
hand-builds its own rows over `collectionView`'s facts — the paradigm accepts
per-loop bespoke rendering rather than growing a shared renderer. A page still
physically cannot hand-roll a wipe (the store facade stays narrow). The one thing
the model cannot yet express is **cross-frame conditionality** — a sub-field gated
on a value in an ENCLOSING frame (`drivers[i].claims[j].x` gated on `drivers[i].y`):
`activatedBy` resolves same-frame siblings only. That would force the first genuine
vocabulary/model growth, and per the spike's brief that growth is itself the
finding (FINDINGS 6c).

### What you did NOT have to touch

`engine/reconcile.js`, `engine/status.js`, `lib/path.js`, `registry.js`'s
`walk`/`walkObligations` — the collection is "just more tree", so scope, per-instance and
field-level wipe, per-item completeness and coverage-at-depth all descend with no
new engine code. Everything you write is the model def, the two bespoke loop
controllers + templates, and the CYA/flow/hub wiring shared with example 2.

### Verification — validated by doing

Built a real second collection, `convictions` (item
`[offenceCode, offenceDate, offenceDetail]`, where `offenceCode === 'other'`
activates the item-scoped `offenceDetail`), then reverted so only this document
changed:

1. Created the slice (five files: obligations, list controller + `.njk`, entry
   controller + `.njk`) and the wiring (registry, `features/index.js`, flow, hub,
   CYA, plus a `convictions.test.js` proving per-instance item scope, per-item
   completeness and field-level wipe for the new collection). Ran
   `npm run test:obligations-v2-spike` → **111 passed (13 files)** first time —
   the boot coverage assertion accepted the collection (its sub-obligations'
   ownership derived from the list page), the "committed by the entry append
   handler" contract case passed, and the three new unit tests passed. **No
   ready-fixture blast radius** (the collection is optional → an empty section is
   Fulfilled → the quote is never gated by it — the deliberate contrast with
   example 2).
2. Added a journey-conditional walk step and ran the shared spec across all
   journeys → **11 passed**: the v2 journey opens the convictions loop, adds an
   "other" conviction (which reveals the item-scoped `offenceDetail`), and
   completes — rendering the loop hub, the entry sub-page and the conditional
   reveal live. The other ten journeys are unaffected.
3. Reverted every file → baseline suite green.

**The one simplification** (honest, so the go-read is not wishful): the validated
collection was modelled **ungated + optional**, so the collection-level
`activatedBy` gate and `requiredAtLeastOne` — shown in the def above — were not
exercised by this build. They are byte-identical to the shipped `claims`
collection (`activatedBy: { obligation: hadClaims, equals: 'yes' }`,
`requiredAtLeastOne: true`), which the existing suite already covers. What this
build proved fresh is the part that was NOT already proven: that the **item-scoped
conditional + per-instance scope/wipe/completeness generalise to a second
collection** with no new engine code.
