import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'

export const marshal = (document) => ({
  journeyId: document.id,
  status: document.status,
  createdAt: document.createdAt,
  submittedAt: document.submittedAt,
  concurrencyToken: document.concurrencyToken ?? 0,
  fulfilment: decodePersistedFulfilment(document.fulfilment)
})
