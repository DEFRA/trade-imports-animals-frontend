import { getFulfilment } from '../http/get-fulfilment.js'
import { mapStatus } from '../status.js'

export const resolveStatus = async (journeyId, known) => {
  if (known != null && known.journeyId === journeyId) {
    return known.status
  }
  const existing = await getFulfilment(journeyId)
  if (existing === undefined) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  return mapStatus(existing.status)
}
