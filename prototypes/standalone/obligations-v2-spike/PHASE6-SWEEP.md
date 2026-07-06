# Phase 0 — best-practices sweep triage

*Spike: `prototypes/standalone/obligations-v2-spike`. Source: 27 per-file agent reports (one per `.js`) + deterministic stats. All 95 findings below are carried through verbatim from the agent JSON — none invented, none dropped. The only merging I did is called out in §5 (the cross-file test-fixture duplication is reported independently by 3–4 files; I kept each anchored to its own file rather than collapsing to one row).*

## 1. Executive summary

| Metric | Value |
|---|---|
| Files requested / returned | 27 / 27 |
| Files with ≥1 finding | 24 |
| Files returning `reviewed=false` | **0** (full coverage) |
| Total findings | **95** |
| Severity split | **high 2 · medium 30 · low 63** |
| NW-mapped | NW-1 ×1, NW-2 ×1, NW-8 ×1 · **NEW ×92** |

**Highest-leverage themes**

1. **JSDoc accuracy & drift (31/95, and *both* HIGHs).** The spike is unusually well-commented and most claims verify — but drift/contradiction clusters on (a) persistence/lifecycle claims ("only answers is mutable", "record carries only answers", "port split is pending") and (b) copy-ownership claims in the hub. Two of these are outright self-contradictions with code in the same file.
2. **Two latent functional bugs surfaced as HIGH** — `hub/controller.js` renders raw internal page-ids into user-facing GDS hint text; `resume-self-heal.test.js`'s header flatly contradicts its own assertion (`status` *is* a durable field). Both are worth fixing regardless of phase.
3. **Naming (17/95).** Pervasive single-char params (`h`, `s`, `p`, `o`, `a`/`b`) and abbreviations (`req`, `stubH`, `opts`, `fn`, `def`). Most are house-wide Hapi/test conventions vs the rule's letter — cheap to fix, low individual value, but they re-derive the NW-1 family.
4. **Duplication (9/95), concentrated in test scaffolding.** `stubH`/`req`/`makeH` fakes are hand-copied (and already drifting) across 3–4 engine test files — a real maintenance hazard. Plus small engine DRY nits (`get`/`resume`, the bounds guard, `completed` recomputing `sectionStatus`).
5. **Test quality (12/95)** — bare `.toThrow()` without matchers, weak `toBeDefined()`/`expect.any(String)` assertions, and one genuine **coverage gap**: `destroyWiped` (used in production by `write.js`) is reimplemented inline in `path.test.js` and never directly tested anywhere.

---

## 2. Findings by theme

### JSDoc accuracy & drift (31)
| file:line | sev | issue | suggested fix |
|---|---|---|---|
| features/hub/controller.js:9-16,74-78 | **high** | Header claims controller "OWNS task-link copy"; add-on `hint` is actually `pages.map(p=>p.id).join(', ')` → raw page-ids leak into rendered GDS hints (copy bug + drift) | Author real per-addon hint copy (e.g. `ADDON_HINT`), or narrow the doc to say add-on hints are id-derived |
| engine/resume-self-heal.test.js:7-14 | **high** | "record carries ONLY answers — no scope/status/wipe fields" is contradicted by the file's own test asserting `status` is a persisted key | Drop `status` from the exclusion list; say "answers + lifecycle metadata, no *derived* fields" |
| engine/persistence/records.js:9,92-93 | med | "Only `answers` is mutable" contradicts `finalise()` mutating `status`/`submittedAt` | Reword: answers is the only repeatedly-writable field; status/submittedAt set once by `finalise` |
| engine/collection-view.js:27 | med | `complete: obligation ? … : true` silently marks all entries complete on an unresolved path; undocumented | Document the fallback (or fail loud) — consumers trust the flag for progress UI |
| lib/answered.js:1-3 | med | "date object with no parts filled" reads as native `Date`; `Object.values(new Date())===[]` → any real Date reports blank (latent bug) | Name the actual `{day,month,year}` shape; drop "date object" |
| engine/status.js:11,48 | med | Top comment + `allRequiredAnswered` say "answered" for Fulfilled, but code uses stricter `satisfied()` — blurs the distinction the file elsewhere establishes | Say "satisfied"; rename local `allRequiredSatisfied` |
| analysis/reachability.js:94-98 | med | `scaffoldFor` docblock self-contradicts: says it writes a scalar sibling, then "only ever writes collection arrays" | Reword to acknowledge both write kinds |
| features/hub/controller.js:9-16,63,83,87 | med | "asks sectionEntry for its href" — picker/quote rows hardcode `pagePath(...)`, bypassing `sectionEntry` | Scope the claim to routed section rows |
| engine/store-contract.test.js:5-9 | med | "no existing unit test drives the durable store directly" now stale — `records-port.test.js` does | Acknowledge `records-port.test.js` as the direct-port test |
| engine/journey.test.js:5-15 | med | Header frames the session/records port split as pending; it has already landed | Rewrite past-tense as a regression pin |
| engine/journey.test.js:13-14 | med | "headers:{} … is ignored by today's model" is wrong — `session.userId` reads `x-stub-user` | Reword: no override present → falls through to `STUB_USER` |
| engine/records-port.test.js:4-10 | med | Header implies the CLONE half of the contract is re-verified on the port; only the FREEZE half is tested | Add a clone-isolation test, or narrow the comment |
| analysis/reachability.test.js:33-39 | med | Comment says oracle "pretends named-driver pages never open"; fixture is a blunt 4-page allowlist blacking out most of the flow | Reword to what the fixture actually does |
| engine/persistence/records.js:69-73,82-87 | low | `saveAnswers`/`finalise` throw (unknown journey, submitted-freeze) with no `@throws` tags | Add `@throws` for both conditions |
| engine/persistence/session.js:20-51 | low | Four method docblocks have no `@param`/`@returns` | Add minimal tags or declare prose-only house style |
| engine/complete.js:12-18 | low | Three exported fns, non-obvious composite params, no `@param`/`@returns` | Add tags |
| engine/read.js:36,46-51 | low | `{journey,answers,scope}` return shape in prose, not `@returns` | Use `@returns {{…}}` |
| engine/write.js:47 | low | `updateEntryAt`'s bounds guard has no rationale comment; the identical guard in `removeEntryAt` does | Put the NaN-gotcha note on a shared helper |
| engine/collection-view.js:5-16 | low | Prose-only docblock, no `@param`/`@returns` (house style) | Optional tags if tightening |
| lib/answered.js:1-3 | low | "Used by predicate + status roll-up" consumer list stale (4 importers now) | Drop or update the list |
| engine/status.js:6-7 | low | "the hub calls it per section" — hub calls `sectionStatus`, which calls `statusOf` (one hop) | Reword to name `sectionStatus` |
| engine/journey.js:30 | low | "(Start now)" ambiguous out of context | State the current contract without before/after context |
| engine/journey.js:5-13 | low | "It now composes…" reads as historical commentary | Drop "now" |
| engine/journey.js:27,31,38,50 | low | Four exports, prose-only, no `@param`/`@returns` (house style) | Optional engine-wide |
| flow/flow.js:22 | low | "hub renders one task per section" overclaims (hardcoded groups, gated add-ons, bespoke quote row) | Soften / defer to hub's own docblock |
| flow/flow.js:75 | low | `allFlowPages` comment omits that it stamps `sectionId` (the load-bearing bit) | Mention `sectionId` |
| registry.js:66-76 | low | Two exported generators, no `@param`/`@returns` | Add tags |
| engine/journey.test.js:3 | low | Depends on `store.js` shim though not in that shim's documented 3-consumer list | Add to list, or drive `records` directly |
| engine/resume-by-user.test.js:7-13 | low | Header describes only the 1st of 2 test scenarios | Add a sentence for the mint-on-miss case |
| engine/resume-self-heal.test.js:8 | low | "state.resume" phrasing vs the file's actual `import { resume }` | Disambiguate or just say `resume` |
| lib/path.test.js:64-70 | low | "only the whole `claims` root is wipeOnExit" — `windscreenProvider` is also `wipeOnExit` | Tighten to "no collection-item-level wipeOnExit yet" |

### Abbreviation & naming (17)
| file:line | sev | issue | suggested fix |
|---|---|---|---|
| engine/status.js:26 | med | single-char `o` (`registry.byId(id)`) | `obligation` |
| flow/flow.js:41,53,59,65,70 | med | every gate uses single-char `s` for scope | `scope` |
| engine/journey.test.js:65-66 | med | single-char `a`/`b` journeys | `journeyA`/`journeyB` |
| engine/complete.js:21,30 | low | `sub`/`ref` abbreviations (NW-1 family) | `subObligation`/`referencedObligation` |
| engine/read.js:22 | low | generic param `fn` | `readyForQuote` |
| engine/read.js:37 | low | generic export name `get` | `getJourneyState` |
| engine/write.js:19,35,44,59,73,76,79,83 | low | single-char `h` (Hapi) across every export | Codebase-wide; add rule exception or rename |
| engine/collection-view.js:18 | low | local `template` collides with doc's "no template" claim / `registry.templatePath` | `templatePath` |
| engine/store.js:14 | low | generic `opts` | `attrs` (or drop wrapper) |
| analysis/reachability.js:33,92 | low | "def/defs" abbrev in prose **(NW-1)** | "obligation(s)" |
| analysis/reachability.js:60 | low | single-char `s` in `subsetsOf` | `subset` |
| analysis/reachability.js:108 | low | single-char `o` in `forest.find` | `obligation` |
| features/hub/controller.js:47,72-77 | low | single-char `s`/`p` (section/page) | `section`/`page` |
| registry.js:66,94 | low | `base` vs `basePath` for same recursion accumulator | Rename `base`→`basePath` |
| engine/journey-user-assoc.test.js:33-34 | low | single-char `a`/`b` | `journeyA`/`journeyB` |
| engine/journey-user-assoc.test.js:14 | low | `req` abbreviates `request` | `makeRequest` |
| engine/write-through-per-commit.test.js:15,22 | low | `req`/`stubH` abbreviations | `buildRequest`/`buildStubToolkit` |

### Function shape, length & functional style (9)
| file:line | sev | issue | suggested fix |
|---|---|---|---|
| features/hub/controller.js:49-109 | med | `handler` does 5 distinct jobs inline, none named | Extract `buildGroupItems`/`buildAddonItems`/`buildQuoteItem`/`countCompleted` |
| engine/write.js:44-51,59-70 | med | clone-then-mutate (`list[i]=`, `splice`) vs functional | Use `list.with(i,entry)` / `list.toSpliced(i,1)` (Node ≥24) |
| engine/status.js:41 | med | `statusOf` is a `function` decl, not the file's arrow convention | `export const statusOf = (…) => {…}` |
| engine/persistence/session.js:19-52 | low | port object uses ES method-shorthand vs rule-2 arrows (consistent with `records.js`) | Document exception or convert |
| engine/journey.js:30-35,50-55 | low | `startJourney`/`resumeByUser` docs describe joined "and" actions | Extract `pinActive(h,journey)` (optional — it's a seam) |
| analysis/reachability.js:68-80 | low | `enumerateScopeStates` uses 4 nested imperative loops; `subsetsOf` two lines up uses `reduce` | Compose with `flatMap`/`reduce` |
| analysis/reachability.js:100-127 | low | `scaffoldFor` threads 3 reassigned `let`s through `forEach` | Recursive fold returning per-segment values |
| features/hub/controller.js:39-45 | low | `statusTag` if/else chain over a closed status set | Declarative `{[FULFILLED]:…}` lookup + `??` |
| lib/answered.js:8 | low | redundant arrow wrapper `every(p=>isBlank(p))` | `every(isBlank)` |

### Module/engine decomposition & domain leaks (2)
| file:line | sev | issue | suggested fix |
|---|---|---|---|
| flow/flow.js:52,53,58,59,64,65,70 | med | `dynamic` flag is a hub add-on-tile presentation concept leaked into the generic flow spine, undocumented **(NW-8)** | Document or rename `isAddonTask`/`hubAddon` |
| registry.js:33-124 | med | "barrel ASSEMBLES, does not DEFINE" is false — it defines two traversals + builds Maps, and exposes `walk*` via a different access path than `all`/`byId`/`byPath` **(NW-2)** | Unify the surface, or split assembly from traversal |

### Duplication (9)
| file:line | sev | issue | suggested fix |
|---|---|---|---|
| engine/read.js:37-44,52-59 | med | `get`/`resume` byte-identical bar the journey lookup | Extract `toReadState(journey)` |
| engine/write.js:47,64 | med | bounds-check guard duplicated verbatim in `updateEntryAt`/`removeEntryAt` | Extract `isValidIndex(list,index)` |
| features/hub/controller.js:53-58,94-96 | med | `completed` recomputes `sectionStatus` per row already scored for `groupItems` | Compute status once per row |
| engine/write-through-per-commit.test.js:31-35,67-71 | med | two `describe`s have byte-identical `beforeEach` | Single shared `beforeEach` / `resetJourney()` |
| engine/resume-by-user.test.js:14-21 | med | `makeH()` fake re-implemented (divergently) in 3 sibling specs | Extract shared recording `makeH()` |
| engine/submit-is-finalise.test.js:15-28 | med | `stubH`/`req` copied across 3 engine test files | Shared `engine/test-helpers.js` |
| engine/persistence/records.js:75-77,89-91 | low | `saveAnswers`/`finalise` share lookup+guard sequence | Extract `getWritableJourney(id)` |
| features/hub/controller.js:80-92 | low | `quoteItem` ternary repeats identical `title` in both branches | Hoist shared `title` |
| engine/write-through-per-commit.test.js:15-19,22-28 | low | `stubH`/`req` factories duplicated cross-file | Shared helper module |

### Dead code (1)
| file:line | sev | issue | suggested fix |
|---|---|---|---|
| engine/journey.test.js:16-27 | low | `makeH()` defines `unstate`, never exercised in this file | Drop it, or add a `clearActive` case |

### Test quality & behaviour coupling (12)
| file:line | sev | issue | suggested fix |
|---|---|---|---|
| lib/path.test.js:72-77 | med | `applyWipes` re-derives `destroyWiped`'s composition; the real exported fn (used by `write.js`) has **no direct test anywhere** | Import and call `destroyWiped` directly |
| engine/store-contract.test.js:49-54 | med | `freezes on submit` uses bare `.toThrow()` — any exception passes | Pin `.toThrow(/is submitted — writes blocked/)` |
| engine/records-port.test.js:42 | low | bare `.toThrow()` on the freeze rejection | Pin the message |
| engine/submit-is-finalise.test.js:45 | low | `expect.any(String)` on `submittedAt` — `'oops'` would pass | Assert ISO-timestamp shape |
| engine/journey-user-assoc.test.js:26-29 | low | `toBeDefined()` only proves *something* persisted; return value discarded | Capture + assert `journeyId` identity |
| engine/store-contract.test.js:18,28,40,49,56,63,69 | low | titles lack "Should" convention (spike-wide) | Align if promoted to `src/` |
| engine/store-contract.test.js:15 | low | describe uses prose not `#module` (spike-wide) | — |
| engine/write-through-per-commit.test.js:30,37,42,66,73,83,96 | low | test/describe naming convention drift (spike-wide) | — |
| engine/journey-user-assoc.test.js:16,19,26,32 | low | describe/test convention drift (spike-wide) | — |
| engine/resume-by-user.test.js:29-45 | low | one `it` bundles 4 facts; no "Should" (spike-wide) | Split if promoted |
| analysis/reachability.test.js:23-30,63-73,75-92 | low | several `it`s bundle multiple `expect`s | Split for failure localisation |
| lib/path.test.js:17-71 | low | describe naming not `#functionName` | Nest per-function describes |

### Magic strings & single source of truth (3)
| file:line | sev | issue | suggested fix |
|---|---|---|---|
| analysis/reachability.js:57 | med | `ADDONS=['named-driver','modifications','protected-ncd']` re-types slugs authored in 3 feature files | Derive from the addons obligation model |
| engine/journey.test.js:38 | med | hardcoded `'in-progress'` vs exported `IN_PROGRESS` (sibling test imports it) | Import `IN_PROGRESS` |
| engine/persistence/session.js:26 | low | `'x-stub-user'` inlined though the file extracts its other literals | Add `STUB_USER_HEADER` const |

### Other (11)
| file:line | sev | issue | suggested fix |
|---|---|---|---|
| features/hub/controller.js:33-37,74 | med | `ADDON_TITLE[s.id]` unguarded → `title:{text:undefined}` for a new dynamic section (violates codebase's fail-loud norm) | Throw/assert on missing entry |
| engine/write.js:44-70 | low | inconsistent return contract: `appendEntryAt` returns index, `update/remove` return `undefined` in both paths | Align return shape across the 3 primitives |
| engine/store.js:13-19 | low | mixed mapping style: `create`/`get` wrapped, `has`/`saveAnswers`/`submit`/`clear` bare refs; `create` wrap unnecessary | `create: records.create` |
| flow/flow.js:31,35,40,42,43,48,54,60,66,71 | low | `{...page}` spread on 11/12 entries adds nothing and breaks documented reference-sharing | Only spread where a prop is added (claims row) |
| engine/status.js:45-48 | low | `registry.byId(id)` looked up twice per required id | Note only; fine at spike scale |
| registry.js:21-25 | low | header bullet-list alignment nit (`walkObligations` line) | Add a space / drop manual alignment |
| features/hub/controller.js:19-20 | low | email row `hint:'Email'` duplicates its own title (unfinished-looking) | Descriptive hint like the other rows |
| engine/resume-self-heal.test.js:33,35 | low | two inline "what" comments restate adjacent assertions | Delete |
| lib/path.test.js:42 | low | trailing `// input untouched` restates the assertion | Delete |
| engine/submit-is-finalise.test.js:39 | low | `.answers` chained instead of destructured | `const { answers: committed } = …` |
| engine/write-through-per-commit.test.js:(filename) | low | filename says "per-commit" but half the file tests entry mutators | Rename `write-through.test.js` or split |

---

## 3. NW backlog cross-reference

**NW-1 — abbreviation / naming drift ("def(s)" family).** Re-derived by `analysis/reachability.js:33,92` (explicitly tagged) — **CONFIRMS**. **ENRICHES**: the residual drift is now in *prose docblocks* (`O(defs × …)`, "Walk the def chain") rather than identifiers, i.e. the file de-abbreviated its code but not its comments. `engine/complete.js:21,30` (`sub`/`ref`) is an adjacent same-family instance the sweep surfaces (untagged). Otherwise widely cleaned up.

**NW-2 — facade defines logic instead of assembling.** Re-derived by `registry.js:33-124` (explicitly tagged) — **CONFIRMS + ENRICHES**. Concrete new symptoms: `walkObligations`/`walk` are top-level exports *never attached* to the `registry` object (a second, unstated access pattern), and a stale `registry.walk` reference has already leaked into `engine/reconcile.js`. Note the `engine/index.js` reviewer explicitly cleared that barrel as *not* an NW-2 offender.

**NW-3 — string-coincidence "collects".** **Not re-derived.** The `hub/controller.js` reviewer explicitly declined to force-fit `ADDON_TITLE` (a bare string-keyed lookup) into NW-3, judging it the file's own page-owned-copy paradigm. Adjacent-but-distinct: `analysis/reachability.js:57` (`ADDONS` slug list duplicated across files) is the same "string duplicated across modules" smell but not the collects pattern. Verdict: sweep neither confirms nor contradicts NW-3.

**NW-7 — flow.js page-entry duplication.** **Not re-derived** — and mild positive signal it may be resolved: the `flow/flow.js` reviewer states the file "correctly avoids NW-7" (real object references, not string coincidence). The only adjacent finding, `flow/flow.js:31…` (unnecessary `{...page}` spreads), actually notes the spreads "quietly break the reference-sharing" — a noise nit in the same area, not the NW-7 duplication itself.

**NW-8 — domain concept leaking into a generic flow module.** Re-derived by `flow/flow.js:52…` (explicitly tagged) — **CONFIRMS + ENRICHES**. New specifics: `dynamic` is a hub add-on-tile *presentation* concept living in the sequencing spine, undocumented in the very module whose docblock claims to own gating; `get-your-quote` deliberately omits `dynamic` despite having a `gate`, proving it's a distinct concern.

### NEW — not in the current backlog
Both HIGHs and all NEW mediums (the fold-into-later-phases candidates). The 61 NEW low findings live in the §2 theme tables.

| file:line | sev | one-line |
|---|---|---|
| features/hub/controller.js:9-16,74-78 | **high** | Raw page-ids rendered into GDS task-list hints (copy bug + doc drift) |
| engine/resume-self-heal.test.js:7-14 | **high** | Header contradicts own test — `status` *is* a durable field |
| engine/persistence/records.js:9,92-93 | med | "only answers mutable" vs `finalise` mutating status/submittedAt |
| engine/read.js:37-44,52-59 | med | `get`/`resume` duplication |
| engine/write.js:47,64 | med | duplicated bounds-check guard |
| engine/write.js:44-51,59-70 | med | clone-then-mutate vs `.with`/`.toSpliced` |
| engine/collection-view.js:27 | med | silent fallback-to-complete on unresolved path, undocumented |
| lib/answered.js:1-3 | med | "date object" ambiguity → latent false-blank on real `Date` |
| engine/status.js:41 | med | `function` decl vs arrow convention |
| engine/status.js:26 | med | single-char `o` |
| engine/status.js:11,48 | med | "answered" vs "satisfied" terminology drift |
| analysis/reachability.js:94-98 | med | `scaffoldFor` docblock self-contradiction |
| analysis/reachability.js:57 | med | `ADDONS` slugs hardcoded, no single source of truth |
| flow/flow.js:41,53,59,65,70 | med | single-char `s` in every gate |
| features/hub/controller.js:49-109 | med | `handler` does 5 jobs inline |
| features/hub/controller.js:9-16,63,83,87 | med | `sectionEntry` href claim drift |
| features/hub/controller.js:53-58,94-96 | med | `completed` recomputes `sectionStatus` |
| features/hub/controller.js:33-37,74 | med | `ADDON_TITLE` unguarded (fail-loud violation) |
| engine/store-contract.test.js:5-9 | med | stale uniqueness claim vs `records-port.test.js` |
| engine/store-contract.test.js:49-54 | med | bare `.toThrow()` on freeze |
| engine/journey.test.js:5-15 | med | port split framed as pending (already landed) |
| engine/journey.test.js:13-14 | med | "headers ignored" claim inaccurate |
| engine/journey.test.js:38 | med | `'in-progress'` magic string |
| engine/journey.test.js:65-66 | med | single-char `a`/`b` |
| engine/write-through-per-commit.test.js:31-35,67-71 | med | duplicated `beforeEach` |
| engine/records-port.test.js:4-10 | med | clone half of contract not re-verified on port |
| engine/resume-by-user.test.js:14-21 | med | `makeH()` duplicated/drifting across 3 specs |
| engine/submit-is-finalise.test.js:15-28 | med | `stubH`/`req` duplicated across 3 specs |
| analysis/reachability.test.js:33-39 | med | oracle comment mis-describes a blunt 4-page allowlist |
| lib/path.test.js:72-77 | med | `destroyWiped` reimplemented inline → real coverage gap |

---

## 4. Per-file index

| file | # | max sev |
|---|---|---|
| features/hub/controller.js | 9 | **high** |
| analysis/reachability.js | 7 | med |
| engine/journey.test.js | 6 | med |
| engine/write.js | 5 | med |
| engine/status.js | 5 | med |
| flow/flow.js | 5 | med |
| engine/write-through-per-commit.test.js | 5 | med |
| engine/read.js | 4 | med |
| engine/journey.js | 4 | low |
| registry.js | 4 | med |
| engine/store-contract.test.js | 4 | med |
| engine/journey-user-assoc.test.js | 4 | low |
| lib/path.test.js | 4 | med |
| engine/persistence/records.js | 3 | med |
| engine/persistence/session.js | 3 | low |
| engine/collection-view.js | 3 | med |
| lib/answered.js | 3 | med |
| engine/resume-by-user.test.js | 3 | med |
| engine/resume-self-heal.test.js | 3 | **high** |
| engine/submit-is-finalise.test.js | 3 | med |
| engine/complete.js | 2 | low |
| engine/store.js | 2 | low |
| engine/records-port.test.js | 2 | med |
| analysis/reachability.test.js | 2 | med |
| flow/section-status.js | 0 | — (clean) |
| features/resume/controller.js | 0 | — (clean) |
| engine/index.js | 0 | — (clean) |

No file returned `reviewed=false` — all 27 were fully reviewed.

---

## 5. Completeness note

**Clean files (3):** `flow/section-status.js`, `features/resume/controller.js`, `engine/index.js` — each reviewed in full with collaborators, doc claims verified, no findings. These are the small barrel/roll-up/thin-controller modules; their cleanliness is credible.

**Scrutinise hardest (human eyes):**
- **The two HIGHs are the only findings with genuine runtime consequence.** `hub/controller.js:74-78` should be eyeballed in a running hub — confirm whether technical page-ids are actually reaching users (the reviewer read it as a real UX defect, not just drift). `resume-self-heal.test.js:7-14` is a pure doc fix but signals the persistence record shape deserves a second look.
- **`lib/path.test.js:72-77` is the one real coverage gap** — `destroyWiped` is production code (called by `write.js`'s `commit`/`removeEntryAt`) with no direct test. Worth closing before relying on wipe behaviour.
- **`lib/answered.js:1-3` and `collection-view.js:27`** are latent-bug-shaped: both are correct *today* only because callers happen to pass the right shapes / valid paths. Cheap to harden.

**Coverage honesty / caveats:**
- **Templates (`.njk`) and route wiring were out of scope** — this sweep is `.js` only. Copy correctness beyond the hub hint bug, and any `.njk`-level GDS-component usage, are unexamined.
- **`hapi.md` was deliberately not applied** to `features/hub/controller.js` and `features/resume/controller.js` because the filenames are `controller.js`, not `*.controller.js` (the reviewers followed the trigger rule). If Hapi route/handler conventions matter, those two files got style+doc review but not the Hapi-specific pass.
- **Cross-file duplicates were kept separate, not merged.** The `stubH`/`req`/`makeH` test-fixture duplication is reported independently by `write-through-per-commit.test.js`, `submit-is-finalise.test.js`, and `resume-by-user.test.js` (4 rows total across §2). These describe **one** underlying smell — a single shared `engine/test-helpers.js` closes all of them at once. Treat as ~one unit of work, not four.
- **Many low findings are explicitly spike-wide house conventions** (single-char `h`, prose-only docblocks, non-"Should" test titles, method-shorthand port objects). Reviewers flagged these "for awareness" and repeatedly said they're only worth acting on *if the spike graduates into `src/`*. Don't let their volume (they're most of the 63 lows) inflate the perceived risk.

**Go/no-go read:** full coverage, no unreviewed files, only 2 HIGHs (one a pure doc fix, one a contained UI/copy bug), and the medium tail is dominated by doc-precision and test-DRY rather than correctness. The spike's documentation is unusually well-maintained — most agents spent their effort *confirming* claims true. Nothing here blocks; the HIGHs + the `destroyWiped` gap are the only items that should land before later phases lean on this code.
