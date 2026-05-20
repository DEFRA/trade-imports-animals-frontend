import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { originSchema } from './origin-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { countriesClient } from '../common/clients/countries-client.js'
import { getTraceId } from '@defra/hapi-tracing'
import {
  saveNotification,
  fetchNotification
} from '../common/helpers/notification-helpers.js'

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
        `Country of origin in session: ${getSessionValue(_request, sessionKeys.countryCode)}`
      )
      const traceId = getTraceId() ?? ''
      await fetchNotification(_request, logger)

      const countryItems = await buildCountryItems(traceId)

      return h.view('origin/index', {
        pageTitle: 'Origin of the import',
        heading: 'Origin of the import',
        referenceNumber: getSessionValue(_request, sessionKeys.referenceNumber),
        countryCode: getSessionValue(_request, sessionKeys.countryCode),
        requiresRegionCode:
          getSessionValue(_request, sessionKeys.requiresRegionCode) || 'no',
        internalReference: getSessionValue(
          _request,
          sessionKeys.internalReference
        ),
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
      setSessionValue(_request, sessionKeys.countryCode, countryCode)
      setSessionValue(
        _request,
        sessionKeys.requiresRegionCode,
        requiresRegionCode
      )
      setSessionValue(
        _request,
        sessionKeys.internalReference,
        internalReference
      )

      try {
        // Submit notification - client will build complete notification from all session values
        const response = await saveNotification(_request, logger)

        // Store reference number in session if returned (backend returns string directly)
        if (response?.referenceNumber) {
          setSessionValue(
            _request,
            sessionKeys.referenceNumber,
            response.referenceNumber
          )
          logger.info(`Reference number saved: ${response.referenceNumber}`)
        }
      } catch (error) {
        return h
          .view('origin/index', {
            pageTitle: 'Origin of the import',
            heading: 'Origin of the import',
            referenceNumber: getSessionValue(
              _request,
              sessionKeys.referenceNumber
            ),
            countryCode: getSessionValue(_request, sessionKeys.countryCode),
            requiresRegionCode:
              getSessionValue(_request, sessionKeys.requiresRegionCode) || 'no',
            internalReference: getSessionValue(
              _request,
              sessionKeys.internalReference
            ),
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
