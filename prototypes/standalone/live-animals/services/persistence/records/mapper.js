// Runtime selector between the two notification mappers. Mapper A (the
// skeleton-exact, storable-only default) is used unless LIVE_ANIMALS_MAPPER=b
// opts into Mapper B's lossless superset. Read at call time — not import time —
// so it is switchable per test/run, mirroring services/mode.js and
// services/persistence/it-mode.js.

import {
  fulfilmentToNotification,
  notificationToAnswers,
  answersToTargetNotification,
  targetNotificationToAnswers
} from './notification-mapper.js'

const useB = () => (process.env.LIVE_ANIMALS_MAPPER ?? 'a') === 'b'

export const toNotification = (fulfilment, referenceNumber) =>
  useB()
    ? answersToTargetNotification(fulfilment, referenceNumber)
    : fulfilmentToNotification(fulfilment, referenceNumber)

export const toAnswers = (notification) =>
  (useB() ? targetNotificationToAnswers : notificationToAnswers)(notification)
