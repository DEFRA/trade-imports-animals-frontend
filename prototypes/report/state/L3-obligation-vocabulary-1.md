# L3 adversarial verification — OV-1 (obligation-vocabulary)

**Claim under test (OV-1):** B's conditionality is mostly unreadable as data — only 8 of 44
obligations (18%) have a fully JSON-serialisable scope declaration; the 9 `branchedGate`
obligations omit the predicate, `allowListedByPredicate` (2) embeds a live fn, and 19 are bare
closures with no metadata.

**Verdict: AMENDED.**

Every cited fact is real and every number is exactly right — I recounted all of them
independently. What does not survive is the **framing**. The denominator (44) is stuffed with 25
obligations that carry **no conditionality at all**, and two of the three "opacity" buckets are
*not built* rather than *cannot be built* — one of them is a **workaround for an evaluator bug**
that a two-line guard would remove.

---

## 1. Cited evidence — all verified TRUE

| Cited | Verified |
|---|---|
| `helpers.js:135-139` — `branchedGate` metadata is `{type, whenTrue, whenFalse}`, predicate omitted | **TRUE**, verbatim |
| `helpers.js:80-91` — `allowListedByPredicate` puts a live `predicate` fn in `.metadata` | **TRUE** (and the comment at `:83-87` says the exposure is *deliberate*) |
| `grep -c "applyTo: () => ({ inScope: true"` = **19** | **TRUE** — re-ran, exactly 19 |
| `obligations.js:415` — `within` is an object reference | **TRUE** |
| `obligations.js:581-593` — `requires.anyOf` is a lazy getter returning object refs | **TRUE** |
| `data-dictionary-sketch.js:31-36` — metadata-less `applyTo` ⇒ `{kind:'custom-applyTo'}` | **TRUE** |
| `obligations.md:761-768` vs `:62-64` | **TRUE** as quoted — but the charge is overstated (§5) |

Independent census of the manifest (`obligations.js:793-838`, **44** entries):

| Shape | n | Scope declaration readable as JSON? |
|---|---|---|
| No `applyTo` — pure literal (`commodityLine`, `commodityCode`, `commodityType`, `species`, `numberOfAnimals`, `unitRecord`) | 6 | **Yes — 100% data**, reported `{kind:'always-in-scope'}` |
| `applyTo: () => ({inScope:true, status:'mandatory'})` — **constant**, no conditionality | 19 | No metadata → `custom-applyTo` |
| `allowListed` ×6 (`:474,:636,:646,:656,:666,:711`) + `anyAllowListed` ×2 (`:513,:549`) | 8 | **Yes — fully JSON** |
| `allowListedByPredicate` (`:685,:698`) | 2 | Partly — live fn |
| `branchedGate` (`:193,:216,:282,:296,:337` + shared `accompanyingDocumentBlockApplyTo` at `:767,:773,:779,:785`) | 9 | Partly — predicate withheld |
| **Total** | **44** | |

6 + 19 + 8 + 2 + 9 = 44. The claim's 8 / 9 / 2 / 19 are all correct.

---

## 2. Refutation #1 — the denominator. Only **19 of 44** obligations are conditional at all.

The headline is *"B's conditionality is mostly unreadable as data"*, then computes 8/44 = 18%. But
**25 of the 44 have no conditionality to read**: 6 are pure JSON literals, and 19 are *constant*
closures that ignore both arguments and return the same object forever. Counting a constant
function as "unreadable conditionality" is a category error.

Scored on the set that actually gates on something (**19**):

- **8 / 19 (42%)** — fully JSON (`allowListed`, `anyAllowListed`)
- **2 / 19 (11%)** — obligation + projection + reasons as JSON, allowlist as a fn
- **9 / 19 (47%)** — `branchedGate`, predicate withheld

*"47% of B's real gates withhold their predicate, and they are the interesting ones"* is true and
damaging. *"18% of the model is readable"* is a different, softer-sounding-but-actually-harsher
statement, and the gap is exactly the sort of number that gets quoted downstream.

---

## 3. Refutation #2 — the 19 opaque rows are a **BUG WORKAROUND**, not a modelling choice

This is the counter-example the claim did not go far enough to find.

B **already has** a zero-code, 100%-JSON way to say "always in scope": *omit `applyTo`*.
`commodityCode`, `commodityType`, `species`, `numberOfAnimals` (`obligations.js:412-444`) do
exactly that — `{id, name, within, status:'mandatory'}` and nothing else. The evaluator classifies
them `'field'` (`evaluator.js:162-163`, `:176-177` — *"has `status`, no `applyTo`, no
`indexedBy`"*), and the data dictionary reports them `{kind:'always-in-scope'}`
(`data-dictionary-sketch.js:32`).

So why do 19 *top-level* obligations write a pointless closure instead? Because the pure-data shape
**throws** at top level:

```js
// evaluator.js:469-472  — the 'field' branch
if (category === 'field') {
  const parentGroupFulfilmentIds = [
    ...(fulfilmentIdsByObligationId.get(obligation.within.id) ?? [])   // ← unconditional deref
  ]
```

A top-level `{id, name, status:'mandatory'}` with no `within` classifies as `'field'` and then
**TypeErrors on `obligation.within.id`**. Adding `applyTo: () => ({inScope:true, status})`
reclassifies it as `'single'` (`:181`), handled safely at `:453-455`. **All 19 closures exist to
route around that one line.**

Guard the deref (`obligation.within ? … : {inScope:true, status}`) and all 19 can be deleted: they
become pure JSON literals and B's fully-serialisable scope declarations go from **8/44 (18%) to
33/44 (75%) with zero change to the model**. This is the textbook "conflates *not built* with
*cannot be built*" failure, and it is the largest single number in the claim.

---

## 4. Refutation #3 — the `branchedGate` predicates are **not arbitrary JS**, and the two
predicate gates are **already partially serialisable**

### 4a. All 9 branchedGate predicates come from a 3-shape closed set

There are only 6 distinct predicates behind the 9 (four obligations share one). I read every one:

| Obligation(s) | Predicate | Shape | Data-shaped primitive B **already ships** |
|---|---|---|---|
| `regionCode` (`:194`) | `fulfilments[regionCodeRequirement.id] === 'yes'` | equality | `matches` → `{type:'matches', obligation, value}` (`helpers.js:152`) |
| `purposeInInternalMarket` (`:217`) | `… === 'internal-market'` | equality | ditto |
| `commercialTransporter` (`:283`) | `… === 'commercial'` | equality | ditto |
| `privateTransporter` (`:297`) | `… === 'private'` | equality | ditto |
| `transitedCountries` (`:338-339`) | `LAND_TRANSPORT_MODES.includes(…)` | membership | `allowListed` → publishes `values` |
| 4× `accompanyingDocument*` (`:751-762`) | `isFilled(fulfilments[accompanyingDocumentType.id])` | presence | `present(obligation)` (`helpers.js:165-175`) |

**Not one is arbitrary JavaScript.** They are equals / includes / present — the same closed
operator set the L2 write-up credits *A* with. `matches` exists, is unit-tested, and is used
**zero times** in the manifest. `branchedGate` withholds the predicate purely because it accepts an
**anonymous** closure and never forwards a `predicate.metadata`; making `present`/`matches` carry
metadata and having `branchedGate` forward it is ~a dozen additive lines.

So the true statement is *"nothing forces a gate to publish its predicate"* — **not** *"the
predicate cannot be published"*. Corroboration that even B thinks it published it:
`sketches.test.js:118-125` comments *"metadata should carry the branch predicate description"* and
then only asserts `row.scope.type ?? row.scope.kind` is defined.

### 4b. `allowListedByPredicate` is extensionally serialisable **today**

Both instances (`identificationDetails`, `description`) gate on `commodityCode`, whose domain is a
**`staticEnum` of 8 codes** (`domain/index.js:605-616`). Finite enumerable domain + exposed
predicate ⇒ evaluate across the domain and materialise the exact `values: [...]` array that
`allowListed` would have published. **B already uses this partial-evaluation seam in production** —
`features/units/controller.js:209-212` and `features/commodity-lines/controller.js:115-121` call
`meta.predicate(lineCode)` to ask "would this code be admitted?" without running the evaluator, and
`helpers.js:83-87` documents that this is why the predicate is exposed. Calling these 2 "opaque" is
wrong; they are a partial-evaluation shape, not a black box.

---

## 5. The doc-contradiction charge is overstated

`obligations.md:761-768` sits under a heading literally called **"### Trade-off accepted"**. B does
not contradict itself so much as **loudly own** the non-serialisability, in a section dedicated to
owning it. And `:55-58` says sections unchanged from the parent model doc are *"preserved
wholesale"* — the `:62-64` "pure data — JSON-encodable" line is inherited boilerplate that went
stale. Stale doc line: yes. Self-deceiving doc: no.

And the doc **is** honoured by code where it matters: `.metadata` has three live consumers —
`data-dictionary-sketch.js:33`, `features/units/controller.js:204`,
`features/commodity-lines/controller.js:110`. The sidecar is load-bearing, not decorative.

Separately, `dump.js:1-18` gives B an **extensional** serialiser: feed a fixture, get
`{journeyState, statusPerSubsection, statusPerPage, startPage, nextAfterStart, missingRequired,
changeLinks}` as JSON. That does not export the *rules* cross-language, but "unreadable as data" as
a blanket phrase is too strong — B's *decisions* dump to JSON for any state; it is the *intension*
(the gate itself) that 11 of 19 conditional obligations withhold.

---

## 6. What survives — the true, defensible finding

- **9 of B's 19 conditional gates withhold their predicate from metadata**, and those 9 are the
  interesting ones: the mutually-exclusive transporter pair, the retain-value flip on `regionCode`,
  the all-or-nothing document block, the purge-on-flip pairs. Static analysis — reachability
  inversion, cross-language export, a stakeholder data dictionary — is blind on exactly the gates a
  stakeholder would ask about.
- **Nothing in B forces a gate to publish metadata.** `data-dictionary-sketch.js:34` silently
  degrades to `{kind:'custom-applyTo'}`; `obligations.md:527-528` explicitly blesses hand-written
  closures (*"JS is the vocabulary"*). No build-time check exists, so even after a retrofit B has no
  mechanism preventing regression to opacity. **That absence — not expressiveness — is the durable
  finding.**

**Retrofit cost (first-class, per the brief): small.** (1) Guard `evaluator.js:471` → 19 obligations
become pure JSON. (2) Give `present`/`matches` metadata and have `branchedGate` forward
`predicate.metadata` → 9 more. (3) Enumerate `allowListedByPredicate` over the staticEnum domain →
2 more. Roughly a day, taking B from 8/44 to 44/44 machine-readable scope declarations. The right
shopping-list item is **"a coverage test that fails the build if any `applyTo` lacks
JSON-serialisable metadata"**, not "B's conditionality is structurally unreadable".

---

## 7. What I searched

- Read `obligations/helpers.js` in full (all 6 helpers + `filterAndProject`).
- Read `obligations/obligations.js:140-843` in full; censused all 44 manifest entries by shape;
  re-ran the cited grep (19, confirmed); read all 6 distinct branchedGate predicates.
- Read `obligations/evaluator.js` `classifyObligations` (`:166-185`) and `buildImplication`
  (`:439-511`) — found the `within.id` deref that forces the 19 closures.
- Read `data-dictionary-sketch.js` and `dump.js` in full; `sketches.test.js:105-145`.
- `grep -rn "\.metadata"` across the whole spike → 3 live consumers; read both controller call
  sites.
- `grep -n` over `domain/index.js` → `commodityCodeDomain = staticEnum(COMMODITY_OPTIONS)`
  (`:605-616`, 8 codes) — the finite domain that makes `allowListedByPredicate` enumerable.
- Read `obligations.md` `:55-70`, `:520-535`, `:755-775` to check the doc-contradiction charge in
  context.
