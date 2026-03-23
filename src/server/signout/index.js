import { signoutController } from './controller.js'

/**
 * Sets up the routes used in the /signout page.
 * These routes are registered in src/server/router.js.
 */
export const signout = {
  plugin: {
    name: 'signout',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/signout',
          ...signoutController
        }
      ])
    }
  }
}
