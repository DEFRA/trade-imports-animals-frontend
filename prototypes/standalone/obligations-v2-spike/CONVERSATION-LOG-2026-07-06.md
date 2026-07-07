# Conversation log — obligations-v2-spike review

> Started **2026-07-06 14:35 BST**. A running note of actions and decisions from a
> voice review session over the obligations-v2 spike (nested/indexed/conditional
> collections phase, entry 6a/6b/6c). Purpose: capture what we surface so it can
> **scope the next set of work** on the spike.

## Context at session start

- Reviewer (Sam) + Claude, loaded on all seven spike docs + load-bearing code.
- State: branch `spike/EUDPA-249-nested-collections`, verdict **GO**, 102 unit / 70 E2E green, not merged.
- The recorded honest limits going in (from FINDINGS "FINAL READ"):
  - Cross-frame conditionality is **unmodelled** — the model's first growth edge.
  - Ownership at depth is **derived, not declared** per field.
  - **Two identity vocabularies** (template vs instance), bridged not unified.
  - Edit-in-place at depth (`updateEntryAt`) is a tested primitive with **no UI**.
  - CYA does not surface driver / nested-claim detail.

## Decisions & actions

| Time (BST) | Type | Note |
| --- | --- | --- |
| 14:35 | action | Created this conversation log at Sam's request, to note actions/decisions as we go and feed next-work scoping. |
| 14:42 | positive | Feature (vertical-slice) structure lands well — a simple feature (e.g. `about-you`) is a clean, self-contained trio (controller + obligations + template) a new dev can read and edit. Keep this. |
| 14:42 | feedback | **`defs` naming is not clean-code.** The per-feature `export const defs = [...]` is an abbreviation, and "obligation defs" is muddy — if they're obligations, call them `obligations`. Preferred rename: `defs` → `obligations`. |
| 15:05 | convention | **A file named `index.js` must be a pure barrel — imports + re-exports only, zero owned logic.** `engine/index.js` violates this today (it owns `commit`, `makeScope`, `wipeOrder`, `collectionView`, the append/remove primitives). Sharpens NW-2: move the facade logic into named modules and let `engine/index.js` re-export only. (Related but out of the literal rule: `registry.js` is an assembling barrel that also owns `walk`/`walkDefs` logic — same spirit, but it's not named `index.js`, so a judgment call whether the rule extends.) |
| 15:10 | feedback | **`collects` should link to obligations by reference, not string coincidence.** Sam's instinct (kill the string match that only agrees with def ids by luck) is right and paradigm-consistent (real const refs, like `activatedBy`). But his specific mechanism `meta.collects = obligations.map(o => o.id)` is **wrong** — see NW-3 counterexamples. Corrected proposal: reference the objects, `collects: [modDescription.id]`. |

## Open questions raised

- **Exact target names for the `refs`/`walkDefs` members** (see NW-1) — decide during execution: `walkDefs` → `walkObligations`? `registry.refs` (id→obligation object) → `references` or `obligationsById`? `byId`/`byPath` are compound-clear, left as-is unless we want them too.

## Decisions

- **DEC-0 (14:46): session mode = REVIEW / SCOPING.** We log next-work items for the future; nothing is executed in this session. Candidate items below are the backlog, not a to-do for now. **SUPERSEDED 16:30 — review complete; mode flipped to IMPLEMENT. See the Work Order below and `IMPLEMENTATION-PROMPT.md` (handoff for a fresh agent).**
- **DEC-1 (14:44): de-abbreviation is a FULL PASS**, not the narrow `defs`-only rename. Clean up the whole `def`/`defs`/`refs` family in one go so no half-abbreviated seam is left. (Sam: "do a full pass of everything.")

## WORK ORDER (implementation sequence — added 16:30)

Sensible order. Principle mirrors the spike's own method (safety-net → structural → additive → verify): foundational rename first (unblocks clean references), then the small cohesive "reference-not-string" cleanups, then structural decomposition, then the two bigger additive pieces, bracketed by a discovery/verification sweep. **Every phase ends GREEN** (`npm run test:obligations-v2-spike` = 102, `npm run test:prototype` = 70); one commit per phase, `EUDPA-249` prefix.

- **Phase 0 — NW-6 (discovery sweep).** Spike-scoped best-practices Workflow (read-only, per-`.js` fan-out → triage report). Confirms/enriches the backlog and catches files not manually reviewed. Its output feeds the deliberate phases. No code changes — a report.
- **Phase 1 — NW-1 (foundation rename).** Full de-abbreviation (`defs`→`obligations`, `walkDefs`→`walkObligations`, `def`→`obligation`, `refs`→full name). Pure rename — must stay byte-green. Do first so every later phase works against clean names.
- **Phase 2 — reference-not-string seams (cohesive family, build on Phase 1).** NW-7 (per-feature `page.js`, `flow` spreads the ref + `gate`; mind the import CYCLE), NW-3 (derive `collects` from non-system obligations + override for splits), NW-8 (`section.addon` → generic marker + hub-owned title). Low-risk, same theme, quick wins.
- **Phase 3 — NW-2 (structural decomposition).** Audit every `engine/` module; `index.js` becomes a pure barrel (zero owned logic — DEC/convention); split the overloaded facade + `status`; `util.js` → `lib/`. Bigger structural move; do before Phase 4/5 which also touch engine.
- **Phase 4 — NW-4 (persistence shape, stubbed).** Two-port store (session + records), write-through-on-save, resume-days-later, journey↔user assoc — all STUB bodies (guardrail: no real Defra ID / Mongo / Redis work). Depends on Phase 3's engine structure. Safety-net tests first.
- **Phase 5 — NW-5 (analysis hardening).** Extend `proveReachability` to full depth via representative-instance witnessing (closes the windscreen-provider coverage hole). Additive proof; safety-net/teeth test first.
- **Phase 6 — verification.** Re-run the Phase-0 sweep + full unit + E2E; confirm green; tidy the log ("landed as" per item).

## Candidate next-work items

- **NW-1 — Full de-abbreviation pass (per DEC-1).** Rename the whole family:
  - `export const defs` → `export const obligations` in every `features/*/obligations.js` (~12 files).
  - Barrel `registry.js`: `...claims.defs` → `...claims.obligations` (all spreads).
  - `walkDefs` → `walkObligations` (function + all call sites: `dispatch.js`, `registry.js`'s `byPathMap`).
  - Yielded field `{ templatePath, def }` → `{ templatePath, obligation }` and each destructure at call sites.
  - `registry.refs` → chosen full name (see open question).
  - Downstream text: `contract.test.js`, `EXTENDING.md` worked examples (`...vehicle.defs`), and any doc prose citing `defs`/`walkDefs`.
  - Verify with `npm run test:obligations-v2-spike` (expect 102) + `npm run test:prototype` — pure rename, must stay green.
- **NW-2 — Audit EVERY `engine/` module for decomposition (barrel pattern).** Sam's steer: `status` was just the example — review the whole of `engine/` for "does this deserve splitting into a sub-module with a deliberate public/private surface behind a barrel?" Seeded per-file assessment:
  - **`index.js` (the facade) — strongest candidate.** Currently overloaded: read facade (`makeScope`/`get`), scalar write (`commit` + the pure `wipeOrder` helper), collection mutations (`appendEntryAt`/`updateEntryAt`/`removeEntryAt` + single-level wrappers + `collectionView`), and `submitJourney` — four concerns in one file. Split into `engine/facade/` with `read`/`commit`/`collection`/`submit` behind one barrel; `wipeOrder` is a pure helper that arguably belongs with the path/wipe logic, not the facade.
  - **`status.js` — strong candidate.** Split engine-pure `statusOf` from the flow-aware section roll-up (`sectionStatus`/`sectionObligationIds`/`readyForQuote`, which reach into `flow/`), and the per-item completeness helpers (`entryComplete`/`collectionComplete`/`satisfied`) as a third concern. See OBS-1.
  - **`predicate.js` — borderline.** Already two concerns (`applyPredicate` operator vs `evalPredicate` frame-aware resolver) but only ~50 lines; a barrel may be overkill. Split only if it aids clarity.
  - **`reconcile.js` — borderline.** Cohesive pure function; could separate scope-fixpoint from wipe-computation but small today.
  - **`store.js` / `journey.js` — leave.** Each is one cohesive concern (the Map + journey doc; the cookie + load-or-create).
  - **`util.js` — placement observation, not decomposition.** `isBlank`/`isAnswered` are context-agnostic and know nothing about obligations — like `lib/path.js`, they arguably belong in `lib/`, not `engine/`.
- **NW-3 — Derive `meta.collects` by default from the feature's obligations; override where a feature splits.** **DECIDED design (Sam's call, 15:22): default-derive is cleaner; keep an override escape hatch for the exceptions.** Today each collecting controller hand-writes `collects: ['claims']` — string ids matching def ids only by coincidence, caught (if wrong) only at boot. Replace with:
  - **Default:** `collects` derived from the feature's obligations, filtered to non-system, as ids — via a small helper (e.g. `collectsFrom(obligations)` → `obligations.filter(o => !o.system).map(o => o.id)`). Reads the real objects, so it's linked by reference, not string coincidence. Covers ~all single-page features (email, addons, cover-type, driving-history, about-you, your-vehicle, claims, named-driver-hub, protected-ncd, optional-extras).
  - **The non-system filter dissolves the quote case.** My earlier "counterexample 2" was wrong: `premium` is `system: true`, so the non-system filter yields `[]` for `quote` automatically — **no override needed.** (`features/quote/controller.js` already declares no collects; the default agrees.)
  - **Override IS required for multi-page splits — not just a nicety.** `features/modifications/obligations.js:22` has `obligations = [modDescription, modValue]`, but `describe.controller.js:13` collects only `modDescription` and `value.controller.js:9` only `modValue`. If both pages took the default they'd BOTH claim both obligations, and `buildDispatch` (`flow/dispatch.js:72-79`) throws "collected by two pages" — so the partition is mandatory for boot to pass, and each such page supplies an explicit object-ref subset: `collects: [modDescription.id]`.
  - **Consistent surface:** default form and override form both reference the objects (`o.id`), never bare strings — the original goal (kill the string coincidence) holds in both.

- **NW-4 — Reshape `store` as a persistence service with the REAL two-store shape (stub bodies, real seams). REVISED 15:52 after Sam added the durable-persistence + resume requirement.** Today's single in-memory Map (`engine/store.js`) hides what production actually needs:
  - **Hard requirements Sam stated:**
    1. **Persist to the durable store (Mongo) on EVERY save-and-continue** — not just at submit. Durable journey state per page.
    2. **Resume a quote days later** — so it CANNOT be cookie-only; the journey must be rehydratable from the database. Implies journeys are keyed/queryable by the **authenticated user (Defra ID)**, and a "resume my saved quote" entry point that works without the original cookie.
  - **Why BOTH Redis and Mongo (reasoned hypothesis — CONFIRM against the real frontend/backend):** cookie holds only a session/journey id (answers are too big and must survive cookie loss / new device). **Mongo = durable source of truth** for the answers, written through on every save, enabling resume days later. **Redis = session layer** — the Defra ID OIDC session + a fast per-request cache of the active journey so every request isn't a Mongo round-trip; rehydrated FROM Mongo on a cold resume. Net: Mongo is source of truth for *resumability*, Redis is the *fast/auth session* in front of it.
  - **Revised port shape** (beneath the facade, stub bodies in-spike):
    - `session` port — OIDC/session + fast cache of the active journey (Redis in prod).
    - `records` / durable port — `create` / `load(byId or byUser)` / `saveAnswers` **write-through on every commit** / `finalise(application)` at submit (Mongo via backend API in prod).
  - **`submit()` is then just the finalise step**, not the first durable write (durable writes already happened on every page). It materialises the frozen snapshot (answers + derived quote: premium + reference).
  - **Journey ↔ user association is a real MODEL addition** the spike lacks: `journey.js` is cookie-only, no user. Cookieless resume needs journeys tied to the Defra ID account and a listing/resume surface.
  - **PARADIGM STRENGTH to highlight (this is a selling point, not a cost):** because the model stores *nothing derived* and `reconcile` rebuilds ALL scope/status/wipe on load, **rehydration days later is trivially safe** — load the answers map from Mongo, run `reconcile`, and you are byte-exactly where you left off. No derived-state snapshot to persist or migrate, no stale-scope risk. Resume is "load JSON + reconcile." That directly answers "recover a creation days later."
  - *Research sub-task (parked, per Sam): inspect `repos/trade-imports-animals-frontend` (+ backend) for the actual session/durable split — is it `catbox-redis` for session, Mongo write-through per page, journeys keyed by Defra ID? Mirror that shape.*
  - **Contained beneath the facade:** `engine/index` already hides `store` from controllers, so the port split doesn't touch callers. Proportionate — real seams + stub impls, not full hexagonal ceremony.
  - **GUARDRAIL (Sam, 15:55): do NOT let this create hard work — especially Defra ID.** Stub the auth/user-association and both stores; the *shape* of the requirement is what's true, not a real Defra ID integration or a real Mongo/Redis. Keep it prototype-cheap.

- **NW-5 — Extend `proveReachability` to full depth (it only proves the top-level scope space today). Sam: "top level is not good enough."** Current state (`analysis/reachability.js`): `enumerateScopeStates()` is the cartesian product of the top-level activators only (`hadClaims` × `voluntaryExcess` × `coverType` × addon subsets = 64), and the check iterates `registry.all` (ROOTS) with `inScope.has(obligation.id)` (bare id). So:
  - **The concrete, real gap: item-conditional obligations get ZERO coverage.** The enumeration never varies the *contents* of a collection entry, so `windscreenProvider` (owed only when a claim's own `claimType === 'windscreen'`) is **never put in scope by any enumerated state** — its reachability is completely untested today. That's the honest hole.
  - **Sub-obligations at depth aren't iterated at all** (roots only), and collection cardinality (0/1/many, nested) isn't enumerated.
  - **Why it's *arguably* sound today but only by an UNSTATED argument (this is the crux):** ownership at depth is DERIVED — a sub's owning page is its collection ancestor's page (`flow/dispatch.js` `ownerOfObligation`), which is a flow page; and a sub can't be owed unless its collection is in scope (reconcile gates it). So sub-owed ⟹ collection-in-scope ⟹ collection-page-reachable (already proven) ⟹ sub reachable. True *by construction* — but the **prover doesn't verify it; the prose does.** Sam's discomfort is legitimate: we assert top-level and *argue* the rest.
  - **The extension (tractable — NOT an infinite-enumeration problem):** walk `walkDefs()` (every def, every depth) instead of `registry.all`. For each obligation synthesise a **minimal witness** answers map that puts it in scope — the enumerated top-level activators + a single **representative** collection entry (per-instance independence means instance 0 generalises to instance n — they share a derived page), toggling the item-conditional sibling value (e.g. a claim with `claimType: 'windscreen'`) so the windscreen-provider-owed state is actually exercised. Reconcile the materialised map, confirm the def's instance path is in scope, resolve its (derived) owning page, and check it's reachable via `simulateJourney`. Representative-instance witnessing → O(defs × item-conditional branches) witnesses, not O(nᵈᵉᵖᵗʰ).
  - **Caveat unchanged:** still proves PAGE reachability, not input validity (validity stays a controller/Joi concern, per the entry-4 resolution on `reachability.js`). And note `simulateJourney` only emits *flow* pages (the loop hubs), not the add/entry sub-pages — which is consistent with derived ownership sending subs to the collection's hub page, but worth confirming the witness check targets the right page.

- **NW-6 — Systematic per-file JS best-practices pass over the whole spike.** Sam: cheap way to sort out lots of clean-code issues at once. Assessment:
  - **Not heavy in effort — the workspace's `code-style` skill is purpose-built for exactly this** (per-`.js` fan-out against the 17-rule style guide + JSDoc-accuracy rules, one worker per file).
  - **Scale is bounded:** 58 source `.js` files (70 incl. 12 test files). Parallelisable, each file cheap/independent — "heavy" only in proportional token cost, not complexity.
  - **What it will and won't find:** the spike is already eslint + prettier clean (MONDAY.md), so it won't surface formatting/lint noise. It surfaces the **judgment-level** rules — naming (`defs`-class abbreviations), function shape, JSDoc accuracy, test-behaviour-not-implementation. That's the same class we've been finding by hand (NW-1 etc.), so it *systematises* it and reaches the files we haven't looked at.
  - **Mechanism — DECIDED (Sam, 16:12): a bespoke Workflow, NOT the `code-style` skill.** The skill is repo/ticket-scoped and would drag in the whole frontend repo; Sam only cares about this spike directory. So: write a **Workflow that globs just the spike's `.js` files and fans out one agent per file** against `docs/best-practices/` (the 17-rule guide) — spike-scoped, no ticket, no diff. (This is what Sam asked for originally.)
  - Overlaps with / would likely re-derive NW-1 (the `defs` rename), NW-3, NW-7 and possibly seed more of NW-2's decomposition candidates.

- **NW-7 — `flow.js` page entries repeat `{id, slug}` by string coincidence — reference them instead.** Same theme as NW-3. In `flow/flow.js` every page is a hand-written `{ id: 'about-you', slug: 'about-you' }`, and those id/slug strings duplicate what the controller already defines — e.g. `features/claims/list.controller.js:13` `const page = { id: 'claims', slug: 'claims' }`. Sam's idea: flow should **spread the controller's page reference and add only `gate` as the delta**, instead of re-typing id/slug for every entry:
  ```js
  { ...claimsPage, gate: (s) => s.inScope.has('claims') }   // gate is the only flow-specific bit
  ```
  - **GOTCHA — naive spread creates an import CYCLE (rigorous caveat).** `flow/flow.js` currently imports nothing from features (pure data). If it imports a controller: `flow/flow.js → features/claims/list.controller.js → engine/index.js → engine/status.js → flow/flow.js`. That's a real ES-module cycle, and it bites at load time — `flow.js`'s `sections` is evaluated on import and would read the controller's `page` before it's ready → `undefined`. Not merely stylistic.
  - **Clean fix:** extract each page's identity (`{id, slug}`) into a **cycle-free leaf** that both the controller and `flow.js` import. **DECIDED (Sam, 16:18): per-feature `page.js` in the feature folder** (keeps it in the vertical slice), NOT a central `pages.js` manifest. The controller spreads it into `meta`; flow spreads it + adds `gate`. The id/slug string is authored **once**, referenced everywhere, no cycle.
  - Consistent with the paradigm's core principle (real references, not string ceremony) and with NW-3 — several seams still match by string coincidence (`collects`, flow page id/slug); the uniform fix is reference-through-a-shared-object, minding cycles.

- **NW-8 — `section.addon` is a domain concept leaking into generic `flow.js`.** Sam's read is right. What it is: a marker on the three add-on sections (`flow/flow.js:39,45,54`), read in exactly ONE place — `features/hub/controller.js:70-77` — doing two jobs: (1) **discriminate** the dynamic add-on sections from the always-live ones (`sections.filter(s => s.addon && s.gate(scope))`), and (2) **key the task title** (`ADDON_TITLE[s.addon]`). Its value (`'named-driver'` etc.) is a member of the `addons` obligation's value-domain, so **yes, it's directly tied to the addons picker feature.**
  - **Two smells:** (a) it's a **domain concept** on `flow`, which is meant to own sequence + gating only (generic); (b) same **string-coincidence** disease — `'named-driver'` is duplicated across three places (the `addons` obligation option, the flow `addon:`, and the `ADDON_TITLE` key), matched by string.
  - **Options, increasingly clean:**
    1. *Reference not string:* `addon: namedDriverValue` — fixes the coincidence but leaves domain in flow.
    2. **RECOMMENDED — generic marker + hub-owned title.** Replace `addon: 'named-driver'` with a **generic** `dynamic: true` (flow may legitimately know "this section is conditionally presented by a picker"), and move the title into the hub keyed by **section id** (`ADDON_TITLE` re-keyed by id — trivial, since section id === addon value here). Removes all domain specificity from flow; keeps explicit opt-in; presentation (titles) lives in the hub where it belongs.
    3. *Drop the marker entirely:* hub derives add-on rows as "sections not in its known static set." Most minimal flow, but **fragile** — the hub must then know every static section, so a new static section wrongly renders as an add-on unless the hub is updated.
  - Recommend option 2; it best honours "flow owns structure only" without the derive-by-exclusion fragility.
  - **How the marker compares to `gate` (Sam's follow-up — are they redundant? No, different axes):**
    - **`gate` = runtime applicability.** A predicate over scope: "given these answers, is this section/page live right now?" State-dependent, per-request, used broadly — by `navigation` (next applicable page) and the hub status for ALL sections/pages.
    - **marker (`addon`/`dynamic`) = static presentation-role.** Answer-independent: "does this section get its own dynamically-appearing hub row?" Used only by the hub for task grouping.
    - **Gate is necessary but NOT sufficient to identify an add-on section.** Other sections/pages have gates too — `claims` (`flow/flow.js:28`, a gated page *inside* the always-live driving-and-cover section) and `get-your-quote` (gated on `readyForQuote`). So "has a gate" ≠ "is an add-on hub task"; you can't derive the marker from the gate.
    - **Implication direction:** `dynamic: true` *implies* a gate exists (a conditionally-presented section must be gated), but not vice versa. So the marker isn't redundant — it captures a role the gate can't express.
    - **The real question this surfaces:** a `gate` is legitimately structural (flow's job — sequencing/gating), but a *presentation-role* marker is arguably the **hub's** concern, not flow's. That nudges toward option 3 (hub owns the grouping) on purity grounds — traded against its fragility. Net: option 2 keeps it explicit and simple; option 3 is philosophically cleaner but fragile. Judgment call left to Sam.

## Observations (architecture)

- **OBS-1 — the real fuzzy seam is `status`, not `dispatch`.** `dispatch` correctly lives in `flow/` (see reasoning below). But `engine/status.js` imports `collectsOf` from `flow/dispatch.js` and `nonQuoteSections` from `flow/flow.js` — an engine→flow upward reach. `statusOf` is pure engine (obligation ids + scope → status); `sectionStatus`/`sectionObligationIds`/`readyForQuote` are flow-aware. The NW-2 decomposition would surface this: a clean split is an engine-pure status core vs a flow-aware section roll-up (candidate: move the section-roll-up part to `flow/` or the hub).
- **OBS-2 — RESOLUTION (15:35): discussed, NO further action.** Sam is explicit: not breaking features into reusable web components at this point. Recorded for context only; not a backlog item.
- **OBS-2 — "features as reusable web components on multiple pages" = the parked many-to-one dispatch case (DISCUSSION-LOG entry 1).** Sam asked whether the model survives if a feature (e.g. `email`) became a web component embedded on more than one page. Analysis:
  - **The obligation/state model survives untouched.** `reconcile`/`status`/`predicate`/`store` key off obligation id in the answers map and never know about pages (page-agnostic by construction). Two pages both rendering + writing `email` is fine to the state layer — "a value is a value" (this is exactly entry 1's finding).
  - **The dispatch seam is where it bites** — and it's precisely DISCUSSION-LOG entry 1 ("Can one obligation be satisfied by more than one page?"), which is **parked / demand-driven.** `collects` is one-to-one; two pages claiming `email` makes `buildDispatch` throw ("collected by two pages", `flow/dispatch.js:72-79`), because the CYA "Change" link needs a single unambiguous target (`pageOfObligation`).
  - **Three sub-cases:**
    1. *Component reused as a view/writer, obligation keeps ONE canonical home page.* Works with a modest change: split "owns for Change" (one page declares `collects`) from "also renders/writes" (embedding pages). Needs the contract test relaxed (today it asserts committed == collects per page, so an embedding page that writes `email` without collecting it would fail).
    2. *Obligation has NO single home (different Change target per context).* Genuine model growth — many-to-one dispatch + context-aware Change resolution. Unproven; the real entry-1 work.
    3. *Same component, DISTINCT value per placement (two emails).* id-keying breaks (one key, one value) → needs per-placement instancing = the indexed-collection path machinery, or distinct ids per placement.
  - **Bonus insight:** a web-component direction actually pulls *toward* the vertical-slice ethos — a component co-locating its obligation + validation + template is the feature-slice taken one step further (feature decoupled from page). The friction isn't the obligation model; it's that Hapi controllers and the `flow` section-ordering are currently **per-page**, so a page would become a *composer* of component sub-handlers, and components have no standalone slot in the flow.
- **Why `dispatch` is in `flow/`, not `engine/`:** dispatch is the obligation→page ownership seam — its input is page-side `collects`, its output is page identity, its consumers are the hub + CYA Change links. The engine is deliberately **page-agnostic**: `reconcile`/`predicate` never name a page. Putting dispatch in engine would let the state layer know about pages, breaking the one-directional seam the whole design rests on ("the model never names a page"). So dispatch belongs on the page/flow side.

---

## Implementation progress (started 2026-07-06, branch `spike/EUDPA-249-obligations-v2-improvements`)

> Driven per `IMPLEMENTATION-PROMPT.md` — one Workflow per phase, dynamic. Baseline
> pinned before any work: **unit 107** (`npm run test:obligations-v2-spike`, 12 files) /
> **E2E 70** (`npm run test:prototype`, ~30s). (The prompt quotes "102 unit" from
> MONDAY's older snapshot; HEAD actually carries 107 — 107 is the byte-green bar for the
> pure-rename/refactor phases.) Commits use `--no-verify` per the MONDAY caveat (whole-tree
> `format:check` trips on two pre-existing stray prompt files that aren't ours); own code
> stays eslint + prettier clean and both suites are run by hand each phase.

- [x] **Phase 0 — NW-6 (best-practices discovery sweep). DONE — no code change; report only.**
  _Landed as:_ a bespoke read-only Workflow globbed all **70** `.js` files (58 source + 12
  test) and fanned out one Sonnet agent per file against
  `docs/best-practices/` (primary: `node/code-style.md` + the JSDoc-accuracy guides;
  `hapi.md` for controllers; `testing/frontend.md` for `.test.js`), then an Opus
  completeness-critic synthesised a triage report cross-referenced to the NW backlog. Full
  report saved as [`PHASE0-SWEEP.md`](PHASE0-SWEEP.md). Result: **236 findings (H6 / M96 /
  L134)** across 68 files (2 clean: `features/start/controller.js`, `lib/validate/index.js`).
  It **CONFIRMS + blast-radius-maps every NW item the later phases target** — NW-1 ×21
  (the `defs`/`walkDefs`/`def`/`refs` family, with the exact cross-file spread — rename must
  land in `registry.js` spreads + `walkDefs`/`walk` consumers in one pass), NW-3 ×11 (incl.
  one HIGH at `modifications/value.controller.js:9`), NW-7 ×10 (+ the enrichment that flow
  `slug`/`id` drift has **no** boot guard, unlike `collects`), NW-8 ×1, NW-2 ×2 (with a
  concrete target decomposition + `lib/validate/index.js` named as the positive barrel
  counter-example). It also surfaced **191 NEW findings** — most are mechanical (a ~25-strong
  single-char-locals batch, doc-block misattachment, magic-string extraction) that get swept
  up opportunistically as later phases touch those files; but **5 NEW _highs_ are genuine and
  out-of-NW-scope** and are flagged for a scope decision (not silently actioned): (1)
  `analysis/simulate.js` doc claims scope "can never drift" but `readyForQuote` silently
  degrades to vacuously-true if `buildDispatch()` hasn't run; (2) `features/your-vehicle` and
  (3) `features/cover-type` controllers persist the raw `£1,234` payload, discarding the
  `currency()`-cleaned value (real data-integrity smell); (4) `flow/navigation.js` doc claims
  section-level gating it does not enforce; (5) `engine/nested.test.js` claims a
  "no-rehydrate-at-depth" invariant it never tests (coverage illusion). Two agents returned
  placeholder noise (`lib/path.test.js` + a mis-named `test` entry) — a small coverage gap to
  re-run in Phase 6. Green unchanged (read-only): unit 107 / E2E 70.

- [x] **Phase 1 — NW-1 (full de-abbreviation, per DEC-1). DONE — pure rename, byte-green.**
  _Landed as:_ a fan-out Workflow (one agent per file + a docs agent + a completeness critic)
  applied the whole family in one pass across **25 files**: `export const defs` → `export const
  obligations` in all 12 feature `obligations.js`; the 12 `...x.defs` spreads in `registry.js`
  → `.obligations`; `walkDefs` → `walkObligations` (generator + recursive calls + imports + the
  `dispatch.js`/`indexed.test.js`/`nested.test.js` call sites); the yielded/destructured/param
  obligation binding `def` → `obligation` everywhere it holds an obligation
  (`{ templatePath, def }`, `{ path, def, … }`, `n.def`, `for (const def of …)`, `const def =
  registry.byPath(…)`, `entryComplete(def, …)`, and `dump.js`'s `driversDef`/`driverClaimsDef`
  → `driversObligation`/`driverClaimsObligation`); and the doc-comments naming any of them.
  **DEC on `refs` (open question resolved):** `registry.refs` was defined once and consumed
  **nowhere** (a dead duplicate of `byId`), so — rather than rename dead code — it was
  **removed** (property + its header-comment bullet); that is the honest "no abbreviated seam
  left" outcome. Live docs updated (`README.md` module map + `EXTENDING.md` worked-example
  code); the dated historical docs (DESIGN/FINDINGS/DISCUSSION-LOG/DESIGN-PROVENANCE/MONDAY)
  left as period records. `walk`, `byId`, `byPath`, `all`, `item`, `siblings`, `framePath`
  deliberately untouched (clear names, not abbreviations). Diff: 123 insertions / 125 deletions
  (net −2 = the dropped `refs`), no behaviour/control-flow/ordering change. Completeness critic
  found zero residual code symbols; 3 stale comment/test-label prose leftovers
  (`obligation-purity.js`, `routes.js`, `nested.test.js` describe-string) were then fixed.
  Own code eslint + prettier clean. **Byte-green: unit 107 / E2E 70** (identical to baseline).
  _(Amended post-hoc: the longer identifiers made prettier wrap `registry.js`'s
  `walkObligations` recursion `if` onto two lines, tripping the eslint `curly` (multi-line)
  rule — I'd failed to re-lint after the Phase-1 prettier-write. Fixed with braces and folded
  into this commit; still byte-green.)_

- [x] **Phase 2 — reference-not-string seams (NW-7 + NW-3 + NW-8). DONE — green, no DOM change.**
  _Landed as:_ a canary→fan-out→central→critic Workflow. **NW-7:** every flow-page feature now
  authors its `{ id, slug }` ONCE in a cycle-free `features/<feature>/page.js` leaf that imports
  nothing; the controller imports it (`import { <x>Page as page }`) and `flow/flow.js` imports the
  SAME leaves and spreads them, adding only `gate` — so no `{ id, slug }` literal is hand-typed in
  flow.js anymore, and the flow→controller→engine→status→flow **cycle is structurally impossible**
  (flow imports only leaves; critic verified each imports nothing). **NW-3:** `meta.collects` is now
  reference-derived — a new `collectsFrom(obligations)` helper in `shared/kit.js`
  (`obligations.filter(o => !o.system).map(o => o.id)`) for single-page features, and explicit
  object-ref subsets for the one split (`modifications`: `describe` → `[modDescription.id]`, `value`
  → `[modValue.id]`). The non-system filter dissolves `quote` to `[]` with no override (premium is
  system) and keeps `vehiclePhoto` (renderOnly, not system) in your-vehicle's set — every page's
  collected id-SET is provably unchanged (pinned by `contract.test.js` + `buildDispatch`). No
  bare-string `collects` array remains. **NW-8 (chose log option 2):** the domain marker
  `addon: '<value>'` on the three add-on sections is replaced by a generic `dynamic: true` (flow owns
  sequence+gating, not domain); the hub filters on `s.dynamic` and keys `ADDON_TITLE` by section id
  (title stays hub-side presentation). Completeness/cycle critic PASS on all four checks. Own code
  eslint + prettier clean (2 new page.js prettier-fixed). **Green: unit 107 / E2E 70.**

- [x] **Phase 3 — NW-2 (engine decomposition + barrel convention). DONE — green, adversarially verified.**
  _Design (Phase 3a):_ a 3-architect → 2-adversarial-judge → synthesis panel (the provenance
  method) chose **convention-first + two grafts** (barrel discipline from the minimal proposal,
  a `destroyWiped` dedup from the cohesion proposal). Plan saved to the scratchpad and executed
  in 10 ordered steps.
  _Landed as (Phase 3b — one implementer + a 4-agent adversarial-verify panel):_ `engine/` is now
  a set of single-responsibility modules behind a **pure-barrel `index.js`** (explicit named
  re-exports, zero owned logic — the standing convention): `read.js` (get/makeScope + the
  readyForQuote seam), `write.js` (commit + all entry mutations + submit), `collection-view.js`,
  `status.js` (engine-pure `statusOf` core), `complete.js` (depth-aware completeness), with
  `predicate.js`/`reconcile.js`/`store.js`/`journey.js` unchanged. Context-agnostic helpers left the
  engine: `util.js` → **`lib/answered.js`**; `wipeOrder` → **`lib/path.js`** (+ new `destroyWiped`
  dedup, byte-verified against git HEAD). **OBS-1 fixed:** the flow-aware roll-up
  (`sectionStatus`/`sectionObligationIds`/`readyForQuote`) moved OUT of engine into new
  **`flow/section-status.js`**, so no `engine/*` module imports `flow/` anymore. The one real design
  choice — how to keep `scope.readyForQuote` on the engine's scope object without the engine
  importing flow — was resolved with a **fail-loud boot-time injection seam**
  (`configureReadyForQuote(fn)` in `read.js`, wired at the composition roots), NOT a silent default
  (which would reintroduce the vacuous-true footgun Phase 0 flagged in `simulate.js`). That fail-loud
  choice earned its keep: it exposed a **5th boot site** the plan's grep missed
  (`analysis/reachability.test.js` → `simulateJourney` → `makeScope`), wired identically. **ZERO
  churn to the 20 `import * as state` controller lines**; only `hub` (sectionStatus) and
  `check-answers` (isBlank) changed a non-state helper import. Adversarial-verify panel: injection
  skeptic "no gaps", status/complete skeptic "clean" (recursion + item-relative gate intact, no
  cycle), wipe skeptic "clean" (byte-diffed vs HEAD), barrel/acyclicity critic **PASS**. Own code
  eslint + prettier clean. **Green: unit 107 / E2E 70.**

- [x] **Phase 4 — NW-4 (two-port persistence SERVICE shape, all stubs). DONE — additive, green, verified.**
  _Design (Phase 4a):_ 3-architect → 2-judge → synthesis panel chose the **minimal-stub** shape,
  decisively because it keeps `cookie = journeyId` (so the seeded-cookie tests stay byte-green by
  construction, not by hope), grafting in a polymorphic `load({journeyId}|{userId})`, an
  `x-stub-user` header override, and the self-heal test. Plan saved to scratchpad.
  _Landed as (Phase 4b — safety-net-first → reshape → shape tests → resume route + adversarial
  verify):_ `engine/store.js` split into two STUB ports beneath the unchanged facade —
  **`engine/persistence/records.js`** (durable source of truth: old store body + a `userId` field +
  a `Map<userId,journeyId>` index + polymorphic `load`, `saveAnswers` write-through on *every*
  commit/mutation, `submit`→`finalise` which flips status and writes NO answers) and
  **`engine/persistence/session.js`** (the OIDC/session seam: a constant `STUB_USER`, the
  active-journey cookie — same `'obligationsV2JourneyId'` literal). `store.js` shrank to a
  **byte-transparent compat shim** (git-diff-verified) so `store-ops.test`/`contract.test`/
  `confirmation` needed ZERO edits. `journey.js` rewired to compose the two ports + a
  `resumeByUser`; `write.js` import-swap only; `read.js`+`index.js` gained the single additive verb
  **`resume`**; a new additive **`features/resume/` GET route** demonstrates cookieless resume.
  **The paradigm strength is now a test, not a claim:** `resume = load(answers) + reconcile`, and
  `resume-self-heal.test.js` plants an out-of-scope answer (`hadClaims:'no'` beside a stale `claims`
  array) and proves `reconcile` excludes it on a days-later load — nothing derived is stored, so
  staleness cannot survive. **Guardrail held absolutely:** stub-only (no Redis/Mongo/Defra-ID/OIDC —
  critic grepped clean), `state.*` grew by exactly `resume`, zero controller churn, ports expose no
  delete-a-key/setScope (reconcile+destroyWiped stay the sole wipe path), acyclic (ports have zero
  engine imports). Safety-net tests (store-contract + journey, 11) were written and passed on the
  PRE-reshape code first. Adversarial-verify: shim byte-transparent, resume self-heal genuinely
  proven, guardrail/acyclicity critic PASS; the write-through skeptic found the per-mutator
  write-through was only tested for `commit` — **gap closed** with 3 added cases asserting durable
  state after append/update/remove via `records.load`. One correctness deviation: `start/controller.js`
  `startJourney(h)`→`startJourney(request, h)` (the only external caller; not a `state.*` change).
  Tests: 107 pre + 11 safety-net + 19 new-shape = **137 unit** (all additive; the 107 stay green) /
  **E2E 70**. Bare-stub boundary (what NOT to copy to prod) documented in-code and in the plan.
  eslint + prettier clean.

- [x] **Phase 5 — NW-5 (reachability prover to full depth). DONE — additive proof, adversarially verified.**
  _Landed as (safety-net-first → implement → adversarial verify):_ `analysis/reachability.js` no
  longer iterates `registry.all` (ROOTS only, bare-id) — it now walks `walkObligations()` (every def
  at every depth) and proves each is reachable via **representative-instance witnessing**. New
  `scaffoldFor(templatePath)` walks root→target minting one representative entry (index 0) per
  collection ancestor and satisfying the target's item-conditional sibling gate in that entry (e.g.
  `claimType:'windscreen'`); `buildWitnesses()` overlays that scaffold on each enumerated top-level
  state, reconciles, and keeps the first state whose `inScope` contains the target's instance
  `pathKey` (a target with NO such witness is surfaced as a `no-witness-puts-in-scope` problem, never
  silently skipped). `proveReachability` then resolves each target's derived owning page and checks
  it against `simulateJourney`. **The hole NW-5 exists to close is closed:** the item-conditional
  `windscreenProvider` is now genuinely witnessed at BOTH depths (`claims[0].windscreenProvider` and
  `drivers[0].claims[0].windscreenProvider`), with reconcile-confirmed non-null witnesses, and the
  new **teeth-at-depth** test proves the prover reports them unreachable if their derived hub page is
  dropped (the depth-2 one resolving to `pageId==='drivers'`). Cost is O(defs × item-conditional
  branches), NOT O(n^depth) — the critic confirmed no combinatorial blow-up (suite runs in ~12ms).
  The PAGE-reachability-not-input-validity caveat is preserved, and I added the critic's honest
  **soundness-assumption note** (one witness generalises only because every flow `gate` is a pure
  read of `inScope`/`readyForQuote`; if a gate ever keyed off a non-scope answer the single-witness
  proof could false-pass — the point to enumerate more). Adversarial coverage-at-depth skeptic
  hand-traced the nested reconcile and confirmed "full-depth coverage"; tractability/caveat critic
  **PASS**. Tests: 137 → **140 unit** (+3 additive) / **E2E 70**. eslint + prettier clean.

- [x] **Phase 6 — verification + finalise. DONE.**
  _Green confirmed:_ full unit **141** / E2E **70**, eslint + prettier clean across the spike.
  _NW backlog cleared (the point of the re-sweep):_ re-ran the Phase-0 methodology over the 27 new /
  substantially-rewritten `.js` files (the ~60 mechanically-renamed files were confirmed via
  deterministic greps — zero `defs`/`walkDefs`/`registry.refs`, no bare-string `collects`, no
  `addon:` marker, `engine/index.js` a pure barrel — rather than re-burning a full 99-file agent
  sweep on a throwaway spike). NW-mapped findings fell from **43 across 70 files (Phase 0)** to **3
  marginal re-tags across 27 files** — NW-1/2/3/7/8 are resolved. Report: [`PHASE6-SWEEP.md`](PHASE6-SWEEP.md).
  _Focused cleanup of my own new code (byte-green doc + test-only):_ fixed 8 JSDoc
  self-contradictions/drift in the phases-1–5 code (`records.js` "only answers mutable",
  `resume-self-heal`/`journey` test headers, `scaffoldFor` self-contradiction, `status.js`
  answered→satisfied, `store-contract` stale claim, `collection-view` fallback, `answered.js`
  date-parts), added a **direct `destroyWiped` test** (it was production code from Phase 3 with no
  direct test — real coverage gap closed), and pinned three weak assertions (bare `.toThrow()` →
  message-matched, `expect.any(String)` submittedAt → ISO-shape). Unit 140 → **141**.
  _Flagged for triage (NEW, out of the commissioned NW scope — not actioned):_ (a) HIGH —
  `hub/controller.js` renders raw internal page-ids into the add-on task **hint** copy
  (`pages.map(p=>p.id)`) — a **pre-existing** copy bug (not introduced by NW-8; the shared spec
  navigates by title so it stays green); (b) test-scaffold duplication — `stubH`/`req`/`makeH` fakes
  hand-copied (and drifting) across ~4 engine test files → a shared `engine/test-helpers.js`; (c)
  minor engine DRY (`get`/`resume`, the bounds-guard, `records` lookup+guard) and magic-string
  derivations (`reachability.ADDONS`, `x-stub-user`); (d) house-style naming (single-char params) and
  the `Should`/`#fn` test-naming convention — defer unless the spike graduates out of `prototypes/`.
  These are logged here and in `PHASE6-SWEEP.md` for a scope decision, not silently expanded into.

---

## Summary — obligations-v2-spike improvements (EUDPA-249), 2026-07-06

Seven commits on `spike/EUDPA-249-obligations-v2-improvements` (off `spike/EUDPA-249-prototype-layouts`),
one per phase, each `--no-verify` (the whole-tree pre-commit `format:check` trips on two pre-existing
stray prompt files that aren't ours; own code kept eslint + prettier clean and both suites run by hand):

| Phase | NW | What landed | Verify |
| --- | --- | --- | --- |
| 0 | NW-6 | Read-only best-practices sweep (70 files) → triage, NW blast-radius map | report only |
| 1 | NW-1 | Full de-abbreviation (`defs`→`obligations`, `walkDefs`→`walkObligations`, `def`→`obligation`, dead `refs` dropped) | byte-green + completeness critic |
| 2 | NW-7/3/8 | Reference-not-string seams: per-feature cycle-free `page.js`, `collectsFrom`, generic `dynamic` flag | green + cycle/completeness critic |
| 3 | NW-2 | Decompose `engine/` behind a pure-barrel `index.js`; OBS-1 fix (roll-up → `flow/section-status.js`) | design panel + 4-agent adversarial verify |
| 4 | NW-4 | Two-port persistence shape (stubs): `records`/`session` ports, write-through, cookieless resume | design panel + safety-net-first + verify |
| 5 | NW-5 | Reachability prover to full depth (representative-instance witnessing; windscreenProvider hole closed) | safety-net + coverage-at-depth verify |
| 6 | — | Re-sweep (NW cleared), focused cleanup, finalise | full unit + E2E green |

**Method:** every phase driven by the Workflow tool (fan-out for the mechanical passes; N-architect→M-judge
design panels for the two genuine forks; skeptics + completeness critics as the quality gate on anything
touching `reconcile`/`status`/`store`). **State: green — 141 unit / 70 E2E.** The three shared Playwright
specs and all 11 journeys are byte-unaffected. Phase 1–3 were byte-green pure refactors; 4–5 additive
(+34 unit tests). Design-panel plans + sweep reports are in the scratchpad / `PHASE0-SWEEP.md` /
`PHASE6-SWEEP.md`. Not pushed; no PR opened.

---

## Cleanup pipeline (EUDPA-249), 2026-07-07 — work order in `CLEANUP-TODO.md`

Sam commissioned a full clean-up pass: 12 tasks (T0–T11) across 8 phases, defined in
[`CLEANUP-TODO.md`](CLEANUP-TODO.md) (problems + acceptance criteria + gates; workers own the
diagnosis). Model routing: Phase 1–4 workers on Opus 4.8; T0/T9/T10/T11 on Fable. Same rails as
the 2026-07-06 pass (green every commit, one commit per task, `--no-verify`, own code lint-clean,
Workflow-orchestrated, parent-shell verification).

- [x] **T0 — activatedBy vs gate design investigation (report-only). DONE.**
  _Landed as:_ a 3-lens adversarial workflow (collapse advocate / separation advocate / empiricist
  catalogue) → skeptical judge who spot-checked citations (refuted 2 analyst miscites). **Verdict:
  CONSOLIDATE PARTIALLY** — 4 of 5 gates (claims + three addons) are pure `inScope.has(key)` reads
  fully determined by the model + `collects` (divergence ⇒ ghost NA row or quote deadlock;
  string-coincidence rename hazard already fired once in DESIGN.md ~277), while `readyForQuote` is
  a hard counterexample to full collapse. Report: [`T0-ACTIVATEDBY-VS-GATE.md`](T0-ACTIVATEDBY-VS-GATE.md).
  **Sam ACCEPTED the §7 proposal as T11** (Phase 4.5 — derive default gates from `collects`, keep
  `gate` as authored override; before T9/T10 so reorg + docs describe the consolidated design).
  No code changes; no green gate needed (read-only).

- [x] **T1 — currency values persisted raw (cleaned value discarded). DONE — green, adversarially verified.**
  _Landed as:_ investigate → implement (fail-before proven) → 3-skeptic verify workflow (Opus).
  Root cause: every controller composing the `currency()` validator destructured only `{ errors }`
  from `validate()` and committed the raw hand-trimmed payload, so `£9,000` persisted raw —
  **`Number('£9,000')||0` collapsed the premium value-loading to 0** (a £15,000 car priced the same
  as an empty field) and check-answers rendered `££9,000`. **Five sites fixed** (the investigation
  found one beyond the flagged four): `your-vehicle` (estimatedValue), `cover-type` (excessAmount),
  `modifications/value` (modValue), `claims/entry` + `named-driver/driver-claim` (claimAmount via
  the shared `claimFromPayload`). Fix is currency-key-scoped — `const { value: clean, errors } =
  validate(...)`, commit overrides ONLY the currency key (`clean.<field> ?? ''`); raw `values` kept
  for the error re-render (contract pinned by 2 guard tests). NOT wholesale `validate().value`
  (would clobber the controller-assembled date object + hand-trims). New
  `t1-currency-persist.test.js`: 8 tests through the real store — 6 proven fail-before (incl.
  premium 480→570), 2 error-path guards. Skeptics (coverage / over-correction / test-quality): no
  objections. **Green: unit 149 (21 files) / E2E 70, parent-shell verified; eslint + prettier clean.**

- [x] **T2 — internal ids leaking into hub task-list hint copy. DONE — green, browser-verified.**
  _Landed as:_ implement → 2-skeptic verify workflow (Opus); the first implementer died mid-run on
  an API error, so the run was resumed as an audit-and-complete pass over its inherited tree (fix
  kept after audit). Before: add-on rows rendered raw page ids as hints (`drivers`,
  `modifications-describe, modifications-value`, `protected-ncd-years`), the Email row's hint
  echoed its own title, and `ADDON_TITLE[s.id]` was unguarded (`undefined` title for an unmapped
  dynamic section). After: authored GDS-styled `ADDON_COPY` (title+hint per add-on, hub-side —
  page-owns-copy paradigm kept), Email hint "Where we send your quote", and a fail-loud
  `addonCopy()` lookup (throws naming the missing section — the codebase idiom). Other rows
  audited: group-row hints are authored copy, picker/quote rows carry no hint — nothing else leaked.
  Tests: `t2-hub-copy.test.js` (5 unit — rendered hints pinned, no-page-id sweep, fail-loud throw)
  + **new browser-level `prototypes/e2e/hub-copy.spec.js`** (drives the real hub, asserts the
  rendered `.govuk-task-list__hint` DOM; proven fail-before — the old derivation renders `drivers`
  and the spec fails; the shared journey specs navigate by title and can never catch this).
  Skeptics (copy/GDS + robustness): no objections. **Green: unit 154 (22 files) / E2E 71 (new
  browser pin), parent-shell verified; eslint + prettier clean.**

- [x] **T3 — engine test-scaffold duplication → shared `engine/test-support.js`. DONE — byte-green.**
  _Landed as:_ implement → assertion-preservation-skeptic workflow (Opus). Scope proved
  UNDERSTATED: not just the flagged 4 specs — the drift map found **5 duplicated fake families
  across 11 files** (6× `stubH` in two drifted forms; 6× journey-pinned request builder drifted on
  `headers`; 4× recording session `h` in three capture strategies; 2× seed helper; 2× `driveHandler`)
  plus duplicated route selectors (2× `postHandlerOf`, 4× endsWith-pattern). Consolidation rule:
  keep the SUPERSET, never flatten a capability (capturing `stubH`; `recordingH` = union of
  `.calls` log + `.cookies` jar; `driveHandler` returning `{before,after,response,view}`) — so
  every spec's observational power is intact and call sites unchanged via one-line aliases.
  Deliberately kept local: `journey.test.js reqWith` + `journey-user-assoc.test.js req` (session-
  seam builders, not copies — forcing them in would add indirection, not remove duplication).
  `headers:{}` uniformity proven inert (`session.userId` optional-chains). Module named
  `test-support.js` (not `.test.`) so vitest doesn't collect it. Skeptic: no objections.
  **Byte-green: unit 154 (22 files) / E2E 71, parent-shell verified; eslint + prettier clean.**

- [x] **T4 — state-I/O core DRY. DONE — byte-green, guard intent preserved.**
  _Landed as:_ implement → 2-skeptic verify workflow (Opus; guard-integrity + byte-green purity).
  Three genuine duplications factored behind module-private, intention-named helpers: (1)
  `read.js` `get`/`resume` shared an identical read-view tail → `readViewOf(journey)` (self-heal
  rationale moved onto the helper where the scope rebuild physically happens); (2) `write.js`
  bounds guard duplicated across `updateEntryAt`/`removeEntryAt` → `isValidIndex(index, list)`
  (De-Morgan-exact negation; the `splice(NaN,1)`→`splice(0,1)` gotcha rationale now covers BOTH
  call sites — `updateEntryAt` previously carried none); (3) `records.js` `saveAnswers`/`finalise`
  load-then-guard preamble → `loadWritable(journeyId)` (exact throw strings preserved — both
  pinned by store-contract/records-port tests; freeze-gate scope unchanged, non-mutating ops
  correctly excluded). Barrel surface untouched; no test edits. Skeptics: no objections.
  **Byte-green: unit 154 (22 files) / E2E 71, parent-shell verified; eslint + prettier clean.**

- [x] **T5 — magic strings → single source of truth. DONE — byte-green.**
  _Landed as:_ implement → derivation-soundness-skeptic workflow (Opus). Three derivations:
  (1) `reachability.js` `ADDONS` literal → derived from the model by collecting
  `activatedBy.includes` predicates targeting `registry.byId('addons')` via the traversal the
  prover ALREADY imports (no new edge; `Set`-dedupe is load-bearing — `modifications` is authored
  twice via `modificationsGate`; first-seen order byte-identical); (2) `session.js` gained
  `export const STUB_USER_HEADER = 'x-stub-user'` (additive; mirrors STUB_USER/JOURNEY_COOKIE
  convention), 3 re-typings in `journey-user-assoc.test.js` now computed-key imports;
  (3) `journey.test.js` hardcoded `'in-progress'` → imported `IN_PROGRESS` (was the lone re-typer
  among 4 sibling specs). Declined with reasons: the addons picker option list (slugs pair with
  authored copy that has no model source — presentation domain), the `includes:'<slug>'` authoring
  sites themselves (they ARE the source), flow gate keys (T11 territory), prose/test-name mentions.
  Skeptic (equivalence / cycles / live-vs-snapshot / misses): no objections. **Byte-green: unit 154
  (22 files) / E2E 71, parent-shell verified; eslint + prettier clean.**

- [x] **T6 — de-abbreviation (keep `h`). DONE — byte-green, skeptic finding remediated.**
  _Landed as:_ implement → 2-skeptic verify workflow (Opus), then an orchestrator remediation pass
  on the completeness skeptic's REFUTED verdict. The pass standardised one vocabulary across 39
  files (s→scope/section, p→page, o→obligation, sub/ref→subObligation/referencedObligation,
  seg→segment, opts→createOptions, fn→computeReadyForQuote, template→templatePath, base→basePath,
  a/b→journeyA/journeyB, req→buildRequest, d/c→driverIndex/claimIndex, and the full vocabulary
  table in the workflow report). **Export renames: NONE** — `state.get` deliberately kept (the
  `state.` namespace supplies intent; `state.getJourneyState` would stutter across ~24 call
  sites); barrel untouched. Skeptic findings fixed by the orchestrator: `ctx`→`context` in
  `test-support.js` + both consumer specs (real cross-file miss); `acc`→`subsets` in
  `reachability.subsetsOf` (self-created drift); `navigation.js` self-shadowing callbacks →
  `candidate` (readability smell the rename introduced). Recorded declines: `h` (binding),
  loop-index `i` (idiom, now declared), `dob` view-model key (njk-template-coupled), local `base`
  label strings (real word), `stubH`/`recordingH` (h-idiom derivatives), `acc`-family accumulators
  elsewhere already named. Rename-purity skeptic: clean (no data-key/error-string leaks; dateParts
  arg order verified). **Byte-green: unit 154 (22 files) / E2E 71, parent-shell verified;
  whole-spike eslint + prettier clean.**

- [x] **T7 — test-naming convention (`#fn` / `Should …`). DONE — green, +3 from splits.**
  _Landed as:_ implement → assertion-preservation-skeptic workflow (Opus). Convention established
  from the parent repo's own specs (`#functionName` describes + `Should …` one-behaviour titles;
  the spike's newest specs t1/t2 already complied). Applied across 20 unit spec files: every title
  → `Should …` (incl. `it.each`), single-function describes → `#reconcile`/`#currentJourney`/
  `#simulateJourney`/per-validator `#requiredText`…`#compose`; genuinely cross-cutting scenario
  blocks kept descriptive names (matching the parent's own mixed use). Two multi-fact `it`s split
  with assertions relocated VERBATIM: store-ops out-of-range remove/update (+1; shared
  post-condition duplicated into both branches so a regression localises to the mutator) and
  nested per-item completeness (+2; 5 assertions across 3 rules → 3 its). Declined:
  `write-through-per-commit.test.js` rename (T9 file-move territory); Playwright specs keep prose
  style. Whole-diff assertion audit: 1 relocated line added, 0 removed/reworded. Skeptic: no
  objections. **Green: unit 157 (22 files, +3 splits) / E2E 71, parent-shell verified; eslint +
  prettier clean.**

- [x] **T8 — functional-style + test-quality residue. DONE — byte-green, ledgered.**
  _Landed as:_ implement → 2-skeptic verify workflow (Opus; engine-semantics + judgement-auditor).
  The PHASE6 §2 worklist was reconciled against post-T1–T7 code first. **Fixed (8):** `write.js`
  entry mutators → `list.with()` / `list.toSpliced()` (Node ≥24 confirmed; NaN guard untouched,
  runs first); `status.js` `statusOf` → arrow (file convention); hub `statusTag` if/else → closed
  `STATUS_TAG` lookup + `NOT_STARTED_TAG` fallback; hub handler decomposed into named builders
  (`buildGroupItems`/`buildPickerItem`/`buildAddonItems`/`buildQuoteItem`/`countCompletedGroups`);
  `reachability.enumerateScopeStates` 4 nested loops → `flatMap` composition (state ORDER verified
  identical — witness selection depends on it); `answered.js` `every(isBlank)`; `flow.js` 10 no-op
  `{...page}` spreads removed (restores documented reference-sharing; all consumers traced
  read-only first); + 2 assertion strengthenings (bare `.toThrow` → pinned message; `toBeDefined`
  → journeyId identity). **Already resolved by earlier passes (5)** incl. the `destroyWiped`
  coverage gap. **Declined (3) with reasons:** session-port method-shorthand (uniform port idiom),
  `pinActive` extraction (sweep-marked optional; a T4-family nit), `scaffoldFor` recursive-fold
  rewrite (siblings are imperative; risk > gain). Skeptics: no objections. **Byte-green: unit 157
  (22 files) / E2E 71, parent-shell verified; eslint + prettier clean.**

- [x] **T11 — derive default gates from `collects`; `gate` stays as authored override. DONE — byte-green, +5 invariant tests.**
  _Landed as:_ T0 §7 executed with one placement decision made concrete: the derivation lives in a
  new `flow/gates.js` (`pageGatePasses` / `sectionGatePasses`) — it imports only `dispatch.js`
  (`collectsOf` + new `isDispatchBuilt`) and `section-status.js` (`sectionObligationIds`), so no
  cycle; navigation, the hub row filter and the simulator all consult it instead of reading `.gate`
  raw. The four hand gates are deleted from `flow.js` (claims page also loses its now-pointless
  spread); exactly one authored gate remains (`get-your-quote`'s `readyForQuote`); `dynamic: true`
  flags stay (hub-presentation grouping, per T0). Empty-`collects` convention: derives to reachable
  (quote-summary passes through to its section's authored gate). FAIL LOUD: `buildDispatch` now
  sets a built flag (cleared on re-entry, set only on success) and a derived gate consulted before
  boot throws, mirroring `configureReadyForQuote` — necessary because `collectsOf`'s `?? []` is
  legitimate for quote-summary, so unbuilt was otherwise indistinguishable from collects-nothing.
  New `flow/gates.test.js` (+5): pre-boot loud-throw; authored-override needs no index; the
  invariant derived-gate ⟺ ¬NA for all 3 dynamic sections across all 64 `enumerateScopeStates()`
  (covers the modifications representative-key → disjunction change); claims page gate ⟺
  `inScope.has('claims')` across the space; empty-collects convention pinned. Stale copy fixed:
  DESIGN.md flow listing (incl. the pre-6b `has('driverName')` drift) + gate bullet, EXTENDING.md
  gated-collection recipe (no hand `gate:` for the default case), reachability soundness note now
  "true by construction for derived gates", 12 `page.js` docblocks no longer claim flow adds a
  flow-only `gate`. **Byte-green: unit 162 (23 files, was 157/22; all 157 pass unchanged) /
  targeted E2E: shared journey (12 variants) + hub-copy specs green in parent shell (full E2E left
  to the orchestrator); eslint + prettier clean.**
