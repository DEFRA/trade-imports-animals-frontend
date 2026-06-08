import Joi from 'joi'
import { notificationViewController } from './controller.js'

/**
 * Sets up the route for the notification details view page.
 * Registered in src/server/router.js.
 */
export const notificationView = {
  plugin: {
    name: 'notification-view',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/notification-view/{referenceNumber}',
          options: {
            validate: {
              query: Joi.object({
                error: Joi.string().valid('copy').optional()
              })
            }
          },
          ...notificationViewController
        }
      ])
    }
  }
}
