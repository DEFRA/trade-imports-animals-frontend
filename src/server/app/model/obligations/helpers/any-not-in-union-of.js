import { isBlankValue } from '../is-blank-value.js'
import { buildAnyCandidateGate } from './internals/build-any-candidate-gate.js'
import { deriveUnion } from './internals/derive-union.js'

export const anyNotInUnionOf = (
  gateObligation,
  unionOfLists,
  whenTrue,
  whenFalse
) =>
  buildAnyCandidateGate({
    gateType: 'anyNotInUnionOf',
    gateObligation,
    currentValues: () =>
      deriveUnion(
        typeof unionOfLists === 'function' ? unionOfLists() : unionOfLists
      ),
    admits: (candidate, union) =>
      !isBlankValue(candidate) && !union.includes(candidate),
    whenTrue,
    whenFalse
  })
