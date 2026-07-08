# Architecture decisions

Short records of the decisions that shaped this spike. Each entry gives the
context, the decision, why it won, and the costs we accepted. For the
current architecture itself, start at the [index](README.md).

Every decision here was made through an adversarial process: 3 architects
proposed designs from different angles, 3 judges scored them, and skeptic
passes stress-tested the result before each verdict landed.

---

## 1. Pages are the spine

### Context

v1 made a config engine the spine: a UUID-keyed obligation catalogue plus a
`flow.json` tree that owned every page's copy, rendered through one generic
template. In practice the generic renderer failed on every page that
mattered. The commodities loop, the check-your-answers rows, the declaration
and the hub all dropped out of config into hand-written bypasses. The
clearest proof: a loop's add form has no id yet, so a slot-expanding
renderer cannot render it at all. The config engine paid off only on the
boring pages.

Three candidate architectures were designed and judged for v2:

- **page-spine** — pages are the spine; each controller declares what it
  `collects`; boot inverts that into a dispatch index; smallest state layer
- **model-dispatch** — the obligation model is the spine and carries a page
  pointer per definition; a `definePage` factory drives GET/POST
- **registry-seam** — a central registry holds the obligation-to-page
  binding; pages call a shared `handle` helper

### Decision

Page-spine won, unanimously across all three judging lenses (fidelity,
simplicity, implementability). Each page is an ordinary Hapi GET/POST pair
with its own template, copy, validation and view-model. What survives from
v1 is a thin declarative obligation model and a pure engine that answers
two questions only: what data is in scope, and is it satisfied.

### Why

- It is the only candidate whose activation rule is a pure **data literal
  over a real JS reference** —
  `{ obligation: regionOfOriginCodeRequirement, equals: 'yes' }`
  reads like data, with no UUID ceremony.
- It is the only candidate with **zero copy and zero presentation identity**
  on an obligation definition.
- Its **narrow write surface** makes the Yes-No-Yes scope-exit wipe correct
  by construction. There is no `setScope` and no per-key delete anywhere in
  the stack ([`engine/write.js`](../engine/write.js)), so a page physically
  cannot hand-roll or bypass a wipe.
- **Lowest blast radius.** Controllers own their own GET/POST and call
  shared helpers as a library. model-dispatch's page factory meant one bug
  in the lifecycle would break many pages at once.

The losers were not discarded whole. Their best ideas were grafted in and
now live as boot guards in [`routes.js`](../routes.js):

- the **coverage assertion** (`buildDispatch` in
  [`flow/dispatch.js`](../flow/dispatch.js)) — every non-system obligation
  at every depth is collected by exactly one page, or boot crashes
- the **model-purity guard**
  ([`obligation-purity.js`](../obligation-purity.js)) — every feature's
  `obligations.js` may import only another feature's `obligations.js`
- the `required` vs save-blocking split, and identity minted on append
  (instances are a pure function of array length — no id ledger, no orphans)

### Accepted costs

More files: one controller and one template per page instead of one
renderer and two config files. Real duplication risk across pages,
mitigated but not eliminated by the shared kit (decision 2). Both were
accepted knowingly — each file is small and greppable, and onboarding
becomes "read the page you are changing".

---

## 2. Shared code is a library, not a framework

### Context

The hazard of a page-owned spine is boilerplate multiplied across every
page. The wrong cure is a config engine that calls the pages back — the
exact design v2 exists to avoid.

### Decision

Shared code **returns facts and never renders**. A helper may be called by
a controller; it may never own what renders. The loop primitive
`collectionView`
([`engine/evaluate/collection-view.js`](../engine/evaluate/collection-view.js))
emits structural facts only — `[{ index, path, entry, complete }]` — with
no hrefs, labels, copy, row view-models or templates. The shared kit
([`shared/kit.js`](../shared/kit.js)) provides only genuinely uniform
mechanical pieces (error summary shape, date-input read, route glue); no
helper accepts a template name or field schema and renders it.

### Why

The moment a shared helper turns facts into govuk rows, it has become the
rejected generic engine under a new name. The nested-collections work (the
car drivers each owning their own claims, depth 2) was the deliberate stress
test: the loop-inside-a-loop is exactly where the pressure to share a renderer
peaks. The line held — but it held by **accepting per-loop bespoke
duplication**, each loop composing its own rows and copy over the same
facts-only primitive. That depth-2 carrier was removed with the named-driver
section (inc-025); the engine still supports the loop-inside-a-loop and M2's
`animalIdentifiers` restores a live one (see [limits.md](limits.md)). The
surviving commodities and documents lists hold the same line at depth 1. A
shared row-builder was considered and rejected: it is the rejected design
re-emerging.

### Accepted costs

Each repeating collection hand-builds its own rows. The line is held by
discipline and review, not by a new abstraction — the honest answer to
"can a loop be first-class without a framework" is yes, at that price.

---

## 3. Gates are derived by default

### Context

A `gate` is a pure `(scope) => boolean` deciding whether a flow step is
reachable. An investigation (T0, 2026-07-07) catalogued the five
hand-authored gates and found that four were bare `inScope.has('<key>')`
restatements of the obligation model, coupled to it by a raw string —
the one cross-file link in the codebase left as a string coincidence.

Divergence between a gate and the model is not benign. A stale key leaves
a section's hub row rendered when it should not exist (a ghost
Not applicable row), or worse: the section stays owed with no hub row to
reach it, and submission deadlocks, because submit readiness iterates
section **statuses** and ignores gates. The rename hazard had already
fired once — a design doc's gate listing rotted when a key was re-pointed.

### Decision

Delete the four hand gates. A page or section with no authored `gate` is
reachable exactly when some obligation it collects is in scope, derived
from the same boot-built dispatch index the status roll-up reads
([`flow/gates.js`](../flow/gates.js)). An authored `gate` remains
available as the override for flow-level facts the model cannot express.
At the time of this decision one existed: `get-your-quote`'s
submit-readiness gate. It went with the quote feature in
inc-028; the override's one live use today is the `review` section's
submit-readiness gate `(scope) => scope.readyForCheckYourAnswers` (RULE 2).

### Why

Derivation makes "gate passes exactly when section status is not Not applicable"
true **by construction** instead of by discipline. That equivalence is
pinned exhaustively over every enumerable scope state in
[`flow/gates.test.js`](../flow/gates.test.js), holding prerequisites
satisfied. The default derived gate later gained a second clause — RULE 1
flow sequencing, which reads whether earlier `enforcedAt: 'continue'`
obligations are answered — so the reachability prover's soundness
assumption (every gate is a pure read of computed scope) no longer holds
by construction; the prover compensates by riding a submit-ready base
journey (see [analysis.md](analysis.md)).

`readyForCheckYourAnswers` is the hard counterexample to collapsing gates
entirely: it is a completeness roll-up over the answer sections, not
expressible in the model's three-operator vocabulary. The gate mechanism
therefore cannot be removed — only defaulted. (The roll-up outlived the
quote section that inc-028 removed; it is now the submit-readiness gate
consulted by `submitJourney` and by the `review` section's authored gate,
and excludes the `review` section to avoid a declaration circularity.)

### Accepted costs

- A **two-tier rule**: "derived unless authored" is more to learn than
  "every gate is written where you can see it", and `flow.js` alone no
  longer answers "why is this section hidden".
- **Any-in-scope semantics are baked in.** A future section mixing
  conditional and unconditional obligations derives an always-true gate;
  the author must reach for the override, at which point the restatement
  returns for that one case.
- **Boot order must fail loud.** `collectsOf` legitimately answers `[]`
  for a page that collects nothing, so an unbuilt index is
  indistinguishable from "nothing collected" and would silently gate every
  step out. The derivation refuses to answer before `buildDispatch()` has
  run, mirroring `configureReadyForCheckYourAnswers`'s throwing default.

---

## 4. The model owns "what applies"; the flow owns "what comes next"

### Context

Scope, wipe, completeness and status are questions about **data**. Page
sequence, gating and the section roll-up are questions about **journey
shape**. v1 entangled both in one engine.

### Decision

The engine ([`engine/`](../engine/index.js)) owns what data applies. It
imports zero `flow/` modules. The flow ([`flow/`](../flow/flow.js)) owns
what page comes next, and reads the engine's facts downward — never the
reverse.

Two placements follow from this rule:

- **Dispatch lives in flow** ([`flow/dispatch.js`](../flow/dispatch.js)),
  because the model never names a page. Pages declare `collects`; boot
  inverts those declarations so the hub and check-your-answers can ask
  "which page owns obligation X" without the model knowing pages exist.
- **`readyForCheckYourAnswers` is boot-injected.** Submit readiness needs the
  dispatch index and the section list — flow knowledge the engine must not
  import. The flow hands the function down at boot via
  `configureReadyForCheckYourAnswers` ([`engine/read.js`](../engine/read.js));
  the unconfigured default throws loudly rather than returning a silent wrong
  answer.

### Why

One dependency direction keeps the engine pure and independently testable,
and keeps every flow decision a pure read of already-computed facts. The
section-status roll-up sits in [`flow/section-status.js`](../flow/section-status.js)
rather than the engine for the same reason: it needs the section list.

### Accepted costs

A boot-order contract: the injection (and the dispatch build) must run at
plugin registration, before any request. Both seams fail loud if consulted
early, so a violation is a startup crash, not a wrong answer.

---

## 5. One obligation, one page — and ownership at depth is derived

### Context

Could one obligation legitimately be captured by two different pages?
The state layer would not care: a value is a value, and scope, wipe and
status key off the answers map, never the writing page. But the
check-your-answers "Change" link must send the user somewhere — it needs
exactly one target.

### Decision

Dispatch is a strict one-to-one reverse map. `buildDispatch` throws the
moment two pages declare the same obligation
([`flow/dispatch.js`](../flow/dispatch.js)). If two routes have a reason
to capture the same answer, they funnel into the one page that owns it:
**many routes in, one page, one obligation owner, one Change target.**

At depth, ownership is **derived, not declared**: a sub-obligation belongs
to the page that owns its nearest collection ancestor — a collection's
items are collected by the collection's loop.

### Why

The Change link (`pageOfObligation` in
[`features/check-answers/controller.js`](../features/check-answers/controller.js))
has no single answer under shared ownership. Derived ownership at depth
keeps the boot coverage assertion total and unambiguous without every
collection enumerating its item ids.

### Accepted costs

Per-field ownership at depth cannot be individually redirected: a new
sub-field silently inherits its collection's page rather than forcing an
explicit decision. Recorded as a concession, not a breakage.

---

## 6. Obligation definitions carry no types, options or copy (resolved)

### Context

The original v2 model stamped each definition with `type`, `pattern`,
`min`, `max`, `maxLength`, `options` and `saveBlocking`. A review steer
challenged this as validation and presentation living in the model.

### Decision

All of it was removed after a usage trace confirmed no runtime code read
any of these fields — every widget and value-domain was already declared
literally in the page templates and controllers, so the model copies were
dead duplicates of presentation. A definition now carries only identity
(`id`), mandate facts (`required`, `requiredAtLeastOne`), structural facts
(`collection`, `item`, `system`, `renderOnly`) and relationships
(`activatedBy`, `wipeOnExit`) — see
[`features/commodities/obligations.js`](../features/commodities/obligations.js).
Validation moved to the controllers, backed by the reusable factories in
[`lib/validate/`](../lib/validate/validators.js).

### Why

The same value may legitimately be validated differently in different
contexts, so validity cannot be a fact stamped on the obligation. What the
status roll-up genuinely needs — "what is owed" — stays on the definition
as `required`, which is deliberately distinct from save-blocking
validation.

### Status

Resolved, not a live risk. The purity boot guard and the narrow
definition shape prevent the fields growing back. The one traded cost is
recorded on [`analysis/reachability.js`](../analysis/reachability.js):
model-level analysis can prove scope and completion-readiness, but not
input validity — judging validity would need the controllers' field maps,
and exposing those to the model would re-couple the seams this decision
separated.
