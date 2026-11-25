import { HitCountingRedisEngine } from './hit-counting-redis-engine.js'
import { recordEmfDocuments } from '../../test-helpers/emf-documents.js'

const CACHE_HIT = 'cache.hit'
const CACHE_MISS = 'cache.miss'
const SESSION_KEY = { segment: '!yar', id: 'abc' }
const COUNTED_FOR_SESSION = {
  value: 1,
  unit: 'Count',
  dimensions: { cache: 'session' }
}

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

describe('HitCountingRedisEngine', () => {
  const emf = recordEmfDocuments()
  let engine

  beforeEach(async () => {
    engine = new HitCountingRedisEngine({ client: inMemoryRedisClient() })
    await engine.start()
  })

  test('a get of a key it holds returns the stored item and counts one cache hit tagged cache session', async () => {
    await engine.set(SESSION_KEY, { user: 'u-1' }, 60_000)

    const cached = await engine.get(SESSION_KEY)

    expect(cached.item).toEqual({ user: 'u-1' })
    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.publishesOf(CACHE_HIT)).toEqual([COUNTED_FOR_SESSION])
    expect(emf.documentsWith(CACHE_MISS)).toEqual([])
  })

  test('a get of a key it does not hold, in another segment, returns nothing and counts one cache miss tagged cache session', async () => {
    const cached = await engine.get({ segment: 'auth-sessions', id: 'none' })

    expect(cached).toBeNull()
    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.publishesOf(CACHE_MISS)).toEqual([COUNTED_FOR_SESSION])
    expect(emf.documentsWith(CACHE_HIT)).toEqual([])
  })

  test('a get the client fails is rethrown and counted as neither hit nor miss', async () => {
    const lost = new Error('Connection is closed.')
    const failing = new HitCountingRedisEngine({
      client: {
        get: async () => {
          throw lost
        }
      }
    })
    await failing.start()

    await expect(failing.get(SESSION_KEY)).rejects.toBe(lost)

    await emf.publishMarkerAndAwaitEarlierPublishes()
    expect(emf.documentsWith(CACHE_HIT)).toEqual([])
    expect(emf.documentsWith(CACHE_MISS)).toEqual([])
  })
})
