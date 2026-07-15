# L3 — collections-cardinality — claim C4 — **AMENDED**

**Claim under test:** "A cannot hold a durable reference to a collection item. A's entire path
layer is positional … A cannot separate [identity from ordinal] without rewriting `lib/path.js`,
`engine/write.js` and the instance-path key space in `reconcile.js`."

Paths relative to:
- A: `clone-live-animals/prototypes/standalone/live-animals/`
- B: `clone-flow-layer/prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

---

## 1. Step 1 — the cited evidence is real (all of it)

| Citation | Verified | Notes |
|---|---|---|
| A `lib/path.js:1-10` `pathKey` → `${key}[${segment}]` | ✅ exact | positional key space, as stated |
| A `lib/path.js:39` `parent.splice(leaf, 1)` | ✅ exact | but see §3 — **not reachable from production code** |
| A `lib/path.js:47-57` `wipeOrder` descending sibling indices | ✅ exact | `:51-52` returns `pathB[i] - pathA[i]`; `:56` also orders **deepest-first** |
| A `consignment-details.controller.js:142` `#identification-card-${index}` | ✅ exact | and it is not alone — `check-answers/controller.js:237`, `animal-identification.controller.js:337,371` all anchor by index |
| A `engine/write.js:71` `keyOf` on `reconcileEntriesAt` | ✅ exact | see §2 — the claim's reading of this is where it breaks |
| B `features/units/controller.js:121-130` session-monotonic ids | ✅ exact | quoted verbatim |
| B `features/units/controller.js:115-119` `lineDisplayIndex` findIndex | ✅ exact | |

Entry removal really is a splice: `engine/write.js:55` `list.toSpliced(index, 1)`. So the
factual base — *A's store is a nested array, deleting an entry renumbers its siblings* — is
true and I am not contesting it.

Three of the claim's four load-bearing inferences from that base do not survive.

---

## 2. Counter-example 1 — A **already holds** a durable, non-positional reference to a
commodity line, and the delete URL is keyed by it

`features/commodities/search.controller.js:11-14`:

```js
/** One commodity line = one commodity plus ONE species (inc-062). The pair is
 * the line's identity for batch reconcile. */
export const lineKey = (line) =>
  `${line.commoditySelection}|${line.speciesSelection}`
```

That key is threaded straight into the **engine** (`engine/write.js:62-78`), which does
identity-preserving reconciliation of the whole entry subtree — nested `animalIdentifiers`
records included — across a full rebuild of the list in arbitrary order:

```js
const existingByKey = new Map(list.map((entry) => [keyOf(entry), entry]))
const next = entries.map((entry) => existingByKey.get(keyOf(entry)) ?? entry)
```

And the commodity-lines **remove route is not index-keyed** —
`consignment-details.controller.js:193,203`:

```js
path: pagePath(`${page.slug}/{commodity}/remove`)
(entry) => entry.commoditySelection !== request.params.commodity
```

So for the collection the claim actually argues about, A's reference **survives renumbering**:
a line's identity, its URL and its entire nested data subtree are all keyed by content, not by
ordinal. "A cannot hold a durable reference to a collection item" is false as stated — A holds
one, in the engine, today.

The honest weakness (which the amended claim keeps): it is a **natural** key, not a surrogate.
It is unstable under an edit *to its own identifying fields* — change a line's species and the
old key vanishes, so `reconcileEntriesAt`'s map drops the entry and its identifier records go
with it. B's surrogate ids are stable under any edit. That is a real difference — but it is a
difference between two identity schemes, not between "has identity" and "has none".

---

## 3. Counter-example 2 — `wipeOrder`'s index-shift branch is **dead in production**, so it
cannot be "the workaround whose existence is the proof"

`deleteAt`'s splice branch (`path.js:39`) fires only when the **leaf** path segment is a number.
Trace where wiped paths come from:

- `reconcile` (`engine/evaluate/reconcile.js:32-45`) maps `wiped` from `nodes`' `path`.
- `walk` (`registry.js:51-52`) yields `path = [...basePath, obligation.id]` — **the leaf is
  always a string obligation id**. Numeric segments only ever appear *interior* to a path
  (`registry.js:63`, `itemFramePath = [...path, i]`).

So `destroyWiped` — the sole production caller of `deleteAt` (`engine/write.js:15,58,75`) —
never presents a numeric leaf, and the `splice` branch never runs. Wiping never deletes an
*entry*; it deletes leaf fields. Entry deletion goes through `removeEntryAt`'s
`list.toSpliced()` (`write.js:55`), a single splice with no ordering problem.

The only things that exercise `wipeOrder`'s descending-index branch are synthetic unit tests
that hand `destroyWiped` entry-index keys directly (`lib/path.test.js:88-129`:
`['commodityLines[0]', 'commodityLines[1]']`) — paths `reconcile` cannot emit. `wipeOrder` also
carries a second, live concern the claim ignores: `:56` `pathB.length - pathA.length` orders
deepest-first, a nesting concern, not an index concern.

`wipeOrder` is defensive code with a test suite. It is not evidence of an identity crisis.

---

## 4. Counter-example 3 — the retrofit cost is wrong. Surrogate identity in A needs **zero**
engine change, not a rewrite of three engine files

The claim's cost assertion is the most testable part, and it is false.

1. **The engine cannot see extra entry fields.** `walk` (`registry.js:44-71`) enumerates only
   the **declared obligation forest**; it reads entries via `valueAt(answers, path)` and then
   recurses over `obligation.item`. `entryComplete` and `collectionView`
   (`engine/evaluate/collection-view.js:11-16`) do the same. An undeclared `id` key on an entry
   is **invisible** to `reconcile`, `complete`, `status` and `cardinality`.
2. **The engine already takes an identity function as a parameter.** `keyOf` is an argument of
   `reconcileEntriesAt` (`engine/write.js:66`). Passing `(e) => e.id` instead of `lineKey`
   requires no engine edit at all.
3. **Persistence would not leak it.** `services/persistence/records/notification-mapper.js`
   builds payloads by explicit field selection (`compact({ passport: unit.animalIdentifierPassport,
   … })`), so a surrogate `id` on an entry is dropped at the boundary by construction.
4. **No derived state survives a delete to go stale.** `reconcile(answers)` is recomputed fresh
   on every write (`write.js:14,57,74`) and `makeScope(answers)` on every read. The positional
   instance-path key space is **transient internal addressing of a nested document**, not a
   persistent reference space. Renumbering invalidates nothing the engine holds; it invalidates
   only references held *outside* the document — URLs and anchors.

Therefore the port is: mint `id` in the seed (`search.controller.js:97-105`, and the two other
add paths), pass `(e) => e.id` as `keyOf`, and resolve id → index with `findIndex` at reference
sites. That last step is **exactly B's `lineDisplayIndex` (`features/units/controller.js:115-119`)
inverted**. It touches controllers, not `lib/path.js`, not `engine/write.js`, not `reconcile.js`.

This is the textbook "conflates *not built* with *cannot be built*" failure the method warns
about. A's model would accept surrogate identity without noticing.

---

## 5. Counter-example 4 — the forward-looking justification points the wrong way

The claim closes: *"an amend-and-resubmit that diffs against a persisted notification needs an
entry id A's model has no vocabulary for."*

- B's ids are a **yar session counter** (`lib/state.js:84` "Session-scoped counter for the next
  line id"; `:167` "session-scoped monotonic counter per line"). The claim itself concedes
  "session-monotonic". They do not survive the session.
- **B has no persistence, no backend mapping and no submit at all.** B therefore has *no*
  persistence-durable item identity either.
- A **ships** amend-and-resubmit (`engine/journey.js:97-102`, `records.amend(journeyId)`) —
  without an entry id, because the backend notification schema has no per-item id vocabulary to
  diff against in the first place. That is a schema fact about the target system, not a model
  fact about A.

Neither side has what this sentence asks for. It is not an asymmetry.

---

## 6. What IS true (and belongs in the shopping list)

- A's **reference** layer is predominantly positional *by convention*: index-keyed remove routes
  for two of three collections (`documents/controller.js:354` `accompanying-documents/{index}/remove`;
  `animal-identification.controller.js:562` `{line}/{unit}/remove`), and index-keyed CYA/error
  anchors (`consignment-details.controller.js:142`, `check-answers/controller.js:237`,
  `animal-identification.controller.js:337,371`). Delete a line, and a held URL or anchor
  retargets. That is a real defect — it is just a *convention* defect, not a *model* one, and A's
  own commodity-lines collection already demonstrates the fix.
- B makes surrogate identity an **engine-level fact**: the storage key **is** the id
  (`fulfilments[obligation.id]['line1/unit1']`), so every reference is identity-keyed by
  construction and the ordinal is derived on demand. You cannot accidentally hold a positional
  reference in B. In A you must remember not to. That is the genuine, defensible B win here, and
  it is a *right-by-construction vs right-by-discipline* win, not a can vs cannot.

---

## 7. Verdict

**AMENDED.** The direction is right and the base fact (nested arrays, splice-renumbering) is
solid, but the three inferences the claim rests its weight on are false: A *does* hold a durable
non-positional entry reference in the engine today; `wipeOrder`'s index-shift branch is
unreachable from production and so proves nothing; and the retrofit is controller-level, not a
rewrite of `lib/path.js` + `engine/write.js` + `reconcile.js`. The persistence/amend argument
favours neither side.
