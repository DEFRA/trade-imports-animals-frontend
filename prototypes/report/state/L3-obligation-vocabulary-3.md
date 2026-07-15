# L3 adversarial verification — OV-3 (obligation-vocabulary)

**CLAIM:** A can statically invert a gate to synthesise a witness and prove every obligation has a
reachable owning page; **B structurally cannot** for its 11 code-shaped gates, "which are exactly the
interesting ones."

**VERDICT: AMENDED.** The A half is true and better-evidenced than the claim states. The B half —
the load-bearing word **"structurally"** — is **REFUTED**. The claim commits the exact failure mode
the brief warns about: it conflates *not built* with *cannot be built*.

---

## 1. What I verified on A (all CONFIRMED, and stronger than claimed)

- `analysis/reachability.js:36-47` — `gateValue` is real and verbatim as quoted. Four branches:
  `equals` → the operand; `includes` → first target; `notInUnionOf` → seed `'outside-the-union'`,
  `while (union.includes(candidate)) candidate = \`${candidate}-x\`` (`:41-42`); `present` → `'x'` / `''`.
- It is **total** over A's operator set: `engine/evaluate/predicate.js:12-29` (`applyPredicate`)
  implements exactly those four and throws on anything else. One inverter per operator, no gaps.
- `scaffoldFor` (`:49-91`) and `proveReachability` (`:184-215`) are as described, with the three
  reasons `no-witness-puts-in-scope` / `no-owning-page` / `owning-page-unreachable-in-scope`.
- **The prover is actually wired, not just written** — `analysis/reachability.test.js:26`
  pins `expect(proveReachability()).toEqual([])`, and `:31`/`:64` inject a `pagesFor` oracle with
  pages dropped to prove the prover can *fail*. This is a doc-honoured-by-code, mutation-tested
  capability. The claim under-sells this.

**A's caveat is worse than the claim admits.** `enumerateScopeStates` (`:8-20`) hand-names 4 fields,
*and* the witness rides a hand-written ~40-field `submitReadySeed` (`:99-158`). A has **no
value-legality layer at all**, so its candidate value space cannot be derived — it is authored prose.
Inversion supplies the *inner* scaffold only.

## 2. What I verified on B (the withholding is real)

`branchedGate` (helpers.js) does set `fn.metadata = { type, whenTrue, whenFalse }` — **no predicate,
no gate obligation**. Confirmed. 9 obligations carry it (6 call-sites; the accompanying-document one
is shared by 4). So B cannot invert *those* today.

## 3. The counter-examples — why "structurally" collapses

### 3.1 Every single `branchedGate` predicate is inside A's four operators

I read all six call-sites (`obligations.js:193, 216, 282, 296, 337, 754`):

| Site | Predicate | A-operator equivalent |
|---|---|---|
| :193 `regionCode` | `fulfilments[regionCodeRequirement.id] === 'yes'` | `equals` |
| :216 `purposeInInternalMarket` | `fulfilments[reasonForImport.id] === 'internal-market'` | `equals` |
| :282 `commercialTransporter` | `fulfilments[transporterType.id] === 'commercial'` | `equals` |
| :296 `privateTransporter` | `fulfilments[transporterType.id] === 'private'` | `equals` |
| :337 `transitedCountries` | `LAND_TRANSPORT_MODES.includes(fulfilments[meansOfTransport.id])` | `includes` |
| :754 doc block (×4) | `isFilled(fulfilments[accompanyingDocumentType.id])` | `present` |

**Not one is composite, multi-field, arithmetic, or higher-order.** All are first-order tests on a
single fulfilment. "Code-shaped" is a fact about the *encoding*, not the *content* — and the content
is 100% expressible in A's closed vocabulary. There is nothing here that resists inversion; B's own
factory is simply **handed** `predicate` and **drops it on the floor**. `fn.metadata.predicate =
predicate` is a one-line change. B already ships `matches(gateObligation, value)` whose metadata is
`{ type:'matches', obligation, value }` — literally A's `equals`, fully invertible — and just didn't
use it at these sites (it lacks the whenTrue/whenFalse status-swap, a trivial variant).

This is **not** symbolic execution over arbitrary JS. It is six equality/membership/presence checks.

### 3.2 Two of the "11" already expose their predicate — and B already probes gates in production

`allowListedByPredicate` puts `predicate` **on the metadata**, with a comment saying it is exposed
precisely so callers can ask *"would this value be admitted?"* without running the closure. And it is
used for that today: `features/units/controller.js:186-204` (`pickSeedObligationForLine`) reads gate
metadata to decide **which commodity code opens an obligation**. That is witness-probing, live, in
B's shipped code. Combined with B's enumerable domain (21 `staticEnum`/`computedEnum` entries),
`domain.get(gate).options().find(predicate)` is a **sound witness synthesiser** for these two.

### 3.3 Inversion is not necessary anyway — B has the whole forward-search apparatus

`dump.js` proves it: `evaluateState(fulfilments)` is a pure callable, `walkAllPages()` enumerates the
flow, `statusOfPage` gives per-page state, and **`changeLinkFor(obligationId)?.page` already returns
an obligation's owning page** — B's exact equivalent of A's `pageOfObligation`. So B can answer
`no-owning-page` *today*, with no new machinery.

For in-scope witnesses, a black-box forward search — enumerate candidate states, call `evaluateState`,
check `inScope` — needs **no inversion at all**. And A's own prover *already does this* for its outer
axes (`enumerateScopeStates` × `reconcile`). The claim's honest caveat concedes A's search space is
hand-written but never follows the concession home: if A must hand-write its space anyway, then B can
too — and **B would derive its space from the domain layer, which A does not have.** On candidate-space
sourcing B is *better* equipped, not worse.

## 4. What actually survives

A **built** a reachability prover, pinned and mutation-tested. B did not. That is a real gap and a
real retrofit cost — but it is a **build-state** gap, and the brief explicitly discounts "A has more
features". The retrofit for B is small and bounded: one line on `branchedGate` (or swap 6 call-sites
to a `matches`-style factory), plus a witness synthesiser that filters the domain enums. There is no
structural barrier, and the phrase "exactly the interesting ones" is backwards — the 9 branchedGate
gates are the *least* interesting, being plain equality checks.

The genuinely structural point in this neighbourhood is the **other** one, and it belongs to A only
weakly: B's model *permits* opaque closures, so nothing **forces** a gate to stay introspectable. The
defensible asymmetry is about **enforcement**, not **capability** — which is precisely the
"fail the build if a gate lacks metadata" line already in the L2 shopping list.
