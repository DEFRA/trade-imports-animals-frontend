export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** GET statuses the Lighthouse seed retries — transient stack or read-after-write gaps. */
export const RETRYABLE_DOCUMENT_STATUSES = new Set([404, 502, 503, 504])

const MAX_DOCUMENT_RETRY_DELAY_MS = 5000

export const documentRetryDelayMs = (attempt) =>
  Math.min(MAX_DOCUMENT_RETRY_DELAY_MS, 500 * 2 ** attempt)

const parsedRetries = Number.parseInt(
  process.env.LIGHTHOUSE_DOCUMENT_RETRIES ?? '',
  10
)

export const DEFAULT_DOCUMENT_RETRIES =
  Number.isFinite(parsedRetries) && parsedRetries > 0 ? parsedRetries : 10
