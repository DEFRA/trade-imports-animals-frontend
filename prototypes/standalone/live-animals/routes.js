import { buildDispatch } from './flow/dispatch.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { allRoutes, dispatchPages } from './features/index.js'
import { assertObligationPurity } from './obligation-purity.js'
import { configureReadyForCheckYourAnswers } from './engine/read.js'
import { registerJourneyCookie } from './engine/journey.js'

export const liveAnimals = {
  plugin: {
    name: 'standalone-live-animals',
    register(server) {
      assertObligationPurity()
      buildDispatch(dispatchPages)
      configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
      registerJourneyCookie(server)
      server.route(allRoutes)
    }
  }
}
