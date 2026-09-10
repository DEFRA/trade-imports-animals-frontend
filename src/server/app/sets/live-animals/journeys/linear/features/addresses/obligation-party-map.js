import { evaluationBindings as addressesBindings } from './evaluation.js'
import { evaluationBindings as contactBindings } from '../contact/evaluation.js'
import { partyOf } from './parties.js'

const buildObligationPartyMap = () => {
  const map = new Map()

  for (const binding of [
    ...addressesBindings.bindings,
    ...contactBindings.bindings
  ]) {
    if (binding.kind !== 'scalar') {
      continue
    }
    const party = partyOf(binding.field)
    if (party) {
      map.set(binding.obligation.id, party)
    }
  }

  return map
}

export const obligationPartyMap = buildObligationPartyMap()

export const partyForFulfilmentId = (fulfilmentId) =>
  obligationPartyMap.get(fulfilmentId)
