import inert from '@hapi/inert'

import { health } from './health/index.js'
import { signout } from './signout/index.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'
import { liveAnimals, plantProducts } from './app/routes.js'

export const DEFAULT_SET_BASE = '/live-animals'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      // Health-check route. Used by platform to check if service is running, do not remove!
      await server.register([health])

      // Application specific routes, add your own routes here
      const authEnabled = config.get('auth.enabled')
      await server.register(liveAnimals, {
        routes: { prefix: '/live-animals' }
      })
      await server.register(plantProducts, {
        routes: { prefix: '/plant-products' }
      })

      if (authEnabled) {
        await server.register([signout])
      }

      server.route({
        method: 'GET',
        path: '/',
        handler: (_request, h) => h.redirect(DEFAULT_SET_BASE)
      })

      // Static assets
      await server.register([serveStaticFiles])
    }
  }
}
