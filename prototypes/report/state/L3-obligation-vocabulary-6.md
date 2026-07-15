# L3 adversarial verification — OV-6 (obligation-vocabulary)

**Claim under test.** B's most common obligation shape is code *because of a bug*: the
`field` branch of `buildImplication` dereferences `obligation.within.id` unconditionally,
so the "most natural data-only shape" — top-level `{ id, name, status: 'mandatory' }`
meaning "always in scope, always mandatory" — classifies as `field` and throws. That hole
is why 19 of 44 obligations are hand-written closures, and it is what drags B's
introspectable share to 18%.

**Verdict: REFUTED.** The bug is real. The *causal story built on it is false*, and the
causal story is the whole claim.

---

## 1. What the cited lines actually say (all verified)

- `obligations/evaluator.js:176-177` — `else if (o.status !== undefined && !o.applyTo)` →
  `'field'`. Key-shape classification, no `within` check. **Quote is accurate.**
- `obligations/evaluator.js:469-472` — `if (category === 'field') { const
  parentGroupFulfilmentIds = [...(fulfilmentIdsByObligationId.get(obligation.within.id) ??
  [])]`. No optional chain, no guard. A `field`-classified obligation with no `within`
  **would** throw `TypeError: Cannot read properties of undefined (reading 'id')`.
  **Quote is accurate; the latent bug is real.**
- `obligations/obligations.js` — 19 records carry
  `applyTo: () => ({ inScope: true, status: <mandatory|optional> })` (lines 156, 167, 177,
  183, 207, 240, 246, 252, 258, 264, 274, 314, 320, 326, 356, 362, 373, 383, 394 — 18
  `mandatory`, 1 `optional`: `internalReferenceNumber`:383). **Count is accurate.**
- `data-dictionary-sketch.js:31-36` — `if (!obligation.applyTo) return { kind:
  'always-in-scope' }; const meta = obligation.applyTo.metadata; if (!meta) return { kind:
  'custom-applyTo' }`. **Quote is accurate.** Note what it says: *no applyTo → data.*

So every quoted fact checks out. The claim then fails on the inference.

## 2. The counter-example: the data-only shape exists, and it is the EMPTY record

The claim asserts the natural data-only way to say "always in scope, always mandatory" is
`{ id, name, status: 'mandatory' }`. It is not. In B, it is `{ id, name }` — declare
neither key. Traced end to end:

| Step | Code | Result for `{ id, name }` |
|---|---|---|
| classify | `evaluator.js:166-183` | no `indexedBy`, no `applyTo`, `status` undefined, no children → **`single`** (never reaches the `field` branch) |
| scope | `runApplicabilityDecisions` `evaluator.js:285` (skips no-`applyTo`); `makeInScopeCheck` `:310-322` (`own` undefined → not false → ancestors → true) | **in scope** |
| purge | `purgeStorage` `evaluator.js:367-368` — `category === 'single'` → keep verbatim | **value retained** |
| implication | `buildImplication` `evaluator.js:453-455` — `return own ?? { inScope: true }` | `{ inScope: true }` |
| mandate | `engine/index.js:291-297` — `if (path === null) return impl.status ?? 'mandatory'` | **`'mandatory'`** |

That is exactly "always in scope, always mandatory", expressed in pure data, with zero
extra keys.

It is not an accident of implementation. It is **tested** — `evaluator.units.test.js:270`
(*"no applyTo entry → in scope (default true)"*) and `:644` (*"single-cardinality with no
applyTo entry → { inScope: true }"*) — and **documented**:

- `obligations.md:242`: *"**Scoping (in-scope / out-of-scope, mandatory / optional,
  reasons)** — NOT on the obligation. Computed by the evaluator."*
- `obligations.md:1495-1496`: *"Defaults to `'mandatory'` when the obligation is in scope
  but the record carries no explicit `status`."*
- `obligations.md:206-211` — the doc's own illustrative manifest shows `reasonForImport`
  as `{ id, name, cardinality: 'single' }`: **no `applyTo`, no `status`**. In the live
  manifest (`obligations.js:204-208`) the very same obligation carries the redundant
  closure.
- `obligations.js:9` — the manifest's own header states the convention: *"every obligation
  **with a conditional scope** uses `applyTo`"*. The 19 unconditional ones violate the
  author's own stated rule.

And `status` is documented as the **in-group leaf** mandate: the classifier comment
(`evaluator.js:162-163`) reads *"`'field'` — has `status`, no `applyTo`, no `indexedBy`
(always-in-scope-for-**parent-group** leaf)"*, and the doc's illustrative field record
(`obligations.md:224-230`) carries `within` + `status` together with the comment *"field
record — no applyTo; classified as `field`"*. Top-level `status` is outside the documented
vocabulary, not "the most natural shape".

## 3. Therefore the 19 closures are redundant boilerplate, not a bug workaround

For 18 of the 19 (every `status: 'mandatory'` one), deleting the `applyTo` line is a
**behaviour-preserving deletion**. Checked every consumer of scalar mandate: the only two
are `contract.js:316` (`isSufficientForProceed`) and `engine/index.js:393`
(`classifyEntries`), and **both** go through `effectiveStatus`, which defaults to
`'mandatory'` (`engine/index.js:294`). Nothing reads `impl.status` directly. Nothing reads
`impl.records` for a `single`. `entryInScope` short-circuits on `path === null`
(`engine/index.js:306`).

The consequence for the 18% figure is the opposite of what the claim says. Per
`data-dictionary-sketch.js:32`, **`!obligation.applyTo` reports as `{ kind:
'always-in-scope' }` — a data answer, not `custom-applyTo`**. Delete the 18 redundant
closures and 18 rows flip from opaque to introspectable, with no engine change at all:

- today: 8/44 metadata-serialisable + 6 no-`applyTo` = 14/44 introspectable, 30 opaque.
- after an ~18-line deletion: 32/44 (~73%) introspectable; the residue is
  `branchedGate` ×9, `allowListedByPredicate` ×2, `internalReferenceNumber` ×1.

So B's code-shaped majority is an artefact of **unexamined style**, not of a structural
hole, and the remedy is a deletion, not an engine fix. The claim inverts both.

## 4. What survives — the true, much smaller finding

Two real things:

1. **The unguarded deref is a live trap, reachable by exactly one legitimate shape: an
   always-in-scope *optional* scalar.** `{ id, name }` gives you `mandatory` (the default);
   there is no data key that gives you `optional`, because `{ id, name, status: 'optional'
   }` classifies as `field` and throws at `evaluator.js:471`. That forces
   `internalReferenceNumber` (`obligations.js:380-384`) to be a closure. **One obligation
   of 44, not nineteen.**
   (Note it is not fixable by a null-guard alone: the `single` branch —
   `buildImplication:453-455` — never reads `obligation.status` either, so a guarded
   `field` branch or a `status`-aware `single` branch is needed for the implication to
   carry it.)

2. **A one-deletion-away crash.** `poApprovedReferenceNumber` (`obligations.js:152-157`)
   and `responsiblePersonForLoad` (`:163-168`) carry **both** `status: 'mandatory'` **and**
   the redundant closure. They are `single` only because `applyTo` wins the classifier race
   (`evaluator.js:174-177`; pinned by `evaluator.units.test.js:123-125`). Delete their
   now-redundant `applyTo` — the obvious cleanup — and they reclassify as `field` and throw.
   That is the trap worth reporting.

## 5. What I searched to try to save the claim

- Whole-tree grep for `applyTo` in `obligations.js`, `coverage.test.js`,
  `evaluator.units.test.js` — no test or lint rule requires an `applyTo`; the manifest
  header explicitly scopes it to *conditional* obligations.
- grep for every consumer of obligation/implication `status`: `contract.js`,
  `engine/index.js`, `lib/` — only `effectiveStatus` (2 call sites), which defaults
  mandatory.
- Read `obligations.md` §Key properties (:234-249), §effectiveStatus (:1480-1508),
  §illustrative manifest (:198-232) hunting for a stated rationale that would make the 19
  closures necessary. Found the reverse: the doc's own example omits them.
- Checked whether `single` + no-`applyTo` breaks purge, in-scope, or page status. It does
  not (`purgeStorage:367`, `makeInScopeCheck:310`, `entryInScope:306`).

I could not find any mechanism that makes the 18 mandatory closures load-bearing. The
prior that "the closures exist because the data shape throws" does not survive:
**the data shape that works is the one with no keys at all, and the author documented it,
tested it, and then didn't use it.**
