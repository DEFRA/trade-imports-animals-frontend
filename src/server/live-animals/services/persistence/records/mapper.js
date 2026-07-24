// Both downstream projections are produced from every canonical fulfilment
// snapshot. Neither is a persistence-mode selector.
export {
  fulfilmentToNotification,
  answersToTargetNotification
} from './notification-mapper.js'
