import { buildDispatch } from './flow/dispatch.js'
import { readyForCheckYourAnswers } from './flow/section-status.js'
import { entryGuardTarget } from './flow/entry-guard.js'
import { allRoutes, dispatchPages } from './features/index.js'
import { assertObligationPurity } from './obligation-purity.js'
import { configureReadyForCheckYourAnswers } from './engine/read.js'
import { configureRecords } from './engine/persistence/records.js'
import { records } from './services/persistence/records/index.js'
import { configureSession } from './engine/persistence/session.js'
import { session } from './services/persistence/session/index.js'
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
      configureSession(session)
      registerJourneyCookie(server)
      server.ext('onPreHandler', async (request, h) => {
        const target = await entryGuardTarget(request, h)
        return target ? h.redirect(target).takeover() : h.continue
      })
      if (isRealMode()) {
        await countries.prime()
        await ports.prime()
      }
      server.route(allRoutes)
    }
  }
}
