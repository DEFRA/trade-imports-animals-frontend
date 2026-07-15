# L1 — Status and task-list derivation — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer`
Root: `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
(The `prototypes/model-spikes/obligations-v4-model/` ancestor contains **no** status
or flow code at all — 10 files, all obligations/evaluator/helpers/docs. This whole
dimension is a fork-side capability. Verified by `find`.)

## Headline

Status on Side B is **derived, never stored**, and derived by **one 5-way classifier
used at every level of the tree**. There is no `visited` flag, no `complete` flag, no
per-task record in the session. `readState(request)` is literally
`evaluateState(readFulfilments(request))` (`lib/state.js:42-43`), and every task-list
tag is recomputed from obligations × domain × flow on each request.

The alphabet is **Not Applicable / Optional / Not Started / In Progress / Fulfilled**
(+ a `Submitted` constant that is never produced at runtime). "Optional and skipped"
vs "incomplete" is a **first-class, declaratively-derived distinction** — this is the
single strongest thing in this dimension on Side B.

What is **absent**: any "cannot start yet" concept, any per-instance (per-line /
per-unit) status, and any way to say "a collection must have at least one instance".
The last of those has a visible consequence: **a journey with zero commodity lines
can reach `fulfilled` and show CYA's "ready to submit" banner** (see Limitation 3).

---

## Mechanisms

### M1 — Status is computed, not stored (declarative)

`lib/state.js:42-43`:

```js
export function readState(request) {
  return evaluateState(readFulfilments(request))
}
```

The session holds only `fulfilments` (raw answers) + id counters. No status field is
ever written. `contract.js:42-52` constructs the evaluator once at module load and
`evaluateState` re-runs the 7-step pipeline per request. Consequence: status can never
drift from the answers, and a change to an `applyTo` gate retro-actively changes every
tag with no migration.

### M2 — One 5-way classifier, three entry points (declarative)

`engine/index.js:386-410` — `classifyEntries(inScope, state, groupErrorCount)`:

```js
if (inScope.length === 0 && groupErrorCount === 0) return STATUSES.NOT_APPLICABLE
...
if (totalMandatoryConcerns > 0) {
  if (totalMandatoryUnsatisfied === 0) return STATUSES.FULFILLED
  if (touched.length === 0) return STATUSES.NOT_STARTED
  return STATUSES.IN_PROGRESS
}
// Only optional obligations are in scope — Case A.
if (touched.length === 0) return STATUSES.OPTIONAL
return STATUSES.FULFILLED
```

25 lines. Called from `pageStatus` (`:442-447`, always with `groupErrorCount = 0`),
`containerStatus` (`:469-474`) and `journeyState` (`:583-599`). The alphabet is defined
in exactly one place (`STATUSES`, `:274-281`).

### M3 — Container status is RE-DERIVED from the subtree, not rolled up (declarative)

`engine/index.js:469-474`:

```js
export function containerStatus(container, state) {
  if (isPage(container)) return pageStatus(container, state)
  const inScope = collectInScopePresentedEntries(container, state)
  const groupErrors = groupInvariantErrorsForContainer(container, state)
  return classifyEntries(inScope, state, groupErrors.length)
}
```

`collectInScopePresentedEntries` (`:480-494`) flattens every page's in-scope presented
entries in the subtree. There are **no roll-up precedence rules** (no "if any child is
IP then IP" ladder) — a mix of Optional + NS + F children is resolved by the same
classifier over the union of their obligations. Documented rationale at
`obligations.md:2252-2265` ("The alphabet is 5-way, and roll-up precedence rules for
the mix cases get fiddly").

### M4 — Applicability drives NA; the flow declares no visibility (declarative)

A page is NA when every presented entry is out of scope (`pageStatus` →
`entryInScope`, `:303-309`), and a subsection is NA when every page under it is. The
flow file declares **no** `showIf`/`hideIf` anywhere — `flow/flow.js` (667 LOC) has zero
visibility predicates. `presentsForEach` expands to one virtual entry per **existing
group record** (`expandPresents`, `:258-270`), so a per-line page with zero lines
collapses to NA automatically.

### M5 — Mandate (completion-mandate) is per-obligation and can be dynamic — for singletons (declarative, partial)

`effectiveStatus(obligation, path, state)` (`:291-297`) is the single lookup:

```js
if (path === null) return impl.status ?? 'mandatory'
const record = (impl.records ?? []).find((r) => r.fulfilmentId === path)
return record?.status ?? 'mandatory'
```

For **singleton** obligations the status comes from the `applyTo` decision, so mandate
can flip with state: `regionCode` is `mandatory` when `regionCodeRequirement === 'yes'`
and `optional` otherwise (`obligations/obligations.js:190-198`, via `branchedGate`); the
4 accompanying-document fields share one `branchedGate` that flips the whole block
optional→mandatory once a document type is picked (`:754-786`). Those flips move the
subsection tag between Optional / NS / IP / F with no code change.

For **within-group** obligations the record status is the STATIC declared one — see
Limitation 2.

### M6 — Group invariants fold into status as extra "mandatory concerns" (declarative)

`groupInvariantErrors` (`:512-539`) emits one error per in-scope group instance where
none of `requires.anyOf` is filled (the V4 "≥1 animal identifier per unit" rule,
declared at `obligations/obligations.js:581-593`).
`groupInvariantErrorsForContainer` (`:561-570`) unions across every group a container
presents, and the count is passed straight into the classifier
(`:398-400`: `totalMandatoryConcerns = mandatoryInScope.length + groupErrorCount`).

This is elegant: a cross-record rule blocks Fulfilled by the *same* arithmetic an
unfilled field does, at page/container/journey level, with no bespoke branch. Pinned by
`engine/index.test.js:1088` ("subsection with unfilled required-any-of stays
IN_PROGRESS (blocks F)").

### M7 — "Has input" vs "is fulfilled" — the NS↔IP distinction (declarative, via the domain layer)

Two separate predicates (`:318-343` and `:420-432`):

- `hasFulfilment` → `isValueFulfilled` → for `type === 'address'` entries delegates to
  `domainEntry.isComplete(value)`. A half-filled address is **not** fulfilled.
- `hasAnyInput` → `!isBlankValue(stored)`. A half-filled address **is** input.

So a partially-typed address makes a subsection read *In progress*, not *Not started*
and not *Completed*. Pinned end-to-end over HTTP at `routes.test.js:662-700` ("partial
address keeps the containing subsection In progress on the task list", asserting the
row is not `Not started` and not `Completed`).

### M8 — "Optional and skipped" vs "incomplete" (declarative — the standout)

The 5th status exists precisely for this. `classifyEntries:408-409`:

```js
// Only optional obligations are in scope — Case A.
if (touched.length === 0) return STATUSES.OPTIONAL
return STATUSES.FULFILLED
```

- Subsection with only optional obligations, nothing typed → **Optional** (turquoise
  tag, `features/hub/controller.js:28`), *not* Not started.
- Type anything into it → **Fulfilled**. Engagement (≥1 non-blank value) is the flip;
  there is deliberately no `visited` plumbing (`obligations.md:2198`: "No visited
  plumbing — engagement is measured by ≥ 1 non-blank value").
- An untouched optional obligation **never blocks** F at any level: only
  `mandatoryInScope` entries count as concerns (`:393-400`). So skipping optional work
  does not keep the journey out of `fulfilled`.

Tests: `engine/index.test.js:320` (Optional when every in-scope entry is optional and
none filled), `:338` (engagement flips Optional → Complete), `:303` (F when an in-scope
optional is unfilled but every mandatory is filled), `:524`/`:544` (same two at
container level).

### M9 — The hub itself is a thin renderer (declarative + 2 imperative patches)

`features/hub/controller.js` (141 LOC). One row per subsection (16 rows / 6 sections,
`flow/flow.js`), tag from `statusOfContainer`, text from an i18n key map
(`:34-41` → `locales/en.json:469-476`), classes from a hard-coded GDS map (`:25-32`),
rendered through `govukTaskList` (`template.njk:19`).

Gating on the hub is **NA = no link**:

```js
// features/hub/controller.js:113
if (href && (isLinesManage || status !== STATUSES.NOT_APPLICABLE)) {
  item.href = href
}
```

An NA row still renders — grey "Not applicable" tag, no link.

### M10 — Navigation is status-driven (declarative)

`firstUnfulfilledPage` (`:128-139`) returns the first page whose status is NS or IP —
it therefore skips NA, Optional and F pages for free. The hub's row link is
`firstUnfulfilledPage(subsection) ?? firstApplicablePage(subsection)` (`:54-58`), and
`contract.startPage` / `nextAfter` use the same primitive (`contract.js:101-127`). The
line/unit variants (`:149-201`) additionally skip **optional-status records**
(`if ((record.status ?? 'mandatory') !== 'mandatory') return null`).

### M11 — Headless status report (declarative)

`dump.js:60-68` emits `statusPerSubsection` + `statusPerPage` + `journeyState` for a
fixture, snapshot-pinned by `dump.test.js`. Any model change that alters a task-list tag
fails a snapshot. Cheap, high-value.

### M12 — Journey status + the Submitted escape hatch (partial)

`journeyState(flow, state, submitted = false)` (`:583-599`) — same classifier over every
in-scope entry in the flow; `submitted === true` short-circuits to `SUBMITTED`. **No
caller ever passes `true`** (grep: the only call sites are `contract.js:91-93`,
`features/hub/controller.js:121`, `features/check-your-answers/controller.js:342`,
`dump.js:94`, all with the default). There is no submit route. CYA renders a
"ready to submit" line when `journeyState == 'fulfilled'`
(`features/check-your-answers/template.njk:33`).

---

## Capability verdicts

| Capability | Verdict | Where |
|---|---|---|
| Not started / In progress / Completed | **declarative** | `engine/index.js:386-410` |
| Not applicable (from scope, not a flag) | **declarative** | `:303-309`, `:442-447` |
| Optional-and-skipped ≠ incomplete | **declarative** | `:408-409`; tests `engine/index.test.js:320,338` |
| Optional never blocks completion | **declarative** | `:393-400` |
| Partial composite (address) → In progress not Completed | **declarative** (delegates to `domain` `isComplete`) | `:318-343`, `:420-432`; `routes.test.js:662` |
| Cross-record invariant blocks Completed | **declarative** | `:512-570`, `:398-400` |
| Container status | **declarative** (re-derived) | `:469-474` |
| Conditional mandate (mandatory↔optional by state) — singletons | **declarative** | `obligations.js:190-198`, `:754-786` |
| Conditional mandate — per group instance | **absent** | evaluator hard-codes `status: obligation.status` on records (`evaluator.js:477,490,505`) |
| Cannot-start-yet / prerequisite gating on the hub | **absent** | no match for `cannot start`/`blocked`/`dependsOn` anywhere in the spike |
| Collection facet status (per-line / per-unit tag) | **absent** | `/lines` + `/units` lists render rows with "Not filled" text, no status tag (`features/commodity-lines/controller.js:126-175`, `features/units/controller.js:121-169`) |
| "Add step" subsection status ("has the user added a line?") | **imperative** | `features/hub/controller.js:60-69` |
| Task-list hrefs for collection subsections | **imperative** (3 hard-coded ids) | `features/hub/controller.js:80-90` |
| Minimum-cardinality ("at least one line") as a completion concern | **absent** | no `minInstances`/cardinality concept anywhere |
| Submitted | **partial** (constant + flag plumbed; never produced) | `:274-281`, `:583-584` |

---

## Limitations

### L1 — No "cannot start yet". NA is doing two jobs. (structural: no — but it needs a model-shape change, not a template change)

There is no prerequisite/dependency concept. Grep for `cannot start`, `cannotStart`,
`blocked`, `dependsOn`, `prerequisite` across the whole spike: **zero matches**.

A subsection that is unreachable *because the user has not answered an upstream gate yet*
and a subsection that is *permanently irrelevant to this consignment* both come out as
**Not Applicable**, because the classifier's only test is `inScope.length === 0`
(`:386-388`). The model cannot tell them apart because an out-of-scope decision carries
**no payload at all** — every helper returns a bare `{ inScope: false }`
(`helpers.js:198`, `:151`) and `reasons` are only attached on the *in-scope* branch
(`helpers.js:47`, `:78`). The `reasons` registry explains inclusion, never exclusion.

The spike knows: `obligations.md:2806-2810` — "**Q. Signposting Not Applicable Sections
in the Task List (deferred)** … Presentation concern; not implemented in the spike."

Retrofit cost: widen the Decision to carry a reason/kind on the false branch, add a 6th
status, teach `classifyEntries` to distinguish. Touches `helpers.js` (4 factories),
`evaluator.js` `buildImplication`, `engine/index.js` (STATUSES + classifier),
`features/hub/controller.js` (2 maps), `locales/en.json`. ~5 files. Not a rewrite, but
not free — and it is a *model* change, which is the thing this side is being judged on.

### L2 — Per-instance mandate is impossible: records carry the STATIC obligation status (structural: yes)

`evaluator.js:469-479` (field records) — and identically at `:490` (derived-leaf) and
`:505` (user-leaf):

```js
return {
  inScope: true,
  records: parentGroupFulfilmentIds.map((fulfilmentId) => ({
    fulfilmentId,
    status: obligation.status      // <-- the declared, static value
  }))
}
```

The `applyTo` decision's `status` is **discarded** for anything inside a group, and the
gate helpers cannot supply one anyway: `filterAndProject` returns
`{ inScope: true, records: passingKeys }` — a bare `string[]` of ids (`helpers.js:198-209`).

So an obligation cannot be *mandatory on commodity line 1 and optional on line 2*.
Within-group conditionality can only turn a field **on or off** per instance, never
change its mandate per instance. Every one of the 8 within-group gated obligations
(`numberOfPackages`, `passport`, `tattoo`, `earTag`, `horseName`,
`identificationDetails`, `description`, `permanentAddress`) uses a fixed
`status: 'optional' | 'mandatory'` plus a scope gate (`obligations.js:469-717`).

This is a contract-shape limit, not an oversight: fixing it means changing
`records: string[]` → `records: {fulfilmentId, status}[]` across all 4 helper factories,
3 evaluator branches, `effectiveStatus`, and the classifier. Retrofit ≈ 5 files, plus
every test that asserts on the record shape (`evaluator.test.js` alone is 1,159 LOC /
72 cases).

*This is the sharpest asymmetry question to put to Side A: can A express "this field is
mandatory on line 1, optional on line 2"?*

### L3 — Group cardinality minimum is inexpressible → a zero-line journey reads Fulfilled (structural: yes, as a model gap; the symptom is a live defect)

There is no `minInstances` / "at least one instance" concept on a group obligation.
`requires.anyOf` (`obligations.js:581-593`) is *per existing instance* —
`groupInvariantErrors:517` iterates `groupImpl.records`, so **zero records ⇒ zero
errors**.

`commodityLine` has no `applyTo` and no `requires` (`obligations.js:405-410`). With zero
lines, every per-line page's `presentsForEach` expands to zero entries (`:258-270`) ⇒ NA;
`cph` and `containsUnweanedAnimals` are `anyAllowListed` over `commodityCode` ⇒ out of
scope (`:513-518`, `:549-554`). Therefore `journeyState` sees **no unsatisfied mandatory
concern from the commodity-lines half of the journey at all**: fill the notification-level
singletons and the journey classifies as `fulfilled`, and CYA prints its "ready to
submit" line (`check-your-answers/template.njk:33`).

The hub *looks* right only because of an imperative patch:

```js
// features/hub/controller.js:60-69
function linesManageStatus(state) {
  const records = state.obligations?.[commodityLine.id]?.records ?? []
  return records.length === 0 ? STATUSES.NOT_STARTED : STATUSES.FULFILLED
}
```

That patch is **hub-local**. It does not participate in `journeyState`, so the task list
can say "Add commodity lines — Not started" while CYA on the same state says the journey
is ready to submit. No test pins the zero-line journey status (`routes.test.js:147` only
checks the *tag* after adding a line).

### L4 — No per-instance (collection facet) status anywhere (structural: no)

There is no `lineStatus(lineId)` / `unitStatus(lineId, unitId)` primitive. The engine has
per-instance **navigation** (`firstUnfulfilledPageForLine` / `ForUnit`, `:149-201`) but
never turns that into a status. Consequences:

- `/lines` renders each line as a summary block of rows with `t('commodityLines.notFilled')`
  placeholders — **no status tag per line** (`features/commodity-lines/controller.js:136-157`).
  Same for units (`features/units/controller.js:131-154`).
- The `commodity-lines-details` subsection shows **one tag for all N lines**
  (`containerStatus` unions every line's entries), so 4 complete lines + 1 empty line =
  a single "In progress" with no indication of which line.

Cheap to close: `classifyEntries` already takes a flat entry list; a `statusOfLine`
would filter `collectInScopePresentedEntries` by `path === lineId`. ~1 engine primitive
+ 1 contract export + list-template tags. Genuinely "not built yet".

### L5 — Two imperative special-cases in the hub (structural: no)

`features/hub/controller.js:80-90` hard-codes three subsection ids
(`commodity-lines-manage`, `commodity-lines-details`, `per-unit-records`) to route to
`/lines`, and `:98-105` special-cases `commodity-lines-manage`'s status. The flow layer
has no way to declare "this subsection is fronted by a bespoke collection UX", so the
knowledge lives in the renderer. Adding a second collection (e.g. accompanying documents
as a repeatable) means editing the hub controller.

### L6 — `Submitted` is decorative (structural: no)

`STATUSES.SUBMITTED` exists (`:280`) and `journeyState`'s `submitted` param exists
(`:583`), but nothing sets it — there is no submit route and no persisted flag (session
holds fulfilments only). The hub's tag map has a green Submitted entry
(`features/hub/controller.js:31`) that can never render.

### L7 — Doc-vs-code disagreement: NA subsections are NOT hidden (finding)

`obligations.md:2277-2281` (Navigation algorithm, step 1): "SubSections with status Not
Applicable are **hidden by default**".

The code does not hide them. `features/hub/controller.js:107-116` builds an item for
**every** subsection and merely withholds the `href` when the status is NA — so the user
sees a grey "Not applicable" row with no link. No test asserts hiding; `routes.test.js:143`
only asserts that the *Add commodity lines* row is not NA. Code wins: NA rows are visible
and unlinked.

### L8 — `dump.js` `missingRequired` ignores `presentsForEach` (structural: no)

`dump.js:74` iterates `page.presents ?? []` only. Every per-line / per-unit missing
mandatory (commodity code, species, number of animals, permanent address…) is silently
absent from the headless "what's missing" report, even though the *statuses* in the same
report are correct. A stakeholder reading the dump gets a false "nothing missing".

### L9 — `sectionEntryMode: 'firstApplicablePage'` is dead (structural: no)

`flow/flow.js:89` declares it; nothing reads it (grep: no other occurrence). Section
entry is hard-wired to `firstUnfulfilledPage ?? firstApplicablePage` in the hub
(`:54-58`).

---

## Metrics

| Metric | Value |
|---|---|
| Status machinery (engine) | `engine/index.js:231-599` ≈ **369 LOC** (incl. group invariants + JSDoc) |
| The classifier itself | **25 LOC** (`:386-410`) |
| Exported status primitives | **5** (`pageStatus`, `containerStatus`, `journeyState`, `effectiveStatus`, `expandPresents`) + 2 group-invariant fns |
| Status alphabet | **6 constants declared, 5 derivable, 1 (`submitted`) never produced** (`:274-281`) |
| Task-list rows | **16 subsections** across **6 sections** (`flow/flow.js`, `kind: 'subsection'` × 16) |
| Hub controller | **141 LOC**, of which **2 imperative special-cases** (`linesManageStatus`, 3-id `subsectionHref` branch) |
| Status call sites (non-test) | `containerStatus`: 2 (`features/hub/controller.js:105`, `dump.js:62`); `journeyState`: 3 (hub `:121`, CYA `:342`, dump `:94`); `pageStatus`: 2 (`dump.js:67`, + internal from `firstUnfulfilledPage`) |
| Model-level status tests | **31** in `engine/index.test.js` — pageStatus 14 (`:254-467`), containerStatus 5 (`:475-560`), journeyState 3 (`:564-590`), groupInvariantErrors 6 (`:907-1060`), containerStatus+invariants 2 (`:1063-1130`), invariant scoping 1 (`:1143`) |
| HTTP-level status tests | **4** in `routes.test.js` (`:116` tags render, `:128` lines-manage not NA, `:147` lines-manage Completed, `:662` partial address → In progress) |
| Snapshot coverage | `dump.test.js` pins `statusPerSubsection` + `statusPerPage` for 3 fixtures |
| Files touched to add a 6th status | **4** (`engine/index.js` STATUSES + classifier, `features/hub/controller.js` ×2 maps, `locales/en.json`) |
| Files touched to make status per-group-instance (L2) | **≥5** + `evaluator.test.js` (1,159 LOC / 72 cases) record-shape assertions |
| Status stored in session | **zero fields** (`lib/state.js` — fulfilments + id counters only) |
