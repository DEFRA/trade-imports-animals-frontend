import {
  AMEND,
  isSubmittedStatus
} from '../../../../../engine/persistence/records.js'
import { mapStatus } from '../status.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'

export const marshal = (document) => {
  const status = mapStatus(document.status)
  return {
    journeyId: document.referenceNumber,
    status,
    createdAt: document.created ?? null,
    submittedAt: isSubmittedStatus(status)
      ? (document.submittedAt ?? null)
      : null,
    outstandingItems: isSubmittedStatus(status)
      ? (document.outstandingItems ?? [])
      : [],
    concurrencyToken: document.concurrencyToken ?? null,
    answersChangedSinceSubmission:
      status === AMEND && document.answersChangedSinceSubmission === true,
    fulfilment: decodePersistedFulfilment(document.fulfilments)
  }
}
