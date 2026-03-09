import { vi } from 'vitest'

import { Cluster, Redis } from 'ioredis'

import { config } from '../../../config/config.js'
import { buildRedisClient } from './redis-client.js'

vi.mock('ioredis', async () => {
  const actual = await vi.importActual('ioredis')

  return {
    ...actual,
    Cluster: vi.fn(function () {
      return { on: () => ({}) }
    }),
    Redis: vi.fn(function () {
      return { on: () => ({}) }
    })
  }
})

describe('#buildRedisClient', () => {
  describe('When Redis Single InstanceCache is requested', () => {
    beforeEach(() => {
      buildRedisClient(config.get('redis'))
    })

    test('Should instantiate a single Redis client', () => {
      expect(Redis).toHaveBeenCalledWith(
        expect.objectContaining({
          db: 0,
          host: config.get('redis').host,
          keyPrefix: 'trade-imports-animals-frontend:',
          port: 6379
        })
      )
    })
  })

  describe('When a Redis Cluster is requested', () => {
    beforeEach(() => {
      buildRedisClient({
        ...config.get('redis'),
        useSingleInstanceCache: false,
        useTLS: true,
        username: 'user',
        password: 'pass'
      })
    })

    test('Should instantiate a Redis Cluster client', () => {
      expect(Cluster).toHaveBeenCalledWith(
        [{ host: config.get('redis').host, port: 6379 }],
        expect.objectContaining({
          dnsLookup: expect.any(Function),
          keyPrefix: 'trade-imports-animals-frontend:',
          redisOptions: expect.objectContaining({
            db: 0,
            password: 'pass',
            tls: {},
            username: 'user'
          }),
          slotsRefreshTimeout: 10000
        })
      )
    })
  })
})
