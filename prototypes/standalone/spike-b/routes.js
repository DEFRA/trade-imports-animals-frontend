import { shellRoutes } from './journey.js'
import { sectionRoutes } from './handlers.js'
import { claimsRoutes } from './claims-routes.js'
import { addonsRoutes } from './addons-routes.js'
import { endingsRoutes } from './endings.js'

/**
 * Spike B (standalone) — the whole journey as one Hapi plugin, assembled from
 * the route modules in this folder. Registered under
 * /prototype-standalone/spike-b/task-list-with-linear-tasks by the standalone
 * index. No shared variant builder: every route is declared in this folder.
 */
const routes = [
  ...shellRoutes(),
  ...sectionRoutes(),
  ...claimsRoutes(),
  ...addonsRoutes(),
  ...endingsRoutes()
]

export const spikeB = {
  plugin: {
    name: 'standalone-spike-b',
    register(server) {
      server.route(routes)
    }
  }
}
