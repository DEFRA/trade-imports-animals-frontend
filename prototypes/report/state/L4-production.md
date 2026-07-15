# L4 — Production-readiness lens

**Question:** what does a real DEFRA service need that a model spike does not — persistence and
mapping, upload with virus scan, auth and record ownership, amend-after-submit, Welsh, accessibility
and the no-JS path, error handling, observability, and a harness that stops regressions — and, for
each gap, does the losing side's MODEL OBSTRUCT closing it, or is the model merely SILENT?

## 0. The framing that has to come first

**Both prototypes are mounted inside the same real frontend shell.**
`clone-live-animals/src/server/router.js:26-27` mounts A; `clone-flow-layer/src/server/router.js:70`
mounts B. So hapi, `@hapi/yar` sessions (Redis-backed in the real FE), the crumb/CSRF plugin, the
security headers, the error pages and the logging plugin are *inherited by both*. Both templates
already emit `<input type="hidden" name="crumb">` (A: 19 templates; B: `shared/page.njk:21`).
**CSRF, session store, TLS, cookies and error pages are a TIE and are not evidence for either
model.** Any production scorecard that credits A for "has sessions" is counting the host app.

Second framing rule, applied throughout: **a gap the model is SILENT on is a sprint. A gap the model
OBSTRUCTS is an asymmetry.** A is further along on six of the nine production headings. On exactly
*three* of those six is B's model actually in the way. On the other three, B just hasn't done the
work, and saying so is the whole point of this layer.

Third: two of A's biggest production assets — real persistence, and amend-after-submit — are
**silent-not-obstructed** for B. Two of B's — Welsh and systemic accessibility — are
**obstructed** for A, by a written, boot-enforced decision. That is the shape of the finding.

---

## 1. Runtime reference data and any I/O in the model pipeline — **A-only, STRUCTURAL**

Live animals reference data (countries, ports, commodity codes, certification purposes) is
MDM-sourced over HTTP in the real service. A resolves option lists through swappable service ports
(`services/countries/client.js`, `services/ports/client.js`, `services/*/index.js`) inside async
handlers (`features/origin/controller.js:77-92`).

B's whole model pipeline is **synchronous by signature**: `grep -n "async \|await "` over
`contract.js`, `domain/index.js`, `engine/index.js` and `lib/page-controller.js` returns **zero
hits**. `domain/index.js` imports only local helpers (`:27`) and hard-codes its value domains as
literal arrays (`COUNTRY_OPTIONS`, `domain/index.js:531`; `EEA_EFTA_COUNTRY_OPTIONS`, `:566`).
Making one option list or one rule I/O-bound forces `predicate`, `options`, `engine.optionsFor`,
`contract.validatePagePayload`, `lib/build-field-descriptors.js` and all three generic page
controllers async — i.e. it changes the contract of all 40 domain entries.

And B pays a second time, on the gate it is proudest of: `i18n-coverage.test.js:103-113`
(`collectDomainLabelKeys`) asserts that **every** label value is a build-time key in
`locales/en.json`. A code MDM invents at runtime has no key by definition, so the widget falls back
to rendering the raw code and the gate is blind. B's own catalogue already ships
`"PLACEHOLDER 1 — real values come from MDM"` (`locales/en.json:396-397`). Dynamic enums must be
*exempted* from B's best gate. B cannot have both.

**Cost to close on B:** either async-ify the pipeline end-to-end (contract + engine + descriptors +
3 controllers + 40 domain signatures), or — cheaper and probably right — add a **resolution step**
that materialises option sets *before* `evaluateState` and injects them, keeping the evaluator pure
(~100-150 LOC + a cache), plus a rework of the coverage gate to cover *shape* not *keys* for dynamic
domains. Call it a week, but it is a change to the model's contract, not a feature.

## 2. Non-obligation and externally-mutated state in the journey document — **A-only, STRUCTURAL**

Every production journey accretes state that is not a user answer: cdp-uploader handles, virus-scan
statuses, backend reference numbers, submission receipts, idempotency keys.

A's answers map is **open**, and that tolerance is load-bearing: `features/documents/controller.js:269-273`
writes `uploadId` and `filename` into a `documents` entry that
`features/documents/obligations.js` declares with **four** fields and no `uploadId`; they are read
back at `:88-92` and `:304-306` to drive the scan poll and the delete-from-uploader call.

B's state document is **closed over the manifest and actively purges anything else**:
`obligations/evaluator.js:227-235` (`dropUnknownFulfilments`) is invoked as **step one of every
read** (`:62`). A key that is not an obligation id is deleted on the next request. Writes are just
as closed: `contract.js:225-228` takes the accepted payload keys from the page's in-scope
descriptors and `lib/state.js:50-78` writes only those. There is no channel for a fact that no user
typed.

Note the honest symmetry: B's drop-unknown is *also* B's self-heal-on-model-drift property, which A
lacks entirely. The third option needs a **partitioned document** — a closed obligation partition
plus an open, explicitly-declared system partition — not one or the other.

**Cost to close on B:** split the state contract into `{ fulfilments, system }`, thread the
partition through `evaluateState`, `dropUnknownFulfilments` and every `lib/state.js` mutator
(~50-80 LOC). Small, but it is a change to the model's input contract, so: structural.

## 3. No-JS file upload with virus scan — **A-only, STRUCTURAL (for B)**

A: cdp-uploader with a `?attempt=N` refresh **link** (no client JS), PENDING/COMPLETE/REJECTED tags,
virus rejections raised into the error summary, oversize handled as a 413 Boom
(`features/documents/controller.js:81-104, :123-162, :185, :257-274, :299-316`;
`services/document-uploads/real.js`).

B has no file value kind anywhere: `lib/field-widgets.js` dispatches only radios / select /
checkboxes / date / input / address, and `grep -i "file\|upload"` over `field-widgets.js` and
`domain/index.js` returns only the *attachment-format enum* (`domain/index.js:694-695` — "fixed list
of 8 file extensions"). B models the metadata *about* the file and has no representation of the file.
Deeper than the widget: a scan status **mutates externally, between requests, with no user POST**,
and B's evaluator is a pure total function over user-authored fulfilments
(`obligations/evaluator.js:24, 61-62, 253-268`). That is the same wall as §2, hit at speed.

**Cost to close on B:** §2's partition + a `file` value kind + an out-of-band write path +
`async` (§1). 1-2 weeks and three model contract changes. **But note what this actually says:** A's
upload does not *use* A's model — it survives *because A's model does not get in the way*. An open
document is an escape hatch; a closed one is a wall. That is the transferable lesson, not "A has
upload".

## 4. Welsh / statutory bilingual copy — **B-only, STRUCTURAL (for A)**

The single largest production asymmetry against A, and it is a model fact, not a build fact.

B: `lib/i18n.js` (82 LOC), `locales/en.json` (362 keys), copy declared *with* the value domain —
`staticEnum(OPTIONS, { labels })` (`domain/index.js:134-141, :342-352`) — so widget, validation, CYA
row and the obligation's own gate all derive from one declaration, and `i18n-coverage.test.js`
red-builds a missing key. B's gates compare locale-invariant **codes**.

A: **zero** locale files, zero resolver, ~1,145 hand-typed English strings across 32 templates and
~54 error literals, and the model is *forbidden* from carrying copy — "deliberately no type, no
copy, no widget choice and no validation" (`docs/obligation-model.md:36-42`), a recorded reversal
(`docs/decisions.md:272`), **enforced at server boot** by `assertObligationPurity()`
(`obligation-purity.js:19-46`). Two of A's twelve gates already compare English display strings
(`features/transport/obligations.js:22, :34`).

**Cost to close on A:** reverse a written, boot-enforced architectural decision; add the descriptor
+ copy layer A deleted (0 LOC of it exists today); externalise every string; re-key the two
label-comparing gates, which is entangled with the byte-exact backend payload
(`skeleton-equivalence.test.js`). Weeks, and it lands in the same place §5 does. Neither side has
actual Welsh, plurals, or content-design provenance — but B is a day's threading away and A is a
rewrite away.

## 5. Systemic accessibility remediation — **B-only, STRUCTURAL (for A)**

Not "is it accessible" (both journeys work with JS off; neither runs axe — see §15) but **where an
a11y fix lands**. B: `lib/build-field-descriptors.js:64-97` → `lib/field-widgets.js:23-54`
(`uiHintsFor` → autocomplete / inputmode / spellcheck) → 8 templates for 31 pages. Adding
`autocomplete` to every text field, or fixing an `aria-describedby`, is **one rule edit**. A: ~145
hand-authored govuk macro calls across 32 `.njk` / 1,499 LOC; 21 autocomplete tokens hand-typed; no
test renders a template, so the one you missed is caught by nothing.

Same structural blocker as §4 (`obligation-purity.js`, `docs/obligation-model.md:36-42`), same bill.

## 6. Errors that are not a field — **A-only, STRUCTURAL (for B)**

Real services raise errors that no obligation owns: "this file contains a virus", a failed search, a
cross-page remediation link. A does all three
(`features/documents/controller.js:158-162`; `features/party-picker/controller.js:76-82` anchoring to
`#q`; `features/consignment-details/controller.js:126-145` linking into another page's card).

B's error record is `{code, obligation, path, subField}` and the anchor is *derived* from
`obligation` (`lib/format-domain-errors.js:120-131`); validation only ever loops the page's
descriptors (`contract.js:224-295`); and all data-entry routes come from three generic controllers
(`routes.js:150-205`) so there is no per-page seam where such an error could be raised. An error not
arising from a submitted payload value of an in-scope obligation has nowhere to live.

**Cost to close on B:** widen the error-record shape (free-text message + arbitrary href) and add a
per-page `validate` hook to the generic controllers — ~50 LOC, but it is a change to the model's
error contract and to the "pages ARE their obligations" invariant. Structural, cheap.

## 7. Enforced deletion of out-of-scope personal data at rest — **A-only, NOT structural, live defect**

Data minimisation is a legal obligation, and both models *claim* scope-exit purge as a derived
consequence. Only A applies it to storage: `engine/write.js:14-15` reconciles and calls
`destroyWiped` on every commit, and A's storage port exposes **no per-key delete at all**
(`engine/persistence/records.js:23-48`), so a page physically cannot hand-roll one.

B computes the purge and throws it away: `purgeStorage` produces `amendedFulfilments`, the evaluator
returns it (`obligations/evaluator.js:94, :124`), `lib/state.js:42-44` renders from it — and every
mutator re-reads **raw** yar (`lib/state.js:51, 102, 121, 187, 208`) and writes the raw map back
(`:76, 115, 161, 201, 221`). Nothing writes the amended map back. Out-of-scope answers — addresses,
passport numbers — rot in session forever and resurrect pre-filled. Worse, `applyTo` runs *pre*-purge
(`:62` vs `:94`), so a value the model believes it deleted keeps driving other obligations' scope
decisions.

**Cost to close on B: ~5 LOC** (write `amendedFulfilments` back). Not structural. But it means B has
never once run the purge its 3,000-line write-up documents, and a naive "take B's model" ports the
claim, not the behaviour. **Take A's no-per-key-delete port contract with it, or the invariant dies
in the merge.**

## 8. Durable instance identity in a persisted draft — **A-only, STRUCTURAL (for B)**

A saved draft that resumes on another device is table stakes. A's journey document is
self-contained: entries are array elements in the answers tree, identity is position, and the whole
document round-trips through the backend (`engine/write.js:20-28`; `services/persistence/records/real.js:44-53`;
`engine/resume-self-heal.test.js`).

B's instance identity lives **outside the state document**, in two extra session keys —
`NEXT_LINE_ID_KEY` and `NEXT_UNIT_ID_BY_LINE_KEY` (`lib/state.js:14-16, 89-95, 172-184`) — with an
explicit comment that deriving them from the fulfilments is *unsafe* because a delete could recycle
an id and rehydrate stale leaves (`lib/state.js:84-88`). The persistable unit is the fulfilments map
alone (that is what `dump.js:42-58` and the evaluator take). Compounding it, an instance *exists*
only as the prefix-set of its descendants' composite keys (`obligations/evaluator.js:390-421`), so
`addCommodityLine` has to **seed a placeholder `''` leaf** to make the line exist
(`lib/state.js:110-114, :196-200`) — and if a gate flip ever purges that seeded leaf, the whole
commodity line silently annihilates from the draft.

**Cost to close on B:** an explicit group-instance entry in the state document — which B's own doc
already shows at `obligations.md:1164` while denying it at `:1173-1174` — touching evaluator steps
2/5/6 and every `state.js` mutator (~100-150 LOC). A cheap envelope (`{fulfilments, counters}`)
papers over the *session* case but not a backend round-trip, and does nothing about the vanishing
line. Structural: the state shape has to change.

## 9. Submit / freeze / amend-after-submit — **A-only, NOT STRUCTURAL. This is the row that stops "further along" masquerading as "better".**

A has a real lifecycle: `IN_PROGRESS | SUBMITTED` (`engine/persistence/records.js:1-2`), a records
port (`:23-48`), writes hard-blocked on a submitted journey **at the adapter**
(`services/persistence/records/real.js:117-119`), `finalise` and `amend` against the Java backend
(`:134-150`), and a server-side submit gate (`engine/write.js:89-95`).

B has no POST on check-your-answers at all, and its status alphabet (`engine/index.js:274`) is about
obligations, not journeys.

**Is B's model in the way? No.** A's lifecycle is not in A's obligation model either — it is an
envelope fact carried by a port. B needs the same envelope (§2's partition) plus ~200-300 LOC of
port + adapter. It is a sprint, not an asymmetry.

And the sting in the tail: **B's identity model is the better one for amend.** Amending a submitted
notification means diffing against persisted records by identity — B has stable, monotonic,
never-recycled ids (`features/units/controller.js:121-130`), A has array positions
(`lib/path.js:1-10, :39` splice; `:47-57` `wipeOrder` exists *solely* to delete higher indices first
so a batch delete does not shift indices under itself). A built amend on a foundation that cannot
say "this document relates to commodity line X" after a delete. A shipped the feature; B has the
model for it.

## 10. Deriving the backend mapping from the model — **NEITHER, and both must change to get it**

Zero of 44 obligations on **either** side carries a backend binding. A hand-writes two mappers
(`services/persistence/records/notification-mapper.js`, `mapper.js`); B has none. The prize —
"declare `persistsAs` once, generate both directions, gate coverage" — is unclaimed by both.

A's version of this gap has already bitten: because obligations carry no field-level path, the
mapper has **no coverage gate**, so a field added by A's own `docs/add-a-field.md` recipe is silently
dropped in real mode with nothing going red. B has exactly the right gate
(`obligations/coverage.test.js`, keyed off `domain/index.js:1150-1194`) and nothing to point it at.

**Cost:** add one binding key to the obligation vocabulary on whichever spine wins, generate the
mapper, retarget B's coverage gate at it. ~1 sprint. Both sides must change their model — which is
precisely why it belongs in option C's charter and not in either side's column.

## 11. A mandatory obligation that is never asked — **A-only (a boot-time guarantee), NOT structural**

The worst production failure available in this domain: submit a legally-incomplete notification and
be told it is Completed.

A cannot boot with it: `flow/dispatch.js:32, :44-52, :62` asserts every obligation at every depth is
owned by exactly one page and **throws at server start** otherwise.

B can: `journeyState` walks the *flow tree*, not the manifest (`engine/index.js:583-590`), so an
obligation that no page `presents` has no status, no page and no test firing — the hub reads
all-Completed and CYA prints ready-to-submit. B's own guard exists only for depth-1 commodity-line
leaves (`features/commodity-lines/controller.test.js:66-80`). B's sister defect — zero commodity
lines still classifies `fulfilled` (no minimum-cardinality verb) — is the same class.

**Cost to close on B: ~20 LOC** (a test asserting every obligation in the manifest is presented
somewhere) + ~8 LOC for a `requiredAtLeastOne`. B's manifest **is** enumerable, so the gate is easy.
Not structural — but note the difference in *kind*: A's is a crash at boot, B's would be a red test.
For a service that can submit an incomplete regulatory document, fail-at-boot is the better default,
and it is worth carrying into option C.

## 12. Per-user ownership of a record — **NEITHER model has an actor**

A has a *seam*: `session.userId(request)` reads `request.auth.credentials.sub`
(`services/persistence/session/real.js:13-15`), and a `knownJourneys` list in yar gates
`selectJourney`/`amendJourney` (`engine/journey.js:87-104`). But that is **session**-scoped, not
identity-scoped: `records.load({ journeyId })` never checks `userId`
(`services/persistence/records/real.js:85-93`) and the backend list is unscoped. B has nothing.

Neither *model* knows who the user is, so per-record authorisation and audit must be built outside
either. structural=false on both; ~1 sprint plus a backend `userId` query. Flagging it because a
production readiness review will ask, and because A's existing mechanism must not be mistaken for
authorisation.

## 13. Concurrency — **NEITHER, 0-0**

A's `saveAnswers` takes no version and always writes the whole map
(`services/persistence/records/real.js:106`; `engine/write.js:16`). B's `writeAnswer` is a whole-map
read-modify-write (`lib/state.js:51, :76`). Two tabs clobber each other, silently, on both sides.
Neither model is in the way of fixing it; neither gets credit.

## 14. A durable document a human can support — **A-only, STRUCTURAL (for B), and it is a real trade**

A's persisted keys are semantic obligation ids, so a Mongo document is greppable and auditable
without the code. B's durable key is an opaque UUID with `name` deliberately renameable — the moment
B talks to anything outside the process it needs a translation table, which its own debug tool
proves: `dump.js:40-52` is an 11-line `name → id` resolver that **throws** on an unknown name
(`:47`). Rename-freedom and self-describing durable documents are in direct tension and B cannot
have both. Neither side logs anything: `grep -l "logger\|pino\|request.log"` finds two adapter files
on A (trace-id header propagation only) and **nothing** in B. Observability is silent-not-obstructed
on both.

## 15. A harness that stops regressions — **split, and the cost of a red test is model-driven**

Neither side has axe, pa11y, Lighthouse, a `javaScriptEnabled: false` project, or a coverage
threshold. Adding axe costs a day on either. **What differs is what a failure costs:** on B, "every
text input needs `autocomplete`" is one dispatch-rule edit; on A it is 32 templates and no test
catches the miss. Same gate, different bill — and the bill is set by the model.

The two structural test capabilities are already established and both survive this lens: only B can
express *model → rendered widget* conformance (its UI is a pure function of the model); only A can
express a *whole-model reachability proof* (its gates are invertible data,
`analysis/reachability.js`, run as a test). A production assurance pack wants both.

**One correction to an earlier layer, found while checking this lens.** The claimed B-only capability
"ask the model which INSTANCES an obligation applies to" is **overstated**. A's `reconcile` keys
`inScope` by **full instance path** (`engine/evaluate/reconcile.js:13-14`, `pathKey(path)`), and
`makeScope` exposes `has(key)` over it (`engine/read.js:27-35`). `scope.has('commodityLines[0].permanentAddress')`
already answers the question B's `impl.records` answers. A's five hand-rolled re-derivations in
controllers are **tech debt, not a paradigm limit** — which also means A can build B's per-instance
URL guard (`lib/line-page-controller.js:48-66`, a model-derived "does this line exist / does this
obligation apply to this line" check that turns a forged `/lines/{id}/…` URL into a redirect rather
than an empty form) for roughly 20 LOC. Do not price that as structural.

---

## Scorecard against the production list

| Production need | A | B | Model obstructs the loser? |
|---|---|---|---|
| Persistence + backend mapping | built (2 mappers, Mongo parity) | none | **No** — silent on both; *deriving* it needs a model change on both |
| Runtime (MDM) reference data | built | none | **Yes** — B's pipeline is sync by signature; its label gate assumes build-time keys |
| Upload + virus scan (no-JS) | built | none | **Yes** — no file kind, sync, purity of the fulfilments map |
| Non-obligation state in the doc | tolerated | deleted on read | **Yes** — `dropUnknownFulfilments` |
| Submit / freeze / amend | built | none | **No** — a sprint; and B's ids are the better foundation for amend |
| Per-user ownership | seam only, unenforced | none | **No** — neither model has an actor |
| Welsh / i18n | none | model-level seam | **Yes** — A's purity guard forbids copy in the model |
| Systemic a11y | per-template | derived | **Yes** — same guard, plus A has no descriptor layer |
| Non-field errors | built | impossible | **Yes** — B's error record is keyed by obligation |
| Data minimisation at rest | enforced | computed, discarded | No (~5 LOC) — but B has never run its own purge |
| Un-askable mandatory field | crash at boot | silent, hub says Completed | No (~20 LOC) — but fail-at-boot is the better default |
| Concurrency | broken | broken | No — 0-0 |
| Observability / audit | trace header only | none | Legibility of the durable doc: **yes** (B's UUID keys) |

## Shopping list for option C

1. **B's spine** (declarative flow, derived descriptors, i18n seam, coverage gates) — this is where
   Welsh, systemic a11y and per-field cost are won, and they are the expensive ones.
2. **A's `activatedBy` data vocabulary** for gates, so the reachability prover survives — with
   metadata mandatory on any closure escape hatch (fail the build if a gate has none).
3. **A partitioned state document**: closed obligation partition (keeps B's drop-unknown self-heal)
   + declared system partition (uploads, scan status, backend refs, lifecycle status). Without it,
   option C can never do upload, submit or amend.
4. **An explicit group-instance entry** in the state document (B's own `obligations.md:1164` shape),
   so instances exist without a seeded leaf and identity is durable in a persisted draft.
5. **A's storage-port contract** (no per-key delete) plus **B's purge, actually written back**.
6. **An async resolution step** in front of the evaluator for MDM-sourced domains, keeping the
   evaluator pure and total.
7. **`persistsAs` on the obligation** + a generated mapper + B's coverage gate retargeted at it.
8. **A's boot-time totality assert** (every obligation owned by exactly one page) and a
   minimum-cardinality verb.
9. **Widen B's error record** for non-field errors, plus a per-page validate hook.
10. Add what neither has: axe, a `javaScriptEnabled:false` Playwright project, coverage thresholds,
    a version/etag on the write path, and a record-ownership check on the backend.
