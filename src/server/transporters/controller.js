import { getTraceId } from '@defra/hapi-tracing'
import {
  operatorsClient,
  toTransporter
} from '../common/clients/operators-client.js'
import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import { createLogger } from '../common/helpers/logging/logger.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../common/constants/messages.js'
import { transporterCategoryLabel } from '../address-book/constants/operator-types.js'
import { saveNotification } from '../common/helpers/notification-helpers.js'

const logger = createLogger()

const PAGE_TITLE = 'Transporter'
const VIEW = 'transporters/index'
const OPERATOR_TYPE = 'TRANSPORTER'

function getIdentity(request) {
  const profile = request.auth?.credentials ?? {}
  return { crn: profile.crn, organisationId: profile.organisationId }
}

function withTypeLabel(transporter) {
  if (!transporter) {
    return transporter
  }
  return { ...transporter, type: transporterCategoryLabel(transporter.type) }
}

export const transportersController = {
  get: {
    async handler(request, h) {
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )
      logger.info(`Transporter: ${referenceNumber} landing page`)

      const selectedTransporterId = request.query?.selectedTransporter

      if (selectedTransporterId) {
        const traceId = getTraceId() ?? ''
        const response = await operatorsClient.listOperators(
          traceId,
          getIdentity(request),
          { operatorType: OPERATOR_TYPE }
        )
        const selected = (response.items ?? []).find(
          (operator) => operator.id === selectedTransporterId
        )
        if (selected) {
          setSessionValue(
            request,
            sessionKeys.transporter,
            toTransporter(selected)
          )
        }
      }

      const selectedTransporter = getSessionValue(
        request,
        sessionKeys.transporter
      )

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        selectedTransporter: withTypeLabel(selectedTransporter)
      })
    }
  },
  post: {
    async handler(request, h) {
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )
      logger.info(`Transporter: ${referenceNumber} landing page`)

      try {
        await saveNotification(request, logger)
      } catch {
        const selectedTransporter = getSessionValue(
          request,
          sessionKeys.transporter
        )
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            selectedTransporter: withTypeLabel(selectedTransporter),
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }
      return h.redirect('/consignment/contact/select')
    }
  }
}
