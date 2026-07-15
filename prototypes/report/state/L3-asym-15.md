# L3-asym-15 — Static reachability proof by gate inversion (A-only)

**CLAIM:** A can invert each gate to synthesise a witness that opens it, scaffold a witness
journey, reconcile it through the real engine, and prove every obligation instance reachable.
B "structurally cannot" — its gates are arbitrary JS closures (`branchedGate(predicate,...)`
is undecidable to invert) and B withholds the predicate from its own metadata
(`helpers.js:135-139` → `{type,whenTrue,whenFalse}`), with ~19 gates as bare closures with no
metadata.

## VERDICT: REFUTED

The "structural" framing is wrong on two independent counts. (1) The specific evidence
cherry-picks the single opaque helper and ignores the four that expose the admitting set as
data — and B **already ships gate-inversion-off-metadata in production**. (2) A's own prover
does **not** symbolically invert gates; its method is enumerate-witnesses + run-the-real-engine-
forward, which is fully portable to B's pure evaluator with **zero model change** for the
invertible majority.

---

## 1. The metadata claim is false for 4 of 5 helpers — B reads admitting sets off data today

The claim quotes `helpers.js:135-139` (the `branchedGate` metadata: `{type,whenTrue,whenFalse}`,
no predicate) as if representative. It is the **single exception**. The other four gate helpers
carry the admitting set as data on `.metadata`:

- `allowListed` — `metadata = {type, obligation, values, projection, reasons}` (`helpers.js:49-55`).
  `values` **is** the admitting set, as data. Directly readable, exactly like A's `activatedBy.includes`.
- `anyAllowListed` — `metadata = {type, obligation, values, whenTrue, whenFalse}` (`helpers.js:112-118`).
  `values` = admitting set, as data.
- `matches` — `metadata = {type, obligation, value}` (`helpers.js:152`). Single admitting value, as data.
- `allowListedByPredicate` — `metadata = {type, obligation, predicate, projection, reasons}`
  (`helpers.js:80-91`). The predicate function is **deliberately exposed**, with a docstring
  (`helpers.js:83-88`) that describes *this exact use case*: "ask 'would this value be admitted?'
  without executing the whole applyTo closure."

The helper library's own header states its purpose: "`.metadata` … Enables optional static
introspection / cross-language export without giving up the imperative-JS surface"
(`helpers.js:16-19`).

**B already inverts its gates off this metadata in production.** `features/units/controller.js`
`pickSeedObligationForLine` (`:186-222`) does precisely what the claim says B "structurally
cannot":
```js
const meta = obligation.applyTo?.metadata
if (meta.type === 'allowListed' && meta.values?.includes(lineCode)) return obligation   // :206
if (meta.type === 'allowListedByPredicate' && meta.predicate?.(lineCode)) return obligation // :209-211
```
with the inline comment (`:214-216`) "helpers.js exposes the predicate on the metadata so we can
ask 'would this code be admitted?' without executing the whole applyTo closure." That is
witness-value synthesis by reading the admitting set off gate data — the capability under
dispute — already built, already shipped, already tested.

## 2. Gate census — the "~19 bare closures with no metadata" figure is wrong

Actual conditional gates in `obligations/obligations.js`:

| Helper | Count | Metadata carries admitting set? | Invertible from data? |
|---|---|---|---|
| `allowListed` (`:474,636,646,656,666,711`) | 6 | `values` (array of codes) | **Yes, as data** |
| `anyAllowListed` (`:513,549`) | 2 | `values` | **Yes, as data** |
| `allowListedByPredicate` (`:685,698`) | 2 | `predicate` (probeable value→bool) | **Yes, probe it** |
| `branchedGate` (`:193,216,282,296,337,754`) | 6 | only `{whenTrue,whenFalse}` | No (opaque) |

So **10 of 16 gates** expose the admitting set as data with metadata already attached and already
consumed. **None** are "bare closures with no metadata" — all 16 flow through helper factories
that attach `.metadata`. Only the 6 `branchedGate` predicates are opaque, and every one of them
is a trivial scalar-equality / presence closure (`fulfilments[regionCodeRequirement.id] === 'yes'`,
`=== 'internal-market'`, `=== 'commercial'`, `=== 'private'`, documentType-presence).

## 3. A's prover doesn't symbolically invert gates — so "undecidable closures" is a red herring

`analysis/reachability.js` does **not** solve `branchedGate`-style closures. It:
- hand-enumerates a tiny cartesian product of top-level scope drivers
  (`enumerateScopeStates()`, `:8-20`: regionOfOriginCodeRequirement × reasonForImport ×
  meansOfTransport × transporterType);
- auto-derives per-obligation *ancestor* gate witness values from data (`gateValue`, `:36-47`,
  covering A's 4 declarative operators);
- then **runs the real engine forward** and checks membership:
  `reconcile(candidate).inScope.has(targetKey)` (`:174`).

Steps 1 and 3 are pure forward execution. A never inverts an arbitrary function because A has no
arbitrary-function gates — but the *method* (enumerate + forward-run) is model-agnostic and needs
no inversion of anything.

**Port to B, zero model change:**
- B's evaluator is a pure, runnable pipeline (`readState → evaluateState(readFulfilments)`,
  `lib/state.js:42-44`); feed it a synthetic `fulfilments` map, read `decision.inScope` back.
  That is the forward-run step, verbatim.
- Auto-derive witness codes for the 10 `allowListed`/`anyAllowListed`/`allowListedByPredicate`
  gates from `metadata.values` / probe `metadata.predicate` — exactly what
  `pickSeedObligationForLine` already does.
- The 6 `branchedGate` gates need **no inversion**: run them forward over an enumerated driver
  list — and their drivers (regionCodeRequirement, reasonForImport, transporterType,
  documentType-presence) are the **same small enums A itself hand-lists** in
  `enumerateScopeStates`. B inherits the identical hand-authoring cost A already pays; it is not
  extra, and it is not a model change.

B also already does static totality enumeration over its obligation manifest-as-data
(`obligations/coverage.test.js:80-86` asserts every obligation is wired-or-allowlisted), the
structural analogue of A's boot totality assertion. The manifest is data B iterates freely.

---

## What is actually (narrowly) true

- B has **not built** the witness-journey reachability prover. Unbuilt ≠ structurally-cannot.
- The 6 `branchedGate` predicates are opaque in metadata (`{whenTrue,whenFalse}` only). This
  blocks **fully-automatic driver discovery** for those 6 gates — but not a working prover,
  because A itself does not discover its top-level drivers automatically either; it hand-lists
  them. To close even the automatic-discovery nicety costs the claim's own conceded ~30 LOC
  (add a `dependsOn`/driver field to `branchedGate` metadata) — an additive metadata field on
  one existing helper factory, not a re-vocabularisation and not "re-become A."

## Why the CONFIRMED conditions fail

The concept has a place to live in B's model: it lives on `.metadata`, four of five helpers
already populate it with the admitting set, and B already reads it to synthesise admitting
witness values in `pickSeedObligationForLine`. The mechanism exists; the workaround for the
remaining 6 gates is forward-execution (A's own method), not model change. Neither prong of
CONFIRMED holds.

## Amended (accurate) claim

A **ships** a reachability prover and B does not; and 6 of B's 16 gates hide their driver in an
opaque closure, so a *fully-automatic* B prover would want one additive metadata field
(~30 LOC on `branchedGate`). But the capability is **not** A-only and **not** structural: B
already reads admitting sets off gate metadata as data in production
(`features/units/controller.js:204-217`), 10 of 16 gates expose the admitting set today, and A's
prover method (enumerate witnesses + forward-run the real, pure engine) ports to B's
`evaluateState` with **no model change**. Third-option action: build the prover once on the
shared model and add driver metadata to `branchedGate`; do not treat this as a reason to prefer
A's closed vocabulary.
