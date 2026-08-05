// Native mapper from canonical UUID-keyed fulfilment to backend notification.
//
// Mapper A (fulfilmentToNotification) reproduces exactly what the production
// skeleton frontend persists — the same backend field homes and transforms as
// src/server/common/clients/notification-client.js (buildNotificationPayload).

export { fulfilmentToNotification } from './mapper-a/index.js'
