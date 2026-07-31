// Native mappers from canonical UUID-keyed fulfilment to backend notifications.
//
// Mapper A (fulfilmentToNotification) reproduces exactly what the production
// skeleton frontend persists — the same backend field homes and transforms as
// src/server/common/clients/notification-client.js (buildNotificationPayload).
//
// Mapper B (answersToTargetNotification) is Mapper A plus the durable extra
// fields, including the per-species commodity lines. Despite its legacy name,
// it reads the same canonical fulfilment snapshot as Mapper A and layers its
// extras over Mapper A's base.

export { fulfilmentToNotification } from './mapper-a/index.js'
export { answersToTargetNotification } from './mapper-b/index.js'
