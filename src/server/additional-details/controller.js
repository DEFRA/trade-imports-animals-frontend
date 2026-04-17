import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { notificationClient } from '../common/clients/notification-client.js'
import { getTraceId } from '@defra/hapi-tracing'

const logger = createLogger()

export const additionalDetailsController = {
  get: {
    handler(_request, h) {
      const certifiedFor = getSessionValue(_request, 'certifiedFor')
      const unweanedAnimals =
        getSessionValue(_request, 'unweanedAnimals') ?? 'no'

      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const traceId = getTraceId() ?? ''
      if (referenceNumber) {
        notificationClient.get(_request, referenceNumber, traceId)
        logger.info(
          `Notification retrieved from notification client: ${referenceNumber}`
        )
      }

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
    async handler(_request, h) {
      const referenceNumber = getSessionValue(_request, 'referenceNumber')
      const traceId = getTraceId() ?? ''

      const { certifiedFor, unweanedAnimals } = _request.payload

      logger.info(`Additional details: ${referenceNumber}`)
      setSessionValue(_request, 'certifiedFor', certifiedFor)
      setSessionValue(_request, 'unweanedAnimals', unweanedAnimals)

      try {
        await notificationClient.submit(_request, traceId)
        logger.info('Notification saved successfully')
      } catch (error) {
        logger.error(`Failed to submit notification: ${error.message}`)
      }

      return h.redirect('/accompanying-documents')
    }
  }
}
