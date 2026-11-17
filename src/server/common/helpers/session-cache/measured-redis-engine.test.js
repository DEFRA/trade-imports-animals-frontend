import { vi } from 'vitest'

import { MeasuredRedisEngine } from './measured-redis-engine.js'
import { readEmfDocuments } from '../../test-helpers/emf-documents.js'
import { recordEcsLogLines } from '../../test-helpers/ecs-log-lines.js'

const CALL_DURATION = 'external.call.duration'
const CALL_FAILURE = 'external.call.failure'
const CACHE_HIT = 'cache.hit'
const CACHE_MISS = 'cache.miss'
const SESSION_KEY = { segment: 'session', id: 'abc' }

const inMemoryRedisClient = () => {
  const entries = new Map()
  return {
    get: async (key) => entries.get(key) ?? null,
    psetex: async (key, _ttl, value) => {
      entries.set(key, value)
      return 'OK'
    },
    del: async (key) => (entries.delete(key) ? 1 : 0)
  }
}

const documentsHolding = (logSpy, metricName) =>
  readEmfDocuments(logSpy).filter((document) => metricName in document)

describe('MeasuredRedisEngine', () => {
  const ecsLog = recordEcsLogLines()
  let logSpy
  let engine

  beforeEach(async () => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    engine = new MeasuredRedisEngine({ client: inMemoryRedisClient() })
    await engine.start()
  })

  afterEach(() => {
    logSpy.mockRestore()
  })

  test('a get of a key it holds returns the stored item, records one redis get and counts a cache hit for the segment', async () => {
    await engine.set(SESSION_KEY, { user: 'u-1' }, 60_000)

    const cached = await engine.get(SESSION_KEY)

    expect(cached.item).toEqual({ user: 'u-1' })
    await vi.waitFor(() =>
      expect(documentsHolding(logSpy, CACHE_HIT)).toHaveLength(1)
    )
    const [hit] = documentsHolding(logSpy, CACHE_HIT)
    expect(hit._aws.CloudWatchMetrics[0].Dimensions).toEqual([['cache']])
    expect(hit.cache).toBe('session')
    const gets = documentsHolding(logSpy, CALL_DURATION).filter(
      ({ operation }) => operation === 'get'
    )
    expect(gets).toEqual([
      expect.objectContaining({
        dependency: 'redis',
        [CALL_FAILURE]: 0
      })
    ])
    expect(documentsHolding(logSpy, CACHE_MISS)).toEqual([])
  })

  test('a get of a key it does not hold returns nothing and counts a cache miss', async () => {
    const cached = await engine.get({ segment: 'auth-sessions', id: 'none' })

    expect(cached).toBeNull()
    await vi.waitFor(() =>
      expect(documentsHolding(logSpy, CACHE_MISS)).toHaveLength(1)
    )
    expect(documentsHolding(logSpy, CACHE_MISS)[0].cache).toBe('auth-sessions')
  })

  test('a set and a drop are each recorded as one redis call with an external-call line', async () => {
    await engine.set(SESSION_KEY, { user: 'u-1' }, 60_000)
    await engine.drop(SESSION_KEY)

    await vi.waitFor(() =>
      expect(documentsHolding(logSpy, CALL_DURATION)).toHaveLength(2)
    )
    expect(
      documentsHolding(logSpy, CALL_DURATION).map(({ operation }) => operation)
    ).toEqual(['set', 'drop'])
    expect(
      ecsLog
        .lines()
        .filter((line) => line.event?.category === 'external-call')
        .map((line) => line.event.action)
    ).toEqual(['redis/set', 'redis/drop'])
  })

  test('a get the client fails is rethrown and recorded as a failed redis get', async () => {
    const lost = new Error('Connection is closed.')
    const failing = new MeasuredRedisEngine({
      client: {
        get: async () => {
          throw lost
        }
      }
    })
    await failing.start()

    await expect(failing.get(SESSION_KEY)).rejects.toBe(lost)

    await vi.waitFor(() =>
      expect(documentsHolding(logSpy, CALL_FAILURE)).toHaveLength(1)
    )
    expect(documentsHolding(logSpy, CALL_FAILURE)[0][CALL_FAILURE]).toBe(1)
  })
})
