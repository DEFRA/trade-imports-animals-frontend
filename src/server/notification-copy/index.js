import Joi from 'joi'
import { notificationCopyController } from './controller.js'

export const notificationCopy = {
  plugin: {
    name: 'notification-copy',
    register(server) {
      server.route([
        {
          method: 'POST',
          path: '/notification-copy/{referenceNumber}',
          options: {
            validate: {
              params: Joi.object({
                referenceNumber: Joi.string()
                  .pattern(/^[A-Z]+\.[A-Z]+\.\d{4}\.\d+$/)
                  .required()
              })
            }
          },
          ...notificationCopyController
        }
      ])
    }
  }
}
