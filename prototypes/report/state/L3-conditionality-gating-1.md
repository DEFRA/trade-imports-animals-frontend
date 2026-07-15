# L3 — Adversarial verification — C1 (conditionality-gating)

**CLAIM (C1):** Every one of B's 19 conditional gates falls inside A's closed 4-operator × 3-frame
vocabulary; B bought Turing-complete closure conditions and never once used the power. 5 branchedGate
predicates (3 scalar equality, 1 set-membership, 1 presence), 6 allowListed, 2 allowListedByPredicate,
2 anyAllowListed map *exactly* onto A's equals / includes / present / notInUnionOf × same-frame /
enclosing / anyItem, **with nothing left over**. Independently: A's spec contains ZERO compound
conditions — every digested V4 rule is a single predicate over a single obligation.

**VERDICT: AMENDED.** The core insight is real and worth keeping. Three of its load-bearing
sub-assertions do not survive contact with the source: the branchedGate census is miscounted, the
mapping is **not** exact (I found a live counter-example), and the second sentence is both factually
false and circular.

---

## 1. What I verified as TRUE

Every cited line is real and says what the claim says it says.

- **B's 19 conditional gates confirmed** (`obligations/obligations.js`): `branchedGate` on 9
  obligations (:193, :216, :282, :296, :337 + the four accompanying-document fields :767, :773, :779,
  :785 sharing `accompanyingDocumentBlockApplyTo` at :754); `allowListed` ×6 (:474, :636, :646, :656,
  :666, :711); `allowListedByPredicate` ×2 (:685, :698); `anyAllowListed` ×2 (:513, :549). 9+6+2+2 = 19. ✅
- **A's vocabulary confirmed** (`engine/evaluate/predicate.js:12-29`): exactly four operators —
  `equals`, `includes`, `notInUnionOf`, `present` — and three frames (`:31-68`: default same-frame,
  `'enclosing'`, `'anyItem'`). The `throw` on an unknown key (`:26-28`) makes it genuinely closed. ✅
- **GAPS.md confirmed** (`:62-86`, `:187-192`): a `gatedBy` DSL was built (commit `c79fbd0`) and
  deliberately dropped. ✅
- **A's spec has zero *compound* activatedBy blocks.** I dumped every one
  (`spec/journey-spec.json` :600, :705, :773, :995, :1036, :1065, :1245, :1477, :1591, :1633, :1667,
  :1702, :1729, :1761, :1794, :1967, :1995). Each is one operator over one `obligation` reference. No
  `allOf` / `anyOf` / `not`. ✅ (But see §4 — this is not evidence of what the claim says it is.)
- **The bulk of the mapping holds.** 14 of the 19 (6 `allowListed` → `includes` × same-frame/enclosing;
  2 `anyAllowListed` → `includes` × `anyItem`; 4 purge-on-flip `branchedGate`s → `equals`; 1 →
  `includes`) genuinely are single predicates inside A's operator set, and A carries the same rules in
  the same shape. `numberOfPackages` ↔ same-frame; `passport`/`tattoo`/`earTag`/`horseName`/
  `permanentAddress` ↔ `frame: 'enclosing'` (A: `features/commodities/obligations.js:80-85`);
  `cph`/`containsUnweanedAnimals` ↔ `frame: 'anyItem'` (A: spec :705, :1065). ✅

---

## 2. REFUTED: the branchedGate census is wrong

There are **6** distinct branchedGate predicates, not 5, and **4** scalar equalities, not 3:

| # | site | predicate | shape |
|---|---|---|---|
| 1 | `:194` `regionCode` | `fulfilments[regionCodeRequirement.id] === 'yes'` | equality |
| 2 | `:217` `purposeInInternalMarket` | `=== 'internal-market'` | equality |
| 3 | `:283` `commercialTransporter` | `=== 'commercial'` | equality |
| 4 | `:297` `privateTransporter` | `=== 'private'` | equality |
| 5 | `:338` `transitedCountries` | `LAND_TRANSPORT_MODES.includes(...)` | set-membership |
| 6 | `:751` `documentTypePresent` | `isFilled(fulfilments[accompanyingDocumentType.id])` | presence |

Immaterial to the headline, but it is an arithmetic error in the evidence line of a claim whose whole
force is "I enumerated them".

---

## 3. REFUTED: the mapping is NOT exact — a live counter-example

This is the finding that matters. **B's closure does exceed A's vocabulary, once, in production code.**

`obligations.js:674-678`:

```js
const noSpecificIdentifier = (code) =>
  !PASSPORT_COMMODITIES.includes(code) && !TATTOO_COMMODITIES.includes(code) &&
  !EAR_TAG_COMMODITIES.includes(code) && !HORSE_NAME_COMMODITIES.includes(code)
```

The claim reads this as "negation-by-complement ⇒ A's `notInUnionOf`". It is not the same function,
because of what `code` can be. `lib/state.js:110-114`, `addCommodityLine`:

```js
const seed = { ...(fulfilments[seedObligation.id] ?? {}), [id]: '' }   // commodityCode = ''
```

**Every freshly-added commodity line stores a blank commodity code.** `noSpecificIdentifier('')` → all
four `.includes('')` are false → the predicate returns **true**. `filterAndProject`
(`helpers.js:189-196`) iterates the *stored* keys, so that line passes, projects onto its
`unitRecord` paths, and `identificationDetails` / `description` are **in scope for a line with no
commodity code yet**. This is not dead: `pickSeedObligationForLine` (`features/units/controller.js`)
calls the same `metadata.predicate` to choose a seed obligation, and a code-less line falls through
the typed identifiers to exactly these two.

So B's live semantics is **`blank ∨ ¬union`**.

A's is **`answered ∧ ¬union`** — `predicate.js:20-24` hard-guards it:

```js
if ('notInUnionOf' in activatedBy) {
  if (!isAnswered(value)) return false        // <-- the blank case is excluded, by fiat
  ...
}
```

(`isAnswered` = `!isBlank`; `lib/answered.js:1-10` treats `''` as blank.)

A **cannot** express B's version. It needs `present:false ∨ notInUnionOf` — a disjunction — and A has
no `allOf`/`anyOf`/`not` in the shape at all. The only route is to edit `predicate.js`, i.e. to extend
the DSL. B needed `!` and `&&` — which is *precisely* the capability GAPS.md:79-80 lists as a reason
for the closure model ("Composes with JS operators — `&&`, `||`, `!`").

One can argue the blank-code case is a *bug* in B rather than a requirement. That is a fair separate
argument, and I would take it seriously. But C1 is an **expressibility** claim about the code as it
stands, and as it stands B's gate computes a function A's vocabulary cannot. "Never once used the
power" is false. "Nothing left over" is false.

---

## 4. AMENDED: "nothing left over" is false a second way — the presence gate maps only in theory

A has **zero** live `present` carriers (confirmed: no `present` key appears in any
`features/*/obligations.js`). So the claim's "1 presence → A's `present`" is a mapping the *author*
constructed, not one A ever made — and A's actual handling of the same V4 rule is not a gate at all.

`features/documents/obligations.js` (the whole file):

```js
export const documents = {
  id: 'documents', collection: true,
  item: [accompanyingDocumentType, accompanyingDocumentAttachmentType,
         accompanyingDocumentReference, accompanyingDocumentDateOfIssue]   // all four required: true
}
```

A models V4's "Field Block - Optional - All-or-nothing" (`spec/journey-spec.json:1357`, :1818, :1860,
:1884, :1912) **structurally** — an optional collection whose every item field is `required: true`.
B models it as a status-swap gate keyed specifically on `documentType` (audit finding #15,
`obligations.js:746-762`). These are **different rules**, not one rule expressed twice: A's trigger is
"an entry exists"; B's is "a type has been picked". And note the general point — for the 5 gates whose
`whenFalse` is also `inScope: true` (`regionCode` + the 4 doc fields), A's `activatedBy` can compute
the predicate but has **nowhere to put the answer**: its only consequence is `inScope`. The *predicate*
maps; the *gate* does not. C1's own companion claim (C3) concedes this — which makes C1's "map exactly
… with nothing left over" internally inconsistent with the claim set it sits in.

---

## 5. AMENDED: the second sentence is false, and circular

> "A's machine-readable spec contains ZERO compound conditions — every digested V4 rule is a single
> predicate over a single obligation." (evidence: "20+ `activatedBy` blocks")

- **The count is wrong.** There are **17** `activatedBy` blocks, not "20+".
- **"Every digested V4 rule is a single predicate over a single obligation" is false**, on the spec's
  own testimony. `spec/journey-spec.json:1421`, `typeSelection`:

  > "Applicability is data-driven from MDM ('where applicable for given commodity') — **not expressible
  > as an activatedBy equals/includes rule, so no activatedBy is wired**."

  That is a digested V4 applicability rule that A's predicate vocabulary could not reach. B *does*
  express this class of rule — `speciesDomain` (`domain/index.js:492-502`) filters the legal species by
  *that line's* commodity code via `ctx.path`. It lives in B's domain layer rather than `applyTo`, so
  it is outside C1's literal scope — but it is exactly the "left over" the claim says does not exist.
- **Other requirement-set conditionality also escaped the 4 operators, and A grew new vocabulary
  rather than a predicate for each:** `modelGap: "sibling-at-least-one"` (:1338) → `requiredOneOf` +
  `requiredAtLeastOne`; five `"All-or-nothing"` mandates → the collection restructure above; the
  per-species record cap (:1339) → `maxEntriesFrom` (DESIGN-DELTA #15). So A's closed vocabulary is
  not "4 operators" — it is 4 operators **plus a bespoke primitive added each time the requirement set
  overran them**. That is the DSL-extension cost GAPS.md predicted, and it is being paid.
- **It is circular as evidence.** `journey-spec.json` is A's *own digest*, authored by A's build loop
  to fit A's engine. "A's spec contains no condition A's engine cannot express" is close to a
  tautology, and cannot be offered as *independent* corroboration that the V4 requirement set is
  compound-free. The spec even carries the receipt (:1421) for the rule that got away.

---

## 6. A further mischaracterisation worth recording

C1's rhetorical payload is "B bought Turing-complete closure conditions … and never once used the
power". **B never claimed to buy power.** GAPS.md:187-192 says the DSL had *"same brevity as applyTo +
helpers for common cases, plus native introspection"* and was rejected on **idiomatic-JS,
obligation-level-testability and cross-sibling-ergonomics** grounds. Expressiveness is not among them.
So the claim scores B against a motivation B explicitly did not hold — and the one place B *did* reach
past A's vocabulary (§3) is the `&& / !` composition GAPS.md:79-80 named.

---

## What survives, and why it still matters

Strip the overstatement and there is a genuine, useful finding: **at the predicate level, on this
requirement set, B's closures bought almost nothing.** 14 of 19 gates are plain set-membership or
scalar equality; not one is a conjunction or disjunction of two *different* obligations; A's spec has
zero compound `activatedBy`. The DSL-sceptic's argument ("you will eventually meet a condition you
cannot express") is, on the V4 conditionality set, **very nearly unpaid-for** — but "very nearly" is
the amendment, and the exceptions are the interesting part: one live disjunction B expresses and A
cannot, one MDM-driven applicability rule A's spec says it cannot wire, and a family of
non-predicate rules (at-least-one, all-or-nothing, count caps) for which A had to add vocabulary
anyway.
