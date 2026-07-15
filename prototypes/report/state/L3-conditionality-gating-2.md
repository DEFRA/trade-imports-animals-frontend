# L3 — Adversarial verification — C2 (conditionality-gating)

**Claim under test:** B's gate conditions are structurally opaque to tooling; only 8 of 44 obligations (18%)
expose a machine-readable gate condition; `branchedGate` metadata omits the predicate; `allowListedByPredicate`'s
metadata is a live JS function; **"this covers every purge-on-flip case in B's manifest"**; A's conditions are
JSON data **"which is why A can carry a reachability prover at all"**.

**VERDICT: AMENDED.** The core opacity finding is real and structural. Two of the claim's load-bearing
sub-assertions are false on the source, and one is materially imprecise.

---

## 1. What the cited lines actually say (all quotes verified)

| Cite | Holds? | What the source shows |
|---|---|---|
| `obligations/helpers.js:135-139` | **YES** | `branchedGate`'s `fn.metadata = { type: 'branchedGate', whenTrue, whenFalse }`. The `predicate` argument is captured by the closure at `:133-134` and appears **nowhere** in the metadata. Confirmed verbatim. |
| `obligations/helpers.js:80-91` | **PARTIAL** | `allowListedByPredicate`'s metadata is **an object**, not a function: `{ type, obligation: gateObligation.id, predicate, projection: projectionGroup?.id ?? null, reasons }`. Only the *value-set* is a function. The **gate obligation reference and the projection group are data**. The claim's "metadata is a live JS function" is wrong; "the value-set is a live JS function" is right. |
| `data-dictionary-sketch.js:31-36` | **YES, and worse than claimed** | `scopeShape()` returns `meta` verbatim if present, `{kind:'custom-applyTo'}` if not. So a `branchedGate` row emits `{type, whenTrue, whenFalse}` — outcomes, no condition. **The claim missed the bigger hole:** B's **25 unconditional obligations** use inline `applyTo: () => ({ inScope: true, status: 'mandatory' })` with **no metadata at all**, so the dictionary labels them `custom-applyTo` — it cannot even tell an unconditional obligation from bespoke logic. |
| `obligations.md:556-557` | **YES** | "Custom `applyTo` closures with no metadata remain language-specific." The doc concedes the *no-metadata* case only; it never concedes that `branchedGate` (which *has* metadata) still hides its predicate. The claim's reading is correct. |
| A `engine/evaluate/predicate.js:12-69` | **YES** | 4 data operators (`equals` / `includes` / `notInUnionOf` / `present`) × 3 frame modes, interpreted from JSON literals. A has **no function-valued `activatedBy` anywhere** — `enclosingCommodity()` (`features/commodities/obligations.js:25-29`) is a data-literal factory. A's conditions really are closed data. |
| A `analysis/reachability.js` exists | **YES — but not for the reason claimed.** See §3. |

---

## 2. REFUTED: "This covers every purge-on-flip case in B's manifest"

I enumerated all 19 of B's gated obligations from `obligations/obligations.js`:

**Fully declarative metadata (8) — every one of them purges on flip (`whenFalse`/no-match ⇒ `{inScope:false}`):**

| Obligation | Line | Helper | Condition as data |
|---|---|---|---|
| `numberOfPackages` | 474 | `allowListed` | `{obligation: commodityCode.id, values: PACKAGE_COUNT_COMMODITIES, projection: null}` |
| `cph` | 513 | `anyAllowListed` | `{obligation, values: CPH_REQUIRED_COMMODITIES, whenTrue, whenFalse}` |
| `containsUnweanedAnimals` | 549 | `anyAllowListed` | `{obligation, values: UNWEANED_APPLICABLE_COMMODITIES, …}` |
| `passport` | 636 | `allowListed` | `{obligation, values: PASSPORT_COMMODITIES, projection: unitRecord.id}` |
| `tattoo` | 646 | `allowListed` | ditto |
| `earTag` | 656 | `allowListed` | ditto |
| `horseName` | 666 | `allowListed` | ditto |
| `permanentAddress` | 711 | `allowListed` | ditto |

**Opaque predicate — `branchedGate` (9 obligations, 5 call sites):** `regionCode` (:193, status-swap, **retained**),
`purposeInInternalMarket` (:216, purge), `commercialTransporter` (:282, purge), `privateTransporter` (:296, purge),
`transitedCountries` (:337, purge), and the 4-field accompanying-document block (:754 shared by :767/:773/:779/:785,
status-swap, **retained**).

**Half-opaque — `allowListedByPredicate` (2):** `identificationDetails` (:685), `description` (:698) — purge; gate
obligation + projection visible as data, value-set is the `noSpecificIdentifier` closure (:674-678).

**Arithmetic:** B has **14** purge-on-flip gates. **8 of them (57%) are 100% declarative data** — and they are
precisely the commodity-code identifier gates that the L2 analysis leans on (the horse→pig flip that purges
`passport` is `allowListed(commodityCode, PASSPORT_COMMODITIES, unitRecord)`, condition fully readable). The
opaque helpers cover **6 of 14**, not "every". This sub-assertion is **false**, and it is the sentence that would
have driven the wrong shopping-list decision (i.e. "B's purge machinery is unanalysable" — it mostly isn't).

---

## 3. REFUTED: "A's conditions are JSON data, which is why A can carry a reachability prover at all"

I read the prover. It is **generate-and-test, not static proof**:

- `analysis/reachability.js:8-20` — `enumerateScopeStates()` is a **hand-written, hard-coded** cross-product of
  four gate obligations and their literal values (`regionOfOriginCodeRequirement` × `reasonForImport` ×
  `meansOfTransport` × `transporterType`). It is **not derived from the `activatedBy` data**. Add a fifth gate
  obligation to A's model and the prover silently stops covering it.
- `:95-157` — `submitReadySeed`, a hand-maintained 60-line fixture.
- `:174` — the actual decision is `reconcile(candidate).inScope.has(targetKey)` — it **executes the engine** on a
  candidate world and observes the result. That is exactly the technique available to B.

The data conditions buy A **one** thing in the prover, and it is worth naming precisely: **invertibility**.
`gateValue(activatedBy)` (`:36-47`) reads `equals` / `includes` / `notInUnionOf` / `present` and *synthesises a
value that satisfies the gate* — including complement-search for `notInUnionOf` (`:39-44`). `scaffoldFor()`
(`:49-91`) uses `activatedBy.obligation` and `activatedBy.frame` to know **which** obligation to write that value
into, and in which frame. Both are static reads of the condition. You cannot do either against an opaque closure
without probing.

**Could B carry the same prover?** Yes, structurally:
- `evaluateState` is pure and runs headlessly — `dump.js:58` already feeds a plain fulfilments map through the
  whole contract and prints JSON. The generate-and-test harness exists.
- `domain/index.js:140` attaches `metadata = { shape: 'staticEnum', options, labels }` — the **value domains are
  enumerable as data**. Every one of B's 9 `branchedGate` gates reads a scalar enum
  (`regionCodeRequirement` yes/no, `reasonForImport`, `transporterType`, `meansOfTransport`,
  `accompanyingDocumentType`), so witness values are enumerable.
- B's `applyTo` functions are directly callable with hypothetical `(fulfilments, ids)` — `obligations.md:530-534`
  advertises exactly this, and `helpers.test.js` exercises them that way.

So "A can carry a prover **at all**" because conditions are data is **false**. The true statement is a cost/soundness
statement: for `branchedGate`, B would have to discover *both* the dependency edge *and* the passing value by
**probing the 44-obligation × domain cross-product**, with no soundness guarantee (a closure may read anything, and
nothing in the model stops it). A gets both by reading a literal. That is the real asymmetry — and it is about
*cheapness and soundness*, not possibility.

---

## 4. What survives, and is genuinely structural

- **`branchedGate` hides the dependency edge, not just the predicate.** For those 9 obligations a tool cannot
  determine *which obligation the gate reads*. B's **obligation dependency graph is not statically derivable**.
  This is the strongest true form of the claim, and the claim under-states it by framing the loss as "the
  condition" rather than "the edge".
- **Nothing in B's model forces a gate to be declarative.** `applyTo` is any `(fulfilments, ids) → decision`.
  There is no schema, no validator, no `whitelists.test.js` rule requiring metadata. Contrast A: `applyPredicate`
  (`predicate.js:26-28`) **throws** on an unknown operator key — the vocabulary is closed by construction and there
  is no escape hatch to smuggle a closure through.
- **B's own runtime already hits the wall.** `features/commodity-lines/controller.js:110-115` and
  `features/units/controller.js:204-210` branch on `meta.type === 'allowListed'` (read `meta.values`) and
  `meta.type === 'allowListedByPredicate'` (call `meta.predicate`). There is **no `branchedGate` arm** — there
  structurally cannot be one. This is production code, not the sketch, and it is the best single piece of
  evidence for the claim (stronger than the `data-dictionary-sketch.js` cite the claim actually offered).

## 5. What the claim over-credits itself on

- **"Not renderable" is too strong.** Every `branchedGate` outcome carries `reasons: [{code, explanation}]` as
  data (`obligations.js:195`, `:221`, `:287`, `:343`, `:759`; e.g. *"consignment includes at least one commodity
  that requires unweaned-animal tracking"*). For the actual product use of a data dictionary — "why is this field
  required?" — the human-facing rationale **is** data on both branches. The *machine-facing* predicate is not.
- **"18%" is a misleading denominator.** 25 of the 44 obligations have no gate at all. Among the 19 that do:
  8 fully declarative (42%), 10 expose the gate obligation as data (53%), 9 expose nothing but the outcomes (47%).

## 6. Not-built vs cannot-be-built — the check that matters

Every one of B's 9 `branchedGate` predicates is a scalar `===` (×3), a set-membership (×1,
`LAND_TRANSPORT_MODES.includes`), or a presence test (×1, `documentTypePresent`). Every one is trivially
expressible by a declarative helper — and B's `helpers.js` already ships `matches()` (`:147-154`, metadata
`{type, obligation, value}`, **fully declarative, and never used in the manifest**) and `present()` (`:165-175`,
returns a bare predicate with **no** metadata). So the *specific opacity in the manifest today* is a
**helper-library gap, not an expressiveness ceiling**: extending `branchedGate` to take a declarative condition
(or widening `matches` to carry `status`/`reasons`) is a contained change to `helpers.js` plus ~9 call sites.
What is **structural** is that B's model has no mechanism to *require* it — the escape hatch stays open forever,
and 25 obligations already walk through it. A closes it by construction (`predicate.js:26` throws).
