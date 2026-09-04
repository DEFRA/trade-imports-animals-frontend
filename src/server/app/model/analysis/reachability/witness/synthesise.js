import { WITNESS_KIND } from './kinds.js'
import {
  firstListedValueWitness,
  totalBranchWitnessOrValue
} from './witness-shapes.js'

/**
 * synthesiseWitness — inspect an obligation's `applyTo.metadata` and
 * return a witness classification.
 *
 * @param {object} obligation — manifest entry with `.applyTo` (or not).
 * @returns {{ kind: 'witness', obligationId: string, value: any, gatedParentGroupId?: string | null }
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

  return synthesiseFromMetadata(meta)
}

function synthesiseFromMetadata(meta) {
  switch (meta.gateType) {
    case 'allowListed':
      // metadata.values IS the allowlist — first entry is a witness.
      // Include the gatedParentGroup id (if any) so the fidelity check
      // can seed a synthetic path in `fulfilmentIndexesByObligationId` for
      // depth-N > 1 gates (passport, tattoo, earTag, horseName,
      // permanentAddress — all project onto unitRecord). Without a
      // gatedParentGroup fulfilmentIndex the closure's `runGate` returns
      // records: [] and `inScope: false`, which would be a false
      // negative — the gate WOULD open in the real evaluator, which
      // always seeds unitRecord paths from user-created units.
      return firstListedValueWitness(
        meta,
        'allowListed metadata has empty values array',
        { withGatedParentGroupId: true }
      )

    case 'anyAllowListed':
      // Same shape as allowListed — but anyAllowListed has no
      // gatedParentGroup (notification-level aggregate).
      return firstListedValueWitness(
        meta,
        'anyAllowListed metadata has empty values array'
      )

    case 'matches':
      // metadata.value IS the scalar target.
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: meta.obligationId,
        value: meta.value
      }

    case 'branchedGate':
      return synthesiseBranchedGateWitness(meta)

    case 'notInUnionOf':
      // metadata.values IS the derived union of the input allowlists.
      // Witness = any value NOT in that union. A stable sentinel that
      // is virtually guaranteed not to collide with real commodity
      // codes; defensively confirmed against the derived union.
      // Include the gatedParentGroup id (if any) for depth-N gates —
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
        obligationId: meta.obligationId,
        value: meta.value
      }))

    case 'presentGate':
      // Meta-first equivalent of branchedGate + predicateMeta.isFilled.
      // Any non-blank scalar opens the gate. Total-branches case is
      // trivial (both in-scope); otherwise use the same sentinel
      // convention as branchedGate's `isFilled` synth.
      return totalBranchWitnessOrValue(meta, () => ({
        kind: WITNESS_KIND.WITNESS,
        obligationId: meta.obligationId,
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
        reason: `unrecognised helper metadata gateType '${meta.gateType}'`
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
      obligationId: meta.obligationId,
      value: fallback,
      gatedParentGroupId: meta.gatedParentGroupId ?? null
    }
  }
  return {
    kind: WITNESS_KIND.WITNESS,
    obligationId: meta.obligationId,
    value: SENTINEL,
    gatedParentGroupId: meta.gatedParentGroupId ?? null
  }
}
