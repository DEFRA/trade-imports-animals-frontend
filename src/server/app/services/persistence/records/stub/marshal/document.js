import { AMEND } from '../../../../../engine/persistence/records.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'
import { fulfilmentToNotification } from '../../mapper.js'

const notificationJsonOf = (persistedFulfilment, journeyId) =>
  JSON.stringify(
    fulfilmentToNotification(
      decodePersistedFulfilment(persistedFulfilment),
      journeyId
    )
  )

const answersDifferFromSubmitted = (document) => {
  if (document.status !== AMEND || document.submittedSnapshot == null) {
    return false
  }
  return (
    notificationJsonOf(document.fulfilment, document.id) !==
    notificationJsonOf(document.submittedSnapshot.fulfilment, document.id)
  )
}

export const marshal = (document) => ({
  journeyId: document.id,
  status: document.status,
  createdAt: document.createdAt,
  submittedAt: document.submittedAt,
  concurrencyToken: document.concurrencyToken ?? 0,
  fulfilment: decodePersistedFulfilment(document.fulfilment),
  answersDifferFromSubmitted: answersDifferFromSubmitted(document)
})
