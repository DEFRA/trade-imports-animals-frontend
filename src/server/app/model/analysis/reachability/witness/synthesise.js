import { WITNESS_KIND } from './kinds.js'
import {
  firstListedPairWitness,
  firstListedValueWitness,
  totalBranchWitnessOrValue,
  valueWitness
} from './witness-shapes.js'

const NOT_IN_UNION_SENTINEL = '__witness_not_in_union__'

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

const synthesiseNotInUnionOfWitness = (meta) => {
  if (!Array.isArray(meta.values)) {
    return {
      kind: WITNESS_KIND.OPAQUE,
      reason: `${meta.gateType} metadata has no derived values array`
    }
  }
  if (meta.values.includes(NOT_IN_UNION_SENTINEL)) {
    const fallback = `${NOT_IN_UNION_SENTINEL}_2`
    if (meta.values.includes(fallback)) {
      /* c8 ignore next 4 */
      return {
        kind: WITNESS_KIND.OPAQUE,
        reason: `${meta.gateType} derived union covers both witness sentinels`
      }
    }
    return valueWitness(meta, fallback)
  }
  return valueWitness(meta, NOT_IN_UNION_SENTINEL)
}

const SYNTHESISERS = {
  allowListed: (meta) =>
    firstListedValueWitness(
      meta,
      'allowListed metadata has empty values array'
    ),
  allowListedPairs: (meta) =>
    firstListedPairWitness(
      meta,
      'allowListedPairs metadata has empty values array'
    ),
  anyAllowListed: (meta) =>
    firstListedValueWitness(
      meta,
      'anyAllowListed metadata has empty values array'
    ),
  anyNotInUnionOf: synthesiseNotInUnionOfWitness,
  notInUnionOf: synthesiseNotInUnionOfWitness,
  matches: (meta) => ({
    kind: WITNESS_KIND.WITNESS,
    obligationId: meta.obligationId,
    value: meta.value
  }),
  branchedGate: synthesiseBranchedGateWitness,
  equalsGate: (meta) =>
    totalBranchWitnessOrValue(meta, () => ({
      kind: WITNESS_KIND.WITNESS,
      obligationId: meta.obligationId,
      value: meta.value
    })),
  presentGate: (meta) =>
    totalBranchWitnessOrValue(meta, () => ({
      kind: WITNESS_KIND.WITNESS,
      obligationId: meta.obligationId,
      value: '__witness__'
    })),
  includesGate: (meta) =>
    totalBranchWitnessOrValue(meta, () =>
      firstListedValueWitness(
        meta,
        'includesGate metadata has empty values array'
      )
    ),
  alwaysInScope: () => ({ kind: WITNESS_KIND.TRIVIAL })
}

export const SYNTHESISED_GATE_TYPES = new Set(Object.keys(SYNTHESISERS))

const synthesiseFromMetadata = (meta) =>
  Object.hasOwn(SYNTHESISERS, meta.gateType)
    ? SYNTHESISERS[meta.gateType](meta)
    : {
        kind: WITNESS_KIND.OPAQUE,
        reason: `unrecognised helper metadata gateType '${meta.gateType}'`
      }

/**
 * Inspects an obligation's `applyTo.metadata` and classifies how a witness for
 * its gate can be built.
 *
 * @param {object} obligation - manifest entry with `.applyTo` (or not).
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
