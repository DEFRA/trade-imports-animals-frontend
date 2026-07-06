# Obligations V4 spike — session pickup note

Last active session: 2026-07-06.
Branch: `spike/EUDPA-277-obligations-v4-model`
Tip commit: `01d5ad6`
Tests: 233/233 green (61 units + 25 gates + 51 gate-resolver + 96 integration)

Everything in this file is scaffolding to resume a paused session. Read
`GAPS.md` and `TODO.md` for the durable spike findings and follow-on
work; read this file only to work out **where the plan was paused and
which decisions are still open.**

---

## Where we are

V4 modelling is complete. Every field on the Confluence spec
(`https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6497338582`)
that is in scope is expressed as an obligation.

| Iteration                                              | Commit    | Landed                                            |
| ------------------------------------------------------ | --------- | ------------------------------------------------- |
| 1 — smoke: countryOfOrigin, regionCode gate            | `9dcd69c` | ✓                                                 |
| 2 — notification-level singles + address blocks        | `9f610d3` | ✓                                                 |
| 3 — commodity line + numberOfPackages                  | `cd8aeed` | ✓                                                 |
| 4a.1 — gate combinator constructors                    | `a8201e2` | ✓                                                 |
| 4a.2 — gate resolver interpreter                       | `28dd424` | ✓                                                 |
| 4a.3 — evaluator integration + step-4 obligations      | `c79fbd0` | ✓                                                 |
| 5 — accompanying document all-or-nothing block         | `01d5ad6` | ✓                                                 |
| **4b — substrate refactor (keyspace)**                 | —         | planning paused here                              |
| **4c — backfill steps 1-3 to gatedBy**                 | —         | pending; possibly obsolete depending on 4b design |
| Spike close — GAPS.md finalisation + RECOMMENDATION.md | —         | pending                                           |

---

## Fresh design consideration flagged at pause

At the end of the last session, Paul raised second thoughts about
carrying **two** gating mechanisms in the model long-term:

- `gatedBy` — declarative combinator DSL (`allowListed`, `and`, `not`,
  `or`, `present`, `any`, `every` from `gates.js`; interpreted by
  `gate-resolver.js`). Used by step 4-5 obligations.
- `applyTo` — imperative JS function returning `{ inScope, status,
reasons? }` or `{ inScope, records: [...] }`. Used by step 1-3
  obligations.

His words: _"Might be easier to do this all one way, perhaps defining
some helper methods to make `applyTo` easier to write."_

This shifts the frame. The 4c plan currently written assumes backfill
**to** `gatedBy`. If we consolidate on `applyTo + helpers` instead, 4c
inverts (delete `gatedBy` / `gates.js` / `gate-resolver.js`; add small
helper module that gives `applyTo` the enumeration primitives it needs
to handle the identity-space-mismatch gap; migrate step 4-5 obligations
back to `applyTo`).

This is equivalent to _revisiting_ option **B** from the earlier design
walk (see the GAPS.md §Gap 2 discussion). Option B was rejected in
favour of F+G at the time because declarative gates looked more author-
friendly — but option B was rejected in the abstract, before we saw the
full implementation weight of F+G. Legitimate second thought.

### Options to weigh in the next session

**Option 1 — Consolidate on `gatedBy` (current direction).**
Backfill steps 1-3 to `gatedBy`. Delete `applyTo`. One mechanism,
declarative, statically inspectable via the combinator tree. Tooling
opportunities (data-dictionary export, static analysis, renderer hints)
are easier because gates are data.

- Author cost per obligation: ~3-5 lines of declarative data.
- Requires learning the combinator vocabulary.
- Escape hatch for unusual gates: none (would need to fall back to
  `applyTo` for genuinely custom logic, reintroducing the two-worlds
  problem).

**Option 2 — Consolidate on `applyTo` + helpers.**
Delete `gates.js` and `gate-resolver.js`. Add a small helpers module
(e.g. `helpers.js`) that exposes enumeration primitives so `applyTo`
can handle identity-space mismatches without in-obligation
enumeration.

- Author cost per obligation: ~5-10 lines of imperative logic
  (composable, still readable if the helpers are named well).
- No new vocabulary; JS is the vocabulary.
- Fully flexible for any weird gate.
- Loses static analysis of gates (they become function bodies).
- Cross-obligation aggregations (`any` / `every` from combinators)
  become slightly more verbose but still expressible.

**Option 3 — Keep both (status quo).**
Accept two mechanisms; author picks per obligation. Consistent with
"gatedBy is a fast path, applyTo is the escape hatch". More surface,
more docs, more choice-fatigue on new obligations.

**Option 4 — Ship three parallel obligations.js files and let
reviewers form an opinion.**

Land three self-contained manifests expressing the same V4 domain:

- `obligations.js` — the current mix (steps 1-3 applyTo, steps 4-5
  gatedBy). Left as-is.
- `obligations-all-gated.js` — every V4 obligation expressed via
  `gatedBy` (implies backfilling steps 1-3 to gatedBy).
- `obligations-all-applyto.js` — every V4 obligation expressed via
  `applyTo` (implies migrating steps 4-5 back to applyTo, plus
  building the enumeration helpers).

Shared integration test suite runs against all three — proves
functional equivalence and demonstrates the comparison isn't about
"does it work" but about "how does it read."

Reviewers (team, tech lead, whoever the recommendation is played
back to) can read three files expressing the same domain and form
an opinion grounded in concrete code, not abstract trade-off talk.
Spike delivers the strongest possible evidence for whichever
direction wins.

- Author cost per manifest: rewrite ~40 obligations in each style
  once; done. High one-time cost, high evidence value.
- Runtime cost: unchanged (evaluator still supports both mechanisms;
  the two alternative manifests are alternative _authorings_ of the
  same domain).
- 4b substrate refactor becomes optional in this option — the two
  manifest styles are the evidence artefact; substrate cleanup is
  independent.

### What each option means for 4b / 4c

- **Option 1**: 4b substrate refactor as planned; 4c backfill step 1-3
  to `gatedBy`.
- **Option 2**: no 4b (or a much smaller one focused on the
  enumeration helper module); no 4c backfill; instead a "reverse
  backfill" — migrate step 4-5 obligations to `applyTo` + helpers,
  then delete `gates.js` / `gate-resolver.js`. Overall smaller code
  footprint post-refactor.
- **Option 3**: skip 4b/4c entirely; go straight to RECOMMENDATION.md
  documenting both mechanisms as legitimate.
- **Option 4**: build the two alternative manifests + shared test
  suite (this is the "4c and reverse-4c both, in parallel" version).
  4b substrate refactor becomes optional. RECOMMENDATION.md then
  cites the three files as evidence and states the team's preferred
  direction.

### Recommendation for the next session

Start there. Pick between options 1 / 2 / 3 / 4 before writing any
more code. Option 4 is the most spike-shaped (evidence for a
recommendation is the ticket AC); options 1 / 2 pre-commit to a
direction; option 3 punts. The 4b plan below assumes option 1.

---

## The 4b plan (assumes option 1 — consolidate on `gatedBy`)

### Goal

Collapse the 5-category system into **2 categories** (`group` /
`leaf`) plus a `keyspace` metadata dimension on leaves
(`scalar` / `field` / `user` / `derived`). Every leaf runs through the
same scope-resolution → purge → implication pipeline. Category-specific
branching in the pipeline disappears.

### Design principles

- **Invisible to obligation authors.** Existing `obligations.js` does
  not change. Keyspace is inferred, not declared.
- **Small composable functions.** Every step is a named helper,
  single-purpose. Pipeline reads as a composition.
- **Uniform intermediate representation.** Every leaf produces
  `Map<path, decision>` via `resolveObligationScope`. Downstream
  steps consume that map — they do not care whether it came from
  `applyTo`, `gatedBy`, or a default-in-scope.
- **Behaviour preserved.** All 233 tests continue to pass.
- **Future-proof.** Adding a new obligation shape post-4b requires
  zero pipeline changes.

### The new pipeline

```
1. dropUnknownFulfilments                       (unchanged)
2. resolveScopeDecisions                        (NEW — unifies applyTo + gatedBy)
   ├── For each obligation:
   │     - If gatedBy: use gate resolver
   │     - Else if applyTo: convert applyTo result
   │     - Else: default-in-scope per keyspace
   └── Produces Map<obligationId, Map<path, decision>>
3. makeInScopeCheck                             (driven by decisions map)
4. purgeStorage                                 (uniform — no category branch)
   ├── For each leaf: filter storage by decisions
   ├── purgeScalarStorage                       (keyspace: scalar)
   └── purgeIndexedStorage                      (keyspace: field / user / derived)
5. enumerateGroupFulfilmentIds                  (unchanged)
6. buildImplications                            (uniform — dispatch group vs leaf)
   ├── buildGroupImplication
   └── buildLeafImplication
        ├── buildScalarImplication              (keyspace: scalar)
        └── buildIndexedImplication             (keyspace: field / user / derived)
```

**Default-in-scope per keyspace** (for obligations with neither
`applyTo` nor `gatedBy`):

- `scalar` — one decision at path `''`:
  `{ inScope: true, status: obligation.status }`.
- `field` — decisions Map with one entry per parent-group instance-id,
  all `{ inScope: true, status: obligation.status }`.
- `user` — decisions Map with one entry per own-storage key, all
  `{ inScope: true, status: obligation.status }`.
- `derived` — cannot exist without `applyTo` (derived keyspace requires
  a controller).

### Sub-iterations

**4b.1 — foundations.** Add helpers; no pipeline change yet.

- `keyspaceOf(obligation)` — infer keyspace from shape.
- `computeKeyspaces(obligations)` — Map<id, keyspace> for all leaves.
- `resolveObligationScope(obligation, applyToResult, gateDecisions, context)`
  — returns `Map<path, decision>` for any leaf.
- Internal helpers: `applyToToScope(applyToResult, keyspace, obligation)`,
  `defaultInScope(obligation, keyspace, context)`.
- Small isolation-test suite for the new helpers.
- Existing pipeline untouched; new helpers exist in parallel.

**4b.2 — pipeline replumbing.**

- `purgeStorage` reduces to one loop that dispatches
  `purgeScalarStorage` or `purgeIndexedStorage` per leaf's keyspace.
  Category-specific branches removed.
- `buildImplication` dispatches: `buildGroupImplication` for groups;
  `buildLeafImplication` → `buildScalarImplication` or
  `buildIndexedImplication` per keyspace.
- `evaluator.units.test.js` updated: existing tests hitting
  `purgeStorage` / `buildImplication` continue to work; new tests for
  the smaller helpers.

**4b.3 — classifier simplification + cleanup.**

- `classifyObligations` reduces its output to `'group' | 'leaf'`.
- Downstream code stops caring which flavour of leaf.
- Remove any now-dead code paths.
- (Optional stretch) Consolidate `enumerateInstancePaths` (in
  `gate-resolver.js`) with `enumerateGroupFulfilmentIds` (in
  `evaluator.js`).

---

## Open design questions

The following were asked at the pause point but not answered.
Reconsider whichever remain relevant once the option 1 / 2 / 3
choice above is settled.

### Q1 — Keyspace source

Should `keyspace` be inferred from obligation shape or declared
explicitly on each obligation?

- **Inferred** (recommended): computed from within-chain +
  `indexedBy.source` + presence of `status` / `applyTo`. Zero manifest
  churn.
- **Explicit on every obligation**: each obligation gains
  `keyspace: 'scalar' | 'field' | 'user' | 'derived'`. More
  self-documenting but every obligation needs updating.
- **Inferred with optional override**: infer by default; allow explicit
  `keyspace: ...` on obligations that want to be extra clear.

### Q2 — Helper location

Where should the new helpers live?

- **In `evaluator.js`**: everything in one place; file grows to ~800
  lines.
- **New file `scope-resolver.js`** (recommended): mirrors the
  `gates.js` / `gate-resolver.js` precedent from 4a; splits by
  concern; cleaner isolation testing.
- **Split further** — `metadata.js` + `scope-resolver.js`: most
  decomposed. Might be over-splitting.

### Q3 — Enumeration consolidation

Consolidate `enumerateInstancePaths` (in `gate-resolver.js`) and
`enumerateGroupFulfilmentIds` (in `evaluator.js`)?

- **Yes, unify in 4b.3** (recommended): they compute overlapping
  things; one named helper reduces duplication.
- **Defer to a later cleanup**: keep the two helpers as-is for now.
- **Unify in 4b.1**: consolidate as part of the foundations; larger
  4b.1 but no lingering duplication.

---

## Suggested next-session flow

1. Read this file top-to-bottom (5 min).
2. Decide option 1 / 2 / 3 / 4 for the two-mechanisms question (design
   discussion).
3. If option 1: answer Q1 / Q2 / Q3 and start 4b.1.
4. If option 2: sketch out the helper module for `applyTo`; plan a
   "reverse backfill" of step 4-5 obligations.
5. If option 3: skip to RECOMMENDATION.md drafting.
6. If option 4: draft the two alternative manifests
   (`obligations-all-gated.js`, `obligations-all-applyto.js`) and a
   shared integration test suite that runs against all three
   (`obligations.js` + the two alternatives). RECOMMENDATION.md then
   cites the three files as evidence.

Once the direction is chosen, delete this file — it is scaffolding
for the pause, not part of the durable spike output.
