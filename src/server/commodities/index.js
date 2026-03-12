import { commoditiesController } from './controller.js'

/**
 * Sets up the routes used in the commodities page.
 * These routes are registered in src/server/router.js.
 */
export const commodities = {
  plugin: {
    name: 'commodities',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/commodities',
          ...commoditiesController.get
        },
        {
          method: 'POST',
          path: '/commodities',
          ...commoditiesController.post
        }
      ])
    }
  }
}
