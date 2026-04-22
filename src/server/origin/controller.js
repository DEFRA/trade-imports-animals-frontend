import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { originSchema } from './origin-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { getTraceId } from '@defra/hapi-tracing'
import {
  fetchNotification,
  submitNotification
} from '../common/helpers/notification-helpers.js'

const logger = createLogger()

export const originController = {
  get: {
    async handler(_request, h) {
      logger.info(
        `Country of origin in session: ${getSessionValue(_request, 'countryCode')}`
      )
      const notification = await fetchNotification(_request, logger)
      const referenceNumber = notification?.referenceNumber ?? null

      return h.view('origin/index', {
        pageTitle: 'Origin of the import',
        heading: 'Origin of the import',
        referenceNumber,
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
      const traceId = getTraceId() ?? ''

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
        viewModel.fieldErrors = formattedErrors.fieldErrors

        return h.view('origin/index', viewModel).code(statusCodes.badRequest)
      }

      // Store values in session
      setSessionValue(_request, 'countryCode', countryCode)
      setSessionValue(_request, 'requiresRegionCode', requiresRegionCode)
      setSessionValue(_request, 'internalReference', internalReference)

      const response = await submitNotification(_request, traceId, logger)
      if (response?.referenceNumber) {
        setSessionValue(_request, 'referenceNumber', response.referenceNumber)
        logger.info(`Reference number saved: ${response.referenceNumber}`)
      }

      return h.redirect('/commodities')
    }
  }
}
