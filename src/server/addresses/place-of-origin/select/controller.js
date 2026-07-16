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

const VIEW = 'addresses/place-of-origin/select/index'
const PAGE_TITLE = 'Search for a place of origin'
const OPERATOR_TYPE = 'PLACE_OF_ORIGIN'
const SELECT_ERROR = 'Select a place of origin'

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

export const placeOfOriginSelectController = {
  get: {
    async handler(request, h) {
      const referenceNumber = getSessionValue(
        request,
        sessionKeys.referenceNumber
      )
      logger.info(`Place of origin selection page: ${referenceNumber}`)

      const operators = (await fetchOperators(request)).map(fromApiOperator)
      const selected = getSessionValue(request, sessionKeys.placeOfOrigin)

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
        (operator) => operator.id === request.payload?.placeOfOrigin
      )

      if (!selected) {
        return h
          .view(VIEW, {
            pageTitle: PAGE_TITLE,
            referenceNumber,
            operators: apiOperators.map(fromApiOperator),
            errorList: [{ text: SELECT_ERROR, href: '#placeOfOrigin' }],
            fieldErrors: { placeOfOrigin: { text: SELECT_ERROR } }
          })
          .code(statusCodes.badRequest)
      }

      setSessionValue(
        request,
        sessionKeys.placeOfOrigin,
        toNotificationOperator(selected)
      )
      logger.info(
        `Place of origin saved for ${referenceNumber}: ${selected.name}`
      )
      return h.redirect('/addresses')
    }
  }
}
