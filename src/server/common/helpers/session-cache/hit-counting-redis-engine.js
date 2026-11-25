import { Engine as CatboxRedis } from '@hapi/catbox-redis'

import { countEventInBackground } from '../metrics/publish-metrics.js'

/**
 * The Redis catbox engine. Each get that resolves publishes `cache.hit` or
 * `cache.miss` tagged `cache` `session`; a get that throws publishes neither.
 */
export class HitCountingRedisEngine extends CatboxRedis {
  async get(key) {
    const cached = await super.get(key)
    countEventInBackground(cached ? 'cache.hit' : 'cache.miss', {
      cache: 'session'
    })
    return cached
  }
}
