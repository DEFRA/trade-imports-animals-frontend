# EUDPA-249 — what's next

This file is a hand-off for whoever picks up next (human or fresh
agent). It captures where the spike is, the six agreed to-do items,
the recommended order, and the design calls that need resolving before
you can execute each. Two follow-on items (Joi adoption + data
dictionary MD) are parked for after the V4 buildout.

---

## Where we are — session handoff (last updated 2026-07-15)

**Spike status: COMPLETE.** The V4 slice is fully wired, two
spec-vs-code audits + one ultrareview pass have run and closed
their findings, the canonical reference (`obligations.md`) has
absorbed `RECOMMENDATION.md`, and the branch is at a natural
hand-off point. Any next work is a new session's call.

**Branch:** `spike/EUDPA-249-flow-layer`. Latest pushed commit:
`50a771d` (ultrareview bug_001 — CYA line-scoped labels use
ordinal not raw id). No uncommitted changes. 121 commits ahead
of `main`.

**Tests:** 572 spike tests across 23 files, all green. Playwright
2/2 pass.
Run: `npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

**Browsable demo:** `npm run dev` (auth defaults off in dev), then
<http://localhost:3000/prototype/eudpa-249/start>.

**Where to start reading:** [`obligations.md`](./obligations.md)
is the single source of truth (~3350 lines — architecture,
obligations model, domain layer, flow, runtime primitives,
contract seam, browsable prototype, files table, running the
spike). This file (NEXT.md) covers current-state + deferred /
clarification-blocked / deprioritised items.

**Reviewer rule:** the user reviews locally before pushing. Commit
freely; do NOT push without an explicit go-ahead.

### What landed since the last handoff

**Step 5 (V4 spec verification) completed across iterations 5a–e,
plus a mandate-model refactor and the composite-widget UX polish
bucket. Step 5's exit criterion — "the V4 spec is faithfully
represented across obligations, domain, and flow" — is met.**

- **Step 5a** (`d8b800c`) — V4 spec conformance sweep on identifier
  caps + CPH: `stringMaxLength` values tightened to spec-exact
  limits on the six unit identifier obligations (passport, tattoo,
  earTag, horseName, identificationDetails, description) and on
  `cph`. Conservative defaults replaced with the values the V4
  Confluence page 6497338582 quotes.
- **Step 5b** (`e34484b`) — group invariant "at least one animal
  identifier per unit-record". New engine primitive
  `groupInvariantErrors` reads `unitRecord.requires.anyOf` and emits
  a domain error per unit missing all identifiers. First cross-record
  predicate in the model — pattern documented in
  `docs/add-an-obligation.md`. CYA surfaces the error inline;
  page-save happy path unchanged.
- **Step 5c** (`7a9e54b`) — 2 missing obligations added for V4
  completeness (`poApprovedReferenceNumber`,
  `responsiblePersonForLoad`) declared but NOT presented in the flow
  (system-populated upstream — `KNOWN_UNWIRED` records why). Plus 2
  enum spec expansions: `meansOfTransport` gains rail; `portOfEntry`
  gains the four remaining V4 ports.
- **Step 5d** (`08366f6`) — `animalsCertifiedFor` semantic overhaul.
  The obligation is a lookup by certificate type (upstream MDM), not
  a static enum. Stubbed as `staticEnum` for now with a doc comment
  explaining the eventual lookup pattern; enum entry retained so the
  page still renders. `NEXT.md` and `RECOMMENDATION.md` had
  narrative on a hypothetical "lookup pattern" primitive — both
  scrubbed of that speculation in `839d4fd`.
- **Step 5e** (`be9ab56`) — expand the standard address block from
  4 sub-fields to the V4 spec's 9 (name, addressLine1,
  addressLine2, addressLine3, town, postCode, country, telephone,
  email). Per-sub-field rules land in `subFieldRules`
  (`maxLength`, `emailFormat`, `enum` for country). All 8 address
  obligations updated; the address widget dispatch and CYA
  formatter handle every rule uniformly.
- **Mandate audit — interpretation A** (`f622981`) — audited every
  page against the V4 spec's "Mandatory to submit" vs "Mandatory to
  proceed" distinction. Renamed the flow flag
  `mandatoryToSaveAndContinue` → `mandatoryToProceed` across 26
  refs / 9 files (mechanical). Corrected 7 pages under-enforced +
  3 addresses whose parent-level mandate now holds the fort;
  removed the flag from `countryOfOrigin` (M-to-submit per spec).
  `addressBlock` predicate rewritten to validate only user-supplied
  sub-fields (interpretation A) — blank sub-fields no longer fire
  page-save required errors. `isComplete(value)` added on the
  entry for CYA to consult structural completeness.
- **Address blank-save + structural completeness on task list**
  (`bd87413`) — user bug report: transporter address rejected an
  intentionally blank save. Fixed by dropping `mandatoryToProceed`
  from all 3 M-to-proceed address entries; `hasFulfilment` in the
  engine now consults `domain.get(id).isComplete(value)` for
  address obligations so the task list shows "In progress" for
  partial-but-not-complete addresses rather than "Completed".
  **Partially reverted in a later commit** after the spec-vs-code
  audit clarified "Mandatory to proceed" (V4 spec column) DOES mean
  page-save-blocked. The three M-to-proceed addresses
  (`commercialTransporter`, `privateTransporter`, `contactAddress`)
  now block blank AND partial page saves via a new
  `isSufficientForProceed` helper in contract.js that consults
  `isComplete` for addresses. The other 5 addresses stay M-to-submit
  under Interpretation A (save-blank-allowed + CYA prompt on
  incompleteness).
- **POST-error input preservation** (`4818fee`) — user bug report:
  entering an invalid address then hitting Save wiped every field.
  Traced to the POST-error re-render pathway reading stored
  fulfilment rather than the submitted values. Now threads
  `result.values` into `buildFieldDescriptors` across all three
  page controllers (`page-controller`, `line-page-controller`,
  `unit-page-controller`). Widget renders the user's typed value
  on error, not the last-stored value.
- **2nd code-review deferred bucket cleared** (`389f2f0`) — the
  six composite-widget UX polish items (#3, #9-#13) that had been
  carried on the pending list:
  - #3 address-widget hint has `aria-describedby` + id on hint
  - #9 non-address composite renders as `JSON.stringify` not
    `[object Object]`
  - #10 aggregate error state (`govuk-form-group--error` wraps
    fieldset when any sub-input errors)
  - #11 address legend uses `govuk-fieldset__legend--m`
  - #12 non-string sub-field values now render via `String()`
    coercion (defensive; no live obligation exercises it)
  - #13 `formatDomainErrors` only extends anchors with
    `__${subField}` for known address-family error codes

### Current model / architecture state

- **Three layers proven end-to-end** (Obligations · Domain · Flow),
  browsable at `/prototype/eudpa-249/*`.
- **Contract seam** (`contract.js`) — browser layer only reads model
  through it. Enforceable by grep:
  `grep -rn "from '../engine\\|from '../domain\\|from '../flow" features/ lib/ | grep -v contract`
  should return nothing.
- **Domain factories:** `staticEnum`, `computedEnum`, `predicate`,
  `addressBlock` (composite widget). Plus the `transitedCountries`
  composite (built inline).
- **Runtime primitives:** `pageStatus`, `containerStatus`,
  `journeyState`, `firstApplicablePage`, `firstUnfulfilledPage`,
  `firstUnfulfilledPageForLine`, `firstUnfulfilledPageForUnit`
  (depth-2, new in iter 9), `firstPagePresentingObligation`,
  `optionsFor`, `validate`, `expandPresents`.
- **Feature folders:** `hub`, `check-your-answers`,
  `commodity-lines`, `units` (new in iter 9), `start`, `reset`.
- **URL shapes:** flow pages at `/pages/{name}`; per-line at
  `/lines/{lineId}/{name}`; per-unit at
  `/lines/{lineId}/units/{unitId}/{name}`. Bespoke UX at `/lines`
  and `/lines/{lineId}/units`.
- **KNOWN_UNWIRED** in `obligations/coverage.test.js`: 4 entries.
  Two structural group containers (`commodityLine`, `unitRecord`)
  that carry no value directly, and two system-populated fields
  added during step 5c (`poApprovedReferenceNumber`,
  `responsiblePersonForLoad`) whose value legality is enforced
  upstream and which therefore have no domain entry AND no flow
  presence. Step 4's stated exit criterion — "docs stabilise +
  `KNOWN_UNWIRED` shrunk to zero or to obligations that legitimately
  need no domain entry" — is met. Step 5's V4-spec-verification
  exit criterion is also met.
- **Mandate model:** `mandatoryToProceed: true` on a flow presents
  entry blocks page save (the page-save contract). For scalar
  obligations the gate is `!isBlankValue(value)`; for address
  (composite) obligations the gate is
  `domainEntry.isComplete(value)`, so blank AND partial addresses
  both fail — matches the V4 "Mandatory to proceed" semantic that
  the whole page must be complete. `obligation.status: 'mandatory'`
  drives the submit-mandate rollup — CYA emits a prompt if a
  mandatory obligation is in scope but unfulfilled (spike-wide) and
  the hub's section rollup consults it. The two flags are
  independent: an M-to-submit field can be blank at page save; an
  M-to-proceed field must be complete at page save. Three obligations
  are M-to-proceed for addresses (commercialTransporter,
  privateTransporter, contactAddress); the other 5 addresses are
  M-to-submit.

### Step 4 iterations completed

1. `containsUnweanedAnimals` (new subsection)
2. `regionCodeRequirement` + `regionCode` (added to origin
   subsection; both wired in one iteration)
3. `portOfEntry` (arrival subsection)
4. `species` + `presentsForEach` page-routing unlock (line-scoped;
   turned on the `routes.js` path that previously skipped
   presentsForEach pages)
5. `numberOfAnimals` (line-scoped integer + per-species cap cross-
   field predicate — first predicate that emits a NEW failure code,
   so the doc now covers the en.json + `FORMAT_ERROR_KEYS` + COPY
   dispatcher trio to add per new code)
6. `commodityType` (line-scoped static enum with 4 illustrative
   MDM values — cheapest possible line-scoped-enum iteration,
   proves the pipeline settles once i18n + line-major
   infrastructure are in place)
7. Address blocks — Phase A + Phase B. Phase A introduced the
   composite `addressBlock` domain factory, new `address` widget
   rule, per-sub-field payload gathering in `validatePagePayload`,
   per-sub-field error anchors + inline errors, CYA multi-value
   formatting, and a comma-joined summary for the composite value.
   `commercialTransporter` wired as the first worked example.
   Phase B wired the remaining 7 depth-1 address blocks
   (`privateTransporter`, `placeOfOrigin`, `consignor`, `consignee`,
   `importer`, `placeOfDestination`, `contactAddress`) — all use
   the same `addressBlock(obligation, { subFields, required })`
   factory. New "Trader details" section on the task list; task
   list grew from 10 → 13 subsections.
8. Accompanying-document block — 4 obligations sharing a
   `branchedGate` applyTo, one page in a new
   `accompanying-documents` subsection under References. First
   worked example of `branchedGate` + multi-obligation page.
9. `permanentAddress` — first depth-2 obligation. Three-phase:
   engine + state + contract plumbing (Phase A); units UX +
   routes (Phase B); domain + flow wiring (Phase C). New
   `per-unit-records` subsection under commodity-lines.
10. Six remaining unit-scoped obligations wired atomically:
    `passport`, `tattoo`, `earTag`, `horseName`,
    `identificationDetails`, `description`. First wired
    `allowListedByPredicate` obligations; helpers.js metadata
    upgraded to expose the predicate.

Each iteration also refined `docs/add-an-obligation.md`.

### Step 5 iterations completed

1. **5a** — tighten identifier caps + CPH to spec-exact values.
2. **5b** — group invariant "≥ 1 identifier per unit-record" (first
   cross-record predicate; `groupInvariantErrors` engine primitive).
3. **5c** — 2 missing V4 obligations (`poApprovedReferenceNumber`,
   `responsiblePersonForLoad`) declared but not presented; 2 enum
   expansions (`meansOfTransport` gains rail, `portOfEntry` gains 4
   more V4 ports).
4. **5d** — `animalsCertifiedFor` semantic overhaul (stubbed as a
   staticEnum with a lookup-pattern note in the code; the real
   values come from a certificate-type lookup once integrated).
5. **5e** — expand standard address block from 4 sub-fields to 9
   (V4 spec: adds addressLine2, addressLine3, telephone, email,
   plus per-sub-field `maxLength` / `emailFormat` / country `enum`
   rules).

### Known limitations still open

- **Optional-only completion — display-layer question is parked.**
  The model rule is settled: `pageStatus === F ⇔ every in-scope
mandatory entry is fulfilled`. An in-scope-optional page is F
  immediately. A residual UX question — "should the user visit an
  optional-only page before we call it Complete?" — is parked under
  P0 below. See `engine/index.test.js` "optional-only page" case.
- **Add commodity lines** subsection maxes at FULFILLED as soon as
  ≥ 1 line exists (add step done when there's a line). Reverts to
  NOT_STARTED if the user deletes all lines. Fine as-is.
- **`animalsCertifiedFor` is a stubbed static enum.** The real V4
  values come from a certificate-type lookup (MDM). Stepped in as a
  staticEnum with a doc comment; the eventual pattern is the same
  async-fetch question the other MDM enums share.

### Deferred pending upstream integration

Real work that only makes sense once the corresponding integration
is real. The spike ships the current shape and flags the gap here
so it's picked up on hand-off rather than lost. Both cite audit
findings raised MAJOR then deferred with cause.

- **Contact Address gov.identity variant.** V4 spec has TWO
  Contact Address rows — one where the value is consumed from
  `gov.identity` ("If more than one address exists, the user must
  select one before continuing") and one where the user enters an
  address directly. The spike models only the user-entered variant
  (`contactAddress` obligation, `addressBlock` factory). Adding the
  gov.identity variant requires either (a) a new
  `contactAddressSource` predecessor obligation that branches into
  a select-from-multiple-pre-filled-addresses widget, or (b)
  treating pre-fill as an upstream fulfilment like
  `responsiblePersonForLoad` (which is on `KNOWN_UNWIRED`). Pick
  when gov.identity integration is real. Audit finding #10 (MAJOR).
- **Commodity code search widget.** V4 spec: "Search supports
  common name, species (scientific name) and commodity code." The
  spike renders `commodityCode` as an 8-option `staticEnum`
  (govukSelect). Under the real MDM commodity list this becomes an
  autocomplete-search picker with three parallel search indexes
  (common / scientific / code). Real work: MDM feed + a new widget
  dispatch shape in `lib/field-widgets.js` (currently
  radios / select / checkboxes / date / input — needs a
  `search-select` variant). Pick when the MDM commodity list feed
  is real. Audit finding #13 (MAJOR).

### Spec clarifications needed before implementation

Recorded as blockers on future implementation rather than as code
work — the spike can't fix them without input from the PO / spec
authors. Raise these with EUDPA-249 stakeholders before the real
build starts.

- **`commodityType` scope semantic.** V4 spec row 44 says "Where
  applicable for given commodity, user is able to filter species by
  type." Ambiguous between two readings:
  1. Type is COMMODITY-GATED — for some commodities Type is
     mandatory-to-proceed, for others it's out-of-scope entirely.
     Would need `anyAllowListed(commodityCode, TYPE_APPLICABLE_
COMMODITIES, ...)` and a defined applicable-commodity list.
  2. Type is ALWAYS in-scope; the phrase describes a UX
     affordance — Type acts as a filter over the species
     multi-select downstream.
     Spike currently models reading 2 (unconditional mandatory field).
     Comment at `obligations/obligations.js:420` flags the ambiguity.
     Audit finding #12 (down-graded MAJOR → INFO pending clarification).
- **`commodityType` MDM value list.** V4 spec gives one example
  (`Game`) but no full enumeration; the ontology comes from an MDM
  source that isn't documented on the V4 page. Current values are
  `game` (the one spec example) plus two OBVIOUS PLACEHOLDERS
  (`PLACEHOLDER 1 — real values come from MDM`, `PLACEHOLDER 2 — real
values come from MDM`) — the earlier plausible-looking stubs
  (meat-producing / dairy-producing / breeding-stock / other) were
  removed after they slipped past the audit unquestioned. The
  placeholders scream "not real" on demo screenshots. Audit finding
  #12; a domain-test regression guard fires if the copy ever softens
  back into plausible values.

### Deprioritised audit findings

Lower-severity items from the 2026-07-14 spec-vs-code audit that
have been consciously deprioritised (rather than forgotten).
Grouped by disposition so a re-audit sees prior context and
doesn't re-litigate. Every entry cites the audit finding number so
the full detail is traceable in
`workareas/eudpa-249-spec-audit/findings.md` (gitignored — the
audit output lives out of the tree by design).

**No action needed — spike already correct**

- **#18 reasonForImport label copy** — spec `Transhipment or
onward travel` matches en.json; no drift.
- **#22 address block country list** — audit noted the general
  COUNTRY_OPTIONS list is used for address blocks. That IS
  correct scope for address blocks (any country can appear on an
  address). The related audit finding for countryOfOrigin (#5,
  EU/EEA/EFTA restriction) landed in `aa5a979`.
- **#30 regionCode cap** — spec says max 5, code enforces max 5
  via `stringMaxLength(5, regionCode)`. Match confirmed.

**Deferred to real implementation — needs data / flag we do not model**

- **#19 permanentAddress "same as destination" affordance** —
  spec: "Can set the permanent address to be the same as the
  place of destination." No copy-across UX in the spike; needs a
  per-unit copy-address button on the permanent-address page.
  Add during the real UX build.
- **#20 commercialTransporter NI restriction** — spec: "If a
  trader creates a new commercial transporter, it is restricted
  to NI." Requires a "user-created vs MDM-picked" flag on the
  obligation, which the spike does not model.
- **#21 transporterAuthorisationNumber NI-only visibility** —
  spec: "Only displayed when a user manually creates a
  commercial transporter from NI." Same underlying "user-created +
  NI" flag as #20. Currently shown unconditionally.
- **#24 address email format check** — currently a `.includes('@')`
  heuristic; spec says `string (email, max 254)`. Swap to a real
  email validator at implementation time.
- **#25 address telephone format check** — currently max-length
  only; spec doesn't specify a format. Confirm E.164/MSISDN
  expectation with PO at implementation time.
- **#26 portOfEntry MDM stub** — 8 stub port codes; real list
  from the MDM live-animal-ports feed. Same async-fetch pattern
  as `animalsCertifiedFor`.
- **#27 species enum + max-selections** — stubbed species list
  without scientific names; no max-selections cap. Both need
  MDM data + a per-obligation cap value from PO.

**Deferred to content design / user research**

- **#28 Section IA grouping** — the spike groups V4 fields into
  6 sections / 17 subsections. The spec is a flat list — the
  grouping is a spike-chosen information architecture. Content
  design / UR review before implementation.
- **#29 Hand-authored legends + hints** — the spec provides field
  names but not question wording. Legends and hints in
  `locales/en.json` are hand-authored. Content design review
  before implementation.

**Waiting on PO confirmation**

- **#17 purposeInInternalMarket "Sale/gift" vs "Sale or gift"** —
  spec value is `Sale/gift`; en.json renders `Sale or gift`
  (semantically identical). Cosmetic — confirm with PO which
  wording to ship.
- **#23 address required-at-save vs CYA** — the spike's five
  M-to-submit addresses (placeOfOrigin, consignor, consignee,
  importer, placeOfDestination, permanentAddress) allow blank
  save + surface a CYA prompt if incomplete (Interpretation A).
  Confirm with PO that CYA-prompt-only is acceptable, or wire
  required-at-save equivalently to the M-to-proceed three
  (audit MAJORs #7-9 landed in `14c1354`).

**Actionable but deprioritised — small copy improvement**

- **#16 regionCode hint** — spec: "Displayed and stored with ISO
  country prefix derived from Country of Origin." en.json hint at
  line 147 says "Up to 5 characters. For example, FR-75." — no
  mention of the auto-derived prefix. Suggested update: "We add
  the country prefix from your country of origin. Enter up to 5
  characters." Ship in the next presentation-polish commit.

### Immediate next candidates

Steps 4 and 5 are complete. P0 is now resolved. Playwright cross-
variant harness landed as a self-contained suite in this branch (see
`e2e/` folder + `playwright.config.js`). Next work is four checks
whose combined output should tell us whether the spike is a faithful
representation of V4 and whether the code stands up to scrutiny.
Recommended order: **2 → fix any issues → 1 → 3 → 4**.

- **Check 2 — Spec-vs-code audit** (see §Checks 1-4 below). Fetch
  the V4 Confluence page (id 6497338582), spawn a `general-purpose`
  research subagent, produce a findings table (per-field:
  spec → code → issue → severity). Triage, cluster fixes by
  category, land them one cluster per commit. **Do this first —
  fixes here shift the surface a code review would land on.**
- **Check 1 — Code review by another agent.** After the audit
  fixes land, run `/ultrareview <this-branch>` for the multi-agent
  cloud review. Local `code-review` subagent is a lighter first
  pass if you want a warmup.
- **Check 3 — Compare against an alternative implementation.**
  The parent-layouts branch (`spike/EUDPA-249-prototype-layouts`)
  hosts 11 variants; pick one (or all) to line up against ours.
  Structural comparison — not a merge target.
- **Check 4 — Output schema sanity check.** Given the target
  output schema (TBD; user will supply), confirm that the current
  model can produce a compliant payload from the spike's fixtures.

Parked, still available if the above surface nothing urgent:

- **P0.5 — Welsh locale threading.** Infrastructure done; needs
  the request → `t()` locale param plumbing plus `cy.json`.
- **Add a second variant to the Playwright JOURNEYS array.**
  Data-driven off `e2e/journey.js`; extending is a single entry
  plus small guards inside the fill helpers.

**Long-parked** (unchanged): P1 Joi adoption; P2 data dictionary
MD artefact. See below.

### Checks 1-4 — how to execute each

**Check 2 — Spec vs code audit.**

- Sources:
  - Spec: fetch via
    `tools/confluence/page.sh 6497338582 json | jq -r '.body.view.value' | node tools/confluence/html_to_md.js > workareas/eudpa-249-spec-audit/v4-spec.md`
  - Code: `obligations/obligations.js`, `domain/index.js`,
    `flow/flow.js`, `locales/en.json`
- Fan-out: one `general-purpose` subagent, one pass. Structured
  output to `workareas/eudpa-249-spec-audit/findings.md`.
- Output shape: findings table (Field · Category · Severity · Spec
  says · Code says · Fix), plus a matched-fields checklist, plus a
  KNOWN_UNWIRED sanity block, plus a "coverage gaps in the audit
  itself" block.
- Categories: missing, extra, wrong-cap, wrong-enum, wrong-mandate,
  wrong-condition, presentation-drift, address-block.
- Severity: BLOCKER (data-integrity fail) / MAJOR (semantic drift) /
  MINOR (wording) / INFO (deliberate stub).
- Fix cycle: cluster by category, one cluster per commit.

**Check 1 — Code review by another agent.**

- Preferred: `/ultrareview <branch>` — user-triggered, multi-agent,
  billed, thorough. Land after Check 2 fixes so review budget isn't
  spent on soon-to-change code.
- Alternative: local `code-review` subagent for a lighter warmup.
- Do NOT run this while any Check 2 fix is in-flight.

**Check 3 — Comparison with alternative implementation.**

- Target branch: `spike/EUDPA-249-prototype-layouts`. Hosts:
  - 4 model-spike variants (a-d): declarative selectors, statechart,
    rules engine, schema-first
  - `obligations-standalone-spike` and `obligations-v2-spike`
  - Standalone flattenings of a-d
- Fetch specific files via
  `gh api repos/DEFRA/trade-imports-animals-frontend/contents/<path>?ref=spike/EUDPA-249-prototype-layouts --jq '.content' | base64 -d`
- Comparison dimensions: how each represents scope (applyTo vs
  statechart guards vs schema when-clauses), how each drives page
  rendering (contract seam vs shape descriptor vs FSM), what tests
  it ships, cost-of-change for adding a V4 field.
- Deliverable: `workareas/eudpa-249-alternative-comparison/notes.md`
  — structural comparison, not a merge target. Cherry-pickable
  fragments called out separately.

**Check 4 — Output schema sanity check.**

- Blocked on user supplying the target output schema.
- When supplied: fixture-in, schema-out validation loop. For each
  named fixture under `fixtures/`, produce the payload the schema
  expects, run it through a validator, report drift.
- Likely also: extend `dump.js` with a `--schema` flag that emits
  the schema-shaped payload alongside the current internal-state
  dump.

Read [`obligations.md`](./obligations.md) end-to-end before
doing anything — it explains the three-layer architecture, the
contract seam, the browser layer, tests + convention that prove the
mapping, the env gate, and the v2 backlog. This NEXT.md assumes you
have.

## Path map

```
prototypes/journey-config-spikes/EUDPA-249-flow-layer/
├── routes.js                        Hapi plugin
├── contract.js                      The seam — browser ↔ model
├── dump.js                          Headless proof (CLI + report())
├── controller-sketch.js             JOI composition sketch (historical)
├── data-dictionary-sketch.js        Dictionary builder — feeds to-do 5
├── obligations.md                   Canonical reference (merged in RECOMMENDATION.md 2026-07-15)
├── PLAN.md                          Original spike plan (historical)
├── NEXT.md                          This file
├── integration.test.js              Cross-cutting integration test
├── sketches.test.js                 Sketch tests
├── contract.test.js                 Contract seam tests
├── dump.test.js                     Dump snapshot tests
├── routes.test.js                   Hapi server.inject integration tests
├── obligations/                     Forked from EUDPA-277 (step 1)
│   └── {obligations,evaluator,helpers}.js + *.test.js
├── engine/                          Runtime primitives
│   └── index.{js,test.js}
├── flow/                            Flow declarations
│   └── flow.js
├── domain/                          Layer 1.25 constraint declarations
│   └── index.{js,test.js}
├── features/                        One folder per bespoke UX concern
│   ├── hub/                         Task list
│   ├── check-your-answers/          CYA
│   ├── commodity-lines/             Bespoke Add-another UX
│   ├── start/                       Landing redirect
│   └── reset/                       Session reset
├── lib/                             Cross-feature utilities
│   ├── page-controller.js           Generic GET/POST factory
│   ├── build-field-descriptors.js
│   ├── field-widgets.js
│   ├── format-domain-errors.js
│   ├── presentation.js
│   └── state.js
├── shared/                          Cross-feature templates
│   ├── layout.njk
│   ├── page.njk
│   └── partials/{fields,error-summary}.njk
├── fixtures/                        Named fulfilment fixtures
└── docs/                            Topic-per-file (feeds to-dos 4-6)
```

The parent EUDPA-277 obligations spike lives at
`prototypes/model-spikes/obligations-v4-model/`. It's unchanged; we
forked its source + tests into `./obligations/` during step 1 and now
consume the local copy exclusively.

The parent-layouts branch `spike/EUDPA-249-prototype-layouts` has the
14-function `contract` interface, four alternative model-spikes (a-d),
`obligations-standalone-spike`, and shared scaffolding. **Reference
only** — not a merge target, cherry-pick fragments as needed.

## The six to-dos (in recommended order)

### 1. Inline the obligations spike into our directory structure ✅ DONE

Forked `obligations.js`, `evaluator.js`, `helpers.js`, and their tests
(`evaluator.test.js`, `evaluator.units.test.js`, `helpers.test.js`)
from `prototypes/model-spikes/obligations-v4-model/` into
[`./obligations/`](./obligations/). The parent folder is unchanged; the
fork is now our source of truth. Documented in `obligations.md`
§Context.

**Verification passed:** 345 tests green
(spike + forked-obligations); 632 existing frontend tests unaffected.
`grep -rn "obligations-v4-model"` returns only doc pointers.

**Not forked:** `obligations.md` (150-page canonical doc), `GAPS.md`,
`RECOMMENDATION.md`, `TODO.md` — all historical EUDPA-277 records;
they stay in the parent folder and are referenced by path.

### 2. Restructure the folder layout for clarity and discoverability ✅ DONE

Done in a single commit — see the git log for `refactor(EUDPA-249):
feature-first folder layout inspired by obligations-v2-spike`. Every
file moved with `git mv` where possible so `git log --follow` traces
history through the reshape. No behaviour change.

**What landed:**

- Dropped `browser/` folder — top-level `routes.js`, `contract.js`,
  `dump.js` at spike root.
- New folders: `engine/` (was `runtime.js`), `flow/` (was `flow.js`),
  `domain/` (was `domain.js`), `features/{hub,check-your-answers,commodity-lines,start,reset}/`,
  `lib/` (browser JS), `shared/` + `shared/partials/` (templates),
  `fixtures/`, `docs/`.
- Every bespoke UX concern (hub, cya, commodity-lines, start, reset)
  has its own folder with `controller.js` + optional `template.njk`.
  Generic form pages stay flow-driven from
  `flow/flow.js` + `lib/page-controller.js` + `shared/page.njk` — no
  per-page feature folder.
- Vision + Nunjucks path in `src/config/nunjucks/nunjucks.js` now
  points at the spike root so `h.view('shared/page')` and
  `h.view('features/hub/template')` both resolve.
- `src/server/router.js` import switched from
  `browser/plugin.js` to `routes.js`.

**Design questions resolved:**

- Per-feature template vs shared generic: **kept the generic**
  (`shared/page.njk`) for every static form page; only bespoke
  features get their own template.
- Whether to keep `browser/` as a folder name: **dropped it**.
- Whether `domain/` splits or stays as one file: **kept as
  `domain/index.js`** (single file inside the folder). Ditto
  `engine/index.js`. A per-primitive split under `engine/` (page-status,
  container-status, navigation, etc.) is available as a follow-on
  polish; deferred.

**Verification passed:** 345 spike tests + 632 existing frontend tests
green. Browsable walk still works at
http://localhost:3000/prototype/eudpa-249/start.

Original detail preserved below for context; the "Approach" and
"Design questions to resolve during this to-do" sections apply to
future restructures if similar work happens again.

---

**Original why:** doing it before everything downstream (Joi call,
docs, V4 scale-up) means every follow-up references stable paths.
Doing it after (1) means the parent-spike files are already local and
can be moved cleanly.

**Reference:** the `obligations-v2-spike` folder on the parent-layouts
branch —
<https://github.com/DEFRA/trade-imports-animals-frontend/tree/spike/EUDPA-249-prototype-layouts/prototypes/standalone/obligations-v2-spike>.
That spike organises a car-insurance journey by **feature-first
folders**, with per-topic docs, an explicit `engine/` / `flow/` /
`lib/` / `shared/` split, and test files named for what they prove.
We adopt the shape, not the domain content.

**Fetch specific files:**

```bash
gh api repos/DEFRA/trade-imports-animals-frontend/contents/<path>?ref=spike/EUDPA-249-prototype-layouts \
  --jq '.content' | base64 -d
```

Key files to read first: `README.md`, `docs/architecture.md`,
`docs/add-a-field.md`, `docs/add-a-page.md`, `features/index.js`,
`features/about-you/{controller,obligations,page,template}.*`,
`engine/index.js`, `flow/flow.js`, `shared/kit.js`, `routes.js`.

#### Target layout

```
prototypes/journey-config-spikes/EUDPA-249-flow-layer/
├── README.md                    Root entrypoint — brief + pointers
├── RECOMMENDATION.md            (unchanged) — design record
├── NEXT.md                      (this file) — hand-off
├── routes.js                    Hapi plugin (was browser/plugin.js)
├── contract.js                  The seam (was browser/contract.js)
├── config.js                    Spike config wrapper (env flag reader)
├── dump.js                      Headless proof (was browser/dump.js)
├── obligations/                 Inlined from to-do 1
│   ├── obligations.js
│   ├── evaluator.js
│   ├── helpers.js
│   └── *.test.js
├── engine/                      Runtime primitives, per-concern files
│   ├── index.js                 Re-exports the public runtime API
│   ├── page-status.js
│   ├── container-status.js
│   ├── journey-state.js
│   ├── navigation.js            firstApplicable / firstUnfulfilled / firstPresenting
│   ├── expand-presents.js
│   ├── options.js               optionsFor()
│   └── *.test.js                Named per-concern
├── flow/                        Flow declarations + gate helpers
│   ├── flow.js                  Section/subsection/page tree
│   ├── section-status.js        Rollup helpers referenced by controllers
│   ├── navigation.js            Cross-section navigation glue
│   └── *.test.js
├── domain/                      Layer 1.25 — split by concern
│   ├── index.js                 Manifest keyed by obligation id
│   ├── enums.js                 staticEnum / computedEnum entries
│   ├── predicates.js            V4 predicates (dates, string lengths, arrays)
│   ├── labels.js                Domain-side labels (COUNTRY_LABELS etc.)
│   └── *.test.js
├── features/                    One folder per subsection
│   ├── index.js                 Registers every feature with the router
│   ├── country-of-origin/
│   │   ├── controller.js        The Hapi handler(s)
│   │   ├── obligations.js       Re-exports the obligations this feature presents
│   │   ├── page.js              Local flow declaration (presents entries)
│   │   ├── template.njk         Per-feature view when non-generic
│   │   └── *.test.js
│   ├── reason-for-import/
│   ├── purpose/
│   ├── transporter-type/
│   ├── transporter-details/
│   ├── transport-details/
│   ├── transited-countries/
│   ├── arrival-at-port/
│   ├── animals-certified-for/
│   ├── internal-reference/
│   ├── commodity-lines/         Bespoke Add-another UX lives here
│   │   ├── list.controller.js
│   │   ├── add.controller.js
│   │   ├── delete.controller.js
│   │   ├── list.njk
│   │   ├── obligations.js
│   │   ├── page.js
│   │   └── *.test.js
│   ├── hub/                     Task list
│   ├── check-your-answers/
│   ├── start/                   Landing redirect
│   └── reset/
├── lib/                         Utilities shared across features
│   ├── build-field-descriptors.js
│   ├── field-widgets.js
│   ├── format-domain-errors.js
│   ├── presentation.js
│   ├── state.js                 yar wrappers
│   └── *.test.js
├── shared/                      Templates + shared kit
│   ├── layout.njk
│   ├── error-summary.njk
│   ├── partials/
│   │   └── fields.njk
│   └── kit.js                   Nunjucks env helpers if any
├── fixtures/                    Named fulfilment fixtures for dump + snapshots
│   ├── empty.json
│   ├── internal-market-partial.json
│   └── transit-with-lines.json
└── docs/                        Topic-per-file — feeds to-do 5 & 6
    ├── README.md                Doc index + reading order
    ├── architecture.md          Three-layer + contract seam
    ├── obligation-model.md      Layer 1 explained (extracted from RECOMMENDATION.md)
    ├── domain-model.md          Layer 1.25 explained
    ├── flow-and-gates.md        Layer 2 explained + how subsections roll up
    ├── engine.md                Runtime primitives + reference
    ├── validation.md            Joi vs non-Joi + how predicates work
    ├── persistence.md           yar session shape + reset behaviour
    ├── analysis.md              Introspection primitives (data dictionary)
    ├── testing.md               Test taxonomy + mutation-walkthrough index
    ├── decisions.md             Design record (short entries per decision)
    ├── limits.md                Known gaps + explicit non-goals
    ├── features.md              Per-feature index (auto-generated by dump)
    ├── add-a-field.md           How-to (to-do 6)
    ├── add-a-page.md            How-to (to-do 6)
    └── add-a-subsection.md      How-to (to-do 6)
```

#### Adopt from v2-spike (structural)

1. **Feature-first co-location.** All four concerns of one user-facing
   thing (obligations declaration, page config, controller, template)
   live in the same folder. Add / rename / delete a feature = touch
   one folder. Directly attacks discoverability.
2. **`engine/` split per primitive.** Break `runtime.js` into named
   files under `engine/`. Each primitive is one file with its own
   test. `engine/index.js` exposes the public API so `contract.js`
   imports look the same.
3. **`docs/` as a first-class folder** with a `README.md` index. Each
   topic gets a short file (~200-500 lines max). No file mixes
   architecture with how-to.
4. **`shared/` + `lib/` split.** `shared/` = cross-feature templates
   and Nunjucks helpers. `lib/` = cross-feature JS (widgets, error
   mapping, state). Feature folders import from either freely.
5. **Test files named for behaviour** where it clarifies (e.g.
   `engine/resume-self-heal.test.js`), and test files mirroring
   source where the source is one unit (`engine/page-status.test.js`).
6. **`features/index.js` as a registry** — every feature module
   exports its route set; the router imports them via the index and
   composes. Adding a feature is one line in `index.js`.
7. **Contract tests at root level** (`contract.test.js`) that pin the
   seam's public shape independent of any feature.

#### Do NOT adopt from v2-spike

- **Domain content** — car-insurance-specific (claims, cover-type,
  no-claims-discount, quote). Our features come from the V4 spec.
- **`analysis/reachability` / `analysis/simulate`** — defer to a
  future ticket; not needed for the current spike shape.
- **`t1-*` / `t2-*` prefixed test files** — those look ticket-scoped
  and don't match our current naming convention. Skip until a real
  reason surfaces.
- **`registry.js` if `features/index.js` already covers it** — pick
  one convention.

#### Migration plan (one PR, one commit)

The move is mechanical — no behaviour change. Keep it in one commit
so `git log --follow` on any moved file gives a clean trail. Break the
164 tests only briefly (during the intermediate commit); the pre-push
tests must be green.

1. **Scaffold empty folders** — `mkdir -p engine flow domain features
lib shared/partials fixtures docs obligations` — in one step so
   nothing looks half-done.
2. **Move files with git mv** so history follows:
   - `browser/plugin.js` → `routes.js`
   - `browser/contract.js` → `contract.js`
   - `browser/dump.js` → `dump.js`
   - `runtime.js` → `engine/index.js` (initially a re-export shim;
     split later within the same commit into per-primitive files)
   - `flow.js` → `flow/flow.js`
   - `domain.js` → split into `domain/index.js` + `domain/enums.js` +
     `domain/predicates.js` + `domain/labels.js`
   - `browser/field-widgets.js` → `lib/field-widgets.js`
   - `browser/format-domain-errors.js` → `lib/format-domain-errors.js`
   - `browser/build-field-descriptors.js` → `lib/build-field-descriptors.js`
   - `browser/presentation.js` → `lib/presentation.js`
   - `browser/state.js` → `lib/state.js`
   - `browser/templates/*` → `shared/*` (layout, error-summary,
     partials/fields) and per-feature `template.njk` where the
     template is feature-specific.
   - `browser/fixtures/*` → `fixtures/*`
   - controllers → `features/<name>/controller.js` per subsection
     (see the target layout above).
3. **Split domain and runtime** into their per-concern sub-files
   in-commit. Keep `domain/index.js` and `engine/index.js` exporting
   the same public API.
4. **Rewrite imports** everywhere. Use `node --check` on every
   moved file plus `npx eslint prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
   to catch unresolved specifiers.
5. **Update three files outside the spike:**
   - `src/config/nunjucks/nunjucks.js` — swap the Vision + Nunjucks
     path from `browser/templates` to `shared` (plus per-feature
     folders if we teach it to walk `features/*/template.njk`; the
     simpler alternative is copying feature templates into a single
     `shared/features/<name>.njk` and using name-based lookup — pick
     the cleaner one during the move).
   - `src/server/router.js` — plugin file moved to `routes.js`; update
     the dynamic-import path.
   - `.claude/settings.local.json` / any local scripts referencing the
     old paths.
6. **Update RECOMMENDATION.md** file-map section with the new tree
   and every path reference. Update the paths in this NEXT.md too.
7. **Run the full test suite.** All 164 spike tests + 632 frontend
   tests green. Manual walk in browser at /prototype/eudpa-249/start.

#### Commit style

One commit: `refactor(EUDPA-249): feature-first folder layout inspired
by obligations-v2-spike`. Body enumerates the moves so `git log
--stat` on the commit shows the reshape at a glance. No behaviour
change.

#### Verification

- `npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/` → 164 green.
- `npx vitest run --exclude 'prototypes/**'` → 632 green.
- Manual walk of the browsable journey at
  http://localhost:3000/prototype/eudpa-249/start (same behaviour).
- `grep -rn "from '../runtime.js'\|from '../domain.js'\|from '../flow.js'"
prototypes/journey-config-spikes/EUDPA-249-flow-layer/features/` → zero
  hits (features go through `contract.js` only).

#### Design questions to resolve during this to-do

- **Per-feature templates vs generic + per-feature JSON copy.** The
  v2-spike puts a `template.njk` in each feature folder. We currently
  use one generic `page.njk` for every static form page. Options:
  - Keep the generic; move it to `shared/page.njk`. Feature folders
    only have `template.njk` if the feature is _bespoke_
    (commodity-lines list, hub, cya). Recommended — the generic path
    is a real invariant we don't want to give up.
  - Or duplicate the generic per feature. Simpler discovery but
    dilutes the "one place to change" story.
- **Whether to keep `browser/` as a folder name.** v2-spike does
  everything at the root. I'd drop `browser/` — it added a level
  without carrying meaning.
- **Whether `domain/` splits or stays as one file.** If the split
  drives duplication, keep the single `domain.js`. If it aids
  navigation (my expectation), keep the split.

### 3. Mutation walkthrough + coverage-gap closure ✅ DONE

Written up in [`docs/testing.md`](./docs/testing.md). Five mutations
applied, each with recorded diff, failing-test list, sample error
output, and invariant claim. Two of the five originally exposed
coverage gaps, which were closed in the same session by new test
files:

1. **Rename an obligation** → 9 test files fail with `ReferenceError`
   at module load.
2. **Change enum options** → 4 tests fail across model, integration,
   HTTP layers.
3. **Widen a whitelist** → NOW 1 test fails in
   [`obligations/whitelists.test.js`](./obligations/whitelists.test.js)
   (34 tests covering all 7 commodity-code-scoped whitelists).
4. **Flip a scope-gate predicate** → 15 tests fail across 6 files —
   the strongest evidence of "provable via tests".
5. **Add an unwired obligation** → NOW 1 test fails in
   [`obligations/coverage.test.js`](./obligations/coverage.test.js)
   (3 tests; a `KNOWN_UNWIRED` allow-list carries the 26 obligations
   that step 5 will wire during V4 buildout).

**Both round-1 coverage gaps closed** by
[`obligations/whitelists.test.js`](./obligations/whitelists.test.js) and
[`obligations/coverage.test.js`](./obligations/coverage.test.js).

**Round 2** ran six more mutations against deeper invariants:
category classifier, domain-manifest key alignment, structural
`within` references, page-`presents` alignment, `within` deletion,
duplicate obligation `name`. Five fired existing tests correctly; one
(duplicate name) exposed a new gap, closed by two new uniqueness
assertions in `coverage.test.js`. Two cross-mutation wins: the
round-1 closure tests independently caught round-2 mutations they
weren't designed for.

**Round 3** ran five more mutations against corners: duplicate page
name in flow, manifest reorder, circular `within` self-loop,
`allowListed` helper inversion, subtle presentation-copy change.
Findings:

- Circular `within` **hangs the test suite** rather than failing —
  worse than uncaught. Closed by a cycle-detection test in
  `coverage.test.js` that fires in 3 ms.
- Subtle presentation-copy change slips through (only obvious changes
  are caught). **Deferred as UX-review territory** — snapshot tests
  or per-entry equality would fire on false positives.
- Manifest reorder confirmed safe (no-op), matching the doc claim.

Baseline now **15 test files, 385 tests, all pass** (started at
13/345 before round 1, 15/382 after round 1, 15/384 after round 2,
15/385 after round 3). Full detail in
[`docs/testing.md`](./docs/testing.md). Across three rounds and 16
mutations, four gaps found, three closed, one deferred to UX review.

**Follow-on for step 5:** the `KNOWN_UNWIRED` allow-list in
`obligations/coverage.test.js` should shrink as V4 buildout adds
domain entries. Delete the entry, add the domain rule.

**Original detail — the 5 candidate mutations from planning stage —
preserved below in case future work wants to expand the walkthrough.**

---

**Original why (kept for context):** high-signal artifact for the
"provable via tests" claim. Cheap once (1) and (2) are settled — needs
stable file paths.

**Why third:** high-signal artifact for the "provable via tests"
claim. Cheap once (1) and (2) are settled — needs stable file paths.

**Deliverable:** `prototypes/journey-config-spikes/EUDPA-249-flow-layer/docs/mutation-walkthrough.md`
(new `docs/` subfolder — first doc lives there).

**Five mutations to record** (adjust to reality; these are candidates):

1. Rename `reasonForImport` in `obligations.js` → domain.js + flow.js
   fail at import; every test file that imports it fails; catches
   drift instantly. (Screenshot / paste the vitest error output.)
2. Change `PURPOSE_BY_REASON['internal-market']` value list in
   `domain.js` → `domain.test.js` "computedEnum — purpose" cases
   fail; `browser/plugin.test.js` option-filtering assertion fails.
3. Widen `PACKAGE_COUNT_COMMODITIES` whitelist in `obligations.js` →
   `browser/contract.test.js`, `integration.test.js`,
   `browser/dump.test.js` snapshot deltas.
4. Flip `purposeInInternalMarket` `applyTo` gate predicate (e.g.
   remove the "internal-market" branch) →
   `integration.test.js` "task-list rollup" and `browser/plugin.test.js`
   "page visibility" cases fail.
5. Add a new required singleton obligation with no domain entry, no
   presents entry, no presentation copy →
   `data-dictionary-sketch.js coverageReport()` shows it missing;
   `dump.test.js` snapshot missingRequired changes.

For each, record: mutation, expected failure output, one-liner
reasoning about what that proves. Aim for ~200 words per mutation.
Total document ~1200 words.

**Verification:** the doc's own claims are correct — apply each
mutation, run the tests, screenshot / paste the failure. Revert.

### 4. "How to add X" docs + coverage test — iterative

**Why fourth:** freezes the extension pattern (with the restructure's
target layout) before the V4 buildout scales it. Directly parallels
the `docs/add-a-collection.md`, `add-a-field.md`, `add-a-page.md` set
in the v2-spike reference.

**Step 4 is iterative, not a one-shot doc.** Each iteration:

1. Pick a real target — one new obligation, page, or subsection.
2. Follow the docs as they stand today (or write the first-cut skeleton
   if this is iteration 1).
3. Implement the target — obligation entry, domain, presentation,
   flow, tests.
4. Fold "what actually happened" back into the docs — worked example
   sections, gotchas, refinements.
5. Verify: `npx vitest run` + `npm run dev` and click through.
6. One atomic commit per iteration.

Iteration 2 finds where iteration 1's docs fell short. By ~iteration
3-4 the docs are honest; iteration 5+ is pure step-5 scale-up done
under docs that already work.

**Step 4 iterated enough delivers a substantial chunk of step 5.**
The line between them blurs. When the docs stabilise and the coverage
test's `KNOWN_UNWIRED` list has shrunk to zero (or to obligations
that legitimately need no domain entry), step 4 is complete and step
5's remaining scope is whatever full V4 hasn't been touched yet.

**Recommended first iteration:** add `containsUnweanedAnimals` as a
single page in a new subsection under the existing `arrival` section.

- Yes/No enum, notification-level, always-mandatory. Simplest domain
  shape (`staticEnum(['yes', 'no'], { labels: ... })`).
- Currently in `KNOWN_UNWIRED` — removing it is a satisfying exercise
  of step 3's coverage machinery.
- New subsection exercises subsection-level plumbing without also
  inventing top-level section copy.
- Docs land as first-cut `docs/add-an-obligation.md`.

**Suggested later iterations** (rough order of increasing complexity;
the docs get refined at each):

- 2 — obligation with a **predicate** (e.g. `regionCode` — max-5
  string, conditional on `regionCodeRequirement`).
- 3 — obligation with a **computed enum** (options depend on another
  obligation).
- 4 — obligation that **presents on an existing page** rather than a
  new one.
- 5 — full **address block** (composite widget — pressures the
  widget dispatch table).

By iteration 5 we'll have hit every current domain factory shape and
pressured the widget dispatch table, which is exactly the shape step
5 was going to be anyway. If a real certificate integration lands
before then, add a `lookup-result`-style iteration to design the
async-fetch pattern against the real API.

**Coverage test already partially exists.**
[`obligations/coverage.test.js`](./obligations/coverage.test.js)
(added in step 3) asserts every obligation is either wired to a
domain entry or on the `KNOWN_UNWIRED` allow-list. Step 4's coverage
test just extends it — currently the allow-list carries ~26 entries
for the V4 buildout to whittle down. Each iteration removes at least
one entry.

**Deliverables at the end of step 4 (however many iterations):**

- `docs/add-an-obligation.md` — refined by real use.
- `docs/add-a-page.md` — probably a shorter doc that references the
  obligation doc for the shared checklist steps.
- `docs/add-a-subsection.md` — likewise.
- ~5-10 new obligations properly wired, matching whichever iterations
  we ran.
- `KNOWN_UNWIRED` shrinking towards zero.

**Verification:** at each iteration, the browsable walk includes the
new page(s); every test file green; `KNOWN_UNWIRED` entry count
strictly decreases.

### 5. Build out the full V4 journey (was to-do 7)

**Why sixth:** the big scale-up. Pattern is settled by then; execution
is mechanical.

**Approach:** iterate the V4 spec (Confluence page 6497338582)
top-to-bottom. For each field:

1. Confirm it's already an obligation in `obligations.js` (many are).
2. Add a domain entry if there's non-trivial legality (max lengths,
   multi-select caps, date formats).
3. Add a `presents` entry on the right page + subsection in
   `flow.js`. Add presentation copy if the default humanised name
   doesn't cut it.
4. Update fixtures if needed for `dump.test.js` snapshots.

**Watch for design pressure:**

- **New widget shapes** — standard-address-block, file-upload,
  multi-line textarea, telephone. Extend `field-widgets.js` with a
  new rule per shape.
- **Cross-record predicates** — "≥ 1 animal identifier per unit" is
  the big one. Not a per-record predicate; a per-group one. Might
  require a small runtime extension (`validateGroup(group, state)`)
  or a new domain-entry shape (`groupPredicate`). Discuss before
  implementing — this is a real design decision.
- **Structural groups** — the parent branch has `presentsForEach`
  handling for user-driven-indexed groups; our v1 skips them. Line
  iteration is already deferred to v2 (see §Commodity-lines UX
  in `obligations.md`). If the full V4 spec requires unit
  records (per-animal identifiers), we'll need to promote `presentsForEach`
  routing generation from bespoke `line-controllers.js` to a
  generalised `pagesForEach` primitive at the flow layer. That's the
  same v2 work; it becomes non-optional at this point.

**Verification:** every V4 field in the spec has a corresponding
obligation + domain entry + `presents` reference; the coverage test
from (5) passes; the browsable journey walks every subsection to F.

### 6. Code reviews (was to-do 8)

**Not a single event — stage them.** After each of (3), (4), and a
bigger review after (5). Each of those milestones is small and
self-contained. Trying to review the whole thing at the end guarantees
drift.

Suggested review checklist per milestone:

- Contract seam not bypassed — nothing in `features/*` or `lib/*`
  imports directly from `engine/index.js`, `domain/index.js`, or
  `flow/flow.js`; everything goes through `./contract.js`. Enforce via
  `grep -rn "from '../engine\|from '../domain\|from '../flow" features/ lib/ | grep -v contract`
  returning nothing.
- 345+ tests still green.
- New tests added for new behaviour.
- Prettier + eslint pass.
- RECOMMENDATION.md + docs updated to match reality.

## Parked — pick up after step 5 (V4 buildout)

Four items intentionally deferred until the V4 buildout has run and
its outcomes are visible.

### P0. Optional-only page/subsection UX — RESOLVED (2026-07-13)

**Outcome:** the model gained a fifth status value, `Optional`.

The old alphabet was 4-way (NA / NS / IP / F). An untouched
optional-only page hit F vacuously ("no mandatory unfilled" was
vacuously true), so the task list read "Completed" without the user
having engaged. That was model-correct but read as false confidence.
The new alphabet extends the classifier to 5 values:

- **NA** — no obligations in scope.
- **NS** — at least one mandatory concern in scope, nothing filled.
- **Optional** — only optional obligations in scope, none filled.
- **IP** — at least one mandatory concern still unsatisfied, some
  obligation filled.
- **F** — either only optional in scope and ≥ 1 filled, or every
  mandatory concern satisfied.

The same 5-way classifier runs at page, container, and journey level
(`classifyEntries` in `engine/index.js`). At container level it re-
derives over the subtree's in-scope obligations rather than rolling
up child statuses; the old empty-session clamp goes away as a
consequence.

**Design decisions locked in:**

1. **Navigation.** `firstUnfulfilledPage` skips Optional pages (same
   as F). The Optional tag surfaces the invitation to visit; `/start`
   and Continue don't force it.
2. **Journey-level rollup.** Same classifier. In practice V4 has
   mandatories somewhere in every journey, so `journeyState` will
   never actually return Optional — but the rule is written for
   symmetry with page/container.
3. **No visited-plumbing.** Engagement is measured by fulfilment
   count, not by a per-session visited flag.
4. **Tag colour.** `govuk-tag--turquoise` — distinct from NS (blue)
   and IP (light-blue).

**Documentation:** the full alphabet + design notes live in
`docs/add-an-obligation.md` §Status alphabet — page, container,
journey.

**Landed in commit(s):** engine + hub controller + i18n +
`docs/add-an-obligation.md` update in one commit; test suite grew
564 → 566 (two new engine tests covering Optional at page + container
level). Two e2e-walk assertions updated to expect Optional tags on
purely-optional subsections whose walk deliberately skipped them
(previously vacuously-F).

### P0.5. Spike-wide multi-language (Welsh) support — IN PROGRESS

**Chosen convention:** translation-key + locale JSON. `lib/i18n.js`
exports `t(key)` which resolves against `locales/en.json` via a
dotted-path lookup. Missing keys return the raw dotted-path (visible
red flag in the UI). `hasKey(key)` is used by
`i18n-coverage.test.js` — a build-time gate that walks every
key-carrying source and asserts each key resolves. Welsh support
adds `locales/cy.json` + a locale getter reading from request; no
declaration-site changes needed.

**Progress:**

- ✅ Flow structural — section/subsection `titleKey` on every node;
  `errors.required` on countryOfOrigin submit-mandate.
- ✅ `lib/presentation.js` — `OBLIGATION_KEYS` + `PAGE_KEYS`, all 22
  obligation entries + the commodity-lines-intro page-copy entry.
  `forObligation()` / `pageCopy()` resolve to strings internally, so
  consumers are unchanged.
- ✅ Domain enum labels — `COUNTRY_LABELS`, `SPECIES_LABELS`,
  `YES_NO_LABELS`, `ANIMAL_TYPE_LABELS`, plus the 6 inline
  `labels: {...}` blocks (reasonForImport, purposeInInternalMarket,
  transporterType, portOfEntry, meansOfTransport, commodityCode).
  Values are now message keys; consumers at `lib/field-widgets.js`
  and `features/check-your-answers/controller.js` wrap
  `labels[value]` in `t()`. Coverage test walks the domain manifest
  and asserts every label key resolves.
- ✅ `lib/format-domain-errors.js` COPY table — dispatchers pick a
  key + supply params via `t()`. Parameterised messages
  (`{max}` / `{actual}` etc.) handled by a `{name}` interpolator
  added to `lib/i18n.js`; missing params render as `{name}` in the
  output as a visible bug signal. New `FORMAT_ERROR_KEYS` export
  drives the coverage test; a new `lib/i18n.test.js` pins the
  resolver + interpolator semantics.
- ✅ Hub controller chrome — pageTitle / heading / lead, progressLine
  variants, status tag copy (per-status keyed lookup) and both
  hub-template strings (`'Check your answers so far'`,
  `'Reset the demo'`) all via `t()`. Bucket:
  `hub.pageTitle`, `hub.heading`, `hub.lead`, `hub.progress.*`,
  `hub.status.*`, `hub.checkYourAnswersLink`, `hub.resetButton`.
- ✅ CYA controller chrome — page title / heading / banner heading /
  change link / prompt text (parameterised `{label}`) /
  submit-ready sentence all via `t()`. Bucket: `cya.*`.
- ✅ Commodity-lines controller + template — page title / heading /
  lead / empty / add button / back link / change link / "code not
  chosen" fallback. Also fixed a latent bug where `formatCode` read
  labels directly instead of via `t()`. Bucket: `commodityLines.*`.
- ✅ Templates (`shared/layout.njk`, `shared/partials/error-summary.njk`,
  hub + CYA + commodity-lines templates) — every hardcoded string
  now sourced from the view context. Shared chrome (phase banner
  tag / html, service name / URL, breadcrumb "Task list", back
  link, save-and-continue button text, error-summary title,
  page-title error prefix and suffix) lives in a new `lib/chrome.js`
  helper — every render-time controller does
  `chrome: chrome()` and the layout reads `{{ chrome.* }}`.
- ⏳ Locale threading — reading locale from request headers /
  session / query param and passing to `t()`. Currently English only.
  Approach when picked up: `chrome()` gains a `request` argument and
  passes locale down; `t()` gains a `locale` param.
- ⏳ Add `locales/cy.json` (translator-populated).

**Verification target when complete:** the browsable walk works with
`?lang=cy` (or however locale gets threaded) with every string
Welsh; falls back to English gracefully when a locale is missing
for a given key.

### P1. Joi adoption for the domain-driven validation path

**Decision recorded:** Defra's preferred tooling is Joi. Domain-driven
validation _should_ route through Joi. Feature controllers _should_
be able to add bespoke Joi rules on top via a `preValidate` hook.

**Execution deferred until after step 5 (V4 buildout)** because two
design questions surface naturally in that scale-up and shape the
Joi refactor:

- **Cross-record predicates.** The V4 rule "≥ 1 animal identifier per
  unit-record" is per-_group_, not per-field. Joi handles per-field
  cleanly and per-group less cleanly. Design the primitive
  (`groupPredicate`? `Joi.custom()` at page level?) against a real
  requirement, not a guess.
- **Line-scoped fields under Joi's static-shape assumption.** Joi
  schemas want fixed keys; commodity-line fields want N instances of
  the same obligation. Solvable via per-request schema build, but the
  exact convention is easier to design when line iteration is fully
  wired in step 6.

**Scope when it's picked up** — approximately one focused day:

- Port a minimal `lib/validate/run.js` from v2-spike (~30 lines);
  adapt to our `{ code, obligation, path }` error shape.
- Add a `buildSchema(fulfilments, ctx) → Joi.Schema` method to each
  domain factory (`staticEnum`, `computedEnum`, `predicate`, plus the
  `transitedCountries` composite).
- Rewrite `engine/index.js validate()` to call `buildSchema` + run
  the Joi schema + translate error tree.
- Coercion parity check — Joi's default `convert: true` differs from
  our current strictness; either set `convert: false` or update tests.
- Add the `preValidate` hook to `lib/page-controller.js` and a
  `features/index.js` registry so feature controllers can extend
  with bespoke Joi.
- One worked example: pick a real V4 feature that needs a
  controller-side rule and demonstrate the `preValidate` extension.
- Update `obligations.md` + write `docs/validation.md`.

**Verification target:** 345+ tests still green (some coercion tweaks
expected). Browsable walk unchanged.

**Reference:** [`obligations-v2-spike/lib/validate/`](https://github.com/DEFRA/trade-imports-animals-frontend/tree/spike/EUDPA-249-prototype-layouts/prototypes/standalone/obligations-v2-spike/lib/validate)
on the parent-layouts branch — the Joi harness we adapt.

### P2. Data dictionary as a committed markdown artefact

**Why parked:** `data-dictionary-sketch.js` already builds the
dictionary programmatically; the coverage claim it supports (every
obligation is either wired to a domain entry or explicitly allow-
listed) can be exercised by the coverage test in step 4 without a
committed MD file. Waiting until the V4 buildout means the first
committed dictionary reflects the real V4 coverage, not the partial
slice we ship today.

**Scope when picked up** — approximately half a day:

- Extend `data-dictionary-sketch.js` with a `renderMarkdown()` export.
- Add an npm script:
  ```json
  "docs:data-dictionary": "node prototypes/journey-config-spikes/EUDPA-249-flow-layer/data-dictionary-sketch.js > prototypes/journey-config-spikes/EUDPA-249-flow-layer/docs/analysis.md"
  ```
- Commit the generated `docs/analysis.md`. Regenerate on obligation /
  domain changes.
- **Optional stretch:** an HTML view at
  `/prototype/eudpa-249/data-dictionary` that renders the same content.
  Do only if stakeholders ask for it.

**Verification:** the generated dictionary matches
`buildDictionary()` output; the MD passes `npx prettier --check`.

## Design questions to resolve before executing

- **(1) fork vs shim** — resolved (fork).
- **(2) three sub-calls during the restructure** — resolved (kept
  generic template, dropped `browser/`, kept single-file `domain/` and
  `engine/`).
- **(Parked Joi work) cross-record predicate shape + line-scoped
  Joi schema** — design these when step 6 forces the requirements.

## Conventions to follow

- **Do not push without a user go-ahead.** Local commits are fine.
- **`auth: false` on every prototype route.** Keep the demo public
  even when host auth is on.
- **Anything gated by `prototype.eudpa249.enabled`** — production ships
  nothing prototype-related. Any new files that need production reach
  must be added inside the gate too.
- **Templates go through `shared/` and `features/*/template.njk`** —
  never reach into `src/server/...` templates. Cherry-pick from
  parent-layouts if a pattern exists there.
- **Do not restate model rules in the browser layer.** Anything a
  controller / template needs to know about the model goes through
  `./contract.js`. If you have to reach past it, extend the contract
  instead.
- **Test the invariants, not just the happy path.** `dump.test.js`
  snapshots catch drift; extend them when you change fixtures.
- **Prettier + eslint pass** — husky pre-commit will enforce it, but
  spare yourself the retry loop.
- **Auth default:** `auth.enabled` in
  [`src/config/config.js`](../../../src/config/config.js) is now
  `!isDevelopment` — do not revert to `true` without a
  matching adjustment to the signout + context test suites.

## Reference material

- **Ticket:** <https://eaflood.atlassian.net/browse/EUDPA-249>
- **V4 spec:** Confluence page 6497338582 — Live Animals Data Fields
  V4. Fetch via `tools/confluence/page.sh 6497338582 summary` or
  `tools/confluence/page.sh 6497338582 json` from the workspace root.
- **Parent EUDPA-277 spike:**
  [`../../model-spikes/obligations-v4-model/`](../../model-spikes/obligations-v4-model/)
  — obligations.md (150-page canonical doc), RECOMMENDATION.md,
  GAPS.md.
- **Parent-layouts branch:** `spike/EUDPA-249-prototype-layouts` on
  `DEFRA/trade-imports-animals-frontend`. Fetch specific files via
  `gh api repos/DEFRA/trade-imports-animals-frontend/contents/<path>?ref=spike/EUDPA-249-prototype-layouts --jq '.content' | base64 -d`.
  Notable paths on that branch:
  - `prototypes/model-spikes/shared/{controller,nav,domain,joi}.js`
  - `prototypes/standalone/obligations-standalone-spike/`
  - `prototypes/e2e/task-list-with-linear-tasks.spec.js`
- **This spike's `obligations.md`** — the canonical single source
  of truth (merged RECOMMENDATION.md in on 2026-07-15). Update it
  whenever any of (1)-(6) changes the story.

## Where the current commits sit

Head at `389f2f0`; 89 commits ahead of `main`. Recent tip:

```
* 389f2f0 fix(EUDPA-249): clear composite-widget UX polish bucket (2nd code review #3, #9-#13)
* 4818fee fix(EUDPA-249): POST-error re-render preserves user input across all page controllers
* bd87413 fix(EUDPA-249): address pages allow blank save; task-list reflects structural completeness
* f622981 fix(EUDPA-249): align mandate flags to V4 spec (interpretation A on addressBlock)
* be9ab56 feat(EUDPA-249): step 5e — expand address block to V4 standard (9 sub-fields, mixed rules)
* 08366f6 fix(EUDPA-249): step 5d — animalsCertifiedFor semantic overhaul
* 7a9e54b fix(EUDPA-249): step 5c — 2 missing obligations + 2 enum spec expansions
* d8b800c fix(EUDPA-249): step 5a — tighten V4 spec conformance
* e34484b feat(EUDPA-249): step 5b — group invariant "at least one Animal Identifier per unit-record"
* 6cedc93 docs(EUDPA-249): NEXT.md — clear the commodity-line off-by-one line
* 7ca279e fix(EUDPA-249): commodity-line labels track ordinal position, not internal line id
* 2fbb309 docs(EUDPA-249): refresh NEXT.md + RECOMMENDATION.md for step-4-complete state
* 55e5124 fix(EUDPA-249): units list labels track ordinal position, not internal unit id
* 0a2cc31 feat(EUDPA-249): step 4 iteration 10 — six per-unit identifier obligations
* 15ebfe7 feat(EUDPA-249): step 4 iteration 9 phases B + C — units UX + permanentAddress worked example
* d410bc3 feat(EUDPA-249): step 4 iteration 9 phase A — unit-record state + engine + contract
```

`git log --oneline main..HEAD` for the full 89-commit history.

Pushed to origin/spike/EUDPA-249-flow-layer.
