# L3 — flow-navigation — claim FN-1 — adversarial verification

**Claim:** B's only forward-navigation source, `firstUnfulfilledPage`, skips any page whose status is
not-applicable, optional OR fulfilled, and `nextAfter` has no other source of a page — so B's walk is a
strict specialisation of A's, which skips only on derived gate failure. Every page B can sequence, A can
sequence; the reverse is false.

**Verdict: AMENDED.** The sharp end survives; three load-bearing parts of the framing do not.

---

## 1. What the cited lines actually say (all re-read at source)

| Cited | Real? | Reading |
|---|---|---|
| B `engine/index.js:128-139` | YES | `firstUnfulfilledPage` returns a page only if `pageStatus` is `not-started` or `in-progress`. So it skips NA, Optional, Fulfilled **and Submitted** (`STATUSES`, :274-281). Claim's skip-list is right (and one short). |
| B `contract.js:115-127` | YES | `nextAfter` = `firstUnfulfilledPage(subsection)` → `firstUnfulfilledPage(section)` → `{kind:'task-list'}`. No other page source **inside `nextAfter`**. |
| A `flow/navigation.js:20-28` | YES | `nextInSection` = first positionally-later page in the section whose `pageGatePasses`. Fulfilment is not consulted. |
| A `flow/gates.js:21-28` | YES **but truncated** | `pageGatePasses` is *three* clauses, not two: `if (page.gate) return page.gate(scope)` (:22) **then** `prerequisitesMet(pagePrerequisites(page.id), scope) && inScopeReachable(collectsOf(page.id), scope)`. |

---

## 2. REFUTED sub-part 1 — "B's **only** forward-navigation source"

B's engine exports a **second** declared-order page walk, and its own docstring says what it is
(`engine/index.js:111-122`):

```js
/**
 * Depth-first walk to the first Page in declared order. Status-blind.
 * Used for default Section entry.
 */
export function firstApplicablePage(root) { … }
```

It is not dead code, and it is not a status-derived variant. It is used in **two forward-navigation
paths**:

- `contract.js:101-111` — `startPage`: `firstUnfulfilledPage` across sections, **falling back to
  `firstApplicablePage`**. This is the journey entry point (`features/start/controller.js:20-23`) and,
  per L1-B §5, the e2e walk re-hits `/start` ~25 times per happy path.
- `features/hub/controller.js:54-58` — `firstNavigablePage = firstUnfulfilledPage(subsection, state) ??
  firstApplicablePage(subsection)`, consumed by `subsectionHref` (:87-89). **A fully Fulfilled subsection
  therefore links to its first page — a fulfilled page.** B navigates users to fulfilled pages today.

It is a first-class, tested primitive: `engine/index.test.js:625-635`, and the test's own fixture flow
returns a page literally named **`intro`** (:627). B's engine happily returns a content page in declared
order.

So "`firstUnfulfilledPage` is B's only forward-navigation source" is **false**. The claim only survives
by narrowing to "*`nextAfter` has no other source*" — which is true, but that narrowing converts a
*model* claim into a *wiring* claim.

## 3. REFUTED sub-part 2 — "strict specialisation" / "every page B can sequence, A can sequence"

The predicates **overlap; neither contains the other.**

- A skips on `!prerequisitesMet` (`gates.js:25` → `prerequisites.js:25-26`: every earlier
  `enforcedAt:'continue'` obligation must be answered) and on a failing authored `page.gate`
  (`gates.js:22`). **B has no prerequisite concept and no visibility slot at all.**
- B skips on Optional and Fulfilled. **A has no fulfilment clause anywhere in `pageGatePasses`.**

Counter-example to the universal, from A's own model: a page that is in scope, mandatory and unfulfilled
but whose `enforcedAt:'continue'` prerequisites are unmet is **sequenced by B's `nextAfter` and skipped by
A's `nextInSection`**. So there exists a page B can sequence that A cannot. The claim's "every page B can
sequence, A can sequence" is literally false.

The *defensible* version is about **permanence**, not containment: A's prerequisite skip is **temporal**
(the page is re-admitted once the prereq lands), whereas B's Fulfilled/Optional/NA skip is **permanent** —
`nextAfter` can *never* route to such a page, in any state.

## 4. CONFIRMED core — and it is real

A can sequence pages B's `nextAfter` structurally cannot reach:

- **Zero-obligation pages.** A's `notificationViewPage` / `declarationPage` / `confirmationPage` are
  literally `{ id, slug }` and nothing else (`features/check-answers/page.js:1-4`,
  `features/declaration/page.js:1-4`, `features/confirmation/page.js:1-4`). `collectsOf(page.id)` is `[]`,
  and `gates.js:18` `obligationIds.length === 0 ||` lets them pass, so `nextInSection` routes to them as
  ordinary pages (`flow/flow.js:73`). In B such a page is `NOT_APPLICABLE` by construction
  (`classifyEntries:387` — `inScope.length === 0 && groupErrorCount === 0`) and therefore invisible to
  `firstUnfulfilledPage` forever.
- **Re-sequencing an answered page.** A's gate never reads fulfilment; B's walk is defined by it.

## 5. The most damaging over-read — "cannot be built" vs "not wired"

The L2 write-up escalates this to *structural* ("B cannot", "a change to the one idea B is built
around"). That does **not** hold up. B's tree is ordered and node-addressable, and every piece is
already present:

1. **The declaration already holds a content page.** `flow/flow.js:415-426` declares
   `{ page: 'commodity-lines-intro' }` with no `presents` — and a comment claiming it *"renders for
   narrative continuity"*. It does not render: `routes.js:189` `if (!hasPresents) continue` denies it a
   route. That is a **fourth doc/code lie in B** (alongside the three L1-B logged), and it is evidence
   that B's *author intended* content pages — nothing in the model rejected them, one `if` did.
2. **The status-blind walk already exists** (`firstApplicablePage`, §2 above).
3. **The renderer already copes.** `lib/page-controller.js:52-62` renders `shared/page` with
   `fields: descriptors.map(...)`; an empty `presents` yields `fields: []` and a heading from
   `pageCopy(page.page)` — a bare interstitial with a Continue button, for free.

The retrofit is therefore: a positional `nextInDeclaredOrder(page)` (a ~10-line mirror of
`firstUnfulfilledPage` that takes the current page's index instead of the container head); a status rule
for zero-presents pages (one branch at `classifyEntries:387`); delete `routes.js:189`. **~20 LOC across
three files.** That is wiring, not a model limit. B's *obligations model* is untouched by all of it.

## 6. What I searched

- `grep -rn "firstApplicablePage|firstUnfulfilledPage|firstPagePresentingObligation|startPage|nextAfter|redirect("` across B's `features/`, `lib/`, `routes.js` — enumerated **every** page-producing redirect in B. Found: `nextAfter` (page-controller:92), `nextAfterForLine` (:128), `nextAfterForUnit` (:164), `startPage` (start/controller:20), `firstNavigablePage` (hub:54), `changeLinkFor`→`firstPagePresentingObligation` (CYA), plus hard-coded `/lines`, `/lines/{id}/units`, `/task-list` redirects and the add-line seed redirect (`commodity-lines/controller.js:214`). Two of these (`startPage`, hub) reach fulfilled pages.
- Read B `engine/index.js:105-230` (all navigation primitives), `:274-310`, `:386-447` (status classifier), `contract.js:90-166`, `routes.js:130-208`, `lib/page-controller.js` (whole), `features/hub/controller.js:45-90`, `flow/flow.js:410-444`, `engine/index.test.js` firstApplicablePage describe.
- Read A `flow/gates.js` (whole), `flow/navigation.js` (whole), `flow/prerequisites.js` (whole),
  `flow/flow.js:20-79`, and the three zero-obligation page modules.

## 7. Consequences for the L2 shopping list

- **"From A: the declared-order walk as the *primary* next-page function"** — still right, but reprice it.
  L2 costs it as a thesis-level change to B. It is not: B already ships a status-blind declared-order
  walk and a content page in its flow. Reprice from "the one idea B is built around" to **~20 LOC**.
- **"From B: `firstUnfulfilledPage` as the resume primitive"** — unaffected, still right.
- **Add to the C shopping list:** B's `firstApplicablePage` fallback in the hub is a *silent* fulfilled-page
  navigation with no change-context — clicking a completed subsection row drops you at its first page with
  a back link to the task list and a forward walk that will not return you to CYA. That is the same defect
  A has (silent bounce), arrived at from the other direction.
- **Do not carry the "strict specialisation" framing into C.** A's gate and B's status-skip are
  *orthogonal axes* — prerequisite/visibility vs fulfilment. C wants **both**, as two separate primitives:
  `nextInDeclaredOrder` (gate-filtered, fulfilment-blind — the run) and `firstUnfulfilled` (the resume).
  A already keeps both apart; B collapsed them into one, and that collapse — not the tree, not the
  obligations model — is the actual defect.
