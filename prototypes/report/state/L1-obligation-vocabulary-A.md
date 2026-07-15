# L1 — Obligation vocabulary and expressiveness — SIDE A ("live-animals")

Clone: `workareas/model-comparison/clone-live-animals` (HEAD b6ac2ed)
Root: `prototypes/standalone/live-animals/`
All paths below are relative to that root unless stated.

---

## 1. What IS an obligation on side A

A plain JS object literal, exported as a `const` from
`features/<feature>/obligations.js`, collected by `registry.js` into a flat
forest of 28 roots. 12 model files, **314 LOC of model definition in total**;
the whole interpreter that gives it meaning is ~320 LOC
(`engine/evaluate/predicate.js` 69, `complete.js` 93, `reconcile.js` 48,
`cardinality.js` 31, `engine/status.js` 79).

The smallest legal obligation is one key:

```js
export const importType = { id: 'importType' }            // import-type-filter/obligations.js:1
export const declaration = { id: 'declaration', required: true }   // declaration/obligations.js:1
```

The largest thing in the model is 16 lines:

```js
export const animalIdentifiers = {                         // commodities/obligations.js:96-111
  id: 'animalIdentifiers',
  collection: true,
  item: [ /* 7 sub-obligations */ ],
  requiredAtLeastOne: true,
  requiredOneOf: ANIMAL_IDENTIFIER_GROUP,
  maxEntriesFrom: numberOfAnimalsQuantity
}
```

### The full vocabulary — 12 obligation keys, not 11

`docs/obligation-model.md:14-32` prints a table of 11 keys and then says "That
is the whole vocabulary." **It is 12.** `enforcedAt` is missing from the table
and is read by real code:

```js
if (obligation.enforcedAt !== 'continue') continue     // flow/prerequisites.js:11
```

| # | Key | Interpreted at | Live carriers |
|---|---|---|---|
| 1 | `id` | everywhere (store key + DOM name + registry key) | 44 |
| 2 | `required` | `complete.js:54`, `status.js:24` | 32 |
| 3 | `requiredAtLeastOne` | `complete.js:65`, `status.js:24` | 2 (`commodityLines`, `animalIdentifiers`) |
| 4 | `requiredOneOf` | `complete.js:15,21` | 1 (`animalIdentifiers`, 6 members) |
| 5 | `collection` | `complete.js:43,87` | 3 |
| 6 | `item` | `registry.js:38,59`, `complete.js:11,74`, `status.js:21`, `predicate.js:53` | 3 |
| 7 | `system` | `flow/dispatch.js:58`, `flow/entry-guard.js:34`, `shared/kit.js:29` — **filter only, nothing computes** | **0** |
| 8 | `renderOnly` | `contract.test.js:51` — **TEST FILE ONLY, no production consumer** | **0** |
| 9 | `activatedBy` | `reconcile.js:23-24`, `complete.js:24-41`, `analysis/reachability.js:30,58` | 15 |
| 10 | `wipeOnExit` | `reconcile.js:35` — one consumer, one line | 15 |
| 11 | `maxEntriesFrom` | `engine/evaluate/cardinality.js:22` — one consumer | 1 |
| 12 | `enforcedAt` | `flow/prerequisites.js:11` — one consumer | 2 (`countryOfOrigin`, `commoditySelection`; both `'continue'`) |

`activatedBy` has its own 6-key sub-vocabulary — 3 slots:

| Slot | Keys | Notes |
|---|---|---|
| target | `obligation` | a **real JS object reference**, never a string |
| frame | `frame: 'enclosing' \| 'anyItem'` (absent = sibling-identity inference) | 3 modes |
| operator | `equals` \| `includes` \| `notInUnionOf` \| `present` | 4 operators, mutually exclusive, all in `predicate.js:12-29` |

### Live carrier census (all counts verified by reading the 12 model files)

- 44 obligations (28 roots, 3 collections, max depth 2)
- `activatedBy`: 15 — `equals` 4, `includes` 9, `notInUnionOf` 2, `present` **0**
- `frame`: `enclosing` 7, `anyItem` 2, absent 6
- `wipeOnExit`: 15 — **exactly the `activatedBy` set** (every conditional wipes)
- `required: true`: 32; `requiredAtLeastOne`: 2; `requiredOneOf`: 1; `maxEntriesFrom`: 1; `enforcedAt`: 2
- `system`: 0; `renderOnly`: 0
- cross-feature model edges: **3** (`import-purpose`→`import-reason`;
  `cph-number`→`commodities`; `additional-details`→`commodities`)
- model→service edges: **3 files** import `services/commodities/index.js`

---

## 2. Data-shaped or code-shaped?

**Closure-free, but reference-shaped — serialisable, NOT deserialisable.**

No obligation carries a function. Grep of the 12 model files finds arrows only
in two *factories* that run at module load and leave a plain literal behind:

```js
const enclosingCommodity = (includes) => ({           // commodities/obligations.js:25-29
  obligation: commoditySelection, frame: 'enclosing', includes
})
```

Value domains are literal string arrays imported from a stub
(`services/commodities/stub.js:87-99`: `PASSPORT_COMMODITIES = ['Horse','Cow','Cat','Dog']`),
evaluated at import time. So the *values* are JSON-safe.

But relationships (`activatedBy.obligation`, `maxEntriesFrom`,
`notInUnionOf[]`) are **object identities**, and the resolvers use identity:

```js
const value = siblings.includes(referencedObligation)   // predicate.js:65 — reference identity
if (siblings.includes(referencedObligation)) { … }      // complete.js:26  — same test
candidate.item?.includes(referencedObligation)          // predicate.js:53 — same test
```

The graph is acyclic, so `JSON.stringify(registry.all)` succeeds — but a JSON
round-trip produces *distinct copies* of each obligation, `siblings.includes()`
goes false, and item-relative gates **silently** resolve as top-level answers
instead of throwing. The model is therefore **one-way serialisable**: you can
dump it, you cannot load it. Making A's model config-shaped costs a `link()`
boot pass (string id → object ref) plus a rethink of sibling-identity
inference, which is precisely the trick that lets `{ obligation: commoditySelection,
includes: [...] }` work unchanged at every depth with no scoping marker
(`docs/obligation-model.md:236-241`).

**There already is a JSON-shaped variant of the vocabulary — and nothing reads
it.** `spec/journey-spec.json` (2,014 lines, 49 obligations) carries the richer
data-shaped model: `kind`, `appliesAt`, `mandate:{required,enforcedAt}`,
`mandateRaw`, `label`, `input:{widget,values,hint,maxLength,valuesSource}`,
`activatedBy:{obligation:"<string id>",equals:"Yes"}`, `wipeOnExit`, `system`,
`subFields`, `provenance`, `conflicts` (e.g. `journey-spec.json:590-618`). Grep
proves it is a **design-time artefact only** — the sole reference anywhere in
the tree is a prose mention in `PROVENANCE.md:11`. Everything the spec knows
about labels, widgets and value domains is thrown away and hand-re-typed into
`.njk` + controller.

---

## 3. Predicates and operators — what they can and cannot say

`engine/evaluate/predicate.js` is the entire conditionality of the system:

```js
export function applyPredicate(activatedBy, value) {
  if ('equals' in activatedBy) return value === activatedBy.equals
  if ('includes' in activatedBy) { /* set intersection */ }
  if ('notInUnionOf' in activatedBy) { /* complement, BY REFERENCE */ }
  if ('present' in activatedBy) return isAnswered(value) === activatedBy.present
  throw new Error(`Unknown activation predicate: …`)
}
```

**Can express (declaratively, in data):**

- scalar equality (`equals`) — 4 carriers, e.g. `transport/obligations.js:32-35`
- membership / set intersection over a scalar OR a multi-select (`includes`) —
  9 carriers; the same operator covers both because of `[].concat(value ?? [])`
  (`predicate.js:17`)
- existence (`present`) — supported, **0 carriers**
- negation, but only as **complement-by-reference** (`notInUnionOf`) — 2 carriers
- existential quantification across a collection (`frame: 'anyItem'`,
  `predicate.js:50-62`) — "some commodity line is a Cow"
  (`cph-number/obligations.js:4-13`)
- outward cross-frame reference to the nearest ancestor holding the reference
  (`frame: 'enclosing'`, `predicate.js:38-48`) — works two frames out (proven
  `engine/evaluate/cross-frame.test.js:130-155`)
- sibling-at-least-one group mandate (`requiredOneOf`, same-frame only)
- collection cardinality cap by a sibling count (`maxEntriesFrom`)

**Cannot express — the vocabulary runs out here:**

1. **Boolean composition.** `activatedBy` has exactly ONE `obligation` and ONE
   operator (`predicate.js:36`, `applyPredicate`'s if-chain). "In scope when
   A = x AND B = y", or "A = x OR B = y", is inexpressible. It goes to a
   controller. The docs own this: *"Anything that needs real branching —
   arithmetic, multi-condition logic, external state — belongs in a page
   controller. That is the pressure valve"* (`docs/obligation-model.md:139-143`).
2. **Negation against a literal list.** There is no `notEquals` and no
   `notIncludes: ['Cow']`. `notInUnionOf` is not general negation — it takes a
   list of **obligations** and unions *their* `includes` lists:
   ```js
   obligations.flatMap((obligation) => [].concat(obligation.activatedBy.includes))  // predicate.js:5-9
   ```
   If a referenced obligation has no `activatedBy.includes`, this **TypeErrors**.
   So to say "show X when the commodity is not a Cow" you must first invent an
   obligation whose `activatedBy.includes` is `['Cow']` and point at it. Negation
   is parasitic on an existing positive gate.
3. **Comparison / arithmetic.** No `>`, `<`, `>=`. "Ask for a vet declaration
   when `numberOfAnimalsQuantity > 50`" cannot be modelled.
4. **Universal quantification.** `anyItem` is ∃ only; there is no `allItems` (∀).
   "In scope only if EVERY commodity line is a Cow" is inexpressible.
5. **Inward / indexed frame references.** You can walk outward (`enclosing`) or
   existentially inward (`anyItem`). You cannot reference a *specific* item, nor
   a sibling collection's item from another collection.
6. **Composite (record-valued) obligations.** The only structural type is
   `collection` (an ordered array of frames). A single nested *object* has no
   vocabulary, so the 5 party roles each store a whole address blob under one
   scalar id — `answers[party.id]?.name`
   (`features/addresses/party-picker.controller.js:69-74`), with
   `isAnswered` recursing into the object (`lib/answered.js:4-6`). ~45 address
   sub-fields (9 × 5 roles, `journey-spec.json`'s `address` field group) are
   **invisible to the engine**: no per-sub-field `required`, scope, wipe, or
   status. Modelling them would mean five 1-entry collections.
7. **Cardinality beyond "max, by reference".** `maxEntriesFrom` must name an
   obligation — `maxEntries: 5` (a literal) is inexpressible, as is a minimum
   other than the boolean `requiredAtLeastOne` (= min 1), or an exact count.
8. **Group mandates across frames.** `requiredOneOf` reads `entry[id]` directly
   (`complete.js:21`) — same-frame only, and it names **string ids**
   (`ANIMAL_IDENTIFIER_GROUP`, `commodities/obligations.js:87-94`) while
   `notInUnionOf` names **object references**. Two reference styles in one
   12-key vocabulary.
9. **Anything about presentation, validation, type or copy.** There is no
   `type`, no `label`, no `widget`, no `values`, no validator. Deliberate
   (`docs/obligation-model.md:34-42`), and it has a price — see §5.
10. **Computed values.** `system` is a *filter flag* with no computation
    mechanism anywhere. Nothing derives a value. It is 3 `!obligation.system`
    exclusions and zero carriers.

---

## 4. Modelled declaratively vs handled imperatively

| Concern | Verdict | Evidence |
|---|---|---|
| Conditionality (scope) | **DECLARATIVE** | 15 `activatedBy` literals → `reconcile.js:22-30` |
| Wipe on leaving scope | **DECLARATIVE** | `wipeOnExit` → `reconcile.js:32-46`; no `setScope`/per-key delete exists anywhere |
| Completeness / status roll-up | **DECLARATIVE** | `required`/`requiredAtLeastOne`/`requiredOneOf` → `complete.js`, `status.js` |
| Collection cardinality cap | **DECLARATIVE** | `maxEntriesFrom` → `cardinality.js` |
| Flow prerequisite graph | **DECLARATIVE (derived)** | `enforcedAt:'continue'` × flow order × dispatch → `flow/prerequisites.js`; exactly 1 authored gate in the whole flow |
| Cross-frame conditionality | **DECLARATIVE** | `frame` → `predicate.js:38-62` |
| Negation | **PARTIAL** | `notInUnionOf` only; requires a positive-gate obligation to negate |
| Multi-condition logic, arithmetic, external state | **IMPERATIVE** (controllers) | stated as policy, `docs/obligation-model.md:139-143` |
| Save-blocking validation | **IMPERATIVE** | Joi in `lib/validate/validators.js`; `required:true` ≠ save-blocking (`docs/obligation-model.md:44-51`) |
| Copy / labels / widgets / value domains | **IMPERATIVE** | hand-written in 32 `.njk` templates |
| Check-your-answers rows | **IMPERATIVE** | 495-LOC hand-composed `features/check-answers/controller.js` |
| i18n | **ABSENT** | no locales, no message catalogue; English hardcoded in `.njk` |
| `renderOnly` | **ABSENT in production** | read only by `contract.test.js:51` — the doc claim at `obligation-model.md:296-302` that "the controller never writes it" is enforced by nothing |
| `system` computation | **ABSENT** | flag filters coverage; no evaluator |
| Field-level page ownership at depth | **ABSENT / derived** | `docs/limits.md:48-52` — a new sub-field silently inherits its collection's page; ownership is not declarable |

---

## 5. Where the vocabulary's thinness actually bites: the triplicated value domain

Because an obligation has no `values`, the *same* value domain is written three
times with nothing checking agreement:

- model: `activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' }` — `features/origin/obligations.js:15`
- template: `{ value: "yes", text: "Yes", … }` — `features/origin/template.njk:42`
- validator: `oneOf('regionOfOriginCodeRequirement', ['yes', 'no'])` — `features/origin/controller.js:33`
- (and a fourth, upstream and unread: `"equals": "Yes"` — `spec/journey-spec.json:600-603`, **different casing**)

A typo in the model's `equals` string does not fail a test; it silently
de-activates the conditional field. `contract.test.js` checks *which ids* a page
commits, never *which values* it accepts. The `includes` gates are safer only by
accident — they import the same arrays the controllers use
(`services/commodities/index.js`), which is why the purity guard was widened to
permit service imports.

---

## 6. Doc-vs-code disagreements found (each is itself a finding)

1. `docs/obligation-model.md:30` "That is the whole vocabulary" — the table omits
   `enforcedAt`, which 2 obligations carry and `flow/prerequisites.js:11` reads.
2. `docs/obligation-model.md:58-60` "The only import it may make is sideways, to
   another feature's `obligations.js`" — `obligation-purity.js:13-17` also permits
   `services/<name>/index.js`, and 3 model files rely on it.
3. `docs/obligation-model.md:82-86` "Live-animals currently has no cross-feature
   edge" — **false**: three exist (`import-purpose/obligations.js:1`,
   `cph-number/obligations.js:1`, `additional-details/obligations.js:1`). The
   Layer-0 inventory repeats this ("Cross-feature obligation references=0").
4. `docs/obligation-model.md:275-283` "`entryComplete` … still resolves same-frame
   siblings only" — stale; `complete.js:5-10,35-41` takes an enclosing `ctx` and
   calls `evalPredicate`. DESIGN-DELTA #5 records the fix; the model doc was not
   updated.
5. `docs/limits.md:20-31` "Depth-2 and equals-gated conditionality have no live
   carrier" and `limits.md:16` "no live carrier is registered until inc-033..035"
   — stale; `animalIdentifiers` (`commodities/obligations.js:96-111`) is a live
   depth-2 carrier with 7 gated item fields.
6. `docs/obligation-model.md:296-302` describes `renderOnly` as a runtime
   behaviour ("the input renders, but the controller never writes it") — no
   runtime code reads the flag.

---

## 7. Retrofit cost (what adopting A's vocabulary would cost)

- **Adding an operator is genuinely cheap in the interpreter** — `predicate.js`
  is 69 LOC with a 4-branch if-chain, and DESIGN-DELTA #1/#3/#7 show three
  operators and two frame modes added incrementally, each with an explicit
  backwards-compat pin.
- **But every operator has a second, non-obvious tax**: the dead-end prover must
  be able to *synthesise a witness value* for it —
  `analysis/reachability.js:36-46` (`gateValue`) has one branch per operator, and
  `scaffoldFor` needs a seeding rule per frame mode. Add an operator without
  that and the reachability pin (`proveReachability` empty) breaks or, worse,
  goes vacuously green.
- **Making the model JSON-loadable** costs a boot `link()` pass plus the loss of
  sibling-identity inference (`predicate.js:65`, `complete.js:26`) — which then
  needs an explicit scoping marker on every item-relative gate, i.e. it buys
  config-shape at the cost of the vocabulary's smallest, cleverest property.
- **Adding a field costs 5 edits** (`docs/add-a-field.md:16`: obligations.js,
  controller schema, controller commit map, template, hand-composed CYA row) —
  step 5 is *named by a failing test* (`contract.test.js`), and a def no page
  collects **crashes the server at boot** (`flow/dispatch.js:58`). Cheap to get
  wrong, impossible to get wrong *silently*.
