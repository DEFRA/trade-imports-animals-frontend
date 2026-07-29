import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'

export const marshal = (document) => ({
  journeyId: document.id,
  userId: document.userId,
  status: document.status,
  createdAt: document.createdAt,
  submittedAt: document.submittedAt,
  fulfilment: decodePersistedFulfilment(document.fulfilment)
})
