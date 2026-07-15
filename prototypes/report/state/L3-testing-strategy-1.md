# L3 adversarial verification — testing-strategy, claim T1

**Verdict: AMENDED.**

The claim has two halves. **The B half survives everything I threw at it — every particular
checked out, and I found extra evidence that makes it *stronger* than stated.** The A half does
not. Its central assertion — "A guards obligation→page totality **at every depth**, **boot-fatally**"
— is **false**, and it is false in exactly the way the brief warns about: A's boot assert is
ancestor-tolerant, and it is A's *own test suite* that documents this as intended behaviour.

The net effect is that the claim credits the right conclusion (A catches the mutation, B does not)
to the wrong mechanism, and overstates the contrast by hiding the fact that **A has the identical
silent-invisibility hole for optional nested obligations.**

---

## 1. Verifying the A-side quotes (they are real; they do not mean what the claim says)

`flow/dispatch.js` — read in full, 75 LOC. The three cited lines are verbatim:

- `:32` `for (const { templatePath, obligation } of walkObligations())` — but this loop is **only the
  path-metacharacter check** (`:33-38`). It is not the totality assert.
- `:47` `Obligation "${id}" is collected by two pages:` — real, uniqueness assert.
- `:62` `Obligations collected by no page: ${uncovered.join(', ')}` — real, totality assert.

The totality assert is `:55-63`:

```js
const uncovered = [...walkObligations()]
  .filter(({ templatePath, obligation }) =>
    !obligation.system && !ownerOfObligation(templatePath))
```

**Everything turns on `ownerOfObligation` (`:15-24`), which the claim never opened:**

```js
const ownerOfObligation = (address) => {
  let current = address.replace(/\[\d+\]/g, '')
  while (current !== null) {
    if (pageOfObligationMap.has(current)) return pageOfObligationMap.get(current)
    current = ancestorTemplate(current)      // :10-13 — strips the last dot segment
  }
  return undefined
}
```

It **walks ancestor template paths**. So `commodityLines.animalIdentifiers.animalIdentifierPassport`
is "covered" the moment *any* page collects `commodityLines`. The assert is total at **depth-0 only**.
Below a collection root it is **vacuous**.

### This is not a theoretical hole — it is how A is actually wired today

- `registry.js:32-42` — `walkObligations` yields the collection root **and** every descendant.
- `shared/kit.js:27-30` — `collectsFrom(obligations)` maps only the feature's **top-level** exported
  array to ids. It does **not** recurse into `.item`.
- `features/commodities/obligations.js:126` — `export const obligations = [commodityLines]`. One
  top-level entry. So `search.controller.js:8` declares `collects: ['commodityLines']` — pinned at
  `contract.test.js:184`.
- **The two pages that actually ask the nested commodity fields declare they collect nothing:**
  - `features/commodities/consignment-details.controller.js:14` → `collects: []` (pinned,
    `contract.test.js:208`) — this is the page that asks `numberOfPackages` and
    `numberOfAnimalsQuantity`.
  - `features/commodities/animal-identification.controller.js:20` → `collects: []` (pinned,
    `contract.test.js:249`) — this is the page that asks all seven depth-2 animal-identifier fields.

So A's obligation→page index contains **no entry at all** for any of the 11 obligations under
`commodityLines`. Their coverage is supplied entirely by the ancestor walk from the collection root
to the *search* page — which asks none of them.

**A's nested obligation count (vacuously covered at boot): 16.**
- 5 under `commodityLines.item` (`obligations.js:116-122`)
- 7 under `animalIdentifiers.item` at **depth-2** (`:99-107`)
- 4 under `documents.item` (`features/documents/obligations.js:24-29`)

### A's own suite documents the fallback as a feature

`flow/dispatch.test.js:83-91`:

```js
it('Should resolve a sub-obligation to its collection owner by template and instance address', () => {
  expect(pageOfObligation('commodityLines.commoditySelection')).toBe('commodities')
```

And the cited "no owner" test (`:72-81`) does **not** mutate a nested obligation — it deletes the
whole `commodities` page, which removes coverage of the **root**. There is no test on either side of
A that constructs an uncovered *nested* obligation, because with the root collected **you cannot
construct one**.

**Mutation, run on paper:** add `{ id: 'newNestedField', required: true }` to `commodityLines.item`;
wire no page, no input, no `.njk`.
→ `buildDispatch` **does not throw**. The server boots.

That refutes "boot-fatally, at every depth" outright.

### Counter-hunt: does A have a *different* boot validator that catches it?

`grep -rn "throw new Error"` over A's `flow/`, `engine/`, `features/index.js`, `registry.js` returns
9 hits. Only `dispatch.js` (×3) is a totality/uniqueness assert. `flow/gates.js:7` is an
"is-dispatch-built-yet" guard; the rest are "not configured" and predicate errors. **A has exactly
one totality assert and it is the ancestor-tolerant one.** No counter-example.

---

## 2. What *does* catch it on A — and the hole that remains

The net exists, but it is **not `dispatch.js`**. It is the completeness evaluator, which walks the
**manifest's** `item` array:

`engine/evaluate/complete.js:23-55` — `entryComplete` iterates `obligation.item` and at `:54`:

```js
return !subObligation.required || isAnswered(entry?.[subObligation.id])
```

So the **mandatory** unasked nested obligation makes `satisfied('commodityLines', …)`
(`complete.js:85-93`) permanently `false` → the commodities section never fulfils →
`readyForCheckYourAnswers` never true → the CYA gate never opens. Tests that go red:
`contract.test.js:279` (`expect(satisfied('commodityLines', result.after)).toBe(true)`),
`dispatch.test.js:190` (`expect(readyForCheckYourAnswers(complete, inScope)).toBe(true)`), and every
CYA-reaching E2E. **Loud — but at runtime, and only because the field is `required`.**

### The hole the claim hides: A's status roll-up also walks the PAGES, not the manifest

`flow/section-status.js:5-6`:

```js
export const sectionObligationIds = (section) =>
  section.pages.flatMap((page) => collectsOf(page.id))
```

This is **structurally the same shape as B's `journeyState` walking `flow.sections`** — the very
thing the claim indicts B for. It only *looks* safe on A because the depth-0 boot assert forces
`collects` and the top-level manifest to agree. Below the collection root, that forcing does not
happen.

**Therefore: an *optional* nested obligation added to `commodityLines.item` / `animalIdentifiers.item`
/ `documents.item` with no page and no input:**
- boots fine (ancestor-covered),
- is skipped by `complete.js:54` (`!subObligation.required` → `true`),
- never enters `sectionObligationIds` (no page collects it),
- renders nowhere (A's `.njk` is hand-authored),
- **and not one of A's 526 tests fires.**

A has **the same silent-invisibility failure mode**, confined to optional nested obligations. Seven
of A's 16 nested obligations are optional today (`numberOfPackages` + the six animal identifiers),
so this is the shape a real new field would take.

---

## 3. Verifying the B-side (every particular confirmed; two findings make it stronger)

- `features/commodity-lines/controller.test.js:66-80` — verbatim. The filter is
  `o.within === commodityLine && o.status !== undefined`. It **is** a genuine manifest→flow totality
  gate (`LINE_PAGES` is derived from the flow's `presentsForEach` pages), and it **is** scoped to
  depth-1 commodity-line leaves. **Confirmed exactly as claimed.**
- `engine/index.js:583-598` — `journeyState` iterates `flow.sections ?? []` and
  `collectInScopePresentedEntries`. An unpresented obligation contributes zero entries.
  **Confirmed.**
- **No depth-2 gate.** `find features -type f`: `features/units/` has `controller.js` + `list.njk`
  and **no test file**. `features/units/controller.js:36,42` —
  `UNIT_PAGES = deriveUnitPages(flow)` and `UNIT_LEAF_OBLIGATIONS = UNIT_PAGES.map(p => p.obligation)`
  are derived **from the flow**, so they are *incapable* of detecting a manifest entry the flow omits.
  A grep for `UNIT_PAGES|UNIT_LEAF` across the whole tree returns **zero test references**.
  **Confirmed.**
- **`flow/` contains only `flow.js`.** No test file. **Confirmed.**
- **`obligations/coverage.test.js` read in full (191 LOC).** It gates obligations↔**domain** (`:82-86`),
  plus within-cycle (`:108-137`) and id/name uniqueness (`:139-170`). **Nothing touches the flow.**
  **Confirmed.**
- **No boot validation of any kind on B.** `grep "throw new Error"` over `contract.js`, `routes.js`,
  `flow/flow.js`, `engine/index.js`, `obligations/obligations.js` → **zero hits.**

### Two things I found that the claim understates

1. **`coverage.test.js:172-190` pins two obligations that are mandatory, always-in-scope, and
   deliberately NOT presented** — `poApprovedReferenceNumber` and `responsiblePersonForLoad`
   (`expect(po.applyTo()).toEqual({ inScope: true, status: 'mandatory' })`, `:187-188`). So B has a
   **live, sanctioned instance of the exact state the claim describes as a defect** — which means an
   *accidental* unpresented obligation is not just untested, it is **indistinguishable from the two
   intentional ones**.
2. **`dump.js:70-92`** — `missingRequired` iterates `walkAllPages()` → `page.presents`. So on B a
   mandatory-but-unpresented obligation is not merely untested; it is **unrepresentable as "missing"**
   in B's own diagnostic dump, the artefact a stakeholder would inspect. That is a sharper statement
   of B's gap than the claim makes.

### "Not built" vs "cannot be built" — B is squarely "not built"

`engine/index.js:208` exports `firstPagePresentingObligation(flow, obligationId)`; it is used at
`contract.js:165` and is already **tested to return `null` when nothing presents the obligation**
(`engine/index.test.js:902`). The gate B is missing is therefore ~5-10 LOC over an existing, tested,
exported primitive:

```js
obligations.filter(o => !firstPagePresentingObligation(flow, o.id) && !KNOWN_UNPRESENTED.has(o.name))
```

This is a **wiring omission, not a structural limitation** — and any surrounding narrative that calls
it "architectural" is overstating retrofit cost.

---

## 4. What I searched

| Search | Result |
|---|---|
| `flow/dispatch.js` full read | Totality assert is `:55-63`, gated by `ownerOfObligation` `:15-24` (ancestor walk) |
| `registry.js` full read | `walkObligations` `:32-42` yields root + all descendants |
| `shared/kit.js:27-30` | `collectsFrom` = top-level ids only, no `.item` recursion |
| `grep -rn "collects:"` across A | 19 controllers; commodities detail pages both `collects: []` |
| `grep "item:\|collection: true"` across A obligations | 3 collections → 16 nested obligations |
| `contract.test.js` full read | `committedIds` uses `registry.all` (top-level only), cases array hand-maintained |
| `engine/evaluate/complete.js` full read | `:54` optional-skip — the hole |
| `flow/section-status.js` full read | `:5-6` status walks **pages**, not manifest |
| `grep "throw new Error"` across A flow/engine/registry | Only `dispatch.js` asserts totality |
| `grep -rln "presents"` across B | 28 files; only `commodity-lines/controller.test.js` gates manifest→flow |
| `grep "presents"` across all B test files | No notification-level or depth-2 gate |
| `find features -type f` on B | `features/units/` has **no** test file |
| `grep "UNIT_PAGES\|UNIT_LEAF"` across B | Zero test references; both derived **from the flow** |
| `obligations/coverage.test.js` full read | obligations↔domain only; `:172-190` pins two sanctioned unpresented mandatories |
| `dump.js:60-109` | `missingRequired` from `page.presents` — unpresented is unrepresentable |
| `grep "throw new Error"` across B core | **Zero** — no boot validation at all |
| `grep "firstPagePresentingObligation"` | Exists, exported, tested (`engine/index.test.js:902`) — gate is ~5-10 LOC |
