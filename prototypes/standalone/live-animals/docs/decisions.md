# Architecture decisions

The load-bearing design principles of the live-animals prototype, and why
each one holds. This is a design rationale, not a changelog: every
statement describes the architecture as it stands. For the layout itself,
start at the [index](README.md).

The prototype is a Hapi plugin ([`routes.js`](../routes.js) →
`liveAnimals`) built in three layers plus a seam:

- **model** ([`model/`](../model/)) — identity, scope, value legality and
  status derivation. Pure, no Hapi, no templates.
- **flow** ([`flow/`](../flow/)) — sections, pages, dispatch and gates.
- **frontend** ([`features/`](../features/), [`shared/`](../shared/),
  [`engine/`](../engine/), [`services/`](../services/)) — page-owned
  controllers, templates and the session/records/MDM plumbing.
- **bridge** ([`bridge/`](../bridge/)) — the single door
  between the model and the frontend.

The layers depend in one direction only: flow and frontend read the
model's facts downward; the model imports neither.

---

## 1. Pages are the spine

### Principle

Each page is an ordinary Hapi GET/POST pair with its own template, copy,
validation and view-model, under [`features/<name>/`](../features/). A
controller declares what obligations it `collects` on its exported `meta`;
boot inverts those declarations into a dispatch index
([`flow/dispatch.js`](../flow/dispatch.js)). The model stays a thin
declarative catalogue of data requirements, and the engine answers two
questions only: what data is in scope, and is it satisfied.

### Why

- The activation rule for a field is a pure data literal over a real code
  reference, not a UUID lookup — a gate reads its trigger obligation by
  binding, so renaming it touches one call site.
- An obligation definition carries zero copy and zero presentation
  identity, so nothing about how a field looks lives in the model
  (principle 6).
- The write surface is narrow. There is no `setScope` and no per-key
  delete anywhere in the stack ([`engine/write.js`](../engine/write.js)),
  so a page cannot hand-roll or bypass a scope-exit wipe — the wipe is
  correct by construction.
- Blast radius is low. Controllers own their own GET/POST and call shared
  helpers as a library, so a bug in one page's lifecycle stays in that
  page.

Two boot guards keep the spine honest, both wired in
[`routes.js`](../routes.js):

- the **coverage assertion** (`buildDispatch` in
  [`flow/dispatch.js`](../flow/dispatch.js)) — every non-system obligation
  at every depth is collected by exactly one page, or boot crashes.
- the **model-purity guard**
  ([`obligation-purity.js`](../obligation-purity.js)) — no obligation or
  domain entry may carry a display key (principle 6).

### Accepted costs

More files: one controller and one template per page instead of a generic
renderer. Real duplication risk across pages, mitigated but not eliminated
by the shared kit (principle 2). Each file is small and greppable, and
onboarding becomes "read the page you are changing".

---

## 2. Shared code is a library, not a framework

### Principle

Shared code returns facts and never renders. A helper may be called by a
controller; it may never own what renders. The loop primitive
`collectionView`
([`engine/evaluate/collection-view.js`](../engine/evaluate/collection-view.js))
emits structural facts only — `[{ index, path, entry, complete }]` — with
no hrefs, labels, copy, row view-models or templates. The shared kit
([`shared/kit.js`](../shared/kit.js)) provides only genuinely uniform
mechanical pieces: error-summary shape, date-input read, route glue. No
helper accepts a template name or field schema and renders it.

### Why

The moment a shared helper turns facts into govuk rows it becomes a
generic engine, and a generic engine is what page ownership exists to
avoid — a slot-expanding renderer cannot render a loop's add form, which
has no instance id yet. Nested collections are the hardest case: a
collection inside a collection is exactly where the pull to share a
renderer peaks. The line holds by having each loop compose its own rows
and copy over the same facts-only primitive.

### Accepted costs

Each repeating collection hand-builds its own rows. The line is held by
discipline and review, not by an abstraction. A loop is first-class
without a framework, at that price.

---

## 3. The model owns "what applies"; the flow owns "what comes next"

### Principle

Scope, wipe, completeness and status are questions about **data**, and
they live in the model and its state queries
([`model/obligations/state-queries.js`](../model/obligations/state-queries.js)).
Page sequence,
gating and the section roll-up are questions about **journey shape**, and
they live in the flow ([`flow/`](../flow/flow.js)). The flow reads the
model's facts downward; the model imports zero flow modules.

Two placements follow:

- **Dispatch lives in flow** ([`flow/dispatch.js`](../flow/dispatch.js)),
  because the model never names a page. Pages declare `collects`; boot
  inverts those declarations so the hub and check-your-answers can ask
  "which page owns obligation X" without the model knowing pages exist.
- **`readyForCheckYourAnswers` has a static flow default.** Submit readiness
  needs the dispatch index and task-row list — flow knowledge the model must
  not import. [`engine/readiness-config.js`](../engine/readiness-config.js)
  uses `flow/section-status.js`'s roll-up by default and exposes
  `configureReadyForCheckYourAnswers` only as a test override.

### Why

One dependency direction keeps the model pure and independently testable,
and keeps every flow decision a pure read of already-computed facts. The
section-status roll-up sits in
[`flow/section-status.js`](../flow/section-status.js) rather than the
model for the same reason: it needs the section list.

### Accepted costs

A boot-order contract remains for the dispatch build: it must run at plugin
registration before any request. Derived gates fail loud if consulted before
the index exists, so a violation is a startup crash, not a wrong answer.

---

## 4. Gates are derived by default

### Principle

A `gate` is a pure `(scope) => boolean` deciding whether a flow step is
reachable. A page or section with no authored gate is reachable exactly
when some obligation it collects is in scope, derived from the same
boot-built dispatch index the status roll-up reads
([`flow/gates.js`](../flow/gates.js)). An authored gate is the override
for flow-level facts the model cannot express. One override is live today:
the `review` section's submit-readiness gate
`(scope) => scope.readyForCheckYourAnswers`.

### Why

A hand-written gate that restates `inScope.has('<key>')` couples to the
model by a raw string. When that string drifts, a section's hub row is
rendered when it should not exist, or the section stays owed with no hub
row to reach it and submission deadlocks — submit readiness iterates
section statuses and ignores gates. Derivation makes "gate passes exactly
when section status is not Not applicable" true by construction rather than
by discipline, pinned over every enumerable scope state in
[`flow/gates.test.js`](../flow/gates.test.js).

`readyForCheckYourAnswers` is why the gate mechanism cannot be removed
entirely, only defaulted: it is a completeness roll-up over the answer
sections, not expressible in the model's gate vocabulary. It excludes the
`review` section itself to avoid a declaration circularity.

### Accepted costs

- A **two-tier rule**: "derived unless authored" is more to learn than
  "every gate is written where you can see it", and [`flow.js`](../flow/flow.js)
  alone does not answer "why is this section hidden".
- **Any-in-scope semantics are baked in.** A section mixing conditional
  and unconditional obligations derives an always-true gate; the author
  must reach for the override, at which point the restatement returns for
  that one case.
- **Boot order must fail loud.** `collectsOf` legitimately answers `[]`
  for a page that collects nothing, so an unbuilt index is
  indistinguishable from "nothing collected" and would silently gate every
  step out. The derivation refuses to answer before `buildDispatch()` has
  run.

---

## 5. One obligation, one page — and ownership at depth is derived

### Principle

Dispatch is a strict one-to-one reverse map. `buildDispatch` throws the
moment two pages declare the same obligation
([`flow/dispatch.js`](../flow/dispatch.js)). If several routes have a
reason to capture the same answer, they funnel into the one page that owns
it: many routes in, one page, one obligation owner, one Change target.

At depth, ownership is derived, not declared: a sub-obligation belongs to
the page that owns its nearest collection ancestor — a collection's items
are collected by the collection's loop.

### Why

The check-your-answers Change link (`pageOfObligation` in
[`features/check-answers/controller.js`](../features/check-answers/controller.js))
must send the user to exactly one target; shared ownership has no single
answer. Derived ownership at depth keeps the boot coverage assertion total
and unambiguous without every collection enumerating its item ids.

### Accepted costs

Per-field ownership at depth cannot be individually redirected: a new
sub-field inherits its collection's page rather than forcing an explicit
decision. A concession, not a breakage.

---

## 6. The model carries no types, options or display copy

### Principle

An obligation definition carries only identity (`id`), mandate
(`status`), structure (`within`, `requires`) and its scope closure
(`applyTo`) — see
[`model/obligations/obligations.js`](../model/obligations/obligations.js).
It carries no `type`, `pattern`, `min`, `max`, `maxLength`, `options`, or
any display key (`label`, `title`, `titleKey`, `hint`, `legend`,
`widget`).

The split of responsibilities:

- **Copy lives in the templates.** Field copy is in the `.njk` files that
  render each page.
- **Value options come from the MDM services.** The value-legality layer
  ([`model/domain/index.js`](../model/domain/index.js)) declares which
  values are legal, and its enum entries delegate their option lists to the
  reference-data services under [`services/`](../services/) (countries,
  ports, commodities, document types, certification purposes, import
  reasons, transport reference) — the same accessors the controllers call,
  returning codes only.
- **Field validation lives in the controllers**, backed by the reusable
  factories in [`lib/validate/`](../lib/validate/validators.js).

### Why

The same value may legitimately be validated differently in different
contexts, so validity is not a fact that can be stamped on an obligation.
What the status roll-up genuinely needs — "what is owed" — stays on the
definition as `status`, which is deliberately distinct from save-blocking
validation. Options delegated to MDM means the prototype shows the same
real option lists as production, from one source, with no duplicated list
to drift.

The rule is enforced at boot, not just in tests.
[`obligation-purity.js`](../obligation-purity.js) delegates to
[`model/no-display-keys.js`](../model/no-display-keys.js), which walks the
live obligation and domain object graphs and throws if any of the banned
display keys appears. A display key added to the model fails plugin
registration.

### Accepted costs

Model-level analysis
([`model/analysis/reachability.js`](../model/analysis/reachability.js))
can prove scope and completion-readiness but not input validity — judging
validity would need the controllers' field maps, and exposing those to the
model would re-couple the seams this principle separates.

---

## 7. The bridge is the only seam between model and frontend

### Principle

The frontend stores a user's data as a nested answers POJO
(`answers.commodityLines[0].animalIdentifiers[1]…`). The model evaluates a
flat fulfilments map keyed by obligation id. Controllers and templates
never touch the model's evaluator directly — they reach it through
the bridge modules
under [`bridge/`](../bridge/), which project the model's
per-obligation output into the `scope` / `status` / `wipe` views the
controllers consume:

- [`fulfilments.js`](../bridge/fulfilments.js) — converts nested answers ⇄
  flat fulfilments, passing values through unchanged except for numeric
  animal-count coercion.
- [`scope.js`](../bridge/scope.js) — `makeScopeFromB(answers)`,
  projecting each in-scope implication back into the answers path grammar.
- [`status.js`](../bridge/status.js) — the task and section status
  for the hub.
- [`purge.js`](../bridge/purge.js) — the set of paths a scope-exit
  destroys, feeding `engine/write.js`'s `destroyWiped`.
- [`collection-complete.js`](../bridge/collection-complete.js) —
  per-instance completeness for a collection row.

### Why

Keeping every model read behind one seam means the controllers depend on a
small, stable interface — a scope set, a status enum, a wipe set — rather
than on the evaluator's internal shape. The model stays swappable and
independently testable, and the frontend keeps its own storage grammar
without leaking positional-array knowledge into the model.

### Accepted costs

Two representations of the same data exist at once — the frontend's nested
store and the model's flat map — so the bridge carries the structural
conversion. That conversion is pure and centralised in
[`fulfilments.js`](../bridge/fulfilments.js), so the cost is one
well-tested module rather than translation scattered across controllers.
