import { OUTSTANDING_HEALTH_CERTIFICATE } from '../../../../engine/persistence/records.js'
import { obligationSet } from '../../../../model/obligations/manifest.js'
import { decodePersistedFulfilment } from '../fulfilment-codec/index.js'

// The backend's own test (OutstandingItem), the stub standing in for it.
const HEALTH_CERTIFICATE_TYPES = new Set(['ITAHC', 'HEALTH_CERTIFICATE'])

/** What a submission with this stored fulfilment still owes. */
export const outstandingItemsOf = (storedFulfilment) => {
  const { accompanyingDocumentType } = obligationSet()
  if (accompanyingDocumentType === undefined) {
    return []
  }
  const decoded = decodePersistedFulfilment(storedFulfilment)
  const types = Object.values(decoded[accompanyingDocumentType.id] ?? {})
  return types.some((type) => HEALTH_CERTIFICATE_TYPES.has(type))
    ? []
    : [OUTSTANDING_HEALTH_CERTIFICATE]
}
