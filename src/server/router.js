import inert from '@hapi/inert'

import { health } from './health/index.js'
import { signout } from './signout/index.js'
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
      const routes = [liveAnimals]

      if (authEnabled) {
        routes.push(signout)
      }

      // Throwaway prototype journeys — off in production (see config.features.prototypes)
      if (config.get('features.prototypes.enabled')) {
        routes.push(prototypes)
        routes.push(standalonePrototypes)
      }

      await server.register(routes)

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}
