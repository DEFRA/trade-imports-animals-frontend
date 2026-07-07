import { buildDispatch } from './flow/dispatch.js'
import { readyForQuote } from './flow/section-status.js'
import { allRoutes, dispatchPages } from './features/index.js'
import { assertObligationPurity } from './obligation-purity.js'
import { configureReadyForQuote } from './engine/read.js'
import { registerJourneyCookie } from './engine/journey.js'

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
