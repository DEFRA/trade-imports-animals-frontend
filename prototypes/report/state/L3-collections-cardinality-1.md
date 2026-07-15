# L3 — Adversarial verification — collections-cardinality — CLAIM C1

**Claim under test:** A's collection FACETS are not a capability, they are a patch for a hole
B does not have. A needs facet vocabulary only because dispatch strips indices and attributes
every sub-field to the page owning its nearest collection ancestor, forcing
`animalIdentificationPage` to declare `collects: []`; B reaches the identical outcome with
ZERO model vocabulary, purely from flow position.

**Verdict: AMENDED.** The *conclusion* survives — I hunted hard for an A-only capability
inside facets and could not find one, and B does not need an equivalent construct. But the
*causal story* is wrong in both of its quotable specifics: the index-strip is not in the
causal chain at all, and B's mechanism is not "zero vocabulary".

---

## 1. What the cited lines actually say

Every quote is real. All of these were opened and read.

| Citation | Verified? | What it actually shows |
|---|---|---|
| `flow/task-rows.js:55-56` | ✅ | `row.parts ?? row.pages.flatMap((page) => collectsOf(page.id))` — exact. |
| `flow/task-rows.js:27-37` | ✅ | The two facet overrides — the **only two facet carriers in the app** (grep over `flow/` + `engine/`: 2 hits in `task-rows.js`, 2 in `status.test.js`, nothing else). |
| `engine/status.js:11-21` | ✅ | `isFacet` / `facetParent` / `facetMemberFilter` — exact. |
| `features/commodities/animal-identification.controller.js:20` | ✅ | `export const meta = { ...page, collects: [] }` — exact. |
| `flow/dispatch.js:15` | ✅ (line 16, not 15) | `let current = address.replace(/\[\d+\]/g, '')` — real, but see §2. |
| B `flow/flow.js:431`, `:494` | ✅ | `commodity-lines-details` and `per-unit-records` are sibling subsections. |
| B `engine/index.js:469-474` | ✅ | `containerStatus` re-derives via `collectInScopePresentedEntries`. |
| L1-A "single cleanest idea" | ✅ | L1-A §5, verbatim. |

---

## 2. REFUTED sub-claim: the index-strip is not in the causal chain

The claim's headline mechanism — *"dispatch strips indices and attributes every sub-field to
the page owning its nearest collection ancestor"* — is wrong three times over.

**(a) The strip has nothing to do with row status.** The strip at `flow/dispatch.js:16` exists
so `pageOfObligation` can accept an **instance** address. Its consumer is the
check-your-answers Change link:

```js
// features/check-answers/controller.js:31
withChange(pagePath(slugOfPage(pageOfObligation(obligationId))))
```

and it is pinned as such in `flow/dispatch.test.js:83-91`:

```js
expect(pageOfObligation('commodityLines[0].commoditySelection')).toBe('commodities')
expect(pageOfObligation('commodityLines[0]')).toBe('commodities')
```

`docs/flow-and-gates.md:74` says so outright ("`pageOfObligation` accepts both forms of an
address"). The hub-row path never touches it: `rowStatus` → `rowParts` → `collectsOf(pageId)`
(`dispatch.js:72` — a bare `Map.get`, no strip) → `statusOf`. **Delete the regex entirely and
facets would still be required.**

**(b) "nearest *collection* ancestor" is not what the code does.** `ancestorTemplate`
(`dispatch.js:10-13`) walks dot-segments of the template path and stops at the first ancestor
*any page has declared*:

```js
const ancestorTemplate = (templatePath) => {
  const dot = templatePath.lastIndexOf('.')
  return dot === -1 ? null : templatePath.slice(0, dot)
}
```

Nothing privileges collections. It lands on `commodityLines` purely because `commodityLines`
is the only ancestor any page declares (`search.controller.js:8` → `kit.collectsFrom` →
`['commodityLines']`, since `features/commodities/obligations.js:126` exports only
`obligations = [commodityLines]`). Because the map is keyed by whatever strings appear in
`collects` and the walk tries the dotted path *before* the parent, a page could in principle
claim a nested subtree by declaring the dotted form (`collects:
['commodityLines.animalIdentifiers']`) and `ownerOfObligation` would route to it. So dispatch
is not even structurally incapable of sub-tree ownership — it is merely never used that way.

**(c) The "forcing" is the single-owner rule, not the strip.** `dispatch.js:45-52` throws
`Obligation "X" is collected by two pages`. `commodityLines` is already owned by
`commoditiesPage`, so **any** second page touching that collection must declare `collects: []`
— which is exactly why `features/commodities/consignment-details.controller.js:14` *also*
declares `collects: []`, and that page sits in the **same** hub row as commodities. `collects:
[]` is the ordinary shape for a secondary editor page. It is not a facet symptom.

---

## 3. REFUTED sub-claim: B does *not* do this with "ZERO model vocabulary"

B's flow nodes carry an explicit per-page obligation binding. `presents:` appears at 23 sites
in `flow/flow.js` (`:108, :112, :121, :138, :146, :172, :194, :217, :227, :236, :254, :270,
:288, :292, :303, :307, :311, :335, :352, :380, :587, :608`), and `presentsForEach: {
obligation, forEachOf }` at every fanned page (`:439-521`). `expandPresents`
(`engine/index.js:248-272`) reads **only** `page.presents` and `page.presentsForEach`;
`collectInScopePresentedEntries` (`:480-494`) walks the subsection subtree collecting exactly
those declarations.

So B's two hub rows come from **flow position *over a per-page obligation binding***. That
binding is the direct analogue of A's `collects`. The honest statement is not "B needs no
vocabulary" — it is:

> B needs no *extra* vocabulary, because the binding it already has is **leaf-granular at any
> depth**. A's binding (`collects`) is **subtree-granular and keyed on top-level ids**, so A
> must invent a second construct.

That is the real hole, and it is not in dispatch — it is in `statusOf`. A status part is
either a facet or a **string**, and a string part is resolved by `registry.byId(part)`
(`status.js:29`) and `answers[part]` (`status.js:37, 40`). `registry.byId` reads `byIdMap`,
built only from the **top-level** forest (`registry.js:15-30`). `registry.byId('animalIdentifiers')`
is therefore `undefined`, and a nested collection has no top-level storage. **A has no way to
name a nested obligation as a status part.** Facets are the workaround for *that*.

Also worth noting: the claim (and L2) describe this as "one stored collection → two hub rows".
In B the two subsections present two *different* groups (`commodityLine`-scoped leaves vs
`unitRecord`-scoped leaves). And in A the facet `only: ['animalIdentifiers']` names the
**nested sub-collection** as a member. Both sides are partitioning parent-group fields from
child-group fields. The outcome is genuinely identical; the "one collection split by field"
framing is not what either side is doing.

---

## 4. Counter-example hunt: is there ANY A-only capability inside facets?

**The candidate.** A facet filters by **member id** (`only` / `except`, `status.js:15-21`),
which is *page-independent*. B's `containerStatus` is *page-granular*. So: two fields
collected by the **same** page, needing to land in **different** hub rows — A can express it,
B (off the real flow tree) cannot. That would be a real asymmetric capability.

**It dies.** `containerStatus` does not require a real flow node — it accepts any
`{ children: [...] }`, and this is *pinned in B's own tests*:

```js
// engine/index.test.js:511
containerStatus({ children: [filledPage, emptyPage] }, stFilled)
```

and `expandPresents` (`engine/index.js:250`) reads only `node.presents`. So a synthetic
container holding synthetic present-nodes gives B **arbitrary field-subset status, at any
depth, with zero engine change**. The residual A-only capability evaporates. I could not find
another.

**And facets are narrower than L1-A billed them.** Two limits neither Layer 1 nor the claim
mentions, both of which *strengthen* the claim's conclusion:

1. **Facets are depth-capped.** `facetParent = registry.byId(part.collection)`
   (`status.js:13`), and `byId` is top-level-only (`registry.js:30`). A facet **cannot target
   a nested collection directly** — `{ collection: 'animalIdentifiers' }` resolves to
   `undefined` and throws in `facetMembers`. It works today only because
   `animalIdentifiers` can be named as a *member* of the top-level `commodityLines`. At depth
   3 the construct runs out.
2. **Facets are task-row-only.** `flow/section-status.js:5-9` builds parts as
   `section.pages.flatMap(collectsOf)` — no `parts` override, no facet support. So section
   status still measures the whole collection.

---

## 5. Not-built vs cannot-be-built

Checked explicitly, since it is the usual failure mode:

- **A could support nested status parts** without a paradigm change — extend `statusOf` to
  resolve string parts via `registry.byPath` + a nested-storage walk, and let `collects` carry
  dotted template paths (which `ownerOfObligation` already resolves). That is an engine change,
  not a rewrite. So "A *needs* facets" means "given `statusOf`'s current top-level-only part
  resolution", not "structurally forever".
- **B is not missing anything here.** Nothing needed to be built for B to match A; the
  capability already falls out of `presents` + `containerStatus`.

Net: facets are a **local compensation for a granularity gap in A's own page→obligation
binding and status-part resolution**, not an asymmetric capability. On this sub-dimension the
standing prior (B better) holds, and it holds for a *different reason* than the claim gives.

---

## 6. Amended claim

See `amendedClaim` in the structured return. In short: keep the conclusion, drop the
index-strip mechanism, drop "zero vocabulary", and relocate the hole from `flow/dispatch.js`
to `engine/status.js` + `registry.js`.

## 7. What I searched

- Read in full: A `flow/task-rows.js`, `flow/dispatch.js`, `flow/section-status.js`,
  `engine/status.js`, `registry.js`, `features/commodities/page.js`,
  `features/commodities/obligations.js:90-127`, `shared/kit.js:1-35`,
  `features/commodities/animal-identification.controller.js:1-70`, `flow/dispatch.test.js:75-91`.
- Read in full: B `engine/index.js:228-549`, `flow/flow.js:405-520`,
  `features/hub/controller.js:1-60`.
- `grep -rn "collects:"` across A (32 hits) — established that `animalIdentification` and
  `consignmentDetails` are the only two `collects: []` pages.
- `grep -rn "pageOfObligation\|collectsOf"` across A — established every consumer of the
  index-strip.
- `grep -rn "presents:"` across B `flow/flow.js` — 23 sites.
- `grep -rn "containerStatus\|expandPresents"` across B — found the synthetic-container test.
- `grep -rn "except:\|only:\|collection: '"` across A `flow/` + `engine/` — exactly 2 live
  facet carriers.
