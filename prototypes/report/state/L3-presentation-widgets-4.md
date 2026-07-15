# L3 adversarial verification — PW-4 (presentation-widgets)

**Claim:** The CYA change-link ROUND-TRIP exists and is E2E-proven on A, and does not exist
at all on B: B's is documentation fiction, with a visible unused stub.

**Verdict: AMENDED** — the central factual assertion holds (I tried hard to break it and could
not), but "does not exist at all" and "documentation fiction" overstate the gap and mis-frame
it as a capability gap when it is a *runtime wiring* gap that B's model does not obstruct.

---

## 1. Did the cited evidence survive?

### B — every cited line is real and means what the claim says

- `obligations.md:2331-2345` — section heading is literally `### CYA and Change-link
  round-trip`, and the body is present tense: "The Change flow uses the `?change=1` pattern
  from the existing prototype: User clicks Change → page is rendered in change mode. On
  submit, the runtime returns to CYA instead of advancing to the next Page in the SubSection."
  Then, tellingly: "Runtime-level behaviour; the Flow doesn't declare it per page."
- `lib/page-controller.js:27-30` — `urlForNext(target, opts = {})` ... `${opts.query ?? ''}`.
  The `opts` seam exists.
- `lib/page-controller.js:90-93` — `writeAnswer` → `nextAfter(page, stateAfter)` →
  `h.redirect(urlForNext(target))`. **One argument.** No caller anywhere passes `opts`.
- `contract.js:164-166` — `changeLinkFor(id) = firstPagePresentingObligation(flow, id)`.

### Counter-example hunt on B (this is where I tried to refute)

- `grep -rniE "change=1|query\.change|changeMode|returnTo|return_to|referrer|referer|\?change|backTo|cameFrom"`
  across BOTH B paths (`EUDPA-249-flow-layer` and `model-spikes/obligations-v4-model`):
  hits are the two copies of `obligations.md` (spike :2338, model-spike :1976) plus i18n keys
  `commodityLines.backToTaskList` / `units.backToLines`. **No code hit.**
- `grep -rn "h.redirect"` across the whole spike — 23 sites. Targets are: `/task-list`,
  `/lines`, `/lines/{id}/units`, `/pages/{page}`, `/lines/{id}/commodity-details`,
  and `urlForNext(target)` in the three page controllers. **Nothing anywhere redirects to
  `/check-your-answers`.** The CYA route (`routes.js:76`) is GET-only.
- `grep -rn "hidden|input type"` in `shared/` + the CYA template — one hit,
  the CSRF `crumb`. No hidden return-URL field.
- Session state (`lib/state.js`) has no return-target slot.

So: no mechanism, anywhere, returns the user to CYA after a save. The claim survives.

### What B's Change links *do* do (this is what the claim understates)

`features/check-your-answers/controller.js:115-129` `hrefForChange` is a real, derived,
three-shape resolver: singleton → `/pages/{page}`; line-scoped → `/lines/{lineId}/{page}`;
unit-scoped (`presentsForEach` with `forEachOf: unitRecord`) → `/lines/{lineId}/units/{unitId}/{page}`.
The CYA also emits ordinal-labelled rows, address structural-completeness prompts, and
group-invariant prompts. The *outbound* half of the round-trip exists and is derived exactly
the way A's is (both go via a flow-derived obligation→page index, not a hardcoded map).

### Where B actually lands you after a Change → edit → Save

The claim says "dumps the user on the next unfulfilled page". Precisely (`contract.js:115-161`):

- scalar page → `nextAfter`: first unfulfilled page **in the same subsection**, else in the
  same section, else `{ kind: 'task-list' }`. On a complete journey (the normal reason to be
  on CYA) that is the **task list**, not a next page.
- line-scoped page → `nextAfterForLine` → next unfulfilled per-line page, else the **/lines list**.
- unit-scoped page → `nextAfterForUnit` → next unfulfilled per-unit page, else the **units list**.

Never CYA. Defect confirmed; the claim's description of the landing spot is imprecise.

### The "unused stub" is narrower than stated

Only `lib/page-controller.js:27` has the `opts` seam. `lib/line-page-controller.js:29` and
`lib/unit-page-controller.js:32` declare `urlForNext(target)` with **no opts parameter at
all** — so the "just pass the query through" retrofit only covers scalar pages.

---

## 2. A's side — verified, no overstatement found

- `shared/kit.js:47-54`: `changeContext = Boolean(request.query.change)`;
  `withChangeContext(request, href)` appends `?change=1` when in context;
  `exitTarget(request, fallback) = hubExitTarget(request) ?? (changeContext(request) ? pagePath(CYA_SLUG) : fallback)`.
  `nextTarget` (:59-63) wraps `nextInSection` in `exitTarget`, so *every* page save honours it.
- `features/check-answers/controller.js:28-31`: `changeHref = withChange(pagePath(slugOfPage(pageOfObligation(obligationId))))`
  — derived from the boot-built inverted dispatch index (`flow/dispatch.js:69-74`,
  `ownerOfObligation` / `slugByPageMap`), not hardcoded. Confirmed.
- `shared/change-context.test.js:62-75` unit-pins the kit contracts (hub exit beats change
  context beats fallback), and :89-174 pin the loop-internal hrefs/redirects.
- `prototypes/e2e/live-animals.spec.js:2537-2591` is real and does what is claimed:
  Change → identification surface, `change=1` in URL, survives the Save-and-add-another PRG
  cycle, `Save and finish` lands back on "Check your answers" with the new unit rendered;
  then the same again for the documents loop (including through the virus-scan refresh link).
- `kit.withChangeContext` is threaded through ~14 call sites across commodities, documents and
  transport — the context survives collection loops and PRG redirects. That threading, not the
  `?change=1` flag, is the real engineering.

---

## 3. Why AMENDED, not CONFIRMED

Three defects in the claim as written:

1. **"does not exist at all on B"** — the *outbound* Change link exists on B, is derived, and
   handles depth-2 per-unit URLs. Only the *return* half is missing. As literally written the
   claim is about the "round-trip", so it is defensible, but "documentation fiction" reads as
   "B's Change links are fiction", which is false and would mislead the shopping list.
2. **Not-built ≠ cannot-be-built.** B's own doc says the quiet part: "Runtime-level behaviour;
   the Flow doesn't declare it per page" (`obligations.md:2345`). A agrees — A's implementation
   is entirely controller/kit-layer (`shared/kit.js` + per-feature controllers); *nothing* in A's
   obligation model encodes change-mode either. So this is **not** an asymmetric model
   capability. It is a controller-layer feature B never wired. Retrofit on B: cheap for scalar
   pages (emit `?change=1` from `hrefForChange`, thread `request.query.change` into the existing
   `opts.query` seam, branch `urlForNext`/`nextAfter` to CYA when set); moderate for the
   line/unit loops (their `urlForNext` has no opts, and the `/lines` and `/lines/{id}/units`
   list pages' internal links + PRG redirects all need the context threaded — which is exactly
   where A's investment sits).
3. **Landing-spot imprecision** — `nextAfter` falls back to the **task list** (and the
   line/unit variants to the lines/units lists), which is the likely real-world outcome from a
   complete-journey CYA, not "the next unfulfilled page".

The honest asymmetry is: **A has proven the hard part** (context survival through collection
loops and PRG cycles, with unit + E2E cover). B has the easy half and a doc that promises the
other half without a single line of code or a "not implemented" note anywhere — its
RECOMMENDATION.md:82 even lists "CYA Change links" among what the spike demonstrates. (The
same doc section over-promises contextual Back navigation at :2347-2354; the code
`page-controller.js:41-45` hardcodes back → task-list, and at least *admits* it: "Best-effort
... Real breadcrumb / prev-page navigation is a follow-on.")

## 4. Shopping-list line

Take A's `kit.exitTarget` / `kit.withChangeContext` precedence rule (explicit hub exit > change
context > next-in-section) and its loop-threading discipline. Take B's `hrefForChange`
three-shape derivation (singleton / line / unit) — it is the cleaner outbound resolver and
already covers depth-2, which A only reaches via a bespoke fragment href.

## Files/commands used

- grep (whole-tree, both B paths): `change=1|query\.change|changeMode|returnTo|referrer|\?change|backTo|cameFrom`; `h.redirect`; `hidden|input type`; `changeLinkFor|nextAfter|urlForNext|opts.query`
- B: `lib/page-controller.js`, `lib/line-page-controller.js:29`, `lib/unit-page-controller.js:32`,
  `contract.js:95-166`, `features/check-your-answers/controller.js`, `routes.js:76`,
  `obligations.md:2285-2354`, `RECOMMENDATION.md:82`
- A: `shared/kit.js:44-63`, `features/check-answers/controller.js:28-31`, `flow/dispatch.js:55-75`,
  `shared/change-context.test.js`, `prototypes/e2e/live-animals.spec.js:2520-2592`
