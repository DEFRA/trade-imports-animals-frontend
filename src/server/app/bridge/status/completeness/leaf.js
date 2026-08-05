import { isBlankValue } from '../../../model/obligations/is-blank-value.js'
import { effectiveStatus } from '../../../model/obligations/state-queries.js'
import { isAnswered } from '../../../lib/answered.js'
import { obligationFor } from '../obligation-lookup.js'
import { recordMap } from './records.js'

// A leaf is present for a record iff the record's fulfilmentId is in the
// leaf's in-scope implication (post-purge membership).
export const leafInScopeForRecord = (name, recId, state) => {
  const obligation = obligationFor(name)
  const impl = obligation && state.obligations?.[obligation.id]
  if (!impl?.inScope) {
    return false
  }
  return (impl.records ?? []).some((r) => r.fulfilmentId === recId)
}

export const leafMandatoryForRecord = (name, recId, state) =>
  effectiveStatus(obligationFor(name), recId, state) === 'mandatory'

export const leafFulfilledForRecord = (name, recId, state) => {
  const map = recordMap(obligationFor(name), state)
  return map === undefined ? false : !isBlankValue(map[recId])
}

// A top-level scalar. Flow-only obligations the manifest does not carry
// (pre-flow filters like `importType`) have no fulfilment, so fall back to the
// answered check rather than a phantom fulfilment.
export const singletonFulfilled = (name, answers, state) => {
  const obligation = obligationFor(name)
  return obligation
    ? !isBlankValue(state.fulfilments?.[obligation.id])
    : isAnswered(answers[name])
}
