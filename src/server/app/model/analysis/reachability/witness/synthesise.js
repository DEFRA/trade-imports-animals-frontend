import { WITNESS_KIND } from './kinds.js'
import {
  firstListedPairWitness,
  firstListedValueWitness,
  totalBranchWitnessOrValue
} from './witness-shapes.js'

const LIST_GATE_TYPES = new Set([
  'allowListed',
  'allowListedPairs',
  'anyAllowListed',
  'anyNotInUnionOf',
  'notInUnionOf'
])

/**
 * synthesiseBranchedGateWitness — split out because `branchedGate` has
 * three sub-cases (total, structured predicateMeta, opaque). Two
 * classifiers to keep separate: TOTAL is when BOTH branches are in-
 * scope (any input opens the gate → no witness needed); WITNESS is
 * when the caller annotated a `predicateMeta` describing the operator.
 */
const synthesiseBranchedGateWitness = (meta) => {
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
 *
 * `withGatedParentGroupId: false` is for the notification-level
 * `anyNotInUnionOf`, which has no gatedParentGroup to carry.
 */
const synthesiseNotInUnionOfWitness = (
  meta,
  { withGatedParentGroupId = true } = {}
) => {
  const SENTINEL = '__witness_not_in_union__'
  if (!Array.isArray(meta.values)) {
    return {
      kind: WITNESS_KIND.OPAQUE,
      reason: `${meta.gateType} metadata has no derived values array`
    }
  }
  const witnessFor = (value) => ({
    kind: WITNESS_KIND.WITNESS,
    obligationId: meta.obligationId,
    value,
    ...(withGatedParentGroupId && {
      gatedParentGroupId: meta.gatedParentGroupId ?? null
    })
  })
  if (meta.values.includes(SENTINEL)) {
    const fallback = `${SENTINEL}_2`
    if (meta.values.includes(fallback)) {
      /* c8 ignore next 4 */
      return {
        kind: WITNESS_KIND.OPAQUE,
        reason: `${meta.gateType} derived union covers both witness sentinels`
      }
    }
    return witnessFor(fallback)
  }
  return witnessFor(SENTINEL)
}

const synthesiseListGateWitness = (meta) => {
  switch (meta.gateType) {
    case 'allowListed':
      return firstListedValueWitness(
        meta,
        'allowListed metadata has empty values array',
        { withGatedParentGroupId: true }
      )
    case 'allowListedPairs':
      return firstListedPairWitness(
        meta,
        'allowListedPairs metadata has empty values array'
      )
    case 'anyAllowListed':
      return firstListedValueWitness(
        meta,
        'anyAllowListed metadata has empty values array'
      )
    case 'anyNotInUnionOf':
      return synthesiseNotInUnionOfWitness(meta, {
        withGatedParentGroupId: false
      })
    case 'notInUnionOf':
    default:
      return synthesiseNotInUnionOfWitness(meta)
  }
}

const synthesiseFromMetadata = (meta) => {
  if (LIST_GATE_TYPES.has(meta.gateType)) {
    return synthesiseListGateWitness(meta)
  }
  switch (meta.gateType) {
    case 'matches':
      return {
        kind: WITNESS_KIND.WITNESS,
        obligationId: meta.obligationId,
        value: meta.value
      }

    case 'branchedGate':
      return synthesiseBranchedGateWitness(meta)

    case 'equalsGate':
      return totalBranchWitnessOrValue(meta, () => ({
        kind: WITNESS_KIND.WITNESS,
        obligationId: meta.obligationId,
        value: meta.value
      }))

    case 'presentGate':
      return totalBranchWitnessOrValue(meta, () => ({
        kind: WITNESS_KIND.WITNESS,
        obligationId: meta.obligationId,
        value: '__witness__'
      }))

    case 'includesGate':
      return totalBranchWitnessOrValue(meta, () =>
        firstListedValueWitness(
          meta,
          'includesGate metadata has empty values array'
        )
      )

    case 'alwaysInScope':
      return { kind: WITNESS_KIND.TRIVIAL }

    default:
      return {
        kind: WITNESS_KIND.OPAQUE,
        reason: `unrecognised helper metadata gateType '${meta.gateType}'`
      }
  }
}

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
    return { kind: WITNESS_KIND.TRIVIAL }
  }

  const meta = applyTo.metadata
  if (!meta) {
    return { kind: WITNESS_KIND.TRIVIAL }
  }

  return synthesiseFromMetadata(meta)
}
