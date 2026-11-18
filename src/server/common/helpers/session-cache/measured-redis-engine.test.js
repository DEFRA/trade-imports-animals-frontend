import { vi } from 'vitest'

import { MeasuredRedisEngine } from './measured-redis-engine.js'
import { recordEmfDocuments } from '../../test-helpers/emf-documents.js'
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

describe('MeasuredRedisEngine', () => {
  const ecsLog = recordEcsLogLines()
  const emf = recordEmfDocuments()
  let engine

  beforeEach(async () => {
    engine = new MeasuredRedisEngine({ client: inMemoryRedisClient() })
    await engine.start()
  })

  test('a get of a key it holds returns the stored item, records one redis get and counts a cache hit for the segment', async () => {
    await engine.set(SESSION_KEY, { user: 'u-1' }, 60_000)

    const cached = await engine.get(SESSION_KEY)

    expect(cached.item).toEqual({ user: 'u-1' })
    await vi.waitFor(() =>
      expect(emf.publishesOf(CACHE_HIT)).toEqual([
        { value: 1, unit: 'Count', dimensions: { cache: 'session' } }
      ])
    )
    const gets = emf
      .documentsWith(CALL_DURATION)
      .filter(({ operation }) => operation === 'get')
    expect(gets).toEqual([
      expect.objectContaining({
        dependency: 'redis',
        [CALL_FAILURE]: 0
      })
    ])
    expect(emf.documentsWith(CACHE_MISS)).toEqual([])
  })

  test('a get of a key it does not hold returns nothing and counts a cache miss', async () => {
    const cached = await engine.get({ segment: 'auth-sessions', id: 'none' })

    expect(cached).toBeNull()
    await vi.waitFor(() =>
      expect(emf.documentsWith(CACHE_MISS)).toHaveLength(1)
    )
    expect(emf.documentsWith(CACHE_MISS)[0].cache).toBe('auth-sessions')
  })

  test('a set, a get and a drop are each recorded as one redis call with an external-call line naming the segment', async () => {
    await engine.set(SESSION_KEY, { user: 'u-1' }, 60_000)
    await engine.get(SESSION_KEY)
    await engine.drop(SESSION_KEY)

    await vi.waitFor(() =>
      expect(emf.documentsWith(CALL_DURATION)).toHaveLength(3)
    )
    expect(
      emf.documentsWith(CALL_DURATION).map(({ operation }) => operation)
    ).toEqual(['set', 'get', 'drop'])
    expect(
      ecsLog
        .lines()
        .filter((line) => line.event?.category === 'external-call')
        .map(({ event, cache, message }) => ({
          action: event.action,
          cache,
          message
        }))
    ).toEqual(
      ['set', 'get', 'drop'].map((operation) => ({
        action: `redis/${operation}`,
        cache: 'session',
        message: expect.stringMatching(
          `^External call redis/${operation} \\(cache session\\) success in`
        )
      }))
    )
  })

  test('a get the client fails is rethrown, recorded as a failed redis get and counted as neither hit nor miss', async () => {
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
      expect(emf.documentsWith(CALL_FAILURE)).toHaveLength(1)
    )
    expect(emf.documentsWith(CALL_FAILURE)).toEqual([
      expect.objectContaining({
        dependency: 'redis',
        operation: 'get',
        [CALL_FAILURE]: 1
      })
    ])
    expect(emf.documentsWith(CACHE_HIT)).toEqual([])
    expect(emf.documentsWith(CACHE_MISS)).toEqual([])
  })
})
