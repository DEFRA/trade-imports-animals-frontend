import { SUBMITTED } from '../../../../../engine/persistence/records.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'
import { mapStatus } from '../status.js'

export const marshal = (document) => {
  const status = mapStatus(document.status)
  return {
    journeyId: document.id,
    status,
    createdAt: document.createdAt ?? null,
    submittedAt: status === SUBMITTED ? (document.submittedAt ?? null) : null,
    fulfilment: decodePersistedFulfilment(document.fulfilment)
  }
}
