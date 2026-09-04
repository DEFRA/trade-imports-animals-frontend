import { SUBMITTED } from '../../../../../engine/persistence/records.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'
import { mapStatus } from '../status.js'

export const marshal = (document) => {
  const status = mapStatus(document.status)
  return {
    journeyId: document.referenceNumber,
    status,
    createdAt: document.created ?? null,
    submittedAt: status === SUBMITTED ? (document.submittedAt ?? null) : null,
    concurrencyToken: document.concurrencyToken ?? null,
    // The parties as they stood at submit. Carried only for a submitted
    // notification, which renders from them instead of resolving its address
    // references live. A draft or an in-flight amendment is meant to reflect
    // address edits, so it resolves and this stays null.
    //
    // `submittedNotificationBaseline` is the backend's own field name, exposed
    // by NotificationFulfilmentsView. It is a cross-repo contract that nothing
    // here can typecheck: if the backend renames the field, this silently reads
    // undefined and every submitted notification quietly falls back to a live
    // resolve. Only E2E catches that.
    frozenParties:
      status === SUBMITTED
        ? (document.submittedNotificationBaseline ?? null)
        : null,
    fulfilment: decodePersistedFulfilment(document.fulfilments)
  }
}
