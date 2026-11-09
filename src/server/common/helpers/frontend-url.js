import { config } from '../../../config/config.js'

const frontendUrlFor = (baseUrlConfigKey, path) =>
  `${config.get(baseUrlConfigKey).replace(/\/$/, '')}${path}`

/**
 * Builds a browser-facing URL on the INS frontend.
 *
 * @param {string} path - the path on the INS frontend, starting with '/'
 * @returns {string} the configured INS base URL, without a trailing slash, plus the path
 */
export const buildInsFrontendUrl = (path) =>
  frontendUrlFor('tradeImportsInsFrontend.baseUrl', path)

/**
 * Builds a browser-facing URL on this frontend's own origin.
 *
 * @param {string} path - the path on this frontend, starting with '/'
 * @returns {string} the configured animals frontend base URL, without a trailing slash, plus the path
 */
export const buildAnimalsFrontendUrl = (path) =>
  frontendUrlFor('tradeImportsAnimalsFrontend.baseUrl', path)
