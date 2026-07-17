# Delta register — B's obligation model vs A's

**Produced by** `inc-002`, 2026-07-17. **Input:** `mapping.json` (inc-001), both manifests, `spec/journey-spec.json` + `spec/conflicts.json`.
**For:** Sam, at the M0 gate (`inc-004`).

**A** = `prototypes/standalone/live-animals` @ `b6ac2ed`. **B** = `prototypes/journey-config-spikes/EUDPA-249-flow-layer` @ `34550a3` (`spike/EUDPA-288-blend-obligations-models`).

---

## Headline: the spec already settles almost all of it

`inc-002` was briefed to produce ~6 deltas each needing a ruling. **The ruled spec settles seven of the nine.** What is left is:

- **One PO question** — `commodityType` (D6), and it is already logged as pending PO sign-off.
- **One Sam call** — where `importType` lives (D7). Small.
- **Everything else is a build item or a non-issue**, with the ruling already on the record.

Two of PLAN §2.1's six findings are **wrong**, and one of those (whitelists) is wrong in a way that changes M2's design. See [§Corrections](#corrections-to-plan-21).

| #   | Delta                                   | Verdict                                                       | Who rules      | Oracle catches?     |
| --- | --------------------------------------- | ------------------------------------------------------------- | -------------- | ------------------- |
| D1  | `documents` topology                    | **Settled — A is right.** V4 permits 10. B must gain a group. | Nobody — ruled | No (structural)     |
| D2  | `maxEntriesFrom` + `requiredAtLeastOne` | **Settled — A is right.** B must gain cardinality vocabulary. | Nobody — ruled | No (structural)     |
| D3  | `regionCode` purge                      | **Settled — A is right.** B contradicts the ruling.           | Nobody — ruled | **Yes**             |
| D4  | `transitedCountries` mandate            | **Settled — A is right.** B is stale.                         | Nobody — ruled | **Yes**             |
| D5  | Whitelist membership                    | **Not a delta.** Same V4 lists, two stub vocabularies.        | Nobody         | Spuriously — see D5 |
| D6  | `commodityType`                         | **Open — PO sign-off outstanding.**                           | **PO**         | No                  |
| D7  | `importType`                            | Settled in scope; placement is a design call.                 | **Sam**        | No                  |
| D8  | `declaration`                           | Not a delta. Stays A's.                                       | Nobody         | No                  |
| D9  | `poApproved…` / `responsiblePerson…`    | Confirmed non-gaps.                                           | Nobody         | No                  |

---

## D1 — `documents`: B caps the user at one document · **blast radius: highest**

**A** — `features/documents/obligations.js:21-30`: a repeatable collection.

```js
export const documents = { id: 'documents', collection: true, item: [ …4 fields ] }
```

**B** — `obligations/obligations.js:822-853`: the same four fields as **notification-level singletons**, no `within:`. Verified: no group exists there at all. B's `presentGate` (`:812-820`) gets the all-or-nothing _rule_ right at the wrong _cardinality_.

**Authority — this is already ruled, and A is right.** `spec/journey-spec.json:1353-1365` declares `documents` as `"kind": "collection"`, sourced to `confluence-v4`, and the note states: _"max 10 documents (V4) stands — the design's 15 is flagged to design."_ Reaffirmed by `c-034` (`conflicts.json:308-312`) and `c-004` (`:35-38`, "the spec's documents collection stands as journey-level obligations").

**Recommendation:** B gains a `documents` group and the four fields move `within:` it. This is a `MODEL_EXTENDER` increment against B, scheduled **before `inc-008`** — the bridge cannot be designed against a topology that is about to change.

**Who rules:** **Nobody.** PLAN §2.1 frames this as a PO requirements ruling ("does V4 permit N documents?"). It is not — V4 permits 10 and the spec says so. It is a build item.

**Oracle:** **No.** `inc-010` compares scope/status/wipe over shared inputs; it cannot see a cardinality B has no vocabulary for. Fix before M2 or it is invisible until a user tries to add a second document.

---

## D2 — A-only structural keys on `unitRecord` · **blast radius: high**

**A** — `features/commodities/obligations.js:96-111`:

```js
requiredAtLeastOne: true,
requiredOneOf: ANIMAL_IDENTIFIER_GROUP,
maxEntriesFrom: numberOfAnimalsQuantity
```

**B** — `obligations/obligations.js:609-640`: `unitRecord` carries `requires.anyOfIds` (the same six identifiers — a true 1:1 with `requiredOneOf`) but **no floor and no cap**. B floors `commodityLine` only (`:449-452`, `requires.minEntries: 1`).

**Authority — ruled, and already built in A.** `c-031` (`conflicts.json:284-288`) resolves: _"Cap: identifier records are capped by the declared animal count… **New model capability: a collection cardinality link (max = sibling count field)** — MODEL_EXTENDER"_, and _"Floor: moves to PER-SPECIES — at least one identifier record per species at submit."_ `journey-spec.json:1339` records it as **implemented at `inc-063`, DESIGN-DELTA #15**.

So `maxEntriesFrom` is not an A quirk — it is a ruled V4 capability that A built and B lacks. `mapping.json` is right that `numberOfAnimalsQuantity → numberOfAnimals` "drops a second, structural role"; the spec confirms that role is load-bearing.

**Recommendation:** port both keys onto B (`MODEL_EXTENDER`, DESIGN-DELTA entry). The cap semantics to preserve, per `journey-spec.json:1339`: _cap resolved per line frame, `appendEntryAt` rejects at the cap, unanswered count = no cap, floor still bites at submit_. Count-drop must **block with a GDS error, never silently trim** (`c-031` item 4).

**Who rules:** **Nobody.** Ruled by `c-029`/`c-031`.

**Oracle:** **No** — same reason as D1.

---

## D3 — `regionCode` purge: B contradicts a Sam ruling · **blast radius: medium**

**A** — `features/origin/obligations.js`: `activatedBy {equals:'yes'}` + `wipeOnExit: true` ⇒ 'no' takes it out of scope and **destroys** the value.

**B** — `obligations/obligations.js:210-224`: retain-value. Always in scope; mandatory on 'yes', optional otherwise. B's comment (`:212-213`) asserts: _"Stored values are kept across gate flips (V4 spec: the field itself is not purged on `no`)."_

**Authority — `c-017` settles this, against B, by name.** `conflicts.json:152-157`:

> **Resolution:** _"Wipe on exit everywhere, confirmed: data whose determining condition flips out of scope is destroyed, not hidden. The skeleton's retained per-species values and **the v4-model branch's retained `regionCode` are not requirements**."_ — Sam, spec gate voice session 2026-07-07.

The ruling names B's retained `regionCode` explicitly and rejects it. **B's comment is wrong** — it cites V4 for a claim Sam ruled is not a requirement.

**Recommendation:** fix B on the way in — `equalsGate(regionCodeRequirement, 'yes', {inScope:true,status:'mandatory'}, {inScope:false})`. One line. Delete the misleading comment (it will otherwise be cited again).

**Who rules:** **Nobody.** Ruled 2026-07-07.

**Oracle:** **Yes** — guaranteed red, and it is the cleanest possible smoke test that `inc-010` works. Worth leaving B broken until the oracle exists, so it proves itself on a known-red case.

> **Note for the M0 gate:** PLAN §2.1 says this "touches ruling c-017, which the REPORT cites as arguing _for_ A's fused model". Whatever the REPORT does with `c-017`, its **resolution text** decides this delta outright. That is the fact worth carrying into `inc-004`.

---

## D4 — `transitedCountries`: opposite mandate, B is stale · **blast radius: medium**

**A** — `features/transport/obligations.js`: `required: true` once the land-transport gate opens.
**B** — `obligations/obligations.js:363-376`: `status: 'optional'` in the `whenTrue` branch.

**Authority — `c-038` settles this, against B.** `conflicts.json:358` item 3: _"Transit countries: … mandate resolves **REQUIRED** when meansOfTransport is Railway/Road Vehicle (design settles the recorded V4 tension toward required)."_ Corroborated at `journey-spec.json:106`: _"(transitedCountries was an example until the c-038 ruling made it required-when-active at M3-00.)"_

B's `optional` is not a disagreement — it is a snapshot of the V4 tension **before** `c-038` resolved it (2026-07-13). B predates the ruling.

**Recommendation:** flip B's `whenTrue` to `status: 'mandatory'` on the way in. One line.

**Who rules:** **Nobody.** Ruled 2026-07-13.

**Oracle:** **Yes** — guaranteed red.

---

## D5 — Whitelist membership: **not a delta** · **blast radius: low — but it reshapes M2**

PLAN §2.1 finding #4 says the whitelists "differ in _membership_, not just vocabulary", that "B's lists are V4-audited; A's predate the audit", and that this is "a **requirements** divergence wearing a vocabulary divergence's clothes". **All three claims are wrong.**

**A's lists are the spec's V4 list intersected with the stub's selectable commodities.** `services/commodities/stub.js:1` — `COMMODITY_OPTIONS = ['Cow', 'Horse', 'Cat', 'Dog', 'Fish']`. Five commodities. Check every list against `journey-spec.json`:

| Whitelist                 | Spec's V4 list (`journey-spec.json`)                          | ∩ `COMMODITY_OPTIONS`         | A's code (`stub.js`)                  | Match |
| ------------------------- | ------------------------------------------------------------- | ----------------------------- | ------------------------------------- | ----- |
| `earTag`                  | Cow, Pig, Sheep, Goats (`:1670-1675`)                         | `['Cow']`                     | `['Cow']` (`:91`)                     | ✅    |
| `tattoo`                  | Cat, Dog, Ferrets, Pigs, Bovine (`:1636-1642`)                | `['Cat','Dog','Cow']`         | `['Cat','Dog','Cow']` (`:89`)         | ✅    |
| `passport`                | 9 entries incl. donkeys, ponies, zebras, mules (`:1594-1604`) | `['Horse','Cow','Cat','Dog']` | `['Horse','Cow','Cat','Dog']` (`:87`) | ✅    |
| `cph`                     | 19 rows → 17 codes (`:1068-1088`)                             | `['Cow']`                     | `['Cow']` (`:99`)                     | ✅    |
| `containsUnweanedAnimals` | 0101, 0102, 0103, 010410, 010420 (`:709-713`)                 | `['Cow','Horse']`             | `['Cow','Horse']` (`:97`)             | ✅    |

**Five for five.** A's lists are not stale — they are the V4-audited list, deliberately intersected, and the invariant is **documented and ruled**. `journey-spec.json:1646` spells it out:

> _"Runtime alignment fixed at inc-057 (M3-19): the stub `TATTOO_COMMODITIES` is this list **intersected with the stored commodity vocabulary** — V4 '0102 - Bovine' maps to the stored value 'Cow'…; '01061900 - Ferrets' and '0103 - Pigs' are **not in COMMODITY_OPTIONS yet and join when commodities come from real MDM (c-018)**."_

And B is doing the same thing in the other direction — B's own comment (`obligations.js:643-644`): _"Subsets of the full V4 lists — **enough to exercise every pattern in tests**."_ B's `CPH_REQUIRED_COMMODITIES` (`:536-554`) even cites _the same Confluence page and the same 19→17 collapse_ the spec does.

**So: A and B read the same audited V4 lists and narrowed them against two different stub vocabularies.** There is no requirements divergence, nothing propagates, and nothing needs ruling. It dissolves at **`inc-007c`** (already scheduled, already ruled by `c-018`: MDM is the source of options) — once both sides pull real MDM commodities, both widen to the spec's lists automatically.

### Does the `earTag` gap propagate? Traced — **no, and even in B's vocabulary only two codes**

The brief asks how far the gap flows through the derived-complement gates on `identificationDetails`/`description`. Both sides derive a union rather than restating a complement (A: `notInUnionOf(TYPED_ANIMAL_IDENTIFIERS)`, `obligations.js:62-78`; B: `notInUnionOf(SPECIFIC_IDENTIFIER_WHITELISTS)`, `:731-762`). So:

- **In A's runtime vocabulary it propagates to nothing.** Union = `{Horse,Cow,Cat,Dog}`; complement within `COMMODITY_OPTIONS` = `{Fish}`. Widening `earTag` to Pig/Sheep/Goats changes the union by zero, because none of them are selectable.
- **In B's vocabulary it would move two codes, not four.** Union = `{0101, 0102, 0103, 010410, 010420, 01061900}`. Narrow `earTag` to `{0102}` and the union loses only **010410 (Sheep) and 010420 (Goats)** — `0103` (Pig) is masked by B's `tattoo` list (`:653-657`). Those two would flip _into_ `identificationDetails`/`description` scope.

Either way the derived union is self-healing by construction — which is exactly the property both sides built it for.

**Recommendation:** strike this from the gate agenda. Fold it into `inc-007c` as a verification step: after MDM delegation, assert each runtime whitelist equals its `journey-spec.json` list ∩ the live commodity vocabulary. That turns a documented convention into a test.

**Who rules:** **Nobody.**

### ⚠️ But it changes `inc-010`'s design — read this before M2

The oracle runs both engines **over the same answers**. A's gates compare `'Cow'`; B's compare `'0102'`. **Every commodity-gated obligation on both sides will go red for a vocabulary reason, not a behaviour reason** — masking the real deltas (D3, D4) the oracle exists to find.

So `inc-010` must **normalise vocabulary at the boundary before comparing**, and the normaliser must be independently tested — an untested normaliser can manufacture green. `COMMODITY_CODES` (`stub.js:3-10`) is the map, and it is **not injective**: `Cat` and `Dog` both map to `01061900`. Code→name is therefore lossy; **normalise A→B (name→code), never B→A**.

Also note PLAN §5.6's "A's vocabulary is not uniformly English display strings" is understated. It is not two vocabularies, it is **three**: bare display names (`'Cow'`), camelCase (`'internalMarket'`), and code-prefixed names in the spec/`PACKAGE_COUNT_COMMODITIES` (`'0103 - Pig (Domestic)'`, `stub.js:54`). `inc-010` must handle all three.

---

## D6 — `commodityType`: the one genuine PO question · **blast radius: low, but it is a V4 mandatory field**

**B** — `obligations/obligations.js:466-471`: `commodityType`, `within: commodityLine`, `status: 'mandatory'`. B's own comment concedes the ambiguity: _"Spec: 'Where applicable for given commodity, user is able to filter species by type.' Ambiguous whether Type itself is commodity-gated or whether that phrase describes UX for species filtering. Modelled as unconditional field record for now."_

**A** — no obligation. The commodity picker filters species directly.

**Authority — A resolved it deliberately, and the sign-off is outstanding.** This is not a B-only field A missed. It is A's `typeSelection`, and `c-037` (`conflicts.json:339-343`) resolves:

> _"**RESOLVED — drop `typeSelection`, pending PO sign-off.** The c-030 search-first multi-select subsumes the type filter's purpose. Page dropped from the journey; **the obligation stays in the spec marked pending-PO-drop until PO signs off dropping a V4 mandatory-to-proceed field.**"_

So the two sides resolved the same V4 ambiguity opposite ways, A's resolution is the ruled one, and the **only** thing standing between it and closure is a PO signature on dropping a field V4 marks mandatory-to-proceed.

**Recommendation:** do **not** port `commodityType`. Carry it into the retrofit exactly as the spec carries it — declared, marked `pending-PO-drop`, not collected. That keeps the retrofit consistent with the spec and keeps the field visible if the PO says no. If the PO rejects the drop, both sides need it, and B's declaration is then the head start.

**Who rules:** **the PO** — and this is the only PO item in the register. It is not a new question: it is `c-037`'s outstanding signature. **Chase it independently of this plan** — it blocks the spec, not just the retrofit.

**Oracle:** **No.** A has no counterpart to disagree with.

---

## D7 — `importType`: in scope, but where does it live? · **blast radius: low**

**A** — `features/import-type-filter`. The pre-journey filter deciding whether the live-animals journey applies at all.
**B** — nothing. B never modelled the filter step.

**Authority — ruled in scope.** `c-032` (`conflicts.json:295-296`): _"**RESOLVED — adopt the entry filter.** 'What are you importing?' becomes the service front door… Canonical field name set at M3-00: `importType`. Spec page `importTypeFilter` added."_

So B's silence is a B gap, not an A excess. But `c-032` rules the **field is in scope**; it does not rule **whether it is an obligation or a flow concern**. `mapping.json` poses exactly this ("keep as an A-side flow concern, or admit it to the model") and it is a live question: it gates journey _entry_ rather than describing consignment data, so it sits outside V4's field set.

**Recommendation:** **keep it an A-side flow concern; do not admit it to the model.** It describes routing, not the consignment, and admitting it forces the model to carry a value that no V4 field maps to and the mapper never sends. This also aligns with `inc-018`'s treatment of `enforcedAt` — flow-layer intent stays in `flow/`.

**Who rules:** **Sam.** Small, but genuinely a design call and not settled by any conflict. Recommend ratifying the above at `inc-004` in one line.

**Oracle:** **No.**

---

## D8 — `declaration`: not a delta

A-only. The submit-time declaration tick. B has no submit at all — zero routes, `SUBMITTED` a provably dead branch (PLAN §2.4). Nothing to reconcile: it stays A's, per `inc-016`. **No ruling needed.**

---

## D9 — `poApprovedReferenceNumber` / `responsiblePersonForLoad`: confirmed non-gaps ✅

The brief asked me to confirm. **Confirmed, on B's own evidence.**

`obligations/obligations.js:42-53` declares both as system-populated and **not presented in the flow layer**: `poApprovedReferenceNumber` is _"system-minted at notification creation time. Format `GBN-AG-YY-XXXXXX`"_; `responsiblePersonForLoad` is _"consumed from gov.identity on authentication"_. The comment states both are on `KNOWN_UNWIRED` in `obligations/coverage.test.js` **with a reason**, and that neither carries a domain entry because value legality is enforced upstream.

B declares them for V4 completeness. A doesn't model them because A's backend mints the reference and the mapper surfaces it. **Neither is a capability gap.** PLAN §2.1 finding #6 is correct, and `commodityType` (D6) is indeed the only real b-only item.

---

## Corrections to PLAN §2.1

Two of the six findings are wrong. Both errors point the same way — **§2.1 escalates settled facts into open rulings**, because it reasons from the two manifests without checking them against the ruled spec.

1. **Finding #1 (`documents`) — wrong about who decides.** §2.1: _"This is a **requirements ruling** (does V4 permit N documents?), not port/drop/defer."_ It is not a ruling. `journey-spec.json:1353-1365` says V4 permits **10**, and `c-034` reaffirms it. The PO has nothing to answer. The topology observation itself is correct and important — only its classification is wrong. **This is the finding that moved `inc-002`'s scope, and it did not need to.**

2. **Finding #4 (whitelists) — wrong on the facts.** _"B's lists are V4-audited; A's predate the audit"_ — no. Both sides read the same audited V4 lists (B's `cph` comment cites the same 19→17 collapse the spec does) and narrowed them against different stub vocabularies. A's five lists are **exactly** spec ∩ `COMMODITY_OPTIONS`, five for five, per a documented invariant (`journey-spec.json:1646`, `inc-057`). It is not "a requirements divergence wearing a vocabulary divergence's clothes" — it is a **vocabulary divergence wearing a requirements divergence's clothes**, and §2.1 has the disguise backwards. Nor does the `earTag` gap propagate (traced in D5).

Findings #2, #3, #5, #6 hold. #2 and #3 are sharper than stated: both are not merely "one side contradicts V4" but **B contradicting a dated Sam ruling** (`c-017`, `c-038`) — and in D4's case B simply predates it.

**The systemic note for `inc-004`:** the spec is a stronger authority than the corpus (`REPORT`/`BRIEF`/`MATRIX`), and it disagrees with the corpus in A's favour more often than the corpus admits. `conflicts.json` carries 40 dated rulings. Check it before escalating anything to Sam.

---

## What `inc-003` should know

1. **D3 and D4 are your test material.** PLAN §2.1 says the per-record-mandate question is "cheaper to settle" because #2 and #3 are concrete already-diverging rules. True — but note **both now resolve to "A is right, B is stale"** (`c-017`, `c-038`). They are evidence that B's manifest lags the rulings, not that B's _model_ can't express A's semantics. Do not mistake a stale value for a missing capability: B's `equalsGate` expresses A's purge fine (D3 is a one-line fix, not a model extension). **That is a data point in favour of §5.1's reading that Phase 5 is not a regression.**
2. **D2 is a real capability gap and it is ruled.** Unlike per-record mandate, `maxEntriesFrom` is not YAGNI-able — `c-031` ruled the cardinality link in and `inc-063` built it. If you are hunting "a rule A expresses and B cannot", **you have already found one**; it just isn't the per-record-mandate one. Worth stating plainly in `inc-003`'s conclusion.
3. **`pathPrefix` (§5.3): D1 arms the trap you are about to call latent.** §5.3's "latent, not live" rests on A's journey being depth-2 with all projecting gates at depth-1. That holds today. But D1 puts a `documents` group into B, and D2 puts a cardinality link on `unitRecord`. Re-check the depth claim **after** D1's shape is decided — a `documents` group is depth-1 and non-projecting, so it is probably still fine, but `inc-003` should say so explicitly rather than inherit the assumption. Fix `pathPrefix` at `inc-006` regardless, as planned.
4. **`multi` (§5.2): B's `species` is `status: 'mandatory'` with the array treated opaquely** (`obligations.js:473-480` — _"Multi-select; stored value is an array of species strings per line. The obligation model treats the array opaquely."_). Confirms §5.2: the widget→persistence coupling is entirely in `contract.js`/`field-widgets.js`, which we discard. The manifest itself is clean.
