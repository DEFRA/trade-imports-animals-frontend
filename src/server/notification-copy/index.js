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
                  .pattern(/^GBN-AG-\d{2}-[0-9A-HJ-KM-NP-TV-Z]{6}$/)
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
