import { BackendRequestError } from '../../errors.js'

export const failed = (action, response) =>
  new BackendRequestError(action, response)
