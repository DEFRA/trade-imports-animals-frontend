import { listsGateValue } from '../helper-internals.js'
import { buildGate } from './internals/build-gate.js'

/**
 * allowListedPairs — in scope on entries where the stored values of
 * `gateObligation` and `pairedObligation`, read at the same
 * fulfilmentIndex, form a listed `[gate value, paired value]` pair.
 * `gatedParentGroup` and `reasons` work as they do for `allowListed`.
 */
export const allowListedPairs = (
  gateObligation,
  pairedObligation,
  pairs,
  gatedParentGroup,
  reasons
) => {
  const currentValues = () => (typeof pairs === 'function' ? pairs() : pairs)
  return buildGate({
    gateType: 'allowListedPairs',
    gateObligation,
    pairedObligation,
    currentValues,
    admits: (pair) => listsGateValue(currentValues(), pair),
    gatedParentGroup,
    reasons
  })
}
