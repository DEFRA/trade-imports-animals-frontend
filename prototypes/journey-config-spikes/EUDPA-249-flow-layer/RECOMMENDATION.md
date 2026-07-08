# EUDPA-249 — Flow-layer spike recommendation

_Spike branch:_ `spike/EUDPA-249-flow-layer` \
_Folder:_ `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` \
_Reads from:_ `prototypes/model-spikes/obligations-v4-model/` (EUDPA-277
outputs — obligations manifest + evaluator)

## Recommendation

Adopt a **three-layer architecture** for expressing journey
configuration keyed by commodity code and country of origin:

| Layer                                      | Owns                                                                                                                | Answers                                              |
| :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------ | :--------------------------------------------------- |
| **1 — Obligations** (as-is from EUDPA-277) | identity, cardinality, **scope** (`applyTo`)                                                                        | "Does this data field apply, given current state?"   |
| **1.25 — Domain** (NEW)                    | per-obligation **value legality** — enum options (static / computed / lookup-driven), predicates, cross-field rules | "Is this proposed value legal, given current state?" |
| **2 — Flow** (NEW)                         | pages, sections, presents entries; page/section/journey status; navigation                                          | "What does the user see next?"                       |

Every AC bullet lands cleanly on this split:

- **Show/hide a page** — a page becomes NA when every presented
  obligation is out of scope. Driven purely by the obligation's own
  `applyTo`; the flow declaration is unchanged.
- **Show/hide a question** — a question is a presented obligation; its
  applicability inherits the same mechanism.
- **Show/hide an option** — `optionsFor(obligation, fulfilments, ids,
domain)` resolves the current legal option set from the domain
  entry. The controller uses the same call to build its JOI schema.
- **Correctness** — three independent lines of defence:
  1. schema (JOI derived from domain entries in the controller sketch),
  2. tests at three levels (domain isolation, runtime primitives with
     synthetic fixtures, integration through the real V4 slice — see
     `integration.test.js`),
  3. business-facing dictionary (`data-dictionary-sketch.js`) built by
     walking obligations + domain metadata.

The spike ships **91 passing tests** across four files; the whole
prototype fits in ~1400 lines of small, dependency-free JS.

## Playback script (5 minutes)

1. **The problem, in one line.** V4 journey config today would spread
   scope, option lists, predicates, and page composition across at
   least three unrelated code paths. Change management is hard.
2. **The three layers.** Obligations already exists (EUDPA-277). We
   add Domain (constraint declarations) and Flow (pages + presents).
   Everything is a plain JS module keyed by obligation id — same idiom
   as the parent spike.
3. **One change lands in one place.** Walk through:
   - "The purpose sub-values change when reason is transit":
     edit `PURPOSE_BY_REASON` in `domain.js`.
   - "This new commodity code needs a package count":
     edit `PACKAGE_COUNT_COMMODITIES` in the obligations manifest.
   - "This page shows one extra question":
     add a presents entry to `flow.js`.
     Nothing else moves.
4. **Correctness is enforced three ways** — schema (JOI), tests
   (three levels), dictionary (introspectable metadata).
5. **Async options work the same shape.** Lookup obligations
   (`lookup-result`) fulfil themselves via the orchestrator; domain
   entries read them like any other sibling. No special "async" path.
6. **What's out of scope** (see below).

## Key design decisions

### D1 — Domain is keyed by obligation id, not commodity code

The AC frames the problem "keyed by commodity code and country of
origin", but that's the _input_ dimension, not the _storage_ one.
Obligations already model the fan-out from commodity code + country
via `applyTo` (see EUDPA-277 `helpers.js` — `allowListed`,
`branchedGate`, etc.). Adding a second commodity-code-keyed lookup
layer for domain would duplicate that logic and create a
consistency-drift risk.

Instead: **each obligation has one domain entry**; the entry reads
whichever sibling obligations it needs to compute the current option
set. `purposeInInternalMarketDomain` reads `reasonForImport`; the
`arrivalDateAtPort` predicate parses DD/MM/YYYY per the V4 spec; the
`transitedCountries` entry caps selections at 12. Same idiom as
`applyTo`. One mechanism, one testing story.

### D2 — Data-shaped where possible; function escape hatch where computed

`staticEnum` and `lookupEnum` are 100 % introspectable — the data
dictionary can enumerate their outputs without executing code.
`computedEnum` and `predicate` are function-shaped but carry
`metadata.readsFrom` and `metadata.reasons` respectively so the
dictionary can still report reachability and possible failure codes
statically. This mirrors the `helpers.js` "declare via helper,
introspect via `.metadata`" pattern from EUDPA-277.

### D3 — Runtime primitives are small pure functions, not one `evaluate`

The Flow layer exposes ~6 primitives (`pageStatus`, `containerStatus`,
`journeyState`, `firstApplicablePage`, `firstUnfulfilledPage`,
`firstPagePresentingObligation`) plus two domain primitives
(`optionsFor`, `validate`). Each answers one specific question. This
matches the JourneyEvaluator design agreed in EUDPA-277's obligations
doc and keeps each primitive independently unit-testable — no browser,
no orchestrator, no long fixtures.

### D4 — Predicate ctx carries `siblingValue(obligation)` scoped by path

Line-scoped obligations (`numberOfAnimals`, `species`) store as
`fulfilments[oblId] = { [lineId]: value }`. Predicates that need to
read sibling values at the same line do so via
`ctx.siblingValue(obligation)`, which resolves `fulfilments[obl.id]
[path]`. This lets predicates read cross-field state without any
knowledge of composite-key parsing. The V4 spec has no genuine
cross-field predicate at the singleton or single-line level today —
the real cross-record rule ("≥ 1 animal identifier per unit") sits
at the unit-record layer and is deferred to a follow-on ticket. The
`siblingValue` primitive is exercised via runtime unit tests using
synthetic obligations.

### D5 — Lookup-result obligations are ordinary obligations

`certifiedForOptionsLookup` is a scalar obligation the orchestrator
fulfils by writing the fetched options into `fulfilments`. The
`animalsCertifiedFor` domain entry reads it via `lookupEnum`. The
evaluator treats it as `single` category — no bespoke async plumbing
in the evaluator or the runtime. Same shape as sub-journey obligations,
same shape as MDM-sourced enums.

## Trade-offs

| Trade-off                                                               | Accepted | Why                                                                                                                                                                                                                                                                                 |
| :---------------------------------------------------------------------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain entries can call code, not just data                             | ✅       | The alternative — a table with a bespoke DSL for cross-field rules — grows features every time a new predicate shape arrives. Keeping the escape hatch simple (a JS closure with a small `ctx`) preserves the "data-shaped where possible" property without capping expressiveness. |
| Two runtimes (JS evaluator + JS runtime) don't port to non-JS consumers | ✅       | The **contract** ports (obligations + domain + flow are declarative JSON-friendly modules); each language re-implements ~200 lines of pure functions. Same trade-off as EUDPA-277.                                                                                                  |
| Page-level `mandate` vs obligation-level `status` compose orthogonally  | ✅       | Documented in obligations.md's two-mandate composition table. This spike honours it: `pageStatus` filters on obligation-level status; `mandate: 'hard'` is a controller-side concern (page POST enforcement).                                                                       |
| Data dictionary can't fully enumerate computedEnum / predicate outputs  | ✅       | Metadata identifies which siblings a computedEnum reads and which failure codes a predicate emits. A stakeholder can spot missing coverage without running JS. If we ever need full enumeration, a symbolic-execution pass over the closures is a follow-on.                        |

## Open questions surfaced but not resolved

Same set as PLAN.md's open questions; the spike explored them but did
not decide them. These are the ones worth raising in playback:

1. **Cross-field error surfacing.** Predicate errors carry `path` and
   `code`; whether they render inline, page-summary, or submit-block
   is a renderer choice. Left as-is.
2. **Domain helper library.** We used four factories
   (`staticEnum`, `computedEnum`, `lookupEnum`, `predicate`). If a
   fifth shape recurs ≥ 3 times, extract it; not now.
3. **"Allow invalid submit" enforcement policy.** Business-side; sits
   at the controller, not in the model. Flagged for BA input.
4. **Higher-order predicate helpers** (e.g. `whenSpecies(x, () => …)`).
   Not needed for the current V4 predicates; wait until the shape recurs.

## Out of scope — natural follow-ons

- **Working controllers.** Sketched only (`controller-sketch.js`).
  Wiring into the existing frontend, adding real JOI, and standing up
  a page renderer are separate tickets.
- **`validation-result` obligations** (dynamic predicates via an
  orchestrator-resolved obligation, parallel to `lookup-result`).
  Natural scale-out; not needed for AC.
- **Complete V4 coverage.** Prototype exercises a slice (reason /
  purpose, transporter, arrival, one commodity line). Extending is
  mechanical; the pattern doesn't change.
- **HTML rendering.** Flow-layer primitives return data; a real
  renderer is a separate concern.
- **CYA / read-only page rendering.** `firstPagePresentingObligation`
  gives us the Change-link primitive; the CYA page shape is a
  follow-on.

## How the artefacts hang together

```
              obligations.js (EUDPA-277 spike output)
              ▲   ▲   ▲            ▲
              │   │   │            │
    domain.js │   │   │  flow.js   │
      ▲       │   │   │    ▲       │
      │       │   │   │    │       │
      └───────┴───┴───┴────┴───────┘
              runtime.js
              ▲            ▲
              │            │
     controller-sketch  data-dictionary-sketch
```

- `domain.js` and `flow.js` both import symbols from the parent
  obligations manifest — same source of truth for identity.
- `runtime.js` reads all three plus the ObligationEvaluator's output;
  every primitive is a pure function of its inputs.
- `controller-sketch.js` composes JOI from domain entries and the
  current flow page.
- `data-dictionary-sketch.js` walks obligations + domain metadata to
  emit a stakeholder-friendly view; declares no rules of its own.

## Files

| File                                                       | Purpose                                        | LOC (approx) |
| :--------------------------------------------------------- | :--------------------------------------------- | -----------: |
| [`domain.js`](./domain.js)                                 | Layer 1.25 constraint declarations + factories |         ~180 |
| [`flow.js`](./flow.js)                                     | Layer 2 pages + sections + presents            |         ~130 |
| [`runtime.js`](./runtime.js)                               | JourneyEvaluator + domain primitives           |         ~250 |
| [`domain.test.js`](./domain.test.js)                       | Layer 1.25 unit tests                          |         ~180 |
| [`runtime.test.js`](./runtime.test.js)                     | Layer 2 primitive tests, synthetic fixtures    |         ~330 |
| [`integration.test.js`](./integration.test.js)             | End-to-end V4 slice                            |         ~240 |
| [`controller-sketch.js`](./controller-sketch.js)           | JOI-shaped page schema composition             |         ~130 |
| [`data-dictionary-sketch.js`](./data-dictionary-sketch.js) | Stakeholder dictionary + coverage report       |         ~120 |
| [`sketches.test.js`](./sketches.test.js)                   | Sketch tests                                   |         ~120 |
| **Total**                                                  | **91 tests passing**                           |    **~1700** |

## Running the spike

```bash
cd repos/trade-imports-animals-frontend
npx vitest run prototypes/journey-config-spikes/EUDPA-249-flow-layer/
```

## References

- Parent obligations spike: [`../../model-spikes/obligations-v4-model/`](../../model-spikes/obligations-v4-model/)
- Parent obligations doc: [`obligations.md`](../../model-spikes/obligations-v4-model/obligations.md)
  (Flow-layer design is described in §The JourneyEvaluator, §Runtime
  navigation primitives, §Status-propagation rules, and §The Flow's
  page model)
- Parent recommendation: [`RECOMMENDATION.md`](../../model-spikes/obligations-v4-model/RECOMMENDATION.md)
- Ticket: <https://eaflood.atlassian.net/browse/EUDPA-249>
