import { Engine as CatboxRedis } from '@hapi/catbox-redis'

import { countEvent } from '../metrics/publish-metrics.js'

const SESSION_CACHE = Object.freeze({ cache: 'session' })

/**
 * The Redis catbox engine, with each get that returns counted as `cache.hit`
 * or `cache.miss` tagged `cache` `session`, the one cache it holds, whichever
 * segment the get read. A get that throws is counted as neither.
 */
export class HitCountingRedisEngine extends CatboxRedis {
  async get(key) {
    const cached = await super.get(key)
    countEvent(cached ? 'cache.hit' : 'cache.miss', SESSION_CACHE)
    return cached
  }
}
