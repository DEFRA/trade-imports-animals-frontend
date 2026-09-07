export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** GET statuses the Lighthouse seed retries — transient stack or read-after-write gaps. */
export const RETRYABLE_DOCUMENT_STATUSES = new Set([404, 502, 503, 504])

export const documentRetryDelayMs = (attempt) => 250 * 2 ** attempt

export const DEFAULT_DOCUMENT_RETRIES = 5
