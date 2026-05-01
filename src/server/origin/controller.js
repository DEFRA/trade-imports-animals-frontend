import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { originSchema } from './origin-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { countriesClient } from '../common/clients/countries-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

async function buildCountryItems(traceId) {
  const classifiers = ['EU', 'EEA']
  const countries = await countriesClient.getCountries(traceId, classifiers)
  return [
    { value: '', text: 'Select a country' },
    { text: '──────────', disabled: true },
    ...countries.map(({ code, name }) => ({ value: code, text: name }))
  ]
}

export const originController = {
  get: {
    async handler(_request, h) {
      logger.info(
        `Country of origin in session: ${getSessionValue(_request, 'countryCode')}`
      )
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const traceId = getTraceId() ?? ''
      if (referenceNumber) {
        notificationClient.get(_request, referenceNumber, traceId)
        logger.info(
          `Notification retrieved from notification client: ${referenceNumber}`
        )
      }

      const countryItems = await buildCountryItems(traceId)

      return h.view('origin/index', {
        pageTitle: 'Origin of the import',
        heading: 'Origin of the import',
        referenceNumber: getSessionValue(_request, 'referenceNumber'),
        countryCode: getSessionValue(_request, 'countryCode'),
        requiresRegionCode:
          getSessionValue(_request, 'requiresRegionCode') || 'no',
        internalReference: getSessionValue(_request, 'internalReference'),
        countryItems
      })
    }
  },
  post: {
    async handler(_request, h) {
      const { countryCode, requiresRegionCode, internalReference } =
        _request.payload
      logger.info(`Country of origin: ${countryCode}`)
      const traceId = getTraceId() ?? ''

      const countryItems = await buildCountryItems(traceId)

      // Validate using Joi schema
      const { error } = originSchema.validate(_request.payload, {
        abortEarly: false
      })

      if (error) {
        const formattedErrors = formatValidationErrors(error)
        const viewModel = {
          countryCode,
          requiresRegionCode,
          internalReference,
          countryItems
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
        // Submit notification - client will build complete notification from all session values
        const response = await notificationClient.submit(_request, traceId)

        // Store reference number in session if returned (backend returns string directly)
        if (response?.referenceNumber) {
          setSessionValue(_request, 'referenceNumber', response.referenceNumber)
          logger.info(`Reference number saved: ${response.referenceNumber}`)
        }

        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
        return h
          .view('origin/index', {
            pageTitle: 'Origin of the import',
            heading: 'Origin of the import',
            referenceNumber: getSessionValue(_request, 'referenceNumber'),
            countryCode: getSessionValue(_request, 'countryCode'),
            requiresRegionCode:
              getSessionValue(_request, 'requiresRegionCode') || 'no',
            internalReference: getSessionValue(_request, 'internalReference'),
            countryItems,
            errorList: [
              { text: 'Something went wrong, please contact the EUDP team' }
            ]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/commodities')
    }
  }
}
