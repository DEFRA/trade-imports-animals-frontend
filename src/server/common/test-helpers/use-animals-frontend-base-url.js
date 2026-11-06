import { config } from '../../../config/config.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

/** Restores this service's own base URL after each test and returns the setter
 * a test uses to point it somewhere. */
export const useAnimalsFrontendBaseUrl = () => {
  restoreConfigAfterEach(['tradeImportsAnimalsFrontend.baseUrl'])
  return (url) => config.set('tradeImportsAnimalsFrontend.baseUrl', url)
}
