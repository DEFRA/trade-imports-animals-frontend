import { hubPath, pagePath } from '../../config.js'
import * as state from '../../engine/index.js'
import { open } from '../../shared/kit.js'

/**
 * STUB CAVEAT: there is a single global stub user, so this route has NO auth —
 * anyone hitting it gets the stub user's record. That is the one thing NOT to
 * copy to prod.
 */
const handler = (request, h) => {
  state.resume(request, h)
  return h.redirect(hubPath())
}

export const routes = [
  { method: 'GET', path: pagePath('resume'), options: open, handler }
]
