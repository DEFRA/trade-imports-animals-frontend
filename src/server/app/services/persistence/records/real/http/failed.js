import { BackendRequestError } from '../../errors.js'
import { HTTP_CONFLICT } from '../config.js'

// 409 STALE_CONCURRENCY_TOKEN carries a machine-readable code in a
// ProblemDetail body (`application/problem+json`). Read it once and attach
// it to the error so the recovery flow can key off `error.code`.
export const failed = async (action, response) => {
  const error = new BackendRequestError(action, response)
  if (response.status === HTTP_CONFLICT) {
    try {
      const body = await response.clone().json()
      if (body?.code) {
        error.code = body.code
      }
    } catch {
      // body wasn't JSON — no code to attach
    }
  }
  return error
}
