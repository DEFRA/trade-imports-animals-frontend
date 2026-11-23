import { createLogger } from './logging/logger.js'
import { countEvent } from './metrics/publish-metrics.js'
import {
  publishDependencyAvailabilityInBackground,
  recordDependencyAvailability
} from './metrics/dependency-availability.js'

/**
 * Reports a Redis client's connection events as log lines and metrics, all
 * tagged `dependency` `redis`. Publishes `external.dependency.available`
 * (1 once ready, 0 once closed or ended) on each change, and records it as
 * Redis's availability, published every minute. Logs each change once, logs at error when the client stops reconnecting,
 * counts each change from ready to closed as
 * `external.dependency.connection.lost`, and logs and counts each client
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

  const changeAvailabilityTo = (nowAvailable) => {
    if (nowAvailable === available) {
      return
    }
    const connectionLost = available === true
    available = nowAvailable
    if (nowAvailable) {
      logger.info(dependencyDimensions, 'Redis is available')
    } else {
      logger.warn(dependencyDimensions, 'Redis is unavailable')
    }
    if (connectionLost) {
      countEvent('external.dependency.connection.lost', dependencyDimensions)
    }
    recordDependencyAvailability({ dependency, available })
    publishDependencyAvailabilityInBackground({ dependency, available })
  }

  const recordError = (err, logFields) => {
    logger.error(
      { err, ...dependencyDimensions, ...logFields },
      'Redis connection error'
    )
    countEvent('external.dependency.error', dependencyDimensions)
  }

  client.on('ready', () => changeAvailabilityTo(true))
  client.on('close', () => changeAvailabilityTo(false))
  client.on('end', () => {
    logger.error(dependencyDimensions, 'Redis client stopped reconnecting')
    changeAvailabilityTo(false)
  })
  client.on('error', (err) => recordError(err))
  client.on('node error', (err, address) =>
    recordError(err, { server: { address } })
  )
}
