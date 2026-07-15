# L3 adversarial verification — VE-2 (validation-errors)

**Verdict: AMENDED.** The A-side half is true and, if anything, understated —
the duplication has *already* diverged in two demonstrable ways. The B-side
half names the **wrong mechanism** and credits B with an enforcement it does
not have.

---

## 1. What I opened

### A — the cited lines are real

- `features/commodities/obligations.js:87-94` — `ANIMAL_IDENTIFIER_GROUP` =
  the six identifier ids (passport, tattoo, earTag, horseName,
  identificationDetails, description). **`permanentAddress` is not a member.**
- `:96-111` — `animalIdentifiers` collection carries `requiredAtLeastOne: true`,
  `requiredOneOf: ANIMAL_IDENTIFIER_GROUP`, `maxEntriesFrom: numberOfAnimalsQuantity`.
- `engine/evaluate/complete.js:13-22` — `groupOwned` / `groupSatisfied`; an
  entry with no answered group member returns `false`. Reached from the hub via
  `engine/status.js:44-57` (`partSatisfied` → `collectionComplete`). So the
  model declaration genuinely drives hub completeness. ✔
- `features/commodities/animal-identification.controller.js:478-486` —
  ```js
  const anyData = [...forms.values()].some((form) => form.holdsData)
  if (addIndex !== null && !anyData && forms.has(addIndex)) {
    const { commodity } = forms.get(addIndex)
    const [first] = scopedFields(commodity)
    errors[fieldName(first.id, addIndex)] =
      'Enter at least one identifier for this animal'
  }
  ```
  Literal message, hand-typed. ✔
- The controller **does not import `ANIMAL_IDENTIFIER_GROUP`** (imports at
  `:10-18` name the six obligation objects individually). It re-lists the same
  six across `TYPE_FIELDS` (`:45-65`) and `FALLBACK_FIELDS` (`:70-82`). So the
  *membership list* is duplicated too, not just the predicate. ✔
- `docs/validation.md:66-97` states the split as doctrine ("`required: true`
  never blocks a save"). ✔ The doc is honoured by the code — no dead-doc credit.

### B — the cited lines are real but describe a different rule

- `flow/flow.js:120-127` (regionCode) and 12 further sites — `mandatoryToProceed: true`
  + `errors: { required: '<i18n key>' }`. ✔
- `contract.js:266-283` + `315-322` — `isSufficientForProceed` returns `true`
  when `effectiveStatus(...) === 'optional'`. ✔

---

## 2. Counter-hunt — what actually breaks the claim

### 2a. B's equivalent of `requiredOneOf` is NOT `mandatoryToProceed`

`grep -rn "identifier" obligations/obligations.js` →
`obligations/obligations.js:563-594`:

```js
export const unitRecord = {
  name: 'unitRecord',
  within: commodityLine,
  requires: {
    get anyOf() {
      return [passport, tattoo, earTag, horseName, identificationDetails, description]
    },
    errorCode: 'obligation.unitRecord.identifiersRequired'
  }
}
```

This is a **third, dedicated primitive** — not `status`, not `mandatoryToProceed`.
It is evaluated by `engine/index.js:512-539` (`groupInvariantErrors`) and
aggregated by `contract.js:184-191` (`groupInvariantErrorsForState`).

`mandatoryToProceed` **structurally cannot express this rule**:

1. It is a per-descriptor flag on one page's `presents` entry
   (`contract.js:266-274` loops descriptors), so it can only say "this one
   obligation must be non-blank" — never "one of these six".
2. All six identifiers are declared `status: 'optional'`
   (`obligations/obligations.js:635, 645, 655, 665, 684, 697`), so
   `isSufficientForProceed` short-circuits to `true` at `contract.js:316` and
   the gate would be a **no-op** even if the flag were added.
3. Each identifier lives on its **own page** (`flow/flow.js:516-562`:
   `passport`, `tattoo`, `ear-tag`, `horse-name`, `identification-details`,
   `description`, each `presentsForEach` with **no** `mandatoryToProceed`), so
   there is no page on which the six could be jointly gated.

The claim's stated reason for B's single declaration ("the flow-declared
proceed-mandate is short-circuited by the obligations layer's current-state
status") is the mechanism for a *different class of rule* — the single-obligation
conditional required (regionCode / accompanying-documents). It has nothing to do
with the identifier group.

### 2b. B's one declaration buys strictly LESS enforcement, not more

`groupInvariantErrors` feeds only:
- container/journey status (`engine/index.js:472`, `:589`), and
- a CYA prompt (`features/check-your-answers/controller.js:318-331`).

It blocks **no page save and no submit** — B has no submit gate at all. A user
can save an empty unit-record in B and see nothing but an "In progress" tag.
So B is not "one declaration where A needs two"; B is **one declaration where A
has one soft declaration plus one hard-ish message**, and B simply never
enforces at the point of save.

### 2c. B's `errorCode` is dead, so B re-types the copy too

`grep -rn identifiersRequired` → the declared
`errorCode: 'obligation.unitRecord.identifiersRequired'` appears **only** in
`obligations.js:592` and four `engine/index.test.js` assertions. The CYA prompt
hardcodes a *different* key, `t('cya.promptGroupInvariant', …)`
(`check-your-answers/controller.js:324`). B declares the message and then
ignores its own declaration — a smaller instance of the same disease.

### 2d. A's duplication is worse than the claim says — it has already rotted

The controller check is **not the same rule**. `holdsData` (`:436-438`) is
`identifierProvided(values) || (showAddress && addressRecordProvided(addressValues))`
(`:212-216`), and `permanentAddress` is **not** in `ANIMAL_IDENTIFIER_GROUP`.
Two live divergences follow, both reachable today:

- **Address-only save.** On a permanent-address commodity (`01061900`), fill the
  full address and no identifier → `holdsData: true`, `missingAddressErrors`
  empty, the "at least one identifier" branch never fires, the unit is appended
  (`:493-516`) — and `complete.js:18-22` deems that very entry **incomplete**.
  Saved clean, hub says In Progress, no error was ever shown at the point of save.
- **Global-`anyData` scope.** The guard fires only when *no card anywhere* holds
  data (`:480-481`). With two commodity cards, typing into card 0 and pressing
  "Save and add another" on empty card 1 appends card 0's unit, appends nothing
  for card 1 (`:494` `if (!form.holdsData) continue`) and shows **no error at all**.

### 2e. "Blocks the save" is the wrong verb

The append loop already skips data-less forms (`:494`), so without the
hand-rolled branch nothing invalid would be written — it would just be a silent
no-op. The branch exists to produce a **message**, which the model cannot supply:
A's obligation vocabulary has **no message/errorCode slot at all** (contrast B's
`errors: { required: key }` on the flow entry and `requires.errorCode`).

### 2f. Not-built vs cannot-be-built

`entryComplete` is exported (`engine/evaluate/complete.js:5`), so the controller
*could* call the model's own predicate as its save gate. The duplicated
predicate is a **wiring failure, not a structural limit**. The duplicated
*message*, however, is structural-today: A has nowhere in the model to put it.
Cheap to fix (add a message key to the mandate), but it is the real asymmetry.

---

## 3. The strongest version that survives

See `amendedClaim` in the structured output.

## 4. Consequences for the shopping list

- L2 §3 item 2 ("B's `mandatoryToProceed` + `isSufficientForProceed` … kills the
  `requiredOneOf`-expressed-twice duplication") is **wrong as written** — that
  pair cannot express an any-of-N group. The thing to steal for this rule is
  **`requires.anyOf` + `groupInvariantErrors`** (a group-invariant primitive),
  plus a message key on the mandate.
- Neither side enforces the identifier group at save or submit in a way that
  matches its own model. A's approximation of it is already inconsistent with
  the model; B's declaration is honoured for status but its error copy key is
  dead. The third option needs **one declaration, one evaluator, and every
  enforcement point (save, hub, submit, CYA) reading that one evaluator** —
  which neither side has.
