import Joi from 'joi'
import { notificationCancelAmendController } from './controller.js'

/**
 * Confirmation flow for cancelling an in-progress notification amendment.
 */
export const notificationCancelAmend = {
  plugin: {
    name: 'notification-cancel-amend',
    register(server) {
      server.route([
        {
          method: 'GET',
          path: '/notification-cancel-amend/{referenceNumber}',
          options: {
            validate: {
              params: Joi.object({
                referenceNumber: Joi.string()
                  .pattern(/^GBN-AG-\d{2}-[0-9A-HJ-KM-NP-TV-Z]{6}$/)
                  .required()
              })
            }
          },
          ...notificationCancelAmendController.get
        },
        {
          method: 'POST',
          path: '/notification-cancel-amend/{referenceNumber}',
          options: {
            validate: {
              params: Joi.object({
                referenceNumber: Joi.string()
                  .pattern(/^GBN-AG-\d{2}-[0-9A-HJ-KM-NP-TV-Z]{6}$/)
                  .required()
              })
            }
          },
          ...notificationCancelAmendController.post
        }
      ])
    }
  }
}
