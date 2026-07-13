# EUDPA-249 — Flow-layer spike PLAN

Follow-on to EUDPA-277 (obligations model validated against Live
Animals V4 fields — see
[`../../model-spikes/obligations-v4-model/`](../../model-spikes/obligations-v4-model/)).
Started 2026-07-08.

**Branch:** `spike/EUDPA-249-flow-layer` (cut from the tip of the
consolidated EUDPA-277 spike, so the validated obligations manifest is
directly importable).

**Folder:** `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`.

This document captures the plan agreed in the previous session so a
fresh session can pick up without re-derivation. Delete once execution
starts and RECOMMENDATION.md exists.

> **Post-implementation note (2026-07-08).** RECOMMENDATION.md is the
> current source of truth. One in-scope item from this plan — the
> async lookup pattern (`lookup-result` obligations, `lookupEnum`
> domain factory, `certifiedForOptionsLookup`) — was **removed
> during implementation** to reduce concept count. `animalsCertifiedFor`
> now uses a static stub. The pattern will be reintroduced (if
> useful) alongside a real certificate integration. See NEXT.md and
> the `refactor(EUDPA-249): stub animalsCertifiedFor as staticEnum`
> commit for the reasoning.

---

## Ticket

**EUDPA-249** — _Spike: evaluate journey configuration driven by
commodity code and country of origin._

Acceptance criteria:

- Recommended approach for expressing journey config in one place,
  keyed by commodity code + country of origin.
- Shows how the config is changed in one place to drive:
  - showing/hiding a page
  - showing/hiding a question
  - showing/hiding an option (e.g. dropdown value)
- Explains how correctness of the config is ensured (schema, tests,
  business-facing illustration).
- Trade-offs captured; recommendation played back to team.
- **Stretch:** task list changes, validation changes.

Tech notes reference Ben's
[`trade-imports-journey-config-ui`](https://github.com/DEFRA/trade-imports-journey-config-ui)
and a Slack slide deck — both already consumed in prior analysis; the
obligations model from EUDPA-277 is the canonical direction for this
spike.

---

## Direction — three-layer architecture

The previous session's key design conversation was about where
finite-enumerable options and predicate-based validation should live.
Agreed:

### Layer 1 — Obligations (existing, from EUDPA-277)

Owns **identity + cardinality + scope** (`applyTo`). Nothing about
legal values. Reusable across journeys with different validation
overlap. Location: manifest imported from
[`../../model-spikes/obligations-v4-model/obligations.js`](../../model-spikes/obligations-v4-model/obligations.js).

**Unchanged by this spike.**

### Layer 1.25 — Domain / validation (NEW)

Per-obligation constraint _declarations_ keyed by obligation id.
Everything about "what is a legal value?" lives here. Everything about
_when_ / _which_ reads state — potentially state that includes
external-lookup results, resolved by the orchestrator via the existing
`lookup-result` obligation pattern.

Indicative shape:

```js
// domain.js
export const domain = new Map([
  [
    purposeInInternalMarket.id,
    {
      type: 'enum',
      options: (fulfilments, ids) =>
        fulfilments[commodityCode.id] === 'x' ? ['a', 'b'] : ['a', 'b', 'c']
    }
  ],
  [
    animalsCertifiedFor.id,
    {
      type: 'enum',
      // lookup-driven — reads from an orchestrator-fetched result
      options: (fulfilments) => fulfilments[certifiedForOptionsLookup.id] ?? []
    }
  ],
  [
    numberOfAnimals.id,
    {
      type: 'integer',
      predicate: (value, fulfilments) => {
        const species = fulfilments[species.id] ?? []
        if (species.includes('elephant')) return value === 1
        return value >= 1
      },
      reasons: [{ code: 'domain.numberOfAnimals.max.becauseElephant' /* … */ }]
    }
  ]
])
```

Key properties:

- **Data-shaped where possible**, function escape hatch where computed.
- **Same idiom as obligations' `applyTo`** — pure functions of state.
- **Metadata pattern** — where entries are built via helpers, `.metadata`
  is attached for introspection (parallel to `helpers.js` in
  obligations).
- **Keyed by obligation id** (persistence-key hygiene).
- **Single home for enum options, predicates, and cross-field rules**
  — no cross-file chasing.

Loose-wording caveat: "single home" refers to constraint _declarations
/ resolution logic_, not the resolved values themselves. Some
declarations resolve statically; some read state (which may include
external-lookup results delivered via `lookup-result` obligations).
Same shape as `applyTo` reading state.

### Layer 2 — Flow (NEW prototype)

Pages + `presents` entries. References obligations for scope +
records, and domain for rendering shape + option lists.

Indicative shape:

```js
// flow.js
export const flow = {
  sections: [
    {
      id: 'commodity-line',
      title: 'Commodity line',
      children: [
        {
          page: 'commodity-selection',
          presents: [{ obligation: commodityCode, mandate: 'hard' }]
        },
        {
          page: 'commodity-details',
          presents: [
            { obligation: commodityType, mandate: 'hard' },
            { obligation: species, mandate: 'hard' }
          ]
        }
      ]
    }
  ]
}
```

Runtime primitives — a mix of existing JourneyEvaluator primitives
(from obligations.md §The JourneyEvaluator) plus new ones for
this spike:

Existing (inherited from EUDPA-277 model):

- `firstApplicablePage(root)`, `firstUnfulfilledPage(root, state)`,
  `firstPagePresentingObligation(flow, obligationId)`,
  `containerStatus(container, state)`, `journeyState(flow, state,
submitted)`.

New in this spike:

- `optionsFor(obligation, fulfilments, ids, domain) → string[]` —
  resolve the current legal options.
- `validate(presentedEntry, fulfilments, ids, domain) → error[]` —
  run predicates and set-membership checks; returns error records
  keyed by obligation id.

Existing primitives already cover page/question visibility (via
`containerStatus` → NA/NS/IP/F) and task-list rollup. No new
mechanism needed for those AC bullets.

### Controller layer — sketch only

Show how JOI schemas compose from the domain module. Not a working
controller in the spike — just the composition pattern.

---

## Deliverables

- **`domain.js` prototype** — 3-5 enum obligations from V4 covering
  static / computed / lookup-derived option sets; plus 1 predicate
  example (`numberOfAnimals` capped when species includes elephant);
  plus 1 `lookup-result` obligation for the async options case (may
  need to be added to the imported obligations manifest or defined
  locally).
- **`flow.js` prototype** — 3-5 pages covering a V4 journey slice
  that exercises page visibility, question visibility, option
  filtering, and task-list rollup.
- **`runtime.js`** — new primitives (`optionsFor`, `validate`), plus
  re-exported / wrapped versions of the existing JourneyEvaluator
  primitives that consume both obligations state and domain.
- **`controller-sketch.js`** — one example showing how a JOI schema
  derives from the domain module.
- **`data-dictionary-sketch.js`** — walks obligations + domain, emits
  a JSON view.
- **Tests** at three levels:
  - domain entries in isolation (pure functions),
  - runtime primitives with synthetic fixtures,
  - integration through a small V4 slice.
- **`RECOMMENDATION.md`** — trade-offs, recommendation, playback
  script.

---

## Scope — in and out

**In scope**

- Enum options: static / computed / lookup-derived.
- Predicate constraints, single-obligation (e.g. `numberOfAnimals`
  capped by species).
- Cross-field constraint via reading state (predicate reads sibling
  obligations' values).
- Page / question / option gating derived from V4 commodity codes.
- Task-list rollup (existing model concept, exercised end-to-end).
- Basic validation error rendering pattern.
- Async lookup for options (existing `lookup-result` obligation
  pattern).

**Out of scope — flagged in RECOMMENDATION.md as follow-on**

- Full working controller — only the composition pattern.
- Dynamic predicates via a `validation-result` obligation parallel
  to `lookup-result` (mentioned in the previous session as a natural
  scale-out).
- The "sometimes allow invalid submit" business-policy question —
  orthogonal to shape; sits at the controller layer.
- Complete V4 journey — thin prototype; RECOMMENDATION.md describes
  how the pattern scales to full coverage.
- Rendering / HTML templates — the Flow layer's runtime returns
  data; a real renderer is a separate concern.

---

## Suggested next-session flow

1. Read this PLAN.md (~5 min).
2. Confirm the three-layer direction still holds (session may have
   fresh doubts, same as the EUDPA-277 pause).
3. Scaffold files under
   `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` — draft
   empty modules matching the deliverables list.
4. Iterate:
   - `domain.js` with 2-3 example obligations first (one static enum,
     one computed enum, one predicate).
   - `runtime.js` primitives (`optionsFor`, `validate`) + tests.
   - `flow.js` with 3-5 pages.
   - Integration test walking a fulfilments scenario end-to-end.
   - Extend `domain.js` to include the lookup-derived option case
     (adds a `lookup-result` obligation).
   - Controller and data-dictionary sketches.
   - `RECOMMENDATION.md`.
5. Playback to team.

---

## Open design questions to resolve as they surface

- **Cross-field validation error surfacing.** Domain entries can
  carry `reasons`. Whether errors render inline on the field, as a
  page-level summary, or as a submit-block is a Flow / renderer
  choice. Prototype the shape; leave the rendering to the renderer
  layer.
- **Domain-side helpers.** Do we build a small helpers module for
  domain entries (`enumOptions`, `predicate`, `crossField`) parallel
  to `helpers.js` in obligations? Depends on volume of similar
  shapes. Start with plain data + closures; extract helpers if
  patterns recur ≥ 3 times.
- **How much of domain is data-shaped vs function-shaped.** Affects
  the data-dictionary exporter's coverage. Aim for as much data as
  possible; use function escape-hatch only where computation is
  genuinely dynamic.
- **The "allow invalid submit" enforcement policy.** Business-side
  question flagged in EUDPA-277 discussion. Orthogonal to model
  shape. Flag in RECOMMENDATION.md as awaiting business direction.
- **Predicate authoring ergonomics for cross-field rules.** Reading
  sibling obligation values inside a predicate function is
  straightforward; whether we want a small higher-order helper
  (`whenSpecies(elephant, () => value === 1)`) is TBD.

---

## References

- Ticket: <https://eaflood.atlassian.net/browse/EUDPA-249>
- Parent obligations spike doc:
  [`../../model-spikes/obligations-v4-model/obligations.md`](../../model-spikes/obligations-v4-model/obligations.md)
- Obligations manifest to import from:
  [`../../model-spikes/obligations-v4-model/obligations.js`](../../model-spikes/obligations-v4-model/obligations.js)
- Helpers used in obligations:
  [`../../model-spikes/obligations-v4-model/helpers.js`](../../model-spikes/obligations-v4-model/helpers.js)
- Gap log from EUDPA-277:
  [`../../model-spikes/obligations-v4-model/GAPS.md`](../../model-spikes/obligations-v4-model/GAPS.md)
- EUDPA-277 recommendation:
  [`../../model-spikes/obligations-v4-model/RECOMMENDATION.md`](../../model-spikes/obligations-v4-model/RECOMMENDATION.md)
