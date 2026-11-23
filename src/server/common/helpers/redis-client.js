import { Cluster, Redis } from 'ioredis'

import { reportRedisConnectionEvents } from './redis-connection-events.js'

/**
 * Builds a Redis client that speaks RESP2: a single-instance client when
 * `useSingleInstanceCache` is set, otherwise a Cluster client. The client
 * reports its connection events (see `reportRedisConnectionEvents`).
 *
 * @param {{ host: string, keyPrefix: string, username: string, password: string, useSingleInstanceCache: boolean, useTLS: boolean }} redisConfig - where and how to connect
 * @returns {import('ioredis').Redis | import('ioredis').Cluster} the client
 */
export function buildRedisClient(redisConfig) {
  const port = 6379
  const db = 0
  const resp2Protocol = 2
  const keyPrefix = redisConfig.keyPrefix
  const host = redisConfig.host
  let redisClient

  const credentials =
    redisConfig.username === ''
      ? {}
      : {
          username: redisConfig.username,
          password: redisConfig.password
        }
  const tls = redisConfig.useTLS ? { tls: {} } : {}

  if (redisConfig.useSingleInstanceCache) {
    redisClient = new Redis({
      port,
      host,
      db,
      protocol: resp2Protocol,
      keyPrefix,
      ...credentials,
      ...tls
    })
  } else {
    redisClient = new Cluster(
      [
        {
          host,
          port
        }
      ],
      {
        keyPrefix,
        slotsRefreshTimeout: 10000,
        dnsLookup: (address, callback) => callback(null, address),
        redisOptions: {
          db,
          protocol: resp2Protocol,
          ...credentials,
          ...tls
        }
      }
    )
  }

  reportRedisConnectionEvents(redisClient)

  return redisClient
}
