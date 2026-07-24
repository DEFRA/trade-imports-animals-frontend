import inert from '@hapi/inert'

import { home } from './home/index.js'
import { about } from './about/index.js'
import { health } from './health/index.js'
import { origin } from './origin/index.js'
import { signout } from './signout/index.js'
import { commodities } from './commodities/index.js'
import { commoditiesSelect } from './commodities/select/index.js'
import { commodityDetails } from './commodities/details/index.js'
import { importReason } from './import-reason/index.js'
import { accompanyingDocuments } from './accompanying-documents/index.js'
import { additionalDetails } from './additional-details/index.js'
import { animalsIdentificationDetails } from './commodities/identification/index.js'
import { addresses } from './addresses/index.js'
import { cphNumber } from './cph-number/index.js'
import { portOfEntry } from './port-of-entry/index.js'
import { transporter } from './transporters/index.js'
import { declaration } from './declaration/index.js'
import { notificationAmend } from './notification-amend/index.js'
import { notificationCancelAmend } from './notification-cancel-amend/index.js'
import { notificationCopy } from './notification-copy/index.js'
import { notificationDelete } from './notification-delete/index.js'
import { notificationView } from './notification-view/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { prototypes } from '../../prototypes/index.js'
import { standalonePrototypes } from '../../prototypes/standalone/index.js'
import { config } from '../config/config.js'
import { liveAnimals } from './live-animals/routes.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      const authEnabled = config.get('auth.enabled')
      const routes = [
        about,
        home,
        origin,
        commodities,
        commoditiesSelect,
        importReason,
        commodityDetails,
        animalsIdentificationDetails,
        additionalDetails,
        accompanyingDocuments,
        addresses,
        cphNumber,
        portOfEntry,
        transporter,
        declaration,
        notificationAmend,
        notificationCancelAmend,
        notificationCopy,
        notificationDelete,
        notificationView
      ]

      if (authEnabled) {
        routes.push(signout)
      }

      // Throwaway prototype journeys — off in production (see config.features.prototypes)
      if (config.get('features.prototypes.enabled')) {
        routes.push(prototypes)
        routes.push(standalonePrototypes)
        routes.push(liveAnimals)
      }

      await server.register(routes)

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}
