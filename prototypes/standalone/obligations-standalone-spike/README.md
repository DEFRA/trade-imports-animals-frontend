# obligations-standalone-spike

> **GATED THROWAWAY PROTOTYPE.** This spike exists to produce one comparable
> data point in the paradigm comparison alongside spikes A–D (declarative
> selectors, statechart, rules engine, schema-first) — precise enough to judge
> paradigm fit, never to be productionised. Nothing in it sets precedent: the
> in-memory Map is not a datastore decision (that is flagged urgent and belongs
> to decision-makers with Defra-wide input — see defer/reduce notes below), the
> orchestrator realises an unreviewed sketch (EVAL-35), the Container schema
> picks are provisional, and the code is disposable once the comparison writeup
> has consumed it. **The engine — not the contract, not the routes — is the
> artefact under evaluation.**

## The paradigm in three sentences

1. Requirements live as a portable catalogue of **obligations**
   (`model/obligations.json`) — pure data records with committed UUID ids and
   meaningful names, carrying no scoping, no mandate status and no
   presentation (obligations.md:196); a separate Container-tree **Flow**
   (`model/flow.json`) arranges them into Sections and Pages and owns every
   piece of journey copy.
2. Two pure, zero-I/O evaluators compute everything else per request: the
   **ObligationEvaluator** (`engine/evaluate.js` — scope via named predicate
   functions, most-restrictive mandate composition, stacked authored reason
   codes, per-fulfilment states) and the **JourneyEvaluator** (`flow-eval/` —
   four-status roll-up, deterministic navigation primitives, journey state)
   over the evaluator's output.
3. One side-effecting **orchestrator** (`orchestrator/`) canonicalises
   writes, mints stable fulfilment ids, actively wipes data on scope exit
   (the Yes–No–Yes mechanism — data destroyed, not hidden), runs the one
   in-process system handler (the quote) and re-evaluates to a fixed point;
   routes are plumbing over a 20-export contract barrel (`contract/index.js`).

## Run it

```bash
npm run prototype                          # start the app; the spike mounts at
                                           # /prototype-standalone/obligations-standalone-spike/task-list-with-linear-tasks
npm run test:obligations-standalone-spike  # the whole spike unit suite (vitest, colocated *.test.js + tests/ tiers)
npm run test:prototype                     # Playwright: the three shared specs + the three obligations edge specs
node prototypes/standalone/obligations-standalone-spike/dump.js [fixture.json]
                                           # headless model dump — contract evaluation as JSON, no server, no rendering
```

The five browserless test tiers (reachability, alignment walker,
completability, cross-Flow equivalence, rename survival) are mapped in
[`tests/README.md`](tests/README.md), which also carries the pinned-test
registry. `coverage-matrix.json` maps all 514 catalogue obligation ids to
their handling files and verifying tests.

## Contract table — obligations vocabulary against the spike-a/c concerns

`contract/index.js` is the only module routes import: exactly 20 pinned
exports (surface-drift test in `contract/index.test.js`), doubling as
interrogation Level 1 — importing the barrel in a REPL answers "what can this
journey do" in the doc's own vocabulary. The table maps them onto the concern
taxonomy the spike-a/c contracts use, so reviewers can diff paradigms
concern-by-concern. The contract is deliberately unremarkable; the advertised
IP sits underneath it in `engine/` and `flow-eval/`.

| Concern (spike-a/c)   | Contract exports                                                                                                            | Obligations-paradigm vocabulary                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| status / shape        | `evaluate`, `journeyState`, `canSubmit`                                                                                     | One per-request evaluation composing prune → ObligationEvaluator → container statuses → journey state; `canSubmit` iff the journey is Fulfilled                                        |
| view                  | `hubViewModel`, `pageViewModel`, `cyaRows`, `resolveReasons`                                                                | Task-list roll-up of Section statuses; `presents`/`presentsForEach` slot expansion into govuk widgets; summary rows over fulfilments; throwing dotted-reason-code → English resolution |
| navigation            | `firstApplicablePage`, `firstUnfulfilledPage`, `firstPagePresentingObligation`, `nextAfter`, `sectionEntry`, `changeTarget` | The three doc primitives re-exported by identity, plus post-POST advance, sectionEntryMode resolution and the CYA Change-link target (`?change=1`)                                     |
| mutation / validation | `checkSave`, `applyAnswers`, `addFulfilment`, `removeFulfilment`                                                            | Page-hard mandate gate over the payload-merged candidate evaluation; canonicalise-and-write → scope-exit wipe → fixed point → save; the indexed-fulfilment (claims) lifecycle          |
| submission            | `submit`                                                                                                                    | Server-side Fulfilled re-check (never trusting the button), one-way flip to Submitted + `submittedAt`, distinguishable stale-recheck result                                            |
| guards                | `guardPage`                                                                                                                 | Pure routing query: post-submit freeze, confirmation gate, deep-link Not-Applicable redirect                                                                                           |
| model / interrogation | `modelJson`                                                                                                                 | Interrogation Level 3's data source — the two model files verbatim                                                                                                                     |

## Honesty ledger — every reduction, mechanism kept, inputs shrunk, never faked

Of the 514 catalogue obligations: **322 implement**, **133 reduce**, **59
defer**. The 13 reduce themes:

| #   | Reduce theme                             | What actually shipped                                                                                                                                                                                                            | Where                                                                             |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1   | Service / Flow / Journey layering        | One Service, one Flow, one JS evaluator set; multi-Flow shown structurally — evaluators parameterised on (model, state), Flows reference obligations by id, plus the never-mounted `model/skeleton-flow.json` fixture            | `engine/`, `flow-eval/`, `model/skeleton-flow.json`                               |
| 2   | indexedBy taxonomy (source × mutability) | `user` and `derived` fully implemented; `seeded` stays a validated schema value exercised only by a unit-level fake                                                                                                              | `engine/load-model.js`, `orchestrator/scope-exit-wipe.js`                         |
| 3   | Open type space and kind-collapse        | Open `type` field with a type-companion registry, canonical-form storage per type; only the journey's own types are used                                                                                                         | `engine/load-model.js`, `orchestrator/apply-answers.js`, `lib/fields/registry.js` |
| 4   | System-handled obligations               | One real in-process, synchronously resolved quote handler through the real registry: scope-entry trigger, unified-map write, in-flight dedupe                                                                                    | `orchestrator/system-handlers.js`, `lib/quote/premium.js`                         |
| 5   | Scoping-rule expressiveness              | Interval algebra, quantifiers, external state, mandate-flip proven as unit-only demo predicates over an injected fixture — never registered on journey obligations                                                               | `engine/scope/expressiveness.js`                                                  |
| 6   | Fixed-point orchestration loop           | Loop shape kept (evaluate → adopt pruned → sync derived → wipe → handlers, while changed); converges immediately in this app; yield = render-and-end-request                                                                     | `orchestrator/fixed-point.js` (EVAL-35 tag, see below)                            |
| 7   | Blocked-work-as-NA                       | appliesWhen-to-Not-Applicable fully built (email gate, claims, quote gating); asynchronous blockers appear only as synchronous stand-ins in unit tests                                                                           | `flow-eval/applies-when.js`                                                       |
| 8   | Staleness                                | No mechanism, per the doc's own deferral; the store shape merely avoids precluding per-record metadata                                                                                                                           | `store/journey-repository.js`                                                     |
| 9   | Escape routes and contextual Back        | `?change=1` return-to-CYA and hub-reachable breadcrumbs only; no referrer history — affordances match the existing DOM                                                                                                           | `journey/paths.js`                                                                |
| 10  | Resume shortcut                          | `firstUnfulfilledPage` implemented and tested; the hub widget is deliberately unrendered (parity forbids new hub chrome)                                                                                                         | `flow-eval/navigation/first-unfulfilled-page.js`                                  |
| 11  | Cross-Flow evaluator-equivalence harness | Scripts replayed against both Flows must produce deep-equal canonical end-states — **demonstrated structurally, not proven**: with one real Flow there is nothing production-grade to compare, so the skeleton fixture stands in | `tests/flow-equivalence.test.js`, `tests/helpers/script-runner.js`                |
| 12  | Datastore decision                       | Repository contract over an in-memory Map, explicitly **non-precedential**: the real decision is urgent, needs Defra-wide input, and this reduction must not defuse that urgency                                                 | `store/journey-repository.js`                                                     |
| 13  | Code-generation pipeline                 | No generator built; the hand-written templates and routes obey the generator-shaped type→widget mapping conventions, standing as the reference implementation TOOL-28 asks a future generator to pattern-match against           | `lib/fields/`, `templates/partials/fields.njk`, `routes/page.js`                  |

**Layering meta-ids, architecturally realised (honesty note):** DEF-1, ARCH-6,
ARCH-12, ARCH-X1_1 and OPEN2-3 are reduces carried by the engine/flow split
itself rather than any dedicated build — the (model, state)-parameterised
Flow-ignorant evaluator plus the equivalence harness carry DEF-1; the contract
barrel + `journey/config.js` carry ARCH-6 (pattern, no registry); the single
engine/flow-eval barrel set carries ARCH-12; the one `model/obligations.json`
parsed once by `engine/load-model.js` carries ARCH-X1_1 and OPEN2-3.

## Provisional-settlements register

Doc contradictions and open schema questions were settled provisionally, not
resolved. Each pick is labelled in a code comment at the named file (graft 2)
and recorded here so the comparison writeup treats them as evidence, not
settlements.

| Settlement                                                                                                                                                                       | Ids                                 | File carrying the label                                                |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| Cookie-carried journeyId, no `{id}` URL segment — one-journey-per-browser isolation traded for spike-a's shareable pinned URLs                                                   | FULF-2 vs STATUS-X1_5               | `journey/paths.js`                                                     |
| A page whose in-scope obligations are all engine-optional is Not Applicable, not vacuously Fulfilled                                                                             | STATUS-3 vs STATUS-11               | `flow-eval/container-status.js`                                        |
| Journey state counts top-level Section statuses, not raw fulfilment presence (the email-gate counting question)                                                                  | NAV-33 vs NAV-34                    | `flow-eval/journey-state.js`                                           |
| Post-POST advance is status-filtered (skips Not Applicable and already-Fulfilled pages); spike-a advances structurally — coincident on every shared spec                         | open ruling item 6, STATUS-23/25/31 | `flow-eval/navigation/next-after.js`                                   |
| `presentsForEach` is an ARRAY of entries (the doc sketches a single object) so one page can project several indexed obligations sharing fulfilment ids                           | OPEN2-1                             | `flow-eval/presents.js`, `model/flow.json` `$comment`                  |
| Container schema picks: CYA + Confirmation as top-level constructs outside the Section tree; `revealedBy` pinning the govuk conditional reveal; unified recursive Container JSON | OPEN2-1, OPEN2-2, ARCH-22           | `model/flow.json` `$comment`                                           |
| `indexedBy.controllingValue` — invented schema extension realising FULF-18 pattern 2 (derived obligation whose fulfilment id IS the controlling value)                           | FULF-18, open ruling item 4         | `model/obligations.json` `$comment`, `orchestrator/scope-exit-wipe.js` |
| `claimType`/`claimAmount` share the orchestrator-minted fulfilment ids; system-handled provenance is the scalar `handler` companion field                                        | INDEX-1, FULF-9                     | `model/obligations.json` `$comment`                                    |
| Canonical end-state projection for cross-Flow equivalence: name-keyed values, minted ids stripped                                                                                | TEST-30                             | `tests/helpers/script-runner.js`                                       |
| Get your quote rendered always-visible-inert rather than doc-default NA-hidden (spike-a hub parity, ruling c); the `na-hide` branch survives unit-only                           | STATUS-22, OPEN2-X2_1               | `journey/hub-view.js`                                                  |
| Form-name encoding: `name` for single slots, `name__encodeURIComponent(fulfilmentId)` for indexed slots                                                                          | SHAPE-14, FULF-9                    | `orchestrator/apply-answers.js`                                        |
| Bidirectional name↔id resolution has one named home; storage and evaluators see UUIDs only                                                                                       | FULF-5, FULF-15, DEF-10             | `engine/identifiers.js`                                                |
| Every `type` used must have a companion in the engine's type-companion registry, asserted at load                                                                                | SHAPE-25, SHAPE-26                  | `engine/load-model.js`                                                 |

**EVAL-35 — the fixed-point loop realises an unreviewed sketch.** The
paradigm doc's orchestrator-loop pseudocode carries a "TODO review with Sam"
marker. `orchestrator/fixed-point.js` implements it anyway, with a header tag
(`EVAL-35 — TODO review with Sam`) pinned by `orchestrator/fixed-point.test.js`
so the human review treats the implementation as input, not fait accompli.

**Bespoke bypasses (graft 9):** every page pushed off the generic model-driven
projection carries a comment naming the model feature it bypasses —
`routes/claims.js`, `templates/claims-list.njk`, `templates/claims-add.njk`
and `contract/cya-rows.js`.

## Parity rulings record

`parity-facts.json` closed the five code-answerable questions against spike-a
source: **(a)** spike-a is freely navigable post-submit (re-submit re-stamps
the same reference); **(b)** direct-URL access is open except the unknown-id
redirect and the confirmation status guard; **(c)** Get your quote is gated by
link-withholding via allComplete, never a route guard; **(d)** modifications
are fixed fields, not a collection; **(e)** completing Email changes no
journey-level status. Three human rulings were then recorded on 2026-07-02.

### Ruling 1 — POST-SUBMIT FREEZE (Outcome A). A documented deviation from spike-a.

The doc's submit lifecycle ships: `contract/submit.js` performs the one-way
in-progress → submitted flip with `submittedAt`; `store/journey-repository.js`
rejects every write once submitted. `contract/guards.js` rule 1 enforces the
route-level freeze exactly as shipped: `isFrozen` is
`journeyState === SUBMITTED`, and once frozen only the read-only
check-your-answers GET and the confirmation GET survive — every other journey
surface (hub, task pages, Change links, quote-summary, and any POST) resolves
to the CYA path. The start page stays open so a new journey can begin.
**This deviates from spike-a's real browser behaviour** — parity fact (a)
shows spike-a freezes nothing — but the shared specs end at 'Quote confirmed'
so the divergence is unobserved by them; spike-a's unfrozen behaviour is
intentionally NOT copied. Asserted live by
`prototypes/e2e/obligations/post-submit-freeze.spec.js`.

### Ruling 2 — EARLY CYA: open access (Outcome A).

Pre-submit, `contract/guards.js` guards almost nothing: direct-URL CYA renders
soft "you still need to…" prompts, direct-URL quote-summary prices a
half-empty journey, and the hard gate lives at CYA POST only —
`contract/submit.js` re-checks Fulfilled server-side and returns a
distinguishable stale-recheck result (missing items + change hrefs) so CYA
re-renders calling out the gap, never a 500. The two pre-submit guard rules as
shipped: the confirmation gate (pre-submit confirmation redirects to the start
page — the one route status-guarded in both paradigms) and the deep-link
Not-Applicable redirect (a gated-out page resolves to its Section's first
applicable page, hub fallback) — the latter unit-pinned only, since spike-a's
parity evidence covers unknown addon steps alone (the ruling's recorded
sub-question). Asserted live by
`prototypes/e2e/obligations/early-cya-access.spec.js`.

### Ruling 3 — MANDATES: fullName is the ONLY page-hard field (Outcome B).

`model/flow.json` authors exactly one page-hard mandate in the whole Flow:
`fullName` (blank save blocks with the GDS error round trip). Every other
parity `required_at_save` field — email, registration, hadClaims, coverType,
excessAmount, extras, ncdYears — is page-soft: blank saves advance, the hub
shows In progress, and the gaps block at CYA POST as engine-mandatory soft
prompts naming them. The canonical engine-mandatory set is
`engine/scope/journey-rules.js`, reverse-engineered from spike-a's
allComplete. The email gate saves blank freely too, blocking only at CYA. The
shared mandatory-fields spec only pins About-you, so it passes; asserted live
by `prototypes/e2e/obligations/mandate-composition.spec.js`.

Items still genuinely open for a human ruling (recorded in PLAN.md §(f)):
addon follow-ups as derived-indexed obligations and the invented
`controllingValue` extension (item 4); addon deselect→reselect rehydration
divergence (item 5); the post-POST forward rule for already-Fulfilled pages
(item 6, shipped status-filtered with a provisional label); the datastore
decision (item 7, urgent); and the EVAL-35 orchestrator sketch review
(item 8).

## Defer log — zero code, named extension slot each

The nine synthesis defer themes plus one plan-added theme (10). 59 obligation
ids land here; none has any code in this spike.

| #   | Theme                                                                          | Ids                                                                                                             | Why deferral costs nothing / extension slot                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Post-submit lifecycle extensions (amendment, PDF, withdrawal, events)          | SUBMIT-11, SUBMIT-12, SUBMIT-13, SUBMIT-14, SUBMIT-15, SUBMIT-16, NAV-38                                        | No counterpart in the mirrored journeys; only the freeze MVP ships. SUBMIT-11/14 + NAV-38 are additionally observed by the post-submit-freeze spec. Slot: the submit result object in `contract/submit.js` and the guard surface list in `contract/guards.js`.                                               |
| 2   | Audit trail and deterministic replay                                           | EVAL-39, EVAL-41, EVAL-X1_2, OPEN1-7                                                                            | No browser-observable surface; pure recompute-on-load keeps replay architecturally possible. Slot: wrap the composed write entry points in `orchestrator/index.js` with an event log.                                                                                                                        |
| 3   | Model evolution and identifier-rename open items                               | PERSIST-21, PERSIST-22, PERSIST-35, PERSIST-36                                                                  | One hand-authored model version, no live users — no migration event can occur; ids stay stable and unexposed. Slot: `engine/prune.js` drops-as-data plus `engine/identifiers.js`.                                                                                                                            |
| 4   | Deferred evaluator and record extension points                                 | EVAL-9, SUBMIT-21, OPEN1-4, OPEN1-15, OPEN1-X2_2                                                                | The doc's own gate: keep these off the record and out of the evaluator signature until a concrete need arrives. Slot: the record schema validated in `engine/load-model.js`.                                                                                                                                 |
| 5   | Deferred indexed-obligation machinery (seeding, recovery, hybrids, references) | INDEX-10, INDEX-16, INDEX-17, INDEX-18, OPEN1-1, OPEN1-2, EVAL-X1_1                                             | Presupposes external systems that do not exist in an in-memory parity spike. Slot: `seeded` is already a validated `indexedBy.source` value in `engine/load-model.js`.                                                                                                                                       |
| 6   | Deferred renderer/UX affordances and navigation generality                     | STATUS-10, OPEN2-10, OPEN2-16, OPEN2-17, OPEN2-18, OPEN2-19, OPEN2-21, OPEN2-22, NAV-14, NAV-17, NAV-18, NAV-32 | The flat, always-hubbed journey forbids all of these under behavioural identity; the traversal primitives already accept arbitrary root Containers, so engine-side generality is free. OPEN2-22's visited-then-reset edge is observed (not built) via the shared invalidation spec.                          |
| 7   | Orchestrator failure policies for system-handled obligations                   | OPEN2-23, OPEN2-24                                                                                              | The only system step runs in-process and cannot fail. Slot: the opaque stored-and-ignored `failurePolicy` field in `orchestrator/system-handlers.js`.                                                                                                                                                        |
| 8   | Spike A–D retrofit commentary                                                  | FLOW-29, FLOW-30, FLOW-31, FLOW-32                                                                              | Documentation context only — see the four paragraphs below.                                                                                                                                                                                                                                                  |
| 9   | Meta-goals and human review checkpoints                                        | DEF-X2_3, EVAL-35                                                                                               | Neither yields code: the spike as a whole is the paradigm-fit evidence artefact; EVAL-35 is realised as the header tag on `orchestrator/fixed-point.js` routing the loop into the Sam review as input.                                                                                                       |
| 10  | Code-generation pipeline stages (plan-added)                                   | TOOL-1, TOOL-3, TOOL-4, TOOL-5, TOOL-6, TOOL-7, TOOL-8, TOOL-9, TOOL-16, TOOL-26, TOOL-27, TOOL-29              | TOOL-1 itself pins the two-stage generator as an aspiration with no commitment; no generator, AI skill or polish layer is built. Slot: the hand-written `routes/page.js` + `templates/partials/fields.njk` are the reference a future Stage 1/2 pattern-matches against (the TOOL-28 reduce, ledger row 13). |

**Spike A–D retrofit commentary (theme 8).** Spike A (declarative selectors)
would retrofit by lifting its step definitions into obligation records and
letting the Flow own its grouped hub literal — its per-step `required` flags
map onto the page-hard/engine-mandatory split rather than one boolean. Spike B
(statechart) would keep its chart for navigation only; obligation state would
leave the chart context for a fulfilments map, since the paradigm computes
status rather than storing transitions. Spike C (rules engine) is the nearest
relative — its rules become named scope predicates and its contract concerns
map one-to-one onto this spike's barrel, as the contract table above shows.
Spike D (schema-first) would split its single schema into the
catalogue/Flow pair, keeping JSON Schema for per-type constraint validation
inside `validation/format-checks.js`'s slot.

## Framing (the section-7 statement)

This spike is a gated throwaway. It answers one question — how well does the
obligations paradigm fit the task-list journey the other four spikes already
implement — under a hard acceptance gate: the three shared Playwright specs
run unchanged against it via one JOURNEYS entry. Everything provisional is
labelled in code and registered above; everything reduced keeps its real
mechanism with shrunk inputs; everything deferred is logged with the slot it
would land in. The comparison writeup, not this codebase, is the deliverable.
