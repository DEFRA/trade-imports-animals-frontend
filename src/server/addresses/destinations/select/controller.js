import { getTraceId } from '@defra/hapi-tracing'
import {
  operatorsClient,
  fromApiOperator,
  toNotificationOperator
} from '../../../common/clients/operators-client.js'
import { createLogger } from '../../../common/helpers/logging/logger.js'
import {
  getSessionValue,
  setSessionValue
} from '../../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../../common/constants/session-keys.js'
import { statusCodes } from '../../../common/constants/status-codes.js'

const logger = createLogger()

const VIEW = 'addresses/destinations/select/index'
const PAGE_TITLE = 'Search for a place of destination'
const OPERATOR_TYPE = 'PLACE_OF_DESTINATION'
const SELECT_ERROR = 'Select a place of destination'

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

export const destinationsSelectController = {
  get: {
    async handler(request, h) {
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )
      logger.info(`Place of destination selection page: ${referenceNumber}`)

      const operators = (await fetchOperators(request)).map(fromApiOperator)
      const selected = getSessionValue(request, sessionKeys.destination)

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
        (operator) => operator.id === request.payload?.destination
      )

      if (!selected) {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            operators: apiOperators.map(fromApiOperator),
            errorList: [{ text: SELECT_ERROR, href: '#destination' }],
            fieldErrors: { destination: { text: SELECT_ERROR } }
          })
          .code(statusCodes.badRequest)
      }

      setSessionValue(
        request,
        sessionKeys.destination,
        toNotificationOperator(selected)
      )
      logger.info(`Destination saved for ${referenceNumber}: ${selected.name}`)
      return h.redirect('/addresses')
    }
  }
}
