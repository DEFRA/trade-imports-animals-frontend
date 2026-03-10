import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { originSchema } from './origin-schema.js'
import { formatValidationErrors } from '../common/helpers/validation-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { originClient } from './origin-client.js'

const logger = createLogger()

export const originController = {
  get: {
    handler(_request, h) {
      logger.info(
        `Country of origin in session: ${getSessionValue(_request, 'countryCode')}`
      )
      return h.view('origin/index', {
        pageTitle: 'Origin',
        heading: 'Country of Origin',
        countryCode: getSessionValue(_request, 'countryCode')
      })
    }
  },
  post: {
    async handler(_request, h) {
      const { countryCode, requiresOriginCode, internalReference } =
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
          requiresOriginCode,
          internalReference
        }
        viewModel.errorList = formattedErrors.errorList
        viewModel.formError = {
          text: formattedErrors.errorList[0].text
        }

        return h.view('origin/index', viewModel).code(statusCodes.badRequest)
      }

      setSessionValue(_request, 'countryCode', countryCode)
      setSessionValue(_request, 'requiresOriginCode', requiresOriginCode)
      setSessionValue(_request, 'internalReference', internalReference)

      const origin = { countryOfOrigin: countryCode }

      try {
        await originClient.submit(origin, 'x-trace-id')
        logger.info('Country code saved successfully')
      } catch (error) {
        logger.error(`Failed to submit country code: ${error.message}`)
      }

      return h.redirect('/origin')
    }
  }
}
