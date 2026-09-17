import inert from '@hapi/inert'

import { health } from './health/index.js'
import { serviceRoutes } from './app/routes.js'
import { serveStaticFiles } from './common/helpers/serve-static-files.js'
import { config } from '../config/config.js'

export const router = {
  plugin: {
    name: 'router',
    async register(server) {
      await server.register([inert])

      await server.register([health])

      if (config.get('auth.enabled')) {
        await server.register([serviceRoutes])
      }

      await server.register([serveStaticFiles])
    }
  }
}
