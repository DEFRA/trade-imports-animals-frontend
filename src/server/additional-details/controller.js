import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { getTraceId } from '@defra/hapi-tracing'
import {
  fetchNotification,
  submitNotification
} from '../common/helpers/notification-helpers.js'

const logger = createLogger()

export const additionalDetailsController = {
  get: {
    handler: async (_request, h) => {
      const certifiedFor = getSessionValue(_request, 'certifiedFor')
      const unweanedAnimals =
        getSessionValue(_request, 'unweanedAnimals') ?? 'no'

      const notification = await fetchNotification(_request, logger)
      const referenceNumber = notification?.referenceNumber ?? null

      return h.view('additional-details/index', {
        pageTitle: 'Additional animal details',
        heading: 'Additional animal details',
        certifiedFor,
        unweanedAnimals,
        referenceNumber
      })
    }
  },
  post: {
    handler: async (_request, h) => {
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const traceId = getTraceId() ?? ''

      const { certifiedFor, unweanedAnimals } = _request.payload

      logger.info(`Additional details: ${referenceNumber}`)
      setSessionValue(_request, 'certifiedFor', certifiedFor)
      setSessionValue(_request, 'unweanedAnimals', unweanedAnimals)

      await submitNotification(_request, traceId, logger)

      return h.redirect('/accompanying-documents')
    }
  }
}
