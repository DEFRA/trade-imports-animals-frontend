import { readGate } from '../../helper-internals.js'
import { stampGateMetadata } from './stamp-gate-metadata.js'

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
    return candidates.some((candidate) => admits(candidate))
      ? whenTrue
      : whenFalse
  }
  return stampGateMetadata(gate, {
    gateType,
    gateObligation,
    currentValues,
    whenTrue,
    whenFalse
  })
}
