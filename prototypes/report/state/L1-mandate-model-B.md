# L1 — Mandate model — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer`
Roots: `prototypes/journey-config-spikes/EUDPA-249-flow-layer/` (live), `prototypes/model-spikes/obligations-v4-model/` (frozen ancestor — same mandate model, ignored below except where noted)

All paths below are relative to `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`.

---

## 1. The one-paragraph answer

Side B has a **two-flag mandate model, and the two flags live in different layers on purpose**:

- **completion-mandate** = `status: 'mandatory' | 'optional'` — owned by the **Obligations** layer. Answers "does the journey need this to reach Fulfilled?" Drives task-list status, CYA prompts and journey status.
- **proceed-mandate** = `mandatoryToProceed: true` — owned by the **Flow** layer, per presents-entry. Answers "can the user leave this page blank?" Enforced at page POST only.

"Not applicable" is **not a status value** — it is `inScope: false` on the obligation decision, a separate axis. NA only appears as a *derived page/container status* (`engine/index.js:274-281`). There are exactly **two mandate levels** (mandatory / optional); no advisory/warn level. The default when absent is **mandatory** (`engine/index.js:294-296`), which is a sharp edge, not a nicety.

The genuinely strong bit: `isSufficientForProceed` (`contract.js:315-322`) composes the two flags so a flow-declared page-save block automatically stands down when the obligation is *effectively optional in the current state*. That is the only place in either flag's enforcement that consults the other, and it is what makes conditional mandates and page-save blocks safe to combine.

The genuinely weak bit: **conditional mandate only works at notification level.** For any obligation `within` a group (per-line, per-unit), the record's status is copied verbatim from the *static* `obligation.status` and the `applyTo`-returned status is **silently discarded** (`obligations/evaluator.js:482-493`). This is structural — see §6.1.

---

## 2. Where mandate is declared — DECLARATIVE, but in two different slots depending on cardinality

### 2.1 Notification-level ("single") obligations — mandate is returned by `applyTo`, i.e. a FUNCTION

30 of the 44 obligations are notification-level singles. Every one carries an `applyTo` closure that returns the whole decision including status:

```js
export const countryOfOrigin = {
  id: 'a01b2c3d-…',
  name: 'countryOfOrigin',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}
```
(`obligations/obligations.js:174-178`)

The evaluator stores the decision (`evaluator.js:284-291`) and, for the `single` category, returns it **verbatim** as the implication:

```js
if (category === 'single') {
  return own ?? { inScope: true }
}
```
(`evaluator.js:453-455`)

So a single's mandate is whatever its `applyTo` said this evaluation — data-shaped output, code-shaped source. `effectiveStatus` then reads `impl.status` (`engine/index.js:294`).

**Static `status:` on a single is ignored** — `poApprovedReferenceNumber` (`obligations.js:152-157`) declares *both* `status: 'mandatory'` and an `applyTo` returning `status: 'mandatory'`; only the latter is read. Declaring `status` on a notification-level obligation **with no `applyTo` is a trap**: `classifyObligations` (`evaluator.js:176-177`) classifies `status !== undefined && !applyTo` as category `field`, and the `field` branch of `buildImplication` dereferences `obligation.within.id` (`evaluator.js:470-471`) → `TypeError` on an obligation with no `within`. Nothing guards it.

### 2.2 Group-scoped ("field" / "derived-leaf") obligations — mandate is a STATIC data property

12 of the 44 obligations are `within` a group and carry a static `status`:

| status | obligations |
|---|---|
| `mandatory` (5) | `commodityCode`, `commodityType`, `species`, `numberOfAnimals` (`obligations.js:416,427,436,443`), `permanentAddress` (`:710`) |
| `optional` (7) | `numberOfPackages` (`:473`), `passport` (`:635`), `tattoo` (`:645`), `earTag` (`:655`), `horseName` (`:665`), `identificationDetails` (`:684`), `description` (`:697`) |

The evaluator stamps that static value onto every record:

```js
if (category === 'derived-leaf') {
  const fulfilmentIds = own?.records ?? []
  impl.records = fulfilmentIds.map((fulfilmentId) => ({
    fulfilmentId,
    status: obligation.status      // <- the applyTo's status is NOT read
  }))
```
(`evaluator.js:482-492`; the `field` branch at `:469-479` and `user-leaf` at `:495-507` do the same)

`own` — the `applyTo` decision — is consulted only for `.records` and `.reasons`. **Any `status` an `applyTo` returns for a group-scoped obligation is dropped on the floor.** No test covers it; no obligation in the manifest tries it (the three record-producing helpers `allowListed` / `allowListedByPredicate` never put a `status` in their decision at all — `helpers.js:198-209`).

### 2.3 Groups themselves carry no status

`commodityLine` (`obligations.js:405-410`) and `unitRecord` (`:563-594`) have neither `status` nor `applyTo`. The group implication (`evaluator.js:457-467`) has no `status` field. Container status is **re-derived from the subtree**, never rolled up (`engine/index.js:469-474`) — so a group needs no mandate of its own.

---

## 3. Conditional mandate ("required only when X") — DECLARATIVE at notification level, via `branchedGate`

The only mechanism is `branchedGate(predicate, whenTrue, whenFalse)` (`helpers.js:132-141`) — a helper that builds an `applyTo` closure returning one of two pre-declared decision objects, with a `.metadata` sidecar carrying both branches.

**5 obligations flip mandate while staying in scope** (the "retain-value / status-swap" pattern — data survives the flip because scope never leaves):

1. `regionCode` — mandatory iff `regionCodeRequirement === 'yes'`, else **in-scope-optional** (`obligations.js:190-198`):
```js
applyTo: branchedGate(
  (fulfilments) => fulfilments[regionCodeRequirement.id] === 'yes',
  { inScope: true, status: 'mandatory', reasons: [regionCodeRequiredReason] },
  { inScope: true, status: 'optional' }
)
```
2-5. the four accompanying-document fields, which **share one `applyTo` instance** (`obligations.js:754-786`): all optional while `accompanyingDocumentType` is blank; the moment a type is picked, all four flip to mandatory. This is an all-or-nothing block expressed as one closure referenced four times — a genuinely elegant use of "scope is a function".

Contrast: `purposeInInternalMarket`, `commercialTransporter`, `privateTransporter`, `cph`, `containsUnweanedAnimals`, `transitedCountries` use `branchedGate`/`anyAllowListed` with `{ inScope: false }` on the false branch — those are **scope** changes (value purged, `evaluator.js:346`), not mandate changes. The model deliberately distinguishes the two: mandate-flip preserves data, scope-exit destroys it (`obligations.md:244-245`).

**Conditional mandate at record level (per-line / per-unit) is not expressible** — see §6.1. The only per-record conditionality available is scope: `permanentAddress` is *statically* `mandatory` and simply has no record on lines whose commodity code isn't in `PERMANENT_ADDRESS_COMMODITIES` (`obligations.js:706-717`). That covers the common case ("mandatory only for pets") but only because mandatory-when-present happens to be the required semantic. "Optional on cattle lines, mandatory on horse lines" has no declarative expression.

---

## 4. At-least-one-of group mandate — DECLARATIVE, one instance, first-class

`unitRecord.requires.anyOf` (`obligations.js:581-593`) — the V4 "at least one animal identifier per unit record" rule:

```js
requires: {
  get anyOf() {
    return [passport, tattoo, earTag, horseName, identificationDetails, description]
  },
  errorCode: 'obligation.unitRecord.identifiersRequired'
}
```
(lazy getter to dodge the circular-import / TDZ problem — the identifiers are declared below the group.)

Evaluated by `groupInvariantErrors(group, state)` (`engine/index.js:512-539`), which emits one error per in-scope group instance where **none** of the in-scope required leaves has a non-blank value, and is **vacuously satisfied** when no required leaf is in scope for that instance (`:524`). Crucially it is folded into the *same* status classifier as ordinary mandates by being counted as extra "mandatory concerns":

```js
const totalMandatoryConcerns = mandatoryInScope.length + groupErrorCount
const totalMandatoryUnsatisfied = mandatoryUnfulfilled.length + groupErrorCount
```
(`engine/index.js:398-400`)

So a unit with every leaf blank-but-optional still keeps its subsection In Progress and produces a CYA prompt (`features/check-your-answers/controller.js:318-331`). That is the right shape: the group invariant is a mandate, and it is modelled as one.

Limits: **`anyOf` is the only invariant verb** — no `oneOf`, no `atLeastN`, no `allOrNone`, no cross-instance ("at least one line must be…"). Only `unitRecord` uses it; `commodityLine` has no `requires`. The all-or-nothing accompanying-document block, which *is* an invariant in spirit, is instead hand-built from a shared `branchedGate` (§3) — two different mechanisms for two flavours of the same idea.

---

## 5. Proceed vs submit — the two-flag composition

### 5.1 Proceed-mandate: `mandatoryToProceed`, flow-owned, 14 declarations

`flow/flow.js` carries `mandatoryToProceed: true` on **14** entries (10 `presents`, 4 `presentsForEach`). Semantics documented at `flow/flow.js:15-26`; default is `false` (`engine/index.js:254,266`). Enforcement is in exactly one place, `contract.validatePagePayload`:

```js
if (
  descriptor.mandatoryToProceed &&
  !isSufficientForProceed(descriptor.obligation, descriptor.path, value, state)
) {
  errors.push({ code: 'flow.required', …, message: key ? t(key) : t('errors.defaultRequired') })
  continue                     // skip the domain check — required error wins
}
```
(`contract.js:266-283`)

Each flagged entry pairs the flag with an i18n message key (`errors.required`), and `i18n-coverage.test.js:11-13` gates that every flagged entry's key resolves in `locales/en.json`. Behavioural coverage in `routes.test.js:240-322` (blank POST → 400 with the flow's message; unflagged page → 302).

### 5.2 The composition rule — the best single idea in this dimension

```js
function isSufficientForProceed(obligation, path, value, state) {
  if (effectiveStatus(obligation, path, state) === 'optional') return true
  const entry = domain.get(obligation.id)
  if (entry?.type === 'address' && typeof entry.isComplete === 'function') {
    return entry.isComplete(value)
  }
  return !isBlankValue(value)
}
```
(`contract.js:315-322`)

Line 1 is the whole point: a flow can declare `mandatoryToProceed: true` **unconditionally**, and the model automatically stands the gate down whenever the obligation is *currently* optional. That is why `regionCode` can carry the flag flat in `flow.js:124` and still allow a blank save on the `regionCodeRequirement = no` branch (`routes.test.js:270-321`, both directions covered). Without it, every conditional mandate would need its condition restated in the flow — the exact duplication the three-layer split exists to prevent.

Line 3 is the second half: for composite address widgets the proceed-gate consults `domainEntry.isComplete(value)`, so a *partially* filled address also fails the gate. 3 of the 8 addresses are M-to-proceed (`commercialTransporter`, `privateTransporter`, `contactAddress`); the other 5 are M-to-submit and save blank, relying on the CYA prompt (`NEXT.md:147-161`).

### 5.3 Submit-mandate: modelled, surfaced… but there is NO SUBMIT

`journeyState(flow, state, submitted = false)` (`engine/index.js:583-599`) short-circuits to `'submitted'` when passed `true`. **Nothing ever passes `true`.** The only caller is `contract.statusOfJourney(state, submitted = false)` (`contract.js:91-93`), whose only caller is the CYA controller with one argument (`features/check-your-answers/controller.js:342`). There is no POST route on `/check-your-answers`, no submit handler, no submitted flag in `lib/state.js`. The CYA template just renders a sentence when the journey is Fulfilled:

```njk
{% if journeyState == 'fulfilled' %}
  <p class="govuk-body">{{ submitReadyText }}</p>
{% endif %}
```
(`features/check-your-answers/template.njk:33-35`)

So the *completion*-mandate is real and fully wired (it drives hub statuses, the CYA "you still need to…" banner, and journey status), but the **submit gate itself does not exist**. The doc says otherwise — see §7.

---

## 6. Limitations

### 6.1 STRUCTURAL — conditional mandate is impossible for anything inside a group

Record status is `obligation.status`, a static property, copied at `evaluator.js:489` / `:477` / `:505`. The `applyTo` decision for a group-scoped obligation is consumed only for `records` + `reasons`. Therefore:

- "This field is optional on cattle lines but mandatory on horse lines" — **not expressible**. You can make it *absent* on cattle lines (scope), or *mandatory everywhere it appears*, but not *present-and-optional here, present-and-mandatory there*.
- The retain-value status-swap pattern that makes the accompanying-document block work (§3) is **unavailable at depth**: at record level, downgrading means going out of scope, which purges the stored value (`evaluator.js:350-366`).
- Per-record proceed-mandate is likewise uniform: `expandPresents` copies the single `forEach.mandatoryToProceed` onto every record entry (`engine/index.js:258-270`), and `obligations.md:1695` calls it "per-record proceed-mandate", which it is not.

Cost to fix: change three branches of `buildImplication` to prefer `own.records[i].status ?? obligation.status`, which means `allowListed`/`allowListedByPredicate` must return per-record decisions rather than a bare id list (`helpers.js:198-209` currently returns `{ inScope, records: string[] }`). Then every consumer that reads `record.status` (5 sites, §6.4) keeps working. Not a rewrite — but it is a change to the evaluator's return contract and the helper library, i.e. the model's core, not the edges.

### 6.2 STRUCTURAL-ish — no mandate relaxation by context (draft vs submit)

`applyTo` is invoked with exactly two arguments — `(recognisedFulfilments, preEnumeratedGroupPaths)` (`evaluator.js:288`). There is no mode/context/actor parameter anywhere in the pipeline, and `evaluate(fulfilments)` takes one argument (`evaluator.js:60`). A "relaxed for draft-save, strict for submit" mandate has three possible homes and none is built:

- smuggle a pseudo-obligation `saveMode` into `fulfilments` and read it in each `applyTo` — works today for singles, **cannot work for group-scoped obligations** (their status is static, §6.1);
- add a 3rd `ctx` arg to `applyTo` + thread it through `runApplicabilityDecisions` and all 4 helper factories — a small, honest change (~5 files);
- express it at the Flow level as a second flow — legitimate under the architecture (a Service may have many Flows over one Obligations model, `obligations.md:1822-1825`) but not exercised (single flow).

So: not built, and for the indexed half of the model not buildable without the §6.1 fix first.

### 6.3 NOT STRUCTURAL — only two mandate levels; no advisory/warn; no "most restrictive wins"

The alphabet is `'mandatory' | 'optional'`, hard-coded in string comparisons at 6 sites. There is no third level (advisory / recommended / warn-but-allow). Adding one means touching every comparison.

`obligations.md:243` claims: *"Effective status when multiple reasons fire — Most restrictive wins — if any reason says mandatory, the obligation is mandatory."* **There is no combinator.** `runApplicabilityDecisions` (`evaluator.js:284-291`) runs *one* `applyTo` per obligation and stores *one* decision; nothing merges decisions. Convergent mandates ("mandatory because A **or** because B") must be hand-composed inside a single closure — which is exactly what `noSpecificIdentifier` (`obligations.js:674-678`) and the accompanying-document predicate (`:751-752`) do by hand. The `reasons` array is a *list of explanations attached to one decision*, not a set of competing reasons that get resolved.

### 6.4 NOT STRUCTURAL — mandate is re-derived in 5 places, only 2 of which use the shared helper

`effectiveStatus` (`engine/index.js:291-297`) is the canonical resolver, and it has exactly 2 consumers: `classifyEntries` (`engine/index.js:393`) and `isSufficientForProceed` (`contract.js:316`). Everything else re-implements it with a different precedence:

| site | expression | note |
|---|---|---|
| `engine/index.js:157` | `(record.status ?? 'mandatory') !== 'mandatory'` | `firstUnfulfilledPageForLine` |
| `engine/index.js:191` | same | `firstUnfulfilledPageForUnit` |
| `features/check-your-answers/controller.js:110` | `obligation.status ?? record?.status ?? impl.status ?? 'mandatory'` | 3-level fallback, different order |
| `features/check-your-answers/controller.js:272` | `obligation.status ?? impl.status ?? 'mandatory'` | singleton path |
| `features/units/controller.js:198` | `o.status === 'mandatory'` | reads the *static* property to prioritise seed pages |
| `dump.js:77` | `(impl.status ?? 'mandatory') === 'mandatory'` | also ignores `presentsForEach` pages entirely |

Behaviourally equivalent **today** (because `record.status` *is* `obligation.status`), but that equivalence is exactly what §6.1's fix would break — and the CYA sites, which check `obligation.status` *first*, would then silently ignore the per-record status. Cheap to fix now (route them all through `effectiveStatus`), expensive to discover later.

### 6.5 NOT STRUCTURAL — default-to-mandatory is unguarded

`effectiveStatus` returns `'mandatory'` when no status is found (`engine/index.js:294,296`). Combined with §2.1's TypeError trap, the rules for *where* to put a mandate (`applyTo` return for singles; static `status:` for group members; nowhere for groups) are conventions enforced by neither type nor test. `obligations/coverage.test.js` gates domain-wiring, id/name uniqueness and `within`-cycles — **it does not gate mandate declaration**. A new obligation with the status in the wrong slot either crashes or silently becomes mandatory.

### 6.6 NOT STRUCTURAL — `reasons` are produced, tested, and never shown to anyone

16 reason constants in `obligations.js:54-139`, threaded through the evaluator into `impl.reasons` (`evaluator.js:462,486,498`), asserted by 7 evaluator tests (`evaluator.test.js:770,825,849,873,898,984`). Every UI consumer passes an empty array: CYA pushes `because: []` at all 4 prompt sites (`features/check-your-answers/controller.js:158,176,295,329`) while the template *does* render `prompt.because` when non-empty (`template.njk:23`). So "why is this mandatory?" is fully modelled and 100% unsurfaced. The wiring is a one-line change; the value is the model already carries the answer.

---

## 7. Doc vs code disagreements (each verified by reading the code)

1. **"On CYA Submit — journey status must be Fulfilled or Optional …; submission is blocked otherwise"** (`obligations.md:1810-1812`). **False.** There is no submit route, no POST on CYA, no submitted flag. `journeyState`'s `submitted` param is never passed `true` (§5.3). The submit-mandate is enforced *nowhere* — only advertised via prompts.
2. **"Consistency tests this enables (implemented in the spike's test suite): `mandatoryToProceed` without rendering … `mandatoryToProceed` on never-applicable obligation"** (`obligations.md:1814-1821`). **False.** `grep -rln "never-applicable\|matching form input\|without rendering"` over the spike returns `obligations.md` and nothing else. The only flow-walking coverage test is `i18n-coverage.test.js`, which checks the *message key* exists, not that an input renders. Both tests are described as done; neither exists.
3. **"Scoping (in-scope / out-of-scope, mandatory / optional, reasons) — NOT on the obligation. Computed by the evaluator"** (`obligations.md:242`). **Half false.** True for the 30 singles. For the 12 group-scoped obligations the mandate *is* a static property on the obligation record and the evaluator merely copies it (§2.2).
4. **"`mandatoryToProceed?: boolean // per-record proceed-mandate"** (`obligations.md:1695`). **False.** It is per-*page-entry*; `expandPresents` applies the same value to every record (`engine/index.js:266`).
5. **"Effective status when multiple reasons fire — most restrictive wins"** (`obligations.md:243`). **Not implemented** — there is no multi-decision merge (§6.3).

---

## 8. What is worth stealing (and what it costs)

| Idea | Evidence | Cost to adopt |
|---|---|---|
| **Two-flag split: completion-mandate on the obligation, proceed-mandate on the flow entry.** Lets one obligation model serve several flows that disagree about where a user may leave a page blank. | `flow/flow.js:15-26`, `contract.js:266-283` | Cheap. Needs a per-page-entry flag and one enforcement point. |
| **`isSufficientForProceed`'s optional short-circuit** — the flow declares the gate unconditionally, the model decides whether it fires. | `contract.js:315-322`; both branches tested `routes.test.js:270-321` | Cheap, and it is the piece that makes the split *safe*. Adopt them together or not at all. |
| **`requires.anyOf` group invariant counted as a mandatory concern in the same classifier** — no special-case status plumbing. | `obligations.js:581-593`, `engine/index.js:512-539`, folded in at `:398-400` | Cheap. The `groupErrorCount` parameter on the classifier is the whole trick. |
| **Mandate-flip preserves data; scope-exit purges it** — the distinction is explicit and the manifest uses both deliberately. | `obligations.md:244-245`; `regionCode` (`obligations.js:190-198`) vs `purposeInInternalMarket` (`:213-225`) | Free — it is a rule, not code. |
| **`branchedGate` with a shared `applyTo` instance across an all-or-nothing block** — 4 obligations, one closure. | `obligations.js:754-786` | Free once scope-is-a-function is adopted. |

**Do not adopt as-is:** the static record-level `status` (§6.1), the six-way duplicated mandate resolution (§6.4), and the default-to-mandatory-with-no-guard rule (§6.5).
