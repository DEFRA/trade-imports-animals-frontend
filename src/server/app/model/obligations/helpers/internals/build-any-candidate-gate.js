import { readGate } from '../../helper-internals.js'

export const buildAnyCandidateGate = ({
  gateType,
  gateObligation,
  currentValues,
  admits,
  whenTrue,
  whenFalse
}) => {
  const gate = (fulfilments) => {
    const { candidates } = readGate(fulfilments, gateObligation.id)
    return candidates.some((candidate) => admits(candidate, currentValues()))
      ? whenTrue
      : whenFalse
  }
  gate.metadata = {
    gateType,
    obligationId: gateObligation.id,
    whenTrue,
    whenFalse
  }
  Object.defineProperty(gate.metadata, 'values', {
    enumerable: true,
    get: currentValues
  })
  return gate
}
