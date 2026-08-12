import { SUBMITTED } from '../../../../../engine/persistence/records.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'
import { mapStatus } from '../status.js'

export const marshalNotification = (document) => {
  const status = mapStatus(document.status)
  return {
    journeyId: document.referenceNumber,
    status,
    createdAt: document.created ?? null,
    submittedAt: status === SUBMITTED ? (document.submittedAt ?? null) : null,
    // Engine-facing key stays as `fulfilment` (a UUID-keyed map);
    // wire read uses the renamed `fulfilments` list. See follow-up ticket for
    // the engine-facing rename.
    fulfilment: decodePersistedFulfilment(document.fulfilments)
  }
}

export const marshalFulfilmentView = (document) => {
  const status = mapStatus(document.status)
  return {
    journeyId: document.id,
    status,
    createdAt: document.createdAt ?? null,
    submittedAt: status === SUBMITTED ? (document.submittedAt ?? null) : null,
    // Engine-facing key stays as `fulfilment` (a UUID-keyed map);
    // wire read uses the renamed `fulfilments` list. See follow-up ticket for
    // the engine-facing rename.
    fulfilment: decodePersistedFulfilment(document.fulfilments)
  }
}
