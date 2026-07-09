import { buildDispatch } from './flow/dispatch.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { allRoutes, dispatchPages } from './features/index.js'
import { assertObligationPurity } from './obligation-purity.js'
import { configureReadyForCheckYourAnswers } from './engine/read.js'
import { configureRecords } from './engine/persistence/records.js'
import { records } from './services/persistence/records/index.js'
import { registerJourneyCookie } from './engine/journey.js'
import { isRealMode } from './services/mode.js'
import * as countries from './services/countries/index.js'
import * as ports from './services/ports/index.js'

export const liveAnimals = {
  plugin: {
    name: 'standalone-live-animals',
    async register(server) {
      assertObligationPurity()
      buildDispatch(dispatchPages)
      configureReadyForCheckYourAnswers(readyForCheckYourAnswers)
      configureRecords(records)
      registerJourneyCookie(server)
      if (isRealMode()) {
        await countries.prime()
        await ports.prime()
      }
      server.route(allRoutes)
    }
  }
}
