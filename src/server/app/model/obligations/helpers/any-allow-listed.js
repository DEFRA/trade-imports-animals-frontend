import { buildAnyCandidateGate } from './internals/build-any-candidate-gate.js'

export const anyAllowListed = (gateObligation, values, whenTrue, whenFalse) => {
  const currentValues = () => (typeof values === 'function' ? values() : values)
  return buildAnyCandidateGate({
    gateType: 'anyAllowListed',
    gateObligation,
    currentValues,
    admits: (candidate) => currentValues().includes(candidate),
    whenTrue,
    whenFalse
  })
}
