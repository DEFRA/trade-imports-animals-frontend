import Crumb from '@hapi/crumb'
import { config } from '../config/config.js'

/**
 * CSRF Protection Plugin
 *
 * Configures @hapi/crumb for CSRF token protection.
 * Tokens are automatically added to forms and validated on submission.
 *
 * Features:
 * - Secure, HttpOnly, SameSite=Strict cookies
 * - Disabled during test runs (for simpler test setup)
 * - Skips health checks and static assets
 * - Default: validates tokens in form payload (for HTML forms)
 * - Per-route: can enable restful mode for header-based validation (AJAX)
 *
 * @see https://hapi.dev/module/crumb/ for Crumb documentation
 */
export const csrf = {
  plugin: Crumb,
  options: {
    // Default: validate CSRF tokens in payload (works for HTML forms)
    // Individual routes can override with restful: true for header validation
    cookieOptions: {
      isSecure: config.get('csrf.cookie.secure'),
      isHttpOnly: true,
      isSameSite: 'Strict'
    },
    skip: (request) => {
      if (!config.get('csrf.enabled')) {
        return true
      }

      // Skip CSRF for health check and static assets only
      return (
        request.path.startsWith('/health') ||
        request.path.startsWith('/assets') ||
        request.path.startsWith('/public')
      )
    }
  }
}
