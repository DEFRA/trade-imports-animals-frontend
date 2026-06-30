import { shellRoutes } from './journey.js'
import { sectionRoutes } from './handlers.js'
import { claimsRoutes } from './claims-routes.js'
import { addonsRoutes } from './addons-routes/index.js'
import { endingsRoutes } from './endings/index.js'

/**
 * Spike D (standalone) — the whole journey as one Hapi plugin, assembled from
 * the route modules in this folder. Registered under
 * /prototype-standalone/spike-d/task-list-with-linear-tasks by the standalone
 * index. No shared variant builder: every route is declared in this folder.
 */
const routes = [
  ...shellRoutes(),
  ...sectionRoutes(),
  ...claimsRoutes(),
  ...addonsRoutes(),
  ...endingsRoutes()
]

export const spikeD = {
  plugin: {
    name: 'standalone-spike-d',
    register(server) {
      server.route(routes)
    }
  }
}
