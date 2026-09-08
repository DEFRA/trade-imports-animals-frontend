import { SUBMITTED } from '../../../../../engine/persistence/records.js'
import { mapStatus } from '../status.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'

export const marshal = (document) => {
  const status = mapStatus(document.status)
  return {
    journeyId: document.referenceNumber,
    status,
    createdAt: document.created ?? null,
    submittedAt: status === SUBMITTED ? (document.submittedAt ?? null) : null,
    concurrencyToken: document.concurrencyToken ?? null,
    fulfilment: decodePersistedFulfilment(document.fulfilments)
  }
}
