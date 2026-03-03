import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'

const logger = createLogger()

export const originController = {
  get: {
    handler(_request, h) {
      logger.info(`Country of origin in session: ${getSessionValue(_request, 'countryCode')}`);
      return h.view('origin/index', {
        pageTitle: 'Origin',
        heading: 'Country of Origin',
        countryCode: getSessionValue(_request, 'countryCode')
      })
    }
  },
  post: {
    handler(_request, h) {
      const { countryCode } = _request.payload
      logger.info(`Country of origin: ${countryCode}`)
      setSessionValue(_request, 'countryCode', countryCode);
      return h.redirect('/origin')
    }
  }
}
