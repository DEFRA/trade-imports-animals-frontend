# L2 — Obligation vocabulary and expressiveness — A vs B

**Verdict: MIXED.** Neither model is a superset of the other. They sit at opposite ends of
a single trade-off — *expressive power* vs *decidability of analysis* — and the source shows
each side paying the other's price on a real V4 requirement.

The standing prior ("B's obligations model is better, possibly in every respect") is
**REFUTED on two structural counts** and **CONFIRMED on expressiveness**. Details below.

---

## 1. The one-sentence characterisation

| | Side A (live-animals) | Side B (flow-layer) |
|---|---|---|
| An obligation is… | a **closure-free plain object literal**, 12 keys | a plain object literal, **6 keys, 38/44 carrying a closure** |
| Conditionality is… | **data**: 4 operators × 3 frame modes | **code**: `applyTo(fulfilments, ids) → Decision` |
| Operator set | **closed** — 4 (`equals`, `includes`, `notInUnionOf`, `present`) | **open** — all of JavaScript |
| Gates that a non-JS runtime can read | **15 / 15 (100%)** | **8 / 44 (18%)** |
| Meaning of the vocabulary | **~320 LOC** interpreter | **3,710 LOC** core |
| Escape hatch | "belongs in a page controller" (obligation-model.md:139-143) | "hand-write applyTo — JS is the vocabulary" (obligations.md:527-528) |

A is a **closed data vocabulary with an interpreter**. B is an **open code vocabulary with a
convention**. Everything below follows from that.

---

## 2. Where the prior is REFUTED — two structural wins for A

### 2.1 A's full conditionality is dumpable; B's is not (and cannot be)

Every one of A's 15 gates is a data literal — operator, operand and frame all inspectable
(`predicate.js:12-29`). I verified A's model is genuinely **closure-free**: grepping `=>`
across all 12 `features/*/obligations.js` returns exactly two hits
(`commodities/obligations.js:25`, `:62`) and **both are module-load factories that return a
plain literal** — nothing is stored on the obligation.

B cannot match this. Verified in source:

- `branchedGate` (**9 obligations** — including *every* interesting conditional: the
  mutually-exclusive transporter pair, the retain-value flip, the all-or-nothing document
  block) publishes `{type, whenTrue, whenFalse}` and **omits the predicate**
  (`helpers.js:135-139`).
- `allowListedByPredicate` (2) puts a **live JS function** in its "metadata"
  (`helpers.js:80-91`).
- **19 obligations** are bare closures with no metadata at all — I counted them exactly:
  `grep -n "applyTo: () => ({ inScope: true"` returns **19 hits**
  (`obligations.js:156…394`).
- `within` is an object reference (13 sites) and `requires.anyOf` is a **lazy getter**
  returning object references (`obligations.js:581-593`).

B's own doc concedes it: *"Nothing about the current shape is serialisable"*
(obligations.md:761-768) — contradicting its own working definition at :62-64 (*"pure data —
JSON-encodable"*). B's stakeholder-facing data dictionary reports 19 of 44 rows as
`{ kind: 'custom-applyTo' }` — opaque (`data-dictionary-sketch.js:31-36`).

**Why B structurally cannot close this:** the condition *is* a JS function body. There is no
representation of it other than the function. Recovering it means re-authoring every gate in
a data vocabulary — i.e. the `gatedBy` DSL that `GAPS.md:62-86` says was **built, shipped
through steps 4-5, and deliberately killed**. This is structural-by-decision, and it is the
single most consequential fact in the comparison.

### 2.2 A can statically prove reachability; B provably cannot

This is the sharpest finding and neither L1 read framed it as a head-to-head.

`analysis/reachability.js:36-47` — `gateValue` **inverts a gate to synthesise a witness
value**, one branch per operator. For `notInUnionOf` it manufactures a value guaranteed
outside the union by construction (`:41-42`: seed `'outside-the-union'`, append `-x` until it
escapes). `scaffoldFor` (`:49-91`) then builds a state that puts a target obligation in
scope, and `proveReachability` (`:184-215`) proves **every obligation in the model has a
reachable owning page** — flagging `no-witness-puts-in-scope`, `no-owning-page`,
`owning-page-unreachable-in-scope`.

You can only invert a gate if the gate is data.

On B, inverting `branchedGate(somePredicate, …)` means **inverting an arbitrary JS function**
— symbolic execution / SMT over JS, undecidable in general. B deliberately withholds the
predicate from its own metadata (`helpers.js:135-139`), so even a best-effort analyser has
nothing to read. B could run this analysis over its 8 `allowListed`/`anyAllowListed` gates
(values are data) and **structurally cannot over the 11 code-shaped ones** — which are
exactly the interesting ones.

*Honest caveat:* A's outer state-space enumeration (`reachability.js:8-20`) is hand-written —
it names 4 top-level gate fields literally. So the prover is **semi-derived**, not fully
derived. The witness-synthesis mechanism is genuinely model-derived; the search space is not.

### 2.3 (Not structural, but decisive on quality) A's negation cannot drift; B's can

The *same requirement* on both sides — "free-text identifiers apply on units whose commodity
has **no** specific identifier":

**A** (`commodities/obligations.js:62-78`): `enclosingCommodityNotInUnionOf(TYPED_ANIMAL_IDENTIFIERS)`
— names the four **obligations**; `includesUnion` (`predicate.js:4-10`) dereferences
`obligation.activatedBy.includes` at runtime. The complement is **derived from the positives**
and cannot drift.

**B** (`obligations.js:674-678`):
```js
const noSpecificIdentifier = (code) =>
  !PASSPORT_COMMODITIES.includes(code) && !TATTOO_COMMODITIES.includes(code) &&
  !EAR_TAG_COMMODITIES.includes(code) && !HORSE_NAME_COMMODITIES.includes(code)
```
— hand-restates the four lists. **Add a fifth typed identifier and you must remember to add a
fifth conjunct.** Nothing forces you. Forget, and the free-text fallback silently double-gates
alongside the new field. No test necessarily catches it.

This is **not** structural for B: `allowListed`'s metadata *does* expose `values`, so B could
write `noneOfAllowLists([passport, tattoo, earTag, horseName])` in ~5 lines and derive the
union exactly as A does. **B's model permits the safe form and B didn't take it. A's model
forces it.** That is a genuine, checkable quality win for A's vocabulary design.

---

## 3. Where the prior is CONFIRMED — B is more expressive, and A's ceiling is real

A's vocabulary runs out, and it runs out **on requirements that actually exist in V4**:

1. **No boolean composition.** One `activatedBy.obligation`, one operator
   (`predicate.js:36` + the mutually-exclusive if-chain at `:12-29`). "A=x AND B=y" is
   inexpressible.
2. **No comparison/arithmetic.** Verified: A's one numeric business rule — blocking a species
   count drop below the stored record count — is hand-coded in a controller:
   `consignment-details.controller.js:126-132`, `if (!Number.isInteger(entered) || entered >= records) return []`.
   **It left the model entirely.**
3. **No universal quantifier.** `anyItem` is `entries.some(...)` (`predicate.js:57`); there is
   no `every` path anywhere in the tree.
4. **No conditional mandate.** A's `required` is a **static boolean** (`complete.js:54`), and
   all 15 of A's `activatedBy` carriers also carry `wipeOnExit: true` — so in A,
   *conditional ⇒ scoped ⇒ wiped*. B's Decision carries `inScope` and `status`
   **orthogonally**, so `regionCode` (`obligations.js:190-198`) is always in scope, flips
   mandatory↔optional, and **retains its value** — and B's comment cites this as a V4 spec
   requirement (*"the field itself is not purged on `no`"*). **A cannot express this today.**
5. **No value-legality layer at all.** B has a separate 40-entry domain map (12 `staticEnum`,
   2 `computedEnum`, 17 `predicate`, 9 `addressBlock`). A has nothing — and pays for it: A's
   value domains are written **three times** with nothing checking agreement
   (`origin/obligations.js:15` `equals:'yes'` / `origin/template.njk:42` `value:"yes"` /
   `origin/controller.js:33` `oneOf(…,['yes','no'])`; plus a fourth, unread and
   **differently-cased** `"equals":"Yes"` at `spec/journey-spec.json:600-603`). A typo in a
   gate string **silently de-activates a conditional field and no test fails.**
6. **No reason codes.** B carries `reasons:[{code, explanation}]` on every gate (14 constants),
   doubling as i18n keys. A has zero explainability.

**Crucially, items 4-6 are ADDITIVE for A** (a new key + a branch; a parallel domain map; a
`reasons` key) — they are missing, not impossible, and they belong in the shopping list, not
in an asymmetry table. **Items 1-3 are structural** (see §4).

---

## 4. The asymmetry that is genuinely structural for A

Composition is not "add an operator". `evalPredicate` resolves **one** `activatedBy.obligation`
against **one** frame (`predicate.js:36`, `:64-67`) — frame resolution is a property of the
**gate**, not of each reference. A composed gate whose leaves live at *different* frames has no
single frame to resolve against. Supporting it means making frame resolution **per-reference and
recursive**, which breaks the sibling-identity inference (`predicate.js:65`
`siblings.includes(referencedObligation)`) that is precisely what lets one literal work
unchanged at any depth with no scoping marker. **That inference is the trick that keeps A's
vocabulary thin — composition costs you the trick.**

And arithmetic / dates / ∀ / cross-collection are an *unbounded* set that A's design explicitly
ejects: *"Anything that needs real branching — arithmetic, multi-condition logic, external state
— belongs in a page controller. That is the pressure valve"* (obligation-model.md:139-143).
Every operator A *does* add carries a second tax: `gateValue` (`reachability.js:36-47`) needs a
witness synthesiser per operator, or the reachability pin goes **vacuously green**.

---

## 5. Doc-vs-code hazards (both sides mislead an adopter)

**A — 6 disagreements**, incl. `obligation-model.md:30` "that is the whole vocabulary" (omits
`enforcedAt`, live on 2 obligations, read at `flow/prerequisites.js:11`); "no cross-feature
edge" (there are **3**); `renderOnly` described as runtime behaviour that **no production code
reads** (only `contract.test.js:51`). And A's richer JSON-shaped `spec/journey-spec.json` (2,014
lines, 49 obligations, labels/widgets/values) is **DEAD** — I grepped the whole tree: exactly
**one** hit, a prose mention at `PROVENANCE.md:11`. **Do not credit A with data-shapedness on
the strength of that file.**

**B — 3 disagreements**, incl. `obligations.md:64` "JSON-encodable" vs `:761-768` "nothing is
serialisable"; illustrative JSON at `:206-231` showing `cardinality`/`indexedBy` keys that
**do not exist**; and the "arbitrary depth" claim (`:2819-2827`) that is **false at the helper
level** — `pathPrefix` (`helpers.js:212-215`) slices at the **first** slash, so an
intermediate-level gate silently mis-scopes and **the purge deletes the user's data**.

Plus a live landmine in B: `evaluator.js:471` dereferences `obligation.within.id`
unconditionally in the `field` branch — so the most natural data-only shape
(`{id, name, status:'mandatory'}` at top level) **throws a TypeError**. That hole is *why* 19
obligations are hand-written closures. **B's most common obligation shape is code because of a
bug, not a design choice.**

---

## 6. The shopping list (the actual deliverable)

A third model should take:

| Take | From | Why |
|---|---|---|
| Data-shaped operator core (`equals`/`includes`/`present` + frame modes) | **A** | 100% dumpable; enables the reachability prover |
| **`allOf`/`anyOf`/`not` composition** | *neither* | A's #1 gap; bounded, high-value; must thread frames per-reference |
| `notInUnionOf` (negation **by reference**) | **A** | strictly better than B's hand-restated complement — cannot drift |
| Derived flow-prerequisite graph (`enforcedAt` × flow order) | **A** | 1 authored gate in a 20-page flow |
| Reachability/dead-end prover | **A** | only works on the data-shaped subset — the argument for keeping closures **rare** |
| `applyTo` closure as a **documented escape hatch** | **B** | keep it; make it the exception, and **fail the build if a gate lacks metadata** |
| Orthogonal `inScope` + `status` axes | **B** | kills A's conditional⇒wipe fusion; unlocks retain-value flips |
| `reasons: [{code}]` on every decision | **B** | explainability + i18n keys for free |
| Separate value-legality/domain layer | **B** | kills A's triplicated, unchecked value domains |
| `.metadata` sidecar + `readsFrom`/`reasons` | **B** | 80% of a DSL's introspection at one object literal per factory |
| `coverage.test.js` whitelist discipline | **B** | portable in an afternoon |

**Do not re-litigate the DSL question naively** — `GAPS.md:62-86` shows B built and killed a
declarative `gatedBy`. But note what A proves: a *closed, small* data vocabulary + a controller
escape hatch **does** work for ~15 gates and buys static analysis B can never have. The right
synthesis is **data-first with a metadata-mandatory closure escape hatch**, not one or the other.

---

## 7. Verdict, scored on the MODEL (not on finishedness)

A is further along because a build loop ran on it. **That is excluded from this score.** On the
vocabulary alone:

- **B is more expressive** — it can say anything; A demonstrably cannot say the count-drop rule,
  the retain-value flip, or any conjunction, and those are real V4 requirements.
- **A is more analysable** — 100% of its conditionality is machine-readable and invertible;
  B's is 18% and structurally cannot improve without becoming A.

These are duals. B's expressiveness is *precisely what destroys* its introspectability; A's
introspectability is *precisely what caps* its expressiveness. Anyone who tells you one is
strictly better has not read both. **MIXED**, and the third option is the real answer.
