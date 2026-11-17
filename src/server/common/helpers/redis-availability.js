import { createLogger } from './logging/logger.js'
import {
  NONE,
  countEvent,
  publishMetricsInBackground
} from './metrics/publish-metrics.js'

/** The `dependency` name of the session store. */
export const REDIS_DEPENDENCY = 'redis'

const DEPENDENCY_DIMENSIONS = Object.freeze({ dependency: REDIS_DEPENDENCY })

/**
 * Follows a Redis client's connection events. Publishes
 * `external.dependency.available` (1 once ready, 0 once closed or ended) on
 * each change and every minute after, logs each change once, counts each
 * change from ready to closed as `external.dependency.connection.lost`, and
 * counts each client error as `external.dependency.error`. All are tagged
 * `dependency` `redis`. Nothing is published before the first event.
 *
 * @param {import('ioredis').Redis | import('ioredis').Cluster} client - the client to follow
 */
export const trackRedisAvailability = (client) => {
  const logger = createLogger()
  const publishEveryMs = 60_000
  let available

  const publishAvailability = () => {
    if (available === undefined) {
      return
    }
    publishMetricsInBackground(DEPENDENCY_DIMENSIONS, [
      {
        name: 'external.dependency.available',
        value: available ? 1 : 0,
        unit: NONE
      }
    ])
  }

  const changeAvailabilityTo = (nowAvailable) => {
    if (nowAvailable === available) {
      return
    }
    const connectionLost = available === true
    available = nowAvailable
    if (nowAvailable) {
      logger.info(DEPENDENCY_DIMENSIONS, 'Redis is available')
    } else {
      logger.warn(DEPENDENCY_DIMENSIONS, 'Redis is unavailable')
    }
    if (connectionLost) {
      countEvent('external.dependency.connection.lost', DEPENDENCY_DIMENSIONS)
    }
    publishAvailability()
  }

  client.on('ready', () => changeAvailabilityTo(true))
  client.on('close', () => changeAvailabilityTo(false))
  client.on('end', () => changeAvailabilityTo(false))
  client.on('error', () =>
    countEvent('external.dependency.error', DEPENDENCY_DIMENSIONS)
  )
  setInterval(publishAvailability, publishEveryMs).unref()
}
