# L3-asym-16 — Serialise conditionality to data / recover dependency graph / render data dictionary

**Claim under test (A-only):** B structurally CANNOT serialise the whole conditionality to
data (export gates to JSON / another language / a diffable authoring artefact), recover the
obligation dependency graph, or render a stakeholder data dictionary — not without changing
its model.

**Direction:** A-only (A modelled-declaratively, B claimed absent/structurally-blocked).

**Verdict: AMENDED.** The claim bundles three sub-capabilities with *different* structural
status. One arm is genuinely B-structural; the other two are not — one is already built and
running in B, the other is a ~30 LOC metadata addition that keeps closures. The specific
"~80% of gates" figure is wrong, and it is wrong because it imports the condition-value
non-readability number to justify a dependency-edge claim.

---

## What I attacked and what I found

### The capability is three things, not one. Split them.

| Arm | Structural for B? | Evidence |
|---|---|---|
| **(4.2) Serialise the WHOLE conditionality — round-trip through JSON / port to another language / non-programmer authoring tool** | **YES — confirmed** | ≥11 gates are genuine closures; the killed DSL is the only data form |
| **(4.3a) Recover the obligation dependency graph** | **NO — refuted** | 10/19 conditional gates expose `metadata.obligation` today; the 9 that don't are trivial single-obligation reads, fixable in ~30 LOC with no engine change |
| **(4.3b) Render a stakeholder data dictionary** | **NO — refuted** | B already ships `data-dictionary-sketch.js` — a running, JSON-emitting dictionary |

### 1. FIND THE MECHANISM — B already has the data dictionary

`data-dictionary-sketch.js` is not a sketch of an absent thing; it is a working
`buildDictionary()` that walks the manifest and emits per-obligation JSON:

- `data-dictionary-sketch.js:65-78` — `buildDictionary()` returns
  `{ obligations: [{ id, name, within, scope, domain }] }`.
- `:31-36` `scopeShape()` reads `obligation.applyTo.metadata` and returns it directly for
  every helper-built gate.
- Header `:12-20` states its purpose verbatim: *"the business-facing illustration arm of the
  AC — a shape that could be piped into a docs site, a Confluence macro, or a spreadsheet
  review."*

So "render a stakeholder data dictionary" is **built and runs today**, at partial fidelity
(closure gates are honestly marked `custom-applyTo` / dynamic). That is the opposite of
"structurally cannot". The claim's own L4.3 framing ("B-structural") overreaches on this arm.

### 2. Dependency-graph edge IS recoverable for most gates today

The helpers put the gate obligation's id straight into the metadata sidecar:

- `helpers.js:49-55` — `allowListed.metadata = { type, obligation: gateObligation.id, values, projection, reasons }` (**6 gates**)
- `helpers.js:80-91` — `allowListedByPredicate.metadata = { type, obligation, predicate, projection, reasons }` (**2 gates**)
- `helpers.js:112-118` — `anyAllowListed.metadata = { type, obligation, values, whenTrue, whenFalse }` (**2 gates**)

That is **10 of the 19 conditional gates** whose `depends-on` edge is statically readable
right now. The only blind spot is:

- `helpers.js:135-139` — `branchedGate.metadata = { type, whenTrue, whenFalse }` — omits the
  predicate and the gate obligation (**9 gates**).

So the true figure for "cannot statically discover which obligation they depend on" is
**9 of 44 obligations (~20%)**, or **9 of 19 conditional gates (~47%)** — **not ~80%.**

### 3. FIND THE CHEAP WORKAROUND — the 9 branchedGate edges close without a model change

Every one of B's five distinct `branchedGate` predicates is a **trivial single-obligation
read** (I read all of them):

- `obligations.js:193-197` regionCode — `fulfilments[regionCodeRequirement.id] === 'yes'` (equality)
- `obligations.js:216-224` purposeInInternalMarket — `fulfilments[reasonForImport.id] === 'internal-market'` (equality)
- `obligations.js:282-290` commercialTransporter — `transporterType.id === 'commercial'` (equality)
- `obligations.js:296-304` privateTransporter — `transporterType.id === 'private'` (equality)
- `obligations.js:337-340` transitedCountries — `LAND_TRANSPORT_MODES.includes(fulfilments[meansOfTransport.id])` (membership)
- `obligations.js:751-762` accompanyingDocumentBlock — `isFilled(fulfilments[accompanyingDocumentType.id])` (presence)

These are exactly the shapes B's helper library **already** carries metadata for:
`matches` (`helpers.js:147-153`, `metadata = { type:'matches', obligation, value }`) and
`present` (`helpers.js:165-175`, a predicate primitive). Closing the gap needs no engine or
storage change — `evaluator.js` still just calls `applyTo(fulfilments, ids)`:

1. Add `predicate` (or a `dependsOn: [id]`) field to `branchedGate.metadata` — one line.
2. Give the 6 predicates their metadata by building them from `matches`/`present`/an
   `inList` primitive (all already-existing helper patterns), or hand-annotate `dependsOn`.
3. Optional: an `alwaysInScope(status)` helper for the 19 bare `() => ({inScope:true})`
   gates so the dictionary stops labelling them `custom-applyTo`.

This is the **same fix the synthesis itself prescribes** — `L4-model-power.md:260-262`:
*"The third option reclaims most of it for ~30 LOC: mandatory complete `dependsOn` metadata
on every gate … **which restores 4.1-4.3 without giving up closures** for the easy cases."*
That sentence is a direct admission that 4.3 is closable **without changing the model**,
which contradicts the "structurally cannot without changing its model" framing of the claim.

### 4. What IS genuinely B-structural (the arm that survives)

**Full round-trippable serialisation (4.2).** As long as ANY gate is an arbitrary closure,
the *whole* conditionality is not exportable to JSON / another language / a non-programmer
authoring tool. B's `allowListedByPredicate` predicates are real closures —
`obligations.js:685-698` (`noSpecificIdentifier` = negation over four whitelists,
`helpers.js:80-93` stores the live function, not data). You can *call* it; you cannot
*render* or *port* it. Expressing it as data is precisely the `notInUnionOf`-style operator
A has — i.e. re-adopting the killed `gatedBy` DSL (`GAPS.md:62-86`). **That is a model
change.** So on the strict reading "serialise the WHOLE conditionality", the asymmetry is
real and structural, and A (closed 4-operator data vocabulary, `spec/journey-spec.json`
proves round-trip in principle) genuinely does something B cannot.

---

## The corrected claim

- **Structural (stands):** *B cannot serialise its **entire** conditionality into a
  round-trippable, language-portable, non-programmer-authorable artefact*, because ≥11 gates
  (9 `branchedGate` + 2 `allowListedByPredicate`) are closures whose only data form is the
  DSL B deliberately killed. Cost to close = re-adopt the closed-vocabulary DSL for the
  closure minority (a model change).
- **NOT structural (refuted):** *dependency-graph recovery* and *stakeholder data dictionary*
  are both achievable without a model change. The dictionary is **already built**
  (`data-dictionary-sketch.js`); full dependency-edge recovery is a **~30 LOC** metadata
  addition (`branchedGate` predicate/`dependsOn` metadata + an `alwaysInScope` helper), no
  engine change, closures retained — exactly what `L4-model-power.md:260-262` prescribes.
- **Numbers correction:** the edge is undiscoverable for **9/44 obligations (~20%) / 9/19
  conditional gates (~47%)**, not ~80%. The "~80%" is the condition-*value* non-readability
  figure (only ~8 of ~40 expose a machine-readable value set — the 4.2 arm) mis-applied to
  the dependency-*edge* question (the 4.3 arm). Conflating the two is the claim's core error.

**Net:** A's meta-level superiority is genuine but narrower than stated. It is decisive only
for *complete, portable serialisation of the condition semantics* (4.2 + reachability
inversion). For "recover the dependency graph" and "render a data dictionary" B is not
structurally blocked — one is shipped, the other is a cheap metadata mandate that keeps
closures. The shopping-list item is therefore: **take A's closed-vocabulary data conditions
for portability, but do not credit A with an asymmetry on the dictionary/graph arm — B
reaches those without a model change.**
