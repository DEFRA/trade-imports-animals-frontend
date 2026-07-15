# L3 — Adversarial verification — ST-6 (status-tasklist)

**Claim:** B's task list IS the flow tree — one spine; A hand-maintains three overlapping
spines with NO boot assert linking them. `buildDispatch` asserts obligation→page totality
and throws, "but NOTHING asserts that every flow page belongs to a task row or that every
task-row id appears in `GROUPS` — a page added to `flow.js` and forgotten in `task-rows.js`
is not a boot error." A has no i18n layer at all.

**Verdict: AMENDED.** Directionally right on every structural count — and I verified each
one — but the load-bearing negative ("NOTHING asserts…") is **false as stated**. A *does*
have a cross-spine assert linking `flow.js` to `task-rows.js`. It is a test-time assert, not
a boot assert, and it is fixture-based so it has real holes — but it exists, it is in the
standard unit suite, and it fires on precisely the failure mode the claim names as
unguarded. The claim conflates "not a *boot* assert" with "nothing asserts". Separately, B's
"one spine" purity is overstated: B's hub carries an imperative status override and three
hardcoded subsection ids of its own.

---

## 1. What I verified as literally true (quotes are real and mean what the claim says)

| Assertion | Verified at | Result |
|---|---|---|
| B's task list = the flow tree | `contract.js:58` — `export const sections = () => flow.sections` | **TRUE**, and stronger than claimed — `sections()` is not *derived from* the flow tree, it **is** `flow.sections` |
| B maps `sections() → section.children`, title `t(subsection.titleKey)`, tag `statusOfContainer` | `features/hub/controller.js:96-118` | **TRUE** verbatim (`:97`, `:105`, `:108`, `:118`) |
| B hub = 141 LOC | `wc -l` → **141** | **TRUE** |
| B copy in `locales/en.json` | `en.json:469-476` = `hub.status.{notApplicable,notStarted,optional,inProgress,completed,submitted}` | **TRUE** at the exact cited lines |
| B GDS class map / i18n key map | `controller.js:25-32` (`STATUS_CLASSES`), `:34-41` (`STATUS_TEXT_KEY`) | **TRUE** |
| A: 10 flow sections | `flow/flow.js:27-75` | **TRUE** — counted 10 |
| A: 11 task rows | `flow/task-rows.js:24-51` | **TRUE** — counted 11 |
| A: 6 groups × 12 rows of hardcoded English, 98 of 208 lines | `features/hub/controller.js:21-118`; `wc -l` → **208** | **TRUE** — 6 groups, 12 rows, GROUPS spans exactly lines 21-118 |
| A: `buildDispatch` totality assert throws | `flow/dispatch.js:55-63` — `Obligations collected by no page: …` | **TRUE** at the exact cited lines |
| A has no i18n layer at all | `find` for `*i18n*` / `*locale*` under A's root → **zero files** | **TRUE** |
| Nothing asserts every task-row id appears in `GROUPS` | see §3 | **TRUE** — and worse than the claim says |
| "A page added to `flow.js` and forgotten in `task-rows.js` is not a *boot* error" | `dispatch.js:26-65` only walks obligations and pages | **TRUE** literally — it is not a boot error |

So eleven of twelve sub-assertions survive contact with the source. The one that does not is
the one the claim leans on hardest.

---

## 2. THE COUNTER-EXAMPLE — A *does* assert flow-page ↔ task-row coverage

`flow/task-rows.test.js:236-318`, the block titled *"submit-readiness equivalence — the row
roll-up admits exactly the journeys the section roll-up did"*, is a **cross-spine equivalence
assert between the two spines the claim says are unlinked**.

The two sides of the equivalence read from *different spines*:

```js
// task-rows.test.js:238-241 — iterates the FLOW spine
const sectionRollUp = (answers, inScope) =>
  answerSections.every((section) =>          // ← flow.js
    PASSING.includes(sectionStatus(section, answers, inScope))
  )
```
`sectionStatus` = `statusOf(section.pages.flatMap(collectsOf))` (`flow/section-status.js:5-9`)
— i.e. **the union of every obligation collected by every page in every flow section.**

```js
// flow/section-status.js:11-15 — iterates the TASK-ROW spine
export const readyForCheckYourAnswers = (answers, inScope) =>
  taskRows.every((row) => { ... })          // ← task-rows.js
```

and the assert (`task-rows.test.js:288-296`) pins them equal across **14 named journey
states** (3 submittable + 11 not-submittable):

```js
expect(readyForCheckYourAnswers(answers, inScope)).toBe(
  sectionRollUp(answers, inScope)
)
```

**Now run the claim's own failure scenario against it.** Add a page to `flow.js` with a new
`required` obligation, forget `task-rows.js`:

- `buildDispatch` passes — the obligation *is* owned by a page (`dispatch.js:55-63` is
  satisfied). The claim is right that boot stays green.
- `sectionRollUp(happyPath)` → the new obligation is in the section's `collectsOf` union →
  unanswered + required → `NOT_STARTED` → **false**.
- `readyForCheckYourAnswers(happyPath)` → the obligation is in no row's parts → **true**.
- `expect(true).toBe(false)` → **the equivalence test fails.**

The orphaned page is caught. Not at boot — but in the unit suite, which is the baseline guard
A's own workflow runs first. "NOTHING asserts that every flow page belongs to a task row" is
therefore **not true**.

### Where the net genuinely has holes (this is what should be claimed instead)

The equivalence is fixture-based, so it only fires when the orphan changes the roll-up on at
least one of the 14 fixtures. It misses:

- **Optional obligations.** An orphan page whose obligations carry no `required` /
  `requiredAtLeastOne` yields `statusOf` → `OPTIONAL`, which is in `PASSING`
  (`task-rows.test.js:237`) → no divergence → slips through silently.
- **Obligations out of scope in all 14 fixtures.** A conditional field on a branch none of
  the fixtures take is NA on both sides → no divergence → slips through.
- **It is coincidental, not intentional.** The block's stated purpose (`:236`) is to prove the
  *new* row roll-up admits the same journeys the *retired section* roll-up did — a migration
  regression pin. Its coverage property is a by-product. Nobody wrote it as a totality check,
  and nothing stops someone deleting it as "the migration is done".

That is a much more defensible criticism than "nothing asserts it", and it is still a real
strike against A.

---

## 3. Where the claim is RIGHT and actually understates the problem — `GROUPS`

The `taskRows` → `GROUPS` link is genuinely unasserted, and the consequence is worse than the
claim says.

- `grep -rn "GROUPS"` over A's whole tree returns **three** hits: the literal
  (`controller.js:21`), its one consumer (`controller.js:165`), and a docs mention
  (`docs/features.md:181`). No test, no assert.
- `t2-hub-copy.test.js:69-72` asserts the rendered row titles per group against a **hardcoded
  expected literal**. Add a row to `task-rows.js` and omit it from `GROUPS` → the rendered set
  is unchanged → **the test still passes.**
- But `readyForCheckYourAnswers` iterates `taskRows` (`section-status.js:12`), so the missing
  row **still gates submit**. The result is an **invisible blocker**: a row that never renders
  on the hub, that the user can therefore never navigate to or complete, silently holding
  `readyForCheckYourAnswers` at `false` forever. The equivalence battery does *not* catch it
  either — both roll-ups see the row, so they agree.

The reverse direction is loud but late: a `GROUPS` id with no matching row makes
`taskRowById(id)` return `undefined` (`task-rows.js:53`) and `rowParts(undefined)` throws a
`TypeError` at **hub render**, not at boot.

---

## 4. Counter-hunt against B — "one spine" is overstated

B's hub is not the pure derivation the claim implies. Reading the whole 141 lines rather than
just `:96-117`:

- **`linesManageStatus` (`controller.js:60-69`)** — an imperative status override that
  **bypasses `statusOfContainer` entirely** for `commodity-lines-manage`, hand-computing
  `records.length === 0 ? NOT_STARTED : FULFILLED`. Invoked at `:103-105`. This is exactly the
  kind of hand-maintained special case the claim charges A with, and (per L2 §1.4a) it exists
  to mask a live defect — it does not feed `journeyState`, so hub and CYA can disagree.
- **`subsectionHref` (`:71-90`)** — hardcodes **three** subsection ids
  (`commodity-lines-manage`, `commodity-lines-details`, `per-unit-records`) to route to
  `/lines`, bypassing the derived `firstNavigablePage`.
- **`:113`** — a further `isLinesManage` special case on whether the row gets an `href`.

So "adding a hub row in B = one `flow.js` node + one `en.json` key" is true **for a generic
row**, and that is a real and substantial win over A's two-file edit plus 8 lines of English.
But B's hub already carries one status bypass and three hardcoded ids. B has *one spine plus
an imperative patch*; A has *three spines*. The gap is real; it is not the clean 1-vs-3 the
claim paints.

---

## 5. What I searched

- `wc -l` on both hub controllers (141 / 208) — both counts confirmed.
- Read in full: B `features/hub/controller.js`, A `features/hub/controller.js`,
  A `flow/task-rows.js`, A `flow/flow.js`, A `flow/dispatch.js`, A `flow/section-status.js`,
  A `flow/task-rows.test.js:225-319`, B `locales/en.json:455-484`.
- `grep -rn "GROUPS"` over A's whole tree → 3 hits, none of them an assert.
- `grep -rn "allFlowPages|taskRows|rowParts|every("` over A's `flow/`, `analysis/` and
  `t2-hub-copy.test.js` → surfaced the equivalence battery (`task-rows.test.js:239`) as the
  only cross-spine consumer. This is the counter-example.
- `grep -rn "items|rows|groups|toHaveLength|title"` over `t2-hub-copy.test.js` → the row-title
  assertions are hardcoded-literal snapshots (`:69-72`), so they cannot catch a row that is
  missing from `GROUPS`.
- `find` for `*i18n*` / `*locale*` under A's root → **zero files**. The no-i18n charge stands.
- `grep -rn "sections|statusOfContainer|titleKey"` over B's `contract.js` → `sections()` is
  `flow.sections` itself (`:58`).
