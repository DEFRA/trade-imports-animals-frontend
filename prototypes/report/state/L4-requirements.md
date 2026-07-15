# L4 — Real-requirement lens

Grounded in the ruled requirement set: `spec/journey-spec.json`, `spec/conflicts.json`,
the Figma gap-register, journey-map, and the M3-PLAN §2.4 rulings log (all 12 conflicts
c-029..c-040 RULED). The question for each hard requirement is not "which model is nicer"
but "can B's obligations model express THIS ruled requirement, and can A's?" — with the
absence cited, not just the presence.

## Method note / two corrections to the standing claims

Reading both sources against the actual identifier requirement REFUTES two things the
per-dimension leads left implied:

1. **B expresses cross-frame conditionality natively.** The V4 identifier fields are gated
   on the ENCLOSING commodity line (`frame:enclosing`) and the unweaned/CPH fields on ANY
   line (`frame:anyItem`). B does both without ceremony:
   `allowListed(commodityCode, PASSPORT_COMMODITIES, unitRecord, […])`
   (obligations.js:636/646/656/666) is the enclosing frame with a projection group;
   `anyAllowListed(…)` (obligations.js:513, :549, with `reasons`) is the any-line frame.
   A does the same as DATA: `activatedBy {obligation, frame:"enclosing"|"anyItem", includes:[…]}`
   (spec:1593/1635/1669/1704 enclosing; :705-715 anyItem). Cross-frame is therefore
   **symmetric** — the asymmetry is introspectability (A's is invertible data, B's is a
   closure with partial metadata), NOT expressibility. Any "B can't do cross-frame" reading
   is wrong.

2. **A's closed vocabulary made it pay an engine tax B did not.** The two free-text fallback
   identifier fields must appear only when the enclosing commodity has NO typed identifier —
   a NEGATED cross-frame condition. B expressed it from day one as
   `allowListedByPredicate(…)` (obligations.js:685, :698), a different closure, zero engine
   change. A could not say it at all until it shipped a MODEL_EXTENDER increment (M3-0A) that
   added a new `notInUnionOf` operator to the closed interpreter (spec:1732, :1764;
   M3-PLAN M3-0A = "Negated cross-frame gating (model pre-req)"). That is the crux trade
   made concrete on a real requirement: A's closed data vocabulary needs an ENGINE edit per
   novel operator; B's open closures need none. It is also the exact price A pays for its
   invertibility win in the other direction.

Everything below is anchored on a ruled requirement, not on each model's marketing.

---

## A-only structural

### R1 — Collection cardinality cap (c-031: cap identifier records at the declared animal count)
Real requirement (c-031 RESOLVED, design wins): identifier records for a species are capped
at that species' `numberOfAnimalsQuantity`; counter UX "Enter details for {species} N of M";
an append past the cap is refused. A models this as a data key on the collection —
`maxEntriesFrom = numberOfAnimalsQuantity` — resolved per-line and enforced on the write path:
`collectionCapAt` (engine/evaluate/cardinality.js:20-31) reads the sibling count in the
collection's frame; `appendEntryAt` returns `null` at the cap (engine/write.js:23-24). B has
**no cardinality concept and no mutation primitive at all** — grep for
`maxEntries|cardinality|\.length >=` over B's obligations/evaluator returns nothing; every
write is imperative controller code in `lib/state.js` and the evaluator only ever PURGES. B
can at best report a violation after the fact; it cannot express a cap the model enforces at
mutation. To close it B must add a cardinality vocabulary AND a write/mutation primitive to a
model that has neither — a model-shape change. **structural=true, A-only.**

### R2 — Minimum-instance floor (≥1 commodity line; ≥1 identifier record per species at submit)
Real requirement: `commodityLines` `requiredAtLeastOne enforcedAt:submit` (spec:1293) and
`animalIdentifiers` `requiredAtLeastOne` per species (spec:1324; floor ruled per-species at
c-031). A carries `requiredAtLeastOne` as a first-class mandate key read by the completeness
walk and the classifier. B has **no minimum-instance verb** (collections-cardinality L2:
"B has no minimum-instance verb at all"; B's `requires.anyOf` is a group-invariant over
sibling FIELDS, not a floor of ≥1 INSTANCE). The consequence is a live defect: a B journey
with zero commodity lines contributes zero mandatory concerns and `journeyState` classifies
`fulfilled` — CYA prints ready-to-submit over an empty consignment. Closing it means adding a
minimum-cardinality mandate to B's obligation shape plus a classifier branch that reads it.
**structural=true, A-only.**

### R3 — File value with an externally-mutating virus-scan status (c-034: real ITAHC upload)
Real requirement (c-034 RESOLVED, real CDP-uploader upload adopted): per-document file upload
with asynchronous virus-scan status (PENDING/COMPLETE/REJECTED), REJECTED must be removed
before Continue, status survives across requests. A keeps this entirely outside the obligation
model (services/document-uploads, features/documents) and it works. B cannot host it: its
widget alphabet has no file input (`lib/field-widgets.js` union is radios|select|checkboxes|
date|input|address), and — the deeper blocker — B's evaluator is a pure TOTAL function over
user-authored fulfilments, which is the load-bearing assumption behind recompute-on-load. A
scan status mutates externally, between requests, with no user input; it cannot live in the
fulfilments map without breaking "fulfilments = user answers", and it cannot live outside it
without giving the total evaluator a second state source to merge — a change to the
evaluator's contract. **structural=true, A-only.** (A's own status here is imperative, not
declarative — but it is *possible*, which is the axis that matters.)

### R4 — Static export / introspection of every gate condition (stakeholder data-dictionary; reachability proof)
Not a page requirement but a programme one: the V4 field set is the expensive asset
(M3-PLAN §1), and it must be reviewable/diffable/portable to Java and to a spec export. A's
conditions are data over a closed 4-operator vocabulary (engine/evaluate/predicate.js:12-29),
so the whole gate graph is enumerable without executing it and A can invert a gate to prove
reachability (analysis/reachability.js, run as a test). B's conditions are closures; only the
`allowListed`/`anyAllowListed` family (~8 of 44) expose serialisable metadata, `branchedGate`
metadata omits the predicate (helpers.js:135-139), and the bare-arrow gates expose nothing.
B's own doc concedes "Nothing about the current shape is serialisable" and B killed the
declarative DSL that would fix it (GAPS.md:62-86). Closing it means replacing `applyTo` with a
data vocabulary — i.e. becoming A's model on this axis. **structural=true, A-only.** This is
the exact dual of R5.

---

## B-only structural

### R5 — A novel condition shape without an engine change (M3-0A negated cross-frame; any future V4 operator)
The dual of R4, and the one the real programme actually hit. When the fallback-identifier
negation arrived, B expressed it as one more closure (`allowListedByPredicate`,
obligations.js:685/:698) with no core change. A could not express it in its model as it stood
and had to ship a MODEL_EXTENDER increment adding a `notInUnionOf` operator to the interpreter
AND to the reachability witness-synthesiser (spec:1732; M3-PLAN M3-0A). The live-animals
regulatory rule set is a moving target (109-finding Figma gap register, "pending review by
Monica" on most identifier gates), so novel condition shapes are the norm, not the exception.
Every one costs A an engine edit across ≥3 interpreters that must move in lockstep
(predicate.js throws-loud, reachability.js gateValue fails-silent, any controller reading
`activatedBy` directly); B pays nothing. **structural=true, B-only.** Honest bound: adding a
single operator to A's 4-branch if-chain is additive, not a rewrite — the claim is "cannot
without an engine change", not "cannot".

### R6 — Two-level mandate with proceed-gate composition (mandatory-to-proceed that stands down when the field is conditionally optional)
Real requirement: V4 distinguishes "Mandatory to proceed" (`enforcedAt:continue`) from
"Mandatory to submit" (`enforcedAt:submit`), and `regionOfOriginCode` is literally
`mandateRaw: "Mandatory to proceed"` while ALSO being conditionally revealed (spec:598-604).
B declares proceed-mandate ONCE, flat, on the flow entry (`mandatoryToProceed`) and composes
it against current scope: `isSufficientForProceed` stands the gate down whenever the
obligation is currently optional (contract.js:315-322) — 13 enforced proceed-mandates, zero
restated conditions. A's equivalent key (`enforcedAt:'continue'`) is decorative on the
save-blocking question: it has one reader that only derives flow sequencing, and the actual
save-blocks are 4 hand-coded controller sites (mandate-model L2). A CAN carry the level as
data but does not derive enforcement from it; B does. **structural=false** (A could wire an
enforcement reader over its existing `enforcedAt` key — ~1 reader), **B-only** on the design
idea (the compose-with-scope split).

### R7 — Orthogonal retain-value-on-mandate-flip (field stays in scope, keeps its answer, flips mandatory↔optional)
`regionOfOriginCode` is the exact field: B models it as
`branchedGate({inScope:true,status:'mandatory',reasons},{inScope:true,status:'optional'})`
(obligations.js:193-196) — always visible, value retained, mandate flips. A's `required` is a
static boolean read with no access to answers (engine/evaluate/complete.js:54) and its only
conditional lever, `activatedBy`, is fused with `wipeOnExit:true` (spec:600-604) — so A's only
expression of "optional otherwise" DESTROYS the value. **structural=true, B-only** (A's fix is
a `statusWhen` axis + decoupling wipeOnExit from activatedBy — a change to every
obligations.js, status.js and complete.js). **BUT the requirement set does not cash it:** the
ruled spec chose the WIPE reading for this very field (`wipeOnExit:true`, spec:604), and the
ixd-canvas steer c-017 defaults `wipeOnExit=true` on EVERY activatedBy obligation ("delete
conditional data on change"). So B's orthogonal axis is expressiveness the V4 steer actively
argues against here — the same "unpaid-for" pattern as compound conditions. Recorded as a
real B-only capability; flagged as not-required-by-this-set.

---

## A-only, non-structural (capability present in A, absent-but-cheap in B)

### R8 — "Cannot start yet" prerequisite lock, distinct from "Not applicable" (c-035: keep the 5-tag GDS vocabulary)
Real requirement (c-035 RESOLVED): keep the full GDS tag set —
Completed / In progress / Not yet started / **Cannot start yet** / Optional — explicitly
because "the design's Complete/To do two-tag set cannot express gating". A derives a
"Cannot start yet" lock from prerequisite (`enforcedAt:'continue'` × flow position,
flow/prerequisites.js; features/hub CANNOT_START_STATUS) SEPARATELY from "Not applicable"
(out of scope). B collapses both into one `inScope` boolean; a blank B journey renders a
determinable-later row as "Not applicable" (status-tasklist L2, live defect). B has no status
value for "cannot start yet" and no prerequisite input distinct from scope.
**A-only; structural=false** (status-tasklist L2 prices it ~30 LOC additive into B, no
contract-shape change) — but the CAPABILITY is absent in B today and it is an explicitly ruled
requirement.

### R9 — Scope-exit WIPE actually applied to storage (ixd-canvas "delete conditional data on change"; c-017)
Real requirement: on changing a determining answer, the dependent conditional data is DELETED
(journey-spec sources id `delete-conditional-data-on-change`; c-017 defaults wipeOnExit=true).
A derives the wipe and PERSISTS it — one site (lib/path.js), written through on commit
(write.js). B computes the same purge (`purgeStorage` → `amendedFulfilments`) and then throws
it away: `readState` renders it and never writes it back (session-state L2), so an out-of-scope
answer rots in session and keeps driving OTHER obligations' scope on every later request. So
on the single state behaviour the requirement names, B's running system does the opposite of
its own spec. **A-only; structural=false** (one-line fix: write the amended map back). Note the
requirement's delete-on-change steer is exactly A's fused conditional⇒wiped model — the V4 set
wants deletion, not retention (see R7).

### R10 — Same-page conditional reveal (region-code input revealed on the origin page when region = Yes)
Real requirement (design 01-05): the region-of-origin-code input reveals inline on the SAME
origin page when the yes/no answer is Yes. A renders it as a govuk conditional reveal
(features/origin/template.njk, the one conditional in the prototype) and stays safe because
the engine wipes off-gate values on write. B computes field scope once, server-side, at GET
time and drops out-of-scope fields from the HTML entirely (contract.js + build-field-descriptors);
it has no client-side evaluator and no self-POST-and-re-render, so a gate answered on the same
page cannot bring a field into that page's scope. **A-only; structural=false** (a11y L2: B's
evaluator is pure/sync/dependency-free, so bundling it client-side or adding a self-POST is
cheap; B also answers this design need differently via branchedGate = always-show,
conditionally-mandate).

---

## Symmetric / both-lack (recorded to stop false asymmetries)

### R11 — Cross-frame conditionality (enclosing + anyItem)
Both express it declaratively; see Method note 1. A: data literals
(spec:1593/1635/1669/1704 enclosing, :705-715 anyItem). B: `allowListed(…, unitRecord, …)`
(obligations.js:636/646/656/666) and `anyAllowListed(…)` (:513/:549). **direction neither,
structural=false.** The only difference is introspectability (covered by R4/R5), not whether
the requirement can be stated.

### R12 — Arithmetic / count-comparison gate (c-031 count-drop block: lowering a count below existing records must block with a named-species error)
Neither model expresses the arithmetic in-model. A's vocabulary is closed with no arithmetic
operator, so the count-drop rule LEFT the model and is hand-coded in the consignment-details
controller (mandate/evaluation-engine L2). B's closures COULD compute the comparison, but B
has no submit path and no mutation site at which to enforce a cardinality decision (see R1),
so it too would hand-code it. So: A cannot express the CONDITION in-model (would need a
`greaterThan` operator = engine edit — the dual again); B could express the condition but has
nowhere to ENFORCE it. **direction neither** (both hand-code on the real requirement);
recorded because it is where R1 (A's enforcement site) and R5 (B's condition freedom) cross —
the third option needs BOTH B's arithmetic-capable condition AND A's write-time enforcement
site.

---

## Shopping list for the third option (from this lens)

Take from A: `maxEntriesFrom` cardinality link + write-time enforcement (R1), `requiredAtLeastOne`
minimum-instance floor (R2), a file/document value kind kept OUTSIDE the total evaluator (R3),
data-shaped invertible gate conditions (R4/R11), persisted scope-exit wipe (R9), the
scope-vs-prerequisite split that yields "Cannot start yet" (R8), same-page reveal (R10).
Take from B: closure escape hatch for novel/negated operators so a new V4 rule needs no engine
edit (R5) — BUT gated behind mandatory serialisable metadata so R4 survives; `isSufficientForProceed`
proceed-gate composition (R6); orthogonal inScope/status axis (R7) — available but default it to
wipe, because the V4 steer is delete-on-change. The count-drop rule (R12) proves the two must
combine: B's arithmetic-capable condition feeding A's write-time enforcement site.
