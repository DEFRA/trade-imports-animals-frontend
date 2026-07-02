# tests/ — the five browserless tiers

Below the three shared Playwright specs (the hard acceptance gate,
TEST-5) sit five browserless tiers. Everything here runs under the
scoped suite:

```bash
npm run test:obligations-standalone-spike
```

No new npm dependencies anywhere in this folder — the HTML extractor is
plain regex (no cheerio/jsdom) and the state enumeration is a bounded
hand-rolled cross product (no PBT framework).

## Tier map

| Tier | File                       | What it proves                                                                                                                                                                                                                                                                                                                                               | Design ids                                            |
| ---- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| 1    | `reachability.test.js`     | Static reachability: pure JSON walk — every catalogue obligation presented by ≥1 Page in BOTH Flows, no dangling references, closed appliesWhen name list, unique page ids/slugs                                                                                                                                                                             | TEST-1, TEST-6, TEST-15                               |
| 2    | `alignment-walker.test.js` | Model↔template alignment per Page via the REAL projection (contract `pageViewModel` → nunjucks → extraction): forward/reverse control alignment, option-domain and input-type alignment, hard-mandate strict failure (`about-you` is the ONLY page that blocks an empty save — Rulings item 3), GDS a11y error wiring, required-attribute ban, page coverage | TEST-2, TEST-7..12, FLOW-12                           |
| 3    | `completability.test.js`   | Bounded-enumeration completability + dead-mandate detection over the 162-state controlling-dimension space: every state completes to journeyState Fulfilled, every authored mandate fires somewhere, the fixed-point wipe is idempotent (closure), EvaluationResult shape invariant                                                                          | TEST-3, TEST-13, TEST-14, TEST-X1_1, FLOW-13, EVAL-37 |
| 4    | `flow-equivalence.test.js` | Cross-Flow evaluator equivalence: obligation-level scripts replayed against `model/flow.json` AND `model/skeleton-flow.json` land in deep-equal canonical end-states; full-quote pinned against a hand-authored expected state; sectionEntryMode invariance                                                                                                  | TEST-4, TEST-16..30, ARCH-3, DEF-1                    |
| 5    | `rename-survival.test.js`  | The flagship dual-identifier proof: rename `fullName` (same UUID) → fulfilments survive untouched; delete the record → pruned with a logged drop; pruning idempotent; name collision rejected                                                                                                                                                                | SHAPE-6, SHAPE-10..12, PERSIST-23..31                 |

Helpers (`helpers/`): `render-page.js` (fixture journey → real contract
projection → real nunjucks environment), `extract-inputs.js` (+ its own
pinning test — the walker's guard is itself new code), `enumerate-states.js`
(the 162-state generator + canonical satisfying value per type),
`script-runner.js` (obligation-level replay through the real
orchestrator; `NavigationError` keeps navigation failures loudly
distinct from equivalence diffs). Fixtures (`fixtures/`): `states/` for
the walker, `scripts/` for the equivalence tier — `full-quote.expected.json`
is AUTHORED, never captured from a run.

## Mandated ordering (TEST-29)

`flow-equivalence.test.js` is deliberately the LAST dynamic tier: by the
time it runs, reachability (tier 1), rendering alignment (tier 2) and
completability (tier 3) have already vouched for the pieces it composes,
so an equivalence failure points at the evaluator split itself. Inside
the tier, navigation failures throw `NavigationError` and are re-thrown
as `NAVIGATION FAILURE (not an equivalence diff)` — a script that cannot
reach a page must never be misread as an end-state divergence.

## Demonstrated structurally, not proven

The equivalence tier DEMONSTRATES that the ObligationEvaluator is
Flow-ignorant over three curated scripts and two Flows sharing one
catalogue. It is evidence, not proof: no exhaustive script space, no
adversarial Flow shapes. The claim it supports is the architectural one
(the engine/flow-eval split carries DEF-1/ARCH-12) — the authored
expected state guards against both Flows sharing one bug, nothing more.

## Pinned-test registry

Design-mandated pins living OUTSIDE this folder, in their owning
packages (colocated `*.test.js`):

| Pin                                                                                                         | Owning test                                                                                                        |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Contract surface — exactly 21 exports, drift is a reviewed addition (TOOL-21)                               | `contract/index.test.js`                                                                                           |
| EVAL-35 `TODO review with Sam` header tag on the fixed-point loop                                           | `orchestrator/fixed-point.test.js`                                                                                 |
| Graft 4 — evaluators never mint fulfilment ids; minting confined to the orchestrator                        | `orchestrator/fulfilment-ids.test.js`                                                                              |
| Scope expressiveness demos — interval algebra, quantifiers, mandate-flip (SHAPE-29/31, EVAL-40, FULF-16/17) | `engine/scope/expressiveness.test.js`                                                                              |
| Reason-code ↔ message-catalogue lockstep (no leaked codes, graft 7)                                         | `engine/reasons.test.js`, `model/messages.test.js`, `i18n/resolve.test.js`                                         |
| Exact page-hard mandate set = `{fullName}` (Rulings item 3)                                                 | `model/flow.test.js`                                                                                               |
| Required-attribute ban in every widget builder and template                                                 | `templates/partials/fields.test.js`, `lib/fields/*.test.js`, tier 2                                                |
| Accessible-name traps (single visible 'Yes', Day/Month/Year, 'Change recent claims')                        | `templates/partials/fields.test.js`, `templates/check-your-answers.test.js`                                        |
| Yes–No–Yes wipe at the orchestrator seam                                                                    | `orchestrator/scope-exit-wipe.test.js`, tier 4 (`claims-yes-no-yes`)                                               |
| Post-submit storage freeze (one-way flip, writes rejected — Rulings item 1)                                 | `store/journey-repository.test.js`, `contract/guards.test.js`                                                      |
| Provisional settlements labelled in code (STATUS-3 vs STATUS-11, NAV-33/34, status-filtered nextAfter)      | `flow-eval/container-status.test.js`, `flow-eval/journey-state.test.js`, `flow-eval/navigation/next-after.test.js` |
| Quote fires on scope entry during the pass, never at submit (risk 4)                                        | `orchestrator/system-handlers.test.js`                                                                             |

Fixture conventions: state fixtures are name-keyed value maps
(`dump.js` style, indexed obligations pre-shaped as
`{ fulfilmentId: { value } }`); `$comment` keys are documentation, not
data. Script fixtures address obligations by NAME only — never pages —
so one script drives any Flow over the same catalogue.
