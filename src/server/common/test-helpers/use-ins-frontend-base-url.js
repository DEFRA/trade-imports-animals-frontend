import { config } from '../../../config/config.js'
import { restoreConfigAfterEach } from './restore-config-after-each.js'

/** Restores the INS frontend base URL after each test and returns the setter
 * a test uses to point it somewhere. */
export const useInsFrontendBaseUrl = () => {
  restoreConfigAfterEach(['tradeImportsInsFrontend.baseUrl'])
  return (url) => config.set('tradeImportsInsFrontend.baseUrl', url)
}
