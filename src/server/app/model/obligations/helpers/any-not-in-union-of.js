import { isOutsideUnion, resolveUnion } from '../helper-internals.js'
import { buildAnyCandidateGate } from './internals/build-any-candidate-gate.js'

export const anyNotInUnionOf = (
  gateObligation,
  allowlists,
  whenTrue,
  whenFalse
) => {
  const currentValues = () => resolveUnion(allowlists)
  return buildAnyCandidateGate({
    gateType: 'anyNotInUnionOf',
    gateObligation,
    currentValues,
    admits: (candidate) => isOutsideUnion(candidate, currentValues()),
    whenTrue,
    whenFalse
  })
}
