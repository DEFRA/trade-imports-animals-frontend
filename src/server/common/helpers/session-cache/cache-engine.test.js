import { Redis } from 'ioredis'
import { vi } from 'vitest'

import { HitCountingRedisEngine } from './hit-counting-redis-engine.js'
import { Engine as CatboxMemory } from '@hapi/catbox-memory'

import { getCacheEngine } from './cache-engine.js'
import { config } from '../../../../config/config.js'

const mockLoggerInfo = vi.fn()
const mockLoggerError = vi.fn()

vi.mock('ioredis', () => ({
  Cluster: vi.fn(function () {
    return { on: () => ({}) }
  }),
  Redis: vi.fn(function () {
    return { on: () => ({}) }
  })
}))
vi.mock('../logging/logger.js', () => ({
  createLogger: () => ({
    info: (...args) => mockLoggerInfo(...args),
    error: (...args) => mockLoggerError(...args)
  })
}))

describe('#getCacheEngine', () => {
  describe('When Redis cache engine has been requested', () => {
    let engine

    beforeEach(() => {
      engine = getCacheEngine('redis')
    })

    test('Should setup the hit-counting Redis cache on the built Redis client', () => {
      const [builtClient] = vi.mocked(Redis).mock.results
      expect(engine).toBeInstanceOf(HitCountingRedisEngine)
      expect(engine.settings.client).toBe(builtClient.value)
    })

    test('Should log expected Redis message', () => {
      expect(mockLoggerInfo).toHaveBeenCalledWith('Using Redis session cache')
    })
  })

  describe('When In memory cache engine has been requested', () => {
    let engine

    beforeEach(() => {
      engine = getCacheEngine()
    })

    test('Should setup In memory cache', () => {
      expect(engine).toBeInstanceOf(CatboxMemory)
    })

    test('Should log expected CatBox memory message', () => {
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Using Catbox Memory session cache'
      )
    })
  })

  describe('When In memory cache engine has been requested in Production', () => {
    let engine

    beforeEach(() => {
      config.set('isProduction', true)
      engine = getCacheEngine()
    })

    test('Should log Production warning message', () => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Catbox Memory is for local development only, it should not be used in production!'
      )
    })

    test('Should setup In memory cache', () => {
      expect(engine).toBeInstanceOf(CatboxMemory)
    })

    test('Should log expected message', () => {
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Using Catbox Memory session cache'
      )
    })
  })
})
