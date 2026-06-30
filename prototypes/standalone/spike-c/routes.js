import { shellRoutes } from './shell-routes.js'
import { sectionRoutes } from './section-routes.js'
import { claimsRoutes } from './claims-routes.js'
import { addonsRoutes } from './addons-routes.js'
import { endingsRoutes } from './endings-routes.js'

/**
 * Spike C (standalone) — the whole journey as one Hapi plugin, assembled from
 * the route modules in this folder. Registered under
 * /prototype-standalone/spike-c/task-list-with-linear-tasks by the standalone
 * index. No shared variant builder: every route is declared in this folder.
 */
const routes = [
  ...shellRoutes(),
  ...sectionRoutes(),
  ...claimsRoutes(),
  ...addonsRoutes(),
  ...endingsRoutes()
]

export const spikeC = {
  plugin: {
    name: 'standalone-spike-c',
    register(server) {
      server.route(routes)
    }
  }
}
