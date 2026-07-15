# L1 — Obligation vocabulary and expressiveness — SIDE B (flow-layer)

Clone: `workareas/model-comparison/clone-flow-layer`
Root: `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
Ancestor (frozen, do not compare): `prototypes/model-spikes/obligations-v4-model/`

---

## 1. What IS an obligation on Side B?

An obligation is a **plain JS object literal in a hand-written ES module**, exported by
name and collected into a flat array. `obligations/obligations.js` (843 LOC) declares 44
of them; the manifest array is at `obligations/obligations.js:793-838`.

### 1.1 The complete record vocabulary — 6 keys used, 1 recognised-but-unused

Every key the evaluator or engine ever reads off an obligation record:

| Key | Type | Meaning | Used by | Count in manifest |
|---|---|---|---|---|
| `id` | UUID string | persistence key; stable across renames | everything | 44/44 |
| `name` | string | code/i18n/form-input-name surface | presentation, templates, errors | 44/44 |
| `within` | **obligation object reference** | structure/cardinality — "this leaf lives inside that group" | `buildObligationChildren` (evaluator.js:141), `buildAncestorGroups` (:188) | 11/44 |
| `status` | `'mandatory' \| 'optional'` | completion-mandate for records inside a group | `buildImplication` field/derived-leaf branches (evaluator.js:469-493) | 11/44 |
| `applyTo` | **closure** `(fulfilments, idsByObligationId) -> Decision` | scope + status | `runApplicabilityDecisions` (evaluator.js:278) | 38/44 |
| `requires` | `{ get anyOf(): Obligation[], errorCode: string }` | cross-record group invariant | `groupInvariantErrors` (engine/index.js:512) | **1/44** (`unitRecord`, obligations.js:581-593) |
| `indexedBy` | `{ source, mutability }` | **recognised by the classifier, never declared** | `classifyObligations` (evaluator.js:169-173) | **0/44** |

That is the whole vocabulary. There is no `type`, no `cardinality`, no `label`, no
`validation`, no `gatedBy`, no `dependsOn` on the obligation record. `obligations.md:240`
is explicit: *"**Type** — Not currently modelled as a field on the obligation record."*

`indexedBy` is dead vocabulary in the live manifest — `grep -rn "indexedBy" obligations/`
returns hits only in `evaluator.js` (the classifier) and `evaluator.units.test.js`
(synthetic fixtures). The V4 manifest declares zero. The `user-leaf` evaluator category
therefore never fires in production. Collections are inferred purely from `within`
back-references, and their instance ids are minted imperatively in the browser layer
(`lib/state.js`), not declared in the model.

### 1.2 The Decision (return of `applyTo`) — 4 keys

```ts
type Decision =
  | { inScope: false }
  | { inScope: true
      status?: 'mandatory' | 'optional'          // scalars
      reasons?: Array<{ code, explanation?, values? }>
      records?: Array<{ fulfilmentId, status? }>  // per-instance scope
    }
```
(`obligations.md:407-417`; consumed at `evaluator.js:333-379` purge and `:439-511`
implication build.)

`records` is the load-bearing one: for a `derived-leaf` the purge keeps **only** stored
records whose `fulfilmentId` appears in the returned set (`evaluator.js:350-366`). That is
how per-instance scope (this obligation applies to unit 1 but not unit 2) is expressed.

### 1.3 The five evaluator categories

`classifyObligations` (evaluator.js:166-185) derives a category from the key-shape — it is
not declared:

- `derived-leaf` — `applyTo` + `within` (or `indexedBy.source === 'derived'`)
- `user-leaf` — `indexedBy`, non-derived — **never fires in V4**
- `field` — `status` present, no `applyTo`, no `indexedBy`
- `group` — has children via `within` back-refs
- `single` — otherwise

**Code-clinched quirk.** The `field` branch of `buildImplication` reads
`obligation.within.id` unconditionally:

```js
// evaluator.js:469-472
if (category === 'field') {
  const parentGroupFulfilmentIds = [
    ...(fulfilmentIdsByObligationId.get(obligation.within.id) ?? [])
  ]
```

So a **top-level** obligation declared as `{ id, name, status: 'mandatory' }` — the most
natural data-only way to say "always in scope, always mandatory" — classifies as `field`
and throws a TypeError. To express "always mandatory at notification level" you *must*
write a closure. The manifest does exactly that, 19 times:

```js
// obligations.js:174-178
export const countryOfOrigin = {
  id: 'a01b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  name: 'countryOfOrigin',
  applyTo: () => ({ inScope: true, status: 'mandatory' })
}
```

The single most common shape in the domain is code, not data.

---

## 2. The gate vocabulary — 6 factories shipped, 4 used

`obligations/helpers.js` (215 LOC) exports six factories that *build* `applyTo` closures.
Each attaches a `.metadata` sidecar so the closure is a function at runtime and (partially)
a data structure for tooling.

| Factory | Line | Semantics | Metadata is JSON? | Uses in manifest |
|---|---|---|---|---|
| `allowListed(gate, values[], projectionGroup?, reasons?)` | :39 | membership of a *stored value* in a literal array, projected to the gated obligation's instance level | **yes** (`{type, obligation, values, projection, reasons}`) | **6** |
| `allowListedByPredicate(gate, predicate, projectionGroup?, reasons?)` | :65 | same but arbitrary JS predicate over the value | **no** — metadata embeds the live `predicate` fn (:80-91) | **2** |
| `anyAllowListed(gate, values[], whenTrue, whenFalse)` | :101 | existential (`.some`) over all records of the gate obligation → scalar Decision | **yes** | **2** |
| `branchedGate(predicate, whenTrue, whenFalse)` | :132 | arbitrary predicate over the whole fulfilments map → one of two Decisions | **partial** — `{type, whenTrue, whenFalse}`; **the predicate is NOT in the metadata** (:135-139) | **9** (6 distinct closures; 4 accompanying-document fields share one) |
| `matches(gate, value)` | :147 | scalar equality → Decision | yes | **0 — dead** |
| `present(obligation)` | :165 | existence predicate (`!== undefined/null`, non-empty map) | n/a (returns a predicate) | **0 — dead** |

`matches` and `present` are exercised **only** in `obligations/helpers.test.js:204-242`.
No obligation in the manifest uses either. The doc lists them as vocabulary
(`obligations.md:508-511`) — they are unused vocabulary.

### 2.1 Distribution across the 44 obligations

| Shape | Count |
|---|---|
| No `applyTo` at all (2 structural groups + 4 in-group field records) | 6 |
| Hand-written **unconditional** closure `() => ({ inScope: true, status: … })` | **19** |
| `branchedGate` (conditional) | 9 |
| `allowListed` | 6 |
| `allowListedByPredicate` | 2 |
| `anyAllowListed` | 2 |
| **Total with a conditional gate** | **19 / 44 (43%)** |

(Counted from `grep -n "applyTo:" obligations/obligations.js` — 39 hits, one of which is
a comment at :722.)

### 2.2 Operators actually available

Because `applyTo` is a closure, the operator set is **all of JavaScript**. What the
manifest actually exercises:

| Operator | Expressed as | Evidence |
|---|---|---|
| Equality | `fulfilments[x.id] === 'yes'` | obligations.js:194 (`regionCode`) |
| Membership (literal set) | `values.includes(value)` inside `allowListed` | helpers.js:44; `PASSPORT_COMMODITIES` etc. |
| Membership (dynamic set) | `LAND_TRANSPORT_MODES.includes(...)` | obligations.js:332-339 (`transitedCountries`) |
| Negation / set-difference | plain `!` and `&&` in a predicate | obligations.js:674-678 — `noSpecificIdentifier = (code) => !PASSPORT.includes(code) && !TATTOO.includes(code) && …` |
| Existence / non-blank | local `isFilled` helper (obligations.js:739-744) | obligations.js:751-752 (`documentTypePresent`) |
| Cross-field (same frame) | closure reads any `fulfilments[other.id]` | obligations.js:217 (`purposeInInternalMarket` reads `reasonForImport`) |
| Cross-sibling all-or-nothing | one shared `branchedGate` bound to 4 obligations | obligations.js:754-786 |
| **Existential quantifier ∃ over records** | `anyAllowListed` → `candidates.some(v => values.includes(v))` | helpers.js:110; `cph` (obligations.js:513) and `containsUnweanedAnimals` (:549) |
| **Cross-frame (broader → narrower)** | `allowListed(..., projectionGroup)` — line-level code gates unit-level fields | helpers.js:204-209 + obligations.js:636 (`passport`) |
| **Per-instance scope** | Decision `records: []` → purge filter | evaluator.js:350-366 |
| Universal quantifier ∀ | **not present** — no helper; would need a hand-written closure | — |
| Cross-record uniqueness / cross-instance comparison | **not expressible** — see §5 | obligations.md:2834-2837 |

---

## 3. Data-shaped vs code-shaped — the honest number

**The manifest cannot be serialised to JSON. Not partially. Not at all.**

Three independent blockers, all in the record itself:

1. `within` is an **object reference** to another obligation (obligations.js:415), not an
   id string.
2. `requires.anyOf` is a **lazy getter returning an array of object references**
   (obligations.js:582-591) — a deliberate hack to dodge a circular import.
3. `applyTo` is a **closure** on 38 of 44 records.

`obligations.md` says both things and contradicts itself. At :62-64:

> *"An **obligation** is a discrete unit … The obligation itself is **pure data** — light
> and JSON-encodable."*

At :761-768, ~700 lines later:

> *"Neither the obligations data nor the evaluators are JSON-portable as-shipped. Both are
> JavaScript. **Obligations** carry closures (`applyTo`), cross-obligation references
> (`within`, `requires.anyOf`, `presents`), and helper-returned functions. **Nothing about
> the current shape is serialisable** — a non-JS runtime can't consume `obligations.js`
> directly."*

The second statement is the true one; the working definition at :62-64 is stale. The doc's
own illustrative JSON at :206-231 shows `"cardinality": "single"` and
`"indexedBy": {...}` keys that **do not exist in the live manifest**. Treat the working
definition and the illustrative JSON as aspirational.

### 3.1 How much of the gate logic IS recoverable as data?

The `.metadata` sidecar is the partial-recovery mechanism. Counting what a non-JS runtime
could actually reconstruct:

| Obligations | Gate | Metadata content | Reconstructable from data alone? |
|---|---|---|---|
| 6 | `allowListed` | `{type, obligation: id, values: [...], projection: id, reasons}` | **YES** |
| 2 | `anyAllowListed` | `{type, obligation: id, values: [...], whenTrue, whenFalse}` | **YES** |
| 9 | `branchedGate` | `{type, whenTrue, whenFalse}` — **the predicate is absent** | **NO** — outcomes are data, the *condition* is invisible |
| 2 | `allowListedByPredicate` | `{type, obligation, predicate: <fn>, projection, reasons}` | **NO** — a live function in the "metadata" |
| 19 | bare closure | **no metadata at all** | **NO** |
| 6 | none | n/a | trivially (always in scope) |

**8 of 44 obligations (18%) have a fully JSON-serialisable scope declaration.** For the 9
`branchedGate` obligations — which include every mutually-exclusive pair, the
retain-value pattern, and the all-or-nothing block, i.e. the *interesting* conditionals —
the metadata tells you what the two outcomes are and gives you no way to know which fires.

`data-dictionary-sketch.js:31-36` is where this bites in practice:

```js
function scopeShape(obligation) {
  if (!obligation.applyTo) return { kind: 'always-in-scope' }
  const meta = obligation.applyTo.metadata
  if (!meta) return { kind: 'custom-applyTo' }
  return meta
}
```

The stakeholder-facing data dictionary reports `countryOfOrigin` — an always-mandatory
field — as `{ kind: 'custom-applyTo' }`, i.e. "opaque". 19 of 44 rows come out that way.
`obligations.md:1038-1040` claims *"this makes the whole logical model self-describing
enough for downstream tooling to walk it as data"* — the code does not support "whole".
**Doc/code disagreement, reported.**

### 3.2 The rejection of the declarative DSL is documented and reasoned

This was not an oversight. Both shapes were built and the DSL was killed:
`model-spikes/obligations-v4-model/GAPS.md:62-86` — *"Why applyTo + helpers over a
declarative gate DSL"* — cites five grounds (idiomatic JS; obligation-level testability
with no evaluator construction; cross-sibling ergonomics that avoid attach-after-
declaration mutation; composes with `&&`/`||`/`!`/`.filter()`; helpers are themselves
unit-testable), plus five options-not-taken (GAPS.md:176-198), including the `gatedBy`
DSL that *"landed as a prototype and used through step 4 and 5"* before being rejected.
`obligations.md:269-284` separately records that pure-JSON scoping *"can't"* work, citing
algorithm-shaped rules, indexed sub-obligation templating, and external state.

**This is the central architectural claim of Side B and it is argued, not assumed.** Any
third option that reaches for a JSON/JSONLogic gate DSL is re-litigating a decision this
spike already took with evidence.

---

## 4. Value legality — Layer 1.25 (Domain), 4 entry shapes

Scope is Layer 1; **value legality is a separate map keyed by obligation id**
(`domain/index.js:1150-1194`, 40 entries). Four factories, all with `.metadata`:

| Factory | Line | Shape | Count | Introspectable? |
|---|---|---|---|---|
| `staticEnum(options, {labels})` | :134 | fixed option list | 12 | **fully** — options + labels are data |
| `computedEnum(fn, readsFrom[], {labels})` | :148 | options are a closure of state | 2 | **partial** — `readsFrom` names the sibling obligations, options need the closure |
| `predicate(type, fn, reasons)` | :163 | `(value, ctx) => Error[]` | 17 | **partial** — `reasons[]` enumerates every failure code the closure can emit |
| `addressBlock(obl, {subFields, required, subFieldRules})` | :197 | composite widget + `isComplete` + per-sub-field rules | 9 | **fully** — subFields/required/subFieldRules are data |

The `readsFrom` and `reasons` sidecars are the good idea here: they make a closure's
*reachability* and *failure surface* declarable even when its body isn't.

**Predicate context — one declared affordance, zero uses.** `engine/index.js:66-74` builds
`predicateCtx = { fulfilments, path, siblingValue, ids }`, where `siblingValue(obl)` reads
a sibling's value at the same group-instance path. `grep -rn siblingValue` across the whole
spike: **no domain entry uses it.** It appears only in `engine/index.js`, its own tests
(`engine/index.test.js:49,124`), a test double (`domain/index.test.js:63`), and
`controller-sketch.js:52` (stubbed to `() => undefined`). `obligations.md:963-970` is
honest about this: *"The current V4 slice has no singleton or single-line predicate that
needs to read a sibling (a fabricated per-species animal cap was removed after audit)."*
So **cross-field validation is a built, tested, unused mechanism.**

**Enum + predicate compose.** `engine/index.js:99-102` runs `entry.predicate` even for
enum entries, so `transitedCountries` gets both membership and a "max 12 selections" cap
(`domain/index.js:1080-1106`).

---

## 5. Where the vocabulary runs out

### 5.1 Cross-record predicates across instances of the same group — ABSENT, structural

The only cross-record operator is `requires.anyOf` — an existential ("≥1 of these six
leaves must be filled per unit-record"), used exactly once (obligations.js:581-593),
evaluated by exactly one primitive (`groupInvariantErrors`, engine/index.js:512-539). There
is no `allOf`, no `noneOf`, no `atLeast(n)`, no `atMost(n)`, no min/max on a collection.

*"No two commodity lines carry the same commodity code"* is not expressible:
- Not in `applyTo` — a Decision says in-scope/out-of-scope/mandatory. It has no channel to
  emit a validation error. Marking a duplicate line "out of scope" would **purge the
  user's data** (evaluator.js:350-366).
- Not in the group-invariant primitive — `groupInvariantErrors` only tests `anyOf` *within*
  one instance; it never compares two instances.
- Only half-expressible in a domain predicate — `validate()` receives `ctx.fulfilments` so
  a `commodityCode` predicate *could* scan the whole per-line map. But `validate` is only
  called from `contract.validatePagePayload` on POST, so a duplicate created by editing an
  *earlier* line would never be re-checked, and the task list / CYA would never show it.

`obligations.md:2834-2837` concedes exactly this: *"Cross-record predicates other than
group invariants — e.g. 'no two commodity lines carry the same code'. Would live at the
container-status level or as a new engine primitive parallel to `groupInvariantErrors`."*
**Structural: a new engine primitive plus a new record key is required.**

### 5.2 Submission blocks (answer-combination that forbids submit) — ABSENT, structural

`obligations.md:2845-2860` (§R): *"certain **combinations of answers** should prevent
Submit, even when every in-scope obligation is fulfilled … Direction of travel: extend the
ObligationEvaluator return type with a top-level `submissionBlocks` field; extend the
Journey state taxonomy with a **Cannot Submit** state."* The evaluator's return type is
`{ fulfilments, obligations }` (evaluator.js:123-126) — there is no top-level channel for a
journey-wide verdict. A prohibited species-from-country combination cannot be expressed
today. **Structural: the return type and the status alphabet both have to change.**

### 5.3 Collection cardinality bounds — ABSENT, not structural

"At least one commodity line", "at most 10 units" have nowhere to live. `indexedBy` (the
key that would carry `mutability` / min / max) is never declared, and `obligations.md:2698`
defers *"user-driven with min/max constraints"* to H.2. The browser layer's bespoke
Add-another controllers (`features/commodity-lines/`, `features/units/`) enforce nothing.
Additive: one new record key + one engine primitive. **structural=false.**

### 5.4 The `allowListed` projection is hard-coded to ONE level of nesting — STRUCTURAL (in the helper)

`obligations.md:2819-2827` claims: *"Nested indexing supports leaves at arbitrary depth.
Depth is data-driven via the `within` chain."* True of the **evaluator** (composite keys
and prefix-length arithmetic at evaluator.js:256-268 are depth-general). **Not true of the
helper library.** `filterAndProject` projects with:

```js
// helpers.js:212-215
function pathPrefix(path) {
  const slash = path.indexOf('/')
  return slash === -1 ? path : path.slice(0, slash)
}
```

`pathPrefix` slices at the **first** `/`. So `allowListed`'s projection only works when the
gate obligation lives at the **top-level group** (1 segment) and the gated obligation lives
somewhere below it. A gate at depth-2 (`lineId/unitId`) gating a depth-3 obligation would
compare a 2-segment gate key against a 1-segment prefix — **it can never match, and it fails
silently as "out of scope"**, purging data. Same-level gates at any depth are fine (pass
`projectionGroup: null`, records are the passing keys verbatim, helpers.js:200-202).

The doc's "arbitrary depth" claim is a **doc/code disagreement** at the helper level. Fixing
it is a small, local change (walk N-1 segments), but as shipped the vocabulary silently
mis-scopes intermediate-level gates.

### 5.5 Async / external-state gates — ABSENT, not structural

`applyTo` is sync and pure (evaluator.js:288). An obligation whose scope depends on a
reference-data lookup ("is this species banned from this country today?") cannot be
expressed. `obligations.md:283-284` names this: *"**External state.** Reference-data
lookups. Not exercised in the current V4 slice — deferred."* The intended answer is the
unimplemented orchestrator (`obligations.md:712-738`): resolve externally, write the result
into `fulfilments`, re-evaluate — a fixed-point loop. That is a coherent design, and it
keeps the evaluator pure. **structural=false** given the orchestrator, but the orchestrator
does not exist.

### 5.6 Purges are silent — no audit channel

`obligations.md:674-679`: *"The evaluator emits no audit hook or log when a fulfilment is
dropped from the amended set … If service-specific audit needs surface later, the
**orchestrator** is the intended log point."* A user who fills 40 unit records, then flips
the commodity code, loses all of them with no signal in the model output. `purgeStorage`
(evaluator.js:333-379) just doesn't copy them into `amendedFulfilments`. Additive to fix.

---

## 6. Modelled declaratively vs handled imperatively — the ruthless cut

**MODELLED DECLARATIVELY (data the engine interprets):**
- Identity (`id`) + renameable `name` — 44/44.
- Structure/nesting (`within` chain) and therefore cardinality — 11/44.
- Completion-mandate (`status`) for in-group leaves — 11/44.
- Membership gates with literal value arrays — 8/44 obligations
  (`allowListed` ×6 + `anyAllowListed` ×2), fully JSON-recoverable via `.metadata`.
- Enum option sets — 12 `staticEnum` + 9 `addressBlock` domain entries.
- Group invariant `anyOf` + `errorCode` — 1 declaration, engine-interpreted.
- Flow-level proceed-mandate (`mandatoryToProceed`, `errors.required`) — a *data* flag on
  the presents entry (flow/flow.js:10-26), composed with obligation `status` by
  `isSufficientForProceed` (contract.js:315-322).

**HANDLED IMPERATIVELY (real, working, hand-coded per case):**
- "Always in scope, mandatory" — **19/44 obligations, written as a closure**, invisible to
  tooling.
- Every conditional whose condition is not a literal-array membership — 11/44
  (`branchedGate` ×9, `allowListedByPredicate` ×2): equality, land-transport-mode
  membership, inverse-set-difference, all-or-nothing presence. Working, tested, and opaque
  to the metadata sidecar.
- Value legality for 19 obligations (17 `predicate` + 2 `computedEnum` domain entries).
- Collection instance-id minting, add/delete/cascade (`lib/state.js`).

**PARTIAL:**
- Introspection/serialisation — 18% of obligations, 12/40 domain entries.
- Cross-field validation — mechanism built and tested (`ctx.siblingValue`), **zero
  production uses**.
- Depth — data-driven in the evaluator, one-level-only in the `allowListed` helper, and
  hard-coded (3 parallel controller factories) in the browser layer.

**ABSENT:**
- Cross-instance predicates, submission blocks, collection min/max, async gates, `∀`
  quantifier, audit of purges, `matches`/`present` (shipped, unused).

---

## 7. What Side B has that is worth stealing regardless of who wins

1. **`.metadata` sidecar on a closure factory** (helpers.js:49-55, domain/index.js:140-166).
   The single cheapest way to get 80% of a DSL's introspection without a DSL. Cost: one
   object literal per factory. Note the discipline it demands — the moment someone
   hand-writes a closure (19 times here) the sidecar is gone.
2. **`readsFrom` / `reasons` metadata** (domain/index.js:148-167). Declaring a closure's
   *dependencies* and its *failure-code surface* as data, even when its body is code. This
   is the honest middle ground between data-shaped and code-shaped.
3. **The Decision `records[]` channel** (evaluator.js:350-366). Per-instance scope as a
   first-class return value, so "passport applies to units of horse lines only" is one
   declaration and the purge follows automatically.
4. **`obligations/coverage.test.js:80-97`** — every obligation must be wired to a domain
   entry or be on a `KNOWN_UNWIRED` allow-list *with a written reason*, plus within-chain
   cycle detection (:108-137) and id/name uniqueness (:139-170). Portable to any model in
   an afternoon.
5. **The DSL post-mortem** (GAPS.md:62-86, :176-198). Do not re-litigate.

## 8. Retrofit cost, stated plainly

- **Adopting B's gate vocabulary into a third option: cheap.** `helpers.js` is 215 LOC with
  no dependencies beyond the obligation records themselves; `evaluator.js` is 519 LOC of
  pure functions with one import.
- **Adopting B's *serialisability*: impossible — there is none to adopt.** 18% of gates are
  JSON-expressible; `within` and `requires.anyOf` are object references by construction. If
  the third option needs a data-shaped spec (a machine-readable `journey-spec.json`), B's
  manifest is a **source of semantics, not a source of format** — it would have to be
  re-authored, not converted.
- **Closing B's absent capabilities:** cross-instance predicates and submission blocks each
  need a new engine primitive + a new record key + a new return-type field. Neither is a
  rewrite; both are real work with a design decision attached.
