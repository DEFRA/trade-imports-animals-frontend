import { createLogger } from '../common/helpers/logging/logger.js'
import {
  setSessionValue,
  getSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

const logger = createLogger()

export const additionalDetailsController = {
  get: {
    handler(_request, h) {
      const certifiedFor = getSessionValue(_request, sessionKeys.certifiedFor)
      const unweanedAnimals =
        getSessionValue(_request, sessionKeys.unweanedAnimals) ?? 'no'

      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )
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
      const referenceNumber = getSessionValue(
        _request,
        sessionKeys.referenceNumber
      )

      const { certifiedFor, unweanedAnimals } = _request.payload

      logger.info(`Additional details: ${referenceNumber}`)
      setSessionValue(_request, sessionKeys.certifiedFor, certifiedFor)
      setSessionValue(_request, sessionKeys.unweanedAnimals, unweanedAnimals)

      try {
        await saveNotification(_request, logger)
      } catch {
        return h
          .view('additional-details/index', {
            pageTitle: 'Additional animal details',
            heading: 'Additional animal details',
            certifiedFor: getSessionValue(_request, sessionKeys.certifiedFor),
            unweanedAnimals:
              getSessionValue(_request, sessionKeys.unweanedAnimals) ?? 'no',
            referenceNumber,
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }

      return h.redirect('/accompanying-documents', { referenceNumber })
    }
  }
}
