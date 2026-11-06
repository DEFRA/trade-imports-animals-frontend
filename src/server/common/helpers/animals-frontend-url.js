import { config } from '../../../config/config.js'

/**
 * Builds an absolute, browser-facing URL on this service.
 *
 * @param {string} path - the path on this service, starting with '/'
 * @returns {string} the configured base URL, without a trailing slash, plus the path
 */
export const buildAnimalsFrontendUrl = (path) =>
  `${config.get('tradeImportsAnimalsFrontend.baseUrl').replace(/\/$/, '')}${path}`
