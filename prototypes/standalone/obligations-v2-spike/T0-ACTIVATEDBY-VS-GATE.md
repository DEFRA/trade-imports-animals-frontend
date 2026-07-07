# Investigation: do `activatedBy` and `gate` overlap in the obligations-v2 spike?

**Location:** `repos/trade-imports-animals-frontend/prototypes/standalone/obligations-v2-spike`
**Date:** 2026-07-07
**Verdict: CONSOLIDATE PARTIALLY** — the four `inScope.has(<key>)` gates (claims page + three addon sections) are mechanically derivable from each page's `collects` plus the obligation model, and should become a derived default; the `gate` slot itself must survive as an authored override because `readyForQuote` is not expressible in the model's vocabulary. No code was changed by this investigation.

---

## 1. The question

`activatedBy` on an obligation (`features/*/obligations.js`) is a declarative data predicate — `{ obligation, equals | includes | present }` — that `engine/reconcile.js` evaluates to a fixpoint (reconcile.js:34-59) via the three-operator interpreter in `engine/predicate.js:17-26`, producing the `inScope` set: *which data obligations currently apply*.

`gate` on a flow section/page (`flow/flow.js`) is a pure `(scope) => boolean` deciding *whether that section/page is reachable in the sequence* (flow.js:24-26: "a PURE read of the scope facts the state layer already computed").

Do these overlap — fully, partially, or not at all? Particular attention on the addon sections (named-driver, modifications, protected-ncd), whose gates are bare `s.inScope.has('<key>')` reads.

## 2. How it was investigated

Three analysts examined the code under adversarial lenses (collapse advocate, separation advocate, empiricist cataloguer). As judge I then independently re-read every load-bearing file — flow/flow.js, flow/dispatch.js, flow/navigation.js, flow/section-status.js, engine/{reconcile,predicate,read,status}.js, features/{hub}/controller.js, all conditional obligations files, analysis/{reachability,simulate}.js, flow/dispatch.test.js, analysis/{simulate,reachability}.test.js, routes.js, registry.js, DESIGN.md's flow listing and EXTENDING.md's extension recipe — and verified every citation the verdict rests on. Two analyst miscitations were found (recorded in §6); neither changes the outcome.

## 3. Catalogue: every gate, classified

There are exactly **five** gates in the flow. All citations verified against the code.

| Site | Expression | Level | Consumers | Classification |
|---|---|---|---|---|
| flow.js:41 | `(s) => s.inScope.has('claims')` | PAGE gate inside static section `your-driving-and-cover` | `nextInSection`/`sectionEntry` (navigation.js:10-26), simulator | **Derivable.** `'claims'` is the sole id the claims page collects (claims/list.controller.js:15 over obligations `[claims]`); source rule `{hadClaims equals 'yes'}` at claims/obligations.js:42 |
| flow.js:53 | `(s) => s.inScope.has('drivers')` | SECTION gate, `dynamic: true` | hub row filter (hub/controller.js:72), simulator (simulate.js:26) | **Derivable.** Section's one page collects exactly `['drivers']` (drivers-hub.controller.js:14); source rule `{addons includes 'named-driver'}` at named-driver/obligations.js:49 |
| flow.js:59 | `(s) => s.inScope.has('modDescription')` | SECTION gate, `dynamic: true` | hub row filter, simulator | **Derivable, representative-key variant.** Section collects `modDescription` + `modValue` across two pages (describe/value.controller.js:13); both share ONE activation literal (modifications/obligations.js:8), so the single-key read is equivalent to the disjunction — today |
| flow.js:65 | `(s) => s.inScope.has('ncdYears')` | SECTION gate, `dynamic: true` | hub row filter, simulator | **Derivable.** Collects `['ncdYears']` (years.controller.js:10); rule `{addons includes 'protected-ncd'}` at protected-ncd/obligations.js:8-14 |
| flow.js:70 | `(s) => s.readyForQuote` | SECTION gate | simulator only — the hub special-cases `scope.readyForQuote` directly (hub/controller.js:80-92), never calls this gate | **NOT derivable.** Completeness roll-up over all other sections' statuses (section-status.js:21-25), boot-injected into the engine precisely because the engine must keep zero flow imports (read.js:9-24) |

Ungated structures: `email`, `about-you-and-your-vehicle`, the `add-to-your-policy` picker section, and every page in them — all collect at least one unconditional obligation (e.g. `addons = { id: 'addons' }`, addons/obligations.js), which reconcile puts in scope unconditionally (reconcile.js:51-57), so a derived gate would be vacuously true for them.

Conversely, several `activatedBy` predicates have **no gate counterpart**: `excessAmount` (in-page reveal + wipe, cover-type/obligations.js:11-15), `windscreenProvider` at both depths (per-instance item-conditional scope, claims/obligations.js:31-36, named-driver/obligations.js:27-32), and `premium` (`system: true`, collected by no page, quote/obligations.js). Scope serves five consumers — wipe (reconcile.js:61-76), completeness, status/NA (status.js:42-43), the reachability prover, and navigation — of which gating is only one.

**Answer to the overlap question: PARTIAL, with a crisp boundary.** Full overlap on "conditional section/page reachability keyed to a collected obligation's scope" (four of five gates); zero overlap on completeness gating (`readyForQuote`) and on item/in-page activation (which never touches a gate).

**Do the addon gates behave like the other gates?** No — one mechanism, three behaviours. Addon section gates control hub-row *existence* (`s.dynamic && s.gate(scope)`, hub/controller.js:72). The claims page gate is a mid-section *skip* (navigation.js:20-26; pinned by dispatch.test.js:39-47). The quote gate is consumed only by the simulator; the hub renders its row as "Cannot start yet" rather than hiding it. Notably, `sectionEntry`/`nextInSection` never check SECTION gates at all — only page gates — so section gates are hub-presentation + simulation, not route-level access control (all routes are `open`, shared/kit.js:12).

## 4. The strongest case on each side

### For consolidation (verified)

1. **The four gates are restatements, key for key.** Each is `has(k)` where `k` is a member of exactly the id set `sectionObligationIds` already computes for status (section-status.js:14-18), and `statusOf` returns `NA` precisely when none of those ids is in scope (status.js:42-43). The hub therefore runs **two parallel computations of the same predicate per addon row** — gate for existence (controller.js:72), NA-complement for the tag (controller.js:77) — that must agree but are only coupled by a hand-typed string.
2. **Disagreement is not benign.** `readyForQuote` iterates all non-quote sections by *status*, ignoring gates (section-status.js:21-25). A gate that under-admits (stale key) while the section's obligations remain owed leaves the section not-NA and not-Fulfilled with **no hub row to fix it** — the quote deadlocks. The invariant "gate ⟺ ¬NA" is load-bearing, yet is enforced only by discipline plus tests.
3. **The string coupling is the design outlier.** This codebase systematically kills string coincidence: page identities are shared object references "rather than a string coincidence" (named-driver/page.js), `activatedBy` targets are "a REAL obligation reference — never a closure" (predicate.js:5-8), and dispatch coverage crashes **boot** on a gap (dispatch.js:82-90). The gate↔obligation-id edge is the one cross-file link left as a raw string, guarded only at `npm test` time — under-admission by the reachability prover (`owning-page-unreachable-in-scope`, reachability.js:186-194; pinned to `[]` in reachability.test.js), over-admission only by example personas (simulate.test.js:29-31, 49-56). Nothing asserts at boot that a gate key names a real, section-relevant obligation; `has('typo')` fails silently forever.
4. **The hazard has already fired once.** DESIGN.md's flow listing (~line 277) still shows the named-driver gate as `has('driverName')` from the pre-collection era; the code says `has('drivers')` (flow.js:53). The 6b refactor required hand re-pointing the magic string; the code was chased, the doc rotted. A derived gate has no key to re-point.
5. **The pattern is prescribed to proliferate.** EXTENDING.md (~509-512) tells the next feature author to hand-write `gate: (s) => s.inScope.has('previousInsurers')` for every new gated collection — each instance adding another unpinned string pairing.
6. **The prover's soundness gets stronger.** reachability.js:38-44 states its one-witness proof is sound *only because* every gate is a pure read of `inScope`/`readyForQuote` — "true by the flow's current gating discipline". Derivation turns that discipline into a construction.
7. **No import cycle.** The feared cycle is flow → controller → engine → status → flow (named-driver/page.js docblock). Derivation lives in navigation.js / section-status.js / the hub, which already import both flow and dispatch; dispatch.js imports only registry.js, and `buildDispatch` + `configureReadyForQuote` both run at plugin registration before any request (routes.js) — the same boot contract `readyForQuote` already relies on.

### For keeping separate (verified)

1. **Consumption is not duplication of the rule.** No gate re-evaluates a predicate; all four read the single reconciled set (flow.js:24-26). The activation RULE exists exactly once (reconcile.js:51-56). Changing *why* an addon applies is a one-file model edit; gate, wipe, status, CYA all follow. Only the *key string* is duplicated.
2. **The gate vocabulary is genuinely wider than the model's.** `readyForQuote` cannot be an `activatedBy` (three data operators over one obligation's value, predicate.js:17-26) and is boot-injected precisely to preserve engine purity (read.js:9-24). So collapsing gate *into* activatedBy is impossible; only a derived *default* is on the table — leaving a two-tier "derived unless authored" rule that is more to learn than "every gate is written where you see it".
3. **Legibility of flow.js.** It is currently the single glanceable file stating sequence AND gating, at a cost of ~4 lines. After derivation, "why is this section hidden?" requires composing the page's `collects`, the obligation's `activatedBy`, and the derivation rule.
4. **Boot-order failure mode is silent.** `collectsOf` returns `[]` before `buildDispatch` (dispatch.js:96), so a naive derived gate would silently gate everything out pre-boot; shipping it safely needs a throw-if-unbuilt guard mirroring `configureReadyForQuote`'s loud default (read.js:16-20).
5. **Derivation bakes in a semantics.** "Any collected obligation in scope" equals the current behaviour only because each addon section's obligations share one activation literal; a future section mixing conditional and unconditional obligations gets an always-true derived gate, and the author must reach for the override — at which point the restatement returns.

## 5. Verdict and reasoning

**CONSOLIDATE PARTIALLY.** All three analysts — including the separation advocate, whose concession is explicit — converged on the same factual core, and my re-reading confirms it: for the four `inScope`-reading gates, the gate's *content* is fully determined by the model plus `collects`, cannot legitimately diverge (divergence either renders an NA row or deadlocks the quote), and is coupled today by a raw string that this codebase's own conventions treat as a design smell. The separation that IS legitimate — flow owns reachability, model owns data applicability — is preserved by the consolidation, because the proposal derives a *default* inside the flow layer from flow-owned data (`collects` via the dispatch index); it does not push flow knowledge into the engine or vice versa. The one genuinely flow-owned predicate (`readyForQuote`) stays authored, which is exactly the escape hatch the design needs.

Why not KEEP SEPARATE: the deciding factors are (a) the invariant is load-bearing (prover soundness, quote deadlock) but enforced by discipline + example tests rather than construction, (b) the rename hazard has demonstrably fired once already (DESIGN.md drift), and (c) EXTENDING.md multiplies the pattern for every future gated collection — in the real service this spike prototypes, that is many more hand-paired strings. Why not COLLAPSE FULLY: `readyForQuote` is a hard counterexample; the gate mechanism cannot be removed, only defaulted.

## 6. Analyst claims refuted during verification

- **Analyst 1** listed `sectionEntry` as a consumer of section gates in the derivation sketch. False: navigation.js:13-26 checks only PAGE gates; section gates are consulted solely by the hub filter (controller.js:72) and the simulator (simulate.js:26). Analyst 3 had this right. The correction *narrows* the change's blast radius.
- **Analyst 1** cited flow/dispatch.test.js:15 as pinning the claims controller's `collects`; that line actually pins `pageOfObligation('claims') === 'claims'`. The underlying collects fact is real (claims/list.controller.js:15) — miscite only.
- All other load-bearing citations from all three analysts checked out exactly (gates at flow.js:41/53/59/65/70; NA at status.js:42-43; hub filter/quote special-case at controller.js:71-92; prover assumption at reachability.js:38-44; `collectsOf` `?? []` at dispatch.js:96; DESIGN.md ~277 drift; EXTENDING.md ~509-512 recipe).

## 7. Consequences — proposed task (for Sam to decide; NOT implemented)

**Task: derive the default gate for inScope-keyed sections/pages from `collects`; keep `gate` as an authored override.**

1. In `flow/navigation.js` and wherever section gates are consulted (hub filter, simulator), replace the bare gate read with:
   - page level: `page.gate ? page.gate(scope) : derivedGate(collectsOf(page.id), scope)`
   - section level: `section.gate ? section.gate(scope) : derivedGate(sectionObligationIds(section), scope)`
   - `derivedGate(ids, scope) = ids.length === 0 || ids.some((id) => scope.inScope.has(id))` — the empty-`collects` convention passes system-only pages (quote-summary) through to their authored gate.
2. Delete the four hand gates (flow.js:41, 53, 59, 65). Exactly one authored gate remains: `get-your-quote`'s `(s) => s.readyForQuote` (flow.js:70). `dynamic: true` flags stay — they are hub-presentation grouping, not scope facts.
3. Add a loud throw-if-unbuilt guard so a derived gate consulted before `buildDispatch` fails hard, mirroring `configureReadyForQuote`'s default (engine/read.js:16-20) — `collectsOf`'s silent `?? []` (dispatch.js:96) must not silently gate everything out.
4. Add one invariant test asserting derived-gate ⟺ `sectionStatus !== NA` for every dynamic section across the enumerated scope states (reuse `enumerateScopeStates`, reachability.js:68-80) — this pins the equivalence the current suite only samples, and covers the modifications gate's change from representative-key to disjunction (equivalent today; unproven by existing tests).
5. Update EXTENDING.md's gated-collection recipe (drop the hand-written `gate:` line for the default case) and fix DESIGN.md's stale `has('driverName')` listing (~line 277).
6. Record the layering rationale as a short architecture note: *`activatedBy` owns "is this data owed" (evaluated once, in reconcile); `gate` owns "is this step reachable" and defaults to "some obligation this step collects is owed" (the ¬NA complement), with authored gates reserved for flow-level facts the model cannot express (`readyForQuote`).* Expected outcome: the prover's soundness assumption (reachability.js:38-44) becomes true by construction for every derived gate; the gate↔obligation string pairing ceases to exist as an authorable surface.

Costs accepted with the change: a two-tier gate rule ("derived unless authored"), slightly less glanceable flow.js, and a baked-in any-in-scope semantics for mixed-activation sections (override available). Behaviour today is byte-identical: all pinning tests (dispatch.test.js:39-55, simulate.test.js:18-69, reachability.test.js) pass unchanged because they pin behaviour, not gate authorship.
