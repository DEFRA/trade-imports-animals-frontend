import { BackendRequestError } from '../../errors.js'
import { HTTP_CONFLICT } from '../config.js'

export const failed = async (operation, response) => {
  const error = new BackendRequestError(operation, response)
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
