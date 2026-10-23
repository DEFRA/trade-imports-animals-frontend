import { isOutsideUnion, resolveUnion } from '../helper-internals.js'
import { buildAnyCandidateGate } from './internals/build-any-candidate-gate.js'

export const anyNotInUnionOf = (
  gateObligation,
  unionOfLists,
  whenTrue,
  whenFalse
) =>
  buildAnyCandidateGate({
    gateType: 'anyNotInUnionOf',
    gateObligation,
    currentValues: () => resolveUnion(unionOfLists),
    admits: isOutsideUnion,
    whenTrue,
    whenFalse
  })
