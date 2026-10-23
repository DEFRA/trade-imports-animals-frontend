import { isOutsideUnion, resolveUnion } from '../helper-internals.js'
import { buildGate } from './internals/build-gate.js'

/**
 * notInUnionOf — dual of `allowListed`. In scope on entries whose
 * `gateObligation` stored value is not blank and not in the union of the
 * given allowlists. The union is derived at call-time and exposed on
 * `.metadata.values`.
 *
 * Accepts either `[[a, b], [c, d]]` (list of allowlists — duplicates
 * collapse) or `[a, b, c]` (flat single-list shorthand).
 */
export const notInUnionOf = (
  gateObligation,
  unionOfAllowlists,
  gatedParentGroup,
  reasons
) => {
  const currentValues = () => resolveUnion(unionOfAllowlists)
  return buildGate({
    gateType: 'notInUnionOf',
    gateObligation,
    currentValues,
    admits: (value) => isOutsideUnion(value, currentValues()),
    gatedParentGroup,
    reasons
  })
}
