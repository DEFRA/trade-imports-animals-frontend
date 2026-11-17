import { Engine as CatboxRedis } from '@hapi/catbox-redis'

import { measureExternalCall } from '../metrics/external-call-metrics.js'
import { countEvent } from '../metrics/publish-metrics.js'
import { REDIS_DEPENDENCY } from '../redis-availability.js'

const redisCall = (operation) => ({ dependency: REDIS_DEPENDENCY, operation })

/**
 * The Redis catbox engine, with each get, set and drop recorded as an external
 * call to `redis`, and each get counted as `cache.hit` or `cache.miss` tagged
 * with the segment it read.
 */
export class MeasuredRedisEngine extends CatboxRedis {
  async get(key) {
    const cached = await measureExternalCall(redisCall('get'), () =>
      super.get(key)
    )
    countEvent(cached ? 'cache.hit' : 'cache.miss', { cache: key.segment })
    return cached
  }

  set(key, value, ttl) {
    return measureExternalCall(redisCall('set'), () =>
      super.set(key, value, ttl)
    )
  }

  drop(key) {
    return measureExternalCall(redisCall('drop'), () => super.drop(key))
  }
}
