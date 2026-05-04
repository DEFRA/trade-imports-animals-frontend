import { getTraceId } from '@defra/hapi-tracing'
import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { originSchema } from './origin-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import {
  fetchNotification,
  submitNotification
} from '../common/helpers/notification-helpers.js'

const logger = createLogger()

export const originController = {
  get: {
    handler: async (_request, h) => {
      logger.info(
        `Country of origin in session: ${getSessionValue(_request, 'countryCode')}`
      )
      // referenceNumber comes from the notification API; other view values from session.
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
    handler: async (_request, h) => {
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
        viewModel.fieldErrors = formattedErrors.fieldErrors

        return h.view('origin/index', viewModel).code(statusCodes.badRequest)
      }

      // Store values in session
      setSessionValue(_request, 'countryCode', countryCode)
      setSessionValue(_request, 'requiresRegionCode', requiresRegionCode)
      setSessionValue(_request, 'internalReference', internalReference)

      try {
        const response = await submitNotification(_request, logger)
        if (response?.referenceNumber) {
          setSessionValue(_request, 'referenceNumber', response.referenceNumber)
          logger.info(`Reference number saved: ${response.referenceNumber}`)
        }
      } catch (_error) {
        const referenceNumber = getSessionValue(_request, 'referenceNumber')
        const traceId = getTraceId() ?? ''
        logger.warn(
          `submitNotification failed in origin POST; rendering error view (referenceNumber=${referenceNumber ?? 'none'}, traceId=${traceId})`
        )
        return h
          .view('origin/index', {
            pageTitle: 'Origin of the import',
            heading: 'Origin of the import',
            referenceNumber: getSessionValue(_request, 'referenceNumber'),
            countryCode: getSessionValue(_request, 'countryCode'),
            requiresRegionCode:
              getSessionValue(_request, 'requiresRegionCode') || 'no',
            internalReference: getSessionValue(_request, 'internalReference'),
            errorList: [
              { text: SUBMISSION_FAILURE_MESSAGE, href: '#countryCode' }
            ]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities')
    }
  }
}
