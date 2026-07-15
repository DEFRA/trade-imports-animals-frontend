# L3 — flow-navigation — CLAIM FN-2 — adversarial verification

**Claim:** "Page skipping rides obligation scope" is present in A with **identical semantics**, so it is NOT a differentiator: A's "visible iff ANY presented obligation is in scope" is the **exact contrapositive** of B's "NA iff NONE is". Re-gating after an edit is **free on both sides**.

**Verdict: AMENDED.** The claim's *headline* survives — the idea is genuinely present in A, and L1-B was wrong to credit it to B alone. But **all three of its specific assertions fail at source**, and one of them (`identical semantics`) is falsified by the very line the claim quotes. Worse, the divergence runs in A's favour, so the claim under-sells A while purporting to neutralise a B win.

---

## 1. Are the quotes real? Yes — both verbatim.

- A — `flow/gates.js:17-19`:
  ```js
  const inScopeReachable = (obligationIds, scope) =>
    obligationIds.length === 0 ||
    obligationIds.some((id) => scope.inScope.has(id))
  ```
- B — `engine/index.js:386-389`:
  ```js
  function classifyEntries(inScope, state, groupErrorCount) {
    if (inScope.length === 0 && groupErrorCount === 0) {
      return STATUSES.NOT_APPLICABLE
    }
  ```

Both real. But they do not say what the claim says they say.

## 2. FAILURE 1 — "identical semantics / exact contrapositive" is FALSE, and the quoted lines prove it.

The claim paraphrases A as *"visible iff ANY presented obligation is in scope"*. That paraphrase **silently drops the first disjunct of the line it just quoted**. A's actual predicate is:

> visible iff **(the page declares NO obligations)** OR (any declared obligation is in scope)

B's actual predicate at page level is:

> NA iff **(no in-scope entries)** — and `groupErrorCount` is hard-wired to `0` for pages (`engine/index.js:442-447`, `pageStatus` → `classifyEntries(inScope, state, 0)`), so the second conjunct is inert at page level.

The two predicates **agree on every page that declares ≥1 obligation** and **disagree, maximally, on the empty set**:

| page declares | A | B |
|---|---|---|
| 3 obligations, all out of scope | gate FAILS → hidden | NA → skipped |
| 3 obligations, ≥1 in scope | gate PASSES → visible | NS/IP/F → walkable |
| **0 obligations** | **gate PASSES → visible** | **NA → skipped AND unroutable** |

A's `obligationIds.length === 0 ||` disjunct is the **exact inverse** of B's `inScope.length === 0 &&` conjunct. Same empty set, opposite conclusion. "Exact contrapositive" is not merely imprecise — it is the wrong logical relation.

## 3. That divergence is load-bearing, not theoretical. Three real pages ride it.

A's review section is three pages with **no `collects` key at all** — so `collectsOf()` (`flow/dispatch.js:72`, `collectsByPageMap.get(pageId) ?? []`) returns `[]` and the `length === 0` disjunct fires:

- `features/check-answers/page.js` → `{ id: 'notification-view', slug: 'notification-view' }`
- `features/declaration/page.js` → `{ id: 'declaration', slug: 'declaration' }`
- `features/confirmation/page.js` → `{ id: 'confirmation', slug: 'confirmation' }`

They sit in the flow as **ordinary sequenced pages** (`flow/flow.js:73`) and `nextInSection` routes to them (`flow/navigation.js:20-28`) because `pageGatePasses` returns true.

Drop those same three pages into B and every one of them is **NOT_APPLICABLE** → `firstUnfulfilledPage` skips them (`engine/index.js:128-133`, skips NA) → and `routes.js:189` `if (!hasPresents) continue` **denies them a route in the first place**. B's own read-only intro page is the standing witness: unroutable, and it forced a bespoke hub status function (`features/hub/controller.js:60-69`) because the generic classifier called it NA.

So the empty-set case is not a corner. It is the whole review/interstitial/confirmation class of page, and it is precisely the case where the two predicates part company.

## 4. FAILURE 2 — the claim compares the wrong things. A's page gate ≠ `inScopeReachable`.

The claim cites `gates.js:17-19` — the *helper*. A's actual visibility predicate is `gates.js:21-28`:

```js
export const pageGatePasses = (page, scope) => {
  if (page.gate) return page.gate(scope)          // ← authored escape hatch
  assertDispatchBuilt()
  return (
    prerequisitesMet(pagePrerequisites(page.id), scope) &&   // ← second conjunct
    inScopeReachable(collectsOf(page.id), scope)
  )
}
```

Two things B has no analogue for:
- a **prerequisite conjunct** (`prerequisitesMet`), which is what produces "Cannot start yet";
- an **authored-predicate escape hatch** (`page.gate` / `section.gate`), used exactly once — `flow/flow.js:72` `gate: (scope) => scope.readyForCheckYourAnswers` — and used for the one case B structurally cannot express (grep for `gate:` across A's `flow/` returns 1 production hit + 2 in `gates.test.js`).

So even where the predicates overlap, A's is a *conjunct inside a richer gate*, not the gate. The claim reduces A's gate to the sub-clause that happens to match B, and then declares a match.

## 5. FAILURE 3 — "re-gating after an edit is free on both sides" is FALSE for A on the edit path.

A's write path *does* re-derive scope — `engine/write.js:11-18`, `commit()` returns `{ answers, scope: makeScope(answers) }` — and 16 controllers feed that fresh scope to `kit.nextTarget(request, page, scope)`. Verified. So far so good.

But `nextTarget` (`shared/kit.js:59-63`) is:

```js
export const nextTarget = async (request, page, scope) =>
  exitTarget(
    request,
    (await runTarget(request, page.id, scope)) ?? nextInSection(page.id, scope)
  )
```

and `exitTarget` (`shared/kit.js:52-54`):

```js
export const exitTarget = (request, fallback) =>
  hubExitTarget(request) ??
  (changeContext(request) ? pagePath(CYA_SLUG) : fallback)
```

When `?change=1` is set, **the freshly-scope-aware `nextInSection` result is computed and thrown away** — the user is jumped to CYA regardless of what the edit just brought into scope. The change flow is the *only* place in A where a user re-answers an already-answered question, i.e. **it is literally the "after an edit" scenario the claim names**. Re-gating is free in A's linear run; it is **bypassed** in A's edit path.

The downstream damage is already logged: `features/declaration/controller.js:65-67` —

```js
await state.commit(request, h, values)
const result = await state.submitJourney(request, h)
if (!result.ok) return h.redirect(pagePath(kit.CYA_SLUG))
```

— the submit is correctly *blocked* (`engine/write.js:92`, `readyForCheckYourAnswers`) but the newly-in-scope unanswered obligation is never *named* and never *navigated to*. Silent bounce.

B, having no change flow at all (zero `change=1` in any `.js`/`.njk`), re-walks on **every** POST (`lib/page-controller.js:90-93`) with no override. So B's re-gate is unconditionally honoured; A's is honoured except on the edit path. "Free on both sides" is backwards on the very case it names.

## 6. What I searched trying to break the amendment (i.e. trying to rescue the claim)

- `grep -rn "gate:" A/flow/` → 1 production gate. A really does derive visibility from scope; the claim's headline is right.
- `grep -rn "kit.nextTarget\|nextTarget(" A/features/` → 16 sites, all passing post-commit scope. A's re-derivation is real and universal on the linear path.
- Read `engine/index.js:435-447` (`pageStatus`) to check whether B's `groupErrorCount` conjunct could rescue a presents-less page → **no**: `pageStatus` hard-codes `0`. Only `containerStatus` passes a real count. A presents-less page in B is NA, full stop.
- Read `routes.js:180-200` to check whether B routes presents-less pages by some other path → **no**: `if (!hasPresents) continue`, before the GET/POST push.
- Checked whether A's three review pages might declare obligations elsewhere (e.g. via `meta`) → `features/declaration/controller.js:10` exports `meta = { ...page, collects: kit.collectsFrom(obligations) }`, but the **flow node** (`page.js`) carries no `collects`, and `buildDispatch` keys `collectsByPageMap` off the flow pages (`flow/dispatch.js:41-43`). Empty set confirmed.
- Checked "not built vs cannot be built" for B: could B give a presents-less page a route and a non-NA status? It needs a change to `classifyEntries` (the NA branch), a change to `firstUnfulfilledPage` (the skip set), and a change to `routes.js` (the `hasPresents` guard) — i.e. three edits to the three things B is built around. That is a **model change**, not wiring. Conversely A expressing B's rule is a one-character deletion (`||` → drop the disjunct). The asymmetry is structural and it runs A's way.

## 7. Amended claim

> The *idea* — page visibility derived from obligation scope, with no `when`/`showIf` in the flow declaration — is present on **both** sides, so L1-B is wrong to credit it to B alone (A: `flow/gates.js:17-27`, one authored gate in 20 pages, `flow/flow.js:72`; B: `engine/index.js:386-389`). But the two predicates are **not** identical and **not** contrapositives. They agree on every page that declares ≥1 obligation and diverge on the empty set: A's `obligationIds.length === 0 ||` makes a collects-nothing page **visible and sequenceable** (that is how `notification-view` / `declaration` / `confirmation` sit in the flow as ordinary pages), whereas B's `inScope.length === 0 &&` makes the same page **NOT_APPLICABLE** — skipped by `firstUnfulfilledPage` and denied a route by `routes.js:189` `if (!hasPresents) continue`. A's gate is additionally a **conjunction** with a prerequisite clause and carries an **authored-predicate escape hatch** (`page.gate`/`section.gate`), neither of which B has. So this dimension is a **differentiator — in A's favour**, and B's rule is a strict specialisation of A's. Separately, "re-gating after an edit is free on both sides" is **false for A on the edit path**: `shared/kit.js:52-54` `exitTarget` discards the freshly-derived `nextInSection` target whenever `?change=1` is set, so A's change flow never navigates to a page the edit just brought into scope — which is exactly the silent submit refusal at `features/declaration/controller.js:65-67`. Re-gating is free in A's *linear run* and unconditionally free in B (which has no change flow to bypass it).

## 8. Consequence for option C

- Take A's `inScopeReachable` **including** the `length === 0` disjunct — it is the one-line difference between "the model can hold a content/interstitial/CYA/confirmation page" and "it cannot". Do not port B's NA rule verbatim.
- Take A's authored-gate escape hatch, but note it directly contradicts B's central negative thesis ("the flow declares no visibility rules"). A's own evidence says the thesis is a slogan: A needed the hatch **once**, and needed it for a case B cannot express.
- The change flow must **not** discard the post-write walk. C needs a ruling: on an edit that re-gates a new mandatory obligation into scope, route the user to it (do not bounce to CYA) or bounce to CYA **with a named error**. A does neither.
