import { SUBMITTED } from '../../../../../engine/persistence/records.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'
import { mapStatus } from '../status.js'

// Handles two response shapes:
// - Fulfilment-view projection (`GET /notifications/{ref}/fulfilments`): exposes
//   `id` (= referenceNumber via @Value) and `createdAt` (= created via @Value).
// - Notification entity (`POST /notifications`, `PUT /notifications/{ref}`,
//   `POST /notifications/{ref}/{lifecycle}`): exposes `referenceNumber` and `created`
//   directly; also has a Mongo `id` (_id) which is not the reference number.
// Prefer the notification-shape fields when present, fall back to the
// fulfilment-view fields for the read endpoint.
export const marshal = (document) => {
  const status = mapStatus(document.status)
  return {
    journeyId: document.referenceNumber ?? document.id,
    status,
    createdAt: document.created ?? document.createdAt ?? null,
    submittedAt: status === SUBMITTED ? (document.submittedAt ?? null) : null,
    // Engine-facing key stays as `fulfilment` (a UUID-keyed map);
    // wire read uses the renamed `fulfilments` list. See follow-up ticket for
    // the engine-facing rename.
    fulfilment: decodePersistedFulfilment(document.fulfilments)
  }
}
