/**
 * reachability.js — graph-level + value-level dependency-reachability prover.
 *
 * ---------------------------------------------------------------------------
 * The "conservative closure treatment" invariant
 * ---------------------------------------------------------------------------
 *
 * The manifest's gates are JS closures — the closure body is opaque; the
 * metadata declares WHICH obligations a closure reads (`dependsOn`), not
 * WHAT VALUES would satisfy the predicate. `synthesiseWitness()` inspects
 * the structured helper sidecar (`allowListed`, `anyAllowListed`,
 * `matches`, and `branchedGate` when annotated with a `predicateMeta`
 * operator description) and returns a concrete `{ obligationId, value }`
 * that would open the gate. A tightened prover (`proveWithWitnesses`)
 * runs the actual `applyTo` closure against the synthesised witness,
 * confirming the gate really does fire — no vacuously-green graph-only
 * pass. A coverage assertion pins that every "structured" helper carries
 * a witness synthesiser here.
 *
 * At the GRAPH level, `dependsOn` alone recovers the recovery-relevant
 * structure. Under the conservative rule:
 *
 *   "an obligation is reachable IFF every id in its `dependsOn` list is
 *    reachable, seeded from the always-in-scope set (obligations with
 *    `dependsOn: []`)."
 *
 * `proveReachability` implements exactly this. `proveWithWitnesses`
 * sits on top: same graph, but each gate whose helper carries a
 * recoverable predicate must ALSO be provable value-side (witness
 * synthesis + closure re-run).
 *
 * ---------------------------------------------------------------------------
 * Self-loop treatment
 * ---------------------------------------------------------------------------
 *
 * A pure self-loop (`dependsOn === [own-id]`) has NO external prereq —
 * nothing beyond the obligation itself constrains whether the gate
 * fires. We treat such self-loops as seeds (equivalent to `dependsOn:
 * []` at the graph level). The manifest's one legitimate self-loop is
 * `accompanyingDocumentType`, whose gate closure reads its own stored
 * value; the branchedGate is total-over-branches (both `whenTrue` and
 * `whenFalse` have `inScope: true`), so value-level analysis in commit
 * 2 will confirm the gate is always-in-scope regardless of the read
 * value. At the graph level, it suffices to recognise the loop as
 * "self-only reads → no external prereq → seed".
 *
 * ---------------------------------------------------------------------------
 * Dangling ids
 * ---------------------------------------------------------------------------
 *
 * The manifest coverage assertion should already prevent them, but the
 * prover is defensive: any `dependsOn` id that doesn't resolve to a
 * record in the input manifest is reported as an error (with the
 * offending obligation id) rather than crashing. The obligation
 * carrying the dangling id is neither reachable nor unreachable; it is
 * `errors[]` only.
 */

import { obligationMetadata } from '../obligations/helpers.js'

// Dangling ids and missing dependsOn arrays. Anomalous obligations are
// excluded from the reachable/unreachable classification and reported only
// in errors.
const findStructuralDefects = (records, byId) => {
  const errors = []
  const structurallyBad = new Set()
  for (const rec of records) {
    if (!Array.isArray(rec.dependsOn)) {
      errors.push({
        obligationId: rec.id,
        reason:
          'missing dependsOn array (the manifest coverage assertion should have caught this)'
      })
      structurallyBad.add(rec.id)
      continue
    }
    for (const depId of rec.dependsOn) {
      if (depId === rec.id) continue // self-loop is not a dangling id
      if (!byId.has(depId)) {
        errors.push({
          obligationId: rec.id,
          reason: `dependsOn references unknown obligation id '${depId}'`
        })
        structurallyBad.add(rec.id)
        break // one error per obligation is enough
      }
    }
  }
  return { errors, structurallyBad }
}

// An obligation is a seed if it has an empty dependsOn (always in scope) or
// its dependsOn is a pure self-loop `[own-id]` — no external prerequisite.
const isSeedObligation = (rec) =>
  rec.dependsOn.length === 0 || rec.dependsOn.every((depId) => depId === rec.id)

// Fixed-point iteration: an obligation becomes reachable once it's a seed
// or every non-self dep is already reachable. Iterate until no new nodes
// are marked; structurally-bad nodes are never marked reachable.
const closeReachableSet = (records, structurallyBad) => {
  const reachable = new Set()
  let changed = true
  while (changed) {
    changed = false
    for (const rec of records) {
      if (reachable.has(rec.id)) continue
      if (structurallyBad.has(rec.id)) continue
      if (isSeedObligation(rec)) {
        reachable.add(rec.id)
        changed = true
        continue
      }
      const externalDeps = rec.dependsOn.filter((depId) => depId !== rec.id)
      if (externalDeps.every((depId) => reachable.has(depId))) {
        reachable.add(rec.id)
        changed = true
      }
    }
  }
  return reachable
}

/**
 * proveReachability — run the graph-level prover over a list of
 * `{ id, dependsOn }` records. Three-outcome enumeration:
 *
 *   {
 *     reachable:   string[],  // ids that trace to a seed
 *     unreachable: string[],  // ids whose deps never terminate at a seed
 *     errors:      { obligationId, reason }[]  // structural defects
 *   }
 *
 * Called from `analysis/reachability.test.js` and from this module's
 * own `proveWithWitnesses`, which walks `obligations` +
 * `obligationMetadata` to build the record list.
 *
 * @param {Array<{id: string, dependsOn: string[] | undefined}>} records
 * @returns {{ reachable: string[], unreachable: string[], errors: Array<{obligationId: string, reason: string}> }}
 */
export const proveReachability = (records) => {
  const byId = new Map(records.map((record) => [record.id, record]))
  const { errors, structurallyBad } = findStructuralDefects(records, byId)
  const reachable = closeReachableSet(records, structurallyBad)
  const unreachable = records
    .filter((rec) => !reachable.has(rec.id) && !structurallyBad.has(rec.id))
    .map((rec) => rec.id)

  return {
    reachable: [...reachable],
    unreachable,
    errors
  }
}

// ---------------------------------------------------------------------------
// Witness synthesis.
//
// Each structured helper attaches a `.metadata` sidecar describing its
// gate shape. `synthesiseWitness` inspects that sidecar and returns a
// concrete `{ obligationId, value }` pair that — when written into a
// fulfilments map keyed by `obligationId` — makes the closure return
// `inScope: true`. The tightened prover (`proveWithWitnesses`) uses
// the witness to confirm value-level reachability, not just graph
// reachability.
//
// Classification of the manifest's gated obligations:
//   - structured (witness-synthesisable) — helpers with recoverable
//     metadata: `allowListed`, `anyAllowListed`, `matches`,
//     `notInUnionOf`, plus `branchedGate` when the caller supplies
//     `predicateMeta`.
//   - trivial (total-over-branches) — `branchedGate` where both
//     `whenTrue.inScope` and `whenFalse.inScope` are `true`. The gate
//     is always open regardless of the closure's read; no witness
//     needed. Currently the four accompanying-document siblings +
//     regionCode.
//   - opaque — reserved for future opaque-by-design helpers. Empty on
//     the current manifest — see `OPAQUE_HELPER_TYPES` below.
// ---------------------------------------------------------------------------

/**
 * Witness kind — the classification `synthesiseWitness` returns so the
 * prover can branch on it uniformly. Exported for the coverage gate:
 * every gated obligation must classify as one of these three.
 *
 * - `'witness'`  — value-level check available: `{ kind: 'witness',
 *                  obligationId, value }`.
 * - `'trivial'`  — gate is always open (both branches in-scope, or the
 *                  obligation carries no `applyTo`): `{ kind: 'trivial' }`.
 * - `'opaque'`   — helper metadata does not carry a data-level target;
 *                  falls back to graph-level check only:
 *                  `{ kind: 'opaque', reason }`.
 */
export const WITNESS_KIND = Object.freeze({
  WITNESS: 'witness',
  TRIVIAL: 'trivial',
  OPAQUE: 'opaque'
})

/**
 * STRUCTURED_HELPER_TYPES — the `.metadata.type` labels for helpers
 * whose gates `synthesiseWitness` can invert into a concrete
 * `{ obligationId, value }` witness. Each label here MUST have a
 * matching `case` in `synthesiseWitness`'s dispatch (the coverage test
 * in `analysis/coverage.test.js` pins this both ways). Adding a new
 * structured helper is a three-touch change: helper in `helpers.js`,
 * case in `synthesiseWitness`, and an entry here.
 *
 * Every new operator carries a second tax — a witness synthesiser + a
 * seeding rule. This set is the build-time enforcement of the first
 * half of that tax.
 */
export const STRUCTURED_HELPER_TYPES = new Set([
  'allowListed',
  'anyAllowListed',
  'matches',
  'branchedGate',
  'notInUnionOf',
  // Meta-first gate helpers. Each helper's `.metadata` fully describes
  // the gate — the closure body is auto-generated from it, so witness
  // synthesis reads the metadata directly.
  'equalsGate',
  'presentGate',
  'includesGate',
  'alwaysInScope'
])

/**
 * OPAQUE_HELPER_TYPES — the `.metadata.type` labels for helpers
 * classified as opaque BY DECLARED DESIGN. Presence here is an
 * explicit deferral, not "we forgot to write the synth". Every entry
 * must be justified with a comment naming the reason.
 *
 * Currently EMPTY — every manifest gate is data-level invertible. The
 * set is retained (with a placeholder-invariant of `size >= 0`) as the
 * enforcement point for future opaque-by-design helpers: if a new
 * helper CAN'T be data-level inverted (e.g. an ML-scored predicate),
 * listing it here with a comment is the honest thing to do. Any
 * addition MUST cite the reason.
 */
export const OPAQUE_HELPER_TYPES = new Set([])

// A witness from an allowlist-shaped `meta.values` array: the first entry,
// or opaque when the array is missing/empty. `withProjection` controls
// whether the returned witness carries a `projection` key at all (some
// callers never included one).
const firstListedValueWitness = (
  meta,
  emptyReason,
  { withProjection } = {}
) => {
  if (!Array.isArray(meta.values) || meta.values.length === 0) {
    return { kind: WITNESS_KIND.OPAQUE, reason: emptyReason }
  }
  const witness = {
    kind: WITNESS_KIND.WITNESS,
    obligationId: meta.obligation,
    value: meta.values[0]
  }
  return withProjection
    ? { ...witness, projection: meta.projection ?? null }
    : witness
}

const isTotalBranchGate = (meta) =>
  meta.whenTrue?.inScope === true && meta.whenFalse?.inScope === true

// Meta-first gate helpers (equalsGate/presentGate/includesGate) share the
// same total-branches-are-trivial guard ahead of their own witness shape.
const totalBranchWitnessOrValue = (meta, makeWitness) =>
  isTotalBranchGate(meta) ? { kind: WITNESS_KIND.TRIVIAL } : makeWitness()

/**
 * synthesiseWitness — inspect an obligation's `applyTo.metadata` and
 * return a witness classification.
 *
 * @param {object} obligation — manifest entry with `.applyTo` (or not).
 * @returns {{ kind: 'witness', obligationId: string, value: any, projection?: string | null }
 *          | { kind: 'trivial' }
 *          | { kind: 'opaque', reason: string }}
 */
export const synthesiseWitness = (obligation) => {
  const applyTo = obligation?.applyTo
  if (typeof applyTo !== 'function') {
    // No applyTo — structural group (commodityLine, unitRecord). The
    // graph-level pass treats these as trivial seeds; witness-side
    // matches that classification.
    return { kind: WITNESS_KIND.TRIVIAL }
  }

  const meta = applyTo.metadata
  if (!meta) {
    // Bare closure (e.g. `() => ({ inScope: true, status: 'mandatory' })`).
    // Always-in-scope by construction; no witness needed.
    return { kind: WITNESS_KIND.TRIVIAL }
  }

  switch (meta.type) {
    case 'allowListed':
      // metadata.values IS the allowlist — first entry is a witness.
      // Include the projection group id (if any) so the fidelity check
      // can seed a synthetic path in `fulfilmentIdsByObligationId` for
      // depth-N > 1 gates (passport, tattoo, earTag, horseName,
      // permanentAddress — all project onto unitRecord). Without a
      // projection path the closure's `filterAndProject` returns
      // records: [] and `inScope: false`, which would be a false
      // negative — the gate WOULD open in the real evaluator, which
      // always seeds unitRecord paths from user-created units.
      return firstListedValueWitness(
        meta,
        'allowListed metadata has empty values array',
        { withProjection: true }
      )

    case 'anyAllowListed':
      // Same shape as allowListed — but anyAllowListed has no
      // projection group (notification-level aggregate).
      return firstListedValueWitness(
        meta,
        'anyAllowListed metadata has empty values array'
      )

    case 'matches':
      // metadata.value IS the scalar target.
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: meta.obligation,
        value: meta.value
      }

    case 'branchedGate':
      return synthesiseBranchedGateWitness(meta)

    case 'notInUnionOf':
      // metadata.values IS the derived union of the input allowlists.
      // Witness = any value NOT in that union. A stable sentinel that
      // is virtually guaranteed not to collide with real commodity
      // codes; defensively confirmed against the derived union.
      // Include the projection group id (if any) for depth-N gates —
      // identificationDetails + description both project onto
      // unitRecord.
      return synthesiseNotInUnionOfWitness(meta)

    case 'equalsGate':
      // Meta-first equivalent of branchedGate + predicateMeta.equals.
      // metadata.value IS the target value that opens the whenTrue
      // branch. If both branches are in-scope (regionCode's status-swap
      // shape), the gate is TRIVIAL — every input opens it, no witness
      // needed. Otherwise the value witnesses the whenTrue branch.
      return totalBranchWitnessOrValue(meta, () => ({
        kind: WITNESS_KIND.WITNESS,
        obligationId: meta.obligation,
        value: meta.value
      }))

    case 'presentGate':
      // Meta-first equivalent of branchedGate + predicateMeta.isFilled.
      // Any non-blank scalar opens the gate. Total-branches case is
      // trivial (both in-scope); otherwise use the same sentinel
      // convention as branchedGate's `isFilled` synth.
      return totalBranchWitnessOrValue(meta, () => ({
        kind: WITNESS_KIND.WITNESS,
        obligationId: meta.obligation,
        value: '__witness__'
      }))

    case 'includesGate':
      // Meta-first equivalent of branchedGate + predicateMeta.includes.
      // metadata.values IS the admitted list; first entry is a witness.
      // Total-branches case is trivial.
      return totalBranchWitnessOrValue(meta, () =>
        firstListedValueWitness(
          meta,
          'includesGate metadata has empty values array'
        )
      )

    case 'alwaysInScope':
      // Unconditional — the gate is always open by construction, no
      // read at all. Trivial classification is the honest one.
      return { kind: WITNESS_KIND.TRIVIAL }

    default:
      return {
        kind: WITNESS_KIND.OPAQUE,
        reason: `unrecognised helper metadata type '${meta.type}'`
      }
  }
}

/**
 * synthesiseBranchedGateWitness — split out because `branchedGate` has
 * three sub-cases (total, structured predicateMeta, opaque). Two
 * classifiers to keep separate: TOTAL is when BOTH branches are in-
 * scope (any input opens the gate → no witness needed); WITNESS is
 * when the caller annotated a `predicateMeta` describing the operator.
 */
function synthesiseBranchedGateWitness(meta) {
  const trueTotal = meta.whenTrue?.inScope === true
  const falseTotal = meta.whenFalse?.inScope === true
  if (trueTotal && falseTotal) {
    return { kind: WITNESS_KIND.TRIVIAL }
  }

  const predicateMeta = meta.predicateMeta
  if (!predicateMeta) {
    return {
      kind: WITNESS_KIND.OPAQUE,
      reason: 'branchedGate without predicateMeta (annotate the call site)'
    }
  }

  switch (predicateMeta.operator) {
    case 'equals':
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: predicateMeta.obligationId,
        value: predicateMeta.value
      }
    case 'includes':
      if (
        !Array.isArray(predicateMeta.values) ||
        predicateMeta.values.length === 0
      ) {
        return {
          kind: WITNESS_KIND.OPAQUE,
          reason: 'branchedGate predicateMeta.includes has empty values'
        }
      }
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: predicateMeta.obligationId,
        value: predicateMeta.values[0]
      }
    case 'isFilled':
      // Any non-blank value opens the gate. Pick a stable sentinel — a
      // non-empty string that will pass the shared `isFilled` predicate
      // used across the manifest (see obligations.js `isFilled`).
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: predicateMeta.obligationId,
        value: '__witness__'
      }
    default:
      return {
        kind: WITNESS_KIND.OPAQUE,
        reason: `branchedGate predicateMeta has unrecognised operator '${predicateMeta.operator}'`
      }
  }
}

/**
 * synthesiseNotInUnionOfWitness — pick a value guaranteed NOT to be in
 * the derived union. Approach: a stable sentinel; if it ever collides
 * with a real value the derived union covered, that means the union
 * theoretically covers every possible input — a gate that can never
 * open, which is an authoring defect the prover surfaces as OPAQUE
 * (not vacuously green). In practice the manifest's inverse-gate
 * commodity-code unions cover only a handful of codes; any string not
 * matching those codes opens the gate.
 */
function synthesiseNotInUnionOfWitness(meta) {
  const SENTINEL = '__witness_not_in_union__'
  if (!Array.isArray(meta.values)) {
    return {
      kind: WITNESS_KIND.OPAQUE,
      reason: 'notInUnionOf metadata has no derived values array'
    }
  }
  if (meta.values.includes(SENTINEL)) {
    // The derived union already covers the sentinel — try a second
    // fallback before giving up. Vanishingly unlikely on real
    // commodity-code manifests.
    const fallback = `${SENTINEL}_2`
    if (meta.values.includes(fallback)) {
      /* c8 ignore next 4 */
      return {
        kind: WITNESS_KIND.OPAQUE,
        reason: 'notInUnionOf derived union covers both witness sentinels'
      }
    }
    return {
      kind: WITNESS_KIND.WITNESS,
      obligationId: meta.obligation,
      value: fallback,
      projection: meta.projection ?? null
    }
  }
  return {
    kind: WITNESS_KIND.WITNESS,
    obligationId: meta.obligation,
    value: SENTINEL,
    projection: meta.projection ?? null
  }
}

// Prefer the derived-or-declared dependsOn from `obligationMetadata` —
// meta-first helpers name their gate obligation on `.metadata`, so the
// dependency graph is recoverable without an explicit `dependsOn`
// declaration.
const dependencyRecordFor = (obligation) =>
  typeof obligation.applyTo === 'function'
    ? {
        id: obligation.id,
        dependsOn: obligationMetadata(obligation).dependsOn
      }
    : { id: obligation.id, dependsOn: [] }

// The `{ fulfilments, fulfilmentIds }` pair that feeds the real `applyTo`
// closure for a fidelity check. Depth-N gates (allowListed with a
// projection group, e.g. passport / tattoo projecting onto unitRecord)
// need a synthetic instance path seeded in `fulfilmentIds` or
// `filterAndProject` returns `records: []` regardless of the value.
// Depth-1 `allowListed`/`notInUnionOf` still read as a map; every other
// helper accepts a plain scalar.
const witnessFulfilments = (obligation, witness) => {
  const fulfilmentIds = new Map()
  if (witness.projection) {
    fulfilmentIds.set(witness.projection, ['line1/unit1'])
    return {
      fulfilments: { [witness.obligationId]: { line1: witness.value } },
      fulfilmentIds
    }
  }
  const metaType = obligation.applyTo.metadata?.type
  if (metaType === 'allowListed' || metaType === 'notInUnionOf') {
    return {
      fulfilments: { [witness.obligationId]: { line1: witness.value } },
      fulfilmentIds
    }
  }
  return {
    fulfilments: { [witness.obligationId]: witness.value },
    fulfilmentIds
  }
}

// Fidelity check — the witness must actually open the closure. Any
// mismatch is a build-time defect (metadata drift vs. the real predicate).
const confirmWitnessOpensGate = (obligation, witness) => {
  const { fulfilments, fulfilmentIds } = witnessFulfilments(obligation, witness)
  const decision = obligation.applyTo(fulfilments, fulfilmentIds)
  if (decision && decision.inScope === true) return { opened: true }
  return {
    opened: false,
    error: {
      obligationId: obligation.id,
      reason: `synthesised witness { ${witness.obligationId}: ${JSON.stringify(witness.value)} } did not open the gate (got ${JSON.stringify(decision)})`
    }
  }
}

/**
 * proveWithWitnesses — tightened prover. Runs the graph-level check
 * first (must succeed), then confirms every gate whose helper carries
 * recoverable metadata can actually be opened by feeding the
 * synthesised witness into the real `applyTo` closure and asserting
 * `inScope: true`. Trivially-open gates (total branchedGate,
 * structural groups) pass without a closure run. Opaque gates fall
 * back to graph-only (recorded on the result so callers can see how
 * much of the manifest gets the tightened check).
 *
 * @param {Array<object>} obligations — the manifest entries themselves
 *   (not the `{id, dependsOn}` records fed to `proveReachability`).
 *   Each must carry an `id` at minimum; gated entries carry
 *   `applyTo.metadata` + `dependsOn`.
 * @returns {{
 *   reachable: string[],
 *   unreachable: string[],
 *   errors: Array<{obligationId: string, reason: string}>,
 *   witnesses: {
 *     synthesisable: string[],  // gates value-level proved
 *     trivial: string[],        // gates trivially open (no witness needed)
 *     opaque: string[]          // gates left at graph-level only
 *   }
 * }}
 */
export const proveWithWitnesses = (obligations) => {
  const records = obligations.map(dependencyRecordFor)
  const graph = proveReachability(records)

  const synthesisable = []
  const trivial = []
  const opaque = []
  const errors = [...graph.errors]

  for (const obligation of obligations) {
    const witness = synthesiseWitness(obligation)
    switch (witness.kind) {
      case WITNESS_KIND.TRIVIAL:
        trivial.push(obligation.id)
        break
      case WITNESS_KIND.OPAQUE:
        opaque.push(obligation.id)
        break
      case WITNESS_KIND.WITNESS: {
        const result = confirmWitnessOpensGate(obligation, witness)
        if (result.opened) {
          synthesisable.push(obligation.id)
        } else {
          errors.push(result.error)
        }
        break
      }
      /* c8 ignore next 2 */
      default:
        errors.push({
          obligationId: obligation.id,
          reason: `synthesiseWitness returned unknown kind '${witness.kind}'`
        })
    }
  }

  return {
    reachable: graph.reachable,
    unreachable: graph.unreachable,
    errors,
    witnesses: {
      synthesisable,
      trivial,
      opaque
    }
  }
}
