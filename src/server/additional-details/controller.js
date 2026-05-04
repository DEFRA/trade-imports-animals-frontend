import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import {
  fetchNotification,
  submitNotification
} from '../common/helpers/notification-helpers.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'

const logger = createLogger()

export const additionalDetailsController = {
  get: {
    handler: async (_request, h) => {
      const certifiedFor = getSessionValue(_request, 'certifiedFor')
      const unweanedAnimals =
        getSessionValue(_request, 'unweanedAnimals') ?? 'no'

      const notification = await fetchNotification(_request, logger)
      const referenceNumber = notification?.referenceNumber

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

      const { certifiedFor, unweanedAnimals } = _request.payload

      logger.info(`Additional details: ${referenceNumber ?? 'new'}`)
      setSessionValue(_request, 'certifiedFor', certifiedFor)
      setSessionValue(_request, 'unweanedAnimals', unweanedAnimals)

      try {
        await submitNotification(_request, logger)
      } catch (_error) {
        return h
          .view('additional-details/index', {
            pageTitle: 'Additional animal details',
            heading: 'Additional animal details',
            certifiedFor: getSessionValue(_request, 'certifiedFor'),
            unweanedAnimals:
              getSessionValue(_request, 'unweanedAnimals') ?? 'no',
            referenceNumber,
            errorList: [
              { text: SUBMISSION_FAILURE_MESSAGE, href: '#certifiedFor' }
            ]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/accompanying-documents')
    }
  }
}
