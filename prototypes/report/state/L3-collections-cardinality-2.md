# L3 — Adversarial verification — collections-cardinality — CLAIM C2

Clone: `clone-live-animals` @ b6ac2ed, root `prototypes/standalone/live-animals/`.
All paths relative to that root.

**CLAIM:** A's `maxEntriesFrom` cardinality link is half-declarative, half-imperative: 12 lines
of logic, ONE carrier, ONE enforcement point, MAX-only, one-directional — the inverse check is
20 LOC of hand-written controller code building its own GDS error text.

**VERDICT: AMENDED.** Every one of the five factual assertions survives contact with the source —
I could not break any of them. But the claim is *understated* on the imperative surface and,
more importantly, **mis-diagnoses the cause**. The one-directionality is not a cardinality-specific
design choice that a `minEntriesFrom` key would fix. It is forced by a structural fact about A's
engine that the claim never names.

---

## 1. Citation-by-citation verification — all five hold

| Assertion | Cited at | Verified? |
|---|---|---|
| "12 lines of logic" | `engine/evaluate/cardinality.js:20-31` | **YES.** `collectionCapAt` is exactly lines 20–31. The whole file is 31 lines, 19 of which are import + JSDoc. |
| "ONE carrier" | `features/commodities/obligations.js:110` | **YES.** `grep -rn maxEntriesFrom` over the entire tree returns exactly one carrier in `.js` source (`obligations.js:110`). Every other hit is docs (`DESIGN-DELTA.md`, `docs/obligation-model.md`), spec JSON, or the engine's own definition/re-export. |
| "ONE enforcement point" | `engine/write.js:23-24` | **YES**, in the strict sense: `if (cap !== null && list.length >= cap) return null` is the only place the cap blocks a mutation. See §2 for the important nuance. |
| "MAX-only (1 record for 100 animals is complete)" | `DESIGN-DELTA.md:706-708` | **YES — and the code honours the doc.** The doc says "The cap is a MAX only: completeness and status semantics are untouched (1 record for 100 animals still passes)". `cardinality.js` is imported by exactly two files (`engine/write.js:3`, `engine/index.js:14`). `complete.js` and `status.js` never import it. Completeness genuinely ignores the cap. **This is not a doc credited over code — I checked.** |
| "inverse = 20 LOC hand-written GDS error text" | `features/commodities/consignment-details.controller.js:126-145` | **YES.** `countDropIssues` is lines 126–145 inclusive = 20 lines. It hand-builds its own error text at `:138` and its own summary `href` at `:139-142` (`#identification-card-${index}`). Called from exactly one place (`:161`). |

**Mechanical proof of one-directionality.** The count field is written by `updateEntryAt`
(`consignment-details.controller.js:178` → `engine/write.js:30-46`). `updateEntryAt` is **not
cap-aware and does not reconcile**. So the engine will happily let you set
`numberOfAnimalsQuantity = 1` on a line holding 5 identifier records. Nothing in the model
resists it. Only `countDropIssues` — controller code — does.

---

## 2. Counter-example hunt (what I searched for and failed to find)

I tried to break the claim four ways. All four failed:

1. **A second carrier of `maxEntriesFrom`?** None. Single grep over the whole tree.
2. **A second engine enforcement point** — a submit gate, a completeness check, a CYA assert?
   None. `collectionCapAt` has four consumers total: `write.js:23`, the `engine/index.js:14`
   re-export, and three reads in `animal-identification.controller.js` (`:325`, `:424`, `:519`).
   Nothing in `complete.js`, `status.js`, `submitJourney`, or check-answers.
3. **A declarative inverse** — `minEntriesFrom`, `entriesEqual`, a `requires`-style key? No such
   key exists anywhere in the vocabulary. The cardinality vocabulary is closed at two facts
   (`requiredAtLeastOne`, `maxEntriesFrom`).
4. **A generic engine error surface `countDropIssues` could have used instead?** **None exists.**
   This is the finding — see §3.

**Where the claim is UNDERSTATED (in A's disfavour).** The claim costs the imperative half at
20 LOC (`countDropIssues`). The true imperative surface of this one cardinality link is roughly
**50 LOC across two controllers**, because the cap *also* drives hand-written UI and error copy:

- `animal-identification.controller.js:325-360` — `buildCard` re-reads the cap to derive `atMax`,
  suppress the entry form (`fields: atMax ? [] : ...`), suppress the address block, and hand-write
  the max-reached text (`:342`).
- `:424-432` — `post` re-reads the cap per line to build `atMaxByIndex`.
- `:466-476` — the stale-at-cap race error, with hand-written copy (`:472`).
- `:517-528` — the post-append rejection handler, re-reading the cap a *third* time to hand-write a
  **near-duplicate** of the same string (`:526` vs `:472`).

Two hand-maintained copies of the same cap-error sentence, in the same file, is the tell.

**Also uncapped:** `reconcileEntriesAt` (`write.js:62-78`) and `updateEntryAt` (`write.js:30-46`)
never consult `collectionCapAt`. The cap guards the *append* path only. Not a live bypass today
(the only capped collection is only ever appended to), but the primitive is unguarded.

---

## 3. The real diagnosis the claim misses: A's engine has NO error-emission surface

The claim treats "half-imperative" as a property of `maxEntriesFrom`. It is not. It is a property
of **A's engine**, and the cardinality link merely exposes it.

`engine/index.js` is 15 lines and exports the engine's *entire* public surface:

```js
export { get, makeScope } from './read.js'
export { commit, appendEntry, appendEntryAt, updateEntry, updateEntryAt,
         removeEntry, removeEntryAt, reconcileEntriesAt, submitJourney } from './write.js'
export { collectionView } from './evaluate/collection-view.js'
export { collectionCapAt } from './evaluate/cardinality.js'
```

There is **no error type, no error list, no message, no diagnostic** anywhere in it. The engine can
express "no" in exactly one way: **refuse a mutation** (`appendEntryAt` returns `null`, store
untouched). It has no channel through which to hand a page a field-level error.

All validation lives in `lib/validate/` — per-page, imperative `compose(...)` chains assembled by
each controller (`consignment-details.controller.js:23-39`). **No validator consumes an obligation's
cardinality facts.** I checked the one grep hit that looked like a counter-example:
`lib/validate/validators.js:74` `requiredOneOf(name, values, message)` is a **name collision** — a
page-level "this field must be one of these values" validator, unrelated to the obligation model's
`requiredOneOf` group key.

The obligation model's own cardinality facts reach only two consumers, and **neither emits a message**:

- `engine/status.js:24` — `Boolean(obligation?.required || obligation?.requiredAtLeastOne)` → drives
  the OWED/status roll-up.
- `engine/evaluate/complete.js` — drives FULFILLED/IN_PROGRESS.

Status. Never text. So **every model-derived constraint in A that needs a user-facing message is
hand-written**, not just this one:

- the `requiredAtLeastOne` floor → hand-written at `animal-identification.controller.js:481-486`
  (`'Enter at least one identifier for this animal'`).
- the `maxEntriesFrom` cap → hand-written twice (`:472`, `:526`).
- the inverse of the cap → hand-written (`countDropIssues:138`).

### Why this changes the shopping list

The inverse constraint is **not a mutation-block**. It is a *validation error on a scalar field, on
a different page, derived from a collection's length*. A's engine can only enforce facts by refusing
writes, and `commit` (`write.js:11-18`) has no cardinality hook at all. So a declarative
`minEntriesFrom` key **would have nowhere to report**. You cannot fix A's one-directionality by
adding a key to `cardinality.js`; you must first give A's engine an error-emission surface — which
is a new engine concept, not a new obligation key.

This is exactly the slot B fills with `groupInvariantErrors` (`engine/index.js:512-539`, per L2),
whose per-instance errors already fold into the status classifier. It corroborates L2 §4.2's
recommendation from an angle L2 did not use: the reason "port cardinality into B's `requires` slot
and get both directions for a single declaration" works is not that B's `requires` is a nicer key —
it is that **B has somewhere for a violated constraint to surface, and A does not.**

---

## 4. What survives, precisely

The claim is directionally right, factually accurate on all five citations, and if anything generous
to A on volume. It is amended only because its diagnosis stops one level too shallow, and the deeper
level is the one that determines retrofit cost.
