import { originController } from './controller.js'

/**
 * Sets up the routes used in the origin page.
 * These routes are registered in src/server/router.js.
 */
export const origin = {
  plugin: {
    name: 'origin',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/origin',
          ...originController.get
        },
        {
          method: 'POST',
          path: '/origin',
          ...originController.post
        }
      ])
    }
  }
}
