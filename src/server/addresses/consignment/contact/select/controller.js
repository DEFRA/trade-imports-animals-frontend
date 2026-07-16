import { getTraceId } from '@defra/hapi-tracing'
import {
  operatorsClient,
  fromApiOperator,
  toNotificationOperator
} from '../../../../common/clients/operators-client.js'
import { createLogger } from '../../../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../../common/constants/session-keys.js'
import { statusCodes } from '../../../../common/constants/status-codes.js'
import { SUBMISSION_FAILURE_MESSAGE } from '../../../../common/constants/messages.js'
import { saveNotification } from '../../../../common/helpers/notification-helpers.js'

const logger = createLogger()

const VIEW = 'addresses/consignment/contact/select/index'
const PAGE_TITLE = 'Contact address for consignment'
const OPERATOR_TYPE = 'BRANCH_ADDRESS'
const SELECT_ERROR = 'Select a contact address'

function getIdentity(request) {
  const profile = request.auth?.credentials ?? {}
  return { crn: profile.crn, organisationId: profile.organisationId }
}

async function fetchOperators(request) {
  const traceId = getTraceId() ?? ''
  const response = await operatorsClient.listOperators(
    traceId,
    getIdentity(request),
    { operatorType: OPERATOR_TYPE }
  )
  return response.items ?? []
}

export const consignmentContactSelectController = {
  get: {
    async handler(request, h) {
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )
      logger.info(`Consignment contact selection page: ${referenceNumber}`)

      const operators = (await fetchOperators(request)).map(fromApiOperator)
      const selected = getSessionValue(
        request,
        sessionKeys.consignmentContactAddress
      )

      return h.view(VIEW, {
        pageTitle: PAGE_TITLE,
        referenceNumber,
        operators,
        selectedOperatorId: selected?.operatorId
      })
    }
  },
  post: {
    async handler(request, h) {
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )
      const apiOperators = await fetchOperators(request)
      const selected = apiOperators.find(
        (operator) => operator.id === request.payload?.contactAddress
      )

      if (!selected) {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            operators: apiOperators.map(fromApiOperator),
            errorList: [{ text: SELECT_ERROR, href: '#contactAddress' }],
            fieldErrors: { contactAddress: { text: SELECT_ERROR } }
          })
          .code(statusCodes.badRequest)
      }

      setSessionValue(
        request,
        sessionKeys.consignmentContactAddress,
        toNotificationOperator(selected)
      )
      logger.info(
        `About to save ${referenceNumber} consignment contact post request`
      )
      try {
        await saveNotification(request, logger)
      } catch {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            operators: apiOperators.map(fromApiOperator),
            errorList: [{ text: SUBMISSION_FAILURE_MESSAGE }]
          })
          .code(statusCodes.internalServerError)
      }
      return h.redirect(`/notification-view/${referenceNumber}`)
    }
  }
}
