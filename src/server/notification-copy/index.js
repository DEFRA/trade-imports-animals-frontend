import { notificationCopyController } from './controller.js'

export const notificationCopy = {
  plugin: {
    name: 'notification-copy',
    register(server) {
      server.route([
        {
          method: 'POST',
          path: '/notification-copy/{referenceNumber}',
          ...notificationCopyController
        }
      ])
    }
  }
}
