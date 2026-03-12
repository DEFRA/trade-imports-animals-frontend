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
      if (referenceNumber) {
        notificationClient.get(_request, referenceNumber, 'x-trace-id')
        logger.info(
          `Notification retrieved from notification client: ${referenceNumber}`
        )
      }

      return h.view('origin/index', {
        pageTitle: 'Origin of the import',
        heading: 'Origin of the import',
        referenceNumber: getSessionValue(_request, 'referenceNumber'),
        countryCode: getSessionValue(_request, 'countryCode'),
        requiresRegionCode:
          getSessionValue(_request, 'requiresRegionCode') || 'no',
        internalReference: getSessionValue(_request, 'internalReference')
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

      // Store values in session
      setSessionValue(_request, 'countryCode', countryCode)
      setSessionValue(_request, 'requiresRegionCode', requiresRegionCode)
      setSessionValue(_request, 'internalReference', internalReference)

      try {
        // Submit notification - client will build complete notification from all session values
        const response = await notificationClient.submit(_request, 'x-trace-id')

        // Store reference number in session if returned (backend returns string directly)
        if (response?.referenceNumber) {
          setSessionValue(_request, 'referenceNumber', response.referenceNumber)
          logger.info(`Reference number saved: ${response.referenceNumber}`)
        }

        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
      }

      return h.redirect('/commodities')
    }
  }
}
