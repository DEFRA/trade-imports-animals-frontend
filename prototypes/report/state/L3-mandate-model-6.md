# L3 adversarial verification — C6 (mandate-model)

**Claim (C6):** `isSufficientForProceed`'s optional short-circuit is the ONLY place either of B's two
mandate flags consults the other, and it is what makes flat proceed-declarations safe — a flow declares
the gate unconditionally and the model decides whether it fires. 13 flow entries declare
`mandatoryToProceed: true` with zero restated conditions.

**Verdict: AMENDED.** Every literal sub-assertion in the evidence is true and reproducible. Two things
are wrong with the *architectural* reading built on top of them:

1. The short-circuit is NOT what makes all 13 flat declarations safe. It cannot be — for an
   out-of-scope obligation `effectiveStatus` returns **`'mandatory'`**, not `'optional'`, so the
   short-circuit would *fail open into a block*. The not-applicable cases are saved by a
   **different, earlier mechanism** (the scope filter in `build-field-descriptors.js`). Two
   mechanisms share the load, one per branch of the required/optional/NA trichotomy.
2. The flow layer has **no syntax for a condition at all**, so "zero restated conditions" is not a
   design achievement of the short-circuit — it is the only thing the flow *can* do. That is a
   stronger point than the claim makes, and it belongs to the layering, not to `isSufficientForProceed`.

---

## Part 1 — what I verified line-by-line (all real, all correct)

| Cited | Status |
|---|---|
| `contract.js:315-322` — `isSufficientForProceed` | ✅ verbatim. `if (effectiveStatus(obligation, path, state) === 'optional') return true`, then `domain.get(obligation.id)` → `entry?.type === 'address' && typeof entry.isComplete === 'function'` → `entry.isComplete(value)`, else `!isBlankValue(value)`. |
| The single call site | ✅ `contract.js:266-283` — `descriptor.mandatoryToProceed && !isSufficientForProceed(...)` → push `{ code: 'flow.required' }` → `continue` (skips the domain check). One gate, nowhere else. |
| `flow/flow.js:124` — `regionCode` flat | ✅ `presents: [{ obligation: regionCode, mandatoryToProceed: true, errors: { required: 'errors.regionCode.required' } }]`. No condition. The comment at `flow.js:114-119` explicitly defers the condition to the obligation. |
| The obligation carrying it | ✅ `obligations/obligations.js:190-198` — `branchedGate(f => f[regionCodeRequirement.id] === 'yes', { inScope: true, status: 'mandatory' }, { inScope: true, status: 'optional' })`. **Both branches `inScope: true`** — this is the retain-value pattern; the only thing that flips is `status`. |
| `routes.test.js:270-303` / `305-321` | ✅ Both directions genuinely behavioural (Hapi `inject` with a cookie jar). `no` branch + blank POST → **302**; `yes` branch + blank POST → **400** + "Enter the region of origin code". |
| Count = 13, not 14 | ✅ `grep -rn mandatoryToProceed flow/flow.js` → `mandatoryToProceed: true,` at exactly **124, 149, 197, 202, 220, 338, 384, 392, 399, 442, 451, 460, 469**. The other hits (10, 17, 106, 182, 331, 367) are JSDoc/comments. Split confirmed by reading: 442/451/460/469 are inside `presentsForEach` blocks (`flow.js:439-471`), the other 9 are `presents`. **9 + 4 = 13. L1-B's 14 is wrong; the claim's correction is right.** |
| Defaults `false` | ✅ `engine/index.js:254` and `:266` — `mandatoryToProceed: entry.mandatoryToProceed ?? false` / `forEach.mandatoryToProceed ?? false`. |

**"Only place either flag consults the other" — I hunted a second cross-consultation and did not find one.**
- `grep -rn effectiveStatus <spike>`: code hits are `contract.js:26` (import), `contract.js:316` (the short-circuit), `engine/index.js:291` (definition), `engine/index.js:393` (inside `classifyEntries`).
- `classifyEntries` (`engine/index.js:386-410`) — the one classifier behind `pageStatus` / `containerStatus` / `journeyState` — filters `effectiveStatus(...) === 'mandatory'` and **never reads `mandatoryToProceed`**. The status / task-list / CYA / submit-gate side of the model is completely blind to the proceed flag.
- `grep -rn mandatoryToProceed <spike>` — non-test, non-doc hits are only: declared in `flow/flow.js` (13 + JSDoc), passed through in `engine/index.js:254,266`, passed through in `lib/build-field-descriptors.js:102`, consumed in `contract.js:267`. One comment in `domain/index.js:190`. **Zero `.njk` hits** — it does not even drive a `required` attribute or an "(optional)" suffix in the UI.

So the exclusivity assertion survives, with the refinement that the consultation is **one-directional**:
the proceed flag consults completion-status; completion-status never consults the proceed flag.

---

## Part 2 — where it breaks: the short-circuit is not what saves the flat NA declarations

This is the load-bearing find, and it is a hard, mechanical one.

`engine/index.js:291-297`:

```js
export function effectiveStatus(obligation, path, state) {
  const impl = state.obligations?.[obligation.id]
  if (!impl) return undefined
  if (path === null) return impl.status ?? 'mandatory'
  const record = (impl.records ?? []).find((r) => r.fulfilmentId === path)
  return record?.status ?? 'mandatory'
}
```

`obligations/evaluator.js:448`: **`if (!isInScope(obligation)) return { inScope: false }`** — an out-of-scope
obligation's implication has **no `status` key at all**.

Compose the two: for an out-of-scope singleton, `impl` exists (so no `undefined` bail), `path === null`,
and `impl.status ?? 'mandatory'` evaluates to **`'mandatory'`**. The short-circuit at `contract.js:316`
therefore **does not fire for a not-applicable obligation** — it falls straight through to
`!isBlankValue(value)` and would *reject* a blank save.

Three of the 13 flat declarations are exactly that case:
- `purposeInInternalMarket` (`flow.js:145-153`) — `applyTo: branchedGate(..., { inScope: false })` at
  `obligations.js:213-225`. NA unless `reasonForImport === 'internal-market'`.
- `commercialTransporter` / `privateTransporter` (`flow.js:193-205`) — `{ inScope: false }` on the off
  branch (`obligations.js:279-305`); two flat flags on one page, only ever one in scope.

What saves them is **`lib/build-field-descriptors.js:20-26, 67`** — `entryInScope()` drops any entry
whose obligation is not `inScope` (and, for per-record entries, whose `path` is gone from the group's
record set) **before a descriptor is ever built**. `validatePagePayload` iterates only
`fieldsForPage` descriptors (`contract.js:225ff`), so `isSufficientForProceed` is **never called** for an
NA obligation. The gate is unreachable, not short-circuited.

### The 13, decomposed by what actually protects each one

| Protected by | Entries | Count |
|---|---|---|
| **Scope filter** (`build-field-descriptors.js:67`) — obligation goes `inScope: false` | `purposeInInternalMarket`, `commercialTransporter`, `privateTransporter` | 3 |
| **The optional short-circuit** (`contract.js:316`) — obligation stays in scope, `status` flips to `optional` | `regionCode` (`flow.js:124`), `accompanyingDocumentAttachmentType`/`Reference`/`DateOfIssue` (`flow.js:384,392,399` — `accompanyingDocumentBlockApplyTo`, `obligations.js:754-762`, both branches `inScope: true`) | 4 |
| **Neither** — unconditionally in-scope-mandatory, the gate always fires and always should | `meansOfTransport` (`obligations.js:311-315`), `contactAddress` (`:372-373`), `commodityCode`/`commodityType`/`species`/`numberOfAnimals` (`:414,425,434,441`, all `within: commodityLine, status: 'mandatory'`) | 6 |

The claim credits one mechanism with a job that is 4/13 its own, 3/13 someone else's, and 6/13 nobody's.
The *conclusion* ("a flow declares the gate unconditionally and the model decides whether it fires") is
still true — but the model decides through **two** doors, and describing only one of them mis-states the
required / optional / **not-applicable** trichotomy that is the whole point of this dimension.

---

## Part 3 — the flow cannot restate a condition even if it wanted to

`expandPresents` (`engine/index.js:248-272`) reads exactly four properties off a presents entry:
`obligation`, `path`, `mandatoryToProceed`, `errors`. `presentsForEach` adds `forEachOf`. That is the
entire flow-entry vocabulary (documented at `flow/flow.js:9-26`). **There is no `when` / `if` /
`condition` key anywhere in the flow schema**, and nothing downstream would read one.

So "13 declarations with zero restated conditions" is not evidence of a well-behaved composition rule —
it is a *structural guarantee* of the layering. Conditionality is single-sourced in `applyTo` because the
flow layer has no expressive room to duplicate it. That is a stronger and more defensible statement of
B's real strength here, and it survives independently of `isSufficientForProceed`.

---

## Part 3b — the short-circuit decides on STALE state (second-pass find, 2026-07-14)

Re-verification pass. Independently reconfirmed Parts 1–3 (`evaluator.js:448` = `if (!isInScope(obligation))
return { inScope: false }` — verified; `helpers.js:132-141` `branchedGate` returns the raw `whenTrue`/
`whenFalse` decision, so the off-branch genuinely carries no `status` key; the 13/9/4 counts re-grepped and
correct). One thing the first pass did not surface, and it bites the very cases where the short-circuit IS
load-bearing.

`validatePagePayload(page, payload, state, options)` (`contract.js:224`) passes the **pre-submit** `state`
straight into `isSufficientForProceed` (`contract.js:266-273`). The payload under validation is **not merged
in first**. So the "model decides whether it fires" decision is made against state that is one submit out of
date.

That is harmless when the gate's driving answer lives on an **earlier page** — which is why `regionCode`
works (`regionCodeRequirement` is its own page, `flow.js:110-113`). It fails when the driver and its
dependents are **co-located on one page**. That is exactly the accompanying-documents block: the driver
`accompanyingDocumentType` and its three `mandatoryToProceed: true` dependents are all on
`page: 'accompanying-documents'` (`flow.js:378-405`), gated by the shared `accompanyingDocumentBlockApplyTo`
(`obligations.js:754-762`).

B's own test states the consequence verbatim (`routes.test.js:800-811`):

> "First submit with type-only → **302** (state at validate time still has type blank; three are
> effective-optional; gate short-circuits)... **The one-step delay on the first save is acceptable for the
> spike**"

Behaviourally: pick a document type, leave all three mandatory-to-proceed fields blank, hit Save →
**the page saves** (`routes.test.js:769-790` asserts the 302, and that CYA then prompts for the three). The
gate only fires on a **re-visit** (`routes.test.js:792-831` → 400 + the three per-field required messages).

So of the 4 declarations the short-circuit actually protects, **3 of them (the accompanying-document trio)
are protected into a fail-open**. The short-circuit trades a false-positive (the pre-NEW-1 bug: gate firing
on an effectively-optional obligation) for a false-negative (gate silently not firing when the driver was
answered on this very submit). It is a `state` vs `state ⊕ payload` bug, acknowledged and parked.

**For the third option:** evaluate the proceed-gate against the post-merge projection
(`effectiveStatus(obligation, path, applyFulfilments(state, values))`) rather than the stored state. The
`values` map is already built in the same loop (`contract.js:247-251`) — the ingredients are there; nobody
wired it up. This is "not built", not "cannot be built".

---

## Part 4 — a doc the code does not honour (and the ceiling it hides)

- `obligations.md:1739` — "Two **orthogonal** flags govern completion".
- `RECOMMENDATION.md:159` — "The two are **independent** and can be combined per flow entry".

The code does not honour that. The short-circuit makes `mandatoryToProceed` **strictly subordinate** to
effective completion-status: an obligation that is effectively-optional can *never* block a page save.
`obligations.md`'s own 2×2 (`:1759-1764`) admits it — row 2 (`mandatoryToProceed: true` × `status:
optional`, "Must fill on this page (UX choice) even though the Journey doesn't strictly need it") ends
with "In practice `isSufficientForProceed` short-circuits". **Row 2 is dead.** B's mandate model has
**3 reachable cells, not 4**.

The inexpressible cell is not exotic: "you must answer this before you can continue, even though the
journey doesn't ultimately need it" is a routine GDS page-level UX pattern (forced radio choices,
"choose one to continue" gateways). In B today you cannot express it — and note this is a *design choice
with a fix available*, not a hard structural limit: gating the short-circuit on `inScope`-derived
not-applicable only (rather than on `optional`) would reopen row 2 at the cost of the `regionCode`
behaviour. Flagging it as "not built / deliberately closed" rather than "cannot be built" matters for
the third-option shopping list.

---

## Amended claim (the strongest version that is true)

> B single-sources conditionality in the obligation layer: the flow-entry schema has **no** condition
> syntax at all (`engine/index.js:248-272` reads only `obligation`/`path`/`mandatoryToProceed`/`errors`),
> so all 13 `mandatoryToProceed: true` declarations in `flow/flow.js` (124, 149, 197, 202, 220, 338, 384,
> 392, 399 on `presents`; 442, 451, 460, 469 on `presentsForEach`) are necessarily flat, and the model
> decides at runtime whether each gate fires. It decides through **two** doors, not one:
> (a) the scope filter at `lib/build-field-descriptors.js:67` drops out-of-scope obligations before a
> descriptor exists, so the gate is unreachable for not-applicable obligations
> (`purposeInInternalMarket`, `commercialTransporter`, `privateTransporter`) — necessary, because
> `effectiveStatus` returns **`'mandatory'`** for an out-of-scope obligation (`engine/index.js:294` +
> `evaluator.js:448`), so the short-circuit would *not* have saved them; and
> (b) `isSufficientForProceed`'s `effectiveStatus === 'optional'` short-circuit (`contract.js:316`) —
> which covers the in-scope-but-optional obligations (`regionCode`, the three accompanying-document
> fields), and is the **only** cross-consultation between B's two mandate flags in either direction
> (`classifyEntries` at `engine/index.js:386-410`, which backs every status/task-list/CYA/submit
> decision, never reads `mandatoryToProceed`; no template reads it either).
> The remaining 6 declarations are unconditionally in-scope-mandatory and need neither door.
> Door (b) is also **stale by one submit**: `validatePagePayload` (`contract.js:224, 266-273`) feeds
> `isSufficientForProceed` the *pre-submit* state, never `state ⊕ payload`. Where the gate driver sits on an
> earlier page (`regionCode`) that is fine; where driver and dependents share a page — the
> accompanying-documents block (`flow.js:378-405`) — the gate **fails open on the first save**, which B's own
> test concedes ("the one-step delay on the first save is acceptable for the spike", `routes.test.js:800-811`;
> 302 at `:769-790`, 400 only on re-visit at `:792-831`). So 3 of the 4 declarations door (b) protects are
> protected into a fail-open. Fixable — the `values` map is built in the same loop — so "not built", not
> "cannot be built".
> The subordination is not free: because an effectively-optional obligation can never block a page save,
> the "must answer here as a UX choice though the journey doesn't need it" cell is **inexpressible** —
> `obligations.md:1762` concedes row 2 of its own 2×2 is dead, contradicting
> `RECOMMENDATION.md:159`'s "the two are independent". 3 reachable cells, not 4.

---

## Searches run

- `grep -rn "mandatoryToProceed" <spike>` (whole tree; then narrowed to `flow/flow.js`, `contract.js`,
  `engine/index.js`, `domain/index.js`) — full enumeration above.
- `grep -rln "mandatoryToProceed" prototypes/` — flag exists in the flow-layer spike only; zero `.njk`
  hits; no `mandatoryToSubmit` anywhere (the submit mandate is `status: 'mandatory'` on the obligation,
  not a second flag).
- `grep -rn "effectiveStatus\|isSufficientForProceed" <spike>` — 4 code hits for `effectiveStatus`, all
  accounted for.
- `grep -rn "branchedGate" obligations/obligations.js` — 193, 216, 282, 296, 337, 754 (+ the shared
  `accompanyingDocumentBlockApplyTo`).
- `grep -rn "inScope\|status" obligations/evaluator.js` — located the `{ inScope: false }` early return
  at 448 that has no `status` key (the crux of Part 2).
- Read: `contract.js:260-338`, `flow/flow.js:1-240` and `:320-484`, `engine/index.js:230-419`,
  `lib/build-field-descriptors.js` (full), `obligations/evaluator.js:425-511`,
  `obligations/obligations.js:180-350, 372, 414-445, 745-786`, `routes.test.js:262-322`,
  `obligations.md:1735-1814`, `RECOMMENDATION.md:159`.
