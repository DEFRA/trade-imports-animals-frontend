# L2 — Status and task-list derivation — A (live-animals) vs B (flow-layer)

**Verdict: B-better.** Not by a landslide, and not on every count — A wins two things
that matter a great deal against the real requirement set. But on the *model* question,
which is the one being asked, B wins clearly and the prior is CONFIRMED.

Both sides derive status and store nothing. That part is a tie and it is worth saying
plainly: neither side has a `visited` flag, a `complete` flag, or a status field in the
session. A recomputes `reconcile` + `statusOf` on every read (`engine/read.js:27-44`; no
`status` key in `engine/store.js`). B recomputes the whole pipeline on every request
(`lib/state.js:42-43` — `readState = evaluateState(readFulfilments(request))`). Both
therefore self-heal on resume and cannot drift. The comparison is entirely about *what the
derivation can express* and *how many places you touch*.

---

## 1. Rationale

### 1.1 The headline: A's one distinctive engine feature is a repair for a wound A inflicted on itself

Side A's Layer-1 read presents the **collection facet status part** as the distinctive
capability of this dimension — a `{collection, only|except}` literal that splits ONE stored
collection across TWO hub rows with independent statuses (`engine/status.js:11-57`, plus the
`includesMember` filter threaded through `engine/evaluate/complete.js:5-24, 58-63`). It is
about 40 LOC of engine, it has its own agreement invariant test
(`engine/status.test.js:66-91`), and DESIGN-DELTA #13 records it as a deliberate design win.

It exists because of a constraint A chose:

- `buildDispatch` throws if two pages claim the same obligation
  (`flow/dispatch.js:44-52`).
- Ownership at depth is **derived**, not declared: a sub-obligation belongs to the page
  that owns its nearest collection ancestor (`flow/dispatch.js:15-24`), which
  `docs/limits.md:50-52` states outright — *"you cannot redirect ownership of one field at
  depth to a different page."*
- Therefore the animal-identification page, which is a second page over the same
  `commodityLines` collection, can own **nothing**:
  `features/commodities/animal-identification.controller.js:20` — `export const meta = { ...page, collects: [] }`.
- A task row over that page would default to zero parts (`flow/task-rows.js:55-56`) →
  `statusOf([])` → NA forever. The facet is the repair.

**B needs no such primitive, and already does the same split.** In B a page declares exactly
which obligations it presents, at any depth, and `containerStatus` re-derives over the flat
list of in-scope presented entries in the subtree (`engine/index.js:469-474, 480-494`). The
flow already splits line-level from animal-level:

- `flow/flow.js:429-483` — subsection `commodity-lines-details`, five pages presenting
  `commodityCode` / `commodityType` / `species` / `numberOfAnimals` / `numberOfPackages`
  `forEachOf commodityLine`.
- `flow/flow.js:493-563` — subsection `per-unit-records`, seven pages presenting
  `permanentAddress` / `passport` / `tattoo` / `earTag` / `horseName` /
  `identificationDetails` / `description` `forEachOf unitRecord`.

Two rows, two independent statuses, same underlying collection tree, **zero facet
machinery**. B gets for free what cost A a bespoke engine primitive plus a filtered
completeness walk plus an invariant test to prove the two agree.

And B's version is strictly finer-grained. A's facet can only split a **root** collection by
its **direct** item members: `facetParent(part) = registry.byId(part.collection)` and
`facetMembers = parent.item.filter(...)` (`status.js:13-21`), while `statusOf` looks the
part up by its bare id (`status.js:26, :60` — `inScope.has(partKey(part))`) and `reconcile`
only ever adds *instance-qualified* keys for nested nodes (`reconcile.js:13-14`, `pathKey(path)`
→ `commodityLines[0].animalIdentifiers`). So a facet naming a nested collection is
permanently NA. A cannot give `passport` its own task row separate from `permanentAddress`.
B does exactly that today (seven depth-2 pages, each with its own `pageStatus`).

This is the core of the verdict. **A is more finished. Its model is not better. On this
dimension the extra machinery in A is a symptom, not an asset.**

### 1.2 Mandate: B has an axis A does not have

The same domain field is modelled by both sides, which makes this a clean head-to-head.

**A** (`features/origin/obligations.js:12-17`):
```js
export const regionOfOriginCode = {
  id: 'regionOfOriginCode',
  required: true,
  activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' },
  wipeOnExit: true
}
```

**B** (`obligations/obligations.js:190-198`):
```js
applyTo: branchedGate(
  (f) => f[regionCodeRequirement.id] === 'yes',
  { inScope: true, status: 'mandatory', reasons: [regionCodeRequiredReason] },
  { inScope: true, status: 'optional' }
)
```

B keeps the field **in scope and optional** on the `no` branch; the value survives, the user
may still supply it, and the subsection tag moves Optional ↔ NS/IP/F with no code change
(`effectiveStatus` `engine/index.js:291-297`, consumed by the classifier at `:392-394`).

A cannot express this. `required` is a static boolean read **without any access to answers**
— `Boolean(obligation?.required || obligation?.requiredAtLeastOne)` (`status.js:23-24`) and
`!subObligation.required || isAnswered(...)` (`complete.js:54`). A predicate placed there
would be truthy always. A's only conditional lever is `activatedBy`, which toggles **scope**,
not mandate, and here it is paired with `wipeOnExit` — so A's answer to "you must give a
region code if X, you may give one otherwise" is to *delete the field and destroy the value*
when X is false. That is a different requirement, and it is the only one A can state.

The mandate axis being answers-independent by construction is a genuine structural ceiling in
A's model, and it is invisible from the feature list.

### 1.3 One spine vs three

B's task list **is** the flow tree. `features/hub/controller.js:96-117` maps
`sections() → section.children`; 16 subsections become 16 rows; the title is
`t(subsection.titleKey)`; the tag is `statusOfContainer(subsection, state)`. 141 LOC, of which
the only content is two status maps and two imperative special-cases. Copy lives in
`locales/en.json`.

A maintains three overlapping structures by hand:

| | count | file |
|---|---|---|
| flow sections | 10 | `flow/flow.js:27-75` |
| task rows | 11 | `flow/task-rows.js:24-51` |
| hub groups × rows | 6 × 12 | `features/hub/controller.js:21-118` (98 LOC of hardcoded English) |

`buildDispatch` asserts obligation→page totality and throws (`flow/dispatch.js:55-63`), but
**nothing asserts that every flow page belongs to a task row, or that every task-row id
appears in `GROUPS`**. A page added to `flow.js` and forgotten in `task-rows.js` is not a boot
error — in an otherwise aggressively fail-loud design, that is a real hole. Adding a hub row in
A touches 2 files beyond the page itself; in B it is one `flow.js` node plus one `en.json` key.

A also has no i18n layer at all. B's is not a nice-to-have on a DEFRA service — it is a Welsh-
language statutory requirement waiting to land, and A has 98 LOC of English sitting in a
controller with nothing to defend.

### 1.4 What A genuinely wins — and why it is not enough to flip the verdict

**(a) Minimum cardinality.** A can say "at least one commodity line":
`commodityLines.requiredAtLeastOne: true` (`features/commodities/obligations.js:123`) →
`collectionComplete` returns false with zero entries (`complete.js:65`) → `partRequired` true
(`status.js:23-24`) → the row is never FULFILLED → `readyForCheckYourAnswers` is false
(`flow/section-status.js:11-15`). A nests it too: `animalIdentifiers.requiredAtLeastOne`
(`obligations.js:108`) means each line must have at least one animal record.

B has no cardinality concept at all. `commodityLine` carries no `requires`
(`obligations.js:405-410`), and `groupInvariantErrors` iterates **existing** records
(`engine/index.js:517`) — zero records ⇒ zero errors. The consequence is a **live defect**:
fill the notification-level singletons, add no commodity lines, and `journeyState` returns
`fulfilled` and CYA prints its ready-to-submit line
(`features/check-your-answers/template.njk:33`). The hub only *looks* right because of a
hub-local imperative patch (`features/hub/controller.js:60-69`) that does not feed
`journeyState` — so the task list can read "Add commodity lines: Not started" while CYA on the
same state says the journey is ready to submit. No test pins it (`routes.test.js:147` only
checks the tag *after* a line is added).

That is the single most basic rule in this journey, and B's model has no home for it. But it
is **~8 LOC to close** (a `requires.minInstances` field plus one branch in
`groupInvariantErrors`; the classifier already takes an error *count*, and
`collectGroupsPresentedIn` already finds `commodityLine` because the details pages present it
`forEachOf`). Cheap, additive, no contract-shape change. So it is a strike against B's
*completeness*, not against B's *model*, and it does not belong in `aOnly`.

**(b) Cannot-start-yet, and the separation of scope from prerequisite.** This is A's best
idea on this dimension. A keeps two axes apart:

- **scope** — `activatedBy` → the reconcile fixpoint → `inScope` (`reconcile.js:6-47`).
- **prerequisite** — `enforcedAt: 'continue'` + flow order + the dispatch index, derived with
  no hand-authored graph (`flow/prerequisites.js:8-26`, consumed by `flow/gates.js:21-28`).

Exactly **two** obligations in the whole domain carry `enforcedAt: 'continue'`
(`countryOfOrigin`, `commoditySelection`) and they generate the hub's entire locking
behaviour. The hub renders a sixth, presentation-only state with no href
(`features/hub/controller.js:132-135, 158-160`).

B collapses both axes into one `inScope` boolean, and an out-of-scope decision carries **no
payload** (`helpers.js:198` returns a bare `{ inScope: false }`; `reasons` are attached only on
the in-scope branch). So B's NA does double duty, and the user-visible result is wrong: on a
blank journey B's hub renders **"County Parish Holding — Not applicable"**, because `cph`'s
gate is `anyAllowListed(commodityCode, CPH_REQUIRED_COMMODITIES, {...}, { inScope: false })`
(`obligations.js:510-519`) and with zero lines there is no commodity code to allow-list. CPH is
not inapplicable — it is *not yet determined*. The spike knows and defers it
(`obligations.md:2806-2810`).

B can still build this without a model change — `mandatoryToProceed` already exists on
`presents` entries (`flow/flow.js:124, 149, 197...`, read by `expandPresents`
`engine/index.js:254`), the flow tree is ordered, and `presents` *is* an obligation→page index.
That is precisely A's recipe. It is unbuilt, not impossible. But the conflation of "never
applies" with "not unlocked yet" into one boolean is the most defensible criticism of B's
model on this dimension, and A's two-axis split is the thing the third option should take.

### 1.5 Where they are equally bad (shopping-list items neither side can supply)

- **Per-instance mandate** — "mandatory on line 1, optional on line 2". B cannot: the
  evaluator hard-codes `status: obligation.status` onto every record
  (`evaluator.js:475-478, 488-491, 503-506`). **A cannot either**, and for a deeper reason —
  `required` is a static boolean everywhere. Side B's Layer-1 read flagged this as "the
  sharpest asymmetry question to put to Side A". The answer is: A fails it too. It is a
  **shared** gap, not an asymmetry.
- **Per-entry status exposed to a page** — B has per-instance *navigation*
  (`firstUnfulfilledPageForLine/ForUnit`, `engine/index.js:149-201`) but no
  `statusOfLine`. A computes `entryComplete` internally but does not export it
  (`engine/index.js` is a 10-export facade), so its identification surface hand-rolls a
  records-vs-cap counter (`animal-identification.controller.js:249, 340`). Both are one small
  export away; neither has it.
- **"Deliberately declined"** — neither side can record "I considered the optional section and
  chose to add nothing". Both treat OPTIONAL as "untouched"
  (A `status.js:65-66`; B `engine/index.js:408-409`).

### 1.6 Things both sides get right, and got right independently

The convergent evidence is worth noting because it tells you what the third option must keep:

- **"Optional and skipped" ≠ "started but incomplete"** is correctly modelled on both sides,
  and on both sides it falls out of the data rather than being coded. A: the `documents`
  collection carries no `required` while its four item fields are `required: true`
  (`features/documents/obligations.js:1-30`) → Optional → In progress → Completed, and a
  half-filled document blocks submit while an absent one does not
  (`flow/task-rows.test.js:280-283`). B: a dedicated fifth status
  (`engine/index.js:408-409`), turquoise tag, untouched optionals never counted as concerns
  (`:393-400`).
- **Status is re-derived, never rolled up from child statuses.** B says so explicitly
  (`containerStatus` re-derives over the subtree, `engine/index.js:469-474`, rationale at
  `obligations.md:2252-2265` — "roll-up precedence rules for the mix cases get fiddly"). A
  arrives at the same place from the other end: one `statusOf` over a flat parts list, and the
  submit gate is the same function over the same rows (`flow/section-status.js:11-15`), pinned
  by a row-vs-section equivalence battery over 13 journey states
  (`flow/task-rows.test.js:236-318`). Neither built a precedence ladder. Both were right.
- **Cross-record invariants fold into status as ordinary concerns.** B counts them
  (`engine/index.js:398-400, 512-539`); A folds `requiredOneOf` into the completeness walk
  (`complete.js:13-22`). Same outcome, no bespoke branch.

### 1.7 Scoring the model, not the build loop — explicitly

A has E2E hub assertions, amend-and-resubmit, real persistence and ~850 LOC of test against
~220 LOC of status/gate source. None of that is evidence about the model. Strip the finish and
the model comparison is:

| | A | B |
|---|---|---|
| status derivation | 1 pure fn, 79 LOC, 2 call sites | 1 classifier, 25 LOC, 3 levels |
| status parts addressable at depth ≥2 | **no** (root-keyed; facet = direct members of a root collection) | **yes** (any page presents any obligation) |
| split one collection across two rows | bespoke facet primitive (~40 LOC engine) | free, from `presents` |
| conditional mandate | **no** (static `required`) | **yes** (`branchedGate` → `status`) |
| minimum cardinality | **yes** (`requiredAtLeastOne`) | **no** (live defect) |
| prerequisite / cannot-start-yet | **yes**, derived from 2 data flags | **no** (NA conflates two meanings) |
| task-list spines to keep in sync | 3, no assert | 1 (the flow tree) |
| copy | 98 LOC hardcoded English | i18n keys |

B is ahead on expressiveness *and* on places-to-touch. A is ahead on two named gaps, both of
which are additive fixes in B. That is the verdict.

---

## 2. Retrofit

### 2.1 B's status model into A — expensive, because it lands on A's dispatch

To get B's semantics, A must let a page present an arbitrary set of obligations at arbitrary
depth. That means deleting the two rules the rest of A's flow layer is built on:

- the two-owner throw (`flow/dispatch.js:44-52`), and
- derived ownership at depth (`flow/dispatch.js:15-24`, admitted at `docs/limits.md:50-52`).

Both are load-bearing elsewhere: `collectsOf` feeds gates (`flow/gates.js:26`),
`pageOfObligation` feeds prerequisite derivation (`flow/prerequisites.js:14`) and CYA change
links, and the totality assert (`dispatch.js:55-63`) is A's one boot-time safety net. Replacing
`collects: [rootId]` with per-page `presents` at depth is a rewrite of ~5 modules, not a swap.

Knock-ons:
- The facet primitive becomes **dead** — delete `status.js:11-57`, the `includesMember` filter
  on `complete.js:5-9, 23-24, 58-63`, and the agreement-invariant test
  (`status.test.js:66-91`). Net simplification, ~40 LOC of engine gone. This is the *good* part.
- `required: true` must become `status: 'mandatory' | 'optional'` produced by the scope
  decision. That touches all 14 `features/*/obligations.js`, `status.js:23-34`,
  `complete.js:54`, and A's page validators, which read `required` directly.
- `wipeOnExit` needs a ruling: B's optional branch keeps the field in scope, so a naive port
  stops wiping `regionOfOriginCode` when the user switches to "no". Behaviour change, not a bug
  — but it needs a decision.

**What A has that B has no answer for, and must NOT be dropped in the port:**
1. `requiredAtLeastOne` — port B's classifier as-is and A's zero-commodity-line journey
   becomes submittable. Keep it and fold it in as an extra mandatory concern (B's
   `groupErrorCount` slot takes it unchanged).
2. `enforcedAt: 'continue'` + `flow/prerequisites.js` (31 LOC) + the presentation-only
   "Cannot start yet" state. B's `inScope` boolean cannot represent "locked".
3. The instance-aware `scope.answered(id)` (`engine/read.js:18-25`) that lets an item-level
   obligation act as a prerequisite once *any* line fills it.

Verdict on this direction: **do it only as part of a rebuild.** It is A's engine core.

### 2.2 A's status/task-list into B — cheap, additive, nothing breaks

Do **not** port `statusOf` (root-keyed, needs a flow-supplied parts list — B's `containerStatus`
is strictly better) and do **not** port the facet (B already has it via `presents`; porting
would add a second way to do the same thing).

Port these, in order of value:

1. **`requiredAtLeastOne` → `requires.minInstances`.** ~8 LOC: one field on `commodityLine` and
   `unitRecord`, one branch in `groupInvariantErrors` (`engine/index.js:512-539`) emitting an
   error when `records.length < min`. `classifyEntries` already consumes an error **count**
   (`:398-400`) and `collectGroupsPresentedIn` already finds `commodityLine`
   (`:545-556`, via `presentsForEach.forEachOf`). Nothing breaks. **This closes a live defect
   — the zero-line journey reading `fulfilled` with a CYA ready-to-submit banner — and it is
   the cheapest, highest-value item on the whole shopping list.**
2. **Derived prerequisites → a 6th status.** B already holds every ingredient:
   `mandatoryToProceed` on `presents` entries, an ordered flow tree, and `presents` as an
   obligation→page index. Copy A's `prerequisites.js` rule verbatim (an obligation marked
   must-answer and owned by a strictly-earlier page must be answered). Touches
   `engine/index.js` (STATUSES + classifier or a separate gate fn), `features/hub/controller.js`
   (`STATUS_CLASSES` + `STATUS_TEXT_KEY`), `locales/en.json`. **No model-contract change** if you
   derive it view-side. Only if you want the model to *explain* exclusion do you have to widen
   the Decision false branch to carry a kind (`helpers.js:198`, 4 factories +
   `evaluator.buildImplication`) — recommend not doing that yet.
3. **A's single-source discipline.** B's `linesManageStatus` patch
   (`features/hub/controller.js:60-69`) bypasses `containerStatus` and does not feed
   `journeyState`, so hub and CYA can disagree on the same state. A's rule — one status
   function, hub and submit gate both consume it (`flow/section-status.js:11-15`;
   `flow/flow.js:72`) — is the fix. Item 1 above dissolves the patch entirely: once
   `minInstances` exists, `commodity-lines-manage` classifies correctly on its own.
4. Do **not** port A's `conditional: true` hide-vs-lock flag (`flow/task-rows.js:39` +
   `features/hub/controller.js:156`). It is an authored per-row choice masquerading as a derived
   one. But B needs *some* ruling here once cannot-start-yet exists (hide / lock / "you'll be
   asked if…").

Verdict on this direction: **~40 LOC and a status constant.** Nothing in B breaks. That
asymmetry — A needs a dispatch rewrite to take B's model, B needs 40 LOC to take A's — is the
whole verdict in one line.

---

## 3. Doc-vs-code drift found on both sides (both Layer-1 reads were right)

- **A**: `DESIGN-DELTA.md:217-218` claims the hub keeps `countCompletedGroups` and reads
  "0 of 7". It does not — the progress line was dropped (`DESIGN-DELTA.md:592-593`) and
  `t2-hub-copy.test.js:54` asserts `expect(context.progressLine).toBeUndefined()`.
  `docs/limits.md:16` claims `entryComplete` cannot resolve enclosing gates; it can
  (`complete.js:35-41`, live carrier at `flow/task-rows.test.js:184-205`).
- **B**: `obligations.md:2277-2281` says NA subsections are "hidden by default". They are not —
  `features/hub/controller.js:107-116` builds an item for every subsection and merely withholds
  the `href` (`:113`). Code wins: NA rows render grey and unlinked.
