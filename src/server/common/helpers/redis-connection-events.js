import { createLogger } from './logging/logger.js'
import { countEventInBackground } from './metrics/publish-metrics.js'
import {
  publishDependencyAvailabilityInBackground,
  recordDependencyAvailability
} from './metrics/dependency-availability.js'

/**
 * Reports a Redis client's connection events as log lines and metrics. Each
 * line carries `event.category` `external-dependency` and `event.action`
 * `redis/<client event>`, such as `redis/close`; each metric is tagged
 * `dependency` `redis`. Publishes `external.dependency.available` (1 once
 * ready, 0 once closed or ended) on each change, and records it as Redis's
 * availability, published every minute. Logs each change once, logs at error
 * when the client stops reconnecting, counts each change from ready to closed
 * as `external.dependency.connection.lost`, and logs and counts each client
 * error, and each error a Cluster client reports from one of its nodes (logged
 * with the node's `server.address`), as `external.dependency.error`.
 * Availability is not published until the client is first ready, closed or
 * ended.
 *
 * @param {import('ioredis').Redis | import('ioredis').Cluster} client - the client to report on
 */
export const reportRedisConnectionEvents = (client) => {
  const logger = createLogger()
  const dependency = 'redis'
  const dependencyDimensions = Object.freeze({ dependency })
  let available

  const clientEventFields = (clientEvent) => ({
    event: {
      category: 'external-dependency',
      action: `${dependency}/${clientEvent}`
    }
  })

  const changeAvailabilityTo = (nowAvailable, clientEvent) => {
    if (nowAvailable === available) {
      return
    }
    const connectionLost = available === true
    available = nowAvailable
    if (nowAvailable) {
      logger.info(clientEventFields(clientEvent), 'Redis is available')
    } else {
      logger.warn(clientEventFields(clientEvent), 'Redis is unavailable')
    }
    if (connectionLost) {
      countEventInBackground(
        'external.dependency.connection.lost',
        dependencyDimensions
      )
    }
    recordDependencyAvailability({ dependency, available })
    publishDependencyAvailabilityInBackground({ dependency, available })
  }

  const recordError = (err, clientEvent, logFields) => {
    logger.error(
      { err, ...clientEventFields(clientEvent), ...logFields },
      'Redis connection error'
    )
    countEventInBackground('external.dependency.error', dependencyDimensions)
  }

  client.on('ready', () => changeAvailabilityTo(true, 'ready'))
  client.on('close', () => changeAvailabilityTo(false, 'close'))
  client.on('end', () => {
    logger.error(clientEventFields('end'), 'Redis client stopped reconnecting')
    changeAvailabilityTo(false, 'end')
  })
  client.on('error', (err) => recordError(err, 'error'))
  client.on('node error', (err, address) =>
    recordError(err, 'node-error', { server: { address } })
  )
}
