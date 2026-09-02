import { getOidcConfig } from './get-oidc-config.js'
import { config } from '../config/config.js'

// Discovery runs on the boot path, before the server accepts traffic, so a
// briefly unavailable identity provider must slow the boot rather than kill
// the process.
const MAX_ATTEMPTS = 4
const FIRST_RETRY_DELAY_MS = 1000

const retryDelayMs = (attempt) => FIRST_RETRY_DELAY_MS * 2 ** (attempt - 1)

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getOidcConfigWithRetry(logger) {
  const discoveryUrl = config.get('defraId.oidcDiscoveryUrl')
  let lastError

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await getOidcConfig()
    } catch (err) {
      lastError = err

      if (attempt < MAX_ATTEMPTS) {
        logger.warn(
          { err, discoveryUrl, attempt },
          'OIDC discovery failed, retrying'
        )
        await wait(retryDelayMs(attempt))
      }
    }
  }

  logger.error(
    { err: lastError, discoveryUrl, attempts: MAX_ATTEMPTS },
    'Could not reach the OIDC provider'
  )

  throw new Error(
    `Could not reach the OIDC provider at ${discoveryUrl} after ${MAX_ATTEMPTS} attempts`,
    { cause: lastError }
  )
}

export { getOidcConfigWithRetry }
