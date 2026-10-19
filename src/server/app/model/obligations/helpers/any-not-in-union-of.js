import { readGate } from '../helper-internals.js'
import { deriveUnion } from './internals/derive-union.js'

const isBlank = (value) => value === undefined || value === null || value === ''

// Dual of `anyAllowListed` — true if ANY stored value on the gate
// obligation is outside the union of the given lists. For a rule that
// names the exceptions rather than the members ("cph unless every
// commodity line's code is exempt"), when the members are open-ended.
// A blank value has no code yet, so it is ignored rather than counted
// as outside the union.
export const anyNotInUnionOf = (
  gateObligation,
  unionOfLists,
  whenTrue,
  whenFalse
) => {
  const currentValues = () =>
    deriveUnion(
      typeof unionOfLists === 'function' ? unionOfLists() : unionOfLists
    )
  const fn = (fulfilments) => {
    const { candidates } = readGate(fulfilments, gateObligation.id)
    return candidates.some((v) => !isBlank(v) && !currentValues().includes(v))
      ? whenTrue
      : whenFalse
  }
  fn.metadata = {
    gateType: 'anyNotInUnionOf',
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
