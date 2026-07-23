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
import { projectAnswers } from '../../../bridge/fulfilments.js'

const useB = () => (process.env.LIVE_ANIMALS_MAPPER ?? 'a') === 'b'

// Mapper B remains answers-based until increment 7. Keep its legacy edge
// projection isolated to that opt-in path; Mapper A reads canonical fulfilment
// directly.
const answersForTargetNotification = (fulfilment) => {
  const answers = projectAnswers(fulfilment)
  if (!Array.isArray(answers.commodityLines)) return answers
  return {
    ...answers,
    commodityLines: answers.commodityLines.map((line) => ({
      ...line,
      ...(typeof line.numberOfAnimalsQuantity === 'number'
        ? { numberOfAnimalsQuantity: String(line.numberOfAnimalsQuantity) }
        : {})
    }))
  }
}

export const toNotification = (fulfilment, referenceNumber) =>
  useB()
    ? answersToTargetNotification({
        ...answersForTargetNotification(fulfilment),
        referenceNumber
      })
    : fulfilmentToNotification(fulfilment, referenceNumber)

export const toAnswers = (notification) =>
  (useB() ? targetNotificationToAnswers : notificationToAnswers)(notification)
