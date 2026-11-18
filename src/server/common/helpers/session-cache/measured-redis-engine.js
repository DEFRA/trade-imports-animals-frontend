import { Engine as CatboxRedis } from '@hapi/catbox-redis'

import { measureExternalCall } from '../metrics/external-call-metrics.js'
import { countEvent } from '../metrics/publish-metrics.js'
import { REDIS_DEPENDENCY } from '../redis-dependency.js'

const redisCall = (operation, key) => ({
  dependency: REDIS_DEPENDENCY,
  operation,
  cache: key.segment
})

/**
 * The Redis catbox engine, with each get, set and drop recorded as an external
 * call to `redis` whose log line names the segment it used, and each get
 * counted as `cache.hit` or `cache.miss` tagged with the segment it read.
 */
export class MeasuredRedisEngine extends CatboxRedis {
  async get(key) {
    const cached = await measureExternalCall(redisCall('get', key), () =>
      super.get(key)
    )
    countEvent(cached ? 'cache.hit' : 'cache.miss', { cache: key.segment })
    return cached
  }

  set(key, value, ttl) {
    return measureExternalCall(redisCall('set', key), () =>
      super.set(key, value, ttl)
    )
  }

  drop(key) {
    return measureExternalCall(redisCall('drop', key), () => super.drop(key))
  }
}
