# L2 — Validation and error-message derivation — A (live-animals) vs B (flow-layer)

Verdict: **B-better** — on the model, not on the mileage. But the win is
narrower than the standing prior expects, and A holds two capabilities B
structurally cannot express.

---

## 0. The honest frame

Neither side is "declarative validation". Both write their rules in JS.
The difference is **which layer each one made data**, and **whether the
rules are addressable**:

| | A (live-animals) | B (flow-layer) |
|---|---|---|
| Scope / conditionality | **DATA** — closed 4-operator DSL (`equals`/`includes`/`notInUnionOf`/`present`), engine-interpreted (`engine/evaluate/predicate.js:12-29`) | **CODE** — `applyTo` is an arbitrary JS closure with `.metadata` (`obligations/obligations.js:10-15`) |
| Completion mandate | **DATA** — `required` (32), `requiredAtLeastOne` (2), `requiredOneOf` (1), `maxEntriesFrom` (1), scope- and depth-aware (`engine/evaluate/complete.js`) | **DATA** — `status: 'mandatory' \| 'optional'`, returned by `applyTo` |
| Save-blocking mandate | **CODE** — Joi `requiredOneOf` at 3 call sites, message hand-typed | **DATA** — `mandatoryToProceed: true` + `errors.required` key on the flow `presents` entry (13 gates, `flow/flow.js:120-127`) |
| Value legality | **CODE, unaddressable** — Joi factories passed as arguments inside 15 controller closures | **CODE, addressable** — 40-entry `Map` keyed by obligation id (`domain/index.js:1150-1194`), + **one data rule-table** (`ADDRESS_SUB_FIELD_RULES`, `:861-871`) covering ~82 of ~113 rendered inputs |
| Error copy | **CODE** — ~54 English literals at call sites, 2 constant maps, no i18n | **DATA** — 100% i18n keys (362 in `locales/en.json`); domain messages derived from the error CODE via a 10-entry dispatch table (`lib/format-domain-errors.js:21-68`); 13 hand-written required messages |
| Summary ordering / anchoring | **CONVENTION** — `Object.entries` insertion order (`shared/kit.js:32-39`); anchors work because field name === input id, hand-wired in 18 `.njk` | **DERIVED** — presents order = descriptor order = DOM order, free; `hrefFor` computes the anchor centrally (`format-domain-errors.js:120-131`) |
| Rules enumerable? | **NO** | **YES** — coverage gate, whitelist gate, i18n-coverage gate, `dump.js` |

A is further along as an app. That is irrelevant here. On the **model**,
the score below ignores the fact that A has upload, submit, persistence
and 22 pages, and asks only: *whose validation mechanism survives contact
with the real requirement set?*

---

## 1. Why B wins

**1.1 Validation is addressable on B and is not addressable at all on A.**
B's rules are entries in a Map keyed by obligation id. That single fact
buys the coverage gate (every obligation must have a domain entry), the
whitelist gate, `dump.js`, a data-dictionary sketch, and the i18n coverage
gate that turns "you added a required field and forgot the copy" into a
red build (`i18n-coverage.test.js:78-87`). On A, a rule exists **only** as
an argument to a Joi factory inside a controller-local closure
(`features/origin/controller.js:26-49`). Nothing in A can answer "what
rules apply to `internalReferenceNumber`?" and no test can assert "every
obligation with a max length enforces it". A cannot have a coverage gate
on validation, because there is nothing to enumerate.

**1.2 Error copy is data on B and code on A.** B externalises 100% of
error copy as i18n keys and derives domain messages from the error code
plus params — 10 templates cover every value rule in the service. A has
~54 English string literals in controllers, zero i18n, zero derivation
(`docs/obligation-model.md:36-42` states the exclusion as an axiom). The
Welsh requirement, when it lands, costs B a `cy.json` plus threading a
locale into `chrome()`; it costs A an extraction project across 15
controllers and 32 templates.

**1.3 B's required-ness is state-aware from ONE static declaration.**
`contract.js:315-322`:

```js
function isSufficientForProceed(obligation, path, value, state) {
  if (effectiveStatus(obligation, path, state) === 'optional') return true
  ...
}
```

One `mandatoryToProceed: true` on the flow entry; the obligations layer
decides, per request, whether it is currently a mandate at all. `regionCode`
is required-to-proceed when `regionCodeRequirement = yes` and silently not
required otherwise — no second rule, no drift. **A structurally cannot get
this from one declaration**, because its two mandate mechanisms never meet:
`required: true` emits no message and blocks no save
(`docs/validation.md:66-97`), and Joi knows nothing of obligations. A
proves the cost itself: `requiredOneOf: ANIMAL_IDENTIFIER_GROUP` is
declared in the model (`features/commodities/obligations.js:109`, drives
hub completeness via `complete.js:19-22`) **and re-implemented by hand with
its own message** (`animal-identification.controller.js:481-486`) to block
the save. The same rule, twice, with no consistency check. That is exactly
the class of duplication that rots in year two.

**1.4 Ordering and anchoring are derived on B, conventional on A.** B's
error summary is in DOM order because the error array is built by
iterating the same descriptor list the page renders
(`contract.js:224-295` → `engine/index.js:248-272` → `shared/page.njk:23`).
Nobody wrote an ordering rule. A's summary is `Object.entries()` insertion
order (`shared/kit.js:33`) with no test pinning it — and **four** of A's
controllers bypass `kit.errorSummary` entirely to hand-build the list in
the order they want (`documents/controller.js:186-202`,
`animal-identification.controller.js:363-377`,
`consignment-details.controller.js:170-173`,
`party-picker.controller.js:76-82`). Five separate
`titleText: 'There is a problem'` constructions exist. That is the
signature of a seam that is too thin.

**1.5 B's conditionality vocabulary is unbounded; A's is four operators.**
`applyPredicate` (`engine/evaluate/predicate.js:12-29`) supports exactly
`equals`, `includes`, `notInUnionOf`, `present`, over one referenced
obligation's scalar value. There is no arithmetic, no comparison, no
length-of. So a mandate like "identification details are required when the
animal count exceeds 100", or "this line is incomplete while its unit count
is below its animal count", **cannot be expressed in A's model at all** —
and the controller escape hatch A recommends
(`docs/obligation-model.md:139-143`, "anything that needs real branching
belongs in a page controller") puts the rule somewhere the engine cannot
see, so the hub tag and the submit gate will disagree with the page. B's
`applyTo` is a closure over `(fulfilments, ids)`: the same rule is one
line, and it automatically drives status, required-ness, rendering and
validation together.

### The B defects that do NOT change the verdict

- **A live WCAG failure.** A blank/partial address that trips
  `mandatoryToProceed` emits `{code:'flow.required', obligation:'commercialTransporter'}`
  with no `subField`, so `hrefFor` produces `#commercialTransporter` — and
  the address widget renders no element with that id
  (`shared/partials/fields.njk:26-40` renders a bare `<div>` plus
  `${id}__${sub}` inputs). Dead summary anchor, no inline error, no error
  outline, on all 3 required addresses. Verified at source. Cheap fix; real
  today.
- **12 of 16 scalar predicates are one-line `stringMaxLength(n)`
  boilerplate** (`domain/index.js:976-980` and 11 identical siblings). B
  invented the data rule-table for address sub-fields and did not
  generalise it to scalars. This is the cheapest available win on either
  side, and it makes B's "validators are code" verdict softer than it looks.
- **No submit gate at all** — the beautifully-declarative group invariant
  (`obligations.js:581-593`) can never hard-block anyone, and its declared
  `errorCode` is dead for message derivation (the CYA controller hardcodes
  a copy key, `features/check-your-answers/controller.js:323-330`).
- **The cross-field predicate primitive (`siblingValue`) has zero live
  users** — a documented design decision (D4) with no instance.

---

## 2. Where A genuinely wins (and it is not nothing)

**2.1 A's model is liftable to data; B's is not, ever.** A's obligation is
a fixed-vocabulary record — which is precisely why
`spec/journey-spec.json` can hold the entire model as JSON, including
`label` + `input{widget,maxLength,pattern,hint,example}` for 39 fields and
a structured `mandate{required,enforcedAt}` (`spec/journey-spec.json:626-632`).
B's `applyTo` and `predicate` are closure bodies: they cannot be
serialised, cannot come out of a spreadsheet, a CMS or a spec generator,
and cannot be diffed by a policy author. B's `.metadata` is a *description*
of the closure, not the closure. If the long-term ambition is
"non-developers change the rules", A's shape is the one that gets there
and B's is a dead end.

The bitter irony is that **A already has the declarative validation data
and does not load it**: no runtime `.js` imports `journey-spec.json`
(verified by grep), so `maxLength: 58` + `pattern: ^[a-zA-Z0-9]*$` for
`internalReferenceNumber` is re-typed by hand into Joi at
`features/origin/controller.js:34-48`. A is one loader away from being
more declarative than B on value legality, and chose not to build it.

**2.2 A can put an error on anything; B can put an error only on an
obligation.** B's pages ARE their obligations: descriptors come from
`presents` (`contract.js:197-213`), `page.njk` renders descriptors,
`validatePagePayload` iterates descriptors, the error record must name an
obligation, and the anchor is derived from it. There is no per-page code
seam — all data-entry routes are generated by three generic controllers
(`routes.js:150-205`). So an error that does not arise from a submitted
payload value of an in-scope obligation has nowhere to live. A does three
of these routinely: cdp-uploader virus-scan rejections in the summary
(`documents/controller.js:186-202`), an anchor to a search box that is not
an obligation (`party-picker.controller.js:76-82` — `#q`), and a
cross-page remediation link (`consignment-details.controller.js:126-145`,
href into another page's card).

**2.3 A's validation can do I/O; B's cannot.** There is not a single
`async`/`await` in B's `contract.js`, `engine/index.js`, `domain/index.js`
or `lib/page-controller.js` (grep), and `domain/index.js` has **no imports
at all** — every country, code and label is a literal array in the file
(`COUNTRY_OPTIONS` at `:531`). B's whole pipeline is synchronous by
signature. A validates inside async Hapi handlers
(`features/origin/controller.js:77-92`) against service-backed lists.
Today A's services are primed and effectively sync, so this is headroom
rather than an exercised advantage — but the moment one rule needs
reference-data over HTTP with a cache miss, B must make `predicate`,
`options`, `engine.validate`, `contract.validatePagePayload` and all three
controllers async, i.e. change the contract of all 40 domain entries.

**2.4 Per-field message override is free on A and impossible in data on
B.** Every A message is a call-site argument. On B, `COPY` is keyed by
`error.code` alone and domain error records never carry `message`
(`format-domain-errors.js:21-68`, `:98`), so a too-long CPH and a too-long
passport render the identical "Enter no more than 58 characters (you
entered 60)". GDS content guidance wants "County parish holding number must
be 58 characters or fewer". A two-line fix, but not achievable in data
today — and it is the one place B's derivation is *worse copy* than A's
hand-written literals.

**2.5 A has a submit gate at all.** `engine/write.js:89-95` re-checks
readiness server-side. It then throws the answer away
(`declaration/controller.js:66` — a silent redirect to CYA, no message,
no named missing obligation, and `check-answers/controller.js` has no
error handling whatsoever). So A has the gate and no message; B has the
messages (CYA prompts) and no gate. Both halves of the same feature, one
on each side.

---

## 3. Third-option shopping list

1. **B's domain registry** (Map keyed by obligation id) — this is the
   single highest-value steal. It buys coverage gates and makes validation
   answerable.
2. **B's `mandatoryToProceed` + `errors.required` on the page/flow entry,
   with `isSufficientForProceed`'s state check** — A already has the
   scope evaluation (`complete.js`); wiring the save-block to it kills the
   `requiredOneOf`-expressed-twice duplication and A's 3 hand-rolled
   required calls.
3. **B's i18n + code-derived messages, PLUS a per-field override**
   (`errors.${obligation}.${code}` before `COPY[code]`) — take the
   derivation, keep A's per-field copy quality.
4. **B's derived anchoring + free DOM-order summary** — but only if the
   render layer is descriptor-driven; retrofitting it onto A's 18
   hand-wired templates buys nothing.
5. **A's data-shaped rule vocabulary** (JSON-liftable, spec-generatable) —
   extended with arithmetic/length operators so the count-drop class of
   rule stops needing a controller. This is the fight: B's closures are
   more expressive *today*, A's DSL is the only one with a route to
   config-authored rules.
6. **A's escape hatch, deliberately** — B needs a per-page hook for
   non-obligation errors (upload, search, page-level rules), accepting that
   every escape is a hole in the introspection story.
7. **Generalise B's `ADDRESS_SUB_FIELD_RULES` shape to scalars** — kills 12
   of 16 predicates with zero loss of expressiveness.

---

## 4. Retrofit

### B's validation into A

Take the registry, the i18n layer and the flow-declared required gate;
**do not** take the render coupling.

- **Rewrite:** the 12 Joi factories become ~40 domain entries keyed by
  obligation id; 53 factory call sites in 15 controllers collapse into
  registry rows; the ~54 message literals become locale keys. Mechanical
  but wide: every controller's `fields()` closure dies, and
  `docs/validation.md` + `docs/add-a-field.md` are rewritten.
- **Free win:** B's `computedEnum` (options as a per-request closure) fixes
  A's known stale-schema bug — A's module-level `oneOf` lists capture the
  stub country/port lists at import time and go stale after real-mode
  `prime()`.
- **Breaks:** A's `errorSummary`/`fieldError` seam is `{field: message}`;
  B's is `{code, obligation, path, subField}`. A's 18 templates hand-wire
  `errorMessage: errors.<field>` and four controllers hand-build the summary
  list. To get B's *derived* ordering and anchoring you need B's
  descriptor-driven render layer — i.e. you replace A's entire template
  layer, not its validators. Retrofitting only the registry + i18n (the
  achievable 60%) leaves ordering and anchoring exactly as conventional as
  they are now.
- **B has no answer for:** cdp-uploader virus-scan errors, the party-picker
  search box (`#q`), `search.controller.js`, the cross-page count-drop
  anchor, or per-field max-length copy. B's error record shape must be
  extended with an `href`/`message` override before any of those can be
  expressed — which reintroduces per-call-site copy and dilutes the i18n
  coverage gate.
- **Also missing:** B has no submit-time gate, so A's `submitJourney`
  readiness check stays as-is (and should finally be given a message).

### A's validation into B

Almost nothing worth moving, and one thing that must move.

- **Don't move:** the Joi library (12 factories, 6 dead in this journey);
  it is strictly less expressive than B's registry, it cannot see scope, it
  would need a nested schema for every address composite, and it would
  regress B's derived ordering/anchoring and its 385-test coverage gates.
- **Do move — the escape hatch.** B needs a `validate(payload, state)` hook
  on the flow page plus an error record that can carry an explicit `href`
  and `message` (~30 LOC across `contract.js` + `format-domain-errors.js`).
  Cost: it ends "all validation is enumerable from data", which is exactly
  the property `obligations/coverage.test.js`, `whitelists.test.js` and
  `i18n-coverage.test.js` rest on. Every hook is a hole in the gate — so
  gate the hook itself (a registry of page rules with declared error codes).
- **Do move — the per-field message override** (A's only copy advantage):
  try `errors.${obligation}.${code}` before `COPY[code]`.
- **Do move — the submit gate and the persist contract.** A's normalising
  validators commit the cleaned value and echo the raw input on error
  (`docs/validation.md:99-132`), pinned by a regression test. B coerces in
  `contract.js:324+` and has no such pin.
- **What breaks:** nothing structural — B's model absorbs all of the above.
  The bill is paid in introspectability, not in rewrites. That asymmetry is
  the real finding: **A's retrofit bill is a rewrite; B's retrofit bill is
  a principle.**
