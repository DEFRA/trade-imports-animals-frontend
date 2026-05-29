import { notificationDeleteController } from './controller.js'

/**
 * Sets up the route for the notification soft-delete AJAX endpoint.
 * Called by client-side JS in notification-view.js.
 * Registered in src/server/router.js.
 */
export const notificationDelete = {
  plugin: {
    name: 'notification-delete',
    register(server) {
      server.route([
        {
          method: 'POST',
          path: '/notification-delete/{referenceNumber}',
          ...notificationDeleteController
        }
      ])
    }
  }
}
