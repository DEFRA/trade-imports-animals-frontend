import { config } from '../../../config/config.js'

/**
 * Builds a browser-facing URL on the INS frontend.
 *
 * @param {string} path - the path on the INS frontend, starting with '/'
 * @returns {string} the configured INS base URL, without a trailing slash, plus the path
 */
export const buildInsFrontendUrl = (path) =>
  `${config.get('tradeImportsInsFrontend.baseUrl').replace(/\/$/, '')}${path}`
