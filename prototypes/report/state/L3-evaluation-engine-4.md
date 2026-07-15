# L3 — evaluation-engine — EE-4 — adversarial verification

**Claim under test:** both models infer instance existence from stored data ⇒ neither can
evaluate a gate for an instance that does not exist yet; both hand-rolled a partial second
gate evaluator in a controller; A leaks in 4 files / 5 functions (re-implementing the
operator against the model literal, never calling `applyPredicate`, one driving the commit
decision); B's leak is in fewer places but more brittle (branches on the `.metadata` string
tag, covers 2 of 4 gate shapes, forced a model-layer change).

**Verdict: AMENDED.** The shared blindness is real and both sides did leak a gate into a
controller. But three load-bearing parts of the claim do not survive the source:

1. the blindness is an **unbuilt API**, not a structural incapacity — both evaluators are
   pure total functions of a state map, and B literally exploits that (its "seed hack" is a
   materialised probe);
2. **three of the four A sites cited are not hypothetical-instance workarounds at all** —
   they gate on obligations that `reconcile` already scores correctly, so the "workaround"
   framing misattributes A's biggest leak class; and
3. B's "2 of 4 gate shapes" defect is **latent, not live** — all seven of B's unit-scoped
   obligations today are `allowListed`/`allowListedByPredicate`, i.e. 100% covered.

---

## 0. Citation hygiene (all paths in the claim are wrong; the line numbers are right)

| Claim cites | Actually at |
|---|---|
| `engine/registry.js:60` | `registry.js:60` (prototype root, not under `engine/`) |
| `features/animal-identification/controller.js` | `features/commodities/animal-identification.controller.js` |
| `features/consignment-details/controller.js` | `features/commodities/consignment-details.controller.js` |

Every quoted line number is correct at the corrected path. Not material to the verdict, but
it matters for the third-option shopping list.

---

## 1. What IS confirmed

**A's blindness — confirmed verbatim.** `registry.js:59-68`:

```js
if (obligation.item) {
  const entries = valueAt(answers, path) ?? []
  ...
  for (let i = 0; i < entries.length; i++) { ... yield* walk(...) }
}
```

No stored entry ⇒ no node yielded ⇒ `reconcile` (`engine/evaluate/reconcile.js:7`, `const
nodes = [...walk(answers, forest)]`) never scores it. Confirmed.

**A's `has()` is root-only — confirmed.** `engine/read.js:31` `has: (id) => inScope.has(id)`,
and `inScope` is keyed by `pathKey(path)` — which for a nested instance is
`commodityLines[0].animalIdentifiers[0].permanentAddress` (asserted directly at
`engine/evaluate/cross-frame.test.js:57`). So `has(id)` resolves roots only. Confirmed.

**B's blindness — confirmed verbatim.** `obligations/evaluator.js:244-271`
(`enumerateGroupPathsFromStorage`) derives a group's instance ids from
`Object.keys(fulfilments[descendant.id])` prefixes. No descendant storage ⇒ no instance.
And `lib/state.js:105-114` writes `{ [id]: '' }` on the seed obligation with the comment
"Seed a placeholder record for the line so the ObligationEvaluator recognises the line as
existing". Confirmed.

**B's leak — mechanism confirmed.** `features/units/controller.js:186-221`
(`pickSeedObligationForLine`) and the near-identical `features/commodity-lines/
controller.js:104-123` (`lineHasWiredUnitObligation`) both do
`const meta = obligation.applyTo?.metadata; if (!meta) continue;` then handle exactly
`meta.type === 'allowListed'` and `meta.type === 'allowListedByPredicate'`. Confirmed.
The `units` doc comment even names the root cause: *"at add-time no unit exists yet, so
`impl.inScope` is false for the very obligation we want to seed (chicken-and-egg…)"*.

**B's model-layer change — confirmed exactly.** `diff` of `prototypes/model-spikes/
obligations-v4-model/helpers.js` against `EUDPA-249-flow-layer/obligations/helpers.js`
returns **one hunk, six added lines**: five comment lines plus `predicate,` inside
`allowListedByPredicate`'s `fn.metadata`. That is the entire divergence from the frozen
ancestor, and it exists solely to feed the two picker call sites. Confirmed.

**A's commit-decision leak — confirmed.** `consignment-details.controller.js:177-185`:
`updateEntryAt(..., { ...entry, numberOfAnimalsQuantity: …, ...(packagesApply(entry
.commoditySelection) ? { numberOfPackages: … } : {}) })`. A hand-rolled gate decides what
gets written. Confirmed.

**A never calls `applyPredicate` from a controller — confirmed.** `grep -rn "applyPredicate"`
over `features/` returns nothing. `animal-identification.controller.js:3` does import
`includesUnion` from `engine/evaluate/predicate.js`, so it is not a *total* hand-roll.

---

## 2. Refutation 1 — "cannot evaluate a gate for an instance that does not exist" is an
## unbuilt API, not a structural limit. B proves it.

Both evaluators are **pure total functions of a state map**:

- A: `reconcile(answers, forest)` — `engine/evaluate/reconcile.js:6`. No request, no session,
  no I/O. `makeScope(answers)` is exported from `engine/index.js:1`.
- B: `evaluate(fulfilments, …)` — `obligations/evaluator.js`. Same.

So "would this obligation be in scope for a unit that does not exist?" is answerable on both
sides by **synthesising the state in which it does exist and evaluating that**. B *does
exactly this* — the seed hack is a materialised probe; its only sin is that it **persists**
the probe instead of discarding it. A could do the identical thing with no engine change:

```js
const probe = structuredClone(answers)
probe.commodityLines[i].animalIdentifiers = [...units, {}]
makeScope(probe).inScope.has(pathKey(['commodityLines', i, 'animalIdentifiers', units.length,
                                      'animalIdentifierPassport']))
```

This works because A's gate for those obligations is `frame:'enclosing'` on
`commoditySelection` (`features/commodities/obligations.js:25-33`), and **all of the gate's
inputs already exist** on the enclosing line. The only thing missing is the node.

The claim's own proposed remedy — `scope.wouldBeInScopeAt(path, prospectiveFrame)` — is a
thin wrapper over exactly this probe. That concedes the point: this is a missing convenience
on a capable engine, not a model that structurally cannot express the question. Per the
method note, this is the "not built vs cannot be built" conflation, and it is load-bearing:
it moves the item from "both models are broken" to "both models need one more exported
function", which is a completely different retrofit cost.

---

## 3. Refutation 2 — three of the four cited A sites are NOT hypothetical-instance
## workarounds. A's real leak class is gratuitous, and it is bigger than the claim says.

I traced every hand-rolled gate in A and every consumer (`grep -rn
"unweanedApplies\|cphApplies\|packagesApply\|typeApplies\|fallbackApplies\|
permanentAddressApplies"`).

| Site | Obligation it duplicates | Does `reconcile` already answer it? | Blindness-driven? |
|---|---|---|---|
| `animal-identification.controller.js:42` `typeApplies` | `animalIdentifierPassport`/`Tattoo`/`EarTag`/`horseName` — nested in `animalIdentifiers` item | **No** — form renders fields for a not-yet-created unit | **YES** |
| `:67` `fallbackApplies` | `animalIdentifierIdentificationDetails`/`Description` | **No** — same | **YES** |
| `:131` `permanentAddressApplies` | `permanentAddress` | **No** — same | **YES** (**not cited by the claim — A has 3 functions in this file, not 2**) |
| `consignment-details.controller.js:17` `packagesApply` | `numberOfPackages` (`obligations.js:11-18`, `activatedBy: {obligation: commoditySelection, includes: packageCountCommodities()}`) | **YES** — the line exists (`linesOf(answers)` iterates stored entries); `inScope` holds `commodityLines[i].numberOfPackages` | **NO** |
| `additional-details/controller.js:13` `unweanedApplies` | `containsUnweanedAnimals` — a **root** obligation (`additional-details/obligations.js:6-15`) | **YES** — and this controller *itself* uses `scope.has('containsUnweanedAnimals')` at `:61`, `:67` and `:81` for render **and commit** | **NO** |
| `cph-number/controller.js:12` `cphApplies` | `countyParishHoldingCph` — a **root** obligation with `frame:'anyItem'` (`cph-number/obligations.js:4-13`); `reconcile` scores it correctly and there is a passing test for it (`cross-frame.test.js:105,113`) | **YES** | **NO** |

Three of the four cited sites gate on obligations the engine **already scores correctly**.
`unweanedApplies` and `cphApplies` are duplicates of `scope.has(id)` — a call the
`additional-details` controller makes three lines below the duplicate. `packagesApply` needs
only `scope.inScope.has(pathKey(path))`, and both `inScope` (raw, `read.js:29`) and `pathKey`
(`lib/path.js`) are already public; `flow/gates.js:19` already reads `scope.inScope.has(...)`
directly, and the engine facade already exports two other **path-addressed** queries
(`collectionView(answers, path)`, `collectionCapAt(answers, path)` — `engine/index.js:13-14`).
Nothing structural stops A here. These leaks exist because the controllers were written
without asking `scope`.

**And the leak is worse than the claim counts.** `features/check-answers/controller.js`
builds its entire summary from `buildSections(journey.answers)` (`:480`) — it never takes
`scope` at all (it only fetches one at `:491`, for the redirect). It therefore re-implements
gates inline as well as importing all three helpers:

- `:111` `answers.regionOfOriginCodeRequirement === 'yes'` — duplicates
  `regionOfOriginCode.activatedBy = { obligation: regionOfOriginCodeRequirement, equals: 'yes' }`
- `:150` `answers.reasonForImport === 'internalMarket'` — duplicates
  `purposeInInternalMarket.activatedBy = { obligation: reasonForImport, equals: 'internalMarket' }`
- `:275` `overlandMeans().includes(answers.meansOfTransport)`, `:301-305` `answers.transporterType === 'Commercial'/'Private'`

These hardcode both the operator **and** the literal value. So A's true census is roughly
**6 named functions across 4 files + ≥4 inline duplications in check-answers**, of which
**only 3 (all in one file) are caused by the shared blindness**. The claim's count is
understated and its causal attribution is wrong.

---

## 4. Refutation 3 — B's "2 of 4 shapes" defect is latent, not live, and B's leak is the
## *less* brittle of the two on extension.

`grep -n -B3 -A6 "within: unitRecord" obligations/obligations.js` returns **seven**
unit-scoped obligations — `passport`, `tattoo`, `earTag`, `horseName` (`allowListed`),
`identificationDetails`, `description` (`allowListedByPredicate`), `permanentAddress`
(`allowListed`). **All seven are covered by the picker's two branches.** Coverage today is
100%. The claim's present-tense "a branchedGate- or hand-written-gated unit obligation is
invisible and the line silently offers no 'add animal' affordance" describes a **latent**
failure mode (a shape nobody has used at unit scope), not a current defect. `anyAllowListed`
is used for the notification-level CPH gate, not at unit scope; `branchedGate` is used for
notification-level retain-value blocks.

The `!seed` path is also not silent-by-accident: `features/units/controller.js:277-282`
handles it explicitly with a comment ("No per-unit obligation is in scope for this line's
commodity code (e.g. transit-only cattle) — bounce back without minting"), i.e. it is the
*designed* behaviour for a code that opens no unit obligation, and only *coincidentally*
also the failure mode for an unrecognised metadata type.

**On brittleness the claim is backwards.** B's two pickers **iterate the manifest**
(`v4Obligations.filter(o => o.within === unitRecord)`) and read the model's own declared
`values`/`predicate`, so adding an eighth `allowListed` unit obligation needs **zero
controller change** — the comment at `commodity-lines/controller.js:101-103` says exactly
this and it is true. A's equivalent (`animal-identification.controller.js:45-82`) is
**hand-maintained parallel arrays** — `TYPE_FIELDS`, `FALLBACK_FIELDS`, plus
`IDENTIFIER_LABELS` (`:23`) and `IDENTIFIER_MAX_MESSAGES` (`:84`). Adding a fifth typed
identifier obligation requires editing four hand-written structures in the controller. **A's
leak does not generalise over the manifest at all; B's does, within its supported shapes.**

Finally, "it forced a change to the model layer" is true but is being scored as a penalty
when it is arguably the right move: the change was to make the gate **declare its own
input predicate in metadata** — which is precisely the third-option recommendation the L2
already makes ("require every gate to declare its inputs and its admitting set"). One
functional line.

---

## 5. What survives

- Both engines derive instance existence from stored data. **Confirmed.**
- Neither exposes a hypothetical-instance / prospective-frame query. **Confirmed.**
- Both consequently re-derived a gate in a controller to render an "add a record" form.
  **Confirmed — A at `animal-identification.controller.js` (3 fns), B at
  `units/controller.js` + `commodity-lines/controller.js` (2 fns).** This is the genuine
  shared defect, and it is worth fixing once in the third option.
- A's version is the more dangerous of the two *for this specific defect*: it duplicates the
  operator by hand against parallel hand-maintained arrays, so it does not generalise; B's
  reads the model's declared metadata and iterates the manifest.
- A additionally leaks gates into controllers for reasons that have **nothing to do with the
  blindness** — that is a separate, larger and cheaper-to-fix finding, and the claim buries
  it inside the blindness finding.

## 6. Searches run

- `find` over both trees for the cited files (all three A paths in the claim are wrong).
- `Read`: `registry.js`, `engine/read.js`, `engine/index.js`, `engine/evaluate/reconcile.js`,
  `engine/evaluate/predicate.js`, `features/commodities/obligations.js`,
  `features/commodities/animal-identification.controller.js`,
  `features/commodities/consignment-details.controller.js`,
  `features/cph-number/{obligations,controller}.js`,
  `features/additional-details/controller.js`.
- `grep -rn` for `applyPredicate` in `features/` (0 hits — confirms the claim).
- `grep -rn` for all six A helper names + every call site (found `permanentAddressApplies`,
  uncited; found check-answers as the sole consumer of two of them).
- `grep -rn "inScope.has\|pathKey("` across `features/`, `flow/`, `engine/` — proves
  `scope.inScope` is already a public per-instance surface used by `flow/gates.js`.
- `grep -n "scope\|answers"` over `check-answers/controller.js` — proves it never takes scope.
- B: `sed` reads of `evaluator.js:230-280`, `lib/state.js:90-130`,
  `features/units/controller.js:150-300`, `features/commodity-lines/controller.js:92-140`,
  `obligations/helpers.js:55-145`.
- B: `diff -u` of `model-spikes/obligations-v4-model/helpers.js` vs
  `EUDPA-249-flow-layer/obligations/helpers.js` — one hunk, six lines, one functional.
- B: `grep -n -B3 -A6 "within: unitRecord" obligations/obligations.js` — all 7 unit-scoped
  obligations are covered by the picker.
