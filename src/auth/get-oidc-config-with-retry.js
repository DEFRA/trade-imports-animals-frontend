import { getOidcConfig } from './get-oidc-config.js'
import { config } from '../config/config.js'

const SECOND_MS = 1000
const RETRY_DELAYS_MS = [SECOND_MS, 2 * SECOND_MS, 4 * SECOND_MS]

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function getOidcConfigWithRetry(logger) {
  const discoveryUrl = config.get('defraId.oidcDiscoveryUrl')

  for (let attempt = 1; ; attempt++) {
    try {
      return await getOidcConfig()
    } catch (err) {
      const delayMs = RETRY_DELAYS_MS[attempt - 1]
      if (delayMs === undefined) {
        throw new Error(
          `Could not reach the OIDC provider at ${discoveryUrl} after ${attempt} attempts`,
          { cause: err }
        )
      }
      logger.warn(
        { err, discoveryUrl, attempt },
        'OIDC discovery failed, retrying'
      )
      await wait(delayMs)
    }
  }
}

export { getOidcConfigWithRetry }
