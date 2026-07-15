# L3 adversarial verification — EE-3 (evaluation-engine)

**CLAIM:** A's gate set is statically analysable and B's *structurally* is not. A can invert a
gate and prove reachability; B cannot, because `branchedGate` omits its predicate, its predicate
takes the whole fulfilments map so "there is no finite domain to brute-force even if exposed",
and `allowListedByPredicate` is testable-but-not-enumerable. Punchline: *"a MODEL win for A, not
a build-loop artefact — B did not fail to write a prover for want of effort."*

**VERDICT: REFUTED.**

The claim's factual citations are all real. Its **central assertion — the structural
impossibility, and the explicit denial that this is a build-loop artefact — is false.** It is a
textbook instance of method failure-mode #3: conflating *not built* with *cannot be built*. It
also credits a doc (`GAPS.md`) with saying something it does not say, and misses that **B
declares the very finite domain the claim says B lacks.**

---

## 1. What checks out

| Cited | Status |
|---|---|
| `engine/evaluate/predicate.js:4-10, :12-29` — operator bodies are readable data over a closed 4-op vocabulary (`equals`, `includes`, `notInUnionOf`, `present`) | **TRUE** |
| `analysis/reachability.js` — 215 LOC, exists | **TRUE** |
| `reachability.js:174` — reconciles the witness journey with the *real* `reconcile` | **TRUE** |
| `reachability.test.js:25-27, :29-39, :61-75` — runs as a test, and has *teeth* (negative/mutation cases prove it bites) | **TRUE** — a genuinely good asset |
| `helpers.js:135-139` — `branchedGate` metadata is `{type, whenTrue, whenFalse}`; predicate omitted | **TRUE** |
| `helpers.js:88` — `allowListedByPredicate` exposes `predicate` | **TRUE** |
| 9 of 19 conditional obligations are `branchedGate`-scoped | **TRUE** — 6 call sites (`obligations.js:193, 216, 282, 296, 337`, plus `accompanyingDocumentBlockApplyTo:754` shared by 4) |

So the claim is well-sourced. It is the *inference* from those sources that collapses.

---

## 2. Refutation 1 — **not one** of B's gates is an "arbitrary JS closure over the whole state"

I read every `branchedGate` predicate in B's manifest. Every single one is a **single-obligation
equals / includes / present** — each directly expressible in A's closed 4-operator vocabulary:

| B obligation | `branchedGate` predicate (`obligations.js`) | A's equivalent literal |
|---|---|---|
| `regionCode` | `:194` `f[regionCodeRequirement.id] === 'yes'` | `{obligation, equals: 'yes'}` |
| `purposeInInternalMarket` | `:217` `f[reasonForImport.id] === 'internal-market'` | `{obligation, equals: …}` |
| `commercialTransporter` | `:283` `f[transporterType.id] === 'commercial'` | `{obligation, equals: 'Commercial'}` |
| `privateTransporter` | `:297` `f[transporterType.id] === 'private'` | `{obligation, equals: 'Private'}` |
| `transitedCountries` | `:338-339` `LAND_TRANSPORT_MODES.includes(f[meansOfTransport.id])` | `{obligation, includes: ['Railway','Road Vehicle']}` |
| accompanying-doc block (×4) | `:751-752` `isFilled(f[accompanyingDocumentType.id])` | `{obligation, present: true}` |

The last one is the kicker: the claim's own worst case — the "cross-sibling all-or-nothing block"
that B's docs advertise as *"a plain closure predicate referencing all siblings"*
(`obligations.md:525`) — **does not actually reference all siblings.** `documentTypePresent`
reads exactly one obligation. The comment at `obligations.js:746-750` explains why (audit finding
#15). B's most "arbitrary" closure is A's `present` operator.

Full manifest census (`grep -n "applyTo:" obligations/obligations.js`): ~19 unconditional
`() => ({inScope:true, …})`, 6 `allowListed`, 2 `allowListedByPredicate`, 2 `anyAllowListed`, 9
`branchedGate`. **Zero custom one-off *conditional* applyTos.** The escape hatch the claim is
built on is, in the real model, entirely unused.

"An arbitrary JS closure over the whole state is not invertible" is true as computer science and
**vacuous as a statement about B's model.**

---

## 3. Refutation 2 — B **declares** the finite domain the claim says does not exist

> *"branchedGate's predicate takes the whole fulfilments map so there is no finite domain to
> brute-force even if exposed."*

**False.** B has a domain layer that declares, per obligation, the legal value set as **data**
(`domain/index.js:134-142`: `staticEnum(options)` → `entry.metadata = {shape:'staticEnum',
options}`). Every gate obligation B actually gates on has one:

- `commodityCodeDomain = staticEnum(COMMODITY_OPTIONS)` — `:616` (the gate for all 8 `allowListed`/`allowListedByPredicate` obligations)
- `reasonForImportDomain` `:342` · `transporterTypeDomain` `:400` · `meansOfTransportDomain` `:511` · `regionCodeRequirementDomain` `:419` · `accompanyingDocumentTypeDomain` `:667`

That is a finite, declared, statically-readable candidate set for **every gate in the model**.

And it demolishes the `allowListedByPredicate` sub-claim (*"a candidate can be TESTED but the
admitting set cannot be ENUMERATED"*). Testable predicate **+** declared finite domain **=**
enumerable admitting set, by one line:

```js
COMMODITY_OPTIONS.filter(noSpecificIdentifier)   // the exact admitting set
```

**The irony is total.** I grepped A's engine for `options|choices|enum` — **zero hits.** A's
obligation literal is `{id, required, activatedBy, wipeOnExit}` (`features/transport/obligations.js:17-25`)
with **no value-domain declaration anywhere.** The finite-domain enumeration the claim says B
structurally lacks is a thing **B has and A does not.**

---

## 4. Refutation 3 — A's prover is itself substantially hand-maintained

The claim sells `reachability.js` as "enumerate the gate graph, invert a gate, prove
reachability". Reading it, the derivation is partial:

- **`enumerateScopeStates()` (`:8-20`) is hardcoded** — a 24-state cross-product over 4
  hand-named obligations with hand-typed literals (`'Road Vehicle'`, `'Commercial'`, `'Private'`,
  `'internalMarket'`). Not derived from the gate graph. `reachability.test.js:22` pins the
  literal `24`. Because A has no domain layer (§3), it **cannot** derive these — so it types them out.
- **The inverter is not wired at root level.** `gateValue()` (`:36-47`) genuinely inverts — but
  `scaffoldFor` only calls it when `inItem` is true (`:59`), and `inItem` starts `false` (`:54`)
  and flips only on descent into a collection item (`:84`). So **root-level same-frame gates are
  never inverted**; they are covered by the hardcoded cross-product.
- **`submitReadySeed` (`:95-157`) is a 60-line hand-written canned answer blob.**

A's prover is *real and valuable* — fail-loud, with teeth. But it is "partial inversion for
nested gates + a hand-maintained brute force for root gates", not "a tool that enumerates the
gate graph". Add a 5th root gate and someone hand-edits `enumerateScopeStates`.

---

## 5. Refutation 4 — the claim credits a doc that says the opposite, from the wrong repo

Two problems with *"GAPS.md enshrines the opacity"*.

**(a) Wrong codebase.** `GAPS.md` does not exist in the flow-layer spike that owns `helpers.js`.
It lives in **`prototypes/model-spikes/obligations-v4-model/GAPS.md`** — B's *other*, earlier
spike. The claim cites it as if it governed the code it does not sit beside.

**(b) It says the opposite.** The quoted line, `GAPS.md:86` — *"Custom one-off applyTos just omit
metadata"* — is scoped to **custom one-off** applyTos. Twenty-six lines earlier, `GAPS.md:59-60`
states the actual contract:

> *"Each helper returns a pure applyTo function with `.metadata` attached for optional
> introspection / cross-language export."*

`branchedGate` **is a helper.** By B's own documented contract it is *supposed* to carry complete
metadata. And B's manifest contains **zero custom one-off conditional applyTos** (§2), so the
opacity clause bites nothing. The doc does not enshrine the opacity; the doc is **violated** by it.

---

## 6. Refutation 5 — "deliberately omits" is false, and B already ships the tooling substrate

The claim insists the omission is a design decision. B's own source says it is **unfinished work**:

- **B's own test comment** (`sketches.test.js:122-123`): *"purposeInInternalMarket uses
  branchedGate; **metadata should carry the branch predicate description**."* The assertion beneath
  it is a stub — `expect(row.scope.type ?? row.scope.kind).toBeDefined()`. That is a TODO, not a
  design stance.
- **`helpers.js:16-19`** (the file's design contract): metadata *"Enables optional static
  introspection / cross-language export **without giving up the imperative-JS surface**."*
  Static introspection is the *stated purpose*.
- **`allowListedByPredicate` already exposes `predicate`** (`:88`) — the precedent exists, in the
  same file, 47 lines up.
- **B already has the "declare your inputs" idiom**: `computedEnum(fn, readsFrom)`
  (`domain/index.js:148-154`) attaches `readsFrom` naming the siblings a closure inspects —
  exactly the mechanism the L2 shopping list proposes inventing.
- **B already ships a static-introspection tool**: `data-dictionary-sketch.js` walks the whole
  manifest reading `applyTo.metadata` (`:31-36`) and emits a JSON view, with
  `sketches.test.js` covering it.

The fix to `branchedGate` is **one word**:

```js
fn.metadata = { type: 'branchedGate', predicate, whenTrue, whenFalse }
```

A capability the model would happily accept, whose substrate is already built, that nobody wired
up, is **not a structural limitation.** B did not write a reachability prover because B is a
*model spike* and nobody pointed a build loop at it. That is the definition of a build-loop
artefact — which is precisely what the claim's punchline denies.

---

## 7. What survives

A real but **much smaller and non-structural** difference:

- A's gates are machine-readable **today, at zero cost** — the literal *is* the data.
- B's are machine-readable **after a one-word `branchedGate` fix**, and its enumerator must
  brute-force each gate obligation's declared `staticEnum` domain rather than read an admitting
  set straight off the literal.
- A has **actually built** the prover; B has built the metadata substrate and a data-dictionary,
  but not a prover.

That is a difference in *what was built* and in *directness*, not in *what can be expressed*.
And it is offset by B holding the finite value-domain declaration (§3) that A's prover has to
hardcode for want of.

**For the third option:** the claim's supposed conflict — "B's expressiveness costs you A's
analysability" — is **not real on the evidence**. Both properties are available simultaneously,
and cheaply: keep B's helper vocabulary, complete the metadata contract B already wrote down
(`predicate` on `branchedGate`; `readsFrom` on any genuine one-off), keep B's `staticEnum` domain
declarations, and port A's `reachability.js` on top — sourcing candidate values from the domain
enums instead of A's hardcoded `enumerateScopeStates`. The port would be *better* than A's
original, because the witness search would finally be derived from the model.

---

## Search log

- Read `analysis/reachability.js` (all 215 lines) + `analysis/reachability.test.js`.
- Read `engine/evaluate/predicate.js` (all 69 lines).
- Read `obligations/helpers.js` (all 215 lines).
- `grep -rn "branchedGate"` across the whole flow-layer spike → located all 6 call sites; read
  `obligations.js:180-360` and `:640-790`.
- `grep -n "applyTo:"` on `obligations/obligations.js` → full manifest census (39 sites).
- `grep -n "staticEnum|readsFrom|options|computedEnum"` on `domain/index.js` → found the declared
  finite domain for every gate obligation.
- Read `data-dictionary-sketch.js` (all 99 lines) — B's existing static-introspection tool.
- Read `sketches.test.js:95-155` — found the "metadata should carry the branch predicate" TODO.
- `find` for `GAPS.md` → **not in the flow-layer spike**; read `obligations-v4-model/GAPS.md:55-99`.
- `grep -rln "options|choices|enum"` on A's `engine/` → **zero hits**; read
  `features/transport/obligations.js` → A's literal carries no value domain.
