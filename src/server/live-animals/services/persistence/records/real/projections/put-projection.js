import { MAX_PROJECTION_ATTEMPTS } from '../config.js'
import { put } from '../http/put.js'
import { logger } from '../logger.js'

export const putProjection = async ({ journeyId, name, url, body, owner }) => {
  let lastError
  for (let attempt = 1; attempt <= MAX_PROJECTION_ATTEMPTS; attempt++) {
    try {
      await put(url, body, `save ${name} projection`, owner)
      return
    } catch (error) {
      lastError = error
      if (attempt < MAX_PROJECTION_ATTEMPTS) {
        logger.warn(
          { err: error, journeyId, projection: name, attempt },
          'Projection save failed; retrying idempotent PUT'
        )
      }
    }
  }
  throw lastError
}
