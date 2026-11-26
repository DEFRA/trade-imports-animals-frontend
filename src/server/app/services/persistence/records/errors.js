import { RefusedCallError } from '../../http/dependency-error.js'

const RECOVERABLE_BACKEND_ERROR = Symbol('recoverableBackendError')

export class BackendRequestError extends RefusedCallError {
  constructor(call, response) {
    super(call, response)
    this.name = 'BackendRequestError'
    this[RECOVERABLE_BACKEND_ERROR] = true
  }
}

export const markRecoverableBackendError = (error) => {
  error[RECOVERABLE_BACKEND_ERROR] = true
  return error
}

export const isRecoverableBackendError = (error) =>
  error?.[RECOVERABLE_BACKEND_ERROR] === true

const LOGGED_REFUSAL = Symbol('loggedRefusal')

export const markRefusalLogged = (error) => {
  error[LOGGED_REFUSAL] = true
  return error
}

export const isLoggedRefusal = (error) => error?.[LOGGED_REFUSAL] === true
