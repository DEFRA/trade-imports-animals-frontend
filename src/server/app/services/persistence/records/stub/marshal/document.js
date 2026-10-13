import { isSubmittedStatus } from '../../../../../engine/persistence/records.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'
import { answersChangedSinceSubmission } from './answers-changed.js'

export const marshal = (document) => ({
  journeyId: document.id,
  status: document.status,
  createdAt: document.createdAt,
  submittedAt: document.submittedAt,
  outstandingItems: isSubmittedStatus(document.status)
    ? (document.outstandingItems ?? [])
    : [],
  concurrencyToken: document.concurrencyToken ?? 0,
  answersChangedSinceSubmission: answersChangedSinceSubmission(document),
  fulfilment: decodePersistedFulfilment(document.fulfilment)
})
