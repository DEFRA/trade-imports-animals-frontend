/**
 * Session helper functions for managing user session data
 * Using @hapi/yar for server-side session storage
 *
 * Session data is stored server-side (Redis in production, memory in dev)
 * Only an encrypted session ID cookie is sent to the browser
 */

/**
 * Set a value in the session
 * @param {object} request - Hapi request object
 * @param {string} key - Session key
 * @param {*} value - Value to store (string, object, array, etc.)
 * @returns {*} The value that was set
 */
export function setSessionValue(request, key, value) {
  return request.yar.set(key, value)
}

/**
 * Get a value from the session
 * @param {object} request - Hapi request object
 * @param {string} key - Session key
 * @param {boolean} clear - If true, clear the key after reading
 * @returns {*} The stored value, or null if not found
 */
export function getSessionValue(request, key, clear = false) {
  if (request.yar && typeof request.yar.get === 'function') {
    try {
      return request.yar.get(key, clear)
    } catch {
      return null
    }
  }
  return null
}

/**
 * Clear a specific key from the session
 * @param {object} request - Hapi request object
 * @param {string} key - Session key to clear
 */
export function clearSessionValue(request, key) {
  request.yar.clear(key)
}

/**
 * Clear multiple keys from the session
 * @param {object} request - Hapi request object
 * @param {string[]} keys - Array of session keys to clear
 */
export function clearSessionValues(request, keys) {
  keys.forEach((key) => request.yar.clear(key))
}

/**
 * Reset the entire session and assign a new session ID
 * Use with caution - clears ALL session data
 * @param {object} request - Hapi request object
 */
export function resetSession(request) {
  request.yar.reset()
}

/**
 * Get the current session ID
 * @param {object} request - Hapi request object
 * @returns {string} Session ID
 */
export function getSessionId(request) {
  return request.yar.id
}
