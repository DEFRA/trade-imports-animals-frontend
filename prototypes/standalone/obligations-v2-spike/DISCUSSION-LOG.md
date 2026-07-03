# Discussion log — obligations v2 spike

A running record of design questions raised in review of the spike, the discussion
around each, and the conclusion reached. Grounded in the actual spike code; file
citations are paths relative to `obligations-v2-spike/`.

---

## 1. Can one obligation be satisfied by more than one page? (many-to-one dispatch)

**Question asked.** The `flow` and `dispatch` seams were defined as a pair:

- **Flow** (`flow/flow.js`) — ordering. An ordered list of sections → pages that owns
  _sequence and gating only_ (no copy). `gate` is a pure read of already-computed scope;
  `flow/navigation.js` walks it (next applicable page in the section, else back to the hub).
- **Dispatch** (`flow/dispatch.js`) — the reverse lookup. "Which page owns obligation X?"
  Derived at boot from each page's page-side `collects` declaration, then
  **coverage-asserted**: every non-system obligation must be claimed by exactly one page
  or boot crashes.

The reviewer raised a (deliberately contrived, spike-appropriate) use case: an obligation
that could legitimately be captured by **two different routes** — e.g. an optional `age`
that one section has a reason to ask, and another section also has a reason to ask, via a
different path. Would this model handle the same obligation being met by multiple pages?

**Discussion.** The key insight was to separate _where it breaks_ from _where it doesn't_:

- **The state layer doesn't care.** `reconcile`, scope, wipe and status all key off the
  obligation's `id` in the `answers` map. Two pages both writing `age` would work fine — a
  value is a value; the state layer never knows which page wrote it.
- **The dispatch seam is what forbids it.** `buildDispatch` throws the moment two pages
  declare the same obligation ("Obligation `age` is collected by two pages…",
  `flow/dispatch.js:27-33`). This is deliberate: dispatch is a **one-to-one** reverse map
  (obligation → single owning page), because the **check-your-answers "Change" link**
  needs an unambiguous target. `check-answers/controller.js:changeHref` calls
  `pageOfObligation(id)` to build "Change age" — if `age` had two owning pages, that lookup
  has no single answer.

So the paradigm handles a shared obligation fine at the state level; only the current
spike's dispatch seam (and the CYA Change links that depend on it) assumes exactly one
owning page.

**Conclusion.** The clean resolution — which fits the grain of the model and needs **no
change to `reconcile` or the coverage assertion** — is:

> **Many routes in, one page, one obligation owner, one Change target.**

Keep a single `capture-age` page that owns the `age` obligation. The "two reasons to ask"
become two **routes** (links / redirects) that funnel into that one page. Dispatch stays
one-to-one, and CYA has exactly one place to send the user to edit.

One wrinkle to note if pursued — it lives in **flow, not dispatch**: `flow/flow.js`
currently assumes a page belongs to exactly one section (`sectionOfPage` returns the first
section containing the id, and `nextInSection` walks within that one section). If the
shared page had to sit _structurally_ inside two section flows, "what is my next page"
would need a rethink. But if the two routes are just redirects that land on the age page
and the page has one home section, it works as-is — a redirect target is just a URL.

This is a tidy illustration of the whole v2 stance: **the page is the unit of ownership,
and everything else is navigation pointing at it.**

---

## 2. `state/quote.js` is a stateless calculator misfiled under `state/`

**Status: to address later.**

**Observation.** `state/quote.js` jars in the state folder — it reads like an _engine_, not
state.

**Discussion.** What it actually is: two pure functions. `calculatePremium(answers)` takes
the answers and returns a number (base premium × cover-type multiplier, plus claims /
penalty-point loadings, minus the no-claims discount, floored at a minimum), and
`makeReference(journeyId)` derives a quote-reference string. It stores nothing and touches
neither `store` nor `reconcile`.

Crucially, **nothing in the state machinery imports it** — not `reconcile.js`, not
`status.js`, not the `index.js` facade. Its only callers are controllers
(`check-answers/controller.js` and the quote-summary page) which call `calculatePremium`
directly at render time. So it is a leaf calculator that merely _sits_ in `state/`.

Why it's there is **thematic, not mechanical**: in the model, `premium` is the one
`system: true` obligation (computed, never collected), and in v1 the premium was computed
inside the orchestrator — the state-ish layer. So this is v1 heritage: "premium is a derived
system fact, and derived facts live near state." But mechanically it has nothing in common
with the rest of the folder — it's domain/pricing logic. There is also a small inconsistency:
the validation rework deliberately pulled value-domain logic _out_ of the model and into
`lib/`, yet premium derivation stayed behind in `state/`.

**Conclusion (to action later).** `quote.js` would sit more honestly as domain logic —
e.g. a `lib/` or `domain/` folder next to `lib/validate/` — rather than under `state/`.
No behaviour change; a relocation to match the "state = truth engine, not calculators"
boundary.

---

## 3. `state/` is an overloaded folder — the registry is the _model_, not state

**Status: to address later (decomposition).**

**Observation.** Following on from entry 2: the obligations registry isn't state either —
it's _pure_. That pulls the thread on the whole folder name.

**Discussion.** Decomposed, `state/` holds four different kinds of thing under one label:

1. **The model** — `obligations/registry.js`: pure, immutable, compile-time declarative
   data. Never changes at runtime.
2. **Pure evaluators** — `predicate.js`, `reconcile.js`, `status.js`, `util.js`: pure
   functions over (model + answers); hold no state themselves.
3. **The genuinely stateful bit** — `store.js` (in-memory Map of journeys) and
   `journey.js` (cookie plumbing). This is the _only_ part that truly earns the name.
4. **The facade** (`index.js`) and **the misfiled calculator** (`quote.js`, entry 2).

So the one thing that earns "state" is the store; everything else is the model or pure
computation over it. The folder is really "everything that isn't a page or a route."

Worth emphasising: burying the registry under `state/` **undersells it**. The paradigm is
called _obligations_ — the registry is the obligations model, the crown jewel. In v1 it was
a top-level concept (`model/obligations.json`); in v2 it was folded down into
`state/obligations/registry.js`, a drawer inside `state`.

**Conclusion (to action later).** Decompose `state/` along the four seams above. In
particular, promote the **obligations model to a first-class, top-level folder** sitting
next to `flow/`, `pages/` and the (renamed) persistence/evaluator concerns — not a
sub-folder of `state`.

### 3a. Follow-up — decompose `registry.js` itself (per-obligation files + barrel)

Once `obligations/` is a high-level folder, the single `registry.js` (~30 defs in one file)
is itself too much in one place and should be split. Group obligation defs into their own
files by domain — e.g. `obligations/claims.js`, `obligations/named-driver.js`,
`obligations/cover.js`, etc. — and have a **root-level `registry.js` import them all and
assemble the catalogue** (barrel pattern): it builds the `all` array, the `byId` map and the
`refs` object the rest of the code depends on, and the boot assertion keeps counting on
`registry.all` being complete.

**Wrinkle to design around.** The relationships are **real JS references across
obligations**, so the split files will need to import each other, not just be assembled by
the barrel. Concretely: `claims.activatedBy` references `hadClaims` (a driving-history
obligation); `excessAmount` references `voluntaryExcess` (a cover obligation); the addon
detail obligations reference `addons`. So a per-domain file that owns `claims` must import
`hadClaims` from wherever that lives. The reference graph crosses file boundaries — which is
fine (that's what real const references buy us over UUIDs), but the file layout has to
respect it, and the barrel assembles rather than defines.

(Note the mild irony worth remembering: v2 deliberately **dropped** v1's 21-export _contract_
barrel — but that was a behavioural seam feeding the generic engine. A registry barrel that
only assembles _data_ is a different animal and is a reasonable pattern here.)

---

## 4. Model-level, page-decoupled journey testing — the paradigm's real payoff

**Status: partly realised; gaps noted.**

**The ambition.** A core reason to model obligations at all is powerful **unit-level**
testing that is _not coupled to the frontend_: take a persona ("a person with 17 claims and
a named driver"), walk their journey purely in code, and derive properties programmatically
rather than by writing an automated UI test or clicking through by hand. Two properties in
particular:

- **No dead ends** — deterministically prove there is no case where an answer is _needed_
  (an obligation is owed / in scope) but _nothing provides the means to capture it_.
- **Persona → journey** — given "I am this and this and this," output the exact page
  sequence that persona would see.

**What already exists.** The foundation supports it and some is built:

- The entire `state/` layer is pure and browser-free: `reconcile(answers)`,
  `statusOf`/`readyForQuote`, and `flow/navigation.js` are all pure functions.
- `dump.js` is a headless state dump for a fixture (no server, no rendering).
- The unit tests already do the persona shape in miniature: `flow/dispatch.test.js` asserts
  "given these answers, is the quote unlocked" (reconcile → readyForQuote) and walks the
  driving-and-cover section proving claims is skipped when out of scope; `reconcile.test.js`
  proves the wipe cascades.
- **One class of dead-end check already runs at boot**: the coverage assertion proves every
  ownable obligation is collected by exactly one page — i.e. "we never need an answer with
  no page to capture it," for the page-exists form of the question. It's a startup crash if
  ever false.

**What's missing.**

- No top-level **journey simulator** that threads the whole thing: persona in → ordered
  page list out, across sections and back through the hub. The navigation primitives exist;
  nobody has written the full walk loop (the hub's "which section next" logic lives partly
  in the hub controller).
- No **reachability / dead-end prover** that enumerates reachable scope states and proves
  you can't get stranded. This is _tractable_ precisely because the model is tiny and the
  predicate vocab is just three operators (`equals`/`includes`/`present`) over a small
  finite answer domain — enumerable and decidable. Enabled by the design, not implemented.

**The tension to hold (important).** Two v2 decisions quietly erode this analyzability:

1. **Validation moved into controllers (Joi).** A model-level simulation can _set_ an
   answer but can't judge whether it's _valid_ without reaching the controller's field map —
   "what is a valid answer" is no longer a model fact. Completion-readiness stayed pure
   (good); input validity did not.
2. **The pressure valve is "branching belongs in a controller."** The model is provable
   only to the extent journey logic stays in the declarative predicate vocab. The moment a
   controller `if` affects navigation, that branch is invisible to any model-level prover.
   So provability is _proportional to how much stays in the model_ — and v2's ethos is to
   push the interesting logic into pages. That trade sits directly under this ambition.

### 4a. Follow-up — contract testing between controllers and the model

**Status: idea to explore.**

To defend against the case where a **controller change silently makes the model inaccurate**,
add **contract tests** binding controller implementations to the obligation model. The
cleanest contract:

> The set of obligation ids a controller actually **commits** must match its declared
> **`collects`** (minus `renderOnly` / `system`).

Because controllers are plain functions, this is checkable headlessly: invoke a controller's
`post` with a full synthetic payload against a stub `request`/`h`, then diff the keys it
writes to the store against its `meta.collects`. If someone adds a field to a template +
payload but forgets the def, or drops a `commit`, the contract test fails — the drift becomes
a red test, not a silent runtime hole the boot assertion can't see (boot only checks the
_declaration_, never that the handler honours it).

**Nuance the contract must respect.** Not every collected obligation is committed:
`vehiclePhoto` is in `your-vehicle`'s `collects` but is `renderOnly` (never stored), and
`premium` is `system` (never collected). The model already carries `renderOnly` / `system`
flags for exactly this reason, so the contract test reads them to exclude those ids.

Further contract candidates worth considering:

- **Value-domain drift** — a controller's option list (its `oneOf` domain) vs the label maps
  the CYA uses to render that value (`check-answers` has its own `COVER_LABEL`, `COUNTRY_LABEL`,
  etc.). Assert their key sets agree, so a new cover type doesn't render blank at CYA.
- **No hidden gate mirroring** — flag a controller `if` that re-implements an `activatedBy`
  rule (the design already calls this a "review smell"); assert navigation only flows through
  `kit.nextTarget` / `nextInSection`, never a bespoke redirect that bypasses the gates.
- **Completion reachability** — every `required` obligation is collected by a page that is
  reachable given the flow gates (no obligation that's owed-for-completion but unreachable).

---

## 5. A feature (vertical-slice) structure instead of `pages/` + central model

**Status: direction to decide.**

**Idea.** Restructure from `pages/about-you/` (+ a central `state/obligations/registry.js`)
to `features/about-you/`, where a feature folder co-locates everything that page owns: the
`controller.js`, the `.njk`, its validators, **and the obligation definitions that controller
owns**. A vertical slice per feature.

**Why it fits.** It finishes a thought v2 already started. The stance is "the page is the
unit of ownership" — copy, validation, view-model — and the `collects` declaration already
lives page-side. Co-locating the defs is the last step, and it makes the design's own
onboarding pitch ("read the page you're changing") true for the model too.

**What must stay central regardless.** A feature model doesn't dissolve everything:

- **The state engine** — `reconcile`, `status`, `store`, `predicate` — operates over _all_
  obligations at once, so it's cross-cutting infrastructure beneath the features.
- **Flow** — ordering is inherently across features (a section groups pages from several).
- **An assembling registry barrel** — imports every feature's obligations so `reconcile` and
  the boot assertion see the whole set (this is entry 3a's barrel, relocated into features).

So the shape is: **features on top as vertical slices, a thin engine + flow + registry barrel
underneath.** Features stacked on shared rails.

**Two tensions to design around.**

1. **Cross-feature reference graph** (sharper version of entry 3a). Obligations reference
   each other across features — `claims` is activated by `hadClaims` (driving-history);
   addon details by `addons`. So a feature's obligation file imports obligations from other
   features; the model is a shared DAG threaded through the slices, not self-contained boxes.
   Fine, but "the feature contains its obligations" isn't fully clean — the defs have edges
   reaching out.
2. **Purity re-coupling risk.** v2's model-purity guard says the registry imports nothing
   (no view/request/error), enforced at boot. Dropping defs next to a controller that imports
   Hapi/views makes it _easy_ to blur that line and slide back toward the rejected
   "model-dispatch" design (presentation identity on the def). Co-location ≠ coupling, but it
   invites it.

**Conditions for adopting it (the conclusion).**

- Keep each feature's defs in **their own pure file** (`features/about-you/obligations.js`)
  that still imports nothing outward.
- **Re-point the purity assertion** to check _every_ feature obligation file, not one central
  registry — guard **per-file**, not per-folder.
- Accept the **cross-feature reference graph** as a shared DAG (imports across feature
  boundaries are expected).
- Keep **flow, the state engine, and the assembling barrel central**.

---

## Work order — recommended sequence for implementing the above

Ends this session's discussion. The items interact, so order matters. Rationale-first:

**The governing fork is entry 5 vs entry 3.** A feature/vertical-slice layout (5) and a
layered-central decomposition (3/3a) target the _same_ obligation-def files at _different_
destinations. Splitting `registry.js` into per-domain central files (3a) and then moving
those same files into features (5) is double work. **Decide the destination before moving
anything.**

**Recommended order:**

1. **Decide the target structure — feature-model (5) vs layered-central (3/3a).** A design
   decision, not code; cheap; blocks all structural work. (Lean: entry 5 — it extends the
   ethos — but it's a judgement call.) Everything structural hangs off this.

   > **DECIDED (this session): the feature-model (entry 5).** Restructure to
   > `features/<feature>/` vertical slices co-locating `controller.js`, `.njk`, validators
   > and a pure `obligations.js`, over a central engine + flow + registry barrel. The
   > execution brief for a fresh agent is
   > [`../obligations-v2-feature-model-prompt.md`](../obligations-v2-feature-model-prompt.md).

2. **Write the contract tests (4a) _first_, against the current code.** The
   "commits == collects (minus renderOnly/system)" contract is small, structure-independent,
   and — crucially — becomes the **regression net that protects the big structural move**.
   Pin the current controller↔model binding _before_ the churn, so the refactor can't
   silently break it. (The boot assertion only checks declarations; these check behaviour.)

3. **Execute the chosen structural refactor** (3 + 3a _or_ 5), and **fold entry 2 into it** —
   `quote.js`'s destination (a `lib`/`domain` folder, or the quote feature) is only decided
   once step 1 is settled, so move it once, here, not twice. Re-point the model-purity guard
   per-file as part of this.

4. **Build the journey simulator + reachability prover (4)** on the cleaned-up structure.
   This is additive payoff work and reads best against a clean model. Note the entry-4
   tension: decide here whether to expose a per-controller field-map to the model layer so
   the simulator/prover can reason about answer _validity_, not just scope.

5. **Park many-to-one dispatch (entry 1).** Demand-driven — implement only when a real
   shared-obligation case appears. It's a documented _pattern_, not scheduled work.

**Dependency summary:** 1 gates 3/3a/5 and the destination in 2. 4a is deliberately pulled
early as a safety net (do before the refactor). 4 depends on a clean structure (after 3). 1
is unscheduled.

---

## Work order — implementation status

A record of what landed when the feature-model restructure was executed, and what was
discovered along the way that revises the entries above.

- [x] **1 — Target structure decided:** feature model (entry 5). No code; the fork was
      settled in session.
- [x] **2 — Contract tests written first, against the current code** (`contract.test.js`).
      One case per collecting page: invoke the real POST handler with a full valid payload
      against a stub `request`/`h` backed by the real store, then diff the obligation ids the
      handler newly wrote against `meta.collects` (minus `renderOnly` / `system`). Green on the
      **old** `pages/` + `state/` layout _before_ any move, then carried through the churn
      unchanged but for its import paths. Claims is measured against its entry (append) handler,
      since the list page declares `collects: ['claims']` but the identity-minting write lives in
      the sub-page — the contract holds against the handler that actually commits.
- [x] **3 + 3a + 2 — Structural refactor executed.**
  - `pages/<page>/` → `features/<feature>/` vertical slices; each collecting feature gained a
    pure `obligations.js`.
  - `state/obligations/registry.js` (~30 defs) split per feature (3a) and assembled by a
    **top-level `registry.js` barrel** (3) — the obligations model is now first-class.
  - The cross-feature reference graph is real: `claims/obligations.js` imports `hadClaims`
    from driving-history; the three add-on detail slices import `addons`; `quote` imports
    `coverType`. A shared DAG, acyclic; the barrel assembles, the features define.
  - Residual `state/` → **`engine/`** (pure evaluators + store + facade); `state/quote.js` →
    **`lib/quote.js`** (entry 2 — domain logic, not state); `pages/_shared/` → top-level
    `shared/`.
  - **Model-purity guard re-pointed per-file** (`obligation-purity.js`, run at boot from
    `routes.js`): every `features/*/obligations.js` may import only another feature's
    `obligations.js`. **Discovery worth recording:** the guard referenced throughout the
    docs ("caught by the boot assertion in routes.js") **did not actually exist** — the only
    boot assertion was `flow/dispatch.js`'s coverage check. So "re-point the purity
    assertion" was in practice _implementing it for the first time_, now genuinely per-file
    rather than per-folder. It reads source and scans import specifiers, so it catches a
    stray outward import even in a feature the barrel forgot to assemble.
  - Regression guard held throughout: `reconcile.test.js`, `dispatch.test.js`,
    `validate.test.js`, `contract.test.js` and a new `obligation-purity.test.js` all green;
    all three shared specs green for the `page-owned spine` journey; full `test:prototype`
    (66 tests) green — exact-DOM parity preserved.
- [x] **4 — Journey simulator + reachability prover** built on the clean structure
      (`analysis/`). `simulateJourney(answers)` threads a persona through the flow + gates and
      returns the exact ordered page sequence, reusing the real `makeScope` (no drift).
      `proveReachability()` enumerates the finite scope space (hadClaims × voluntaryExcess ×
      coverType × the 8 add-on subsets = 64 states), reconciles each, and proves every
      in-scope obligation's owning page is reachable in that scope — 0 dead ends. A `pagesFor`
      injection point lets the test prove the prover has teeth. **Entry-4 sub-decision
      resolved conservatively:** the prover reasons about **scope, not input validity**.
      Judging validity would need the controllers' Joi field-maps, and exposing those to the
      model layer would re-couple model↔controller — the coupling v2's seams exist to prevent.
      Completion-readiness stays a pure, provable model fact; input-validity deliberately does
      not (recorded on `analysis/reachability.js`). So entry 4's two decisions are not eroded:
      readiness is proven here; validity stays a controller concern by design, not omission.
- [ ] **1 (many-to-one dispatch) — parked**, as intended (demand-driven).

---

## 6. Are indexed obligations first-class? (nesting + item-scoped conditionality)

**Question asked.** The spike has exactly one repeating collection — `claims` — and it is
treated as the showcase for "an obligation that is an indexed list of sub-details." But real
services are not one-off: many obligations are indexed, indexed obligations **nest** (a driver
has claims; each claim its own details), and a value chosen _inside_ an item can **trigger
further obligations for that item only** (a windscreen claim asks which approved repairer was
used). Before building any of that: is the `claims` mechanism **first-class in the model**, or
is it a special case bolted beside the model that a second collection would have to copy?

**Investigation — verdict: NOT first-class.** `claims` works, but the model engine is blind to
it; the indexing lives entirely in controller convention over an array-shaped value. Evidence,
all anchored:

1. **`cardinality` + `fields` are declared-but-unread.** No code in `engine/`, `flow/`,
   `registry.js`, `shared/` or `analysis/` reads either — only `features/claims/obligations.js`
   declares them. The "indexed" behaviour is not modelled; it emerges from the value happening
   to be an array plus the controllers. This is the exact smell the `type` taxonomy had before
   the validation rework deleted it (§9).
2. **Sub-fields are not obligations.** `claimType` / `claimAmount` never appear as `id:` defs in
   `registry.all`. So they get **no scope, no per-item wipe, no dispatch coverage, no status
   contribution** — the model literally cannot see them.
3. **`reconcile` treats the array as an opaque scalar.** Scope + wipe key off `answers['claims']`
   as a single unit (`engine/reconcile.js`); it never descends into items. Wipe is all-or-nothing
   for the whole collection.
4. **Completeness is "≥1 entry exists", not "each entry complete".** `statusOf` does
   `isAnswered(answers[id])`, and a non-empty array is "answered" (`engine/status.js:34`). A
   claim with blank fields still counts the section complete. Per-item completeness is not a
   model fact.
5. **Item-scoped conditionality is inexpressible.** `evalPredicate` reads only top-level
   `answers[activatedBy.obligation.id]` (`engine/predicate.js:16`). There is no vocabulary for
   "activated by a sibling field _within this item_". Entry 5's "cross-feature reference graph"
   is a graph of _top-level_ obligations only.
6. **The store facade is single-level.** `appendEntry` / `updateEntry` / `removeEntry` address
   exactly `answers[obligationId]` — one flat array, no nested path (`engine/index.js:46-74`).
   And `updateEntry` is **dead code** — nothing calls it; the loop is add/remove only, no
   edit-in-place.
7. **The loop UI is fully bespoke and hardcoded to `'claims'`.** `claims/list.controller.js` +
   `claims/entry.controller.js` (routes `claims/add`, `claims/{index}/remove`), and CYA
   hand-builds Claim-N rows with `href: pagePath('claims')` — bypassing the generic
   `changeHref(obligationId)` → dispatch path every scalar row uses
   (`check-answers/controller.js:86-103`). A second collection today is a copy-paste of all of it.

So the honest verdict: **`claims` is a one-off.** The model does not _provide_ indexed
obligations; it merely _tolerates_ an array. Nesting and item-conditionality are not just
unimplemented — with the current model they are **inexpressible** (no path vocabulary, no
item-relative predicates, sub-fields aren't obligations, the store has no nested addressing).

**What the real requirements demand (the shape of the work).**

- A **recursive obligation model** — a collection's item is itself a set of obligations, which
  may include nested collections. `registry.all` (or its walk) becomes a tree.
- **Path-addressed scope + wipe** — an obligation _instance_ is identified by a path
  (`drivers[1].claims[0].windscreenProvider`); `reconcile` descends and wipes per-instance, so
  removing a driver destroys that driver's claims subtree (Yes-No-Yes at every depth).
- **Item-relative predicates** — `activatedBy` must resolve against the current item's context,
  not a global answer, so a windscreen claim activates a provider obligation _for that claim only_.
- **A reusable loop pattern that is still a library, not a framework** — the load-bearing
  tension. v2's non-negotiable is "no generic engine; shared code is a library the page calls,
  never a framework that renders" (§6). A nested add/remove loop begs to become that framework.
  **Whether the loop can be first-class without crossing that line is the central thing this
  next phase must prove** — and honestly document if it cannot.
- **Dispatch coverage, status roll-up and CYA over the tree** — no obligation at any depth
  without an owning page; completeness that rolls item fields up; CYA that renders per-item and
  per-instance-conditional rows.

**Work order (escalating canaries; each de-risks the next).** Full rationale and the executable
brief for a fresh agent live in
[`../obligations-v2-nested-collections-prompt.md`](../obligations-v2-nested-collections-prompt.md).

- **6a. Phase 1 — make single-level indexing first-class. ✅ DONE — verdict: GO (see FINDINGS
  "6a").** Promote "indexed obligation" to a modelled concept: sub-fields become real
  (sub-)obligations, the engine gains path-addressed scope/wipe/status for one level, and the
  bespoke loop is extracted into a reusable pattern.
  **Canary: re-express the existing `claims` on the new mechanism with ZERO rendered-DOM change**
  — the three shared specs + `contract.test.js` are the ready-made regression net. Fixes findings
  1-4, 6, 7 for one level. Nothing new is added yet, so the model change is provable against
  existing green.
  _Landed as:_ a collection def carries `collection:true` + a real nested `item:[...defs]`; the
  model became a tree (`registry.walkDefs`/`walk`); a path vocabulary (`lib/path.js`) keys
  per-instance scope/wipe (`reconcile`) and per-item completeness (`status`); dispatch coverage
  descends every depth (derived ownership); the loop is a facts-only library
  (`state.collectionView`). Chosen by a 3-architect/3-judge design panel (unanimous:
  recursive-tree) and hardened by an adversarial-verify pass (3 latent defects found + fixed).
  Two documented concessions the zero-touch contract dictated: ownership at depth is DERIVED not
  declared, and the model carries two identity vocabularies (template `claims.claimType` +
  instance `claims[0].claimType`). Canary held: 3 shared specs + contract.test green untouched,
  80 unit tests. `contract.test.js` `registry.all` stays roots-only (the view the iterator walks);
  `walkDefs`/`byPath` are the full catalogue, so nothing in the model is blind at depth.
- **6b. Phase 2 — one level of nesting (drivers → claims). ✅ DONE — verdict: GO (see FINDINGS
  "6b").** A `drivers` collection whose item contains a nested `claims` collection. Proves
  recursion: nested paths, cascading per-instance wipe, a loop-inside-a-loop UI. **Decided:
  extend the existing single `named-driver` add-on into an indexed `drivers` collection** (n
  drivers, each owning nested claims — natural domain fit) and update the happy-path spec (it
  already walks "Add a named driver"); add specs for multi-driver + independent nested claims +
  subtree wipe. Keep iterating on **this** v2 prototype; no parallel spike.
  _Landed as:_ `drivers` collection, item `[driverName, driverDob, relationship, driverClaims]`
  (a nested collection). **Headline: no engine change to scope/wipe/dispatch** — `reconcile.walk`,
  `pathKey` and `walkDefs` coverage already recurse; the design bet of 6a paid off, 6b was
  additive. The ONE engine change: `entryComplete` became depth-aware (an incomplete nested
  collection fails its parent — and the safety net first caught that an OPTIONAL nested collection
  must still require its existing entries to be complete). Path-addressed store ops
  (`appendEntryAt`/`updateEntryAt`/`removeEntryAt`) drive both loops; `updateEntry` is no longer
  dead code. The library-not-framework line HELD at depth 2 (the crux) — `collectionView` stays
  facts-only, both hubs stay bespoke — but held by ACCEPTING per-loop bespoke rendering, not a
  clever abstraction. The shared task-list spec became journey-conditional for v2. Adversarial
  pass fixed two malformed-URL gaps (NaN-index wrong-instance splice — pre-existing at depth-1;
  out-of-range parent phantom — new at depth). 93 unit + 68 E2E green (all 11 journeys).
- **6c. Phase 3 — item-scoped conditionality. ✅ DONE — verdict: GO; paradigm SURVIVES (see
  FINDINGS "6c" + "FINAL READ").** Inside a claim item, `claimType === 'windscreen'` activates
  `windscreenProvider` (one of three approved) **for that claim instance only**. Proves item-
  relative predicates at full depth (`drivers[i].claims[j].windscreenProvider`). Specs prove it
  appears/wipes per exact path, independently across items.
  _Landed as:_ item-relativeness INFERRED by sibling-object IDENTITY — `evalPredicate` resolves a
  ref within the item's frame when the ref is one of the node's `siblings` (walk now yields
  `framePath` + `siblings`), else top-level. **The three-operator vocab did NOT grow** — resolution
  grew, not vocabulary (the recorded finding). Field-level wipe (destroyed, not hidden) now fires
  WITHIN an item, making `wipeOrder`'s 6b-defensive branches load-bearing (verified). Adversarial
  pass found + fixed the one real debt: a DUAL-RESOLVER DIVERGENCE (`reconcile` inferred item-
  relativeness by identity, `entryComplete` assumed it by id-keying) — unified so both use the
  sibling-identity criterion. Documented boundary: **cross-frame conditionality is unmodelled**
  (would force the first vocab/model growth). 102 unit + 70 E2E green.

**Why this order.** 6b/6c are "just more bespoke code" until indexing is first-class (6a), so
generalise first — and 6a is uniquely safe because the existing specs pin it with zero-DOM
parity. 6c needs the item-context machinery 6b already forces, so it strictly follows. This
mirrors how the feature-model restructure went: safety net → structural move → additive proof.

**Execution — orchestrate, don't solo it.** This is too big for one context and the goal is
quality, so each phase is run as a multi-agent pass, not by a lone agent: fan-out reader subagents
to map every `claims` special-case site; a **design-panel workflow** (N architects → M adversarial
judges → synthesize) for each load-bearing fork — the recursive item shape, the path-scope
representation, the item-relative predicate vocab, and above all **where the loop's
library-vs-framework line sits** (the same 3-architect/3-judge method that chose this paradigm,
`DESIGN-PROVENANCE.md`); safety-net specs before the churn; and an **adversarial-verify workflow**
(skeptics trying to break per-instance wipe, no-rehydrate-at-depth, tree dispatch coverage and DOM
parity; plus a completeness critic) as the quality gate on every phase. The full orchestration
recipe is in the executable prompt.

**The deliverable is a VERDICT, not just green code.** The point is to stress-test the model.
Each phase ends with a FINDINGS/DISCUSSION-LOG write-up answering: did the model hold; where did
it strain; is the "no generic engine / library-not-framework" line intact or did nesting force a
principled concession — and if so, exactly where and why. The final output is a go/no-go read on
whether this obligations paradigm survives real recursive, conditional, indexed requirements.
