import { buildAnyCandidateGate } from './internals/build-any-candidate-gate.js'

// Reduces a per-instance gate to one decision — true if ANY stored value
// on the gate obligation is in the allowlist.
export const anyAllowListed = (gateObligation, values, whenTrue, whenFalse) =>
  buildAnyCandidateGate({
    gateType: 'anyAllowListed',
    gateObligation,
    currentValues: () => (typeof values === 'function' ? values() : values),
    admits: (candidate, allowlist) => allowlist.includes(candidate),
    whenTrue,
    whenFalse
  })
