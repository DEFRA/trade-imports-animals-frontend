import { groupIds, obligationsById } from '../obligations/lookup.js'
import { fail } from '../fail.js'

export const validateCurrentForm = (obligationId, form) => {
  const obligation = obligationsById.get(obligationId)
  if (!obligation) return

  if (groupIds.has(obligationId)) {
    fail(`structural group ${obligationId} cannot carry a fulfilment`)
  }

  const expectedForm = obligation.within ? 'records' : 'value'
  if (form !== expectedForm) {
    fail(`obligation ${obligationId} must use ${expectedForm}`)
  }
}
