# L3 adversarial verification — OV-4 (obligation-vocabulary)

**CLAIM:** "A structurally cannot express boolean composition (`A=x AND B=y`). It is not a
matter of adding an operator: `evalPredicate` resolves ONE `activatedBy.obligation` against ONE
frame, and frame resolution is a property of the GATE, not of each reference — so a composed
gate whose leaves live at different frames has no single frame to resolve against. Making frame
resolution per-reference and recursive breaks the sibling-identity inference…"

**VERDICT: REFUTED.**

The quotes are real. The *inference drawn from them is false*. The claim's load-bearing
premise — "frame resolution is a property of the GATE, not of each reference" — is
contradicted by the source it cites. This is failure mode #3 from the brief: **"not built"
dressed up as "cannot be built"**, with a doc's *design policy* re-credited as a *structural
limit* (failure mode #4).

---

## 1. What the cited lines actually say

Verified `engine/evaluate/predicate.js` in full (69 lines):

- `:36` `const referencedObligation = activatedBy.obligation` — **TRUE**, one reference per gate.
- `:12-29` the operator if-chain is mutually exclusive, with no composition node — **TRUE**.
- `:65` `siblings.includes(referencedObligation)` — the sibling-identity inference — **TRUE**.
- `docs/obligation-model.md:139-143` — quote is verbatim and correctly transcribed.

Grepped the whole of `prototypes/standalone/live-animals` for `allOf|anyOf|composition|conjunct|multi-condition`.
**Zero composition nodes exist.** So the *descriptive* half of the claim ("A has no boolean
composition today") stands.

Everything after that fails.

## 2. The premise is false — `frame` IS a property of the reference

`frame` is not a gate-level key sitting *beside* a reference. It is a key of the **same object
literal** that carries `obligation`. Every read confirms this — `predicate.js:38` and `:50`
(`activatedBy.frame`), `complete.js:35` (`subObligation.activatedBy.frame`), `reachability.js:62`,
`:70` (`gate?.frame`). There is **no** site anywhere in the tree that reads `frame` off the
obligation rather than off the `activatedBy` literal.

`DESIGN-DELTA.md:250` shows the shape unambiguously:

```js
{ obligation: commoditySelection, frame: "enclosing", notInUnionOf: [passport, tattoo, earTag, horseName] }
```

`{obligation, frame, operator}` is **one triple**. Today's gate *is* a single reference — so
"frame is a property of the gate, not of each reference" is a distinction without a difference.
The moment you compose, each leaf is its own full triple **carrying its own `frame`**. A composed
gate does not *need* "a single frame to resolve against"; each leaf resolves its own.

## 3. The `frames` stack is the OWNER's context, not the gate's

The claim assumes frame resolution is something the gate supplies. It is not. The third argument
to `evalPredicate` — `frames` — is the **evaluation context of the obligation being scoped**,
handed in by the caller:

- `reconcile.js:13` destructures `frames` from `walk(answers, forest)` — the position of the
  *owning node* in the answer tree.
- `complete.js:37` passes `ctx.frames`, built at `complete.js:72-78` from the entry index.

The gate's `frame` key is a **selector into that stack** (`frames.slice(1)` for `enclosing`,
`frames[0]` for the default). So recursion is well-defined with zero ambiguity: pass the *same*
stack down to every leaf; each leaf's own `frame` key picks its own frame out of it.

## 4. The sibling-identity inference is ALREADY per-reference — recursion cannot break it

`predicate.js:64-67`:

```js
const { framePath, siblings } = frames[0]
const value = siblings.includes(referencedObligation)
  ? valueAt(answers, [...framePath, referencedObligation.id])
  : answers[referencedObligation.id]
```

`siblings` comes from the **context** (`frames[0]`). `referencedObligation` is a **per-reference**
value. The inference is a function of (context, one reference). Evaluate it once per leaf against
the same context and it behaves *identically* — that is what "per-reference" already means. There
is nothing to break.

The whole extension is three lines prepended to `evalPredicate`, with **lines 36–68 untouched**:

```js
if ('allOf' in activatedBy) return activatedBy.allOf.every((leaf) => evalPredicate(leaf, answers, frames))
if ('anyOf' in activatedBy) return activatedBy.anyOf.some((leaf) => evalPredicate(leaf, answers, frames))
if ('not'   in activatedBy) return !evalPredicate(activatedBy.not, answers, frames)
```

## 5. The model has already absorbed a STRICTLY LARGER change than this

`DESIGN-DELTA #3` (inc-031) *added the frame vocabulary itself*: it grew `evalPredicate` "from
two cases to four" (`DESIGN-DELTA.md:21`), **changed `walk` to yield a frames CHAIN instead of a
single `{framePath, siblings}` pair** (`:38-40`), and extended the reachability prover's
`scaffoldFor` to seed `anyItem` and `enclosing` witnesses (`:60-74`). Adding `allOf` touches the
evaluator *less* than that did and touches `walk` **not at all**.

`DESIGN-DELTA.md:261-262` even states the extension rule the model follows: *"existing `frame`
vocabulary (delta #3) unchanged — resolution is the same frame walk, only the value test differs."*
That is precisely how a composition node would land.

Note also: `notInUnionOf` (`predicate.js:20-24`) already takes an **array of obligation
references** and dereferences each one's gate literal via `includesUnion` (`:4-10`). The schema
already admits multi-obligation gate literals.

## 6. A already expresses a large class of conjunctions — via the scope algebra

Two live mechanisms, neither of which the claim engages with:

**(a) Hierarchical AND is built into `reconcile`.** `reconcile.js:16-21`:

```js
if (collectionAncestorKey !== null && !inScope.has(collectionAncestorKey)) continue
```

An item obligation is in scope iff *its collection ancestor is in scope* **AND** its own gate
fires. Every field in `animalIdentifiers` is governed by this conjunction today.

**(b) Value-level AND via scope-chaining + wipe.** `destroyWiped(answers, wiped)` runs on **every**
write (`engine/write.js:14-15`, `:57-58`, `:74-75`), physically deleting out-of-scope `wipeOnExit`
answers. Per L2, **all 15** of A's `activatedBy` carriers set `wipeOnExit: true`. Therefore a gate
on an obligation that is *itself* gated **is** the conjunction of both gates. Concretely,
`import-purpose/obligations.js:3-8`:

```js
purposeInInternalMarket = { activatedBy: { obligation: reasonForImport, equals: 'internalMarket' }, wipeOnExit: true }
```

A gate `{ obligation: purposeInInternalMarket, equals: 'breeding' }` means exactly
`reasonForImport === 'internalMarket' AND purposeInInternalMarket === 'breeding'` — because when
`reasonForImport` flips away, `purposeInInternalMarket` is destroyed and the downstream gate goes
false. This is the standard GDS way to compose ("only ask B when A=x"), and A gets it for free.

The claim's own contrast case is telling: B's `obligations.js:217` `purposeInInternalMarket` reads
another obligation's fulfilment inside a closure — B is **hand-coding what A's scope algebra
derives**.

## 7. What honestly survives

The residue is narrow and it is **additive, not structural**: A cannot today conjoin two
**independent, always-in-scope** obligations (e.g. `countryOfOrigin === 'FR' AND meansOfTransport
=== 'Airplane'`), because there is no scope-dependency chain to carry the conjunction. That is a
real gap. The cost of closing it sits **not in the evaluator** (3 lines) but in the four other
readers that assume one reference per gate:

| Reader | Line | Work |
|---|---|---|
| `complete.js` | `:24` `subObligation.activatedBy?.obligation` | route through `evalPredicate` — a *simplification*, it currently duplicates frame logic |
| `analysis/reachability.js` | `:31` `orphanedRootIds` | walk leaves instead of one reference |
| `analysis/reachability.js` | `:36-47` `gateValue` | witness synthesiser per composition node |
| `analysis/reachability.js` | `:58-77` `scaffoldFor` | seed every leaf; detect UNSAT `allOf` (two leaves constraining the same obligation) |

The reachability prover is the genuine tax — and it is the *same* tax L2 §4 already names for any
new operator. **`allOf` is bounded, decidable and invertible** (unlike arithmetic), so it is the
one composition primitive that does **not** cost A its analysability. That is an argument *for*
adding it, not against.

## 8. The doc does not say what the claim says it says

`obligation-model.md:139-143` — *"The vocabulary is deliberately small… Anything that needs real
branching… belongs in a page controller. That is the pressure valve"* — is a statement of **policy
about what the authors refuse to express**, not of structural impossibility. "Deliberately small"
is the opposite of "cannot grow". Tellingly, **`docs/limits.md` — A's own honest-limits page, which
enumerates seven real ceilings — does not list boolean composition at all.**

## 9. Knock-on for L2

`L2-obligation-vocabulary.md` **contradicts itself** on this point and should be reconciled: §4
calls composition "genuinely structural for A", while §6's shopping list calls it "A's #1 gap;
**bounded**, high-value". §6 is right; §4 is wrong. §3 item 1 ("No boolean composition… is
inexpressible") should move out of the CONFIRMED-asymmetry list and into the additive shopping
list alongside items 4–6.

---

## Search log

- `grep -rn "activatedBy"` across the whole prototype → 27 files; read every engine/analysis/flow
  reader.
- `grep -rni "allOf|anyOf|allAnswered|composition|conjunct|multi-condition"` → 5 hits, all prose,
  **no composition node**.
- Read in full: `engine/evaluate/predicate.js`, `engine/evaluate/reconcile.js`,
  `engine/evaluate/complete.js`, `analysis/reachability.js`, `docs/limits.md`.
- Read: `docs/obligation-model.md:100-160`, `DESIGN-DELTA.md` (frame + notInUnionOf entries).
- Read all 6 feature obligation files: `origin`, `import-purpose`, `transport`, `commodities`,
  `cph-number`, `additional-details`.
- `grep -rn "wiped"` in `engine/` → confirmed `destroyWiped` runs on every write path.
