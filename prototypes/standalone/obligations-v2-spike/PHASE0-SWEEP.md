# Phase 0 — best-practices sweep triage

## 1. Executive summary

- **Files reviewed:** 70 / 70 requested (`reviewed=false`: none).
- **Total findings:** 236 — **high 6, medium 96, low 134** (stats verbatim).
- **Clean files (0 findings):** `features/start/controller.js`, `lib/validate/index.js` (both explicitly reported as positive counter-examples).
- **Data-quality caveat:** two of the 68 "files with findings" are **placeholder noise** — the entry literally named `test` and `lib/path.test.js` (summary = `"test"`, one `test/test/test` finding each). These are not real findings; treat the real total as **~234 across 66 substantive files**. Flagged again in §5.
- **NW split (verbatim):** NEW 191 · NW-1 21 · NW-2 2 · NW-3 11 · NW-7 10 · NW-8 1.

**Highest-leverage themes (by leverage, not raw count):**

1. **JSDoc accuracy/drift is where the real risk lives.** 5 of the 6 highs are doc-comment overclaims that hide genuine gotchas (silent `readyForQuote=true` in `simulate.js`, section-gating not actually honoured in `navigation.js`, an untested "no-rehydrate-at-depth" claim in `nested.test.js`), not cosmetic drift. This is the single richest seam for later phases.
2. **Two real correctness/behaviour bugs surfaced under the "doc mismatch" banner** — `your-vehicle` and `cover-type` controllers both discard the `currency()`-cleaned value and persist the raw `£1,234` string, breaking the validator's documented contract; and `hub/controller.js` has a dead conditional that renders the add-on picker "Completed" before it is ever visited.
3. **The `collects`/`page`/`addon` string-coincidence family (NW-3/NW-7/NW-8) is pervasive and mechanical** — 22 findings across nearly every feature controller re-deriving the same three patterns. Strong candidate for one systemic fix rather than per-file edits.
4. **Naming rule 6 (single-character / abbreviated locals) is the dominant NEW style theme** — ~25 findings, almost all in inline callbacks. Cheap, batchable, low-risk.
5. **Duplication of generic mechanical helpers** — the `[].concat(x ?? [])` checkbox coercion (6+ sites), `claimValue`/label tables, and reconcile+wipe sequences — is worth lifting into `shared/kit.js`/`engine` once.

---

## 2. Findings by theme

To avoid a 236-row dump, this section catalogues the **191 NEW findings** (those mapping to no NW item). The 45 NW-mapped findings are catalogued in **§3**. Repetitive patterns are **merged with an explicit note**.

### Theme A — JSDoc accuracy / drift (highest-risk theme)

| file:line | sev | issue | suggested fix |
|---|---|---|---|
| analysis/simulate.js:11-13 | high | Docstring claims scope "can never drift from runtime" & module is self-contained; in fact `readyForQuote` silently degrades to vacuously-**true** for any persona if `buildDispatch()` hasn't run in-process | Document the boot precondition; consider failing loudly if dispatch unbuilt |
| engine/nested.test.js:9-15 | high | Header claims suite pins "no-rehydrate-at-depth" but **no test** performs a wipe-then-reselect round trip at depth>0 | Add the round-trip test or drop the claim |
| flow/navigation.js:4-9 | high | Doc says "a gate on a page **or section** is honoured" but this file never reads `section.gate`; section gating is delegated to the caller (`hub/controller.js` pre-filter) | Narrow the claim, or make `sectionEntry`/`nextInSection` check `section.gate` |
| engine/reconcile.js:24 | med | `store.commit` named as the caller — no such method on `store.js`; real caller is `engine/index.js`'s `commit` | Rename to the real caller |
| engine/reconcile.js:12 | med | Cites `registry.walk` — not a property of `registry`; `walk` is a separate top-level export | Reword to the real import |
| engine/predicate.js:4-16 | med | "reconcile stays the single interpreter" contradicted by `status.entryComplete` also calling `applyPredicate` (DISCUSSION-LOG 6c "dual-resolver divergence") | Scope the claim; note shared-criterion requirement |
| lib/path.js:13-14 | med | "leaf … reconcile/status/store walk over" — grep shows `status.js` & `store.js` never import it; real 2nd consumer is `engine/index.js` | Name the real consumers |
| engine/store.js:10-11 | med | "Only `answers` is mutable" contradicted by `submit()` mutating `status`/`submittedAt` | State the actual contract precisely |
| engine/util.js:3 | med | Consumer list understates reach (3 more call sites: reconcile, check-answers, contract.test) | Drop the list or update it |
| features/check-answers/controller.js:12-18 | med | Claims a per-add-on "status" row that the code never produces (only a flat joined-label summary) | Reword to "added-to-policy summary" |
| features/email/obligations.js:8-9 | med | Purity taxonomy lists 3 categories, omits "mandate facts" though `required:true` is used right below (DESIGN §9 = 4 categories); this is the canonical file others point to | Add the missing category |
| features/cover-type/controller.js:74,79 | med | Stores raw/trimmed `excessAmount`, ignoring `currency()`'s documented £/comma-stripped cleaned value (see also Theme I) | Use the validated `value` |
| flow/dispatch.js:6-7 | med | "hub/CYA can ask which page owns obligation X" — only CYA imports from this module; hub never does | Drop "hub/" or mark as planned |
| lib/validate/validate.test.js:17-22 | med | "pin **each** reusable validator" false — `optionalText` has zero coverage | Add coverage or soften claim |
| engine/store-ops.test.js:47 | med | Comment claims a sibling-**driver** untouched + input-not-aliased, but test seeds one driver & never asserts aliasing | Fix comment or extend test |
| engine/collectionView (index.js):83-95 | med | Silent `complete:true` fallback when `byPath` misses a def — undocumented | Throw/log, or document the degrade |
| engine/index.js:8-15 | low | Module header's write/read surface omits `collectionView`/`*EntryAt`/`submitJourney` actually consumed | Broaden or soften |
| features/claims/list.controller.js:6-12 vs 57 | low | Header "Continue **marks** loop done" vs inline "no write, just advance" | Reword header |
| lib/path.js:7-9 | low | "depth-0 collapse to bare id" only true for string segments (numeric single-seg → `[N]`) | Qualify the claim |
| lib/quote.js:51-52 | low | `makeReference` hyphen-strip is a no-op for UUID input; comment doesn't say so | Simplify or explain |
| engine/journey.js:27, :4-10 | low | `(Start now)` parenthetical leans on another file; banner behavioural sentence misattributed to `JOURNEY_COOKIE` | Trim/clarify |
| engine/util.js:1-2 | low | Blank enumeration omits `undefined` | Add "null or undefined" |
| obligation-purity.js:10, :42 | low | Reads as if `registry.js` retired (it's live); `cya` isn't a real dir (`check-answers`) | Reword |
| lib/validate/calendar.js:1-5 | low | "helpers" (plural) but one export | Singularise |
| flow/flow.js:1-11 | low | Header makes a claim about the hub that flow.js can't attest — silent-drift risk | No action now; revisit if hub changes |
| features/quote/obligations.js, protected-ncd:6 | low | "SINGLE:" cardinality jargon never glossed (also modifications) | Gloss on first use |

*Merged: the "under-enumerates what the suite pins" header nit appears in `item-conditional.test.js:8-14` and `store-ops.test.js:7-13` — same shape as the rows above.*

### Theme B — Doc-comment attachment / placement (block glued to wrong binding)

Recurring pattern: a module-level `/** */` block sits above the first constant/helper rather than the symbol/module it describes. **10 instances merged** — representative rows:

| file:line | sev | issue | suggested fix |
|---|---|---|---|
| lib/validate/run.js:1-20 | med | Block describing exported `validate` attached to internal `toFieldErrors` | Move above `validate` |
| shared/kit.js:4-12 | med | Module description attached to `open` | `@fileoverview`/detach |
| features/modifications/obligations.js:3-8 | low | File-level block attached to private `modificationsGate` (also in protected-ncd twin) | Move above import/first export |
| analysis/simulate.js:4-19 | med | Module block glued to `passes` (no blank line) | Blank line / relocate |
| config.js:1-6 · engine/store.js:3-12 · engine/journey.js:4-10 · registry.js:15-43 · navigation.js:4-9 · indexed.test.js:16-25 | low–med | Same misattachment shape | Relocate to documented symbol |

### Theme C — Correctness / behaviour bugs (surfaced under doc/validation cross-ref)

| file:line | sev | issue | suggested fix |
|---|---|---|---|
| features/hub/controller.js:60-68 | high | `'addons' in answers ? FULFILLED : sectionStatus(...)` — fallback **always** FULFILLED (addons has no `activatedBy`/`required`), so picker shows "Completed" before first visit; special-case is dead | Delete dead branch + intended NOT_STARTED signal, or make addons `required` |
| features/your-vehicle/controller.js:58-71 | high | `post()` discards validated `value`, rebuilds `estimatedValue` from raw payload → `£1,234` persisted verbatim, breaking `currency()` contract & hapi.md §3 | Take field from `validate()`'s `value` |
| features/cover-type/controller.js:74,79 | med | Same currency-cleaned-value-discarded bug as above | Use `value.excessAmount` |

### Theme D — Function shape & length / decomposition (rule 1/5)

**10 instances merged.** All "one large multi-concern function, extract named helpers":

| file:line | sev | issue |
|---|---|---|
| features/check-answers/controller.js:53-135 | med | `buildRows` ~83 lines, 5 jobs → `buildCoreRows/buildVehicleRow/buildClaimRows/buildCoverRows` |
| features/hub/controller.js:48-108 | low | `handler` inlines 5 view-model builds |
| flow/dispatch.js:51-90 | low | `buildDispatch` does 4 things (reset/validate/invert/assert) |
| obligation-purity.js:34-51 | low | offenders built by nested push-loops, 3 concerns |
| analysis/reachability.js:59-86 · simulate.js:24-30 | med/low | imperative push-loops where filter/flatMap fits |
| dump.js:131-153 · reconcile.js:29-77 · lib/quote.js:28-48 · validators.js:156-169 | low | extract named helpers |

### Theme E — Duplication (DRY, non-per-loop)

| file:line | sev | issue | suggested fix |
|---|---|---|---|
| features/claims/list.controller.js:17-21 | med | `claimValue` verbatim-duplicated in `driver-detail.controller.js`; `'Not provided'` a 3rd copy in check-answers | Extract shared formatter |
| engine/index.js:61-69,128-141 | med | `commit()` & `removeEntryAt()` inline identical reconcile→sort→delete sequence | Extract `reconcileAndDestroy` |
| engine/store.js:49-51,58-60 | med | `saveAnswers`/`submit` duplicate lookup-and-guard | Extract `getWritableJourney` |
| engine/status.js:38-51 | med | sibling-identity check reimplemented vs `predicate.evalPredicate` (held together by comment+test) | Share one helper |
| flow/navigation.js:10 | med | `gatePasses` duplicates `passes` in `simulate.js:19` | Export one shared predicate |
| addons / optional-extras / check-answers / quote (+ predicate) | med | `[].concat(x ?? [])` checkbox coercion duplicated 6+ times, undocumented | Lift `kit.asArray()` into `shared/kit.js` **[6 findings merged]** |
| features/check-answers/controller.js:74-132 | med | `row(key,val(id),id)` repeats the answer-id twice per row (~10×) | `rowById` helper |
| features/quote/controller.js:13-23 | low | `COVER_LABEL`/`EXTRA_LABEL` byte-for-byte duplicated in check-answers | Shared `lib/labels.js` |
| registry.js:59,113,118 | med | `byIdMap` and (unused) `refs` build the same id→def map twice | Derive/drop |
| features/claims/entry.controller.js:4-5 · driver-entry:9-10 · driver-detail:3-4 | low | Split namespace+named import of `shared/kit.js` (3 files) | One import per module **[merged]** |
| your-vehicle:19-66 | low | 5 field names re-typed 3× across collects/get/post | `FIELD_NAMES` array |
| modifications/value.controller.js:9-34 | low | `'modValue'` hand-typed 5× | local `FIELD` const |

### Theme F — Dead / redundant code

| file:line | sev | issue | suggested fix |
|---|---|---|---|
| features/email/controller.js:10-17 | low | `render`'s `errors`/`errorSummary` wiring permanently dead (post never validates) | Drop, or note intentional uniformity |
| engine/indexed.test.js:63-73 | low | Dead `Array.isArray(p)` branch (`wiped` always strings) + assertion looser than exact `['claims']` | Drop branch, assert `toEqual(['claims'])` |
| engine/journey.js:36-39 | low | `store.has()` then `store.get()` — redundant double lookup | Single lookup with `??` |
| flow/dispatch.js:59,82 | low | `walkDefs()` walked twice per boot | Capture once |
| flow/dispatch.test.js:25-26 | low | `buildDispatch(withoutClaims)` invoked twice for two regex checks | Invoke once |

### Theme G — Test structure / behaviour coupling

| file:line | sev | issue | suggested fix |
|---|---|---|---|
| contract.test.js:82-84 | med | "invalid payload never commits" asserted only in a comment; no negative test anywhere in spike | Add one negative case per collecting page |
| lib/validate/validate.test.js:116-123 | med | `integerInRange` two distinct messages collapsed to one `toHaveProperty` | Assert exact messages |
| lib/validate/validate.test.js:65-96 | med | Multiple accept+reject bundled under "X and Y" titles | Split into accepts/rejects |
| engine/nested.test.js:83-107 | med | One `it` bundles 3 completeness scenarios under a title for the last | Split into 3 |
| engine/reconcile.test.js:28-39, 41-48 | med×2 | "activates … and wipes …" / "reveals + wipes" join two invariants per test | Split |
| flow/dispatch.test.js:10-27 | med | Manual inline restore of module-singleton state; fragile to reordering/.only | `afterEach(() => buildDispatch(...))` |
| obligation-purity.test.js:10-12 | med | Guard's throw path never exercised — only happy path; regression would pass green | Add a violation fixture that asserts throw + message |
| lib/validate/validate.test.js:135-141 · reconcile.test.js naming · store-ops.test.js:84 | low | for-of where `it.each` fits; generic `on`/`off` names; stale "no longer dead code" title | Various small fixes |
| **Test-naming "Should"/`#fn` convention** | low | Every spike test file uses `it('lowercase…')` not `test('Should…', #fn)` | **Merged — ~10 files**; align only if graduated from `prototypes/` |

### Theme H — Magic strings / numbers (non-NW)

| file:line | sev | issue | suggested fix |
|---|---|---|---|
| config.js:20 | med | `/prototype-standalone` root duplicated across config + hub + confirmation | `PROTOTYPES_ROOT` const |
| features/confirmation/controller.js:22 | med | Same `/prototype-standalone` literal | Import shared const |
| features/quote/controller.js:39 | med | Redirect literal `'check-answers'` ignores existing `kit.CYA_SLUG` | Import `CYA_SLUG` |
| features/check-answers/controller.js:118-124 | med | `\|\| '0'` where file's convention is `?? `/isBlank | Use `?? '0'` |
| features/named-driver/obligations.js:30 + 5 files | low | `'windscreen'` literal duplicated across ~5 files, no shared constant | `CLAIM_TYPE.WINDSCREEN` **[merged]** |
| features/modifications/obligations.js:8 | med | `includes:'modifications'` works only by coincidence with `ADDONS` array in controller | Shared `ADDON_IDS` |
| features/hub/controller.js:32-36,70-77 | med | `ADDON_TITLE[s.addon]` silently blank if keys drift from flow.js | Fallback/boot assert |
| features/hub/controller.js:79-91 | low | Hand-rolled "Not started" tag instead of `statusTag(NOT_STARTED)` | Import + reuse |
| modifications/describe:16 · your-vehicle:33 · lib/quote.js:52 · calendar.js:10-11 · kit.js:67-69 | low | Bare literals (200, 1900/2100, slice 6, month bounds, date widths) | Named constants **[merged]** |
| optional-extras:8 · your-vehicle:28 | low | Feature slug re-literalled in template path vs `page.slug` | Build from `page.slug` |
| features/check-answers/controller.js:120-121 | low | `[].concat(...)` normalisation undocumented | Comment / shared helper |

### Theme I — Validation / robustness (hapi Joi, silent fallbacks)

| file:line | sev | issue | suggested fix |
|---|---|---|---|
| features/claims/entry.controller.js:113-118 | med | `claims/{index}/remove` has no route-level `validate.params`; only guard buried in engine | Add Joi `params` schema |
| features/driving-history/controller.js:17-20 | med | `hadClaims` fixed yes/no domain lacks `oneOf`, unlike sibling cover-type/about-you | Add `oneOf('hadClaims',['yes','no'])` |
| features/addons/controller.js:34-40 | low | `payload.addons` persisted with no allow-list on the 3 known values | Light Joi `.valid(...)` |
| features/named-driver/driver-detail.controller.js:91,97 | low | `{driver}` param unvalidated at route layer (safe via handler guard) | Route-level Joi if graduated |
| obligation-purity.js:39-43 | med | `catch { continue }` swallows all read errors, not just ENOENT | Check `err.code==='ENOENT'` |
| obligation-purity.js:30-31 | med | Regex `/obligations\.js$/` doesn't enforce "different feature under features/"; doc overclaims | Tighten regex or soften doc |

### Theme J — Style consistency (rule 2 arrow, rule 4 mutation, rule 12 `??`)

| file:line | sev | issue |
|---|---|---|
| flow/dispatch.js:51 · lib/validate/run.js:22 · routes.js:27 · obligation-purity.js:33 | med/low | `function` decl / method shorthand where file convention is arrow-const **[merged, 4 files]** |
| analysis/simulate.js:22 · reachability.js:40,59 | low | Same arrow-vs-function-export nit (note: siblings share the `export function` convention — fix workspace-wide or not at all) |
| lib/validate/run.js:13-20 | low | `toFieldErrors` mutates reduce accumulator |
| features/named-driver/driver-detail.controller.js:62-67 | med | `driverName` blank-checked two ways (trimmed heading vs untrimmed row) → whitespace name shows literal spaces |
| features/named-driver/driver-detail.controller.js:76,78 | low | `.length > 0` vs bare truthy on same expression |
| lib/validate/validators.js:97-104 | low | `oneOf` is the one validator missing `.trim()` |
| lib/quote.js:51 | low | `makeReference` no input guard while `calculatePremium` fully defensive |
| shared/kit.js:58-59 | low | `width()` helper also toggles error class — name undersells second concern |
| engine/predicate.js:20 · reconcile.js:70-74 · engine/predicate.js:33 | low | Clever `[].concat` one-liner unnamed; O(n²) dedupe scan; pseudocode not valid JS |

### Theme K — Naming: single-character / abbreviated locals (rule 6, NEW)

**~25 findings merged** — single-char callback/loop params and generic locals, almost all in inline callbacks. Cheap batch fix. Sites: `reachability.js:34(s)`, `reachability.test.js:30,32(p)`, `dump.js:131-172(d,c,s,k)`, `index.js:46(a,b)`, `indexed.test.js:33(n),70,72(p)`, `nested.test.js:34(n)`, `status.js:24(o),37-54(sub,ref)`, `about-you:50,62(c)`, `addons:26(a)`, `cover-type:42,54(c)`, `check-answers:54(val)`, `driver-detail:38-77(d)`, `optional-extras:21(e)`, `quote:27(v)`, `flow.js:28-60(s)`, `navigation.js:14-24(s,p)`, `path.js:18(i),seg`, `calendar.js:12(d)`, `validators.js:32(s),116(n),159(v),165(d/m/y)`, `kit.js:58(n)`. All medium/low; each rename is intent-revealing.

---

## 3. NW backlog cross-reference

### NW-1 — `defs`/`walkDefs`/`def`/`registry.refs` abbreviation family — **21 findings — CONFIRMS + ENRICHES**
Re-derived at: `registry.js:1-12/44-120` (med, the root), `flow/dispatch.js:59,82`, `reconcile.js:36-42`, `engine/index.js:87,93`, `indexed.test.js:1-14`, `nested.test.js:7`, and every feature `obligations.js` `defs` export (`about-you:18`, `addons:13`, `claims:47`, `cover-type:17`, `driving-history:15`, `email:13`, `modifications:22`, `named-driver:54`, `optional-extras:1-7`, `protected-ncd:17`, `quote:16`, `your-vehicle:2,16`), plus `dump.js:12-15` (`driversDef`/`driverClaimsDef` aliases), `routes.js:14` (prose "the defs"), and `validate.test.js:64-144` ("was def X" provenance in test titles). **Verdict: CONFIRMS** the backlog item and **ENRICHES** it with the exact cross-file blast radius — the rename must land in `registry.js`'s `...x.defs` spreads and `walkDefs`/`walk` consumers (dispatch + 2 engine tests) in one pass; several agents note fixing a single file in isolation would be locally inconsistent.

### NW-2 — engine `index.js`/`status.js` own logic (decomposition) — **2 findings — CONFIRMS + ENRICHES**
`engine/index.js:1-162` (it's the implementation home, not a barrel — enumerate the concrete split: scope/wipe/collections/submit) and `engine/status.js` (bundles item-completeness + obligation-status + section-status + quote-readiness, each with its own dependency set). **ENRICHES** with a concrete target decomposition (`completeness.js` / minimal `status.js` / flow-aware `section-status.js`). Note `lib/validate/index.js` was called out as the **positive** NW-2 counter-example (a true zero-logic facade).

### NW-3 — bare-string `collects` matching def id by coincidence — **11 findings — CONFIRMS**
Every collecting controller: `about-you:25-32`, `addons:13`, `claims/list:14`, `cover-type:17`, `driving-history:13`, `email:7`, `modifications/describe:13`, **`modifications/value:9` (HIGH — the only high in the NW set; explicitly contradicts DESIGN.md + CONVERSATION-LOG's stated `collects:[modValue.id]` intent)**, `drivers-hub:13`, `optional-extras:7`, `protected-ncd/years:9`. **CONFIRMS**; agents confirm the boot-time coverage assertion catches a *missing* collects but not a typo'd-but-colliding one. Consistent fix: `collects: [def.id]` from a real import.

### NW-7 — `flow/flow.js` re-types controllers' `{id,slug}` page objects — **10 findings — CONFIRMS + ENRICHES**
`flow/flow.js:15-61` (the aggregate) plus each controller's own `page` literal: `about-you:22`, `addons:12`, `claims/list:13`, `driving-history:10`, `modifications/describe:9-12`, `modifications/value:8`, `optional-extras:6`, `protected-ncd/years:8`, `drivers-hub:12`. **ENRICHES:** `protected-ncd/years` agent notes there is **no boot-time guard** for slug/id drift (unlike `collects`), so a rename silently breaks navigation with no startup failure — arguably the sharper half of the pair.

### NW-8 — domain (`addon`) leak into generic `flow.js` — **1 finding — CONFIRMS**
`flow/flow.js:39,45,54` — only 3 of 8 sections carry `addon`, making the `section` shape inconsistent by domain meaning. **CONFIRMS**; suggested fix is to move add-on metadata into an addons-owned registry.

### NEW — not in the current backlog (ranked by severity; candidates to fold into later phases)

**High (5) — investigate first:**
1. `analysis/simulate.js:11-13` — silent `readyForQuote=true` when dispatch unbuilt (undocumented boot precondition).
2. `features/your-vehicle/controller.js:58-71` — currency-cleaned value discarded, raw `£1,234` persisted (real data-integrity bug).
3. `features/hub/controller.js:60-68` — dead conditional; add-on picker shows "Completed" before first visit.
4. `flow/navigation.js:4-9` — section-level gating not enforced here despite the doc; caller-dependent, easy to get wrong.
5. `engine/nested.test.js:9-15` — suite claims a "no-rehydrate-at-depth" invariant it never tests (coverage illusion).

**Medium (highest-leverage clusters):** the currency bug also at `cover-type:74,79`; the `[].concat` checkbox-coercion helper (lift to `kit.asArray`, 6+ sites); `check-answers` `buildRows` decomposition + `row()` double-id; `hub` `ADDON_TITLE` drift + double `sectionStatus` computation; `entry.controller.js:113` missing route param validation; `driving-history` missing `hadClaims` `oneOf`; the doc-block-misattachment cluster (§Theme B); `registry.js` unused `refs` / split facade shape; `obligation-purity.js` over-broad `catch` + regex overclaim; `contract.test.js:82` and `obligation-purity.test.js:10` untested guard behaviour.

**Low:** the ~25-strong single-char/abbrev naming batch (Theme K), the test-naming "Should" convention (defer unless graduating out of `prototypes/`), magic-number extractions, and the split-import nits.

---

## 4. Per-file index

Most findings first. (`⚠` = placeholder-noise entry, not real findings.)

| file | # findings | max severity |
|---|---|---|
| registry.js | 8 | medium |
| engine/index.js | 7 | medium |
| engine/indexed.test.js | 7 | medium |
| features/check-answers/controller.js | 6 | medium |
| features/named-driver/driver-detail.controller.js | 6 | medium |
| flow/dispatch.js | 6 | medium |
| lib/validate/validate.test.js | 6 | medium |
| lib/validate/validators.js | 6 | medium |
| obligation-purity.js | 6 | medium |
| analysis/reachability.js | 5 | medium |
| engine/nested.test.js | 5 | **high** |
| engine/reconcile.js | 5 | medium |
| engine/status.js | 5 | medium |
| features/addons/controller.js | 5 | medium |
| features/hub/controller.js | 5 | **high** |
| features/optional-extras/controller.js | 5 | medium |
| features/your-vehicle/controller.js | 5 | **high** |
| shared/kit.js | 5 | medium |
| analysis/simulate.js | 4 | **high** |
| flow/navigation.js | 4 | **high** |
| engine/reconcile.test.js | 4 | medium |
| engine/store-ops.test.js | 4 | medium |
| features/claims/list.controller.js | 4 | medium |
| features/modifications/obligations.js | 4 | medium |
| engine/predicate.js | 4 | medium |
| flow/dispatch.test.js | 4 | medium |
| flow/flow.js | 4 | medium |
| lib/path.js | 4 | medium |
| lib/quote.js | 4 | low |
| lib/validate/run.js | 4 | medium |
| obligation-purity.test.js | 4 | medium |
| analysis/reachability.test.js | 3 | medium |
| contract.test.js | 3 | medium |
| dump.js | 3 | medium |
| engine/journey.js | 3 | medium |
| engine/store.js | 3 | medium |
| engine/util.js | 3 | medium |
| features/about-you/controller.js | 3 | medium |
| features/claims/entry.controller.js | 3 | medium |
| features/claims/obligations.js | 3 | low |
| features/cover-type/controller.js | 3 | medium |
| features/driving-history/controller.js | 3 | medium |
| features/modifications/describe.controller.js | 3 | medium |
| features/modifications/value.controller.js | 3 | **high** |
| features/named-driver/obligations.js | 3 | low |
| features/quote/controller.js | 3 | medium |
| lib/validate/calendar.js | 3 | medium |
| analysis/simulate.test.js | 2 | low |
| config.js | 2 | medium |
| engine/item-conditional.test.js | 2 | low |
| features/cover-type/obligations.js | 2 | medium |
| features/email/controller.js | 2 | medium |
| features/email/obligations.js | 2 | medium |
| features/index.js | 2 | medium |
| features/named-driver/driver-entry.controller.js | 2 | low |
| features/named-driver/drivers-hub.controller.js | 2 | medium |
| features/protected-ncd/obligations.js | 2 | low |
| features/protected-ncd/years.controller.js | 2 | medium |
| routes.js | 2 | low |
| features/about-you/obligations.js | 1 | low |
| features/addons/obligations.js | 1 | low |
| features/confirmation/controller.js | 1 | medium |
| features/driving-history/obligations.js | 1 | low |
| features/optional-extras/obligations.js | 1 | low |
| features/quote/obligations.js | 1 | low |
| features/your-vehicle/obligations.js | 1 | medium |
| ⚠ `test` (placeholder entry) | 1 | low (noise) |
| ⚠ lib/path.test.js (placeholder) | 1 | low (noise) |
| **features/start/controller.js** | **0** | — (clean) |
| **lib/validate/index.js** | **0** | — (clean) |

No file returned `reviewed=false`. Two files (`test`, `lib/path.test.js`) returned **placeholder content** and should be re-run (see §5).

---

## 5. Completeness note

**Clean / positive counter-examples (scrutinise least):** `features/start/controller.js` and `lib/validate/index.js` came back genuinely clean with reasoning (start is a two-handler page with accurate doc; index.js is a true zero-logic barrel — the NW-2 ideal). `engine/reconcile.test.js` and `analysis/simulate.test.js` are near-clean behaviour-first suites.

**Coverage gaps / re-run before go/no-go:**
- **Two placeholder entries** — the entry literally named `test` and `lib/path.test.js` (summary `"test"`, one `test/test/test` finding). These agents did **not** produce a real review. `lib/path.test.js` in particular is the unit test for `lib/path.js` (which itself drew 4 findings incl. a doc-drift), so its test suite is effectively **unreviewed**. Re-run both before treating the sweep as complete.
- Net effective coverage is **66 substantive files**, not 68-with-findings.

**Where a human should look hardest:**
1. **The 5 non-NW highs** (§3) — 3 are latent correctness/behaviour bugs (`your-vehicle` + `cover-type` currency persistence, `hub` picker status), not doc cosmetics. These deserve a maintainer's eyes before any phase closes.
2. **`simulate.js` boot-precondition** — the "can never drift from runtime" claim is the kind of confident doc that a future reader will trust; the silent-true degradation is a genuine footgun.
3. **The guard tests** (`obligation-purity.test.js`, `contract.test.js`) — both assert a critical invariant only in prose/happy-path; a regression in the guards themselves would pass green.

**Honest caveats on the data:**
- Every agent independently flagged the **test-naming "Should"/`#fn` convention** and treated it as an intentional spike deviation — I merged it to one row; don't over-weight its ~10-file spread.
- Many low findings are explicitly hedged as "fine for a throwaway spike; fix only if graduated to `src/`." The NW-1/3/7/8 clusters and the naming batch are the mechanical, systemic wins; the JSDoc-drift + correctness items are the judgement-required wins. Both feed later phases cleanly; nothing here blocks a go decision except confirming the two placeholder re-runs.
