import { BACKEND_DEPENDENCY } from '../../../../../../common/helpers/backend-client/backend-dependency.js'
import { BackendRequestError } from '../../errors.js'
import { HTTP_CONFLICT } from '../config.js'

export const failed = async (operation, response) => {
  const error = new BackendRequestError(
    { dependency: BACKEND_DEPENDENCY, operation },
    response
  )
  if (response.status === HTTP_CONFLICT) {
    try {
      const body = await response.clone().json()
      if (body?.code) {
        error.code = body.code
      }
    } catch (err) {
      error.cause = err
    }
  }
  return error
}
