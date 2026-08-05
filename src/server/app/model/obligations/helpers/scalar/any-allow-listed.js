import { readGate } from '../../helper-internals.js'

/**
 * anyAllowListed — scalar aggregation. True if ANY of the gate
 * obligation's stored values is in the allowlist. Returns whenTrue on
 * match, whenFalse on miss. Handles per-line-gate → notification-level-
 * gated shape (e.g. CPH: "any commodity line has a CPH-required code").
 */
export const anyAllowListed = (gateObligation, values, whenTrue, whenFalse) => {
  const currentValues = () => (typeof values === 'function' ? values() : values)
  const fn = (fulfilments) => {
    const { candidates } = readGate(fulfilments, gateObligation.id)
    return candidates.some((v) => currentValues().includes(v))
      ? whenTrue
      : whenFalse
  }
  fn.metadata = {
    type: 'anyAllowListed',
    obligation: gateObligation.id,
    whenTrue,
    whenFalse
  }
  Object.defineProperty(fn.metadata, 'values', {
    enumerable: true,
    get: currentValues
  })
  return fn
}
