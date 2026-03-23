import { aboutController } from './controller.js'
import { config } from '../../config/config.js'

/**
 * Sets up the routes used in the /about page.
 * These routes are registered in src/server/router.js.
 */
export const about = {
  plugin: {
    name: 'about',
    register(server) {
      const authEnabled = config.get('auth.enabled')
      server.route([
        {
          method: 'GET',
          path: '/about',
          options: authEnabled
            ? { auth: { strategy: 'session', mode: 'try' } }
            : { auth: false },
          ...aboutController
        }
      ])
    }
  }
}
