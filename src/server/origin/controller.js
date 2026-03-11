import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { originSchema } from './origin-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { notificationClient } from '../common/clients/notification-client.js'

const logger = createLogger()

export const originController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Country of origin in session: ${getSessionValue(_request, 'countryCode')}`
      )
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      let notification = {}
      if (referenceNumber) {
        notification = notificationClient.get(referenceNumber, 'x-trace-id')
        setSessionValue(_request, 'notification', notification)
        logger.info(
          `Notification retrieved from notification client: {}`,
          notification.referenceNumber
        )
      }

      return h.view('origin/index', {
        pageTitle: 'Origin of the import',
        heading: 'Origin of the import',
        referenceNumber: notification?.referenceNumber,
        countryCode: notification.origin?.countryOfOrigin,
        requiresRegionCode: notification.origin?.requiresRegionCode || 'no',
        internalReference: notification.origin?.internalReference
      })
    }
  },
  post: {
    async handler(_request, h) {
      const { countryCode, requiresRegionCode, internalReference } =
        _request.payload
      logger.info(`Country of origin: ${countryCode}`)

      // Validate using Joi schema
      const { error } = originSchema.validate(_request.payload, {
        abortEarly: false
      })

      if (error) {
        const formattedErrors = formatValidationErrors(error)
        const viewModel = {
          countryCode,
          requiresRegionCode,
          internalReference
        }
        viewModel.errorList = formattedErrors.errorList
        viewModel.formError = {
          text: formattedErrors.errorList[0].text
        }

        return h.view('origin/index', viewModel).code(statusCodes.badRequest)
      }

      setSessionValue(_request, 'countryCode', countryCode)
      setSessionValue(_request, 'requiresRegionCode', requiresRegionCode)
      setSessionValue(_request, 'internalReference', internalReference)

      let notification = getSessionValue(_request, 'notification')
      if (!notification) {
        notification = { origin: {} }
      }
      // get the notification from the session and update the changes.
      notification.origin.countryOfOrigin = countryCode
      notification.origin.requiresRegionCode = requiresRegionCode
      notification.origin.internalReference = internalReference

      try {
        // send the updated notification to the backend.
        await notificationClient.submit(notification, 'x-trace-id')
        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
      }

      return h.redirect('/origin')
    }
  }
}
