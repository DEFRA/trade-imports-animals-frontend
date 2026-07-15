# L3 — session-state — claim SS-3 — VERDICT: REFUTED

**Claim under test:** "A's persistence ports expose no per-key delete surface at all, making 'a page cannot hand-roll a delete' an invariant enforced by construction; B has no such invariant because `writeAnswer` deletes keys straight out of the map."

Paths below are relative to:
- A: `clone-live-animals/prototypes/standalone/live-animals/`
- B: `clone-flow-layer/prototypes/journey-config-spikes/EUDPA-249-flow-layer/`

---

## 1. What the cited source actually says (the quotes are real)

- `engine/persistence/records.js` read in full (49 LOC). Verb set is exactly `create / load / list / has / saveAnswers / finalise / amend / clear` (lines 8–17, re-exposed 23–48). **No `delete`/`unset`/`removeKey` verb.** TRUE.
- `engine/persistence/session.js` read in full (51 LOC): `userId / activeJourneyId / setActiveJourney / knownJourneyIds / addKnownJourney / clearActive / openingRun / setOpeningRun`. `clearActive` (line 42) *is* a delete verb, but of the session pointer, not of an answer. Fine.
- `lib/path.js:33-41` `deleteAt`, `:59-63` `destroyWiped`. `destroyWiped` is imported by exactly one production module — `engine/write.js:6` (grep over the whole tree for `from '.*lib/path.js'`: the only other importer of `destroyWiped` is `engine/evaluate/cross-frame.test.js:5`). TRUE.
- B `lib/state.js:53-61` — `writeAnswer` does `delete fulfilments[obligation.id]` / `delete stored[path]` on `value === undefined`. TRUE. The four bespoke collection fns (`:120-162`, `:206-222`, `:176-184`) delete keys too. TRUE.

So every *quoted fact* checks out. The **inference** does not.

## 2. Refutation A — whole-map replace is a SUPERSET of per-key delete

`records.saveAnswers(journeyId, answers)` writes whatever map it is handed. Omitting a key **is** the delete. Removing the delete verb removes no capability; it only changes how deletion is spelled.

And the whole-map writer is not sealed off from pages:

- `engine/store.js:5-12` re-exports it raw: `store = Object.freeze({ … saveAnswers: records.saveAnswers, clear: records.clear })`. A's own tests use it to overwrite the entire answers map (`store-ops.test.js:65-66, 84-86, 149-151, …`).
- `engine/journey.js:73` `export const saveJourneyAnswers = async (request, journeyId, answers) => …` — exported, memo-aware, whole-map.
- There is **no import boundary**: grep for `no-restricted-imports` / `boundaries` / `import/no` across the prototype tree and the repo eslint config returns **zero** rule hits (only prose in `DESIGN-DELTA.md`, `docs/`). And feature code already imports straight out of the port module today — `features/confirmation/controller.js:2` and `features/dashboard/controller.js:2` both `import { SUBMITTED } from '../../engine/persistence/records.js'`. The path is open, not closed.

A page that wanted to hand-roll a delete would write `store.saveAnswers(journeyId, rest)` and nothing — no type, no lint rule, no architecture test — would stop it. "Enforced by construction" is false; it is enforced by convention, exactly as in B.

## 3. Refutation B — pages ALREADY hand-roll deletes, in the shipped source

The page-facing verb set (`engine/write.js`) is not delete-free, and the deletion *decision* is page-authored:

- `features/commodities/consignment-details.controller.js:190-197` — `getRemove` **filters the persisted array itself** — `const kept = (answers.commodityLines ?? []).filter(entry => entry.commoditySelection !== request.params.commodity)` — and hands the shortened list to `reconcileEntriesAt`. That destroys a commodity line and every nested `animalIdentifiers` record under it. That is a page hand-rolling a delete, today, in production code.
- `features/commodities/search.controller.js:134-140` — same shape, page-computed `selected` list; the source comment at `:131-133` says outright "a deselected species' line is removed with wipe semantics."
- `features/documents/controller.js:311` — `state.removeEntry(request, h, 'documents', index)`. A page-callable deletion verb.
- `commit` (`engine/write.js:11-18`) is a **shallow** merge — `{ ...journey.answers, ...patch }` — so any object/array-valued patch key replaces a whole subtree and deletes every sub-key absent from it. `features/contact/controller.js:61-63` commits a whole `contactAddress: { name, address }` object. `store-ops.test.js:152-158` shows `commit(…, { commodityLines: [ … ] })` is a sanctioned call — so `commit(request, h, { commodityLines: [] })` is a page-level "delete everything" that the port shape does nothing to prevent. A patch value of `undefined` likewise erases the answer (key survives in memory as `undefined`, is dropped on JSON serialisation to Mongo, and `valueAt` cannot tell it from absent).
- `updateEntryAt` (`engine/write.js:30-46`) replaces an entry **wholesale** with a page-supplied object **and does not run reconcile**. `consignment-details.controller.js:178-184` is safe only because the author remembered `...entry`. Drop that spread and the page silently deletes every other field of the entry. Convention again, not construction.

## 4. Refutation C — "destroyWiped is the only deletion path in the app" is false

`removeEntryAt`'s `toSpliced` (`write.js:55`), `reconcileEntriesAt`'s keyed rebuild (`write.js:71-73`, drops any entry whose `keyOf` is absent from the page-supplied list), and `commit`'s subtree replacement all destroy persisted answers **without touching `destroyWiped`**. What is actually true is the much narrower: *`deleteAt` has exactly one caller, so the scope-exit wipe is the only **key-level unset** in A; all other deletion in A is structural (whole entry / whole subtree / whole map).*

## 5. Refutation D — the contrast with B is void: B centralises identically

`lib/state.js:8` docstring: "All reads/writes go through this module; the controller never touches `request.yar` directly." Grep confirms it: every `request.yar` and every `writeFulfilments(` call site outside `lib/state.test.js` is **inside `lib/state.js`** (only other hit is a comment in `controller-sketch.js:98`). B's page-facing surface is `writeAnswer / addCommodityLine / deleteCommodityLine / addUnitRecord / deleteUnitRecord / resetState`. A B page hand-rolls a delete exactly as much as an A page does: it calls a state-module verb that deletes. And `writeFulfilments` is `export`ed (`lib/state.js:30`) precisely as A's `saveJourneyAnswers` is — same escape hatch, same absence of a lint boundary.

The real difference is **spelling**, not structure: A says "hand me the map/list/entry with the key gone", B says `delete map[key]`. Neither is an invariant; both are conventions held by one module.

## 6. What survives (the residual, and it is worth carrying to the merge)

- A's port taking only a **complete map** does make it easy to hold the property "every persisted document is a full engine-produced map, so a reconcile pass can always run on the write path". That is a genuine (if modest) shape advantage over B, where a delete lands on a sub-key with no pass over the rest of the map. **But A does not actually hold it either**: 2 of 5 write verbs — `appendEntryAt` (`write.js:20-28`) and `updateEntryAt` (`:30-46`) — skip `reconcile`/`destroyWiped` entirely (L2 already concedes this).
- `deleteAt` having exactly one caller is real and cheap to preserve.

## 7. Method — what I searched

- Read in full: A `engine/persistence/records.js`, `engine/persistence/session.js`, `engine/store.js`, `engine/journey.js`, `engine/write.js`, `lib/path.js`; B `lib/state.js`.
- `grep -rn` over A's whole prototype tree for: importers of `lib/path.js` / `engine/write.js` / `persistence/records.js` / `persistence/session.js` / `saveJourneyAnswers`; every call site of `commit(` / `appendEntry` / `updateEntry` / `removeEntry` / `reconcileEntries`; every occurrence of `undefined` in `features/` and `shared/`; every `clear` usage; every `no-restricted-imports` / `boundaries` / `import/no` rule.
- `grep -rn` over B's tree for `request.yar` and `writeFulfilments(` to test whether B's deletes really are page-level (they are not).
- Read the relevant slices of `features/commodities/consignment-details.controller.js`, `features/commodities/search.controller.js`, `features/contact/controller.js`, and `store-ops.test.js`.
