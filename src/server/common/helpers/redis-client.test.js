import { vi } from 'vitest'

import { Cluster, Redis } from 'ioredis'

import { config } from '../../../config/config.js'
import { buildRedisClient } from './redis-client.js'
import { readEmfDocuments } from '../test-helpers/emf-documents.js'
import { recordEcsLogLines } from '../test-helpers/ecs-log-lines.js'

vi.mock('ioredis', async () => {
  const { EventEmitter } = await import('node:events')
  const actual = await vi.importActual('ioredis')

  return {
    ...actual,
    Cluster: vi.fn(function () {
      return new EventEmitter()
    }),
    Redis: vi.fn(function () {
      return new EventEmitter()
    })
  }
})

describe('#buildRedisClient', () => {
  describe('When the client connects', () => {
    const ecsLog = recordEcsLogLines()
    let logSpy

    beforeEach(() => {
      logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      logSpy.mockRestore()
    })

    test('publishes Redis as available and logs the connection once', async () => {
      const client = buildRedisClient(config.get('redis'))

      client.emit('connect')
      client.emit('ready')

      await vi.waitFor(() =>
        expect(
          readEmfDocuments(logSpy).map(
            (document) => document['external.dependency.available']
          )
        ).toEqual([1])
      )
      expect(
        ecsLog
          .lines()
          .map((line) => ({ level: line['log.level'], message: line.message }))
      ).toEqual([{ level: 'info', message: 'Redis is available' }])
    })
  })

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
          port: 6379,
          protocol: 2
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
            protocol: 2,
            tls: {},
            username: 'user'
          }),
          slotsRefreshTimeout: 10000
        })
      )
    })
  })
})
