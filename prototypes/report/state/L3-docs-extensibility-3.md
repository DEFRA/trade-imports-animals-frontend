# L3 adversarial verification — DE-3 (docs-extensibility)

**Claim under test.** Only 8 of B's 39 `applyTo` gates (21%) are fully introspectable as data.
18 are bare closures reported as `{kind:'custom-applyTo'}`. The shape B uses for the canonical
conditionally-required field — `branchedGate` — has a metadata sidecar recording the branch
OUTCOMES but not the PREDICATE, so B's data dictionary can tell a stakeholder THAT a field is
conditionally mandatory but **not WHAT the condition is**.

**VERDICT: AMENDED.** The `branchedGate` mechanism is real and verbatim. The counts are wrong,
the denominator conflates constants with gates, and the punchline — the "so…" clause the whole
claim is built toward — is **false at source**.

*(This file replaces an earlier pass at DE-3 that was itself partly wrong; §4 corrects it.)*

---

## 1. What I verified at the cited lines

| Cited | Holds? | Detail |
|---|---|---|
| `helpers.js:135-139` — `branchedGate` metadata is `{type, whenTrue, whenFalse}`, no predicate | **YES** | Verbatim. The `predicate` arg is closed over at `:133-134` and never surfaced. No gate-obligation id either. |
| `data-dictionary-sketch.js:34` — `{kind:'custom-applyTo'}` when no metadata | **YES** | Verbatim. |
| `helpers.js:88` — `allowListedByPredicate` "exposes only a function" | **NO — understated** | Metadata is `{type, obligation, predicate, projection, reasons}` (`:80-91`). It carries the **gate obligation's id** — a machine-readable dependency edge — plus reasons. See §5. |
| `GAPS.md:62-86` — trade acknowledged | **YES, but mislocated** | GAPS.md lives in `prototypes/model-spikes/obligations-v4-model/`, **not** the flow-layer spike. Content confirms: both shapes were prototyped (`c79fbd0` gatedBy, `a17a9a1` applyTo) and applyTo won on five stated grounds. A considered trade, not an oversight. |
| `obligations.md:759` "Trade-off accepted" | **YES, and stronger than credited** | B *explicitly disclaims* serialisability: "Neither the obligations data nor the evaluators are JSON-portable as-shipped… Nothing about the current shape is serialisable." The claim's implicit "doc promises X, code delivers Y" framing does not apply — the doc is candid. |
| "39 `applyTo`", "18 bare closures" | **NO — both wrong** | See §2. |

## 2. The counts, re-derived

`grep -c "applyTo:"` returns 39, but line 722 is a **comment** (`// Four fields sharing a single applyTo:`).
There are **38** real `applyTo:` property definitions.

| Shape | Count | Metadata? | Gate-obligation id as data? | Condition as data? |
|---|---|---|---|---|
| bare closure `() => ({inScope:true, status:…})` | **19** | none → `custom-applyTo` | n/a — **there is no condition** | n/a |
| `allowListed` | 6 | yes | YES (`obligation`) | YES (`values`) |
| `anyAllowListed` | 2 | yes | YES | YES (`values`) |
| `allowListedByPredicate` | 2 | yes | **YES** (`obligation`) | no — opaque fn (but see §5) |
| `branchedGate` | **9** | yes | **NO** | prose only (see §3) |

Two corrections of substance:

- **19 bare closures, not 18.**
- **`branchedGate` is used by 9 obligations, not 5.** The claim counted only the inline uses
  (`:193, :216, :282, :296, :337`) and missed `accompanyingDocumentBlockApplyTo` (`:754-762`) —
  itself a `branchedGate`, shared by four obligations at `:767, :773, :779, :785`. So the
  canonical all-or-nothing block is *also* metadata-carrying; the claim's classification
  silently drops it into the opaque bucket.

**The denominator is the deeper error.** The 19 bare closures are not gates. They are
`() => ({ inScope: true, status: 'mandatory' })` — the *null gate*, written the long way.
Counting them as un-introspectable "gates" is what produces the 21% figure. Of the **19 genuine
conditional gates**, **8 are fully declarative (42%)**, not 21%.

## 3. The punchline is REFUTED — the dictionary *does* state the condition

Every one of the 9 `branchedGate` obligations puts a `reasons` array inside its `whenTrue`
decision — and `whenTrue` **is** in the metadata sidecar. The reason objects
(`obligations.js:54-139`) each carry an `explanation`:

```js
const commercialTransporterReason = {
  code: 'obligation.commercialTransporter.applicable.becauseCommercial',
  explanation: 'commercialTransporter applies when transporterType is commercial'
}
```

`data-dictionary-sketch.js:31-36` (`scopeShape`) returns `meta` **verbatim**. So `buildDictionary()`
emits, for `commercialTransporter`:

```
scope: { type: 'branchedGate',
         whenTrue: { inScope: true, status: 'mandatory',
                     reasons: [{ code: 'obligation.commercialTransporter.applicable.becauseCommercial',
                                 explanation: 'commercialTransporter applies when transporterType is commercial' }] },
         whenFalse: { inScope: false } }
```

That is **exactly WHAT the condition is**, in English, for a stakeholder. Coverage is 9/9 — no
`branchedGate` in the manifest lacks a reason: `regionCode` ("mandatory when regionCodeRequirement
is yes", `:56`), `purposeInInternalMarket` (`:60-62`), `privateTransporter` (`:72-73`),
`transitedCountries` ("applies when meansOfTransport is railway or road-vehicle", `:76-80`),
and the accompanying-document block ("mandatory once a document type is selected", `:135-139`).
`data-dictionary-sketch.js:9-10` advertises precisely this — reason-codes surfaced "so a
stakeholder can spot which failure codes are declared **without reading a closure**".

The claim's inference — *no predicate in metadata ⇒ the dictionary cannot say what the condition
is* — **does not hold**. The predicate is absent; the *condition* is present, as prose.

## 4. Correcting the earlier DE-3 pass (which I overwrote)

The previous pass asserted the 19 constants could be deleted "with **zero model change**",
citing `evaluator.js:176`. **That is wrong, and I checked it.**

- `evaluator.js:453-454` — category `'single'` (a notification-level scalar) returns
  `own ?? { inScope: true }`, where `own` is the **applyTo decision**.
- `obligation.status` is read at **only** `:477`, `:490`, `:505` — the `'field'`,
  `'derived-leaf'` and `'user-leaf'` branches, all of which are record-bearing.
- So for a notification-level scalar, the bare closure is the **only channel** by which
  `status: 'mandatory'` reaches the implication. Delete it and the field silently loses its
  mandatory-ness.
- Worse: `classifyObligations` `:176` (`o.status !== undefined && !o.applyTo`) would route such
  an obligation to `'field'`, whose branch dereferences `obligation.within.id` (`:471`) — and a
  notification-level scalar has no `within`. **It would throw.**

The fix is small (make `'single'` fall back to `obligation.status`), but it is an **evaluator
change**, not free. Worth naming so nobody scopes this as zero-cost.

The previous pass also claimed `explanation` appears "only in obligations.js and obligations.md".
False — it is also in `helpers.test.js`, `evaluator.test.js` (`:57-139`, which pin reasons flowing
through the evaluator), `domain/index.js` and `domain/index.test.js`.

## 5. Counter-example hunt — the metadata is load-bearing, not a docs sketch

I searched for every consumer of `applyTo.metadata`. It is **not** confined to the dictionary
sketch — two production controllers read it:

- `features/commodity-lines/controller.js:110-117`
- `features/units/controller.js:204-214`

Both read the metadata "rather than executing the applyTo closure", using `values` /
`predicate` to decide whether a fresh line's commodity code opens an obligation. So
`allowListedByPredicate.metadata.predicate` is a deliberately-exposed, runtime-consumed
introspection surface — the claim's "exposes only a function" reads as a deficiency when it is
in fact the feature. This is the strongest evidence against the claim's framing.

## 6. "Not built" vs "cannot be built" — the claim fails this test

The missing predicate metadata is **plumbing, not a structural limit**:

- `helpers.js:147-153` already ships `matches(gateObligation, value)` **with**
  `metadata = {type:'matches', obligation, value}` — fully declarative, unit-tested
  (`helpers.test.js`), and **used nowhere in the manifest**. A dead declarative helper.
- Meanwhile **4 of the 5 inline `branchedGate` predicates are literally
  `fulfilments[X.id] === 'literal'`** (`:194, :217, :283, :297`) — i.e. `matches` in disguise —
  and the fifth is `LAND_TRANSPORT_MODES.includes(fulfilments[meansOfTransport.id])` (`:338-339`).

Give predicates a `.metadata` and have `branchedGate` spread `predicate.metadata` into its own,
and every `branchedGate` becomes fully introspectable. **Nothing in B's model resists this.**

## 7. What survives — the narrower, defensible defect

1. **No machine-readable dependency edge for the 9 `branchedGate` gates.**
   `allowListed.metadata.obligation` lets you compute "what does `commodityCode` gate?" from
   data. `branchedGate.metadata` has no such field. So the stated purpose of the sidecar
   (`helpers.js:16-19`: *"static introspection / cross-language export"*) is **unmet for
   `branchedGate`** — an impact graph or a non-JS export would have to parse English or execute
   closures. This is the real asymmetry, and it is about **machines**, not stakeholders.
2. **The condition is prose, and nothing tests it.** No test asserts `explanation` agrees with
   `predicate`. `sketches.test.js:118-125` is titled "surfaces obligation scope shape from
   applyTo.metadata", comments *"metadata should carry the branch predicate description"* — and
   then asserts only `expect(row.scope.type ?? row.scope.kind).toBeDefined()`. **B's own test
   does not pin the thing it claims to pin.** A stale explanation is a lie told with confidence.
3. **The dictionary cannot distinguish "unconditional" from "unanalysable".** All 19 constants
   report as `custom-applyTo`, identical to a genuinely opaque one-off. `scopeShape` cannot tell
   a constant closure from a conditional one without executing it. Real, and worth fixing.

## 8. Effect on the L2 verdict

The shopping-list item ("A's closed operator vocabulary should replace B's `applyTo` closures")
is **not** justified at the strength L2 claims. The honest version is smaller and cheaper:

> **B needs (i) predicate metadata plumbed through `branchedGate` (reuse the already-shipped,
> already-dead `matches` helper), (ii) retirement of the 19 constant closures plus the ~2-line
> evaluator change that makes `'single'` honour `obligation.status`, (iii) a test asserting
> `explanation` ⟷ predicate agreement.**

That buys ~100% static introspectability **without** replacing B's gate mechanism — which B
chose deliberately, after prototyping the DSL, for reasons (`GAPS.md:62-86`) that A's model does
not answer (cross-sibling name resolution at call time; obligation-level testability with no
evaluator).

The residual asymmetry in A's favour is real but narrow: **A's gates are total and enumerable by
construction; B's are enumerable only where someone remembered to use a helper.** That is a
discipline gap, not a capability gap.
