import { registerJourneyCookie } from './journey/index.js'
import { claimsRoutes } from './routes/claims/index.js'
import { endingsRoutes } from './routes/endings/index.js'
import { withGuard } from './routes/guard.js'
import { modelEndpointRoutes } from './routes/model-endpoints.js'
import { pageRoutes } from './routes/page.js'
import { shellRoutes } from './routes/shell.js'

/**
 * The obligations spike (standalone) — the whole journey as one Hapi
 * plugin, assembled from the route modules in this folder and diffable
 * against spike-a/routes.js. Every route is plumbing over the 21-export
 * contract barrel; the journeyId rides in a BASE-scoped cookie, so no
 * path carries an {id} segment.
 *
 * Step 11.6 (PLAN §b) landed: every surface-carrying route registers
 * wrapped in `withGuard`, which brings the post-submit freeze (Rulings
 * item 1), the confirmation gate and the deep-link Not Applicable
 * redirect. The model endpoints carry no surface and pass through
 * unguarded.
 */

/** The flat route table, exported for the table-pinning test. */
export const routeTable = () => [
  ...shellRoutes(),
  ...pageRoutes(),
  ...claimsRoutes(),
  ...endingsRoutes(),
  ...modelEndpointRoutes()
]

export const obligationsSpike = {
  plugin: {
    name: 'standalone-obligations-spike',
    register: (server) => {
      registerJourneyCookie(server)
      server.route(routeTable().map(withGuard))
    }
  }
}
