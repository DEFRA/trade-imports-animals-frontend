# L3 adversarial verification — OV-2 (obligation-vocabulary)

(An earlier file at this path verified a different claim ("C2", A's reachability prover);
it is preserved at `state/scratch/L3-obligation-vocabulary-2-prior-C2.md`.)

**Claim under test (OV-2):** A's conditionality is 100% data and genuinely closure-free — 15
`activatedBy` gates over a closed 4-operator set (`equals` / `includes` / `notInUnionOf` / `present`)
with 3 frame modes; no obligation anywhere carries a function; grepping `=>` across the 12
`features/*/obligations.js` returns exactly two hits, both module-load factories returning literals.

**VERDICT: AMENDED.** Every counted sub-claim is exactly right, to the digit. The headline sentence —
"A's conditionality is 100% data and genuinely closure-free" — is not, because A has a *used*,
*documented* closure escape hatch for conditionality one layer up, at the page/section gate. The
attached caveat ("you cannot load it") also over-reaches.

All paths below are relative to `clone-live-animals/prototypes/standalone/live-animals/`.

---

## 1. What I verified — all true

**The operator set is closed and enforced in one place.** `engine/evaluate/predicate.js:12-29`
(`applyPredicate`) is an if-chain over exactly `equals` (:13), `includes` (:14-19), `notInUnionOf`
(:20-24), `present` (:25), and `throw new Error('Unknown activation predicate: …')` on anything else
(:26-28). Frame modes: `'enclosing'` (:38-48), `'anyItem'` (:50-62), and the default same-frame /
root fallthrough (:64-68) = 3. `activatedBy.obligation` at :36. Quote is real and means what the
claim says.

**Exactly two `=>` in the obligation files.** `grep -rn "=>" --include=obligations.js features/`
returns 2 hits, both in `features/commodities/obligations.js`:
`:25 const enclosingCommodity = (includes) => ({ obligation: commoditySelection, frame: 'enclosing', includes })`
and `:62 const enclosingCommodityNotInUnionOf = (obligations) => ({ … notInUnionOf: obligations })`.
Both are invoked at module load; both return a plain object; neither is stored on an obligation.

**12 obligations.js files**, and `registry.js:1-28` composes the whole model from exactly those 12 —
no obligations are declared anywhere else.

**15 `activatedBy` carriers; tally 4 / 9 / 2 / 0 confirmed** (I read all 12 files and counted):
- `equals` (4): `import-purpose:6`, `origin:15`, `transport:32` (commercialTransporter), `transport:42` (privateTransporter).
- `includes` (9): `transport:20` (transitedCountries), `additional-details:9`, `cph-number:7`, `commodities:13` (numberOfPackages), `commodities:33/39/45/51/83` (the five `enclosingCommodity(...)` calls).
- `notInUnionOf` (2): `commodities:70`, `:76`.
- `present` (0) — appears only in `engine/evaluate/cross-frame.test.js:330,342`. It is **dead vocabulary** in the real model; the used operator set is 3, not 4.

**No obligation carries a function, and the engine could not invoke one if it did.**
`grep -rn "typeof" engine/ features/ flow/` returns three hits, all `typeof … === 'string'` on path
segments (`engine/status.js:11`, `engine/evaluate/collection-view.js:7`,
`engine/evaluate/cardinality.js:6`). There is no `typeof … === 'function'` anywhere — no invocation
site exists. `grep -rno "obligation\.[a-zA-Z]*" engine/` yields only `.activatedBy`, `.wipeOnExit`,
`.item`, `.requiredOneOf`, `.requiredAtLeastOne`, `.id`, `.maxEntriesFrom`. Reading all 12 files, the
complete obligation key set is `id`, `required`, `enforcedAt`, `activatedBy`, `wipeOnExit`,
`collection`, `item`, `requiredAtLeastOne`, `requiredOneOf`, `maxEntriesFrom` — every one a scalar,
array, or object reference.

**The caveat's identity facts are real.** `predicate.js:65` `siblings.includes(referencedObligation)`
and `complete.js:26` `siblings.includes(referencedObligation)` both test object identity;
`includesUnion` (`predicate.js:4-10`) reaches through `notInUnionOf[]` entries into
`obligation.activatedBy.includes`, so `notInUnionOf` holds obligation **objects**, not ids.

---

## 2. The counter-example — why this is AMENDED and not CONFIRMED

**`flow/gates.js:22-30` gives every page and section an arbitrary-JS gate escape hatch, and it is used.**

```js
export const pageGatePasses = (page, scope) => {
  if (page.gate) return page.gate(scope)        // gates.js:23
  …derived: prerequisites + inScopeReachable
}
export const sectionGatePasses = (section, scope) => {
  if (section.gate) return section.gate(scope)  // gates.js:30
  …
}
```

Any page or section may carry a closure that pre-empts the derived, data-driven gate entirely.
`grep -rn "gate:" --include=*.js` over the whole tree returns exactly one production use —
**`flow/flow.js:72`, on the `review` section: `gate: (scope) => scope.readyForCheckYourAnswers`**
(plus two synthetic gates in `flow/gates.test.js:18,21`).

A's own docs own this: `DESIGN-DELTA.md:184-199` is headed *"The `review` authored gate"* and states
the section is held by `gate: (scope) => scope.readyForCheckYourAnswers`. So it is a **documented,
deliberate escape hatch** — structurally the same thing L2 credits to B's `applyTo` closures, just
attached to a section rather than an obligation, which is why the obligations-file grep stays clean.

**And the escape hatch exists precisely because the vocabulary structurally cannot express the
condition.** `readyForCheckYourAnswers` (`flow/section-status.js:11`) is a derived aggregate over
every in-scope obligation's completeness. `activatedBy` can only compare **one** referenced
obligation's answer against a literal. Two further hard limits, both verified in the source:

- **No conjunction, disjunction or negation-in-general.** `applyPredicate` is a first-match if-chain
  (`predicate.js:13-25`): an `activatedBy` carrying both `equals` and `includes` silently evaluates
  only `equals`. There is no `allOf` / `anyOf` / `not`, and no way to gate on two different
  obligations at once. `notInUnionOf` is the one special-cased negation, and even it is
  negation-by-reference-to-other-gates, not a general `not`.
- **No numeric or ordinal comparison** (`gt` / `lt` / `between`) and no count predicate — despite the
  model already holding count obligations (`numberOfAnimalsQuantity`, consumed by `maxEntriesFrom` at
  `engine/evaluate/cardinality.js:22`).

So the honest reading is that **A is data-first with a closure escape hatch at the flow layer** —
which is exactly the L2 synthesis, not evidence that a closure-free model suffices. Everything A's 4
operators could not say, A said in JavaScript.

---

## 3. Three secondary corrections

**(a) "Plain literals" is true at rest, but they are not authored inline.** The `includes` payloads
are constant arrays in `services/commodities/stub.js`, exported through getters
(`services/commodities/index.js:53-69`, e.g. `packageCountCommodities = () => PACKAGE_COUNT_COMMODITIES`)
and pulled in at module load (`features/commodities/obligations.js:15,33,39,45,51,83`;
`features/additional-details/obligations.js:12`; `features/cph-number/obligations.js:9`). The stored
value is a plain string array, so the claim survives — but authoring this model as pure data would
require inlining those commodity sets or a `$ref`-style indirection, and if the sets ever came from a
live reference-data call the gate values would become async.

**(b) The caveat "you can dump A's model; you cannot load it" over-reaches — this is *not built*, not
*cannot be built*.** Every obligation has a globally-unique `id`, and `registry.js:30` already builds
`byIdMap = new Map(all.map(o => [o.id, o]))`, exported as `registry.byId` (:79). Every
identity-resolved reference (`activatedBy.obligation`, `maxEntriesFrom`, `notInUnionOf[]`) is an
object that *has* an id. A rehydrator (parse JSON → resolve `id` → object via `byId`) is ~20 lines of
plumbing. Nothing structural blocks a round-trip. The defensible statement is: *A's model as written
is not directly JSON-loadable — references are object identities and no rehydration pass exists.*
That is a gap, not a limit. (Related: `spec/journey-spec.json` is loaded by nothing —
`grep -rn "journey-spec" --include=*.js` returns zero hits. It is an authoring artefact, not a
runtime source, so A is code-authored today with the JSON spec sitting beside it.)

**(c) The closed operator set leaks out of the engine.**
`features/commodities/animal-identification.controller.js:43,68,132` reads
`obligation.activatedBy.includes.includes(commodity)` and
`includesUnion(obligation.activatedBy.notInUnionOf)` **directly**, bypassing `applyPredicate`. So
`predicate.js` is not the only place that knows the operator set: adding a 5th operator would require
edits in a feature controller too. Closure-free, yes; fully encapsulated, no.

---

## 4. What I searched

- `grep -rn "=>" --include=obligations.js features/` → 2 hits (the two factories). Confirmed.
- `find features -name obligations.js` → 12 files; read all 12 in full.
- `grep -rn "activatedBy" --include=obligations.js features/` → 15 carriers; operators tallied by hand → 4/9/2/0.
- `grep -rn "typeof" engine/ features/ flow/` → no `=== 'function'`; no obligation-function call site anywhere.
- `grep -rno "obligation\.[a-zA-Z]*" engine/` → only data keys.
- `grep -rn "gate:" --include=*.js .` → **the counter-example**: `flow/flow.js:72`.
- Read `flow/gates.js`, `flow/prerequisites.js`, `flow/flow.js`, `flow/entry-guard.js`, `registry.js`,
  `services/commodities/index.js`, `engine/evaluate/complete.js` (:24-42), and the gate sections of
  `DESIGN-DELTA.md`.
- `grep -rn "journey-spec" --include=*.js .` → zero — the JSON spec is never loaded at runtime.

## 5. Shopping-list implication

Do not carry "A proves you can be closure-free" into the third option. A proves the *opposite of the
strong version*: with a 3-operator working vocabulary you get 15/16 gates as data and **one** gate
that must be a closure. The synthesis is data-first with a **metadata-carrying** escape hatch — and
the immediate cheap wins for A's vocabulary are (i) `allOf`/`anyOf` composition, (ii) a
derived/aggregate predicate so `readyForCheckYourAnswers` stops being JS, and (iii) id-based
references + a rehydrator so the model actually round-trips.
