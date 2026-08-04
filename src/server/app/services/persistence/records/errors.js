const RECOVERABLE_BACKEND_ERROR = Symbol('recoverableBackendError')
const IDEMPOTENCY_KEY_REUSE_ERROR = Symbol('idempotencyKeyReuseError')

export class BackendRequestError extends Error {
  constructor(action, response) {
    super(`Failed to ${action}: ${response.status} ${response.statusText}`)
    this.name = 'BackendRequestError'
    this.status = response.status
    this.statusText = response.statusText
    this[RECOVERABLE_BACKEND_ERROR] = true
  }
}

export const markRecoverableBackendError = (error) => {
  error[RECOVERABLE_BACKEND_ERROR] = true
  return error
}

export const markIdempotencyKeyReuseError = (error) => {
  error[RECOVERABLE_BACKEND_ERROR] = false
  error[IDEMPOTENCY_KEY_REUSE_ERROR] = true
  return error
}

export const isRecoverableBackendError = (error) =>
  error?.[RECOVERABLE_BACKEND_ERROR] === true

export const isIdempotencyKeyReuseError = (error) =>
  error?.[IDEMPOTENCY_KEY_REUSE_ERROR] === true
