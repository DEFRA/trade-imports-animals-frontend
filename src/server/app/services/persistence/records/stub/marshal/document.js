import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'

/** No `frozenParties` here, unlike the real adapter's marshal. Freezing a
 * submitted notification's addresses happens in the backend at submit, and the
 * stub has no address-book resolution to do it with — so a submitted journey in
 * stub mode still resolves its references live. The check-answers controller
 * falls back to live resolution when `frozenParties` is absent, so stub mode
 * behaves exactly as it did before the freeze existed. */
export const marshal = (document) => ({
  journeyId: document.id,
  status: document.status,
  createdAt: document.createdAt,
  submittedAt: document.submittedAt,
  concurrencyToken: document.concurrencyToken ?? 0,
  fulfilment: decodePersistedFulfilment(document.fulfilment)
})
