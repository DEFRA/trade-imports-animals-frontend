import { buildDispatch } from './flow/dispatch.js'
import { readyForQuote } from './flow/section-status.js'
import { allRoutes, dispatchPages } from './features/index.js'
import { assertObligationPurity } from './obligation-purity.js'
import { configureReadyForQuote } from './engine/read.js'
import { registerJourneyCookie } from './engine/journey.js'

/**
 * The obligations v2 spike — the whole journey as one Hapi plugin,
 * assembled from the per-feature vertical slices. At registration it runs
 * the two boot guards that keep the paradigm honest:
 *
 *  1. `assertObligationPurity()` — reads every `features/<feature>/obligations.js`
 *     and asserts it imports NOTHING outward (only sideways to another
 *     feature's obligations). This is the per-file model-purity guard: with
 *     the obligations co-located next to controllers that import views/requests, it
 *     is the load-bearing check that co-location has not re-coupled the model
 *     to presentation.
 *  2. `buildDispatch()` — INVERTS the page-side `collects` declarations into
 *     the dispatch index and COVERAGE-ASSERTS them (every non-system
 *     obligation collected by exactly one page), so a forgotten or duplicated
 *     binding fails at boot, not at runtime.
 *
 * Then the journey cookie is defined and every route registered.
 */
export const obligationsV2Spike = {
  plugin: {
    name: 'standalone-obligations-v2-spike',
    register(server) {
      assertObligationPurity()
      buildDispatch(dispatchPages)
      configureReadyForQuote(readyForQuote)
      registerJourneyCookie(server)
      server.route(allRoutes)
    }
  }
}
