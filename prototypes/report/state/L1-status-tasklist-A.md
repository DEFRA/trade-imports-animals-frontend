# L1 — Status and task-list derivation — SIDE A ("live-animals")

Clone: `workareas/model-comparison/clone-live-animals` (HEAD b6ac2ed)
Root: `prototypes/standalone/live-animals/`
All paths below are relative to that root unless prefixed `prototypes/`.

---

## 0. One-paragraph verdict

Status on side A is **fully derived, never stored**, and computed by one 79-line pure
function (`engine/status.js`) with **exactly two production call sites**
(`flow/task-rows.js:59`, `flow/section-status.js:9`). The *inputs* to that function are
declarative — obligation flags (`required`, `requiredAtLeastOne`, `requiredOneOf`,
`activatedBy`, `enforcedAt`) plus the boot-derived scope set — but the *grouping* into
hub rows is a flow-side data literal (`flow/task-rows.js`, 11 rows), and the *rendering*
(copy, tag colours, group captions, "Cannot start yet") is **hand-coded English in one
208-line controller** (`features/hub/controller.js`). The distinctive engine capability
here is the **collection facet status part** — a `{collection, only|except}` literal that
splits ONE stored collection across TWO hub rows with independent statuses, reusing the
same `collectionComplete` walk with a member filter. "Cannot start yet" is **not a
status**: it is a sixth, presentation-only state derived from the gate, and the gate is
in turn derived from `enforcedAt: 'continue'` facts on obligations plus flow order — no
hand-authored prerequisite graph exists. The single largest honest gap is that there is
**no per-collection-entry status** available to any page: `entryComplete` /
`collectionComplete` / `satisfied` are not on the engine's 10-export facade, so a page
that wants "Commodity 2 still owes an identifier" must hand-roll it.

---

## 1. The status function — MODELLED DECLARATIVELY

### 1.1 Five statuses, one pure function

`engine/status.js:5-9` declares the vocabulary:

```js
export const NA = 'not-applicable'
export const NOT_STARTED = 'not-started'
export const IN_PROGRESS = 'in-progress'
export const FULFILLED = 'fulfilled'
export const OPTIONAL = 'optional'
```

`engine/status.js:59-79` is the whole algorithm:

```js
export const statusOf = (parts, answers, inScope) => {
  const inScopeParts = parts.filter((part) => inScope.has(partKey(part)))
  if (inScopeParts.length === 0) return NA

  const required = inScopeParts.filter(partRequired)
  if (required.length === 0) {
    const started = inScopeParts.some((part) => partStarted(part, answers))
    if (!started) return OPTIONAL
    return inScopeParts.every((part) => partSatisfied(part, answers))
      ? FULFILLED
      : IN_PROGRESS
  }

  const allRequiredSatisfied = required.every((part) =>
    partSatisfied(part, answers)
  )
  if (allRequiredSatisfied) return FULFILLED
  return inScopeParts.some((part) => partStarted(part, answers))
    ? IN_PROGRESS
    : NOT_STARTED
}
```

Three orthogonal predicates over a part, each of which knows how to handle both a
plain obligation-id string and a facet object:

- `partRequired` (`status.js:28-34`) — `required || requiredAtLeastOne` on the
  obligation (for a facet: on the collection OR any included member).
- `partStarted` (`status.js:36-42`) — `isAnswered` of the value; for a collection
  facet, "any entry has any included member answered".
- `partSatisfied` (`status.js:44-57`) — `satisfied()` / `collectionComplete()` from
  `engine/evaluate/complete.js`.

**Nothing is stored.** `engine/read.js:27-35 #makeScope` calls `reconcile(answers)` on
every read; `engine/read.js:43-44 #get` calls `makeScope` on every request. There is no
status field in the store (`grep -rn "status" engine/store.js` → no hits) and no cache.
DESIGN-DELTA calls this out as the resume-self-heal property; `engine/resume-self-heal.test.js`
pins it. Status therefore cannot go stale — a change to the obligation data changes every
status on the next page load.

### 1.2 `NOT_APPLICABLE` is scope, and scope is derived from `activatedBy`

`statusOf` line 60-61: NA when no part is in the `inScope` set. `inScope` comes from
`engine/evaluate/reconcile.js:6-47`, the fixpoint loop over `activatedBy` predicates.
So "Not applicable" is a *consequence of the conditionality model*, not a separate
authored fact. **Declarative.**

Caveat worth recording for the comparison: `statusOf` only ever consults the **root**
path key (`partKey` = the id for a string, `part.collection` for a facet,
`status.js:26`). Per-instance scope keys (`commodityLines[0].numberOfPackages`) are
never looked at by `statusOf` — per-instance conditionality re-enters through
`complete.js`'s `ctx` frames instead. The two resolvers are kept in agreement by the
"resolver-unity" invariant (DESIGN-DELTA #5), not by sharing one code path.

### 1.3 `OPTIONAL` — genuinely derived, and it is the "optional vs incomplete" answer

`documents` (`features/documents/obligations.js:21-30`) carries **no** `required` and
**no** `requiredAtLeastOne`, but each of its four item fields is `required: true`
(lines 1-19). That single data shape produces the whole optional-collection lifecycle
with no code:

| answers | branch | status |
|---|---|---|
| `documents` absent | `required.length === 0`, not started | **OPTIONAL** |
| one partial entry | `required.length === 0`, started, not satisfied | **IN_PROGRESS** |
| one complete entry | started + satisfied | **FULFILLED** |

Pinned at `flow/task-rows.test.js:94-105` and at E2E level
(`prototypes/e2e/live-animals.spec.js:1193` "Optional" → `:1273` "Completed").

`readyForCheckYourAnswers` (`flow/section-status.js:11-15`) accepts
`FULFILLED || NA || OPTIONAL` — so you may submit with no documents, but you may **not**
submit with a half-filled document (`task-rows.test.js:280-283`, "the happy path with a
partial document" is in the `notSubmittable` battery). That is the correct GDS
distinction between *optional-and-skipped* and *started-but-incomplete*, and it falls
out of the model rather than being coded.

What is **absent**: any notion of *deliberately declined*. OPTIONAL means "untouched".
There is no `noneOfThese` / "I have no documents" flag, and no state distinguishing
"user considered and skipped" from "user never opened it". Removing all entries returns
the row to OPTIONAL (it is reversible), but the hub cannot say "None added — confirmed".

---

## 2. Collection facet status — the distinctive capability

### 2.1 What it is

A status part is either an obligation id **or** a facet literal
(`engine/status.js:11` `const isFacet = (part) => typeof part !== 'string'`):

```js
{ collection: 'commodityLines', except: ['animalIdentifiers'] }   // flow/task-rows.js:29
{ collection: 'commodityLines', only:   ['animalIdentifiers'] }   // flow/task-rows.js:36
```

Facet resolution (`status.js:13-21`) reads the collection's `item` array from the
registry and filters it. Satisfaction (`status.js:44-57`) delegates to the *same*
`collectionComplete` walk used for the whole collection, passing the filter through as
an optional 4th argument:

```js
const partSatisfied = (part, answers) => {
  if (!isFacet(part)) return satisfied(part, answers)
  const parent = facetParent(part)
  return collectionComplete(parent, answers[parent.id], {...}, facetMemberFilter(part))
}
```

In `engine/evaluate/complete.js:5-24` the filter narrows only which members are
**checked** — the sibling list used for reference resolution stays complete:

```js
const siblings = obligation.item ?? []
const members = includesMember ? siblings.filter(includesMember) : siblings
```

so an enclosing-frame activation (a Cat's identifier owing its `permanentAddress`)
still resolves correctly *through* a facet (`flow/task-rows.test.js:184-205`), and a
`requiredOneOf` group is enforced only by the facet that owns one of its members
(`complete.js:11-22`, the `groupOwned` clause).

### 2.2 Why it exists — and this is the load-bearing point

The identification page **collects nothing**:

`features/commodities/animal-identification.controller.js:20`
```js
export const meta = { ...page, collects: [] }
```

Because `flow/dispatch.js` enforces **one obligation → exactly one page**
(`dispatch.js:45-52` throws on a second claimant) and ownership at depth is *derived*
from the nearest collection ancestor (`dispatch.js:15-24`), `animalIdentifiers` is owned
by the commodities-search page. A second page over the same collection can therefore own
**no obligation at all**, and a task row built the default way
(`task-rows.js:55-56` `row.parts ?? row.pages.flatMap(page => collectsOf(page.id))`)
would have zero parts → `statusOf([])` → NA → the row would render "Not yet started"
forever (see §5.3).

The facet is the *repair*: the row declares `parts` explicitly and the engine gives it a
real, independently-tracked status. DESIGN-DELTA #13 (lines 545-563) states this
intent ("lets the design's hub split one stored collection between two task rows … without
moving any data"), and the code matches the doc.

Verified behaviour (`engine/status.test.js:36-64`, `flow/task-rows.test.js:137-205`):

| answers | "What are you importing?" (`except`) | "Animal identification" (`only`) |
|---|---|---|
| one line, all line fields, no identifiers | FULFILLED | NOT_STARTED |
| one line, identifiers only | IN_PROGRESS | FULFILLED |
| two lines, one still owes its at-least-one identifier | — | IN_PROGRESS |

And an agreement invariant is pinned (`engine/status.test.js:66-91`): *both facets
FULFILLED ⟺ the unfaceted collection is FULFILLED*.

**Classification: MODELLED DECLARATIVELY, but the declaration lives flow-side.** The
facet literal is in `flow/task-rows.js`, not in `features/*/obligations.js`. The
obligation model does not know it has been split. That is deliberate (the model carries
no presentation), but it means the split is a *view* fact and the engine's contribution
is purely the filtered walk.

---

## 3. Task rows and the hub — where declarative stops

### 3.1 `flow/task-rows.js` (59 LOC) — data literal, 11 answer rows

```js
export const rowParts = (row) =>
  row.parts ?? row.pages.flatMap((page) => collectsOf(page.id))

export const rowStatus = (row, answers, inScope) =>
  statusOf(rowParts(row), answers, inScope)
```
(`task-rows.js:55-59`)

A row names its **flow pages** by object reference; its status parts default to the
union of those pages' `collects`, resolved through the boot-built dispatch index. Rows
spanning several pages aggregate automatically — `arrivalDetails` is one page collecting
five obligations (`features/transport/port-of-entry.controller.js:22-30`); `transporter`
spans three pages (`task-rows.js:40-47`) and its status follows the `transporterType`
branch into scope with no extra code (`flow/task-rows.test.js:70-92`).

**Nothing in `task-rows.js` restates the obligation model as a string.** The one hand-authored
fact per row is the flag `conditional: true` (line 39, one carrier: `transitCountries`).

### 3.2 `flow/section-status.js` (15 LOC) — the submit gate

```js
export const readyForCheckYourAnswers = (answers, inScope) =>
  taskRows.every((row) => {
    const status = rowStatus(row, answers, inScope)
    return status === FULFILLED || status === NA || status === OPTIONAL
  })
```
(`section-status.js:11-15`)

This one boolean is the flow's **only authored gate** (`flow/flow.js:72`
`gate: (scope) => scope.readyForCheckYourAnswers`) and is also what `submitJourney`
consults. It is injected *downward* into the engine at boot
(`engine/read.js:14-16`, used at `read.js:33`) so the engine keeps zero `flow/` imports;
the unconfigured default **throws** (`read.js:7-12`).

Submit-readiness is thus a pure roll-up of the same derived row statuses the hub shows —
one source, two consumers. `flow/task-rows.test.js:236-318` proves the row roll-up admits
exactly the journeys the retired *section* roll-up admitted, across 13 named journey
states.

### 3.3 `features/hub/controller.js` (208 LOC) — HANDLED IMPERATIVELY

Everything the user actually *sees* is hand-written here:

- `GROUPS` (lines 21-118, **98 of the file's 208 lines**) — six numbered group captions,
  12 rows, each with a hardcoded English `title` and `hint`. No copy exists in the
  obligation model, and there is no i18n layer anywhere in side A.
- `STATUS_TAG` (lines 120-130) — the status→GDS-tag map (Completed/green,
  Optional/plain text, In progress/light-blue, Not yet started/blue).
- `CANNOT_START_STATUS` (lines 132-135).
- `buildRowItem` (lines 152-162) — the per-row assembly, including the NA-hiding rule
  and the review-row special case.
- `buildCommodityTotals` (lines 173-188) — the two stat cards; a bespoke sum over
  `collectionView`, nothing to do with the status engine.

The template (`features/hub/template.njk`, 51 lines) is a stock `govukTaskList` per
group and carries no logic.

So: **status is derived; the task list is authored.** Adding a row is a two-file edit
(`flow/task-rows.js` + the `GROUPS` literal), and the copy cannot come from the model
because obligations carry no labels by design (`docs/obligation-model.md`).

---

## 4. "Cannot start yet" — derived, but it is not a status

This is the sharpest distinction in the dimension. `statusOf` returns five values and
**none of them is "cannot start"**. The hub computes gating separately:

```js
const buildRowItem = ({ id, title, hint }, answers, scope) => {
  if (id === 'review') return buildReviewItem({ title, hint }, answers, scope)
  const row = taskRowById(id)
  const status = rowStatus(row, answers, scope.inScope)
  if (row.conditional && status === NA) return null
  const base = { title: { text: title }, hint: { text: hint } }
  if (!rowGatePasses(row, scope)) {
    return { ...base, status: CANNOT_START_STATUS }
  }
  return { ...base, href: rowEntry(row, scope), status: statusTag(status) }
}
```
(`features/hub/controller.js:152-162`)

A gated-out row has its status **computed and then discarded**, and renders as grey text
with **no `href`** (`t2-hub-copy.test.js:111-121` asserts `href` is `undefined`).

The gate itself is fully derived (`flow/navigation.js:18`):
`rowGatePasses(row) = pageGatePasses(row.pages[0])`, and

```js
export const pageGatePasses = (page, scope) => {
  if (page.gate) return page.gate(scope)
  assertDispatchBuilt()
  return (
    prerequisitesMet(pagePrerequisites(page.id), scope) &&
    inScopeReachable(collectsOf(page.id), scope)
  )
}
```
(`flow/gates.js:21-28`)

`pagePrerequisites` (`flow/prerequisites.js:25-26`) derives the prerequisite set from
three facts already present: flow order (`allFlowPages`), the dispatch index
(`pageOfObligation`) and the obligation's own `enforcedAt: 'continue'` flag. There are
exactly **two** `enforcedAt: 'continue'` obligations in the whole domain
(`countryOfOrigin`, `commoditySelection`) and they generate the entire "Cannot start yet"
behaviour of the hub: on a blank journey only the origin row is open
(`flow/task-rows.test.js:211-215`), and everything unlocks once one commodity line has a
commodity (`:217-222`).

`scope.answered(id)` is instance-aware (`engine/read.js:18-25` walks every instance at
every depth), which is what lets an **item-level** obligation act as a prerequisite —
`commodityLines[i].commoditySelection` counts as answered once *any* line fills it.

**Classification: MODELLED DECLARATIVELY (two data flags drive it) but rendered
imperatively.** The mechanism is genuinely data-driven; the fact that "cannot start yet"
is not a member of the status enum means every consumer of `statusOf` that wants it must
call the gate separately — today only the hub does.

### The conditional-row hide is a hand flag

`{ id: 'transitCountries', pages: [transitCountriesPage], conditional: true }`
(`task-rows.js:39`) + `if (row.conditional && status === NA) return null`
(`controller.js:156`). Without the flag an NA row would render "Cannot start yet"
(its gate would also fail). So the hub has **two** presentations of not-applicable —
hidden, or locked — and which one you get is an authored per-row choice, not a derived
one. Pinned at `t2-hub-copy.test.js:150-171` and `flow/task-rows.test.js:107-135`.

---

## 5. Limitations (with structural / not-yet-built calls)

### 5.1 No per-entry status is exposed to any page — STRUCTURAL-ish (facade, cheap to widen)

`engine/index.js` is a 10-export facade and `satisfied` / `entryComplete` /
`collectionComplete` are **not on it**. `grep -rn "entryComplete\|collectionComplete\|satisfied("
features/ shared/kit.js engine/index.js` returns **zero hits**. A controller therefore
cannot ask "is commodity line 2 complete?".

The consequence is visible: the identification surface shows a *counter*
("Enter details for {species} N of M", `animal-identification.controller.js:249, 340`)
derived from `records.length` vs the cardinality cap — **not** a completeness status per
line. Check-your-answers likewise composes one row per entry with no per-entry status
(`docs/limits.md:58` "Check your answers is deliberately shallow at depth").

Structural? **No** — the engine already computes exactly this internally
(`complete.js#entryComplete`); it is one export away. But note *why* it is not exported:
per-entry status would need a per-entry frame `ctx`, and the facade deliberately hides
the frame vocabulary from pages. Cost to adopt: small (one export + a `ctx` builder),
but it widens the engine contract that side A has worked hard to keep at 10 functions.

### 5.2 No status on the model — you cannot ask an obligation "how am I doing" — STRUCTURAL by design

Status is only ever computed over a *list of parts supplied by the flow*. There is no
`obligation.status(answers)`. Any new consumer (a progress bar, a per-section
"3 of 7 answered", a per-entry tag) must assemble its own parts list. This is the
declared paradigm (`docs/flow-and-gates.md:111-120` "Roll-ups live flow-side… they need
two things the engine must not know"), so it is architecture, not omission — but it means
the model alone cannot answer any status question.

### 5.3 `STATUS_TAG` has no `NA` entry — latent mis-render — NOT structural

`features/hub/controller.js:130`:
```js
const statusTag = (status) => STATUS_TAG[status] ?? STATUS_TAG[NOT_STARTED]
```
`STATUS_TAG` (lines 120-129) maps FULFILLED / OPTIONAL / IN_PROGRESS / NOT_STARTED —
**not NA**. A row that is NA *and* whose gate passes would silently render the blue
"Not yet started" tag. Today no such row exists: NA implies the row's first page collects
nothing in scope, which fails `inScopeReachable`… **except** for the empty-collects
convention (`gates.js:18-19`: `obligationIds.length === 0 || …` → reachable). The
identification row is exactly an empty-collects page — it renders correctly only because
its `parts` facet keeps it out of NA. Remove the facet and you get a permanently
"Not yet started" row with a live link. Cheap to fix (one map entry / an explicit throw);
worth flagging because the safety net is a *coincidence of two mechanisms*, not an
assertion.

### 5.4 Derived gates bake in any-in-scope semantics — STRUCTURAL for mixed rows

`docs/limits.md:60-64`, confirmed at `flow/gates.js:18-19`: a derived gate passes when
**any** collected obligation is in scope. A future row mixing a conditional and an
unconditional obligation gets an always-true gate and must fall back to an authored
`gate` closure — reintroducing exactly the hand-typed `inScope.has('key')` restatement
the derivation removed. The escape hatch exists (`page.gate` / `section.gate`) and is used
once.

### 5.5 The hub's grouping is a second, parallel spine — NOT structural, but a real cost

`flow/flow.js` has 10 sections; `flow/task-rows.js` has 11 rows; `features/hub/controller.js`
`GROUPS` has 6 groups × 12 rows. Three overlapping structures must be kept consistent by
hand, and only one consistency check exists (the row roll-up ⟺ section roll-up equivalence
battery, `task-rows.test.js:236-318`). Nothing asserts that every task row's id appears in
`GROUPS`, or that every flow page belongs to some row. A page added to `flow.js` and
forgotten in `task-rows.js` is **not** a boot error — unlike a forgotten `collects`, which
crashes `buildDispatch`. That asymmetry is a genuine hole in an otherwise fail-loud design.

### 5.6 Doc drift found (docs vs code)

- `DESIGN-DELTA.md:217-218` says the hub keeps `countCompletedGroups` and "a blank
  journey now reads '0 of 7'". **Untrue in the code**: the progress line was dropped at
  inc-061 (`DESIGN-DELTA.md:592-593` says so), there is no `countCompletedGroups` in
  `features/hub/controller.js`, and `t2-hub-copy.test.js:54` asserts
  `expect(context.progressLine).toBeUndefined()`. §6 of DESIGN-DELTA is stale relative to §13.
- `docs/limits.md:16` says "`complete.js#entryComplete` does not yet resolve enclosing
  gates". **Untrue in the code**: `engine/evaluate/complete.js:35-41` resolves them via the
  opt-in `ctx` (DESIGN-DELTA #5), and `flow/task-rows.test.js:184-205` proves a Cat
  identifier owes its permanent address *through a facet*. limits.md was not updated after
  the carrier increments.

Both are docs-behind-code, not code bugs — but they are exactly the reason to read the
source.

---

## 6. Numbers

| Metric | Value |
|---|---|
| Status engine | `engine/status.js` — **79 LOC**, 5 statuses, 4 helpers |
| Production call sites of `statusOf` | **2** (`flow/task-rows.js:59`, `flow/section-status.js:9`) |
| Flow-side roll-up | `flow/section-status.js` 15 LOC + `flow/task-rows.js` 59 LOC |
| Gating | `flow/gates.js` 37 LOC + `flow/prerequisites.js` 31 LOC |
| Hub presentation | `features/hub/controller.js` **208 LOC** (98 of them the hardcoded `GROUPS` copy literal) + `template.njk` 51 LOC |
| Hub task rows | **11** answer rows + 1 gated review row; **2** rows carry collection facets |
| Hub groups | 6, hand-captioned |
| Authored gates in the whole flow | **1** (`flow/flow.js:72`, the review section) |
| `enforcedAt: 'continue'` obligations driving all "Cannot start yet" | **2** (`countryOfOrigin`, `commoditySelection`) |
| Hand-authored per-row flags | **1** (`conditional: true` on `transitCountries`) |
| Unit tests for this dimension | `engine/status.test.js` 6 cases / 93 LOC; `flow/task-rows.test.js` 18 blocks (≈40 cases with `it.each`) / 319 LOC; `t2-hub-copy.test.js` 13 cases / 220 LOC; `flow/gates.test.js` 12 cases / 218 LOC — **≈49-71 cases, 850 LOC of test for ~220 LOC of status/gate source** |
| E2E status assertions | ~35 hub status assertions across `prototypes/e2e/live-animals.spec.js` (lines 502-2434) |
| Places touched to add a hub row | **2** (`flow/task-rows.js`, `GROUPS` in `features/hub/controller.js`) + a page + its `collects` |
| Status persisted anywhere | **No** — recomputed on every read (`engine/read.js:27-44`) |

---

## 7. Retrofit notes (for the third-option shopping list)

Things from A worth taking, with their cost:

1. **The collection facet status part** (`status.js:11-57` + the `includesMember` filter on
   `complete.js`). ~40 LOC of engine. Cost: it presumes a completeness walk that takes a
   member filter and keeps reference frames intact — if B's evaluator resolves references
   against a filtered member list it would break enclosing-frame gates through a facet.
   Depends on nothing else in A.
2. **`enforcedAt: 'continue'` → derived prerequisite graph** (`prerequisites.js`, 31 LOC).
   Cost: needs (a) a flow order and (b) an obligation→page index. If B has no page index,
   this does not port.
3. **The optional-collection lifecycle** (no `required` on the collection, `required` on its
   items ⇒ Optional → In progress → Completed). Zero code — a data shape. Free to copy if
   B's status function has the same "no required parts" branch.
4. **Downward injection of submit-readiness** (`configureReadyForCheckYourAnswers`,
   `read.js:7-16`) with a throwing default. ~10 LOC; it is what keeps the engine free of
   flow imports. Cheap, and worth taking regardless of which model wins.

Things NOT to take: the hardcoded `GROUPS` copy literal (98 LOC of English in a
controller) — if B has an i18n/label layer, that is a strict improvement and A has
nothing to defend here.
