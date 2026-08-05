import { MAX_PROJECTION_ATTEMPTS } from '../config.js'
import { failed } from '../http/failed.js'
import { headers } from '../http/headers.js'
import { logger } from '../logger.js'

// Both projection variants — canonical PUT and main's POST /notifications — are
// idempotent whole-record writes on the backend, so a naive retry with the
// identical body is safe.
export const putProjection = async ({
  journeyId,
  name,
  url,
  body,
  method = 'PUT'
}) => {
  let lastError
  for (let attempt = 1; attempt <= MAX_PROJECTION_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: headers(),
        body: JSON.stringify(body)
      })
      if (!response.ok) {
        throw failed(`save ${name} projection`, response)
      }
      return
    } catch (error) {
      lastError = error
      if (attempt < MAX_PROJECTION_ATTEMPTS) {
        logger.warn(
          { err: error, journeyId, projection: name, attempt },
          'Projection save failed; retrying idempotent write'
        )
      }
    }
  }
  throw lastError
}
