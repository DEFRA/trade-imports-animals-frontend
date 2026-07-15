# L3 — Adversarial verification — code-shape — C4

**CLAIM (C4):** The duplication on the two sides is of different KINDS: A duplicates RULES (can silently produce wrong answers), B duplicates PLUMBING (produces boilerplate). This matters more than the LOC volume of either.

**VERDICT: REFUTED.**

The claim's central assertion is the *kind asymmetry*. It does not survive contact with the source. **Both sides duplicate rules.** B duplicates a rule interpreter in two production feature controllers, has already silently produced wrong answers from it **twice** (documented in B's own `docs/add-an-obligation.md`), and — the reversal that kills the claim — **B's rule-duplication fails silently where A's core interpreter throws.** Meanwhile A's offered evidence miscounts and mischaracterises its own three "interpreters".

The plumbing half of the claim is *precisely* verified. The rule half is half-right on A and simply wrong on B.

---

## 1. What was verified as stated

| Claim element | Status |
|---|---|
| `applyPredicate` (`engine/evaluate/predicate.js:12-29`) throws on unknown operator | **TRUE** — verbatim `throw new Error(\`Unknown activation predicate: ...\`)` at :26-28 |
| `entryComplete` (`complete.js:26-41`) re-implements `predicate.js:64-68`'s sibling-frame resolution inline | **TRUE** — as *frame resolution* (see §2) |
| `DESIGN-DELTA #5` exists because the two resolvers drifted at depth 2 | **TRUE** — `DESIGN-DELTA.md:107-138`, inc-035 |
| B: `lib/{page,line-page,unit-page}-controller.js` = 111 + 141 + 179 = **431 LOC** | **TRUE — exact** (`wc -l`) |
| B: 98 of the unit controller's 179 lines byte-identical to the line controller's | **TRUE — exact.** `sort` + `comm -12` = **98** |
| B's `lib/*-page-controller.js` cannot mis-evaluate | **TRUE of `lib/`** — `obligationInScopeForLine` (:59-66) and `obligationInScopeForUnit` (:69-77) both read `state.obligations[id].inScope` + `.records`, i.e. evaluator output. Neither re-derives a rule. |

So the *plumbing* duplication on B is real, exactly as measured, and is genuinely inert.

---

## 2. REFUTATION 1 — A's "THREE interpreters" is a conflation, and the loudness count is backwards

The claim: *"activatedBy has THREE interpreters … A 5th operator means editing 3 places, only 1 of which fails loud."*

**`entryComplete` is not an interpreter of the operator vocabulary.** Read `complete.js:23-42`: it reads only `subObligation.activatedBy?.obligation` and `.frame`, then **delegates** to `applyPredicate` (:28) or `evalPredicate` (:37). It never inspects `equals` / `includes` / `notInUnionOf` / `present`. **Adding a 5th operator requires ZERO edits to `complete.js`.** What `entryComplete` duplicates is *frame resolution* — a different duplication from the one the claim's punchline is about. The claim welds two distinct defects into one count.

**`gateValue` is not a production interpreter and does not fail silently.** `grep -rln "reachability"` over the tree: `analysis/reachability.js` has exactly **one** importer — `analysis/reachability.test.js`. **Zero production importers.** More importantly, its `return undefined` (`reachability.js:46`) **cannot produce a wrong answer**, because the witness it scaffolds is *validated by the real interpreter before use*:

```js
// analysis/reachability.js:174
if (reconcile(candidate).inScope.has(targetKey)) { answers = candidate; break }
```

`reconcile` → `evalPredicate` → `applyPredicate` (the single true interpreter, which throws). If a 5th operator were added and `gateValue` didn't handle it, the scaffold value is `undefined`, no candidate puts the obligation in scope, `answers` stays `null`, and `proveReachability` pushes `reason: 'no-witness-puts-in-scope'` — which **reds the test**:

```js
// analysis/reachability.test.js:26
expect(proveReachability()).toEqual([])
```

`gateValue` can only produce a **false alarm**, never a **false proof**. So: a 5th operator means editing **2** places (`applyPredicate`, `gateValue`), and **both fail loud** — one throws, one turns a test red. The claim's "3 places, only 1 fails loud" is false on both numbers.

---

## 3. REFUTATION 2 (decisive) — B duplicates RULES, in production, silently, and has already been bitten twice

The claim's B-side assertion — *"B's page controllers all call the same contract and cannot mis-evaluate"* — is true of `lib/`. It is **false of B's feature controllers**, which is where B's browser behaviour actually lives.

B hand-rolls a **second, partial interpreter of the gate vocabulary**, twice, near-identically, both bypassing the evaluator by design:

**`features/commodity-lines/controller.js:104-124` — `lineHasWiredUnitObligation`**
**`features/units/controller.js:186-222` — `pickSeedObligationForLine`**

```js
// commodity-lines/controller.js:110-121  (units/controller.js:204-218 is the same shape)
const meta = obligation.applyTo?.metadata
if (!meta) continue
if (meta.type === 'allowListed' && meta.values?.includes(lineCode)) return true
if (meta.type === 'allowListedByPredicate' && meta.predicate?.(lineCode)) return true
```

These handle **2 of B's 6 gate factories**. Everything else — `branchedGate` (whose metadata omits the gate obligation entirely, `helpers.js:135-139`), `matches`, `present`, and the **~19 bare inline arrows carrying no `.metadata` at all** — hits `if (!meta) continue` (`:111` / `:205`) or falls past both `meta.type` tests and is **silently skipped**. No throw. No error. The obligation is simply treated as "does not apply to this line."

**Blast radius when it misfires:** `lineHasWiredUnitObligation` gates the *"Manage animals on this line"* link (`commodity-lines/controller.js:158`). A silently-skipped mandatory unit obligation ⇒ the link never renders ⇒ **a mandatory page the user cannot reach.** A dead end, produced silently by a hand-rolled restatement of a rule the manifest already declares.

**No test pins either helper.** `grep -rn "lineHasWiredUnitObligation\|pickSeedObligationForLine"` over the whole spike returns production call sites + docs only. The nearest thing is `obligations/helpers.test.js:116-117`, which tests the *shape of the metadata they consume* — not the helpers, and not totality. B has **no equivalent of A's `proveReachability()`** backstopping these.

**And B has already shipped wrong answers from exactly this duplication — twice.** B's own `docs/add-an-obligation.md:678-699` narrates it:

> *"Iteration 9's browser-side helpers (`pickSeedObligationForLine`, `lineHasWiredUnitObligation`) had a stub `if (meta.type === 'allowListedByPredicate') return true` because there were no wired obligations using that gate. Now that there are two, the stub needed to actually evaluate the predicate…"*

That is a hardcoded **unconditional `return true`** in two production gate re-interpreters — a wrong answer for every line, latent until someone wired the first `allowListedByPredicate` obligation. And immediately after:

> *"`pickSeedObligationForLine` used to walk unit obligations in manifest-declaration order and seed on the first match… declaration order would seed on passport (optional) instead [of permanentAddress, mandatory]. Fix: two-pass iteration — mandatory obligations first."*

A second wrong answer, from the helper's hand-rolled restatement of a rule the manifest already declares (`status: 'mandatory'`).

**Finally, a doc the code does not honour — on B.** `commodity-lines/controller.js:100-103` claims: *"If step 5 wires more unit obligations, this generalises automatically because we iterate the manifest."* That is **false** for any obligation whose `applyTo` lacks handled metadata — i.e. for the *majority* declaration form in B's manifest.

---

## 4. Bonus finding on A — the claim's instinct is right, but its evidence is in the wrong place

The frame-resolution duplication (§2) *does* leave a live divergence on A's **public facade**, which the claim missed:

`engine/evaluate/collection-view.js:15` calls `entryComplete(obligation, entry)` with **no `ctx`**. `DESIGN-DELTA.md:124-127` states this plainly and calls it a feature:

> *"ABSENT ctx = pre-inc-035 behaviour byte-for-byte: only same-frame sibling gates resolve, a non-sibling gate falls through to the per-field required check (owed, conservative). `collectionView` … call with no ctx and are unchanged."*

But `permanentAddress` (`features/commodities/obligations.js:80-85`) is `required: true`, `frame: 'enclosing'`, and sits inside `animalIdentifiers.item` (:96-111). So for an off-gate row: **`collectionView` reports `complete: false` while `satisfied`/`statusOf` (which thread ctx) report it complete.** Two engine exports, one rule, two answers — the *same* drift `DESIGN-DELTA #5` was written to fix, still live on the other resolver, and *excused by the doc as backwards compatibility*.

**Honest caveat (not built ≠ cannot):** this is currently **dormant**. All five production `collectionView` call sites (`check-answers:215,217,402`, `animal-identification:386,417`, `consignment-details:118`, `documents:111,303`, `hub:182`) destructure only `entry`/`index` — **nobody reads `.complete`**. But it is on the 10-export public facade and pinned by `collection-view.test.js:29`, so the first consumer to read it gets the wrong answer with no test catching it.

---

## 5. Why REFUTED and not AMENDED

The claim is not a measurement that came out imprecise — it is an *asymmetry*, and the asymmetry inverts under inspection:

- **"B duplicates plumbing"** — B duplicates plumbing **and** rules. The rule-duplication is in production request handlers, is untested, and has already produced two documented wrong answers.
- **"only 1 of which fails loud" (A)** — A's operator vocabulary is edited in 2 places and **both fail loud**. A's `applyPredicate` **throws**; B's two gate re-interpreters **`continue`**.
- On the claim's own chosen axis — *does the duplication fail loud or silent?* — **A is the loud one and B is the silent one.** That is the opposite of what the claim says.

## 6. What IS true (the salvageable core)

- B's **three page-controller factories** (431 LOC, 98 identical lines) are pure plumbing duplication and genuinely cannot mis-evaluate. Verified exactly.
- A's **frame-resolution** duplication is real, drifted once (`DESIGN-DELTA #5`), and leaves a second live-but-dormant divergence in `collectionView`.
- B's **gate re-derivation** duplication is real, silent, untested, and has drifted twice already.
- The honest generalisation: **both sides leak rules out of the model into hand-written code the moment the model can't answer a question the render layer needs** — A because `scope.has(id)` can't say *which instance*; B because `impl.inScope` is `false` at add-time before any record exists (the chicken-and-egg named at `docs/add-an-obligation.md:607-611`). Same disease, same cause, both sides.
- The third option's actual requirement: **one interpreter, closed and total, reachable at rest** — i.e. an evaluator that can answer "would this gate admit value V?" *without* an existing record. That single API removes A's 6 restatements *and* B's 2 gate re-interpreters.

## 7. What was searched

- Read `predicate.js` (69), `complete.js` (93), `reachability.js` (215), `reachability.test.js`, `reconcile.js`, `collection-view.js`, `commodities/obligations.js:60-124`, `DESIGN-DELTA.md:100-138`.
- `grep -rln "reachability"` → 1 test importer, 0 production. `grep -rln "activatedBy"` → confirmed `reconcile.js` delegates to `evalPredicate` (not a 4th interpreter).
- `grep -rn "entryComplete\|collectionComplete"` → found `collection-view.js:15` no-ctx call; confirmed no production consumer of `.complete`.
- Read all three B page-controller factories in full; `wc -l` (431 exact); `sort` + `comm -12` (98 exact).
- `grep -rn "01061900\|includes("` over B's `features/` + `lib/` → surfaced the two `meta.type` gate re-interpreters.
- Read `commodity-lines/controller.js:90-134`, `units/controller.js:185-222`, `helpers.js:60-109`, `docs/add-an-obligation.md:596-735`.
- `grep -rn "lineHasWiredUnitObligation\|pickSeedObligationForLine"` → no tests.
