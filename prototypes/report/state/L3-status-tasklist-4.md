# L3 adversarial verification — ST-4 (status-tasklist)

**Verdict: AMENDED** — every mechanical assertion is true; the severity framing and
the implied retrofit cost are both overstated.

## What I verified (all quotes real, all mean what the claim says)

| Cited | Verified |
|---|---|
| B `obligations/obligations.js:405-410` | `commodityLine` has **no `applyTo`, no `requires`, no min-count key**. Comment: "structural group, always in scope." |
| B `engine/index.js:512-539` | `groupInvariantErrors` — `for (const record of groupImpl.records ?? [])`. **Zero records ⇒ zero iterations ⇒ zero errors.** Confirmed verbatim at :517. |
| B `features/hub/controller.js:60-69` | `linesManageStatus` — `records.length === 0 ? NOT_STARTED : FULFILLED`. Imperative, hub-local. |
| B `features/hub/controller.js:103-105` | `const status = isLinesManage ? linesManageStatus(state) : statusOfContainer(...)` — **explicitly bypasses `containerStatus`**. Confirmed. |
| B `features/check-your-answers/template.njk:33` | `{% if journeyState == 'fulfilled' %}<p>{{ submitReadyText }}</p>` — confirmed. |
| A `engine/evaluate/complete.js:65` | `if (obligation.requiredAtLeastOne && entries.length === 0) return false` — declarative, confirmed. |
| A `features/commodities/obligations.js:108,:123` | `requiredAtLeastOne: true` on both `animalIdentifiers` (nested) and `commodityLines`. Confirmed. |

## The defect reproduces (traced statically, end to end)

1. `flow/flow.js:439-560` — **every** commodity-line and per-unit page is declared via
   `presentsForEach { forEachOf: commodityLine | unitRecord }`. None uses plain `presents`.
2. `engine/index.js:258-270` — `expandPresents` iterates `state.obligations[groupId].records`.
   Zero records ⇒ **zero entries emitted** for the entire commodity-lines section.
3. `engine/index.js:561-570` — `groupInvariantErrorsForContainer` collects the groups a
   container presents. `commodityLine` has no `requires` ⇒ skipped. `unitRecord` HAS
   `requires.anyOf` (:581-593) but has zero records ⇒ zero errors.
4. `engine/index.js:583-599` — `journeyState` = `classifyEntries(inScope, state, 0)`.
5. `engine/index.js:398-403` — `totalMandatoryUnsatisfied === 0` ⇒ **`FULFILLED`**.
6. `template.njk:33` fires ⇒ CYA prints the ready-to-submit line.

Meanwhile `linesManageStatus` renders "Add commodity lines: **Not started**" on the same
state. The two surfaces contradict each other. **Claim's core mechanism: CONFIRMED.**

## Counter-examples hunted — and NOT found

- `grep -rn requiredAtLeastOne|minItems|atLeastOne|minCount|minimum` across **both** B trees
  (`EUDPA-249-flow-layer` + `model-spikes/obligations-v4-model`): the only hit is
  `domain/index.js:90` `integerMin` — a **numeric value floor**, not a record count.
- `domain/index.js:1-8` explicitly disclaims it: *"Nothing about identity, **cardinality**,
  or scope: those live in the obligations manifest."* And the manifest has no such key.
  Both layers point at each other; neither owns it.
- `obligations.md`: "cardinality" appears 8× and always means **single vs indexed** (a
  *shape*), never a minimum. The 3000-line doc does **not** claim a capability the code
  lacks — no doc-vs-code credit error here.
- `requires.anyOf` is **not** a substitute: it is per-*instance* ("≥1 of these six fields
  filled on each unit-record"), and it rides the same `records` loop. Adding
  `requires` to `commodityLine` would still yield zero errors at zero records.

## Where the claim overstates — the amendments

**1. "LIVE DEFECT, not a theoretical gap" overreaches on consequence.**
`routes.js` has **no submit route** (routes are: start, task-list, check-your-answers,
reset, lines CRUD, page GET/POST). Nothing ever calls `journeyState(..., submitted=true)`
from a route. So you cannot actually submit an empty consignment — B stops at CYA. The
defect is real but confined to the **status model and CYA copy**: the app *tells* the user
an empty consignment is ready to submit while its own task list says otherwise. That is a
genuine model bug, not a data-integrity breach.

**2. It implies an architectural gap. It is a cheap one.**
`classifyEntries(inScope, state, groupErrorCount)` already takes an **integer count of
extra mandatory concerns** as a first-class parameter, and that integer is already threaded
through all three callers — `pageStatus` (passes 0), `containerStatus` (passes
`groupInvariantErrorsForContainer(...).length`), `journeyState` (accumulates per section).
**The injection seam for min-cardinality already exists.** Retrofit = one manifest key
(`minInstances: 1` on `commodityLine`) + a ~10-line sibling of `groupInvariantErrors` that
emits an error when `records.length < min`, added to the same union. No engine reshape.
This is **not-built, not cannot-be-built** — the exact conflation the brief warns about.

**3. "No test pins it" is imprecise.**
`routes.test.js:126-145` **does** test the zero-lines case — it asserts the hub row reads
"Not started", not "Not applicable". But that test pins the **imperative patch**, not the
model. What is genuinely unpinned is `journeyState` / CYA under zero lines:
`engine/index.test.js:564-600` exercises `journeyState` only against a synthetic one-page
`readyFlow`, never the real flow. So: the zero-lines state IS tested — on the one surface
that was hand-patched to look right, and nowhere else. That is arguably worse than "no
test", and it is the sharper way to make the point.

## A's side — checked, and it holds

A does not merely declare the rule; it enforces it at two independent chokepoints:
- `flow/flow.js:72` — `gate: (scope) => scope.readyForCheckYourAnswers` (can't reach CYA).
- `engine/write.js:92` — `if (!scope.readyForCheckYourAnswers) return { ok: false, ... }`
  (can't submit).
Pinned by `flow/task-rows.test.js:292-310`, `flow/dispatch.test.js:190-197`,
`flow/gates.test.js:45-48`. A's advantage here is real and tested, not just documented.

## The shopping-list item

Take A's **`requiredAtLeastOne`** (declarative, nestable) and land it on B's **`groupErrorCount`
seam**, which is the better-factored place to receive it. Neither side wins outright: A has
the vocabulary, B has the injection point.
