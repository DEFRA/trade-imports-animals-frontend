# L3 — Adversarial verification — ST-3 (status-tasklist)

**Verdict: AMENDED.** The mechanism survives — I tried hard to break it and could not.
The *valuation* ("buys nothing B lacks", "a repair for a constraint A chose") does not
survive: it is false at one concrete case, and it prices A's constraint as pure self-harm
when the constraint buys two boot-time invariants B has **no equivalent of anywhere**.

---

## 1. Every cited line opened and checked. All real.

| Cited | Status |
|---|---|
| `flow/dispatch.js:44-52` two-owner throw | **REAL.** `if (pageOfObligationMap.has(obligationId)) throw ... "is collected by two pages"` |
| `flow/dispatch.js:15-24` derived ownership at depth | **REAL.** `ownerOfObligation` strips `[\d]`, then walks dotted-prefix ancestors until a page owns one. |
| `docs/limits.md:50-52` | **REAL, verbatim.** "…you cannot redirect ownership of one field at depth to a different page." |
| `features/commodities/animal-identification.controller.js:20` | **REAL.** `export const meta = { ...page, collects: [] }` |
| `flow/task-rows.js:55-56` | **REAL.** `rowParts = (row) => row.parts ?? row.pages.flatMap((page) => collectsOf(page.id))` → `[]` → `statusOf([])` → `inScopeParts.length === 0` → `NA` (`engine/status.js:60-61`). |
| `flow/task-rows.js:29, :36` — the two facet literals | **REAL, and they are the only two in the whole tree** (`grep -rn "collection:" flow/ features/` returns exactly these two, plus the three obligation declarations). |
| `engine/status.js:11-57`, `engine/evaluate/complete.js:5-24,58-63`, `engine/status.test.js:66-91` | **REAL.** Facet primitive, `includesMember` filter (incl. the `groupOwned` guard at `complete.js:13-22` so a facet doesn't wrongly enforce a `requiredOneOf` none of its members belong to), agreement invariant. |
| B: `flow/flow.js:429-483` vs `:493-563` | **REAL.** `commodity-lines-details` (5 pages, `forEachOf commodityLine`) vs `per-unit-records` (7 pages, `forEachOf unitRecord`). `containerStatus` re-derives per subtree (`engine/index.js:469-494`) — no facet primitive anywhere. |

**Bonus finding the claim missed, which strengthens it:** the wound occurs **twice**, not once.
`features/commodities/consignment-details.controller.js:14` *also* declares `collects: []` —
a second page over `commodityLines` that can own nothing.

## 2. Counter-example hunt on A — could A do this without the facet? No. And the real cause is worse than the claim says.

I tried three escapes and all fail:

- **`collects: ['animalIdentifiers']` on the animal-identification page.** No throw, but a dead
  key: `ownerOfObligation` looks up *dotted template paths* (`commodityLines.animalIdentifiers.…`),
  never the bare id. Silent no-op.
- **`collects: ['commodityLines.animalIdentifiers']` (dotted).** `buildDispatch` **would accept
  this** — the `ID_UNSAFE` check at `dispatch.js:33-39` validates registry obligation *ids*, not
  `collects` entries; the two-owner check compares exact strings so `'commodityLines'` and
  `'commodityLines.animalIdentifiers'` never clash; and `ownerOfObligation`'s prefix walk would
  resolve it. **So `docs/limits.md:52`'s "cannot" is stronger than the dispatch code actually is
  — the claim credits a doc the code does not fully honour.** But it still fails downstream, for a
  *different* reason than the claim gives: `inScope` is keyed by **instance path keys**
  (`engine/evaluate/reconcile.js:14`, `pathKey(path)` → `commodityLines[0].animalIdentifiers`), so
  `inScope.has('commodityLines.animalIdentifiers')` (`status.js:60`) is false → NA; and the derived
  gate (`flow/gates.js:19`) fails the same way.
- **A task row with `parts: ['animalIdentifiers']`.** Fails twice over: `inScope` has no such key,
  **and** `registry.byId` is built from the top-level forest only (`registry.js:30` —
  `new Map(all.map(o => [o.id, o]))`, where `all` is the flat list of feature exports, and
  `features/commodities/obligations.js:126` exports only `[commodityLines]`). `byId('animalIdentifiers')`
  is **undefined**.

So the facet is genuinely forced — but by A's **address-vocabulary split** (`limits.md:39-46`:
template addresses vs instance path keys) plus root-only `registry.byId`, not merely by the
two-owner throw. **Deleting the throw would not be enough.** This makes the claim's retrofit
story wrong in a way that matters: the fix is "unify the address vocabulary", not "drop the
two-owner rule".

This also confirms L2's sub-finding: a facet naming a *nested* collection is permanently NA
(byId can't even find it). A cannot give `passport` its own hub row. B does (7 depth-2 pages,
each with its own `pageStatus`). That asymmetry is real and it favours B.

## 3. Where "buys nothing B lacks" breaks — the empty-collection case

`status.js:28-34` — `partRequired` makes a facet inherit the **parent collection's** mandate:
`isRequiredObligation(facetParent(part)) || facetMembers(part).some(isRequiredObligation)`.
With `commodityLines.requiredAtLeastOne: true` (`features/commodities/obligations.js:123`), on a
fresh journey **both** facet rows read NOT_STARTED — pinned at `status.test.js:31-34`
("Should return NOT_STARTED on both facets of an empty required collection").

B's two rows on the same state read **NOT_APPLICABLE**:
`expandPresents` (`engine/index.js:258-270`) yields zero entries when the group has zero records
→ `classifyEntries` (`:387-389`) returns NA → the hub withholds the `href`
(`features/hub/controller.js:113`). B's imperative patch rescues **only** `commodity-lines-manage`
(`controller.js:98-105`, `linesManageStatus` at `:60-69`). So on a blank journey B's hub renders
"Commodity line details — Not applicable" and "Per-unit records — Not applicable", grey and unlinked.

And the L2-proposed 8-LOC `minInstances` retrofit **does not reach `per-unit-records`**:
`collectGroupsPresentedIn` (`engine/index.js:545-556`) collects only groups named in a page's own
`presentsForEach.forEachOf` — under that subsection that is `unitRecord`, never its ancestor
`commodityLine`. A `commodityLine` min-instances error would never be counted there. B needs the
group walk to climb the `within` chain as well.

So the facet is not pure waste: **it binds both split rows to the parent collection's cardinality
mandate, which B's `presents`-split structurally does not do and does not get for free from the
cheapest proposed fix.**

## 4. Where "a constraint A chose" breaks — the constraint is a purchase, not a wound

A's dispatch rules buy two **boot-time** invariants. I searched B's whole tree for equivalents and
found none:

1. **Totality.** `dispatch.js:55-63` throws if any non-`system` obligation is owned by no page.
   B's only coverage test is obligation→**domain** (`obligations/coverage.test.js:80-86`, with a
   `KNOWN_UNWIRED` allow-list at `:27-78`) — it asserts every obligation has *legal-value semantics*,
   **not** that any page presents it. `grep -rln orphan` over B returns only that file and two docs;
   `presents` appears in tests only at `integration.test.js:372` (a single lookup test). **Nothing in
   B fails when an obligation is declared, scoped, evaluated and never asked.**
2. **Uniqueness.** `dispatch.js:44-52` throws on a double claim. B tolerates multiple presenters *by
   design* — `contract.test.js:107`: "changeLinkFor resolves to the **first** page presenting the
   obligation". Two pages presenting one obligation under two different subsections would have it
   counted in **both** rows' statuses (`collectInScopePresentedEntries`, `engine/index.js:480-494`)
   with no error anywhere.

The freedom that gives B its free split is the same freedom that removes the guarantee A pays the
facet for. That is a trade, and the claim prices only one side of it.

## 5. What I could not break

- B genuinely splits the same commodity-line tree into two independently-statused rows with zero
  facet machinery, and does it *more* finely than A can (depth-2 per-obligation rows).
- A genuinely cannot address a status part below a root obligation.
- The facet genuinely exists because of that.

The claim's engine mechanics are sound. Only its accounting is one-sided.
