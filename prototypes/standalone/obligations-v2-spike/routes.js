import { buildDispatch } from './flow/dispatch.js'
import { allRoutes, dispatchPages } from './pages/registry.js'
import { registerJourneyCookie } from './state/journey.js'

/**
 * The obligations v2 spike — the whole journey as one Hapi plugin,
 * assembled from the per-page controllers. At registration it INVERTS the
 * page-side `collects` declarations into the dispatch index and
 * COVERAGE-ASSERTS them (every non-system obligation collected by exactly
 * one page), so a forgotten or duplicated binding fails at boot, not at
 * runtime. Then the journey cookie is defined and every route registered.
 */
export const obligationsV2Spike = {
  plugin: {
    name: 'standalone-obligations-v2-spike',
    register(server) {
      buildDispatch(dispatchPages)
      registerJourneyCookie(server)
      server.route(allRoutes)
    }
  }
}
