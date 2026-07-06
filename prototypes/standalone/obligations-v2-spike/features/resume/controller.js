import { hubPath, pagePath } from '../../config.js'
import * as state from '../../engine/index.js'
import { open } from '../../shared/kit.js'

/**
 * Cookieless resume — GET {BASE}/resume recovers the current user's durable
 * journey by identity (the SESSION port), re-pins it as active, and drops the
 * caller back on the task list. It demonstrates the two-port payoff end-to-end:
 * a request with no JOURNEY_COOKIE still recovers the in-flight application.
 *
 * STUB CAVEAT: there is a single global stub user, so this route has NO auth —
 * anyone hitting it gets the stub user's record. That is the one thing NOT to
 * copy to prod; the deliverable is the SHAPE (load-by-user + reconcile), not the
 * (absent) identity integration. `state.resume` is the only additive verb.
 */
const handler = (request, h) => {
  state.resume(request, h)
  return h.redirect(hubPath())
}

export const routes = [
  { method: 'GET', path: pagePath('resume'), options: open, handler }
]
