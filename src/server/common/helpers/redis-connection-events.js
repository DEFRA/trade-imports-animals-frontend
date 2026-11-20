import { createLogger } from './logging/logger.js'
import { countEvent } from './metrics/publish-metrics.js'
import { publishDependencyAvailabilityInBackground } from './metrics/dependency-availability.js'
import { REDIS_DEPENDENCY } from './redis-dependency.js'

/**
 * Reports a Redis client's connection events as log lines and metrics, all
 * tagged `dependency` `redis`. Publishes `external.dependency.available`
 * (1 once ready, 0 once closed or ended) on each change and every minute
 * after, logs each change once, logs at error when the client stops
 * reconnecting, counts each change from ready to closed as
 * `external.dependency.connection.lost`, and logs and counts each client
 * error, and each error a Cluster client reports from one of its nodes, as
 * `external.dependency.error`. Nothing is published before the first event.
 *
 * @param {import('ioredis').Redis | import('ioredis').Cluster} client - the client to report on
 */
export const reportRedisConnectionEvents = (client) => {
  const logger = createLogger()
  const dependencyDimensions = Object.freeze({ dependency: REDIS_DEPENDENCY })
  const publishEveryMs = 60_000
  let available

  const publishAvailability = () => {
    if (available === undefined) {
      return
    }
    publishDependencyAvailabilityInBackground(REDIS_DEPENDENCY, available)
  }

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
    publishAvailability()
  }

  const recordError = (err) => {
    logger.error({ err, ...dependencyDimensions }, 'Redis connection error')
    countEvent('external.dependency.error', dependencyDimensions)
  }

  client.on('ready', () => changeAvailabilityTo(true))
  client.on('close', () => changeAvailabilityTo(false))
  client.on('end', () => {
    logger.error(dependencyDimensions, 'Redis client stopped reconnecting')
    changeAvailabilityTo(false)
  })
  client.on('error', recordError)
  client.on('node error', recordError)
  setInterval(publishAvailability, publishEveryMs).unref()
}
