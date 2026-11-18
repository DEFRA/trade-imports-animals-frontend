import { createLogger } from './logging/logger.js'
import {
  NONE,
  countEvent,
  publishMetricsInBackground
} from './metrics/publish-metrics.js'
import { REDIS_DEPENDENCY } from './redis-dependency.js'

const DEPENDENCY_DIMENSIONS = Object.freeze({ dependency: REDIS_DEPENDENCY })

/**
 * Reports a Redis client's connection events as log lines and metrics, all
 * tagged `dependency` `redis`. Publishes `external.dependency.available`
 * (1 once ready, 0 once closed or ended) on each change and every minute
 * after, logs each change once, counts each change from ready to closed as
 * `external.dependency.connection.lost`, and logs and counts each client
 * error, and each error a Cluster client reports from one of its nodes, as
 * `external.dependency.error`. Nothing is published before the first event.
 *
 * @param {import('ioredis').Redis | import('ioredis').Cluster} client - the client to report on
 */
export const reportRedisConnectionEvents = (client) => {
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

  const recordError = (err) => {
    logger.error({ err, ...DEPENDENCY_DIMENSIONS }, 'Redis connection error')
    countEvent('external.dependency.error', DEPENDENCY_DIMENSIONS)
  }

  client.on('ready', () => changeAvailabilityTo(true))
  client.on('close', () => changeAvailabilityTo(false))
  client.on('end', () => changeAvailabilityTo(false))
  client.on('error', recordError)
  client.on('node error', recordError)
  setInterval(publishAvailability, publishEveryMs).unref()
}
