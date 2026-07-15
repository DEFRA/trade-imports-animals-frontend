# Two obligation models for the DEFRA live-animals journey — a structural comparison

**Scope.** Two independently-built prototypes of the same live-animals import-notification
journey, on two branches of `DEFRA/trade-imports-animals-frontend` that diverged at `16e391f`
and share no history since. **Side A ("live-animals", Sam's)** — `clone-live-animals`, HEAD
`b6ac2ed`, at `prototypes/standalone/live-animals/`. **Side B ("flow-layer", Paul Hodgson's)**
— `clone-flow-layer`, HEAD `d59b432`, at `prototypes/journey-config-spikes/EUDPA-249-flow-layer/`
(plus a frozen ancestor at `prototypes/model-spikes/obligations-v4-model/`).

This report is the long-form argument and audit trail behind the one-page decision matrix
(`MATRIX.md`). Every claim below has been through an adversarial verification pass; where an
earlier reading was refuted or amended, the report states the **corrected** position and, where
a reader would naturally believe the wrong version, spends a line killing it explicitly.

---

## 1. Executive summary

**Neither model is a superset of the other, and the honest answer is a third option — but if
forced to name a base, build on B's model and port A's vocabulary into it, because B's
retrofit bill is a principle and A's is a rewrite.**

B wins the majority of dimensions on the *quality of the model itself*: evaluation semantics,
collections/cardinality, validation-as-data, status/task-list derivation, presentation-widget
derivation, i18n, docs-extensibility, accessibility-derivation, and code-shape/decoupling. A wins
**no dimension outright** — but it wins one structural *property* that no dimension verdict grants
it: **static analysability**. Its gate conditions are a closed four-operator data vocabulary
(`engine/evaluate/predicate.js:12-29`), which is what lets it *invert* a gate and prove
reachability (`analysis/reachability.js`, 215 LOC, run as a test). B structurally cannot build that
today, because ~47% of its real gates are closures whose predicate is withheld even from its own
metadata sidecar (`obligations/helpers.js:135-139`). (Disambiguation, because the two granularities
are easy to conflate: at *dimension* level the tally is 8 B-better / 8 mixed / 0 A-better; at
*capability* level three A-only structural capabilities and three B-only structural capabilities
survived. "A wins one thing outright" refers to the analysability property, which cuts across
dimensions rather than winning any one of them.)

The standing prior ("B is better, possibly in every respect") is therefore **CONFIRMED on
model quality and REFUTED on analysability, mandate-vocabulary expressiveness, and per-path
conditionality.** The three A-only structural capabilities that survived adversarial testing:
(1) statically-invertible gates + a reachability prover; (2) per-collection-entry conditional
mandate with `enclosing`/`anyItem` frames — "required on horse lines, not cattle lines" is a
data literal in A and *inexpressible* in B, whose group-scoped record status is the static
`obligation.status` (`evaluator.js:477/490/505`); (3) a durable, first-class empty collection
instance. Three B-only structural capabilities survived: (1) cross-field/compound/quantified
gate conditions; (2) a co-derived `{inScope, status}` Decision that expresses "always visible,
retained, optional-until-X-then-mandatory" (`obligations.js:190-198`), which A's static
`required` boolean cannot; (3) a value-domain layer that makes gates compare locale-invariant
codes and drives widget/validation/CYA from one declaration.

**Crucially, A's greater completeness is not quality.** A build loop was pointed at A: it has
two notification mappers, Mongo parity, cdp-uploader upload, amend-and-resubmit, and a large
E2E suite. B is a ~33k-line model spike with 232 LOC of session storage and no persistence,
mapper, submit, or upload. On every dimension where that breadth showed up, it was disqualified
and scored on the model only.

**The third option** is B's evaluator + domain layer + flow/presents tree + i18n registry, with
A's `activatedBy` data vocabulary ported into it under **one non-negotiable rule: every gate
must carry complete `dependsOn` metadata (fail the build otherwise)**, so A's reachability prover
survives while B keeps closure expressiveness for the genuinely hard gates. That single ~30-LOC
discipline — the highest value-per-line item in the whole comparison — buys A's analysability at
5% of A's cost, and neither side has it today.

---

## 2. The two architectures side by side

### 2.1 Side A — "obligations-v2 page-owned spine"

An obligation in A is a **closure-free plain object** drawn from an 11-key vocabulary
(`docs/obligation-model.md:36`): `id, required, requiredAtLeastOne, requiredOneOf, collection,
item, system, renderOnly, activatedBy, wipeOnExit, maxEntriesFrom` (plus `enforcedAt`, a 12th
key the doc's "whole vocabulary" table forgets). There is **deliberately no type, no copy, no
widget choice and no validation on an obligation** (`docs/obligation-model.md:36-42`), and this
is enforced at boot — `assertObligationPurity()` (`engine/obligation-purity.js:19-46`) refuses to
start the server if a `features/*/obligations.js` imports anything presentational. A real example
(`features/origin/obligations.js:12-17`):

```js
export const regionOfOriginCode = {
  id: 'regionOfOriginCode',
  required: true,
  activatedBy: { obligation: regionOfOriginCodeRequirement, equals: 'yes' },
  wipeOnExit: true,
}
```

Conditionality is **data**: `activatedBy` names one obligation, one of four operators
(`equals`, `includes`, `notInUnionOf`, `present`), and one of three frame modes (same-frame,
`enclosing`, `anyItem`), interpreted in one place (`engine/evaluate/predicate.js:12-29`, which
throws on an unknown operator). Because the condition is data, A can **invert** it to synthesise
a witness value and prove every obligation is reachable in some state
(`analysis/reachability.js:36-47, 184-215`). Presentation is hand-authored: ~145 `govuk*` macro
call sites across 32 `.njk` templates (1,499 LOC), one CYA controller of 495 LOC with 33
hand-built rows, and 1,278 LOC of bespoke collection-loop controllers. The engine core is small
(reconcile/complete/status/predicate ~ a few hundred LOC); the surrounding app is large.

### 2.2 Side B — "obligations-v4 evaluator"

An obligation in B is a plain literal `{id, name, within?, status?, applyTo?, requires?}` where
`id` is an opaque UUID and `name` is the deliberately-renameable code identifier
(`obligations.md:2068-2073`). Scope, mandate, records and reasons are **not** on the obligation —
they are **computed by a pure evaluator** (`obligations/evaluator.js`), `evaluate(fulfilments) ->
{fulfilments, obligations}`. A real example (`obligations/obligations.js:190-198`), the
"retain-value" pattern A cannot express:

```js
export const regionCode = {
  id: '…uuid…', name: 'regionCode', within: undefined, status: 'mandatory',
  applyTo: branchedGate(
    (f) => f[regionCodeRequirement.id] === 'yes',
    { inScope: true, status: 'mandatory', reasons: [...] },   // whenTrue
    { inScope: true, status: 'optional' }),                    // whenFalse — stays visible, keeps value
}
```

Conditionality is **code**: `applyTo` is an arbitrary JS closure over the whole fulfilments map,
so B expresses conjunction, disjunction, arithmetic and quantifiers for free — at the cost that
only 8 of 44 gates are fully JSON-recoverable (`branchedGate` metadata withholds the predicate,
`helpers.js:135-139`). Presentation is **derived**: a widget is chosen in exactly one place from
the domain entry's `type` plus the state-resolved option count
(`lib/field-widgets.js:337`, single call site `lib/build-field-descriptors.js:84`); 8 templates
(299 LOC) serve all 31 pages; copy is 362 externalised i18n keys (`locales/en.json`) with a
build-time coverage gate. A separate 40-entry **domain registry keyed by obligation id**
(`domain/index.js:1150-1194`) declares each field's value legality and labels together.

### 2.3 The numbers

| | Side A | Side B |
|---|---|---|
| Obligations | ~44 live (49 in dead spec) | 44 |
| Pages | 20 flow pages | 31 (35 flow entries) |
| Model-layer LOC | small engine, ~3,100 LOC services/persistence/mappers | model ~51% of source † |
| Presentation LOC | 32 `.njk` / 1,499 + 1,278 collection controllers | 8 `.njk` / 299 |
| Tests | ~526 unit + 33 Playwright | ~566 unit + 2 Playwright walks |
| Persistence | 2 mappers, Mongo parity, cdp-uploader, amend | 232 LOC @hapi/yar session, none |
| i18n | 0 keys | 362 keys + coverage gate |
| Dead weight | 6 dormant spikes | frozen ancestor 7,087 LOC (byte-identical evaluator dup) |

**† Do not read the 6.9%-vs-51% model-share as a quality signal.** The ratio is not
apples-to-apples: A's denominator is inflated by ~3,133 LOC of services/persistence/mappers/uploads
that B simply never built. Cite the *mechanism* (A's Set-shaped scope + hand-authored presentation
vs B's per-instance projection + derived presentation), not the percentage — the percentage is
partly a breadth artefact.

**Do not credit A with data-shapedness on the strength of `spec/journey-spec.json`** (2,014
lines, labels/widgets/values). It is DEAD — exactly one reference in the whole tree, a prose
mention at `PROVENANCE.md:11`. Everything it knows is thrown away and hand-re-typed.

---

## 3. Dimension by dimension

### 3.1 Obligation vocabulary — MIXED
A is a **closed data vocabulary with an interpreter** (12-key literal, 4 operators x 3 frames,
15/15 gates readable by a non-JS runtime, ~320 LOC). B is an **open code vocabulary with a
convention** (6-key literal but 38/44 carry an `applyTo` closure; 8/44 gates fully
JSON-recoverable; ~3,710 LOC). The prior is REFUTED on two counts and CONFIRMED on one.
**REFUTED (A wins):** A's full conditionality is dumpable and B's is not and cannot be —
`branchedGate` omits the predicate from its own metadata (`helpers.js:135-139`) and 19
obligations are bare closures with no metadata; B's own doc concedes "Nothing about the current
shape is serialisable" (`obligations.md:761-768`). A can statically prove reachability by
inverting a gate; you can only invert a gate that is data. **CONFIRMED (B wins):** A cannot say
any conjunction/disjunction; A's one numeric rule left the model and is hand-coded
(`consignment-details.controller.js:126-132`); A's `required` is a static boolean
(`complete.js:54`) so it cannot express the retain-value flip B does with `{inScope, status}`.

Two debunks that stop breadth masquerading as quality: A's rich JSON spec is dead (above); and
**B's most common obligation shape is code because of a BUG, not a design choice** — a naive top-
level data-only `{id, name, status}` throws a TypeError because `evaluator.js:471` dereferences
`obligation.within.id` unconditionally. *Correction to that debunk (L3):* the natural data-only
shape is actually the **empty record** `{id, name}`, which works and defaults to mandatory; the
deref bug blocks only the always-in-scope **optional** scalar (1 obligation). Fixing the classifier
so the 18 redundant `status:'mandatory'` closures can be deleted would lift B's introspectable
share from 14/44 to ~32/44 with zero engine change — cheap, and the reason not to treat B's
opacity as fundamental.

**Do not repeat:** "A cannot express `A=x AND B=y` because frame resolution is a gate property"
(OV-4) — REFUTED. Frame travels *with each reference* (`predicate.js:38`), so `allOf`/`anyOf`/`not`
is a 3-line prepend to `evalPredicate`, and A already absorbed a larger change (the frame vocabulary
itself) in its history. The residual truth is that A cannot conjoin two *independent* always-in-
scope obligations without an engine edit; B can.

### 3.2 Evaluation engine — B-better (narrowly)
A's headline claims do not survive source. Its monotone least-fixpoint loop
(`reconcile.js:11-30`) does **not** give chained-gate semantics — `evalPredicate` never sees
`inScope` — so A and B are broken *identically* on chained gates (EE-1). *But not equally*: A's
commit pipeline (`write.js:11-18`) drains one chain link per write and **converges**; B's purge
is a read-time projection never written back (`lib/state.js:42-44`), so B never converges and a
stale gater value drives other obligations' scope forever. The live defect is latent on both
(activation depth is 1 today). What remains is one clean asymmetry each: **B wins expressiveness**
(A's 4-operator first-match vocabulary cannot say `(X AND Y) OR n>50`, and A's escape hatch expels
the rule from the model, corrupting `inScope`/`wiped`/`statusOf` and A's own prover); **A wins
static analysability** (invertible data gates -> the reachability prover, which B structurally
cannot build). B is also better tested (228 evaluator tests to A's 40; every pipeline stage an
exported pure function; docs that match the code vs three doc/code contradictions on A). Both
share the biggest defect — hypothetical-instance blindness — and both leaked a second gate
evaluator into a controller because of it.

**Do not repeat:** "B structurally cannot replicate A's prover" as an absolute (EE-3) — REFUTED as
*structural*: every branchedGate predicate is a single-field equals/includes/present already in
A's vocabulary, and B declares finite `staticEnum` domains A lacks entirely. It is a *build* gap
plus an *enforcement* gap, not an expressive wall — but it is real today.

### 3.3 Conditionality & gating — MIXED
Decomposed into four parts: **(1) condition language — A wins structurally** (data literal,
invertible, portable; only 8/44 of B's conditions are machine-readable). **(2) consequence
language — B wins structurally** (`{inScope, status, records, reasons}` — four axes; A derives
only `inScope`, and `required` is static, so "always visible, optional-until-X" is inexpressible).
**(3) reveal — B wins on discipline** (one descriptor list drives GET and POST; 7 of A's 8 in-page
render paths hand-roll the predicate — but nothing in A's *model* prevents `scope.has()` at all
eight, so this is realised drift, not a structural gap). **(4) wipe — A wins** (derived, one site,
persisted; B's is a discarded read-time projection). The reframing finding: **every one of B's 19
gates fits A's closed vocabulary, and A's own spec has zero compound conditions** — so B paid
introspection, static analysis and portability for expressiveness *this requirement set never
cashes*. Third option: "A's conditions with B's consequences."

### 3.4 Mandate model — MIXED (half-refuted prior)
The dimension splits and each side built one half. **B wins PROCEED** decisively on one design
idea: mandate lives in two layers (obligation = completion, flow = proceed) and
`isSufficientForProceed` composes them (`contract.js:315-322`), so a flow declares
`mandatoryToProceed: true` flat and the model stands the gate down when the obligation is
currently optional — 13 enforced proceed-mandates, zero restated conditions. A's equivalent
(`enforcedAt:'continue'`) is decorative on save-blocking: one reader derives flow sequencing,
while the actual save-blocks are 4 hand-coded controller sites. **A wins COMPLETION** decisively:
its conditional mandate is evaluated **per path** — per collection entry, with `enclosing` and
`anyItem` frames — so "required on horse lines, not cattle lines" is a data literal; B cannot
express it, because for anything `within` a group the record status is the static
`obligation.status` and the `applyTo`-returned status is silently discarded
(`evaluator.js:477/490/505`). In a domain made of per-commodity-line rules, that is the more
dangerous hole. A also has a collection floor (`requiredAtLeastOne`); B has no minimum-instance
verb, so a zero-line B journey classifies `fulfilled`. Conversely B enforces its proceed mandate
but has **no submit at all**; A's submit gate is real and server-side (`engine/write.js:89-95`).
Third option: A's completion vocabulary + B's proceed layer + B's `groupErrorCount` error lists.

**Do not repeat:** "A has a conditional mandate and B has neither per-path conditionality nor
retain" (mandate C5) — REFUTED both ways. A has conditional *scope*, not conditional *mandate*
(`required` is static); and B *does* have per-entry cross-frame conditionality on the exact rules
cited (`allowListed`/`anyAllowListed`). The true residue: B has no per-obligation opt-out from
scope-exit purge; A retains-nowhere in practice (15/15 `activatedBy` carry `wipeOnExit`).

### 3.5 Collections & cardinality — B-better
B wins on **identity** (stable, never-recycled string keys vs A's positional array index),
**status** (`containerStatus` re-derived over the flow subtree, free), **group invariants**
(`requires.anyOf` + `groupInvariantErrors` folded into the classifier), and the biggest practical
delta — a **declarative page-fan** (`presentsForEach`, 25 LOC driving 12 of 35 pages) where A has
no fan primitive and 1,278 LOC of bespoke loop controllers. Scorecard: B 5, A 3, ties 3. Both of
A's headline boasts fail on source: collection FACETS patch a hole B does not have, and
`maxEntriesFrom` is MAX-only, single-carrier, one-directional with its inverse hand-coded. A holds
two genuinely structural cards: **a collection item can exist with no data**, and **cardinality
exists at all**. The asymmetry that is the finding: A->B is ~80 LOC additive; **B->A is a
storage-contract rewrite that also destroys A's persistence mappers.** Third option: B's spine
(`within` + composite keys + `presentsForEach` + `containerStatus` + `requires`) with A's
cardinality vocabulary ported into `requires`, and B's instance-existence hole closed first.

### 3.6 Validation & errors — B-better (narrowly)
Neither side is "declarative validation" — both write value rules in JS. The difference is which
layer made them *data* and whether rules are *addressable*. B's rules are entries in a 40-row Map
keyed by obligation id (`domain/index.js:1150-1194`), which buys the coverage gate, the whitelist
gate, and the i18n-coverage gate that turns "added a field, forgot the copy" into a red build. A's
rules are arguments to Joi factories inside controller-local closures, so nothing can answer "what
rules apply to `internalReferenceNumber`?" B externalises 100% of error copy; A has ~54 hand-typed
English literals. **B is not clean:** a live WCAG defect (blank required address -> dead summary
anchor `#commercialTransporter`, `shared/partials/fields.njk:26-40`); no submit gate; a cross-field
`siblingValue` primitive with zero users. What pulls the verdict toward mixed: A holds three things
B structurally cannot express — a rule vocabulary liftable to JSON, errors anchored to something
*other* than an obligation (virus scans, a search box), and validation that can do I/O. The
deciding asymmetry: **A's retrofit bill is a rewrite; B's is a principle.**

**At-least-one-of-N group mandate ("enter at least one identifier").** This rule — distinct from
the collection *floor* (`requiredAtLeastOne` = at least one entry) — is where both sides show their
worst wiring, and it favours neither cleanly. **A expresses it twice and the copies have already
diverged**: the model declares `requiredOneOf: ANIMAL_IDENTIFIER_GROUP` (interpreted for hub
completeness at `complete.js:15-21`, emits no message and blocks nothing), and a controller then
re-lists the same six obligations by hand for a *weaker, non-equivalent* predicate with hand-typed
copy (`animal-identification.controller.js:481-486`) — reachable today: a full address with no
identifier on commodity `01061900` saves cleanly yet is judged incomplete by the engine, with no
error at the point of save. **B expresses it once** via a dedicated group-invariant primitive
(`unitRecord.requires = {anyOf:[...six], errorCode}` at `obligations.js:563-594`, evaluated by
`groupInvariantErrors` at `engine/index.js:512-539` returning a per-instance *reason list*, not a
bare boolean) — the better shape — **but enforces it at neither save nor submit**: the invariant
feeds only container status and a CYA prompt, and the declared `errorCode` is dead outside tests.
The transferable win is B's one-declaration group-invariant + a message key, with every enforcement
point (save, hub, submit, CYA) reading that one evaluator — which neither side has today.

**Do not repeat:** "A's rule vocabulary is liftable to data and B's is not, ever" (VE-6) —
REFUTED, and *inverted*. B's `.metadata` combinators are lossless data for 27 of 39 gates; the 12
residuals are all inside A's four operators. And B actually *loads* declarative validation data
(`ADDRESS_SUB_FIELD_RULES` + `addressBlock` interpreter, 9 call sites) while A's spec has drifted
(`"equals":"Yes"` vs code `'yes'`) and is imported by nothing.

### 3.7 Flow & navigation — MIXED (prior refuted on the sharpest sub-question)
B's forward-navigation primitive is a strict *specialisation* of A's: both walk a declared order
and skip inapplicable pages, but B additionally skips any Fulfilled/Optional page, and
`firstUnfulfilledPage` is the *only* next-page source (`contract.js:115-127`). So any page that is
complete, optional, or presents no obligation is unaddressable by B's walk *by construction* —
which is why B cannot sequence its own content/review/confirmation pages through the walk. A's
model can express B's primitive; B's cannot express A's. Both L1 reads over-credited B: "page
skipping rides obligation scope" is present identically on both sides (`flow/gates.js:17-19` ==
`engine/index.js:387-389`). Model-level scorecard: A wins next-page generality, prerequisite
locking, sequencing non-obligation pages, and durable wipe; B wins flow-declaration shape (one
tree vs A's four hand-authored orderings), instance-scoped pages, and route generation.
Page-visibility derivation and back-links are ties. Neither is adoptable whole; **Option C is B's
declaration under A's walk.**

**Check-your-answers `?change=1` round-trip.** A named demanded topic, and one of A's genuine (if
build-state) wins with a clean asymmetry. A implements the whole round-trip at the kit layer —
`changeContext`/`withChangeContext`/`exitTarget` with explicit precedence (hub-exit > change
context > next-in-section, `shared/kit.js:47-63`), change hrefs derived over the boot-built inverted
dispatch index, unit-tested and **E2E-proven through PRG collection loops** at
`live-animals.spec.js:2537-2591` (Change -> identification surface -> `change=1` survives
Save-and-add-another -> Save-and-finish -> back on CYA). B's *outbound* Change link is real and
derived (`changeLinkFor` -> `firstPagePresentingObligation`), but the **return** half is entirely
unwired: `obligations.md:2338` documents `?change=1` returning the user to CYA in present tense,
yet a whole-tree grep for `change=1|query.change|returnTo` hits only that doc line; the seam is a
single never-called stub (`urlForNext(target, opts)` accepts `opts.query` at
`lib/page-controller.js:27-30`, no caller passes it). So Change -> edit -> Save dumps the user on
the next unfulfilled page, losing their place. This is **not** a model-capability asymmetry — B's
model does not obstruct it; the cost is threading the context through B's three near-identical
page-controller factories (the fix must be applied three times, four at depth-3), which is the real
and only genuinely asymmetric asset here.

### 3.8 Status & task-list — B-better
Both derive status and store nothing (no `visited`/`complete`/`status` in session); both self-heal
on resume. Decided on what the derivation can express and how many places you touch. B wins: (1)
B splits one collection across two hub rows for free from `presents` where A needs ~40 LOC of facet
machinery *to repair a wound it inflicted on itself* (`buildDispatch` throws if two pages claim one
obligation, so A's second page over `commodityLines` owns nothing); (2) B has a mandate axis A
structurally lacks (`branchedGate` flips mandatory<->optional keeping the value); (3) one spine vs
three (B's task list IS the flow tree; A hand-maintains 10 sections + 11 rows + 6 groups with no
boot assert linking them). A genuinely wins two: `requiredAtLeastOne` (B's absence is a LIVE defect
— zero lines => `fulfilled` + ready-to-submit CYA) and separating scope from prerequisite (B renders
"Not applicable" where the truth is "not yet determined"). Both A wins are ~8 and ~30 LOC additive
into B; taking B's model into A means deleting the two rules A's flow layer is built on. **A needs
a dispatch rewrite to take B's model; B needs ~40 LOC to take A's.**

**Status-value granularity (optional vs not-applicable vs not-yet-determined).** Both models carry
distinct `OPTIONAL` and `NOT_APPLICABLE` status values, so the plain optional-vs-NA contrast is a
tie. The real split is one level down: A separates *scope* (`activatedBy` -> reconcile) from
*prerequisite* (`enforcedAt:'continue'` -> `flow/prerequisites.js`) and renders a sixth,
presentation-only `CANNOT_START_STATUS` with no href; B collapses both into one `inScope` boolean,
so on a blank journey B's hub prints "County Parish Holding — Not applicable" when the truth is "not
yet determined" (`cph`'s gate has no commodity code to allow-list yet). A distinguishes "never
applies" from "not unlocked yet"; B cannot.

### 3.9 Presentation & widgets — B-better (the model, not the build)
A derives zero widgets: its 11-key vocabulary has no presentational key and every widget is a
hand-authored macro call. B chooses a widget in one place from `type` + state-resolved option
count. The knockout: **A already contains a hand-rolled, single-use copy of B's best mechanism** (a
two-way `kind` switch over a descriptor array for the 9 address fields) — it reinvented B's
`addressBlock`, worse, in one corner, while its model declares the whole address as one opaque id.
B also has a real i18n layer; A has none. Two honest bounds: B's rule table has met only the easy
half (5 view types to A's 9; no file/table/task-list/autocomplete rule; zero client JS), so a third
option must assume it needs an escape hatch B has not proven; and **B's sharpest defect is a model
defect** — value multiplicity has no slot in the type alphabet and lives as a 3-name hard-coded Set
in the presentation layer, from which a *rendering* decision silently determines the *persisted*
value shape (`contract.js:331-335`).

### 3.10 i18n & copy — B-better (decisively, and it is the model)
A is at zero (0 locale files, 0 keys, 0 resolver). B has `lib/i18n.js`, 362 keys, and a build-time
coverage gate. **But "B built it and A didn't" is not why B wins** — that would be the breadth error.
B wins because its model has a *seam* A's does not: B declares a field's value domain (codes) and
its display copy (message keys) in **one place** (`staticEnum(OPTIONS, {labels})`), and gates
compare locale-invariant codes (`obligations.js:283`). A's obligation carries no type/options/copy
*by explicit decision*, so there is no site where code and label meet, and A's gates compare English
display strings (`transport/obligations.js:22`). Same journey — one is translatable, one is not.

**Do not repeat:** "A's model CANNOT gate on the code behind the label" (i18n C4/L1-A) — REFUTED. A
already gates on codes at 2 sites and `obligation-purity.js:13-17` permits reference-data-service
imports. The label-gating is a *data-modelling choice entangled with a byte-exact wire contract*
(`notification-mapper.js:451` + `skeleton-equivalence.test.js`), expensive and wrong but MECHANICAL,
not structural. B is also weaker than its docs: no Welsh, no plurals ("Select no more than 1 items"
ships), 18/362 keys used-but-ungated.

### 3.11 Persistence & mapping — MIXED (prior refuted)
A's breadth is disqualified up front. Scored on the models: **neither carries any backend binding**
(0/44 both sides), so a 44-entry mapping table is hand-authored either way — the "derive the mapper"
prize is unclaimed. Where the models differ, A is ahead more often: A's durable key is a semantic
id (greppable in Mongo) where B's is an opaque UUID with a renameable `name` — and B cannot have
both self-describing documents and rename freedom. B's real wins (three-way coverage gate,
declarative `within` nesting, active unknown-id drop) are all portable into A **without adopting
B's model**, which is why `bOnly` is empty. A's worst defect is a model consequence: no field-level
type/path means the mapper has no coverage gate and a by-the-book field is silently dropped in real
mode — and B's `coverage.test.js` is the exact fix.

**Lifecycle / amend-after-submit — the model finding, not the feature.** A's breadth here (freeze,
amend-and-resubmit, a status field) is disqualified as build-state. The model-level fact is that
**neither obligations model expresses lifecycle or status** — A's status lives in a persistence
*port* (`engine/persistence/records.js`), not on the obligation; B has no lifecycle and, more
fundamentally, **no journey identity at all** (`grep journeyId|referenceNumber` over B -> zero
hits), so a B "status field" would hang on nothing — the retrofit is invent-the-document (identity +
minting + index + store), an additive *layer*, not a field. This is not a structural block on B
(its evaluator is provenance-blind, and it already declares two system-populated non-user-authored
obligations), but it is unbuilt in every part.

**Lossy vs lossless mapping.** A's two mappers compose, and Mapper A (the default, legacy-skeleton
target) is **deliberately lossy**: prototype-only "gap" obligations are dropped across a full
round-trip, pinned by test (`notification-mapper.test.js:293-323`, `expect('documents' in
notification).toBe(false)`). B has no mapper at all, so it is neither lossy nor lossless — but its
`coverage.test.js` three-way gate (mapped / explicitly-allow-listed-with-a-reason / red build) is
exactly the discipline that would make a future mapper's lossiness *declared* rather than silent —
which is A's actual defect (a by-the-book field is dropped in real mode with no test going red).

**Do not repeat:** three refuted claims here. (PM-2) "A's durable doc is keyed by semantic id, so
B's UUID split can't be retrofitted" — REFUTED: A's durable store is the *backend notification*,
not the answers map; A's 507-LOC mapper IS the translation table the claim says A doesn't need.
(PM-3) "B structurally cannot express a file value because of evaluator purity" — REFUTED: B already
declares two system-populated non-user-authored obligations, and A doesn't model the file either
(uploadId is a smuggled undeclared key). (PM-5) "recompute-on-load is B's unique asset" — REFUTED:
A has it, pinned by `engine/resume-self-heal.test.js`.

### 3.12 Session & state — MIXED
B wins the state **shape**: a flat map keyed by an opaque UUID, `/`-delimited composite keys for
depth-N, closed over the model (unknown ids dropped on read). A wins the **write path** and wins the
one thing both models *claim*: scope-exit purge. Both market it as derived; A applies it to storage
(`destroyWiped`, `write.js:14-16`), **B does not** — `purgeStorage` produces an amended map the
evaluator returns, `readState` renders it and throws it away, and every mutator re-reads raw yar.
The consequence is not cosmetic: `applyTo` runs pre-purge on raw storage, so a value the model
believes purged keeps driving other obligations' scope forever, and no test flips a gate back. On
the single state behaviour B's model actually specifies, **B's running system does the opposite of
its own spec.** A's win is architectural: its ports expose no per-key delete surface, so a page
*physically cannot* hand-roll a delete. Concurrency is 0-0: both clobber two tabs silently.

**Do not repeat:** four refuted SS claims — (SS-3) "A's ports make hand-rolled delete impossible"
(whole-map replace IS delete-by-omission; pages already hand-roll deletes); (SS-5) "re-keying A is a
live Mongo migration" (the durable store is the backend notification, zero persisted bytes change);
(SS-6) "drop-unknown is blocked in A" (real mode already round-trips through the manifest-shaped
mapper and drops them).

### 3.13 Testing strategy — MIXED
B's *model* is more testable (it can express model->rendered-widget conformance, which A structurally
cannot without putting `type` on the obligation); A's *suite* guards the shared seam better (A
asserts obligation-totality at boot and crashes; B gates it only for depth-1 commodity leaves, and
because `journeyState` walks the flow tree not the manifest, a mandatory in-scope obligation that is
never `presents`-ed is simply absent — no status, no page, zero of B's 566 tests fire). Both are
semantics-first (zero snapshots), both fail identically on instrumentation (`coverage.include:
['src/**/*.js']` on both, so the ~33k prototype lines are invisible to both vitest and SonarCloud).
A's larger Playwright surface is build-state, not model quality.

### 3.14 Docs & extensibility — B-better
Headline probe (add a conditionally-required field to an existing page): B is 5 files / 11-12 sites,
**all declarative**; A is 8-11 files / ~16 sites, of which one is a model fact. The raw counts are
close (a trap): A's edits scale with the *presentation surface* (per field, forever); B's scale with
the *declaration surface* and amortise. A's own docs concede it (`docs/limits.md:74`). The prior is
REFUTED on the one axis a third option most needs: A's gates are 100% closed-vocabulary data and
therefore statically diffable; B's are Turing-complete closures of which 8/39 are introspectable.
The two sides are data-shaped in complementary halves — **A: gates=data, presentation=code; B:
gates=code, presentation=data.** Third option: B's derivation chain + A's `activatedBy` vocabulary.

### 3.15 Accessibility / no-JS / progressive enhancement — B-better (the model)
Both work no-JS; neither tests it; neither has axe/pa11y/Lighthouse wired at the prototype (both
inherit an unused Lighthouse harness pointed at legacy routes). The dimension turns on *where*
accessibility lives. In A it lives only in templates, enforced at boot (the purity guard); A's model
can never say anything about a label, hint, widget or autocomplete token. In B, presentation is
derived, so adding autocomplete to every field or switching date to `govukDateInput` is one rule
edit. A's genuine wins — no-JS cdp-uploader upload with a `?attempt=N` scan-refresh link, and a
paginated searchable address picker with no client JS — are the strongest no-JS artefacts in either
clone, but they are **code, not model** (`DESIGN-DELTA.md` mentions JS/a11y/PE zero times). B's
delivered a11y is wrong in places (free-text date, no `isPageHeading` on any page) but
*systematically* wrong and therefore systematically fixable.

**Do not repeat:** "A's purity guard structurally forbids presentational data on the obligation"
(a11y C1, presentation L1-A) — REFUTED: the guard is a regex over *import specifiers*, never inspects
a key, permits `services/*/index.js`, and A already ships a live field-widget dispatch renderer in
`_identification-card.njk`. And "off-gate safety is matched-and-bettered by B" (a11y C3) — REFUTED:
B's purge never touches storage, so off-gate values resurrect; A destroys them.

### 3.16 Code shape — B-better
On the named axis — coupling, purity, standalone-library-ness — B wins and it is not close. B's
model has ZERO `@hapi` imports and a manifest-injected evaluator; A threads hapi's `(request, h)`
through **10 of its 13** facade exports (3 are pure — corrected down from the L2 "7 of 10"
undercount, per C1) and imports the web mount path into the engine. On the "5 module-level mutable
globals" charge, note that 3 of the 5 are legitimate setter-injection *ports*
(`configureRecords`/`configureSession`/`configureReadyForCheckYourAnswers`) that throw when
unconfigured — they are the mechanism that keeps A's engine framework-agnostic, not an anti-pattern.
**But the win carries a carve-out that inverts L1-A:** A's `activatedBy` is DATA
one substitution from JSON; B's `applyTo` is a FUNCTION, only ~20% statically exportable — **both
non-serialisable, and B is the worse of the two.** The real finding is a considered trade: A's
closed vocabulary buys static analysability and costs expressiveness; B's open closures buy
expressiveness and cost analysability. **The third option can have both for ~30 LOC** (mandatory
`dependsOn` metadata on every gate) — the highest-value item on the shopping list.

**Do not repeat:** "A's engine cannot be used without a hapi request" (code-shape C1) — REFUTED: A's
`engine/` dereferences `request` in exactly one guarded place; it runs headless in ~20 test files and
in `analysis/simulate.js`. B's `lib/state.js` is *more* hapi-coupled (8 raw `request.yar` sites, no
port). And "A duplicates rules -> wrong answers; B duplicates only plumbing" (C4) — REFUTED: B
hand-rolls a second partial gate interpreter twice (`pickSeedObligationForLine`,
`lineHasWiredUnitObligation`) that silently `continue`s on unhandled gate shapes and has already
shipped wrong answers twice, per B's own docs.

---

## 4. Capability & edge-case matrix — the structural asymmetries

See `MATRIX.md` for the full grid. The findings that matter are the **structural** asymmetries —
capabilities one side covers that the other *cannot express without a model-shape change* (as
opposed to merely hasn't built). After adversarial verification, these survived:

**Edge-case lens (follow-up pass, provenance note).** The capability findings below and in
`MATRIX.md` originally rested on three L4 lenses (requirements, model-power, production). A fourth
**edge-case lens** — re-gate at CYA, a collection emptied below its floor, a gate flipped with a
value already in storage, deep-link/Back-button into an unreachable page, JS off, duplicates
(`state/L4-edge-cases.md`) — stalled when the deliverables were first written and was run and
adversarially verified afterwards. **It surfaced no new structural asymmetry beyond the six above.**
Its one structural *candidate* — "an empty required collection reading submit-ready is an A-only
**structural** capability" — was **AMENDED back down** on verification: the floor has a natural home
in B's *existing* `requires` invariant bag (a new `minInstances` data key + a ~3-line `records.length`
branch in the existing `groupInvariantErrors` dispatch, which already reaches an empty collection via
`presentsForEach` group discovery and already forces NOT-FULFILLED), so it stays a **filed live defect
with a cheap in-hook fix, not a model-shape wall** — matching the standing finding; do not re-elevate
it. The count-drop *shrink* is likewise a facet of the already-listed **cardinality cap** (not a new
capability): even A pushes the shrink out of the model into imperative controller code
(`consignment-details.controller.js:122-145`), so option C should model the cap **bidirectionally**
rather than copy A's append-only form. What the lens *did* confirm: the two live B defects in §7
(sharpened there), and four **non-structural, merely-unbuilt** edge capabilities, none of which move a
dimension verdict — CYA `?change=1` change-and-return (A; ~30 LOC across B's three page controllers),
a whole-journey deep-link entry guard (A; partly scope, entangled with A's import-type service
routing), amend-after-submit that re-gates a section (A; build-state — a lifecycle port, not a model
change), and a per-instance URL entry-guard for a forged line/unit deep-link (B; A can add for ~20 LOC
via `makeScope().has(pathKey())`). A pair of joints came out *symmetric* and are recorded so option C
does not credit a false asymmetry: a deep-link into a gated **static** page is unguarded on both (B
hard-guards per-instance pages but not static ones), and JS-off conditional-field safety holds on both
by opposite mechanisms (A's rides its server-side wipe; B's rides never-rendering the field).

**A-only, structural:**
1. **Statically-invertible gates + reachability proof.** A synthesises a witness value per operator
   and proves every obligation is reachable (`analysis/reachability.js:36-47`). B cannot: inverting
   `branchedGate(predicate,...)` is inverting arbitrary JS (undecidable in general), and B withholds
   the predicate from its own metadata. To close, B must re-become A on this axis (the declarative
   `gatedBy` DSL it built and deliberately killed, `GAPS.md:62-86`) — or adopt mandatory `dependsOn`
   metadata, which recovers most of it cheaply.
2. **Per-collection-entry conditional mandate** with `enclosing`/`anyItem` frames. B's group-scoped
   record status is the static `obligation.status`; the `applyTo`-returned status is discarded
   (`evaluator.js:477/490/505`). To close, B must widen `buildImplication`'s three record branches to
   honour per-record status — the evaluator's return contract + the helper library + 5-6 readers.
3. **A durable, first-class empty collection instance** (the *durability guarantee* is structural;
   the *fix* is additive — do not skim this as a clean model-shape win). B infers instance existence
   from descendant storage-key prefixes (`evaluator.js:390-421`), so an all-blank instance exists
   only as a seed placeholder that a scope-purge can annihilate — A's array entry is durable and
   first-class, which is the structural difference. But B *ships* an empty instance today via that
   seed, and closing the durability gap is ~10-15 **additive** LOC (union the group's own keys into
   the enumerator + write a real marker), not a storage-shape rewrite. Real gap, cheaply closable —
   which is why it sits below the other two A-only capabilities in retrofit priority.

**B-only, structural:**
1. **Cross-field / compound / arithmetic / quantified gate conditions.** `applyTo` is arbitrary JS;
   A's `applyPredicate` is a closed 4-operator if-chain that throws on unknown. A's one numeric rule
   left the model. To close, A extends the grammar *plus* a per-operator witness synthesiser in the
   prover, or the reachability pin goes vacuously green.
2. **Co-derived `{inScope, status}` — retain-value-while-optional and retain-while-hidden.** A's
   `required` is a static boolean and its only conditional lever fuses scope with `wipeOnExit`, so A
   can express neither B's "visible+retained+optional" nor its dual. To close, A widens `reconcile`'s
   return type to carry a derived status and decouples `wipeOnExit` from `activatedBy` — a new axis on
   the engine's Decision.
3. **A model value-domain** that makes gates compare codes and drives widget/validation/CYA/copy from
   one declaration. A carries no type/options/copy by written decision, and has 0 LOC of derivation
   layer. To close, A adds a value-domain slot + a descriptor layer + reverses `decisions.md #6`.

**The reciprocity is the whole point:** B's expressiveness is precisely what destroys its
introspectability; A's introspectability is precisely what caps its expressiveness. They are duals.

**Requirement-set caveat (do not skip):** the ruled V4/Figma set (`spec/conflicts.json`,
M3-PLAN §2.4) *does not cash* B's retain-value capability — `regionOfOriginCode` is ruled
`wipeOnExit: true` (delete on change, c-017), which argues *for* A's fused model. Conversely the set
*is made of* per-commodity-line rules, which cash A's per-path mandate hard. And the count-drop rule
(c-031) is expressible in-model by **neither** side: A lacks the arithmetic operator; B lacks a
mutation/submit site to enforce a cardinality decision. The third option needs both halves.

---

## 5. Retrofit analysis — both directions, costed

### 5.1 Could B's obligations model be dropped into A's app?
This is the direction the evidence favours as the base. It is **mostly additive, with a few genuinely
hard items and one that is a rewrite.**

**Additive / cheap (do these):**
- `reasons: [{code, explanation}]` on every decision — A has zero explainability; doubles as an i18n
  key surface.
- A value-domain layer keyed by obligation id (B's `domain/index.js`) — kills A's triplicated,
  unchecked value domains; highest value-per-line item.
- `.metadata` sidecar + `readsFrom`/`reasons` convention; `coverage.test.js` whitelist discipline.
- Orthogonal `inScope` + `status` axes (a new key + a branch in `complete.js` + decoupling
  `wipeOnExit`) — unlocks the retain-value flip A cannot do.

**What breaks (load-bearing in A that a naive port destroys):**
- **A's reachability prover.** The moment a gate is a closure, `gateValue` (`reachability.js:36-47`)
  cannot invert it and `proveReachability` goes **vacuously green** — worse than failing. Closures
  must be an *exception* with a build-time guard: fail the build if a gate lacks `dependsOn` metadata.
- Every new operator A adds carries a second tax: a witness synthesiser in `gateValue` and a seeding
  rule in `scaffoldFor`. Skip it and the pin silently stops proving anything.
- **B is a source of SEMANTICS, not FORMAT.** B's serialisability cannot be adopted — there is none
  (18% of gates; `within`/`requires.anyOf` are object references).
- Do **not** import B's `pathPrefix` projection as-is (`helpers.js:212-215`) — it slices at the first
  slash, so an intermediate-level gate mis-scopes and the purge **deletes the user's data**.

**Before anything, fix `evaluator.js:469-472`** — the unconditional `obligation.within.id` deref is
why the natural data-only shape throws and why 19 obligations are closures. Cheapest, highest-leverage
change in the comparison.

### 5.2 Could A's obligations model be dropped into B's app?
Harder, because it means **re-authoring, not converting.** A data-shaped operator core cannot be
*converted* into B — B's 36 non-introspectable gates have no data form to recover; the condition IS
the function body. Getting B to 100% data means rebuilding the `gatedBy` DSL B already shipped through
steps 4-5 and **deliberately killed on five reasoned grounds** (`GAPS.md:62-86`). **Anyone proposing
a JSON/JSONLogic gate DSL is re-litigating a decision B took with evidence** — but note what A proves
against that rejection: a *closed, small* (4-operator) data vocabulary plus a controller escape hatch
DOES work for ~15 gates and buys static analysis B can never otherwise have.

**Cheap A->B ports that need no model change:**
- `notInUnionOf` as a derived-union helper over B's `.metadata.values` — ~5 LOC, and STRICTLY better
  than B's hand-restated four-whitelist complement (`obligations.js:674-678`), which silently
  double-gates if you add a fifth typed identifier and forget a conjunct.
- A's boot-time page-coverage assert (`flow/dispatch.js:55-63`) over B's `presents` — closes B's
  silent-invisibility failure mode; ~20-40 LOC; nothing breaks.
- The collection floor (`requiredAtLeastOne` -> `requires.minEntries`) — ~8 LOC into
  `groupInvariantErrors`; closes a LIVE defect (zero-line journey reads `fulfilled`).
- ★ **Mandatory `dependsOn` metadata on every gate** — ~30 LOC + one assertion in the coverage test
  (which already has the right shape). Recovers the statically-recoverable dependency graph B cannot
  have today, **without giving up closures.** The third option's actual reason to exist.

**Save-and-return (draft-resume) is a model gap on both sides, build-state only on A.** Neither
obligations model expresses a draft or a return point; A *has* drafts, multi-draft dashboard and
resume-by-reference, but as build-state (a persistence layer), and B has no journey identity, no
draft record and no submit route at all. So "take A's save-and-return" means taking A's persistence
layer wholesale — there is no model-level save-and-return to port because there is none to port.

**What A has that B has no answer for and must survive any retrofit:** the reference-data service
seam (MDM); the persisted wire contract (V4 display labels, byte-exact skeleton pin — B has no
persistence layer and therefore no answer at all); the file/upload value kind (the single hardest
item in either direction — a change to B's core evaluator contract, not an additive widget); and A's
two **model-agnostic parity harnesses** (`skeleton-equivalence.test.js` is an executable oracle that
would work against B's mapper the day one exists).

### 5.3 The cost asymmetry, stated plainly
A->B is a **storage-contract rewrite** wherever it touches collections, and re-authoring wherever it
touches gates. B->A is **additive** almost everywhere, with two hard exceptions (the prover must be
protected by a metadata guard; the per-record status contract is a genuine evaluator change). **That
asymmetry — A's retrofit bill is a rewrite, B's is a principle — is the report's central practical
finding.**

---

## 6. Risks & unknowns

- **Requirement volatility.** The rulings c-029..c-040 are settled but the build has not started;
  a later ruling that reintroduces retain-value-while-optional at scale would swing the mandate
  dimension toward B, and a ruling for count/arithmetic rules would harden B's expressiveness win.
- **The prover's real coverage.** A's reachability prover is *semi-derived* — its outer state space
  is hand-authored (`reachability.js:8-20`), so it proves less than "every state" (for-all obligation
  exists-state, first witness only). Whether it scales to a larger gate graph without hand-maintenance
  is untested. Settle by growing the manifest and measuring.
- **B's rule table on hard pages.** B's widget derivation has met only the easy half of the page
  population (5 view types, no file/table/autocomplete, zero client JS). Whether the "one rule per
  widget" claim holds for upload + scan-poll + address-picker is unproven. Settle by building one
  hard page in B.
- **Concurrency.** 0-0 today and unmeasured under real two-tab load on either side.
- **Coverage is blind on both.** ~33k lines invisible to vitest and SonarCloud
  (`coverage.include: ['src/**/*.js']`); no side's true line coverage is known. One-line fix each.
- **MATRIX.md** is the companion one-page grid (dimension verdicts + full structural-asymmetry
  inventory + refuted-claims quick-reference). This prose is canonical where the two disagree.

---

## 7. Where each side is demonstrably wrong

**Side A — bugs and doc/code disagreements:**
- `reconcile.js:11-30` least-fixpoint does NOT implement chained-gate semantics, but
  `docs/scope-and-wipe.md:33-37` claims it does. Latent (activation depth 1).
- `docs/limits.md:16` + `docs/obligation-model.md:277-281` say `entryComplete` cannot resolve
  enclosing gates — it has since inc-035 (`complete.js:35-41`). `docs/limits.md:54-56` says no
  controller calls the update path — `consignment-details.controller.js:178` does.
- `collectionView` calls `entryComplete` with no ctx (`collection-view.js:15`), so three completeness
  resolvers can disagree about the same entry (dormant — no consumer reads `.complete`).
- `docs/add-a-collection.md:254-260` still headlines "the model cannot express cross-frame
  conditionality" — shipped since inc-031. `docs/validation.md:71-78` misdescribes A's save-blocking
  surface four ways. `README.md:5` still says "car-insurance journey".
- `flow/task-rows.js` (a mandatory edit per new page) is in no recipe. The `flow -> taskRows` link is
  **not** unguarded (contra an earlier reading): `task-rows.test.js:236-318` is a cross-spine
  equivalence assert over 14 fixtures that catches a page added to `flow.js` with a *required*
  obligation but forgotten in `task-rows.js`. The genuine holes are narrower — (a) a page carrying
  only *optional* obligations lands in the `PASSING` fixture and slips through; (b) the `taskRows ->
  GROUPS` link is guarded by nothing, so a row present in `task-rows.js` but missing from `GROUPS`
  renders nowhere while still gating submit via `readyForCheckYourAnswers` — an invisible blocker.
- The spec drift: `spec/journey-spec.json:600-603` gates on `"equals":"Yes"` while code uses `'yes'`
  — harmless only because nothing loads the spec.

**Side B — bugs and doc/code disagreements:**
- **Purge is never persisted** (`lib/state.js:42-44`): out-of-scope answers resurrect on gate flip-
  back, contradicting `obligations.md:245/659-661` ("actively cleared") and `obligations.js:210-212`.
  The single highest-priority fix before B gets any persistence layer. **Sharper than resurrection
  (edge lens EC2):** because `applyTo` runs at step 3 on the *pre-purge* `recognisedFulfilments`
  (`obligations/evaluator.js:60-84,:288`) while `readState` renders and discards the purged view
  (`lib/state.js:42-44`), a logically-deleted answer keeps driving *other* obligations' gates on
  every request with **no reload** — sequence: answer gate G + dependent D → change G (D untouched in
  raw yar) → every other gate reading D still sees the stale value this request → change G back → D
  resurfaces pre-filled. So the fix is two-part — persist `amendedFulfilments` on write AND reorder
  `applyTo` to run post-purge (non-trivial: the pre-purge enumeration feeds B's cross-level gates) —
  not the oft-quoted 5-LOC write-back alone.
- **`branchedGate` metadata omits the predicate** (`helpers.js:135-139`) while the doc advertises
  "static introspection / cross-language export" — unmet for 9 of 19 real gates.
- **Value multiplicity is a rendering decision that sets the persisted shape**
  (`contract.js:331-335`): renaming a `species`-style obligation silently downgrades a checkbox group
  to a scalar, and `routes.test.js:961` (titled "renders one checkbox group") never asserts
  `type="checkbox"`, so the suite stays green. `obligations.md:2075` "cosmetic renames are safe" is
  false.
- **No minimum-instance floor** (edge lens EC3): zero commodity lines => `journeyState` returns
  `fulfilled` and CYA prints ready-to-submit — `expandPresents` yields 0 entries for 0 records
  (`engine/index.js:258-270`), `groupInvariantErrors` iterates per *existing* instance and returns
  `[]` for 0 records (`index.js:512-539`), and `classifyEntries` with 0 entries + 0 group errors
  collapses to NA (`index.js:387-409`). No `requiredAtLeastOne`/`minInstances`/floor verb exists
  anywhere in B; the only test of that state pins a hub-local imperative patch, not `journeyState`.
- **The contract seam does not hold**: the enforcement grep documented in three files
  (`RECOMMENDATION.md:347`, `obligations.md:1888`, `NEXT.md:121`) has a false negative for the
  two-directory-deep feature-controller import form and already returns violations run verbatim; 9
  real violations go uncaught, no lint rule, no test.
- **`obligations.md:1801-1812` claims submission is blocked on CYA** — there is no POST route, no
  submit button, no `submitted` flag. `obligations.md:2749` claims the failure code doubles as the
  message key — no code is ever passed to `t()`.
- **Frozen ancestor**: `prototypes/model-spikes/obligations-v4-model/` is 7,087 LOC (21% of B)
  containing a **byte-identical duplicate `evaluator.js`** and a second ~3,000-line `obligations.md`.
  Any future evaluator fix has two homes; delete it (keep only `GAPS.md`).

**Decisions that will not survive the real requirement set:** A's no-type/no-copy axiom collides with
the statutory Welsh requirement (i18n is a ~1,145-site retrofit for A vs a day for B); B's
missing-floor and never-persisted-purge collide with a real submit; and B's UUID-vs-semantic-key
choice collides with debuggable production Mongo documents (it cannot have both rename-freedom and
self-describing storage).

---

*Audit trail: `state/L0-*` inventories, `state/L1-<dim>-<side>.md` deep reads,
`state/L2-<dim>.md` comparisons, `state/L3-*.md` refutations, `state/L4-*.md` asymmetry hunts.
Companion grid: `MATRIX.md`.*
