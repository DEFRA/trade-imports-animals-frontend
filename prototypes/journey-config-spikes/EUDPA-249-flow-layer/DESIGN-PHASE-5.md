# Phase 5 design gate — per-record conditional mandate

**Status: DEFERRED (YAGNI, 2026-07-16 decision by Paul).** See §10 for the deferral rationale. This document is retained as the design spec for whenever a real V4 rule surfaces that requires per-record conditional mandate; the code sites, decisions, and adversarial checks below are all still current against the baseline commit.

**Scope:** Phase 5 of the EUDPA-288 blend plan (see [PLAN.md §9](./PLAN.md)).
**Baseline:** everything landed as of SHA `88a03d6` (end of Phase 4.6).
**Design premise:** the one genuine B evaluator change. Highest-risk phase in the plan. MODEL_EXTENDER persona applies — rigour over speed, adversarial self-check, DESIGN-DELTA.md entry, backwards-compat guarantee.

---

## 1. What Phase 5 needs to accomplish

MATRIX row "Per-collection-entry conditional mandate (`enclosing`/`anyItem`)" — A wins, structural. REPORT §3.4:

> A wins **per-path conditional mandate**: `frame: 'enclosing'/'anyItem'` — "required on horse lines, not cattle lines" — is a data literal in A and _inexpressible_ in B, whose group-scoped record status is the static `obligation.status` (`evaluator.js:477/490/505`).

BRIEF §Migration #5:

> Add per-record conditional mandate (`buildImplication` return contract) (M–L, ~1–2wk). The one genuine B evaluator change; unlocks per-line rules the V4 set is made of. **Biggest risk of the whole plan** — REPORT: "get it wrong and you corrupt status, CYA and submit together."

**Concrete example.** Today, `numberOfPackages` (within `commodityLine`) is `status: 'optional'` uniformly. If the V4 spec later says "packages count is _mandatory_ on aquaculture lines but optional elsewhere", the current model can't express it — every line of `numberOfPackages` gets `status: 'optional'`. Phase 5 makes the record-level status computable from a per-record predicate.

## 2. Current shape (baseline)

`obligations/evaluator.js:497-582` `buildImplication`:

```js
// category === 'field' (group-scoped)
return {
  inScope: true,
  records: fulfilmentIds.map((fulfilmentId) => ({
    fulfilmentId,
    status: obligation.status // ← uniform per record
  }))
}
```

Same shape for `derived-leaf` (line 553-564) and `user-leaf` (line 566-579). **The record's `status` field EXISTS but is always set to the obligation's static `status`.** No mechanism today can vary it per record.

## 3. Code sites Phase 5 will touch

### 3.1 Producers (write side)

| File:Line                                                                    | What produces                                         | Change                                                                     |
| ---------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| `obligations/evaluator.js:527-551`                                           | `field` category → records with uniform status        | Widen: per-record status when applyTo supplies it                          |
| `obligations/evaluator.js:553-564`                                           | `derived-leaf` category → records with uniform status | Widen: per-record status when applyTo supplies it                          |
| `obligations/evaluator.js:566-579`                                           | `user-leaf` category → records with uniform status    | Widen: per-record status when applyTo supplies it                          |
| `obligations/helpers.js` `allowListed` / `notInUnionOf` / `filterAndProject` | records = passing gate keys                           | Optional: extend to attach per-record status decisions                     |
| **NEW** `obligations/helpers.js` per-record helper                           | —                                                     | Introduce e.g. `perRecordStatus(gate, mapping)` or extend existing helpers |

### 3.2 Consumers (read side — the "5-6 readers" the plan named)

| File:Line                                                                                      | What it consumes                                                                  | Expected change                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `engine/index.js:291-297` `effectiveStatus`                                                    | Reads `record.status ?? 'mandatory'`                                              | **Already correct** — reads per-record `status` if present, falls back. Zero change if new shape stays backwards-compat.                       |
| `engine/index.js:283-296` `pageStatus` per-obligation                                          | Uses `effectiveStatus`                                                            | Zero change (via `effectiveStatus`)                                                                                                            |
| `engine/index.js:543-565` `groupInvariantErrors` (Phase 1.4 minEntries + Phase 4.6.3 anyOfIds) | Iterates records — reads `.inScope` and stored values                             | Zero change (doesn't look at per-record status)                                                                                                |
| `features/check-your-answers/controller.js:102-107` `isMandatoryOnRecord`                      | Already reads `obligation.status ?? record?.status ?? impl.status ?? 'mandatory'` | **Already correct** — precedence favours obligation-level; per-record works via `record?.status`. Zero change if precedence rule is preserved. |
| `features/check-your-answers/controller.js:268`                                                | Uses `obligation.status ?? impl.status` for mandatory check                       | Widen to consult `record.status` — small                                                                                                       |
| `dump.js:77`                                                                                   | `impl.status ?? 'mandatory'`                                                      | Zero change (uses `impl.status`, not per-record)                                                                                               |
| `lib/build-field-descriptors.js:22-24`                                                         | Reads `impl.records` for rendering                                                | Zero change (doesn't inspect status)                                                                                                           |
| `features/commodity-lines/controller.js:93,183`                                                | Reads `impl.records`                                                              | Zero change                                                                                                                                    |
| `features/units/controller.js:104,233`                                                         | Reads `impl.records`                                                              | Zero change                                                                                                                                    |
| `lib/line-page-controller.js:64`, `lib/unit-page-controller.js:75`                             | Reads `impl.records`                                                              | Zero change                                                                                                                                    |

**Load-bearing surprise:** the record shape ALREADY carries `status` per record — the current codebase JUST WRITES `obligation.status` uniformly. The read side is already prepared. So the "5-6 readers" list is actually **~2 sites** requiring code changes:

- `evaluator.js:527-579` (producer widening — 3 branches: field, derived-leaf, user-leaf)
- `features/check-your-answers/controller.js:268` (one reader that skips the record layer)

Every other consumer either already reads `record.status` correctly (via `effectiveStatus` / `isMandatoryOnRecord`) or doesn't care about status at all.

**This is materially cheaper than the plan estimated.** REPORT §3.4 said "widen `buildImplication` 3 branches + helper lib + 5-6 readers"; the readers count is closer to 1-2. The evaluator + one CYA line is the load-bearing change.

## 4. Current test coverage over these sites

- `obligations/evaluator.test.js` (97 tests) — pins `buildImplication` output shape for all 5 categories. Every existing per-record status assertion pins `obligation.status` as the uniform value. Phase 5 adds new cases WITHOUT invalidating these (backwards-compat via optional new key).
- `obligations/evaluator.units.test.js` — smaller, targeted unit tests on the classifier + purge. No per-record status assertions.
- `engine/index.test.js` (~176 tests) — pins `effectiveStatus`, `pageStatus`, `containerStatus`. Includes tests that would already accept per-record `status`.
- `features/check-your-answers/*.test.js` — pins `isMandatoryOnRecord` precedence. Any change to line 268 needs a new test asserting the widened path.

Regression protection: any Phase 5 change that breaks `obligation.status` uniform records will fire failures in at least ~30 existing tests. Good safety net.

## 5. Design decisions Sam needs to make

### 5.1 Vocabulary — do we adopt A's `frame: 'enclosing'/'anyItem'`?

A expresses per-record conditionality via `activatedBy: { obligation, frame: 'enclosing' | 'anyItem' | undefined, ... }`. B doesn't have `frame` — its `applyTo` closure has direct access to fulfilments, so it picks its own frame implicitly.

**Options:**

(a) **Adopt A's `frame` vocabulary verbatim.** Consistency across the two branches. Helpers get a `frame` metadata key. Reachability prover reasons about frame semantics.

(b) **Use B-native "predicate over record"** — pass a `predicateForRecord(fulfilments, recordId) → { inScope, status }` closure. Meta-first helpers derive this from a data literal like `{ mapping: { horse: 'mandatory', cattle: 'optional' } }`.

(c) **Both** — `frame` as declarative structure, `predicateForRecord` as implementation. Overkill for a 1-2 case need.

**Recommendation:** (b). B's evaluator is already closure-based; a per-record predicate matches. `frame` is A's crutch for its data-vocab; adopting it into a closure-based evaluator adds concept-count without buying analysability we don't already have (the reachability prover works via `dependsOn` metadata, not frame).

### 5.2 Return-contract widening — exact shape

Records already carry `{ fulfilmentId, status? }`. Widening means:

- `status` becomes populated per record (currently uniform-from-obligation)
- Add optional `reasons?: [...]` per record for the "why is this line mandatory" explanation

**Options:**

(a) **Extend existing record shape** — `{ fulfilmentId, status, reasons? }`. Backwards-compat: unchanged records keep behaviour; new records opt into per-record.

(b) **New sibling key** — `perRecord: [{...}]` alongside `records`. More churn, no benefit.

**Recommendation:** (a). Minimal surface. Backwards-compat by construction.

### 5.3 Helper shape

Two candidate authoring surfaces for a per-record-conditional gate:

**(a) Mapping helper.** For discrete gate values → status:

```js
export const numberOfPackages = {
  ...,
  applyTo: perRecordStatus(commodityCode, {
    '0101': 'mandatory',       // horse
    '0102': 'optional',        // cattle
    default: 'optional'
  })
}
```

**(b) Two-branch helper.** For binary "in list vs not in list":

```js
applyTo: statusByAllowList(commodityCode, {
  values: HORSE_COMMODITIES,
  whenIn: 'mandatory',
  whenNotIn: 'optional'
})
```

**Recommendation:** land (a) first — it subsumes (b). Once (a) exists, (b) is a thin wrapper if we need it.

### 5.4 Reasons per record

The `reasons` channel today lives at the applyTo return level (`{inScope, status, reasons?}`). For per-record status, `reasons` should be per-record too — "line 2 is mandatory because it's an aquaculture commodity".

**Options:**

(a) **Per-record `reasons`** — record shape becomes `{fulfilmentId, status, reasons?}`.

(b) **Shared `reasons` on impl, referenced per record** — smaller data footprint. But confusing.

**Recommendation:** (a). Reasons are cheap; per-record co-locates them with the decision.

### 5.5 Backwards-compat proof

MODEL_EXTENDER rules require "every existing obligation and test behaves identically." The proof:

- Absence of a per-record predicate = `status` remains obligation's static status = identical to today.
- Existing 44 obligations don't opt into per-record → they get the current shape.
- Regression test: for each of the current 19 gated obligations, `buildImplication` output is byte-identical pre and post Phase 5.

**Adversarial pin:** run a full-manifest byte-diff between pre-Phase-5 and post-Phase-5 output (fixture-based). Zero diff on any obligation that doesn't opt in.

### 5.6 The three MODEL_EXTENDER adversarial questions

Phase 5's subagent MUST answer these in its report (per MODEL_EXTENDER persona):

(a) **One existing obligation unaffected.** Which? Suggested target: `passport` (uses `allowListed`, doesn't opt into per-record → must produce identical records before/after Phase 5). Pin with a byte-diff assertion.

(b) **Depth-2 cross-frame gate behaves.** How does a `unitRecord`-scoped obligation with per-record status behave when the gate value differs per commodity line? The current shape carries `fulfilmentId: 'line1/unit1'` — per-record predicate needs to see both the line's commodityCode AND the unit's identifiers. Sketch: pass `record.fulfilmentId` + a resolver for ancestor group values.

(c) **Wiped cross-frame field leaves no orphan.** If commodityCode flips on line 2 causing packages count to become "not mandatory" there, does the persisted `numberOfPackages` value for line 2 get purged (or retained if `wipeOnExit` semantics say so)? Current `purgeStorage` operates on `inScope`, not `status`. Phase 5's status change shouldn't trigger a purge — only in-scope changes should. Confirm this is what the design says.

## 6. Sketch of the widening

Producer side (`evaluator.js:527-551` for field category):

```js
if (category === 'field') {
  if (!obligation.within) {
    return { inScope: true, status: obligation.status }
  }
  const parentGroupFulfilmentIds = [
    ...(fulfilmentIdsByObligationId.get(obligation.within.id) ?? [])
  ]
  const perRecordPredicate = own?.perRecord // NEW — supplied by applyTo
  return {
    inScope: true,
    records: parentGroupFulfilmentIds.map((fulfilmentId) => {
      const perRecord = perRecordPredicate?.(fulfilmentId, amendedFulfilments)
      return {
        fulfilmentId,
        status: perRecord?.status ?? obligation.status, // fallback preserves current behaviour
        ...(perRecord?.reasons ? { reasons: perRecord.reasons } : {})
      }
    })
  }
}
```

Similar changes for `derived-leaf` (line 553-564) and `user-leaf` (line 566-579).

Helper side — new `perRecordStatus`:

```js
export function perRecordStatus(gateObligation, mapping) {
  const fn = (fulfilments) => {
    const gateStored = fulfilments[gateObligation.id]
    return {
      inScope: true,
      perRecord: (fulfilmentId, all) => {
        const gateValueForRecord = readValueAtPath(gateStored, fulfilmentId)
        const status = mapping[gateValueForRecord] ?? mapping.default
        return { status }
      }
    }
  }
  fn.metadata = {
    type: 'perRecordStatus',
    obligation: gateObligation.id,
    mapping
  }
  return fn
}
```

Metadata is fully data-shaped → reachability prover already handles it via `dependsOn` derivation. Add `'perRecordStatus'` to `STRUCTURED_HELPER_TYPES`; witness synth picks any key from `mapping`.

## 7. Commit sequencing (proposed)

If we accept the design above, Phase 5 collapses from the plan's 5+2 commits to ~3+2:

★ **feat(EUDPA-288): perRecordStatus helper + metadata classification (Phase 5.1)**

- New helper, tests, witness synth, coverage gate updates.
- No evaluator change yet — helper is unused.

★ **feat(EUDPA-288): buildImplication reads perRecord predicate for per-record status (Phase 5.2)**

- Widen 3 branches in evaluator.js.
- Backwards-compat byte-diff test on all 44 obligations.
- One new test asserting per-record decisions land on records.

★ **feat(EUDPA-288): CYA reader consults record.status (Phase 5.3)**

- Update `features/check-your-answers/controller.js:268`.
- Test: obligation with per-record status → CYA row respects it.

**HALT 5** — Sam walk-through with a real per-record obligation added (synthetic or the first real V4 rule that needs it).

## 8. What's NOT decided by this document

- **Which real V4 obligation to migrate first.** V4 spec has candidates; picking one is Sam's call. Could be a synthetic obligation first (safest) or a real one.
- **`enforcedAt` interaction.** Phase 5 might also want to widen `enforcedAt` (currently obligation-level) to per-record. Out of scope for this document; can be Phase 5.5.
- **UI treatment.** Once per-record status exists, the CYA UI + validation errors need to say "line 2 requires N packages because it's an aquaculture line". Copy work; not in Phase 5's technical scope.

## 9. Open questions for Sam

1. Do you want to accept the "close to zero reader-count" finding (Phase 5 is materially smaller than the plan estimated) or should we be more paranoid and treat every consumer of `impl.records` / `impl.status` / `record.status` as needing an audit + explicit test?
2. Any real V4 rule you want to migrate FIRST — before we add the helper — so the design is validated against a concrete need?
3. Are you comfortable with the closure-based `perRecord: (fulfilmentId, all) => {...}` shape, or would you prefer a pure-data mapping (no closures)?
4. `enforcedAt` widening — bundle into Phase 5 or defer to Phase 5.5?
5. Backwards-compat byte-diff: is a fixture-based full-manifest diff enough, or do you want a stronger property-based test?

---

## 10. Deferral rationale (YAGNI, decided 2026-07-16)

Paul reviewed this brief and raised the YAGNI challenge: "we can always document this as a possible extension point. Otherwise we risk YAGNI." Applied properly, that reasoning wins. Phase 5 is deferred out of EUDPA-288.

### The evidence for deferral

1. **No current V4 rule in the manifest needs per-record conditional mandate.** §3 above surveyed every group-scoped obligation. Every one has a uniform `status`. The two audit findings that changed status semantics (#6 for `numberOfPackages`, #11 for `containsUnweanedAnimals`) were resolved by making the field conditionally _in-scope_ via `allowListed`/`anyAllowListed`, not per-record-conditional-mandate. The one weak candidate flagged (`containsUnweanedAnimals` becoming per-line rather than per-notification) would be a bigger model change (moving from notification-level to line-scoped), not a per-record-mandate change on top of the existing shape.
2. **BRIEF §Bin's precedent applies.** The BRIEF explicitly warns against re-litigating the gate DSL that B built, shipped, and killed on evidence — because it didn't earn its keep against real use cases. Adding per-record mandate speculatively runs the same pattern: build a capability nothing uses, watch it accrete cruft, watch it get ripped out later.
3. **The current base is the "defensible base you can stop at"** (BRIEF §The bill). Phases 0–4.6 delivered the fix-bugs + recover-analysability + clean-storage-contract package that BRIEF marked as a natural stopping point. Adding Phase 5 speculatively muddies that stopping point.
4. **The design work isn't wasted.** This document captures every code site, every design decision, every adversarial check. Whoever picks up Phase 5 when a real V4 rule surfaces isn't starting from a blank page — they get a full spec plus a proposed 3-commit sequencing, plus the "load-bearing surprise" (~2 sites, not 5-6) that shortens the estimate materially.

### When to reopen this

- A new V4 spec revision (or audit finding) surfaces a rule like "packages count is mandatory on aquaculture lines but optional elsewhere" — a per-line status flip, not a scope flip.
- Sam identifies a rule already in V4 that the current model quietly forces into the wrong shape (e.g. an obligation currently marked as always-optional to accommodate a subset that should really be optional, at the cost of not enforcing the mandatory subset).
- A downstream requirement (analytics, reporting) needs to know why a specific instance's status is what it is — the `reasons`-per-record work in §5.4 becomes directly load-bearing.

Any of those triggers, come back here, verify the code sites haven't drifted (§3 uses SHA `88a03d6` — re-survey if the baseline has moved), pick answers to §5, follow §7's commit sequencing.

### What is NOT deferred

- The design brief itself. Committed at SHA `9e1365e`. Reviewable as an extension-point document.
- The load-bearing finding that `record.status` is already read correctly by every consumer via `effectiveStatus` / `isMandatoryOnRecord`. Future Phase 5 implementers should trust this survey (or re-verify with `git blame` on the same files).
