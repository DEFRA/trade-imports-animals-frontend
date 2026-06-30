import { shellRoutes } from './routes/shell.js'
import { sectionRoutes } from './routes/section.js'
import { claimsRoutes } from './routes/claims.js'
import { addonsRoutes } from './routes/addons.js'
import { endingsRoutes } from './routes/endings.js'

/**
 * Spike A (standalone) — the whole journey as one Hapi plugin, assembled from
 * the route modules in this folder. Registered under
 * /prototype-standalone/spike-a/task-list-with-linear-tasks by the standalone
 * index. No shared variant builder: every route is declared in this folder.
 */
const routes = [
  ...shellRoutes(),
  ...sectionRoutes(),
  ...claimsRoutes(),
  ...addonsRoutes(),
  ...endingsRoutes()
]

export const spikeA = {
  plugin: {
    name: 'standalone-spike-a',
    register(server) {
      server.route(routes)
    }
  }
}
