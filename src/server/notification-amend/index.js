import { notificationAmendController } from './controller.js'

/**
 * Sets up the route for the notification amend endpoint.
 * Called from the dashboard "Amend" action and the notification-view
 * "Amend" button. Registered in src/server/router.js.
 */
export const notificationAmend = {
  plugin: {
    name: 'notification-amend',
    register(server) {
      server.route([
        {
          method: 'POST',
          path: '/notification-amend/{referenceNumber}',
          ...notificationAmendController
        }
      ])
    }
  }
}
