import { evaluationBindings as addressesBindings } from './evaluation.js'
import { evaluationBindings as contactBindings } from '../contact/evaluation.js'
import { partyOf } from './parties.js'

const buildPartyFulfilmentMap = () => {
  const map = new Map()

  for (const binding of [
    ...addressesBindings.bindings,
    ...contactBindings.bindings
  ]) {
    const party = partyOf(binding.field)
    if (party) {
      const nonIndexedFulfilmentId = binding.obligation.id
      map.set(nonIndexedFulfilmentId, party)
    }
  }

  return map
}

const partyFulfilmentMap = buildPartyFulfilmentMap()

export const partyForFulfilmentId = (fulfilmentId) =>
  partyFulfilmentMap.get(fulfilmentId)

export const fulfilmentIdForParty = (party) => {
  for (const [fulfilmentId, mappedParty] of partyFulfilmentMap) {
    if (mappedParty.id === party.id) {
      return fulfilmentId
    }
  }
  return undefined
}
