import { readGate } from '../../helper-internals.js'

// Reduces a per-instance gate to one decision — true if ANY stored value
// on the gate obligation is in the allowlist. Handles the "cph reads ANY
// commodityCode across commodity lines" shape (per-line gate feeding a
// notification-level gated obligation).
export const anyAllowListed = (gateObligation, values, whenTrue, whenFalse) => {
  const currentValues = () => (typeof values === 'function' ? values() : values)
  const fn = (fulfilments) => {
    const { candidates } = readGate(fulfilments, gateObligation.id)
    return candidates.some((v) => currentValues().includes(v))
      ? whenTrue
      : whenFalse
  }
  fn.metadata = {
    gateType: 'anyAllowListed',
    obligationId: gateObligation.id,
    whenTrue,
    whenFalse
  }
  Object.defineProperty(fn.metadata, 'values', {
    enumerable: true,
    get: currentValues
  })
  return fn
}
