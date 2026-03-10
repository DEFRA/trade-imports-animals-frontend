import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
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
      const { countryCode } = _request.payload
      logger.info(`Country of origin: ${countryCode}`)
      setSessionValue(_request, 'countryCode', countryCode)

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
