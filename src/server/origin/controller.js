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
import { countriesClient } from '../common/clients/countries-client.js'

const logger = createLogger()

// Fallback EU country list used until EUDPA-164 wires the reference-data
// stub service into the local docker-compose stack. Remove with EUDPA-164.
const FALLBACK_EU_COUNTRIES = [
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' }
]

async function buildCountryItems(traceId) {
  const classifiers = ['EU', 'EEA']
  let countries
  try {
    countries = await countriesClient.getCountries(traceId, classifiers)
  } catch (error) {
    logger.warn(
      `countriesClient.getCountries failed (${error.message}); using hardcoded EU fallback`
    )
    countries = FALLBACK_EU_COUNTRIES
  }
  return [
    { value: '', text: 'Select a country' },
    { text: '──────────', disabled: true },
    ...countries.map(({ code, name }) => ({ value: code, text: name }))
  ]
}

export const originController = {
  get: {
    handler: async (_request, h) => {
      logger.info(
        `Country of origin in session: ${getSessionValue(_request, 'countryCode')}`
      )
      const traceId = getTraceId() ?? ''
      // referenceNumber comes from the notification API; other view values from session.
      const notification = await fetchNotification(_request, logger)
      const referenceNumber = notification?.referenceNumber ?? null

      const countryItems = await buildCountryItems(traceId)

      return h.view('origin/index', {
        pageTitle: 'Origin of the import',
        heading: 'Origin of the import',
        referenceNumber,
        countryCode: getSessionValue(_request, 'countryCode'),
        requiresRegionCode:
          getSessionValue(_request, 'requiresRegionCode') || 'no',
        internalReference: getSessionValue(_request, 'internalReference'),
        countryItems
      })
    }
  },
  post: {
    handler: async (_request, h) => {
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
        const response = await submitNotification(_request, logger)
        if (response?.referenceNumber) {
          setSessionValue(_request, 'referenceNumber', response.referenceNumber)
          logger.info(`Reference number saved: ${response.referenceNumber}`)
        }
      } catch (_error) {
        const referenceNumber = getSessionValue(_request, 'referenceNumber')
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
            countryItems,
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
