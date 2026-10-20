# Obligation model

The L2 model evaluates any configured obligation set. It contains no display copy,
route knowledge or journey imports.

## Registration

[`src/server/app/model/obligations/manifest.js`](../model/obligations/manifest.js)
holds the configured set behind accessors for `obligations`, `groups` and
`obligationByName`. L1 calls `configureObligationSet()` before any evaluator or
bridge operation.

A set owns the concrete declaration objects and manifest order. See the
[live-animals obligation-set guide](../sets/live-animals/docs/obligation-model.md).

## Obligation shape

An obligation has a stable UUID `id`, a path-safe `name` and either a direct
`status` or an `applyTo` rule that returns scope and mandate. Collection members use
`within` to point to their parent group. `requires` carries cardinality or
cross-field invariants.

Names cannot contain path metacharacters because the same vocabulary is used by
fulfilment paths and page dispatch.

## Scope helpers

The helper surface is exported from
[`src/server/app/model/obligations/helpers/index.js`](../model/obligations/helpers/index.js).
Helpers create `applyTo` functions and attach dependency metadata. The metadata
makes the dependency graph inspectable without parsing a closure.

Use the narrowest helper that expresses the rule. `branchedGate` is the escape hatch
for a rule that cannot use the standard equality, presence, inclusion or allow-list
helpers.

Each helper returns `applyTo(fulfilments, fulfilmentIndexesByObligationId)`, which
gives a decision, and carries a `.metadata` property that describes the gate. An
obligation may also declare `dependsOn`, the ids of the obligations its gate reads.
The reachability prover inverts gates from this data, and a coverage assertion fails
the build for a gated obligation without a complete declared or derived `dependsOn`.

Which helper to pick:

- One verdict for the whole obligation, typically when it is not indexed:
  `equalsGate`, `includesGate`, `presentGate`, `alwaysInScope` or `matches`.
- A decision naming which fulfilment indexes are in scope, typically when the
  obligation is indexed: `allowListed` or `notInUnionOf`. Pass `null` for
  `gatedParentGroup` when the gate and the gated obligation sit at the same level,
  or the group when the gated obligation is deeper; the engine then fans across
  that group's fulfilment indexes for each matching parent.
- One decision from any value across a group: `anyAllowListed` when the rule names
  the members, `anyNotInUnionOf` when it names the exceptions and the members are
  open-ended. The CPH question is asked unless every commodity line's code is
  exempt; a line with no code yet is ignored rather than counted as outside the
  exemptions.
- `branchedGate` for a predicate that cannot be derived. Pair it with
  `predicateMeta` so the prover can build a witness.
- `moreThanOne` is a combinator, not a gate: it stands another helper down unless
  that helper admits more than one entry, for a question asked only of a
  consignment carrying more than one identified commodity line.

## Evaluation

[`src/server/app/model/obligations/evaluator.js`](../model/obligations/evaluator.js)
builds an index for the configured manifest, evaluates applicability, converges
scope and purges fulfilments that are unknown or out of scope. Evaluation is pure:
answers and fulfilments go in; derived views and cleaned fulfilment come out.

[`src/server/app/model/obligations/state-queries.js`](../model/obligations/state-queries.js)
provides read-only queries over evaluated state.

## Display and validation boundaries

Obligations describe domain applicability and completeness. They do not contain
titles, labels, hints, options, routes or templates. Controllers own input
validation and journeys own display copy.

[`src/server/app/model/no-display-keys.js`](../model/no-display-keys.js) and
[`src/server/app/obligation-purity.js`](../obligation-purity.js) enforce the
copy-free model rule.
