# L3 — Adversarial verification — ST-2 (status-tasklist)

**Verdict: AMENDED.** The mechanism the claim describes is real and I verified every cited
line. But the claim makes two material overstatements, one on each side, and the second is
the "not built vs cannot be built" failure mode the method warns about.

---

## 1. What I verified as TRUE (quotes are real and mean what the claim says)

### 1.1 `statusOf` is root-keyed — CONFIRMED, and it is worse than the claim says

`engine/status.js:26` — `const partKey = (part) => (isFacet(part) ? part.collection : part)`
`engine/status.js:60` — `const inScopeParts = parts.filter((part) => inScope.has(partKey(part)))`

This is an **exact-match** lookup against the `inScope` Set. What goes into that Set:

`engine/evaluate/reconcile.js:13-14` — `for (const { path, ... } of nodes) { const key = pathKey(path) ... inScope.add(key) }`
`registry.js:44-71` (`walk`) — root obligations yield `path = [obligation.id]`; anything with an
`item` array recurses **per stored entry**: `walk(answers, obligation.item, [...path, i], ...)`.
`lib/path.js:1-10` (`pathKey`) — a numeric segment becomes `[n]`.

So the `inScope` Set contains **exactly two shapes**:
- bare root ids — `commodityLines`, `countryOfOrigin`
- instance-qualified deep keys — `commodityLines[0].animalIdentifiers`,
  `commodityLines[0].animalIdentifiers[0].animalIdentifierPassport`

There is **no template-path key** (`commodityLines.animalIdentifiers`) anywhere in the Set.
A status part naming any non-root obligation therefore never matches, is filtered out, and
`statusOf([])` → `NA` (`status.js:61`). **Confirmed.**

### 1.2 The facet can only split a ROOT collection by its DIRECT members — CONFIRMED, twice over

Two independent blocks, both real:

**(a) `facetParent` reads a root-only map.**
`status.js:13` — `const facetParent = (part) => registry.byId(part.collection)`
`registry.js:30` — `const byIdMap = new Map(all.map((o) => [o.id, o]))`
`registry.js:15-28` — `all` is the concatenation of each feature's exported `obligations` array.

I checked **all 12** feature modules (`grep -rn "export const obligations" features/`):
every one exports root obligations only. `features/commodities/obligations.js:126` is
`export const obligations = [commodityLines]` — `animalIdentifiers` is reachable **only** as
`commodityLines.item[4]`. So `registry.byId('animalIdentifiers')` is `undefined`, and
`registry.byId('permanentAddress')` is `undefined`.

**(b) `includesMember` is not recursed.**
`engine/evaluate/complete.js:11-12` — `const siblings = obligation.item ?? []; const members = includesMember ? siblings.filter(includesMember) : siblings`
`engine/evaluate/complete.js:43-52` — when a member is itself a collection, the recursive call is
`collectionComplete(subObligation, entry?.[subObligation.id], ctx && {...})` — **the filter is
not passed down.** The facet filter is a flat id-match against the named collection's direct
members and cannot reach depth 2.

### 1.3 The concrete example holds — CONFIRMED

`features/commodities/obligations.js:96-124`: `commodityLines.item` includes `animalIdentifiers`
(depth 1), whose `item` is `[animalIdentifierPassport, animalIdentifierTattoo,
animalIdentifierEarTag, horseName, animalIdentifierIdentificationDetails,
animalIdentifierDescription, permanentAddress]` — all **depth 2**.

`flow/task-rows.js:29,36` — the only two facets in existence are
`{ collection: 'commodityLines', except: ['animalIdentifiers'] }` and
`{ collection: 'commodityLines', only: ['animalIdentifiers'] }`.

A facet `{ collection: 'animalIdentifiers', only: ['animalIdentifierPassport'] }` would be
filtered out at `status.js:60` (`inScope` has no bare `animalIdentifiers`) and render NA
forever. **As built, A cannot give `passport` a status separate from `permanentAddress`.**

I also confirmed there is no second status path: `grep -rn "statusOf|rowStatus|parts:"` over the
whole of A returns exactly two production `statusOf` call sites (`flow/task-rows.js:59`,
`flow/section-status.js:9`) and one consumer (`features/hub/controller.js:155`). No escape hatch,
no per-page status, no alternative row builder except the bespoke `review` row.

**I also checked a promising counter-example and it failed.** `flow/dispatch.js:15-24`
(`ownerOfObligation`) *does* walk dotted template ancestors and *would* accept a page declaring
`collects: ['commodityLines.animalIdentifiers']` — dispatch supports ownership at depth. But it
does not help status: those strings would arrive at `statusOf` as string parts, `partKey` returns
them verbatim, and `inScope` holds instance keys — not template paths. Still NA. The claim
survives this attack.

---

## 2. OVERSTATEMENT 1 — "B does exactly that today" is FALSE

The claim: *"A cannot give `passport` its own hub row separate from `permanentAddress`. B does
exactly that today — seven depth-2 pages under `per-unit-records`, each with its own
`pageStatus`."*

**B's hub does not render those seven pages as rows.**

`features/hub/controller.js:96-117` (B):
```js
const modelSections = sections().map((section) => {
  const items = (section.children ?? []).map((subsection) => {
    const status = isLinesManage ? linesManageStatus(state)
                                 : statusOfContainer(subsection, state)
    ...
```
The row unit is the **subsection**. `per-unit-records` (`flow/flow.js:493-563`) is **one
subsection** containing seven page children, and it gets **one** hub row with **one** tag —
`statusOfContainer` over the whole seven-page subtree (`engine/index.js:469-474`). The file's own
header comment says so: *"Every subsection is one row."*

And `pageStatus` has **no user-facing consumer at all**. `grep -rn "pageStatus|statusOfPage"`
across B: the only call sites are `contract.js:83-85` (the facade fn), `contract.test.js:57-65`,
`engine/index.test.js`, `integration.test.js`, and `dump.js:67,72` (a debug dump). **Zero**
controllers, **zero** templates.

So: **neither side ships `passport` as its own hub row.** B has the *capability*; it has not used
it. Presenting an unbuilt B capability as shipped, against a genuinely-absent A capability, is
exactly the asymmetry-inflation this exercise is supposed to catch.

What is true is that B's capability is real and near-free. `expandPresents`
(`engine/index.js:248-272`) reads `state.obligations[forEach.forEachOf.id].records` — B stores
each group as a **flat record list keyed by group id**, each record carrying a `fulfilmentId`
instance path, regardless of nesting depth. `unitRecord` really is nested
(`obligations/obligations.js:563-567`: `within: commodityLine`) and `passport` really is depth-2
(`:634-636`: `within: unitRecord`), so the comparison is apples-to-apples — but depth costs B's
classifier nothing, because the classifier never walks a tree. Giving `passport` its own hub row
in B = wrap that page node in a subsection in `flow.js` + one `titleKey` in `en.json`. **No engine
change.**

---

## 3. OVERSTATEMENT 2 — "structurally cannot" is NOT what A's source shows

This is the more damaging one. The claim asserts a **model-level ceiling**. What the source shows
is an **unfinished 79-line status module**. A's engine already has, *in production*, every
primitive the fix needs:

| primitive the fix needs | already exists in A | where |
|---|---|---|
| depth-2 instance keys in `inScope` | **yes** — `commodityLines[0].animalIdentifiers[0].animalIdentifierPassport` | `reconcile.js:13-14` + `registry.js:44-71` |
| template-path → obligation index **at every depth** | **yes** — `registry.byPath`, built from `walkObligations` which yields `templatePath` at every depth | `registry.js:32-42, 73-80` |
| instance-key → template-path index strip | **yes, implemented three times** | `cardinality.js:5-6` (`templatePathOf`), `collection-view.js:6-8`, `dispatch.js:16` (`address.replace(/\[\d+\]/g, '')`) |
| resolving a **nested** collection instance and evaluating its completeness | **yes, live** | `collection-view.js:5-17` — takes `['commodityLines', 0, 'animalIdentifiers']`, strips to `commodityLines.animalIdentifiers`, `registry.byPath(...)`, then `entryComplete(obligation, entry)` per entry |
| depth-aware `ctx` frames through the completeness walk | **yes** | `complete.js:35-52, 66-82` |

`registry.byPath` is **not dead code** — it is used by `engine/evaluate/cardinality.js:21` and
`engine/evaluate/collection-view.js:9`. A's engine resolves depth-2 collections by template path
today. `engine/status.js` simply doesn't call any of it: it was written to take root ids and
never revisited.

The fix is confined to:
1. `status.js:26,60` — `partKey` → a template path; the filter → "some in-scope key strips to this
   template path" (the strip already exists at `dispatch.js:16`).
2. `status.js:13` — `facetParent` → `registry.byPath` instead of `registry.byId`.
3. `complete.js:43-52` — thread `includesMember` (made path-aware) down the one recursive call.

That is **~40 LOC in one module**. It requires **no** dispatch change, **no** change to the
two-owner throw, **no** change to derived-ownership-at-depth, and **no** change to any
`features/*/obligations.js`. It is not remotely comparable to the "delete the rules the flow layer
is built on" rewrite that L2 §2.1 describes for porting B's *whole* status model into A.

"A's status module is root-keyed and nobody generalised it" is a fair finding. "A's model
structurally cannot express status at depth ≥2" is not what the code says.

---

## 4. The asymmetry that IS defensible (and belongs on the shopping list)

Strip both overstatements and a real, smaller difference remains — and it is about **where the
change lands**, which is the retrofit question:

- **B's status is addressed by flow NODE.** Any page or container can be asked for a status
  (`pageStatus` / `containerStatus`, `engine/index.js:442-474`), and a flow node declares what it
  presents at any depth via `presentsForEach` (`flow/flow.js:497-563`). Groups are stored flat
  (`state.obligations[groupId].records`), so the classifier never walks a tree and **depth is
  free**. New row at depth 2 = a **data edit** in `flow.js` + an i18n key.
- **A's status is addressed by a list of root-keyed PARTS.** The same row is an **engine edit**.

Data-vs-engine is a genuine and material difference in retrofit cost. It is the honest version of
this claim. It is not "cannot express".

---

## 5. What I searched

- Read all cited lines on both sides: `engine/status.js` (whole file), `engine/evaluate/reconcile.js`
  (whole file), `engine/evaluate/complete.js` (whole file), `flow/task-rows.js`, `flow/section-status.js`,
  `flow/dispatch.js`, `registry.js`, `lib/path.js`, `features/commodities/obligations.js`;
  B's `flow/flow.js:485-564`, `engine/index.js:236-272, 430-494`, `features/hub/controller.js`,
  `obligations/obligations.js` (group structure).
- `grep -rn "statusOf|rowStatus|rowParts|parts:"` over all of A — found no second status path.
- `grep -rn "export const obligations" features/` over all 12 A features — all root-only.
- `grep -rn "byPath"` over A — found the live depth-aware resolver (the counter-example to
  "structural").
- `grep -rn "pageStatus"` and `grep -rn "statusOfPage|statusOfContainer"` over all of B — found
  that `pageStatus` has zero user-facing consumers (the counter-example to "B does exactly that
  today").
- `grep -rn "unitRecord|commodityLine"` over B's `obligations/obligations.js` — confirmed
  `unitRecord within: commodityLine` and `passport within: unitRecord`, so B really is at depth 2
  and the comparison is fair.
