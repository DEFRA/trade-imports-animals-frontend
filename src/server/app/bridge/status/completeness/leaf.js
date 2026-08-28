import { isBlankValue } from '../../../model/obligations/is-blank-value.js'
import { effectiveStatus } from '../../../model/obligations/state-queries.js'
import { isAnswered } from '../../../lib/answered.js'
import { obligationFor } from '../obligation-lookup.js'
import { recordMap } from './records.js'

// A leaf is present for a record iff the record's fulfilmentIndex is in
// the leaf's in-scope implication (post-purge membership).
export const leafInScopeForRecord = (name, fulfilmentIndex, state) => {
  const obligation = obligationFor(name)
  const impl = obligation && state.obligations?.[obligation.id]
  if (!impl?.inScope) {
    return false
  }
  return (impl.records ?? []).some((r) => r.fulfilmentIndex === fulfilmentIndex)
}

export const leafMandatoryForRecord = (name, fulfilmentIndex, state) =>
  effectiveStatus(obligationFor(name), fulfilmentIndex, state) === 'mandatory'

export const leafFulfilledForRecord = (name, fulfilmentIndex, state) => {
  const map = recordMap(obligationFor(name), state)
  return map === undefined ? false : !isBlankValue(map[fulfilmentIndex])
}

// A top-level scalar. Flow-only obligations the manifest does not carry
// (submit-time steps like `declaration`) have no fulfilment, so fall back to
// the answered check rather than a phantom fulfilment.
export const singletonFulfilled = (name, answers, state) => {
  const obligation = obligationFor(name)
  return obligation
    ? !isBlankValue(state.fulfilments?.[obligation.id])
    : isAnswered(answers[name])
}
